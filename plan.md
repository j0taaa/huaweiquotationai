# Huawei Quotation AI - General Plan

## Product Goal
Build a Next.js application where users create quotation projects that transform infrastructure data from AWS, Azure, GCP, or on-premise environments into Huawei Cloud quotations.

## Core Domain
- **User**: can own multiple quotation projects.
- **Quotation Project**: one end-to-end pipeline run, from raw input ingestion to one or more final Huawei quotations.
- **Step**: ordered stage in the project workflow. Every project uses the same step template sequence.
- **Agent Runtime**: each step runs with its own system prompt, tools, and knowledge pack.
- **Quotation Result**: one project can produce multiple scenario-based quotations.

## Baseline Workflow
1. Intake and normalize files (spreadsheets, PDFs, text exports, etc.).
2. Build cloud-agnostic service objects (e.g., VM spec, DB profile, storage footprint).
3. Map cloud-agnostic objects to Huawei Cloud catalog entities (e.g., ECS flavor choices).
4. Push mapped output to Huawei Cloud Calculator API to create and retrieve quotations.

## Initial Technical Foundations
- Next.js App Router with Bun runtime.
- Tailwind CSS + shadcn/ui for dashboard and workflow UIs.
- Bun built-in SQLite for local persistence and rapid iteration.
- Docker Compose for consistent local startup.

## Delivery Phases
- **Phase 1 (current)**: scaffold project, data model, and base UI.
- **Phase 2**: add file ingestion and document parsing pipeline.
- **Phase 3**: add cloud-agnostic modeling + Huawei mapping orchestration.
- **Phase 4**: add Huawei Calculator API integration, quotation lifecycle, and exports.
- **Phase 5**: add observability, auth hardening, collaboration, and production ops.
