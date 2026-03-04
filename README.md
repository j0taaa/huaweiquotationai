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
