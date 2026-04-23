import Link from "next/link";
import { CalendarDays, Filter, Info, KanbanSquare, List, Plus, Search } from "lucide-react";
import { z } from "zod";

import { getClientNameById } from "@/actions/clients";
import { listProjects } from "@/actions/projects";
import { ProjectKanbanBoard } from "@/components/projects/project-kanban-board";
import { ProjectTableRow } from "@/components/projects/project-table-row";
import { Button } from "@/components/ui/button";
import { getCurrentAppRoles } from "@/lib/auth/current-profile";
import { Input } from "@/components/ui/input";
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalTrigger } from "@/components/ui/modal";
import { getDateStylePreference } from "@/lib/date-style-server";
import { hasAnyAppRole, isOfficeOrAdminRole } from "@/types/app-role";
import type { ProjectStatus } from "@/types/projects";
import { PROJECT_STATUS_KANBAN_ORDER, PROJECT_STATUS_LABELS } from "@/types/projects";
import { projectsListQuery } from "@/utils/projects-list-query";

function isProjectStatus(value: string): value is ProjectStatus {
  return (
    value === "incoming" ||
    value === "quote" ||
    value === "approved" ||
    value === "prep" ||
    value === "setup" ||
    value === "teardown" ||
    value === "closed"
  );
}

export const dynamic = "force-dynamic";

