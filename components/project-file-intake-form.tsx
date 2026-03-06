"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Props = {
  projectId: string;
};

export function ProjectFileIntakeForm({ projectId }: Props) {
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
      const response = await fetch(`/api/projects/${projectId}/intake`, {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json().catch(() => null)) as
        | { error?: string; created?: number; targetStepId?: string }
        | null;

      if (!response.ok) {
        setError(payload?.error ?? "Submission failed.");
        return;
      }

      form.reset();
      router.refresh();
      setMessage(
        `Accepted ${payload?.created ?? 0} file(s). Available to Step 1 (${payload?.targetStepId ?? "unknown"}).`,
      );
    } catch {
      setError("Network or server error during upload.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="space-y-3" onSubmit={handleSubmit}>
      <div className="space-y-1">
        <label className="text-sm font-medium" htmlFor="files">
          Files
        </label>
        <Input id="files" name="files" type="file" multiple />
      </div>

      <Button disabled={isSubmitting} type="submit">
        {isSubmitting ? "Uploading..." : "Upload for processing"}
      </Button>

      {message ? <p className="text-sm text-green-700">{message}</p> : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </form>
  );
}
