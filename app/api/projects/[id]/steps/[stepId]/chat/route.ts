import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { listStepIntakeItems } from "@/lib/intake";
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

async function loadIntakeContext(projectId: string, stepId: string) {
  const items = await listStepIntakeItems(projectId, stepId);
  if (items.length === 0) {
    return "No intake files submitted yet.";
  }

  const head = items.slice(0, 8);
  const lines: string[] = [];

  for (const item of head) {
    lines.push(
      `- ${item.original_name ?? item.stored_name} | type=${item.item_type} | mime=${item.mime_type} | bytes=${item.byte_size}`,
    );

    if (item.mime_type.startsWith("text/")) {
      try {
        const content = await readFile(item.storage_path, "utf8");
        const excerpt = content.replace(/\s+/g, " ").trim().slice(0, 400);
        if (excerpt.length > 0) {
          lines.push(`  excerpt: ${excerpt}`);
        }
      } catch {
        lines.push("  excerpt: (unavailable)");
      }
    }
  }

  return `Step intake items:\n${lines.join("\n")}`;
}

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

  const intakeContext = await loadIntakeContext(projectId, stepId);
  const systemMessage = [
    `You are the agent for step ${step.step_order}: ${step.step_name}.`,
    `Agent profile: ${step.agent_profile}.`,
    `Goal: ${step.agent_goal}`,
    `Guidance: ${step.system_prompt_summary}`,
    "",
    "When relevant, use the intake context below.",
    intakeContext,
  ].join("\n");

  try {
    const result = await generateChatCompletion([
      { role: "system", content: systemMessage },
      ...incomingMessages,
    ]);

    return NextResponse.json({
      reply: result.content,
      model: result.model,
      provider: result.provider,
      mocked: result.mocked,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
