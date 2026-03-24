import type { NavDrawerItem } from "@/lib/nav/nav-types";

export const FIELD_NAV_ITEMS: NavDrawerItem[] = [
  { href: "/field", label: "בית" },
  { href: "/field/time", label: "שעות" },
  { href: "/field/calendar", label: "יומן" },
  { href: "/field/projects", label: "פרויקטים", dividerBefore: true },
];
