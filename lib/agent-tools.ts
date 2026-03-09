import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { inspect } from "node:util";
import { Script, createContext } from "node:vm";
import type { WorkflowStep } from "@/lib/mock-data";
import { ensureStepWorkspace, getStepWorkspacePaths } from "@/lib/workspace";

const REPO_ROOT = resolve(process.cwd());
const DEFAULT_SHELL_TIMEOUT_MS = 15_000;
const MAX_TOOL_OUTPUT_CHARS = 12_000;
const SHELL_SESSION_IDLE_MS = 5 * 60_000;

type ToolParameters = Record<string, unknown>;

export type AgentToolDefinition = {
  name: string;
  description: string;
  parameters: ToolParameters;
};

export type AgentToolRuntime = AgentToolDefinition & {
  execute: (input: unknown) => Promise<string>;
};

type AgentToolContext = {
  projectId: string;
  step: WorkflowStep;
};

type ShellCommandResult = {
  stdout: string;
  stderr: string;
  exitCode: number;
};

function truncateToolOutput(value: string) {
  if (value.length <= MAX_TOOL_OUTPUT_CHARS) {
    return value;
  }

  return `${value.slice(0, MAX_TOOL_OUTPUT_CHARS)}\n...[truncated ${value.length - MAX_TOOL_OUTPUT_CHARS} chars]`;
}

function stringifyValue(value: unknown) {
  if (typeof value === "string") {
    return value;
  }

  return inspect(value, {
    depth: 4,
    breakLength: 80,
    compact: false,
    sorted: true,
  });
}

function requireObject(input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Tool input must be a JSON object.");
  }

  return input as Record<string, unknown>;
}

function requireString(input: Record<string, unknown>, key: string) {
  const value = input[key];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Tool input must include a non-empty string field named \"${key}\".`);
  }

  return value;
}

function optionalNumber(input: Record<string, unknown>, key: string) {
  const value = input[key];
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Tool input field \"${key}\" must be a finite number when provided.`);
  }

  return value;
}

function resolveRepoPath(inputPath: string) {
  const resolvedPath = inputPath.startsWith("/") ? resolve(inputPath) : resolve(REPO_ROOT, inputPath);
  const relativePath = relative(REPO_ROOT, resolvedPath);

  if (relativePath === "" || (!relativePath.startsWith("..") && relativePath !== "..")) {
    return resolvedPath;
  }

  throw new Error(`Path \"${inputPath}\" must stay within ${REPO_ROOT}.`);
}

function formatPathForDisplay(targetPath: string) {
  const relativePath = relative(REPO_ROOT, targetPath);
  return relativePath.length === 0 ? "." : relativePath;
}

function buildEvalTool(): AgentToolDefinition {
  return {
    name: "javascript_eval",
    description:
      "Evaluate synchronous JavaScript in a sandbox. Return values and console output are captured for inspection.",
    parameters: {
      type: "object",
      properties: {
        code: {
          type: "string",
          description: "JavaScript source to evaluate. The completion value of the last statement is returned.",
        },
      },
      required: ["code"],
      additionalProperties: false,
    },
  };
}

function executeEvalTool(input: unknown) {
  const args = requireObject(input);
  const code = requireString(args, "code");
  const consoleLines: string[] = [];

  const sandbox = {
    console: {
      log: (...values: unknown[]) => {
        consoleLines.push(values.map((value) => stringifyValue(value)).join(" "));
      },
      error: (...values: unknown[]) => {
        consoleLines.push(`ERROR: ${values.map((value) => stringifyValue(value)).join(" ")}`);
      },
    },
    Buffer,
    Date,
    JSON,
    Math,
    URL,
    URLSearchParams,
    TextDecoder,
    TextEncoder,
  };

  try {
    const script = new Script(code);
    const result = script.runInContext(createContext(sandbox), { timeout: 1_000 });
    const sections: string[] = [];

    if (consoleLines.length > 0) {
      sections.push(`console:\n${consoleLines.join("\n")}`);
    }

    sections.push(`result:\n${stringifyValue(result)}`);
    return Promise.resolve(truncateToolOutput(sections.join("\n\n")));
  } catch (error) {
    const message = error instanceof Error ? `${error.name}: ${error.message}` : "Unknown error";
    return Promise.resolve(truncateToolOutput(`evaluation_error:\n${message}`));
  }
}

