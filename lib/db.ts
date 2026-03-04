import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

const dbPath = process.env.DATABASE_PATH ?? "./data/app.db";
mkdirSync(dirname(dbPath), { recursive: true });

const db = new Database(dbPath, { create: true });

const migrationStatements = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`,
  `CREATE TABLE IF NOT EXISTS quotation_projects (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    source_environment TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );`,
  `CREATE TABLE IF NOT EXISTS project_steps (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    step_order INTEGER NOT NULL,
    step_name TEXT NOT NULL,
    input_summary TEXT,
    output_summary TEXT,
    agent_profile TEXT NOT NULL,
    status TEXT NOT NULL,
    FOREIGN KEY (project_id) REFERENCES quotation_projects(id)
  );`,
  `CREATE TABLE IF NOT EXISTS quotations (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    quotation_name TEXT NOT NULL,
    currency TEXT NOT NULL,
    estimated_monthly_cost REAL,
    status TEXT NOT NULL,
    calculator_url TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES quotation_projects(id)
  );`,
];

for (const statement of migrationStatements) {
  db.exec(statement);
}

const userCount = db.query("SELECT COUNT(*) AS total FROM users").get() as { total: number };

if (userCount.total === 0) {
  db.exec(`
    INSERT INTO users (id, name, email)
    VALUES ('usr_demo', 'Demo User', 'demo@huaweiquotation.ai');

    INSERT INTO quotation_projects (id, user_id, name, source_environment, status)
    VALUES
      ('prj_001', 'usr_demo', 'Retail platform migration', 'AWS', 'in_progress'),
      ('prj_002', 'usr_demo', 'Banking analytics modernization', 'Azure', 'draft');

    INSERT INTO project_steps (id, project_id, step_order, step_name, input_summary, output_summary, agent_profile, status)
    VALUES
      ('stp_001', 'prj_001', 1, 'Ingestion & normalization', '2 spreadsheets + 1 architecture PDF', 'Unified staging tables and document chunks', 'Extractor Agent', 'completed'),
      ('stp_002', 'prj_001', 2, 'Cloud-agnostic modeling', 'Normalized inventory dataset', 'Canonical workload objects (VM, DB, object storage, network)', 'Modeling Agent', 'in_progress'),
      ('stp_003', 'prj_001', 3, 'Huawei service mapping', NULL, NULL, 'Mapper Agent', 'pending'),
      ('stp_004', 'prj_001', 4, 'Huawei calculator quotation', NULL, NULL, 'Quotation Agent', 'pending');

    INSERT INTO quotations (id, project_id, quotation_name, currency, estimated_monthly_cost, status, calculator_url)
    VALUES
      ('quo_001', 'prj_001', 'ECS + RDS baseline', 'USD', 14230.50, 'draft', NULL),
      ('quo_002', 'prj_001', 'Performance optimized option', 'USD', 17990.00, 'pending_review', NULL);
  `);
}

export { db };
