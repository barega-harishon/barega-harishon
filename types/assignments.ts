/** Matches public.assignment_role in Postgres */
export type AssignmentRole = "team_lead" | "driver" | "worker";

export const ASSIGNMENT_ROLE_LABELS: Record<AssignmentRole, string> = {
  team_lead: "ראש צוות",
  driver: "נהג",
  worker: "פועל",
};

export interface ProjectAssignmentLine {
  id: string;
  project_id: string;
  employee_id: string;
  role: AssignmentRole;
  employees: { name: string } | null;
}
