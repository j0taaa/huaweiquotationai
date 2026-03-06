import { access, copyFile, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
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

export type StepHandoffResult = {
  fromStepId: string;
  toStepId: string;
  fromOutputDir: string;
  toInputDir: string;
  copiedFiles: number;
  copiedDirectories: number;
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

async function pathExists(path: string) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function nextAvailableFilePath(path: string) {
  if (!(await pathExists(path))) {
    return path;
  }

  const suffix = Date.now().toString(36);
  return `${path}.${suffix}`;
}

async function copyDirectoryContents(sourceDir: string, targetDir: string): Promise<{
  files: number;
  directories: number;
}> {
  await mkdir(targetDir, { recursive: true });
  let files = 0;
  let directories = 0;

  const entries = await readdir(sourceDir, { withFileTypes: true });
  for (const entry of entries) {
    const sourcePath = join(sourceDir, entry.name);
    const targetPath = join(targetDir, entry.name);

    if (entry.isDirectory()) {
      const nested = await copyDirectoryContents(sourcePath, targetPath);
      directories += 1 + nested.directories;
      files += nested.files;
      continue;
    }

    if (entry.isFile()) {
      const destination = await nextAvailableFilePath(targetPath);
      await copyFile(sourcePath, destination);
      files += 1;
    }
  }

  return { files, directories };
}

export async function handoffStepOutputToNextInput(
  projectId: string,
  fromStepId: string,
  toStepId: string,
) {
  const fromPaths = ensureStepWorkspace(projectId, fromStepId);
  const toPaths = ensureStepWorkspace(projectId, toStepId);
  const copyResult = await copyDirectoryContents(fromPaths.outputDir, toPaths.inputDir);

  const manifestPath = join(toPaths.inputDir, "handoff-manifest.json");
  const existingManifest = await readFile(manifestPath, "utf8")
    .then((content) => JSON.parse(content) as StepHandoffResult[])
    .catch(() => []);
  const manifestEntry: StepHandoffResult = {
    fromStepId,
    toStepId,
    fromOutputDir: fromPaths.outputDir,
    toInputDir: toPaths.inputDir,
    copiedFiles: copyResult.files,
    copiedDirectories: copyResult.directories,
  };

  await writeFile(manifestPath, `${JSON.stringify([manifestEntry, ...existingManifest], null, 2)}\n`, "utf8");
  return manifestEntry;
}
