import { describe, expect, test } from "bun:test";
import { buildAgentSystemMessage } from "@/lib/agent-prompt";
import { getAvailableAgentToolDefinitions } from "@/lib/agent-tools";
import type { WorkflowStep } from "@/lib/mock-data";

const step: WorkflowStep = {
  id: "stp_001",
  step_order: 1,
  step_name: "Ingestion & normalization",
  input_summary: "Input",
  output_summary: "Output",
  agent_profile: "Extractor Agent",
  agent_goal: "Inspect files carefully",
  system_prompt_summary: "Use tools when needed.",
  status: "pending",
  tools: [],
  activities: [],
};

describe("buildAgentSystemMessage", () => {
  test("does not preload file names or file contents", () => {
    const prompt = buildAgentSystemMessage({
      step,
      availableTools: getAvailableAgentToolDefinitions(1),
      repositoryRoot: "/repo",
      stepWorkspace: {
        projectDir: "data/projects/prj_123",
        stepDir: "data/projects/prj_123/stp_001",
        inputDir: "data/projects/prj_123/stp_001/input",
        outputDir: "data/projects/prj_123/stp_001/output",
      },
    });

    expect(prompt).toContain("Do not assume which files exist or what any file contains before using tools.");
    expect(prompt).toContain("Use directory or shell tools to discover available files first.");
    expect(prompt).not.toContain("manifest.json");
    expect(prompt).not.toContain("excerpt:");
    expect(prompt).not.toContain("Step intake items:");
  });
});
