import Link from "next/link";

import { ProjectStatusBadge } from "@/components/projects/project-status-badge";
import type { CalendarProjectRow } from "@/types/calendar";
import type { ProjectStatus } from "@/types/projects";
import {
  formatDateTimeHe,
  formatTimeShortHe,
  localDateKeyFromIso,
  localDateKeyFromParts,
} from "@/utils/date";

const DOW_LABELS = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];

function isProjectStatus(value: string): value is ProjectStatus {
  return (
    value === "quote" ||
    value === "approved" ||
    value === "prep" ||
    value === "setup" ||
    value === "teardown" ||
    value === "closed"
  );
}

interface ProjectCalendarMonthProps {
  year: number;
  month: number;
  byDay: Record<string, CalendarProjectRow[]>;
}

export function ProjectCalendarMonth({ year, month, byDay }: ProjectCalendarMonthProps) {
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDow = new Date(year, month - 1, 1).getDay();
  const padCells = firstDow;
  const totalCells = Math.ceil((padCells + daysInMonth) / 7) * 7;

  return (
    <div className="rounded-[var(--radius)] border border-border bg-card p-2 sm:p-4">
      <div className="mb-2 grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground sm:mb-3 sm:text-sm">
        {DOW_LABELS.map((l) => (
          <div key={l}>{l}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: totalCells }, (_, i) => {
          if (i < padCells) {
            return <div className="min-h-[4.5rem] rounded-md bg-muted/20 sm:min-h-[6rem]" key={`e-${i}`} />;
          }
          const dayNum = i - padCells + 1;
          if (dayNum > daysInMonth) {
            return <div className="min-h-[4.5rem] rounded-md bg-muted/20 sm:min-h-[6rem]" key={`t-${i}`} />;
          }
          const dateKey = localDateKeyFromParts(year, month, dayNum);
          const items = byDay[dateKey] ?? [];

          return (
            <div
              className="flex min-h-[4.5rem] flex-col gap-1 rounded-md border border-border bg-muted/10 p-1 sm:min-h-[6rem] sm:p-1.5"
              key={dateKey}
            >
              <span className="text-end text-xs font-semibold text-foreground">{dayNum}</span>
              <div className="flex flex-1 flex-col gap-1 overflow-y-auto">
                {items.map((proj) => {
                  const st: ProjectStatus = isProjectStatus(proj.status) ? proj.status : "quote";
                  const label = proj.clients?.name ?? "ללא שם";
                  const timeShort = formatTimeShortHe(proj.anchorIso);
                  const sourceLabel =
                    proj.dateSource === "setup"
                      ? "הקמה"
                      : proj.dateSource === "teardown"
                        ? "פירוק"
                        : null;
                  return (
                    <Link
                      className="block rounded border border-border bg-card px-1 py-0.5 text-[10px] leading-tight shadow-sm hover:bg-muted/40 sm:text-xs"
                      href={`/projects/${proj.id}`}
                      key={proj.id}
                      title={`${label} · ${formatDateTimeHe(proj.anchorIso)}${proj.location_address ? ` · ${proj.location_address}` : ""}`}
                    >
                      <div className="flex items-start justify-between gap-0.5">
                        <span className="line-clamp-2 min-w-0 font-medium">{label}</span>
                        {timeShort ? (
                          <span className="shrink-0 text-[9px] text-muted-foreground" dir="ltr">
                            {timeShort}
                          </span>
                        ) : null}
                      </div>
                      {sourceLabel ? (
                        <span className="text-[9px] text-muted-foreground"> ({sourceLabel})</span>
                      ) : null}
                      <div className="mt-0.5 scale-90 origin-top-right">
                        <ProjectStatusBadge className="text-[9px]" status={st} />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** קיבוץ פרויקטים לפי יום מקומי */
export function groupCalendarRowsByLocalDay(rows: CalendarProjectRow[]): Record<string, CalendarProjectRow[]> {
  const out: Record<string, CalendarProjectRow[]> = {};
  for (const p of rows) {
    const k = localDateKeyFromIso(p.anchorIso);
    if (!k) {
      continue;
    }
    if (!out[k]) {
      out[k] = [];
    }
    out[k].push(p);
  }
  for (const k of Object.keys(out)) {
    out[k].sort((a, b) => new Date(a.anchorIso).getTime() - new Date(b.anchorIso).getTime());
  }
  return out;
}
