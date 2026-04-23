"use client";

import { PROJECT_STATUS_KANBAN_ORDER } from "@/types/projects";
import type { ProjectListRow, ProjectStatus } from "@/types/projects";
import { formatDateTimeByPreference } from "@/utils/date";
import { formatCurrencyIl } from "@/utils/money";
import { ProjectQuickViewModal } from "@/components/projects/project-quick-view-modal";
import { ProjectStatusBadge } from "@/components/projects/project-status-badge";

function isProjectStatus(value: string): value is ProjectStatus {
  return PROJECT_STATUS_KANBAN_ORDER.includes(value as ProjectStatus);
}

export function ProjectTableRow({
  row,
  dateStyle,
}: {
  row: ProjectListRow;
  dateStyle: "short" | "hebrew";
}) {
  const status: ProjectStatus = isProjectStatus(row.status) ? row.status : "quote";
  const clientName = row.clients?.name ?? "—";

  return (
    <ProjectQuickViewModal
      dateStyle={dateStyle}
      row={row}
      status={status}
      trigger={
        <tr
          aria-label={`פתח פרטי פרויקט עבור ${clientName}`}
          className="cursor-pointer border-b border-border transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring last:border-0"
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              event.currentTarget.click();
            }
          }}
          role="button"
          tabIndex={0}
        >
          <td className="px-4 py-3 font-medium text-primary">{clientName}</td>
          <td className="px-4 py-3">
            <ProjectStatusBadge status={status} />
          </td>
          <td className="max-w-[14rem] truncate px-4 py-3 text-muted-foreground">{row.location_address ?? "—"}</td>
          <td className="px-4 py-3 text-muted-foreground">{formatDateTimeByPreference(row.event_starts_at, dateStyle)}</td>
          <td className="px-4 py-3">{formatCurrencyIl(row.total_price)}</td>
        </tr>
      }
      triggerAsChild
    />
  );
}
