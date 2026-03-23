import type { ProjectStatus } from "@/types/projects";
import { PROJECT_STATUS_KANBAN_ORDER } from "@/types/projects";

const STATUS_SET = new Set<string>(PROJECT_STATUS_KANBAN_ORDER);

export function parseCalendarStatusFilter(
  raw: string | string[] | undefined,
): ProjectStatus[] | undefined {
  if (raw === undefined || raw === "") {
    return undefined;
  }
  const joined = Array.isArray(raw) ? raw.join(",") : raw;
  const parts = joined
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  const out = parts.filter((p): p is ProjectStatus => STATUS_SET.has(p));
  return out.length > 0 ? out : undefined;
}

export function calendarPath(
  year: number,
  month: number,
  filters?: { status?: ProjectStatus[] },
): string {
  const p = new URLSearchParams();
  p.set("y", String(year));
  p.set("m", String(month));
  if (filters?.status?.length) {
    p.set("st", filters.status.join(","));
  }
  return `/projects/calendar?${p.toString()}`;
}

export function fieldCalendarPath(
  year: number,
  month: number,
  filters?: { status?: ProjectStatus[] },
): string {
  const p = new URLSearchParams();
  p.set("y", String(year));
  p.set("m", String(month));
  if (filters?.status?.length) {
    p.set("st", filters.status.join(","));
  }
  return `/field/calendar?${p.toString()}`;
}
