export const DATE_STYLE_COOKIE = "bh_date_style";
export const MOTION_COOKIE = "bh_motion";
export const PROJECTS_DEFAULT_VIEW_COOKIE = "bh_projects_default_view";
export const THEME_COOKIE = "bh_theme";

export type DateStylePreference = "short" | "hebrew";
export type MotionPreference = "full" | "reduced";
export type ProjectsDefaultViewPreference = "list" | "kanban" | "calendar";
export type ThemePreference = "light" | "dark";

export function normalizeDateStyle(value: string | null | undefined): DateStylePreference {
  return value === "short" ? "short" : "hebrew";
}

export function normalizeMotion(value: string | null | undefined): MotionPreference {
  return value === "reduced" ? "reduced" : "full";
}

export function normalizeProjectsDefaultView(
  value: string | null | undefined,
): ProjectsDefaultViewPreference {
  if (value === "kanban" || value === "calendar") {
    return value;
  }
  return "list";
}

export function normalizeTheme(value: string | null | undefined): ThemePreference {
  return value === "dark" ? "dark" : "light";
}
