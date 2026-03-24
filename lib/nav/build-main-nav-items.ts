import type { NavDrawerItem } from "@/lib/nav/nav-types";
import type { AppRole } from "@/types/app-role";
import { isFieldRole, isOfficeOrAdminRole } from "@/types/app-role";

export function buildMainNavItems(role: AppRole | null): NavDrawerItem[] {
  const isField = isFieldRole(role);
  const showCollections = isOfficeOrAdminRole(role);
  const canManageProjects = role === "admin" || role === "office" || role === "operations";
  const canCreateProject = canManageProjects;
  const canManageTeam = role === "admin" || role === "office" || role === "operations";
  const canManageTrucks = role === "admin" || role === "operations" || role === "warehouse";
  const canSeeClients = role === "admin" || role === "office" || role === "operations";
  const canSeeEquipment = role !== "field";
  const canUseFieldArea = isField || role === "admin" || role === "office" || role === "operations";

  const items: NavDrawerItem[] = [
    { href: "/dashboard", label: "דשבורד" },
    { href: "/projects/go", label: "פרויקטים" },
    { href: "/projects/calendar", label: "יומן" },
  ];

  if (canManageProjects) {
    items.push({ href: "/projects/kanban", label: "קנבן" });
  }
  if (canCreateProject) {
    items.push({ href: "/projects/new", label: "פרויקט חדש" });
  }

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
  return items;
}
