"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { updateProjectStatus } from "@/actions/projects";
import { ProjectStatusBadge } from "@/components/projects/project-status-badge";
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
    <div className="flex gap-4 overflow-x-auto pb-4 [-webkit-overflow-scrolling:touch]">
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
    <section className="flex w-[min(100%,280px)] shrink-0 flex-col rounded-[var(--radius)] border border-border bg-muted/20">
      <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-border bg-muted/40 px-3 py-2">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <span className="truncate text-sm font-semibold">{label}</span>
          <ProjectStatusBadge status={status} />
        </div>
        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs tabular-nums text-muted-foreground">
          {rows.length}
        </span>
      </div>
      <div className="flex max-h-[min(70vh,720px)] flex-col gap-3 overflow-y-auto p-3">
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
    <article className="rounded-[var(--radius)] border border-border bg-card p-3 shadow-sm">
      <Link className="block font-medium text-primary hover:underline" href={`/projects/${row.id}`}>
        {clientName}
      </Link>
      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
        {row.location_address ?? "ללא כתובת אירוע"}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        אירוע: {formatDateTimeByPreference(row.event_starts_at, dateStyle)}
      </p>
      <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
        {formatCurrencyIl(row.total_price)}
      </p>
      {canChangeStatus ? (
        <>
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
        </>
      ) : null}
    </article>
  );
}
