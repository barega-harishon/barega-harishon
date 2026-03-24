import "server-only";

import { cookies } from "next/headers";

import {
  DATE_STYLE_COOKIE,
  normalizeDateStyle,
  type DateStylePreference,
} from "@/lib/ui-preferences";

export async function getDateStylePreference(): Promise<DateStylePreference> {
  const store = await cookies();
  const value = store.get(DATE_STYLE_COOKIE)?.value;
  return normalizeDateStyle(value);
}
