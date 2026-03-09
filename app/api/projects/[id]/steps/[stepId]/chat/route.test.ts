import { afterEach, describe, expect, test } from "bun:test";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { POST } from "@/app/api/projects/[id]/steps/[stepId]/chat/route";

const originalApiKey = process.env.LLM_API_KEY;
const originalBaseUrl = process.env.LLM_BASE_URL;
const originalModel = process.env.LLM_MODEL;
const originalProvider = process.env.LLM_PROVIDER;

let closeServer: (() => Promise<void>) | null = null;

afterEach(async () => {
  if (closeServer) {
    await closeServer();
    closeServer = null;
  }

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

function startStubServer() {
  let requestCount = 0;
  const bodies: Array<Record<string, unknown>> = [];

  const server = createServer(async (request: IncomingMessage, response: ServerResponse) => {
    const chunks: Buffer[] = [];
    for await (const chunk of request) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }

    requestCount += 1;
    bodies.push(JSON.parse(Buffer.concat(chunks).toString("utf8")) as Record<string, unknown>);
    response.setHeader("Content-Type", "application/json");

    if (requestCount === 1) {
      response.end(
        JSON.stringify({
          model: "stub-model",
          choices: [
            {
              message: {
                content: null,
                tool_calls: [
                  {
                    id: "call_eval_1",
                    type: "function",
                    function: {
                      name: "javascript_eval",
                      arguments: JSON.stringify({ code: "2 + 3" }),
                    },
                  },
                ],
              },
            },
          ],
        }),
      );
      return;
    }

    response.end(
      JSON.stringify({
        model: "stub-model",
        choices: [
          {
            message: {
              content: "Used javascript_eval and got 5.",
            },
          },
        ],
      }),
    );
  });

  return new Promise<{ port: number; bodies: Array<Record<string, unknown>> }>((resolve, reject) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("Could not resolve stub server address."));
        return;
      }

      closeServer = () =>
        new Promise<void>((resolveClose, rejectClose) => {
          server.close((error) => {
            if (error) {
              rejectClose(error);
              return;
            }

            resolveClose();
          });
        });

      resolve({ port: address.port, bodies });
    });
  });
}

describe("step chat route", () => {
  test("returns executed tool call details from a step chat request", async () => {
    const { port, bodies } = await startStubServer();
    process.env.LLM_API_KEY = "test-key";
    process.env.LLM_BASE_URL = `http://127.0.0.1:${port}/v1`;
    process.env.LLM_MODEL = "stub-model";
    process.env.LLM_PROVIDER = "stub-provider";

    const response = await POST(
      new Request("http://localhost/api/projects/prj_001/steps/stp_002/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [{ role: "user", content: "Use a tool if needed." }],
        }),
      }),
      {
        params: Promise.resolve({ id: "prj_001", stepId: "stp_002" }),
      },
    );

    expect(response.status).toBe(200);

    const payload = (await response.json()) as {
      reply: string;
      model: string;
      provider: string;
      mocked: boolean;
      toolCalls: Array<{
        id: string;
        name: string;
        arguments: string;
        output: string;
        status: string;
      }>;
    };

    expect(payload.mocked).toBe(false);
    expect(payload.provider).toBe("stub-provider");
    expect(payload.reply).toBe("Used javascript_eval and got 5.");
    expect(payload.toolCalls).toEqual([
      {
        id: "call_eval_1",
        name: "javascript_eval",
        arguments: JSON.stringify({ code: "2 + 3" }),
        output: "result:\n5",
        status: "completed",
      },
    ]);

    const firstRequestTools = bodies[0]?.tools;
    expect(Array.isArray(firstRequestTools)).toBe(true);
    expect(firstRequestTools).toContainEqual({
      type: "function",
      function: {
        name: "javascript_eval",
        description: "Evaluate synchronous JavaScript in a sandbox. Return values and console output are captured for inspection.",
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
      },
    });
  });
});
