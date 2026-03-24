"use server";

import { cookies } from "next/headers";

import {
  DATE_STYLE_COOKIE,
  MOTION_COOKIE,
  PROJECTS_DEFAULT_VIEW_COOKIE,
  THEME_COOKIE,
  normalizeDateStyle,
  normalizeMotion,
  normalizeProjectsDefaultView,
  normalizeTheme,
} from "@/lib/ui-preferences";
import type { ActionResult } from "@/types/common";

export async function setDateStyleFromForm(
  _prev: ActionResult<Record<string, never>> | null,
  formData: FormData,
): Promise<ActionResult<Record<string, never>> | null> {
  const raw = formData.get("dateStyle");
  const style = normalizeDateStyle(typeof raw === "string" ? raw : null);
  const store = await cookies();
  store.set(DATE_STYLE_COOKIE, style, {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });
  return { success: true, message: "תצוגת התאריך עודכנה." };
}

export async function setMotionFromForm(
  _prev: ActionResult<Record<string, never>> | null,
  formData: FormData,
): Promise<ActionResult<Record<string, never>> | null> {
  const raw = formData.get("motion");
  const motion = normalizeMotion(typeof raw === "string" ? raw : null);
  const store = await cookies();
  store.set(MOTION_COOKIE, motion, {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });
  return { success: true, message: "העדפת תנועה עודכנה." };
}

export async function setProjectsDefaultViewFromForm(
  _prev: ActionResult<Record<string, never>> | null,
  formData: FormData,
): Promise<ActionResult<Record<string, never>> | null> {
  const raw = formData.get("projectsDefaultView");
  const view = normalizeProjectsDefaultView(typeof raw === "string" ? raw : null);
  const store = await cookies();
  store.set(PROJECTS_DEFAULT_VIEW_COOKIE, view, {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });
  return { success: true, message: "ברירת המחדל לפרויקטים עודכנה." };
}

export async function setThemeFromForm(
  _prev: ActionResult<Record<string, never>> | null,
  formData: FormData,
): Promise<ActionResult<Record<string, never>> | null> {
  const raw = formData.get("theme");
  const theme = normalizeTheme(typeof raw === "string" ? raw : null);
  const store = await cookies();
  store.set(THEME_COOKIE, theme, {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });
  return { success: true, message: "ערכת הצבעים עודכנה." };
}
