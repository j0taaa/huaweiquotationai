"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type Props = {
  projectId: string;
  stepId: string;
};

export function StepChatPanel({ projectId, stepId }: Props) {
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<{ model: string; provider: string; mocked: boolean } | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const canSend = useMemo(() => input.trim().length > 0 && !isSending, [input, isSending]);

  async function sendMessage() {
    if (!canSend) {
      return;
    }

    const userMessage: ChatMessage = { role: "user", content: input.trim() };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setError(null);
    setIsSending(true);

    try {
      const response = await fetch(`/api/projects/${projectId}/steps/${stepId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { error?: string; reply?: string; model?: string; provider?: string; mocked?: boolean }
        | null;

      if (!response.ok || !payload?.reply) {
        setError(payload?.error ?? "Chat request failed.");
        return;
      }

      setMeta({
        model: payload.model ?? "unknown",
        provider: payload.provider ?? "unknown",
        mocked: Boolean(payload.mocked),
      });
      setMessages((current) => [...current, { role: "assistant", content: payload.reply ?? "" }]);
    } catch {
      setError("Network or server error during chat.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="h-96 space-y-3 overflow-y-auto rounded-md border bg-muted/20 p-3">
        {messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Start a conversation with this step agent. Ask it to explain assumptions, mappings, or outputs.
          </p>
        ) : (
          messages.map((message, index) => (
            <div
              className={`max-w-[85%] rounded-md px-3 py-2 text-sm ${
                message.role === "user"
                  ? "ml-auto bg-primary text-primary-foreground"
                  : "mr-auto bg-card border"
              }`}
              key={`${message.role}-${index}`}
            >
              <p className="mb-1 text-xs opacity-70">{message.role === "user" ? "You" : "Agent"}</p>
              <p className="whitespace-pre-wrap">{message.content}</p>
            </div>
          ))
        )}
      </div>

      <div className="space-y-2">
        <Textarea
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
              event.preventDefault();
              void sendMessage();
            }
          }}
          placeholder="Type a message. Press Ctrl/Cmd+Enter to send."
          rows={4}
          value={input}
        />
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            {meta
              ? `Provider: ${meta.provider} • Model: ${meta.model}${meta.mocked ? " • mock mode" : ""}`
              : "No model response yet."}
          </p>
          <Button disabled={!canSend} onClick={() => void sendMessage()} type="button">
            {isSending ? "Sending..." : "Send"}
          </Button>
        </div>
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
      </div>
    </div>
  );
}
