import { randomUUID } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import { ensureStepWorkspace } from "@/lib/workspace";

export type IntakeItem = {
  id: string;
  item_type: "text" | "file";
  original_name: string | null;
  stored_name: string;
  storage_path: string;
  mime_type: string;
  byte_size: number;
  created_at: string;
};

type IntakeInput = {
  projectId: string;
  stepId: string;
  text: string;
  files: File[];
};

async function readManifest(manifestPath: string): Promise<IntakeItem[]> {
  try {
    const content = await readFile(manifestPath, "utf8");
    const parsed = JSON.parse(content) as IntakeItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeManifest(manifestPath: string, items: IntakeItem[]) {
  await writeFile(manifestPath, `${JSON.stringify(items, null, 2)}\n`, "utf8");
}

export async function storeStepIntake({ projectId, stepId, text, files }: IntakeInput) {
  const { inputDir } = ensureStepWorkspace(projectId, stepId);
  const manifestPath = join(inputDir, "manifest.json");
  const existing = await readManifest(manifestPath);
  const created: IntakeItem[] = [];

  if (text.trim().length > 0) {
    const itemId = `int_${randomUUID()}`;
    const storedName = `${itemId}.txt`;
    const storagePath = join(inputDir, storedName);
    const content = `${text.trim()}\n`;

    await writeFile(storagePath, content, "utf8");

    created.push({
      id: itemId,
      item_type: "text",
      original_name: "inline-text",
      stored_name: storedName,
      storage_path: storagePath,
      mime_type: "text/plain",
      byte_size: Buffer.byteLength(content, "utf8"),
      created_at: new Date().toISOString(),
    });
  }

  for (const file of files) {
    if (file.size === 0) {
      continue;
    }

    const itemId = `int_${randomUUID()}`;
    const originalName = basename(file.name || "uploaded-file");
    const extension = extname(originalName);
    const storedName = `${itemId}${extension}`;
    const storagePath = join(inputDir, storedName);
    const buffer = Buffer.from(await file.arrayBuffer());

    await writeFile(storagePath, buffer);

    created.push({
      id: itemId,
      item_type: "file",
      original_name: originalName,
      stored_name: storedName,
      storage_path: storagePath,
      mime_type: file.type || "application/octet-stream",
      byte_size: buffer.byteLength,
      created_at: new Date().toISOString(),
    });
  }

  if (created.length > 0) {
    await writeManifest(manifestPath, [...created, ...existing]);
  }

  return created;
}

export async function listStepIntakeItems(projectId: string, stepId: string) {
  const { inputDir } = ensureStepWorkspace(projectId, stepId);
  const manifestPath = join(inputDir, "manifest.json");
  return readManifest(manifestPath);
}
