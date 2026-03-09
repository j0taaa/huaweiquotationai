import { afterEach, describe, expect, test } from "bun:test";
import { generateChatCompletion } from "@/lib/llm";

const originalFetch = globalThis.fetch;
const originalApiKey = process.env.LLM_API_KEY;
const originalBaseUrl = process.env.LLM_BASE_URL;
const originalModel = process.env.LLM_MODEL;
const originalProvider = process.env.LLM_PROVIDER;

afterEach(() => {
  globalThis.fetch = originalFetch;

  if (originalApiKey === undefined) {
    delete process.env.LLM_API_KEY;
  } else {
    process.env.LLM_API_KEY = originalApiKey;
  }

  if (originalBaseUrl === undefined) {
    delete process.env.LLM_BASE_URL;
  } else {
    process.env.LLM_BASE_URL = originalBaseUrl;
  }

  if (originalModel === undefined) {
    delete process.env.LLM_MODEL;
  } else {
    process.env.LLM_MODEL = originalModel;
  }

  if (originalProvider === undefined) {
    delete process.env.LLM_PROVIDER;
  } else {
    process.env.LLM_PROVIDER = originalProvider;
  }
});

describe("generateChatCompletion", () => {
  test("passes tool definitions to the model and executes tool calls", async () => {
    process.env.LLM_API_KEY = "test-key";
    process.env.LLM_BASE_URL = "https://example.test/v1";
    process.env.LLM_MODEL = "test-model";
    process.env.LLM_PROVIDER = "test-provider";

    const requestBodies: Array<Record<string, unknown>> = [];
    const toolInputs: unknown[] = [];

    globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      requestBodies.push(JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>);

      if (requestBodies.length === 1) {
        return new Response(
          JSON.stringify({
            model: "test-model",
            choices: [
              {
                message: {
                  content: null,
                  tool_calls: [
                    {
                      id: "call_1",
                      type: "function",
                      function: {
                        name: "demo_tool",
                        arguments: JSON.stringify({ path: "demo.txt" }),
                      },
                    },
                  ],
                },
              },
            ],
          }),
          { status: 200 },
        );
      }

      return new Response(
        JSON.stringify({
          model: "test-model",
          choices: [
            {
              message: {
                content: "Tool call completed successfully.",
              },
            },
          ],
        }),
        { status: 200 },
      );
    }) as typeof fetch;

    const result = await generateChatCompletion({
      messages: [{ role: "user", content: "Inspect the file." }],
      tools: [
        {
          name: "demo_tool",
          description: "Read demo files.",
          parameters: {
            type: "object",
            properties: {
              path: { type: "string" },
            },
            required: ["path"],
          },
          async execute(input) {
            toolInputs.push(input);
            return "demo file contents";
          },
        },
      ],
    });

    expect(result.mocked).toBe(false);
    expect(result.provider).toBe("test-provider");
    expect(result.toolCalls).toEqual([
      {
        id: "call_1",
        name: "demo_tool",
        arguments: JSON.stringify({ path: "demo.txt" }),
        output: "demo file contents",
        status: "completed",
      },
    ]);
    expect(result.content).toBe("Tool call completed successfully.");
    expect(toolInputs).toEqual([{ path: "demo.txt" }]);

    const firstRequestTools = requestBodies[0]?.tools;
    expect(Array.isArray(firstRequestTools)).toBe(true);
    expect(firstRequestTools).toEqual([
      {
        type: "function",
        function: {
          name: "demo_tool",
          description: "Read demo files.",
          parameters: {
            type: "object",
            properties: {
              path: { type: "string" },
            },
            required: ["path"],
          },
        },
      },
    ]);

    const secondRequestMessages = requestBodies[1]?.messages;
    expect(Array.isArray(secondRequestMessages)).toBe(true);
    expect(secondRequestMessages).toContainEqual({
      role: "tool",
      tool_call_id: "call_1",
      name: "demo_tool",
      content: "demo file contents",
    });
  });
});
