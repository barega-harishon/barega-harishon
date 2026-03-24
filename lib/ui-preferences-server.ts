import "server-only";

import { cookies } from "next/headers";

import {
  MOTION_COOKIE,
  PROJECTS_DEFAULT_VIEW_COOKIE,
  THEME_COOKIE,
  normalizeMotion,
  normalizeProjectsDefaultView,
  normalizeTheme,
  type MotionPreference,
  type ProjectsDefaultViewPreference,
  type ThemePreference,
} from "@/lib/ui-preferences";

export async function getMotionPreference(): Promise<MotionPreference> {
  const store = await cookies();
  return normalizeMotion(store.get(MOTION_COOKIE)?.value);
}

export async function getProjectsDefaultViewPreference(): Promise<ProjectsDefaultViewPreference> {
  const store = await cookies();
  return normalizeProjectsDefaultView(store.get(PROJECTS_DEFAULT_VIEW_COOKIE)?.value);
}

export async function getThemePreference(): Promise<ThemePreference> {
  const store = await cookies();
  return normalizeTheme(store.get(THEME_COOKIE)?.value);
}
