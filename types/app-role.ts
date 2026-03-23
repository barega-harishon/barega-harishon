/** Matches public.app_role in Postgres */
export type AppRole = "admin" | "office" | "operations" | "warehouse" | "field";

export function isOfficeOrAdminRole(role: AppRole | null): role is "admin" | "office" {
  return role === "admin" || role === "office";
}

export function isFieldRole(role: AppRole | null): boolean {
  return role === "field";
}
