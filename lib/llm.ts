export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type LlmResponse = {
  content: string;
  model: string;
  provider: string;
  mocked: boolean;
};

function readConfig() {
  const provider = process.env.LLM_PROVIDER?.trim() || "openai-compatible";
  const baseUrl = (process.env.LLM_BASE_URL?.trim() || "https://api.openai.com/v1").replace(/\/+$/, "");
  const model = process.env.LLM_MODEL?.trim() || "gpt-4.1-mini";
  const apiKey = process.env.LLM_API_KEY?.trim() || process.env.OPENAI_API_KEY?.trim() || "";

  return { provider, baseUrl, model, apiKey };
}

export async function generateChatCompletion(messages: ChatMessage[]): Promise<LlmResponse> {
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
    };
  }

  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    const details = await response.text().catch(() => "Unknown error");
    throw new Error(`LLM request failed (${response.status}): ${details}`);
  }

  const payload = (await response.json()) as {
    model?: string;
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = payload.choices?.[0]?.message?.content?.trim();

  if (!content) {
    throw new Error("LLM returned an empty response.");
  }

  return {
    content,
    model: payload.model || config.model,
    provider: config.provider,
    mocked: false,
  };
}
