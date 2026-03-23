import type { ProjectStatus } from "@/types/projects";

/** Query string ל־`/projects` עם סינון סטטוס, לקוח וחיפוש טקסט */
export function projectsListQuery(params: {
  status?: ProjectStatus;
  clientId?: string;
  /** חיפוש בכתובת אירוע / שם לקוח (מועבר כ־`q`) */
  q?: string;
}): string {
  const sp = new URLSearchParams();
  if (params.status) {
    sp.set("status", params.status);
  }
  if (params.clientId) {
    sp.set("client", params.clientId);
  }
  const trimmedQ = params.q?.trim();
  if (trimmedQ) {
    sp.set("q", trimmedQ);
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}
