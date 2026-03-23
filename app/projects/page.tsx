import Link from "next/link";
import { z } from "zod";

import { getClientNameById } from "@/actions/clients";
import { listProjects } from "@/actions/projects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProjectStatusBadge } from "@/components/projects/project-status-badge";
import type { ProjectListRow, ProjectStatus } from "@/types/projects";
import { PROJECT_STATUS_KANBAN_ORDER, PROJECT_STATUS_LABELS } from "@/types/projects";
import { formatDateTimeHe } from "@/utils/date";
import { formatCurrencyIl } from "@/utils/money";
import { projectsListQuery } from "@/utils/projects-list-query";

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

export const dynamic = "force-dynamic";

function parseStatusQuery(value: string | string[] | undefined): ProjectStatus | undefined {
  if (!value || Array.isArray(value)) {
    return undefined;
  }
  return isProjectStatus(value) ? value : undefined;
}

function parseClientQuery(value: string | string[] | undefined): string | undefined {
  if (!value || Array.isArray(value)) {
    return undefined;
  }
  const p = z.string().uuid().safeParse(value);
  return p.success ? p.data : undefined;
}

function parseSearchQuery(value: string | string[] | undefined): string | undefined {
  if (!value || Array.isArray(value)) {
    return undefined;
  }
  const t = value.trim().slice(0, 120);
  return t.length > 0 ? t : undefined;
}

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; client?: string; q?: string }>;
}) {
  const { status: statusQ, client: clientQ, q: qQ } = await searchParams;
  const statusFilter = parseStatusQuery(statusQ);
  const clientFilter = parseClientQuery(clientQ);
  const searchInput = parseSearchQuery(qQ);
  const searchForList =
    searchInput && searchInput.replace(/[%_,]/g, "").trim().length >= 2 ? searchInput : undefined;

  const [rows, clientLabel] = await Promise.all([
    listProjects({
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(clientFilter ? { clientId: clientFilter } : {}),
      ...(searchForList ? { search: searchForList } : {}),
    }),
    clientFilter ? getClientNameById(clientFilter) : Promise.resolve(null),
  ]);

  return (
    <main className="container-page py-8">
      <div className="page-header-row mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">פרויקטים</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            רשימת פרויקטים לפי סטטוס ותאריכי אירוע. סינון לפי שלב, לקוח וחיפוש טקסט.
            {clientFilter ? (
              <>
                {" "}
                <span className="font-medium text-foreground">
                  לקוח: {clientLabel ?? clientFilter.slice(0, 8) + "…"}
                </span>
                .{" "}
                <Link
                  className="underline"
                  href={projectsListQuery({ status: statusFilter, q: searchInput })}
                >
                  בטל סינון לקוח
                </Link>
              </>
            ) : null}
            {searchInput && !searchForList ? (
              <span className="mt-1 block text-amber-800 dark:text-amber-200">
                לחיפוש בכתובת או בשם לקוח נא להקליד לפחות 2 תווים (לאחר סינון תווים מיוחדים).
              </span>
            ) : null}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/projects/kanban">תצוגת קנבן</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/projects/calendar">יומן</Link>
          </Button>
          <Button asChild>
            <Link href="/projects/new">פרויקט חדש</Link>
          </Button>
        </div>
      </div>

      <form
        className="mb-4 flex max-w-xl flex-col gap-2 sm:flex-row sm:items-end"
        method="get"
        role="search"
      >
        {statusFilter ? <input name="status" type="hidden" value={statusFilter} /> : null}
        {clientFilter ? <input name="client" type="hidden" value={clientFilter} /> : null}
        <div className="min-w-0 flex-1 space-y-1.5">
          <label className="text-sm font-medium" htmlFor="projects-search-q">
            חיפוש
          </label>
          <Input
            defaultValue={searchInput ?? ""}
            id="projects-search-q"
            name="q"
            placeholder="שם לקוח או כתובת אירוע…"
            type="search"
          />
        </div>
        <Button type="submit">חיפוש</Button>
        {searchInput ? (
          <Button asChild variant="outline">
            <Link href={projectsListQuery({ status: statusFilter, clientId: clientFilter })}>
              נקה
            </Link>
          </Button>
        ) : null}
      </form>

      <div className="mb-4 flex flex-wrap gap-2">
        <Button asChild size="sm" variant={!statusFilter ? "default" : "outline"}>
          <Link href={projectsListQuery({ clientId: clientFilter, q: searchInput })}>הכל</Link>
        </Button>
        {PROJECT_STATUS_KANBAN_ORDER.map((s) => (
          <Button asChild key={s} size="sm" variant={statusFilter === s ? "default" : "outline"}>
            <Link href={projectsListQuery({ status: s, clientId: clientFilter, q: searchInput })}>
              {PROJECT_STATUS_LABELS[s]}
            </Link>
          </Button>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="rounded-[var(--radius)] border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
          {searchForList ? (
            <>
              לא נמצאו פרויקטים עבור &quot;{searchInput}&quot;.{" "}
              <Link
                className="font-medium text-primary underline"
                href={projectsListQuery({ status: statusFilter, clientId: clientFilter })}
              >
                נקה חיפוש
              </Link>
            </>
          ) : clientFilter && statusFilter ? (
            <>
              אין פרויקטים ללקוח זה בסטטוס &quot;{PROJECT_STATUS_LABELS[statusFilter]}&quot;.{" "}
              <Link
                className="font-medium text-primary underline"
                href={projectsListQuery({ clientId: clientFilter, q: searchInput })}
              >
                כל הסטטוסים ללקוח
              </Link>
            </>
          ) : clientFilter ? (
            <>
              אין פרויקטים ללקוח זה.{" "}
              <Link className="font-medium text-primary underline" href="/clients">
                חזרה ללקוחות
              </Link>
            </>
          ) : statusFilter ? (
            <>
              אין פרויקטים בסטטוס &quot;{PROJECT_STATUS_LABELS[statusFilter]}&quot;.{" "}
              <Link
                className="font-medium text-primary underline"
                href={projectsListQuery({ clientId: clientFilter, q: searchInput })}
              >
                הצג הכל
              </Link>
            </>
          ) : (
            <>
              אין עדיין פרויקטים.{" "}
              <Link className="font-medium text-primary underline" href="/projects/new">
                צרו פרויקט טיוטה ראשון
              </Link>
              .
            </>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius)] border border-border bg-card">
          <table className="w-full min-w-[48rem] border-collapse text-start text-sm">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className="px-4 py-3 font-medium">לקוח</th>
                <th className="px-4 py-3 font-medium">סטטוס</th>
                <th className="px-4 py-3 font-medium">כתובת אירוע</th>
                <th className="px-4 py-3 font-medium">תחילת אירוע</th>
                <th className="px-4 py-3 font-medium">סכום</th>
                <th className="px-4 py-3 font-medium">פעולות</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <ProjectTableRow key={row.id} row={row} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

function ProjectTableRow({ row }: { row: ProjectListRow }) {
  const status: ProjectStatus = isProjectStatus(row.status) ? row.status : "quote";
  const clientName = row.clients?.name ?? "—";

  return (
    <tr className="border-b border-border last:border-0">
      <td className="px-4 py-3 font-medium">{clientName}</td>
      <td className="px-4 py-3">
        <ProjectStatusBadge status={status} />
      </td>
      <td className="max-w-[14rem] truncate px-4 py-3 text-muted-foreground">
        {row.location_address ?? "—"}
      </td>
      <td className="px-4 py-3 text-muted-foreground">
        {formatDateTimeHe(row.event_starts_at)}
      </td>
      <td className="px-4 py-3">{formatCurrencyIl(row.total_price)}</td>
      <td className="px-4 py-3">
        <Button asChild size="sm" variant="outline">
          <Link href={`/projects/${row.id}`}>פתיחה</Link>
        </Button>
      </td>
    </tr>
  );
}
