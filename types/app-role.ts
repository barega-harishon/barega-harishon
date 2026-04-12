/** Matches public.app_role in Postgres */
export const APP_ROLE_OPTIONS = ["admin", "office", "operations", "warehouse", "field"] as const;
export type AppRole = (typeof APP_ROLE_OPTIONS)[number];

export const APP_ROLE_LABELS_HE: Record<AppRole, string> = {
  admin: "מנהל מערכת",
  office: "משרד / שיווק",
  operations: "תפעול / פרויקטים",
  warehouse: "מחסן",
  field: "שטח",
};

export function isOfficeOrAdminRole(role: AppRole | null): role is "admin" | "office" {
  return role === "admin" || role === "office";
}

export function isFieldRole(role: AppRole | null): boolean {
  return role === "field";
}

export function isAdminRole(role: AppRole | null): role is "admin" {
  return role === "admin";
}

export function parseAppRole(value: string): AppRole | null {
  for (const r of APP_ROLE_OPTIONS) {
    if (r === value) {
      return r;
    }
  }
  return null;
}
