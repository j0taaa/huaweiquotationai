import { afterEach, describe, expect, test } from "bun:test";
import { rm } from "node:fs/promises";
import { join } from "node:path";
import { disposeAgentShellSessions, getAgentTools, getAvailableAgentToolDefinitions } from "@/lib/agent-tools";
import type { WorkflowStep } from "@/lib/mock-data";

const testProjectId = "prj_test_agent_tools";
const repoRoot = process.cwd();
const tempDir = join(repoRoot, "data", "tmp-agent-tools");

const baseStep: WorkflowStep = {
  id: "stp_001",
  step_order: 1,
  step_name: "Ingestion & normalization",
  input_summary: "Input",
  output_summary: "Output",
  agent_profile: "Extractor Agent",
  agent_goal: "Inspect files",
  system_prompt_summary: "Use tools when needed.",
  status: "pending",
  tools: [],
  activities: [],
};

function createStep(stepOrder: number): WorkflowStep {
  return {
    ...baseStep,
    id: `stp_00${stepOrder}`,
    step_order: stepOrder,
  };
}

afterEach(async () => {
  disposeAgentShellSessions();
  await rm(join(repoRoot, "data", "projects", testProjectId), { recursive: true, force: true });
  await rm(tempDir, { recursive: true, force: true });
});

describe("agent tools", () => {
  test("all steps expose javascript eval and only step 1 gets shell and file tools", () => {
    expect(getAvailableAgentToolDefinitions(2).map((tool) => tool.name)).toEqual(["javascript_eval"]);
    expect(getAvailableAgentToolDefinitions(1).map((tool) => tool.name)).toEqual([
      "javascript_eval",
      "shell_command",
      "read_file",
      "write_file",
      "list_directory",
    ]);
  });

  test("javascript eval returns console output and result", async () => {
    const evalTool = getAgentTools({ projectId: testProjectId, step: createStep(2) }).find(
      (tool) => tool.name === "javascript_eval",
    );

    expect(evalTool).toBeDefined();

    const output = await evalTool!.execute({
      code: 'const value = 2 + 3; console.log("value", value); value;',
    });

    expect(output).toContain("console:");
    expect(output).toContain("value 5");
    expect(output).toContain("result:\n5");
  });

  test("step 1 file tools can write, read, and list repository files", async () => {
    const tools = getAgentTools({ projectId: testProjectId, step: createStep(1) });
    const writeTool = tools.find((tool) => tool.name === "write_file");
    const readTool = tools.find((tool) => tool.name === "read_file");
    const listTool = tools.find((tool) => tool.name === "list_directory");

    expect(writeTool).toBeDefined();
    expect(readTool).toBeDefined();
    expect(listTool).toBeDefined();

    const targetPath = "data/tmp-agent-tools/sample.txt";
    await writeTool!.execute({ path: targetPath, content: "hello from tool" });

    expect(await readTool!.execute({ path: targetPath })).toBe("hello from tool");
    expect(await listTool!.execute({ path: "data/tmp-agent-tools" })).toContain("sample.txt");
  });

  test("step 1 shell tool preserves session state across calls", async () => {
    const shellTool = getAgentTools({ projectId: testProjectId, step: createStep(1) }).find(
      (tool) => tool.name === "shell_command",
    );

    expect(shellTool).toBeDefined();

    const firstRun = await shellTool!.execute({ command: "pwd" });
    expect(firstRun).toContain(`data/projects/${testProjectId}/stp_001`);

    const secondRun = await shellTool!.execute({ command: "mkdir -p shell-state && cd shell-state && pwd" });
    expect(secondRun).toContain("shell-state");

    const thirdRun = await shellTool!.execute({ command: "pwd" });
    expect(thirdRun).toContain("shell-state");
  });
});
