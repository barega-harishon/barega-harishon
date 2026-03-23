import Link from "next/link";

import { listProjectsForCalendarMonth } from "@/actions/projects";
import { ProjectCalendarLegend } from "@/components/projects/calendar-legend";
import {
  groupCalendarRowsByLocalDay,
  ProjectCalendarMonth,
} from "@/components/projects/project-calendar-month";
import { Button } from "@/components/ui/button";
import { PROJECT_STATUS_KANBAN_ORDER, PROJECT_STATUS_LABELS, type ProjectStatus } from "@/types/projects";
import { calendarPath, parseCalendarStatusFilter } from "@/utils/calendar-query";
import { formatHebrewMonthYear } from "@/utils/date";

export const dynamic = "force-dynamic";

export default async function ProjectCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ y?: string; m?: string; st?: string | string[] }>;
}) {
  const sp = await searchParams;
  const now = new Date();
  let year = Number.parseInt(sp.y ?? "", 10);
  let month = Number.parseInt(sp.m ?? "", 10);

  if (!Number.isFinite(year) || year < 2000 || year > 2100) {
    year = now.getFullYear();
  }
  if (!Number.isFinite(month) || month < 1 || month > 12) {
    month = now.getMonth() + 1;
  }

  const statusFilter = parseCalendarStatusFilter(sp.st);

  const rows = await listProjectsForCalendarMonth(year, month, { statusFilter });
  const byDay = groupCalendarRowsByLocalDay(rows);

  const prev = new Date(year, month - 2, 1);
  const next = new Date(year, month, 1);
  const py = prev.getFullYear();
  const pm = prev.getMonth() + 1;
  const ny = next.getFullYear();
  const nm = next.getMonth() + 1;

  const baseThis = { year, month };
  const basePrev = { year: py, month: pm };
  const baseNext = { year: ny, month: nm };
  const baseToday = { year: now.getFullYear(), month: now.getMonth() + 1 };

  return (
    <main className="container-page py-8">
      <div className="page-header-row mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">יומן פרויקטים</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            לפי <strong className="text-foreground">תאריך אירוע</strong>; אם חסר —{" "}
            <strong className="text-foreground">הקמה</strong>; אם גם חסר —{" "}
            <strong className="text-foreground">פירוק</strong>.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/projects">רשימה</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/projects/kanban">קנבן</Link>
          </Button>
        </div>
      </div>

      <div className="page-header-row mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{formatHebrewMonthYear(year, month)}</h2>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline">
            <Link href={calendarPath(basePrev.year, basePrev.month, { status: statusFilter })}>
              חודש קודם
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href={calendarPath(baseNext.year, baseNext.month, { status: statusFilter })}>
              חודש הבא
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href={calendarPath(baseToday.year, baseToday.month, { status: statusFilter })}>
              היום
            </Link>
          </Button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <Button asChild size="sm" variant={!statusFilter?.length ? "default" : "outline"}>
          <Link href={calendarPath(baseThis.year, baseThis.month)}>כל הסטטוסים</Link>
        </Button>
        {PROJECT_STATUS_KANBAN_ORDER.map((st: ProjectStatus) => {
          const active = statusFilter?.length === 1 && statusFilter[0] === st;
          return (
            <Button asChild key={st} size="sm" variant={active ? "default" : "outline"}>
              <Link href={calendarPath(baseThis.year, baseThis.month, { status: [st] })}>
                {PROJECT_STATUS_LABELS[st]}
              </Link>
            </Button>
          );
        })}
      </div>

      <ProjectCalendarMonth byDay={byDay} month={month} year={year} />

      <ProjectCalendarLegend />

      <p className="mt-2 text-xs text-muted-foreground">
        פרויקטים ללא אירוע, הקמה ופירוק בחודש זה לא יוצגו.
      </p>
    </main>
  );
}
