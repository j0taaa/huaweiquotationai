"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type Props = {
  projectId: string;
  stepId: string;
};

type CompletionResponse = {
  ok?: boolean;
  error?: string;
  finalStep?: boolean;
  copiedFiles?: number;
  copiedDirectories?: number;
  nextStepId?: string | null;
};

export function StepCompletionPanel({ projectId, stepId }: Props) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setIsSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/steps/${stepId}/complete`, {
        method: "POST",
      });
      const payload = (await response.json().catch(() => null)) as CompletionResponse | null;

      if (!response.ok) {
        setError(payload?.error ?? "Step completion failed.");
        return;
      }

      if (payload?.finalStep) {
        setMessage("This is the final step. No next-step handoff is required.");
      } else {
        setMessage(
          `Handoff complete: ${payload?.copiedFiles ?? 0} file(s), ${payload?.copiedDirectories ?? 0} folder(s) copied to ${payload?.nextStepId ?? "next step"}.`,
        );
      }
      router.refresh();
    } catch {
      setError("Network or server error during handoff.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-3">
      <Button disabled={isSubmitting} onClick={handleClick} type="button" variant="outline">
        {isSubmitting ? "Finishing step..." : "Finish step and pass output to next step"}
      </Button>
      {message ? <p className="text-sm text-green-700">{message}</p> : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </div>
  );
}
