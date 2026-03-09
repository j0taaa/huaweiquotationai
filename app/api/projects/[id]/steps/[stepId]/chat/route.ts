import { NextResponse } from "next/server";
import { getAgentTools, getAvailableAgentToolDefinitions, getStepWorkspaceSummary } from "@/lib/agent-tools";
import { buildAgentSystemMessage } from "@/lib/agent-prompt";
import { generateChatCompletion, type ChatMessage } from "@/lib/llm";
import { demoProjects, demoSteps } from "@/lib/mock-data";
import { ensureProjectWorkspace } from "@/lib/workspace";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string; stepId: string }>;
};

type ChatRequest = {
  messages: ChatMessage[];
};

type RunningTool = {
  name: string;
  purpose: string;
};

function normalizeMessages(value: unknown): ChatMessage[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const out: ChatMessage[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") {
      continue;
    }

    const role = (entry as { role?: unknown }).role;
    const content = (entry as { content?: unknown }).content;

    if (
      (role === "system" || role === "user" || role === "assistant") &&
      typeof content === "string" &&
      content.trim().length > 0
    ) {
      out.push({ role, content: content.trim() });
    }
  }

  return out.slice(-20);
}

export async function POST(request: Request, context: RouteContext) {
  const { id: projectId, stepId } = await context.params;
  const project = demoProjects.find((item) => item.id === projectId);
  const step = demoSteps.find((item) => item.id === stepId);

  if (!project || !step) {
    return NextResponse.json({ error: "Project or step not found." }, { status: 404 });
  }

  ensureProjectWorkspace(
    projectId,
    demoSteps.map((item) => item.id),
  );

  const body = (await request.json().catch(() => null)) as ChatRequest | null;
  const incomingMessages = normalizeMessages(body?.messages);

  if (incomingMessages.length === 0) {
    return NextResponse.json({ error: "Provide at least one chat message." }, { status: 400 });
  }

  const runningTool = step.tools.find((item) => item.status === "running");
  const availableTools = getAvailableAgentToolDefinitions(step.step_order);
  const stepWorkspace = getStepWorkspaceSummary(projectId, stepId);
  const activeTool: RunningTool = runningTool
    ? {
        name: runningTool.toolName,
        purpose: runningTool.purpose,
      }
    : {
        name: "llm-chat-completions",
        purpose: "Generate the assistant response using the configured LLM provider.",
      };
  const systemMessage = buildAgentSystemMessage({
    step,
    availableTools,
    repositoryRoot: process.cwd(),
    stepWorkspace,
  });

  try {
    const agentTools = getAgentTools({ projectId, step });
    const result = await generateChatCompletion({
      messages: [{ role: "system", content: systemMessage }, ...incomingMessages],
      tools: agentTools,
    });
    const lastToolCall = result.toolCalls.at(-1);
    const responseTool = lastToolCall
      ? availableTools.find((tool) => tool.name === lastToolCall.name)
      : null;

    return NextResponse.json({
      reply: result.content,
      model: result.model,
      provider: result.provider,
      mocked: result.mocked,
      toolCalls: result.toolCalls,
      runningTool: responseTool
        ? {
            name: responseTool.name,
            purpose: responseTool.description,
          }
        : activeTool,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