function parseStatusQuery(value: string | string[] | undefined): ProjectStatus[] {
  const raw = Array.isArray(value) ? value : value ? [value] : [];
  const valid = raw.filter(isProjectStatus);
  return [...new Set(valid)];
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

type ProjectsViewMode = "list" | "kanban";

function parseViewQuery(value: string | string[] | undefined): ProjectsViewMode {
  const v = Array.isArray(value) ? value[0] : value;
  return v === "kanban" ? "kanban" : "list";
}

function projectsPageQuery(params: {
  view?: ProjectsViewMode;
  status?: ProjectStatus[];
  clientId?: string;
  q?: string;
}): string {
  const sp = new URLSearchParams();
  if (params.view && params.view !== "list") {
    sp.set("view", params.view);
  }
  for (const status of params.status ?? []) {
    sp.append("status", status);
  }
  if (params.clientId) {
    sp.set("client", params.clientId);
  }
  const trimmedQ = params.q?.trim();
  if (trimmedQ) {
    sp.set("q", trimmedQ);
  }
  const q = sp.toString();
  return q ? `/projects?${q}` : "/projects";
}

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string | string[]; client?: string; q?: string; view?: string | string[] }>;
}) {
  const { status: statusQ, client: clientQ, q: qQ, view: viewQ } = await searchParams;
  const statusFilter = parseStatusQuery(statusQ);
  const primaryStatus = statusFilter.length === 1 ? statusFilter[0] : undefined;
  const view = parseViewQuery(viewQ);
  const clientFilter = parseClientQuery(clientQ);
  const searchInput = parseSearchQuery(qQ);
  const searchForList =
    searchInput && searchInput.replace(/[%_,]/g, "").trim().length >= 2 ? searchInput : undefined;

  const [rows, clientLabel, dateStyle, roles] = await Promise.all([
    listProjects({
      ...(statusFilter.length > 0 ? { status: statusFilter } : {}),
      ...(clientFilter ? { clientId: clientFilter } : {}),
      ...(searchForList ? { search: searchForList } : {}),
    }),
    clientFilter ? getClientNameById(clientFilter) : Promise.resolve(null),
    getDateStylePreference(),
    getCurrentAppRoles(),
  ]);
  const canSeeIncoming = isOfficeOrAdminRole(roles);
  const canChangeStatus = hasAnyAppRole(roles, ["admin", "office", "operations"]);
  const statusOptions = canSeeIncoming
    ? PROJECT_STATUS_KANBAN_ORDER
    : PROJECT_STATUS_KANBAN_ORDER.filter((s) => s !== "incoming");

  return (
    <main className="container-page py-8">
      <div className="page-header-row mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">פרויקטים</h1>
          <Modal>
            <ModalTrigger asChild>
              <Button
                aria-label="הנחיות מסך פרויקטים"
                className="h-auto w-auto rounded-none border-0 bg-transparent p-0 shadow-none hover:bg-transparent"
                size="icon"
                type="button"
                variant="ghost"
              >
                <Info className="h-4 w-4" />
              </Button>
            </ModalTrigger>
            <ModalContent>
              <ModalHeader>
                <ModalTitle>הנחיות</ModalTitle>
              </ModalHeader>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>רשימת פרויקטים לפי סטטוס ותאריכי אירוע. אפשר לסנן לפי שלב ולבצע חיפוש טקסט.</p>
                {clientFilter ? (
                  <p>
                    לקוח מסונן:{" "}
                    <span className="font-medium text-foreground">
                      {clientLabel ?? `${clientFilter.slice(0, 8)}…`}
                    </span>
                    .
                  </p>
                ) : null}
                <p>לפרטים מלאים של פרויקט אפשר לפתוח את חלון התצוגה המהירה ואז לעבור לעמוד הפרויקט.</p>
              </div>
            </ModalContent>
          </Modal>
        </div>
        <div className="flex w-full flex-wrap items-center justify-between gap-2 lg:w-auto lg:flex-nowrap">
          <div className="inline-flex overflow-hidden rounded-[var(--radius)] border border-border bg-card">
            <Button
              asChild
              className={
                view === "list"
                  ? "rounded-none border-0 bg-primary/10 text-foreground shadow-[inset_0_2px_6px_rgba(15,23,42,0.12)]"
                  : "rounded-none border-0 shadow-none"
              }
              size="sm"
              variant={view === "list" ? "outline" : "ghost"}
            >
              <Link
                aria-current={view === "list" ? "page" : undefined}
                className="inline-flex items-center gap-1.5 px-3"
                href={projectsPageQuery({
                  view: "list",
                  status: statusFilter,
                  clientId: clientFilter,
                  q: searchInput,
                })}
              >
                <List className="h-4 w-4" />
                רשימה
              </Link>
            </Button>
            <Button
              asChild
              className={
                view === "kanban"
                  ? "rounded-none border-0 border-r border-border bg-primary/10 text-foreground shadow-[inset_0_2px_6px_rgba(15,23,42,0.12)]"
                  : "rounded-none border-0 border-r border-border shadow-none"
              }
              size="sm"
              variant={view === "kanban" ? "outline" : "ghost"}
            >
              <Link
                aria-current={view === "kanban" ? "page" : undefined}
                className="inline-flex items-center gap-1.5 px-3"
                href={projectsPageQuery({
                  view: "kanban",
                  status: statusFilter,
                  clientId: clientFilter,
                  q: searchInput,
                })}
              >
                <KanbanSquare className="h-4 w-4" />
                קנבן
              </Link>
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild size="sm" variant="outline">
              <Link className="inline-flex items-center gap-1.5" href="/projects/calendar">
                <CalendarDays className="h-4 w-4" />
                יומן
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link className="inline-flex items-center gap-1.5" href="/projects/new">
                <Plus className="h-4 w-4" />
                פרויקט חדש
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex w-full items-center justify-between sm:w-auto sm:justify-start sm:gap-2">
          <h2 className="text-sm font-semibold text-muted-foreground">
            רשימת פרויקטים
            {primaryStatus
              ? ` · ${PROJECT_STATUS_LABELS[primaryStatus]}`
              : statusFilter.length > 1
                ? " · מסונן"
                : ""}
          </h2>
          <Modal>
            <ModalTrigger asChild>
              <Button size="sm" type="button" variant="outline">
                <Filter className="me-1 h-4 w-4" />
                סינון
              </Button>
            </ModalTrigger>
            <ModalContent>
              <ModalHeader>
                <ModalTitle>סינון לפי סטטוס</ModalTitle>
              </ModalHeader>
              <form action="/projects" className="space-y-3" method="get">
                {view !== "list" ? <input name="view" type="hidden" value={view} /> : null}
                {clientFilter ? <input name="client" type="hidden" value={clientFilter} /> : null}
                {searchInput ? <input name="q" type="hidden" value={searchInput} /> : null}
                <fieldset className="space-y-2 rounded-md border border-border bg-muted/20 p-3">
                  <legend className="px-1 text-xs font-medium text-muted-foreground">בחירת סטטוסים</legend>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {statusOptions.map((status) => (
                      <label
                        className="flex cursor-pointer items-center justify-between rounded-md border border-border bg-card px-3 py-2 text-sm transition-colors hover:bg-muted/40"
                        key={status}
                      >
                        <span>{PROJECT_STATUS_LABELS[status]}</span>
                        <input
                          className="h-4 w-4 accent-primary"
                          defaultChecked={statusFilter.includes(status)}
                          name="status"
                          type="checkbox"
                          value={status}
                        />
                      </label>
                    ))}
                  </div>
                </fieldset>
                <div className="flex gap-2">
                  <Button size="sm" type="submit" variant="outline">
                    <Filter className="me-1 h-4 w-4" />
                    החל סינון
                  </Button>
                  <Button asChild size="sm" type="button" variant="ghost">
                    <Link href={projectsListQuery({ clientId: clientFilter, q: searchInput })}>ניקוי</Link>
                  </Button>
                </div>
              </form>
            </ModalContent>
          </Modal>
        </div>
        <form action="/projects" className="flex w-full items-center gap-2 sm:w-auto" method="get" role="search">
          {view !== "list" ? <input name="view" type="hidden" value={view} /> : null}
          {statusFilter.map((status) => (
            <input key={status} name="status" type="hidden" value={status} />
          ))}
          {clientFilter ? <input name="client" type="hidden" value={clientFilter} /> : null}
          <div className="relative w-full sm:w-auto">
            <Search className="pointer-events-none absolute end-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pe-8 sm:w-[20rem]"
              defaultValue={searchInput ?? ""}
              id="projects-search-q"
              name="q"
              placeholder="שם לקוח או כתובת אירוע…"
              type="search"
            />
          </div>
        </form>
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
          ) : clientFilter && statusFilter.length > 0 ? (
            <>
              אין פרויקטים ללקוח זה בסטטוסים שנבחרו.{" "}
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
          ) : statusFilter.length > 0 ? (
            <>
              אין פרויקטים בסטטוסים שנבחרו.{" "}
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
      ) : view === "kanban" ? (
        <div className="max-h-[66vh] overflow-hidden">
          <ProjectKanbanBoard
            allowIncomingStatus={canSeeIncoming}
            canChangeStatus={canChangeStatus}
            dateStyle={dateStyle}
            projects={rows}
          />
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
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <ProjectTableRow key={row.id} row={row} dateStyle={dateStyle} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
