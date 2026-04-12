import type { AppRole } from "@/types/app-role";
import { APP_ROLE_OPTIONS } from "@/types/app-role";

/** Row in the admin-only permissions reference table (mirrors current app checks). */
export type RolePermissionMatrixRow = {
  key: string;
  labelHe: string;
  /** Which roles have this capability in the current codebase */
  roles: Record<AppRole, boolean>;
};

const all = (): Record<AppRole, boolean> =>
  Object.fromEntries(APP_ROLE_OPTIONS.map((r) => [r, true])) as Record<AppRole, boolean>;

const noneExcept = (...allowed: AppRole[]): Record<AppRole, boolean> => {
  const m = all();
  for (const r of APP_ROLE_OPTIONS) {
    m[r] = allowed.includes(r);
  }
  return m;
};

/**
 * Static matrix for documentation UI. Keep in sync with `buildMainNavItems`,
 * server actions guards, and page-level `can*` flags.
 */
export const ROLE_PERMISSION_MATRIX_ROWS: RolePermissionMatrixRow[] = [
  {
    key: "dashboard",
    labelHe: "דשבורד (סקירה כללית)",
    roles: all(),
  },
  {
    key: "dashboard-monthly-payments",
    labelHe: "דשבורד — תשלומים חודשיים (כרטיס)",
    roles: noneExcept("admin", "office"),
  },
  {
    key: "projects-calendar",
    labelHe: "פרויקטים ויומן (ניווט וצפייה)",
    roles: all(),
  },
  {
    key: "kanban-new-project",
    labelHe: "קנבן ויצירת פרויקט חדש",
    roles: noneExcept("admin", "office", "operations"),
  },
  {
    key: "clients",
    labelHe: "לקוחות",
    roles: noneExcept("admin", "office", "operations"),
  },
  {
    key: "equipment",
    labelHe: "מלאי (ניווט וצפייה)",
    roles: noneExcept("admin", "office", "operations", "warehouse"),
  },
  {
    key: "employees",
    labelHe: "צוות (עובדים)",
    roles: noneExcept("admin", "office", "operations"),
  },
  {
    key: "trucks",
    labelHe: "משאיות",
    roles: noneExcept("admin", "operations", "warehouse"),
  },
  {
    key: "field-nav",
    labelHe: "שטח (אזור שטח)",
    roles: noneExcept("admin", "office", "operations", "field"),
  },
  {
    key: "collections-reports",
    labelHe: "גבייה ודוחות",
    roles: noneExcept("admin", "office"),
  },
  {
    key: "admin-users",
    labelHe: "ניהול משתמשים ותפקידים (/admin/users)",
    roles: noneExcept("admin"),
  },
  {
    key: "delete-equipment",
    labelHe: "מחיקת פריט ציוד",
    roles: noneExcept("admin"),
  },
  {
    key: "delete-truck",
    labelHe: "מחיקת משאית",
    roles: noneExcept("admin"),
  },
  {
    key: "remove-project-assignments",
    labelHe: "הסרת שיבוץ מפרויקט",
    roles: noneExcept("admin"),
  },
  {
    key: "link-employee-auth",
    labelHe: "קישור חשבון התחברות לעובד (מסך עובד)",
    roles: noneExcept("admin", "office"),
  },
];

export const ROLE_PERMISSION_MATRIX_ROLE_ORDER: AppRole[] = [...APP_ROLE_OPTIONS];
