/** קישורי ניווט בסרגל כהה (דסקטופ) */
export const headerBarNavLinkClassName =
  "shrink-0 whitespace-nowrap rounded-md px-2.5 py-2 text-sm font-medium text-header-foreground/90 transition-colors hover:bg-white/10 hover:text-header-foreground hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4a373] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--header)] sm:py-1.5";

/** קישור פעיל בסרגל — הדגשת נחושת */
export function headerBarNavLinkActiveClassName(active: boolean) {
  return active
    ? "bg-white/10 text-[#f5d1b4] ring-1 ring-[#d4a373]/40"
    : "";
}

/** קישורי ניווט אנכיים בסרגל צד כהה (דסקטופ) */
export const sidebarBarNavLinkClassName =
  "block w-full rounded-md px-3 py-2.5 text-start text-sm font-medium text-header-foreground/90 transition-colors hover:bg-white/10 hover:text-header-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4a373] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--header)]";

export function sidebarBarNavLinkActiveClassName(active: boolean) {
  return active
    ? "bg-white/10 text-[#f5d1b4] ring-1 ring-[#d4a373]/40"
    : "";
}
