# Step 1 - Intake and Normalization

## Purpose
Collect heterogeneous source files and transform them into structured, queryable intermediate assets.

## Inputs
- Spreadsheets (CSV/XLSX)
- PDFs (architecture docs, invoices, inventories)
- Plain text / markdown notes
- Optional JSON/YAML exports from cloud discovery tools

## Agent Responsibilities
- Identify file type and extract content.
- Normalize tabular data into SQLite staging tables.
- Chunk and index long-form text for downstream analysis.
- Produce data quality report (missing fields, ambiguous values).

## Outputs
- Canonical staging datasets.
- Metadata manifest with source file lineage.
- Validation report and confidence scores.

## Notes
Start with local ingestion and synchronous processing, then evolve to queued background jobs.
