import type { NavDrawerItem } from "@/lib/nav/nav-types";
import type { AppRole } from "@/types/app-role";
import { isFieldRole, isOfficeOrAdminRole } from "@/types/app-role";

export function buildMainNavItems(role: AppRole | null): NavDrawerItem[] {
  const showCollections = isOfficeOrAdminRole(role);

  return [
    { href: "/", label: "דף הבית" },
    { href: "/dashboard", label: "דשבורד" },
    { href: "/projects", label: "פרויקטים" },
    { href: "/clients", label: "לקוחות" },
    { href: "/projects/kanban", label: "קנבן" },
    { href: "/projects/calendar", label: "יומן" },
    ...(isFieldRole(role) ? ([{ href: "/field", label: "שטח" }] as const) : []),
    { href: "/projects/new", label: "פרויקט חדש" },
    { href: "/equipment", label: "מלאי ציוד" },
    { href: "/employees", label: "עובדים" },
    { href: "/trucks", label: "משאיות" },
    ...(showCollections
      ? ([
          { href: "/collections", label: "גבייה" },
          { href: "/reports", label: "דוחות" },
        ] as const)
      : []),
  ];
}
