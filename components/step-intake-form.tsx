"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  projectId: string;
  stepId: string;
};

export function StepIntakeForm({ projectId, stepId }: Props) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);
    setError(null);

    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const response = await fetch(`/api/projects/${projectId}/steps/${stepId}/intake`, {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json().catch(() => null)) as
        | { error?: string; created?: number }
        | null;

      if (!response.ok) {
        setError(payload?.error ?? "Submission failed.");
        return;
      }

      form.reset();
      router.refresh();
      setMessage(`Accepted ${payload?.created ?? 0} intake item(s).`);
    } catch {
      setError("Network or server error during upload.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="space-y-3" onSubmit={handleSubmit}>
      <div className="space-y-1">
        <label className="text-sm font-medium" htmlFor="intakeText">
          Text input
        </label>
        <Textarea
          id="intakeText"
          name="intakeText"
          placeholder="Paste architecture notes, constraints, or migration assumptions."
          rows={4}
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium" htmlFor="files">
          File input
        </label>
        <Input id="files" name="files" type="file" multiple />
      </div>

      <Button disabled={isSubmitting} type="submit">
        {isSubmitting ? "Submitting..." : "Submit to intake"}
      </Button>

      {message ? <p className="text-sm text-green-700">{message}</p> : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </form>
  );
}