class ShellSession {
  private process: ChildProcessWithoutNullStreams | null = null;
  private queue: Promise<unknown> = Promise.resolve();
  private idleTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly initialCwd: string) {}

  run(command: string, timeoutMs: number) {
    const nextRun = this.queue.then(() => this.execute(command, timeoutMs));
    this.queue = nextRun.catch(() => undefined);
    return nextRun;
  }

  dispose() {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }

    if (this.process && !this.process.killed) {
      this.process.kill("SIGKILL");
    }

    this.process = null;
  }

  private scheduleIdleDisposal() {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
    }

    this.idleTimer = setTimeout(() => {
      this.dispose();
    }, SHELL_SESSION_IDLE_MS);
  }

  private ensureProcess() {
    if (this.process && !this.process.killed) {
      return this.process;
    }

    const child = spawn("/bin/bash", [], {
      cwd: this.initialCwd,
      env: process.env,
      stdio: "pipe",
    });

    child.stdin.setDefaultEncoding("utf8");
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    this.process = child;
    this.scheduleIdleDisposal();
    return child;
  }

  private execute(command: string, timeoutMs: number): Promise<ShellCommandResult> {
    const shellProcess = this.ensureProcess();
    this.scheduleIdleDisposal();

    return new Promise<ShellCommandResult>((resolveResult, rejectResult) => {
      const marker = `__AGENT_TOOL_EXIT_${randomUUID().replace(/-/g, "")}`;
      let stdout = "";
      let stderr = "";

      const finalize = (handler: () => void) => {
        clearTimeout(timer);
        shellProcess.stdout.off("data", onStdout);
        shellProcess.stderr.off("data", onStderr);
        shellProcess.off("exit", onExit);
        handler();
      };

      const onStdout = (chunk: string) => {
        stdout += chunk;
        const match = stdout.match(new RegExp(`${marker}(\\d+)`));

        if (!match) {
          return;
        }

        const exitCode = Number(match[1]);
        stdout = stdout.replace(new RegExp(`\\n?${marker}\\d+\\n?`), "").trimEnd();
        finalize(() => resolveResult({ stdout, stderr: stderr.trimEnd(), exitCode }));
      };

      const onStderr = (chunk: string) => {
        stderr += chunk;
      };

      const onExit = () => {
        this.process = null;
        finalize(() => rejectResult(new Error("Shell session exited before the command finished.")));
      };

      const timer = setTimeout(() => {
        this.dispose();
        rejectResult(new Error(`Shell command timed out after ${timeoutMs}ms.`));
      }, timeoutMs);

      shellProcess.stdout.on("data", onStdout);
      shellProcess.stderr.on("data", onStderr);
      shellProcess.once("exit", onExit);
      shellProcess.stdin.write(`${command}\n__agent_tool_status=$?\nprintf "${marker}%s\\n" "$__agent_tool_status"\n`);
    });
  }
}

const shellSessions = new Map<string, ShellSession>();

function getShellSession(projectId: string, stepId: string) {
  const sessionKey = `${projectId}:${stepId}`;
  const existing = shellSessions.get(sessionKey);

  if (existing) {
    return existing;
  }

  const { stepDir } = ensureStepWorkspace(projectId, stepId);
  const created = new ShellSession(stepDir);
  shellSessions.set(sessionKey, created);
  return created;
}

function buildShellTool(context: AgentToolContext): AgentToolRuntime {
  return {
    name: "shell_command",
    description:
      "Run a shell command inside the step workspace using a persistent bash session so state like the working directory carries across calls.",
    parameters: {
      type: "object",
      properties: {
        command: {
          type: "string",
          description: "Shell command to execute in the persistent bash session.",
        },
        timeoutMs: {
          type: "number",
          description: "Optional timeout in milliseconds. Defaults to 15000.",
        },
      },
      required: ["command"],
      additionalProperties: false,
    },
    async execute(input: unknown) {
      const args = requireObject(input);
      const command = requireString(args, "command");
      const timeoutMs = optionalNumber(args, "timeoutMs") ?? DEFAULT_SHELL_TIMEOUT_MS;
      const result = await getShellSession(context.projectId, context.step.id).run(command, timeoutMs);
      const sections = [`exit_code: ${result.exitCode}`];

      if (result.stdout.length > 0) {
        sections.push(`stdout:\n${result.stdout}`);
      }

      if (result.stderr.length > 0) {
        sections.push(`stderr:\n${result.stderr}`);
      }

      return truncateToolOutput(sections.join("\n\n"));
    },
  };
}

