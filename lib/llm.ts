export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type ChatTool = {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  execute: (input: unknown) => Promise<string>;
};

type GenerateChatCompletionInput = {
  messages: ChatMessage[];
  tools?: ChatTool[];
};

type ApiToolCall = {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
};

type ApiMessage =
  | {
      role: "system" | "user" | "assistant";
      content: string;
    }
  | {
      role: "assistant";
      content: string | null;
      tool_calls: ApiToolCall[];
    }
  | {
      role: "tool";
      content: string;
      tool_call_id: string;
      name: string;
    };

type LlmResponse = {
  content: string;
  model: string;
  provider: string;
  mocked: boolean;
  toolCalls: Array<{ name: string }>;
};

function readConfig() {
  const provider = process.env.LLM_PROVIDER?.trim() || "openai-compatible";
  const baseUrl = (process.env.LLM_BASE_URL?.trim() || "https://api.openai.com/v1").replace(/\/+$/, "");
  const model = process.env.LLM_MODEL?.trim() || "gpt-4.1-mini";
  const apiKey = process.env.LLM_API_KEY?.trim() || process.env.OPENAI_API_KEY?.trim() || "";

  return { provider, baseUrl, model, apiKey };
}

function parseToolArguments(rawValue: string) {
  try {
    return JSON.parse(rawValue) as unknown;
  } catch {
    return { raw: rawValue };
  }
}

export async function generateChatCompletion({
  messages,
  tools = [],
}: GenerateChatCompletionInput): Promise<LlmResponse> {
  const config = readConfig();

  if (!config.apiKey) {
    const lastUser = [...messages].reverse().find((item) => item.role === "user");
    return {
      content:
        "LLM API key is not configured. Set LLM_API_KEY (or OPENAI_API_KEY) to enable real model responses.\n\n" +
        `Echo of your last message:\n${lastUser?.content ?? "(no user message)"}`,
      model: "mock-echo",
      provider: config.provider,
      mocked: true,
      toolCalls: [],
    };
  }

  const toolMap = new Map(tools.map((tool) => [tool.name, tool]));
  const toolCalls: Array<{ name: string }> = [];
  const conversation: ApiMessage[] = [...messages];

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: config.model,
        messages: conversation,
        temperature: 0.2,
        tools: tools.map((tool) => ({
          type: "function",
          function: {
            name: tool.name,
            description: tool.description,
            parameters: tool.parameters,
          },
        })),
      }),
    });

    if (!response.ok) {
      const details = await response.text().catch(() => "Unknown error");
      throw new Error(`LLM request failed (${response.status}): ${details}`);
    }

    const payload = (await response.json()) as {
      model?: string;
      choices?: Array<{
        message?: {
          content?: string | null;
          tool_calls?: ApiToolCall[];
        };
      }>;
    };
    const message = payload.choices?.[0]?.message;
    const pendingToolCalls = message?.tool_calls ?? [];

    if (pendingToolCalls.length > 0) {
      conversation.push({
        role: "assistant",
        content: message?.content ?? null,
        tool_calls: pendingToolCalls,
      });

      for (const toolCall of pendingToolCalls) {
        const tool = toolMap.get(toolCall.function.name);
        let toolOutput = `tool_error:\nUnknown tool \"${toolCall.function.name}\".`;

        if (tool) {
          try {
            toolOutput = await tool.execute(parseToolArguments(toolCall.function.arguments));
          } catch (error) {
            const message = error instanceof Error ? error.message : "Unknown tool execution error.";
            toolOutput = `tool_error:\n${message}`;
          }
        }

        toolCalls.push({ name: toolCall.function.name });
        conversation.push({
          role: "tool",
          tool_call_id: toolCall.id,
          name: toolCall.function.name,
          content: toolOutput,
        });
      }

      continue;
    }

    const content = message?.content?.trim();

    if (!content) {
      throw new Error("LLM returned an empty response.");
    }

    return {
      content,
      model: payload.model || config.model,
      provider: config.provider,
      mocked: false,
      toolCalls,
    };
  }

  throw new Error("LLM exceeded the maximum number of tool iterations.");
}
