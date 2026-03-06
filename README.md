# Huawei Quotation AI

Base platform for orchestrating AI-agent workflows that convert source infrastructure data (AWS/Azure/GCP/on-prem) into Huawei Cloud quotation scenarios.

## Stack
- Next.js (App Router)
- Bun runtime and package manager
- Tailwind CSS + shadcn/ui
- Bun built-in SQLite

## Local development
```bash
bun install
bun run dev
```

The app runs at `http://localhost:3000`.

## Step Chat LLM configuration
Each step page includes a chat panel that calls the step agent LLM endpoint:
- `POST /api/projects/:id/steps/:stepId/chat`

## Workspace contract
Each project has its own folder under `./data/projects/<projectId>`.
Inside each project, every step has:
- `./data/projects/<projectId>/<stepId>/input`
- `./data/projects/<projectId>/<stepId>/output`

Rules:
- Files uploaded in the web UI are written into step 1 (`stp_001`) `input`.
- To finish a step and pass its output to the next step input, call:
  - `POST /api/projects/:id/steps/:stepId/complete`
- The handoff copies the full current step `output` folder content into the next step `input` folder.

Environment variables:
- `LLM_API_KEY` (or `OPENAI_API_KEY`) for authentication
- `LLM_BASE_URL` defaults to `https://api.openai.com/v1`
- `LLM_MODEL` defaults to `gpt-4.1-mini`
- `LLM_PROVIDER` label shown in UI (default: `openai-compatible`)

If no API key is set, the app runs in a mock echo mode so the chat UI still works.

## Database
SQLite file defaults to `./data/app.db` and is auto-created with seed demo data on first run.

## Docker Compose
```bash
docker compose up --build
```

This starts the app on port `3000` with a persistent named volume for SQLite data.

## Planning documents
- `plan.md` for product-level roadmap
- `plan/` for step-by-step workflow details
