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

function asRoleArray(role: AppRole | AppRole[] | null | undefined): AppRole[] {
  if (role === null || role === undefined) {
    return [];
  }
  return Array.isArray(role) ? role : [role];
}

/** האם יש למשתמש לפחות אחד מהתפקידים ברשימה (תפקיד יחיד או איחוד תפקידים). */
export function hasAnyAppRole(
  role: AppRole | AppRole[] | null | undefined,
  allowed: readonly AppRole[],
): boolean {
  return asRoleArray(role).some((r) => allowed.includes(r));
}

/** איחוד תפקיד ראשי ותפקידים נוספים ללא כפילויות (הראשי תמיד ראשון). */
export function mergePrimaryAndExtraRoles(primary: AppRole, extras: AppRole[]): AppRole[] {
  const seen = new Set<AppRole>([primary]);
  const out: AppRole[] = [primary];
  for (const e of extras) {
    if (e === primary) {
      continue;
    }
    if (!seen.has(e)) {
      seen.add(e);
      out.push(e);
    }
  }
  return out;
}

export function isOfficeOrAdminRole(role: AppRole | AppRole[] | null): boolean {
  return hasAnyAppRole(role, ["admin", "office"]);
}

export function isFieldRole(role: AppRole | AppRole[] | null): boolean {
  return hasAnyAppRole(role, ["field"]);
}

export function isAdminRole(role: AppRole | AppRole[] | null): boolean {
  return hasAnyAppRole(role, ["admin"]);
}

export function parseAppRole(value: string): AppRole | null {
  const normalized = value.trim().toLowerCase();
  for (const r of APP_ROLE_OPTIONS) {
    if (r === normalized) {
      return r;
    }
  }
  return null;
}

/** מערך תפקידים מ־Postgres (enum[] / מחרוזות). */
export function parseAppRoleArray(value: unknown): AppRole[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const out: AppRole[] = [];
  for (const item of value) {
    const r = parseAppRole(String(item));
    if (r) {
      out.push(r);
    }
  }
  return out;
}
