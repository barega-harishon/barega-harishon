"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { updateProjectStatus } from "@/actions/projects";
import { ProjectQuickViewModal } from "@/components/projects/project-quick-view-modal";
import type { ProjectListRow, ProjectStatus } from "@/types/projects";
import {
  PROJECT_STATUS_KANBAN_ORDER,
  PROJECT_STATUS_LABELS,
} from "@/types/projects";
import type { DateStylePreference } from "@/lib/date-style";
import { formatDateTimeByPreference } from "@/utils/date";
import { formatCurrencyIl } from "@/utils/money";

const selectClassName =
  "mt-2 w-full rounded-[var(--radius)] border border-border bg-input px-2 py-1.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const KANBAN_HEADER_STYLES: Record<ProjectStatus, string> = {
  incoming: "bg-orange-100/80 text-orange-900 dark:bg-orange-950/40 dark:text-orange-100",
  quote: "bg-muted text-foreground",
  approved: "bg-primary/15 text-primary",
  prep: "bg-amber-100/80 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100",
  setup: "bg-sky-100/80 text-sky-900 dark:bg-sky-950/40 dark:text-sky-100",
  teardown: "bg-violet-100/80 text-violet-900 dark:bg-violet-950/40 dark:text-violet-100",
  closed: "bg-emerald-100/80 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100",
};

function isProjectStatus(value: string): value is ProjectStatus {
  return PROJECT_STATUS_KANBAN_ORDER.includes(value as ProjectStatus);
}

function groupByStatus(rows: ProjectListRow[]): Record<ProjectStatus, ProjectListRow[]> {
  const buckets = {} as Record<ProjectStatus, ProjectListRow[]>;
  for (const s of PROJECT_STATUS_KANBAN_ORDER) {
    buckets[s] = [];
  }
  for (const row of rows) {
    const s = isProjectStatus(row.status) ? row.status : "quote";
    buckets[s].push(row);
  }
  return buckets;
}

interface ProjectKanbanBoardProps {
  projects: ProjectListRow[];
  canChangeStatus: boolean;
  dateStyle: DateStylePreference;
  allowIncomingStatus?: boolean;
}

export function ProjectKanbanBoard({
  projects,
  canChangeStatus,
  dateStyle,
  allowIncomingStatus = true,
}: ProjectKanbanBoardProps) {
  const grouped = useMemo(() => groupByStatus(projects), [projects]);
  const statusOptions = allowIncomingStatus
    ? PROJECT_STATUS_KANBAN_ORDER
    : PROJECT_STATUS_KANBAN_ORDER.filter((s) => s !== "incoming");

  return (
    <div className="max-w-full overflow-x-auto overflow-y-hidden overscroll-x-contain pb-1 [direction:ltr] [-webkit-overflow-scrolling:touch]">
      <div className="flex w-max min-w-full gap-4 [direction:rtl]">
        {statusOptions.map((status) => (
          <KanbanColumn
            allowIncomingStatus={allowIncomingStatus}
            canChangeStatus={canChangeStatus}
            dateStyle={dateStyle}
            key={status}
            label={PROJECT_STATUS_LABELS[status]}
            rows={grouped[status]}
            status={status}
          />
        ))}
      </div>
    </div>
  );
}

function KanbanColumn({
  status,
  label,
  rows,
  canChangeStatus,
  dateStyle,
  allowIncomingStatus,
}: {
  status: ProjectStatus;
  label: string;
  rows: ProjectListRow[];
  canChangeStatus: boolean;
  dateStyle: DateStylePreference;
  allowIncomingStatus: boolean;
}) {
  return (
    <section className="flex h-[62vh] w-72 shrink-0 flex-col rounded-[var(--radius)] border border-border bg-muted/20">
      <div
        className={`sticky top-0 z-10 flex items-center justify-between gap-2 rounded-t-[var(--radius)] border-b border-border px-3 py-2 ${KANBAN_HEADER_STYLES[status]}`}
      >
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <span className="truncate text-sm font-semibold">{label}</span>
        </div>
        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs tabular-nums text-muted-foreground">
          {rows.length}
        </span>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-y-contain p-3">
        {rows.length === 0 ? (
          <p className="text-center text-xs text-muted-foreground">אין פרויקטים</p>
        ) : (
          rows.map((row) => {
            const rowStatus = isProjectStatus(row.status) ? row.status : "quote";
            return (
              <KanbanCard
                allowIncomingStatus={allowIncomingStatus}
                canChangeStatus={canChangeStatus}
                key={`${row.id}-${rowStatus}`}
                row={row}
                dateStyle={dateStyle}
              />
            );
          })
        )}
      </div>
    </section>
  );
}

function KanbanCard({
  row,
  canChangeStatus,
  dateStyle,
  allowIncomingStatus,
}: {
  row: ProjectListRow;
  canChangeStatus: boolean;
  dateStyle: DateStylePreference;
  allowIncomingStatus: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const status: ProjectStatus = isProjectStatus(row.status) ? row.status : "quote";
  const [selectStatus, setSelectStatus] = useState<ProjectStatus>(status);
  const clientName = row.clients?.name ?? "—";

  function handleStatusChange(next: ProjectStatus) {
    if (next === status) {
      return;
    }
    setError(null);
    setSelectStatus(next);
    startTransition(async () => {
      const result = await updateProjectStatus({ projectId: row.id, status: next });
      if (result.success) {
        router.refresh();
        return;
      }
      setSelectStatus(status);
      setError(result.message);
    });
  }

  return (
    <ProjectQuickViewModal
      dateStyle={dateStyle}
      row={row}
      status={status}
      trigger={
        <article
          aria-label={`פתח פרטי פרויקט עבור ${clientName}`}
          className="cursor-pointer rounded-[var(--radius)] border border-border bg-card p-3 shadow-sm transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              event.currentTarget.click();
            }
          }}
          role="button"
          tabIndex={0}
        >
          <div className="space-y-1 text-start">
            <span className="block font-medium text-primary hover:underline">{clientName}</span>
            <span className="mt-1 line-clamp-2 block text-xs text-muted-foreground">
              {row.location_address ?? "ללא כתובת אירוע"}
            </span>
            <span className="mt-1 block text-xs text-muted-foreground">
              אירוע: {formatDateTimeByPreference(row.event_starts_at, dateStyle)}
            </span>
            <span className="mt-0.5 block text-xs tabular-nums text-muted-foreground">
              {formatCurrencyIl(row.total_price)}
            </span>
          </div>
          {canChangeStatus ? (
            <div
              className="mt-2"
              onClick={(event) => event.stopPropagation()}
              onKeyDown={(event) => event.stopPropagation()}
              onPointerDown={(event) => event.stopPropagation()}
            >
              <label className="sr-only" htmlFor={`kanban-status-${row.id}`}>
                שינוי סטטוס לפרויקט {clientName}
              </label>
              <select
                className={selectClassName}
                disabled={pending}
                id={`kanban-status-${row.id}`}
                onChange={(e) => handleStatusChange(e.target.value as ProjectStatus)}
                value={selectStatus}
              >
                {(allowIncomingStatus
                  ? PROJECT_STATUS_KANBAN_ORDER
                  : PROJECT_STATUS_KANBAN_ORDER.filter((s) => s !== "incoming")
                ).map((s) => (
                  <option key={s} value={s}>
                    {PROJECT_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
              {error ? (
                <p className="mt-1 text-xs text-destructive" role="alert">
                  {error}
                </p>
              ) : null}
            </div>
          ) : null}
        </article>
      }
      triggerAsChild
    />
  );
}
