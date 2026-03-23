import type { ProjectStatus } from "@/types/projects";

/** פרויקט לתצוגה ביומן (אירוע → הקמה → פירוק) */
export interface CalendarProjectRow {
  id: string;
  status: ProjectStatus;
  /** נקודת עיגון לתא ביומן */
  anchorIso: string;
  dateSource: "event" | "setup" | "teardown";
  location_address: string | null;
  clients: { name: string } | null;
}
