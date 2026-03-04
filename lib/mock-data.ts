export type AgentToolCall = {
  id: string;
  toolName: string;
  purpose: string;
  status: "completed" | "running" | "queued";
  timestamp: string;
};

export type AgentActivity = {
  id: string;
  timestamp: string;
  message: string;
  level: "info" | "success" | "warning";
};

export type WorkflowStep = {
  id: string;
  step_order: number;
  step_name: string;
  input_summary: string;
  output_summary: string;
  agent_profile: string;
  agent_goal: string;
  system_prompt_summary: string;
  status: "completed" | "in_progress" | "pending";
  tools: AgentToolCall[];
  activities: AgentActivity[];
};

export const demoProjects = [
  {
    id: "prj_001",
    name: "Retail platform migration",
    source_environment: "AWS",
    status: "in_progress",
  },
  {
    id: "prj_002",
    name: "Banking analytics modernization",
    source_environment: "Azure",
    status: "draft",
  },
];

export const demoSteps: WorkflowStep[] = [
  {
    id: "stp_001",
    step_order: 1,
    step_name: "Ingestion & normalization",
    input_summary: "Spreadsheets, PDFs, text exports",
    output_summary: "Unified staging tables and normalized document chunks",
    agent_profile: "Extractor Agent",
    agent_goal: "Transform all raw customer files into clean structured and searchable data.",
    system_prompt_summary:
      "Prioritize data lineage and flag malformed rows. Preserve source references for every extracted entity.",
    status: "completed",
    tools: [
      {
        id: "tool_001",
        toolName: "spreadsheet-parser",
        purpose: "Read XLSX billing inventories and normalize columns.",
        status: "completed",
        timestamp: "2026-03-03T09:11:00Z",
      },
      {
        id: "tool_002",
        toolName: "pdf-ocr",
        purpose: "Extract architecture notes and capacity constraints from PDF diagrams.",
        status: "completed",
        timestamp: "2026-03-03T09:14:12Z",
      },
      {
        id: "tool_003",
        toolName: "sqlite-loader",
        purpose: "Load normalized datasets into staging tables.",
        status: "completed",
        timestamp: "2026-03-03T09:16:20Z",
      },
    ],
    activities: [
      {
        id: "act_001",
        timestamp: "09:10:54",
        message: "Detected 6 source files: 2 XLSX, 1 CSV, 2 PDF, 1 TXT.",
        level: "info",
      },
      {
        id: "act_002",
        timestamp: "09:15:31",
        message: "Mapped 98% of spreadsheet headers to canonical schema.",
        level: "success",
      },
      {
        id: "act_003",
        timestamp: "09:17:05",
        message: "Flagged 3 rows with missing region data for manual review.",
        level: "warning",
      },
    ],
  },
  {
    id: "stp_002",
    step_order: 2,
    step_name: "Cloud-agnostic modeling",
    input_summary: "Normalized staging data",
    output_summary: "Canonical services catalog",
    agent_profile: "Modeling Agent",
    agent_goal: "Derive cloud-agnostic service objects from normalized datasets and docs.",
    system_prompt_summary:
      "Translate provider-specific SKUs into canonical service types while preserving performance requirements and assumptions.",
    status: "in_progress",
    tools: [
      {
        id: "tool_004",
        toolName: "sql-runner",
        purpose: "Aggregate compute/storage/network metrics from staging tables.",
        status: "completed",
        timestamp: "2026-03-03T09:25:33Z",
      },
      {
        id: "tool_005",
        toolName: "entity-classifier",
        purpose: "Classify resources into VM, DB, object storage, and networking objects.",
        status: "running",
        timestamp: "2026-03-03T09:31:02Z",
      },
      {
        id: "tool_006",
        toolName: "assumption-tracker",
        purpose: "Store unresolved ambiguities and confidence levels.",
        status: "queued",
        timestamp: "2026-03-03T09:33:11Z",
      },
    ],
    activities: [
      {
        id: "act_004",
        timestamp: "09:24:02",
        message: "Built temporary SQL views for EC2, RDS, S3 and VPC datasets.",
        level: "info",
      },
      {
        id: "act_005",
        timestamp: "09:29:40",
        message: "Generated 42 cloud-agnostic service candidates.",
        level: "success",
      },
      {
        id: "act_006",
        timestamp: "09:32:27",
        message: "Still resolving GPU profile for 4 VM workloads.",
        level: "warning",
      },
    ],
  },
  {
    id: "stp_003",
    step_order: 3,
    step_name: "Huawei service mapping",
    input_summary: "Cloud-agnostic catalog",
    output_summary: "Huawei object list with service/flavor selections",
    agent_profile: "Mapper Agent",
    agent_goal: "Map canonical objects to Huawei Cloud services and recommended flavors.",
    system_prompt_summary:
      "Choose service mappings with best fit and produce fallback alternatives for every critical workload.",
    status: "pending",
    tools: [
      {
        id: "tool_007",
        toolName: "huawei-catalog-search",
        purpose: "Find matching Huawei Cloud services and flavors.",
        status: "queued",
        timestamp: "2026-03-03T09:42:10Z",
      },
    ],
    activities: [
      {
        id: "act_007",
        timestamp: "09:41:52",
        message: "Waiting for canonical catalog from step 2.",
        level: "info",
      },
    ],
  },
  {
    id: "stp_004",
    step_order: 4,
    step_name: "Huawei calculator quotation",
    input_summary: "Huawei object list",
    output_summary: "One or more costed quotations",
    agent_profile: "Quotation Agent",
    agent_goal: "Send mapped services to Huawei Calculator API and return scenarios.",
    system_prompt_summary:
      "Generate baseline and optimized scenarios, then summarize deltas and assumptions for reviewers.",
    status: "pending",
    tools: [
      {
        id: "tool_008",
        toolName: "calculator-api-client",
        purpose: "Submit quotation payloads and fetch cost totals.",
        status: "queued",
        timestamp: "2026-03-03T09:50:00Z",
      },
    ],
    activities: [
      {
        id: "act_008",
        timestamp: "09:49:10",
        message: "No activity yet. This step starts after mapping completes.",
        level: "info",
      },
    ],
  },
];

export const demoQuotations = [
  {
    id: "quo_001",
    quotation_name: "ECS + RDS baseline",
    currency: "USD",
    estimated_monthly_cost: 14230.5,
    status: "draft",
  },
  {
    id: "quo_002",
    quotation_name: "Performance optimized option",
    currency: "USD",
    estimated_monthly_cost: 17990,
    status: "pending_review",
  },
];
