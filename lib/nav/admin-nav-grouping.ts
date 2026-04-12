import type { NavDrawerItem } from "@/lib/nav/nav-types";

/** סדר קבוצות בסרגל לאדמין (דסקטופ + מובייל) */
export const ADMIN_SIDEBAR_GROUP_ORDER = [
  "core",
  "quick",
  "ops",
  "field",
  "finance",
  "system",
] as const;

export type AdminSidebarGroupKey = (typeof ADMIN_SIDEBAR_GROUP_ORDER)[number];

export const ADMIN_SIDEBAR_GROUP_LABELS: Record<AdminSidebarGroupKey, string> = {
  core: "ליבה",
  quick: "פעולות מהירות",
  ops: "תפעול",
  field: "שטח",
  finance: "כספים",
  system: "מערכת",
};

/** האם קישור ניווט שייך לקבוצת אדמין (חייב לכסות כל href מ־buildMainNavItems; `/settings` אם יתווסף לרשימה) */
export function adminSidebarGroupContainsHref(
  href: string,
  key: AdminSidebarGroupKey,
): boolean {
  switch (key) {
    case "core":
      return (
        href === "/dashboard" ||
        href === "/projects/go" ||
        href === "/projects" ||
        href === "/projects/calendar" ||
        href === "/projects/kanban"
      );
    case "quick":
      return href === "/projects/new";
    case "ops":
      return href === "/clients" || href === "/equipment" || href === "/employees" || href === "/trucks";
    case "field":
      return href === "/field";
    case "finance":
      return href === "/collections" || href === "/reports";
    case "system":
      return href === "/settings" || href === "/admin/users";
    default:
      return false;
  }
}

/** פריטים שלא שויכו לאף קבוצה — מוצגים תחת «עוד» כדי שלא ייעלמו מהסרגל */
export const ADMIN_SIDEBAR_ORPHAN_GROUP_TITLE = "עוד";

export function adminSidebarOrphanNavItems(items: NavDrawerItem[]): NavDrawerItem[] {
  return items.filter(
    (item) =>
      !ADMIN_SIDEBAR_GROUP_ORDER.some((key) => adminSidebarGroupContainsHref(item.href, key)),
  );
}
