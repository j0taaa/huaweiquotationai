import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { storeStepIntake } from "@/lib/intake";
import { demoProjects, demoSteps } from "@/lib/mock-data";
import { ensureProjectWorkspace } from "@/lib/workspace";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { id: projectId } = await context.params;
  const project = demoProjects.find((item) => item.id === projectId);

  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const firstStep = demoSteps.find((step) => step.step_order === 1);

  if (!firstStep) {
    return NextResponse.json({ error: "Step 1 is not configured." }, { status: 500 });
  }

  ensureProjectWorkspace(
    projectId,
    demoSteps.map((item) => item.id),
  );

  const formData = await request.formData();
  const files = formData
    .getAll("files")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);

  if (files.length === 0) {
    return NextResponse.json({ error: "Provide one or more files." }, { status: 400 });
  }

  try {
    const createdItems = await storeStepIntake({
      projectId,
      stepId: firstStep.id,
      text: "",
      files,
    });

    revalidatePath(`/projects/${projectId}`);
    revalidatePath(`/projects/${projectId}/steps/${firstStep.id}`);

    return NextResponse.json({
      ok: true,
      created: createdItems.length,
      targetStepId: firstStep.id,
    });
  } catch (error) {
    console.error("Project intake failed", error);
    return NextResponse.json({ error: "Failed to store project intake files." }, { status: 500 });
  }
}
