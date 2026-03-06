import { mkdirSync } from "node:fs";
import { join } from "node:path";

const WORKSPACE_ROOT = process.env.PROJECT_WORKSPACE_ROOT ?? "./data/projects";

function assertSafeSegment(value: string, name: string) {
  if (!/^[A-Za-z0-9._-]+$/.test(value)) {
    throw new Error(`Invalid ${name}: "${value}"`);
  }
}

export type StepWorkspacePaths = {
  projectDir: string;
  stepDir: string;
  inputDir: string;
  outputDir: string;
};

export function getStepWorkspacePaths(projectId: string, stepId: string): StepWorkspacePaths {
  assertSafeSegment(projectId, "projectId");
  assertSafeSegment(stepId, "stepId");

  const projectDir = join(WORKSPACE_ROOT, projectId);
  const stepDir = join(projectDir, stepId);
  const inputDir = join(stepDir, "input");
  const outputDir = join(stepDir, "output");

  return { projectDir, stepDir, inputDir, outputDir };
}

export function ensureStepWorkspace(projectId: string, stepId: string): StepWorkspacePaths {
  const paths = getStepWorkspacePaths(projectId, stepId);
  mkdirSync(paths.inputDir, { recursive: true });
  mkdirSync(paths.outputDir, { recursive: true });
  return paths;
}

export function ensureProjectWorkspace(projectId: string, stepIds: string[]) {
  for (const stepId of stepIds) {
    ensureStepWorkspace(projectId, stepId);
  }
}
