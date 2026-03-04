# Step 4 - Quotation Execution (Huawei Calculator)

## Purpose
Automate quotation creation and scenario generation using Huawei Cloud Calculator APIs.

## Inputs
- Huawei-ready mapped objects from Step 3.
- User constraints (region, pricing model, currency, discount assumptions).

## Agent Responsibilities
- Build API payloads for calculator workflows.
- Submit baseline and alternative scenarios.
- Retrieve quotation references and totals.
- Store results with status tracking and retry metadata.

## Outputs
- One or more quotations linked to the project.
- Cost breakdown snapshots.
- Audit trail of requests/responses and run status.

## Notes
Initial release can mock API calls behind a stable service interface until credentials and account setup are finalized.
