import type { ProjectSiteDetails } from "@/types/project-site";

/** Matches public.project_status in Postgres */
export type ProjectStatus =
  | "incoming"
  | "quote"
  | "approved"
  | "prep"
  | "setup"
  | "teardown"
  | "closed";

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  incoming: "בקשה נכנסת",
  quote: "הצעה",
  approved: "מאושר",
  prep: "בהכנה",
  setup: "בהקמה",
  teardown: "בפירוק",
  closed: "סגור",
};

/** סדר עמודות בקנבן וברשימת סטטוסים בטפסים */
export const PROJECT_STATUS_KANBAN_ORDER: ProjectStatus[] = [
  "incoming",
  "quote",
  "approved",
  "prep",
  "setup",
  "teardown",
  "closed",
];

/** סטטוסים שעובד שטח רשאי לעבור אליהם (RLS: `projects_update_field_assigned_operational`) */
export const PROJECT_STATUS_FIELD_TARGET_ORDER: ProjectStatus[] = ["prep", "setup", "teardown"];

export interface ProjectListRow {
  id: string;
  client_id: string;
  status: ProjectStatus;
  location_address: string | null;
  total_price: string | number | null;
  setup_starts_at: string | null;
  event_starts_at: string | null;
  event_ends_at: string | null;
  teardown_at: string | null;
  created_at: string;
  clients: { name: string } | null;
}

/** פרויקט בודד עם פרטי אתר (אופציונלי) */
export interface ProjectDetailRow extends ProjectListRow {
  /** טוקן לדף מעקב ציבורי ללקוח (`/track/...`) */
  public_tracking_token?: string;
  project_site_details: ProjectSiteDetails | null;
}
