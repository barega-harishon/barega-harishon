import Link from "next/link";

import { listMyAssignedProjectsCalendarMonth } from "@/actions/projects";
import {
  groupCalendarRowsByLocalDay,
  ProjectCalendarMonth,
} from "@/components/projects/project-calendar-month";
import { ProjectCalendarLegend } from "@/components/projects/calendar-legend";
import { HeaderInfoModal } from "@/components/common/header-info-modal";
import { selectorButtonClass } from "@/components/common/selector-button-styles";
import { Button } from "@/components/ui/button";
import { getDateStylePreference } from "@/lib/date-style-server";
import { PROJECT_STATUS_KANBAN_ORDER, PROJECT_STATUS_LABELS, type ProjectStatus } from "@/types/projects";
import { fieldCalendarPath, parseCalendarStatusFilter } from "@/utils/calendar-query";
import { formatGregorianMonthYearHe, formatHebrewMonthYearWithLetters } from "@/utils/date";

export const dynamic = "force-dynamic";

export default async function FieldCalendarPage({
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
  const dateStyle = await getDateStylePreference();
  const rows = await listMyAssignedProjectsCalendarMonth(year, month, { statusFilter });
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
    <main className="container-page py-6">
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-semibold">היומן שלי</h1>
        <HeaderInfoModal label="הנחיות היומן שלי">
          <p>
            רק פרויקטים שאתם משובצים אליהם.{" "}
            <Link className="underline-offset-2 hover:underline" href="/projects/calendar">
              יומן ארגוני מלא
            </Link>
          </p>
        </HeaderInfoModal>
      </div>

      <div className="page-header-row mb-4 mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="text-center">
          <h2 className="text-lg font-semibold">{formatGregorianMonthYearHe(year, month)}</h2>
          <p className="text-xs text-muted-foreground">{formatHebrewMonthYearWithLetters(year, month)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" className={selectorButtonClass(false)} variant="outline">
            <Link href={fieldCalendarPath(basePrev.year, basePrev.month, { status: statusFilter })}>
              קודם
            </Link>
          </Button>
          <Button asChild size="sm" className={selectorButtonClass(false)} variant="outline">
            <Link href={fieldCalendarPath(baseNext.year, baseNext.month, { status: statusFilter })}>
              הבא
            </Link>
          </Button>
          <Button asChild size="sm" className={selectorButtonClass(false)} variant="outline">
            <Link href={fieldCalendarPath(baseToday.year, baseToday.month, { status: statusFilter })}>
              היום
            </Link>
          </Button>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap gap-1.5 rounded-[var(--radius)] border border-border/70 bg-card/60 p-2">
        <Button
          asChild
          size="sm"
          className={selectorButtonClass(!statusFilter?.length)}
          variant="outline"
        >
          <Link href={fieldCalendarPath(baseThis.year, baseThis.month)}>הכול</Link>
        </Button>
        {PROJECT_STATUS_KANBAN_ORDER.map((st: ProjectStatus) => {
          const active = statusFilter?.length === 1 && statusFilter[0] === st;
          return (
            <Button asChild key={st} size="sm" className={selectorButtonClass(active)} variant="outline">
              <Link href={fieldCalendarPath(baseThis.year, baseThis.month, { status: [st] })}>
                {PROJECT_STATUS_LABELS[st]}
              </Link>
            </Button>
          );
        })}
      </div>

      <ProjectCalendarMonth byDay={byDay} month={month} year={year} dateStyle={dateStyle} />
      <ProjectCalendarLegend />
    </main>
  );
}
