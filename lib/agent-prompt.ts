import type { AgentToolDefinition } from "@/lib/agent-tools";
import type { WorkflowStep } from "@/lib/mock-data";

type StepWorkspaceSummary = {
  projectDir: string;
  stepDir: string;
  inputDir: string;
  outputDir: string;
};

type BuildAgentSystemMessageInput = {
  step: WorkflowStep;
  availableTools: AgentToolDefinition[];
  repositoryRoot: string;
  stepWorkspace: StepWorkspaceSummary;
};

export function buildAgentSystemMessage({
  step,
  availableTools,
  repositoryRoot,
  stepWorkspace,
}: BuildAgentSystemMessageInput) {
  return [
    `You are the agent for step ${step.step_order}: ${step.step_name}.`,
    `Agent profile: ${step.agent_profile}.`,
    `Goal: ${step.agent_goal}`,
    `Guidance: ${step.system_prompt_summary}`,
    "",
    "Available tools:",
    ...availableTools.map((tool) => `- ${tool.name}: ${tool.description}`),
    "",
    `Repository root: ${repositoryRoot}`,
    `Project workspace: ${stepWorkspace.projectDir}`,
    `Step workspace: ${stepWorkspace.stepDir}`,
    `Step input folder: ${stepWorkspace.inputDir}`,
    `Step output folder: ${stepWorkspace.outputDir}`,
    "",
    "Do not assume which files exist or what any file contains before using tools.",
    "Use directory or shell tools to discover available files first.",
    "Only claim knowledge of file contents after reading them with a tool.",
  ].join("\n");
}