function buildReadFileTool(): AgentToolDefinition {
  return {
    name: "read_file",
    description: "Read a UTF-8 text file from the repository workspace.",
    parameters: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Repository-relative path to the file.",
        },
      },
      required: ["path"],
      additionalProperties: false,
    },
  };
}

function buildWriteFileTool(): AgentToolDefinition {
  return {
    name: "write_file",
    description: "Write a UTF-8 text file inside the repository workspace, creating parent directories when needed.",
    parameters: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Repository-relative path to the file.",
        },
        content: {
          type: "string",
          description: "Full file content to write.",
        },
      },
      required: ["path", "content"],
      additionalProperties: false,
    },
  };
}

function buildListDirectoryTool(): AgentToolDefinition {
  return {
    name: "list_directory",
    description: "List files and directories under a repository path.",
    parameters: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Repository-relative path to the directory. Defaults to the repository root.",
        },
      },
      required: [],
      additionalProperties: false,
    },
  };
}

function buildStepOneFileTools(): AgentToolRuntime[] {
  return [
    {
      ...buildReadFileTool(),
      async execute(input: unknown) {
        const args = requireObject(input);
        const path = requireString(args, "path");
        const resolvedPath = resolveRepoPath(path);
        const content = await readFile(resolvedPath, "utf8");
        return truncateToolOutput(content);
      },
    },
    {
      ...buildWriteFileTool(),
      async execute(input: unknown) {
        const args = requireObject(input);
        const path = requireString(args, "path");
        const content = args.content;
        if (typeof content !== "string") {
          throw new Error("Tool input must include a string field named \"content\".");
        }
        const resolvedPath = resolveRepoPath(path);
        await mkdir(dirname(resolvedPath), { recursive: true });
        await writeFile(resolvedPath, content, "utf8");
        return `wrote ${Buffer.byteLength(content, "utf8")} bytes to ${formatPathForDisplay(resolvedPath)}`;
      },
    },
    {
      ...buildListDirectoryTool(),
      async execute(input: unknown) {
        const args = input === undefined ? {} : requireObject(input);
        const requestedPath = typeof args.path === "string" && args.path.trim().length > 0 ? args.path : ".";
        const resolvedPath = resolveRepoPath(requestedPath);
        const entries = await readdir(resolvedPath, { withFileTypes: true });
        const lines = entries
          .sort((left, right) => left.name.localeCompare(right.name))
          .map((entry) => (entry.isDirectory() ? `${entry.name}/` : entry.name));

        if (lines.length === 0) {
          return "(empty directory)";
        }

        return truncateToolOutput(lines.join("\n"));
      },
    },
  ];
}

export function getAvailableAgentToolDefinitions(stepOrder: number): AgentToolDefinition[] {
  const definitions: AgentToolDefinition[] = [buildEvalTool()];

  if (stepOrder === 1) {
    definitions.push(buildShellToolDefinition(), buildReadFileTool(), buildWriteFileTool(), buildListDirectoryTool());
  }

  return definitions;
}

function buildShellToolDefinition(): AgentToolDefinition {
  return {
    name: "shell_command",
    description:
      "Run shell commands inside a persistent bash session rooted in the step workspace so state carries across calls.",
    parameters: {
      type: "object",
      properties: {
        command: {
          type: "string",
          description: "Shell command to execute.",
        },
        timeoutMs: {
          type: "number",
          description: "Optional timeout in milliseconds. Defaults to 15000.",
        },
      },
      required: ["command"],
      additionalProperties: false,
    },
  };
}

export function getAgentTools(context: AgentToolContext): AgentToolRuntime[] {
  const toolRuntimes: AgentToolRuntime[] = [
    {
      ...buildEvalTool(),
      execute: executeEvalTool,
    },
  ];

  if (context.step.step_order === 1) {
    toolRuntimes.push(buildShellTool(context), ...buildStepOneFileTools());
  }

  return toolRuntimes;
}

export function getStepWorkspaceSummary(projectId: string, stepId: string) {
  const paths = getStepWorkspacePaths(projectId, stepId);
  return {
    projectDir: formatPathForDisplay(paths.projectDir),
    stepDir: formatPathForDisplay(paths.stepDir),
    inputDir: formatPathForDisplay(paths.inputDir),
    outputDir: formatPathForDisplay(paths.outputDir),
  };
}

export function disposeAgentShellSessions() {
  for (const session of shellSessions.values()) {
    session.dispose();
  }

  shellSessions.clear();
}
