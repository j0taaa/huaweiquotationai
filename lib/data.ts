import { db } from "@/lib/db";

export type Project = {
  id: string;
  name: string;
  source_environment: string;
  status: string;
  created_at: string;
};

export type ProjectStep = {
  id: string;
  step_order: number;
  step_name: string;
  input_summary: string | null;
  output_summary: string | null;
  agent_profile: string;
  status: string;
};

export type Quotation = {
  id: string;
  quotation_name: string;
  currency: string;
  estimated_monthly_cost: number | null;
  status: string;
};

export function listProjectsForUser(userId: string): Project[] {
  return db
    .query(
      `SELECT id, name, source_environment, status, created_at
       FROM quotation_projects
       WHERE user_id = ?
       ORDER BY datetime(created_at) DESC`,
    )
    .all(userId) as Project[];
}

export function getProject(projectId: string): Project | null {
  return (
    (db
      .query(
        `SELECT id, name, source_environment, status, created_at
         FROM quotation_projects
         WHERE id = ?`,
      )
      .get(projectId) as Project | undefined) ?? null
  );
}

export function listProjectSteps(projectId: string): ProjectStep[] {
  return db
    .query(
      `SELECT id, step_order, step_name, input_summary, output_summary, agent_profile, status
       FROM project_steps
       WHERE project_id = ?
       ORDER BY step_order ASC`,
    )
    .all(projectId) as ProjectStep[];
}

export function listProjectQuotations(projectId: string): Quotation[] {
  return db
    .query(
      `SELECT id, quotation_name, currency, estimated_monthly_cost, status
       FROM quotations
       WHERE project_id = ?
       ORDER BY created_at DESC`,
    )
    .all(projectId) as Quotation[];
}
