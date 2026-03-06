import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { storeStepIntake } from "@/lib/intake";
import { demoProjects, demoSteps } from "@/lib/mock-data";
import { ensureProjectWorkspace } from "@/lib/workspace";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string; stepId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { id: projectId, stepId } = await context.params;
  const project = demoProjects.find((item) => item.id === projectId);

  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  ensureProjectWorkspace(
    projectId,
    demoSteps.map((item) => item.id),
  );

  const step = demoSteps.find((item) => item.id === stepId);

  if (!step) {
    return NextResponse.json({ error: "Step not found." }, { status: 404 });
  }

  if (step.step_order !== 1) {
    return NextResponse.json(
      { error: "Only step 1 accepts intake submissions in this phase." },
      { status: 400 },
    );
  }

  const formData = await request.formData();
  const intakeTextValue = formData.get("intakeText");
  const intakeText = typeof intakeTextValue === "string" ? intakeTextValue : "";
  const files = formData
    .getAll("files")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);

  if (intakeText.trim().length === 0 && files.length === 0) {
    return NextResponse.json(
      { error: "Provide either text, one or more files, or both." },
      { status: 400 },
    );
  }

  try {
    const createdItems = await storeStepIntake({
      projectId,
      stepId,
      text: intakeText,
      files,
    });

    revalidatePath(`/projects/${projectId}/steps/${stepId}`);

    return NextResponse.json({
      ok: true,
      created: createdItems.length,
    });
  } catch (error) {
    console.error("Step intake failed", error);
    return NextResponse.json({ error: "Failed to store intake input." }, { status: 500 });
  }
}
