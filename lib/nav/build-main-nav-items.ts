import type { NavDrawerItem } from "@/lib/nav/nav-types";
import type { AppRole } from "@/types/app-role";
import { hasAnyAppRole, isAdminRole, isFieldRole, isOfficeOrAdminRole } from "@/types/app-role";

export function buildMainNavItems(roles: AppRole[] | null): NavDrawerItem[] {
  const r = roles ?? [];
  const isField = isFieldRole(r);
  const showCollections = isOfficeOrAdminRole(r);
  const canManageProjects = hasAnyAppRole(r, ["admin", "office", "operations"]);
  const canCreateProject = canManageProjects;
  const canManageTeam = hasAnyAppRole(r, ["admin", "office", "operations"]);
  const canManageTrucks = hasAnyAppRole(r, ["admin", "operations", "warehouse"]);
  const canSeeClients = hasAnyAppRole(r, ["admin", "office", "operations"]);
  const canSeeEquipment = hasAnyAppRole(r, ["admin", "office", "operations", "warehouse"]);
  const canUseFieldArea =
    isField || hasAnyAppRole(r, ["admin", "office", "operations"]);

  const items: NavDrawerItem[] = [
    { href: "/dashboard", label: "דשבורד" },
    { href: "/projects/go", label: "פרויקטים" },
  ];

  if (canSeeClients) {
    items.push({ href: "/clients", label: "לקוחות", dividerBefore: true });
  }
  if (canSeeEquipment) {
    items.push({
      href: "/equipment",
      label: "מלאי",
      dividerBefore: !canSeeClients,
    });
  }
  if (canManageTeam) {
    items.push({ href: "/employees", label: "צוות" });
  }
  if (canManageTrucks) {
    items.push({ href: "/trucks", label: "משאיות" });
  }
  if (canUseFieldArea) {
    items.push({
      href: "/field",
      label: "שטח",
      dividerBefore: true,
    });
  }
  if (showCollections) {
    items.push({ href: "/collections", label: "גבייה", dividerBefore: true });
    items.push({ href: "/reports", label: "דוחות" });
  }
  if (isAdminRole(r)) {
    items.push({ href: "/admin/users", label: "משתמשים", dividerBefore: true });
    items.push({ href: "/admin/permissions", label: "הרשאות" });
  }
  return items;
}
