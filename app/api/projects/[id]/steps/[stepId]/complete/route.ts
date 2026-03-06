import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { demoProjects, demoSteps } from "@/lib/mock-data";
import { ensureProjectWorkspace, handoffStepOutputToNextInput } from "@/lib/workspace";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string; stepId: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const { id: projectId, stepId } = await context.params;
  const project = demoProjects.find((item) => item.id === projectId);
  const orderedSteps = [...demoSteps].sort((a, b) => a.step_order - b.step_order);
  const currentIndex = orderedSteps.findIndex((item) => item.id === stepId);

  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  if (currentIndex === -1) {
    return NextResponse.json({ error: "Step not found." }, { status: 404 });
  }

  ensureProjectWorkspace(
    project.id,
    orderedSteps.map((item) => item.id),
  );

  const nextStep = orderedSteps[currentIndex + 1];
  if (!nextStep) {
    return NextResponse.json({
      ok: true,
      finalStep: true,
      copiedFiles: 0,
      copiedDirectories: 0,
      nextStepId: null,
    });
  }

  try {
    const handoff = await handoffStepOutputToNextInput(projectId, stepId, nextStep.id);

    revalidatePath(`/projects/${projectId}/steps/${stepId}`);
    revalidatePath(`/projects/${projectId}/steps/${nextStep.id}`);

    return NextResponse.json({
      ok: true,
      finalStep: false,
      copiedFiles: handoff.copiedFiles,
      copiedDirectories: handoff.copiedDirectories,
      nextStepId: handoff.toStepId,
    });
  } catch (error) {
    console.error("Step completion handoff failed", error);
    return NextResponse.json(
      { error: "Failed to handoff this step output to the next step input." },
      { status: 500 },
    );
  }
}
