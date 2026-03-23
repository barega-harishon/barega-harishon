import type { ProjectStatus } from "@/types/projects";
import { PROJECT_STATUS_LABELS } from "@/types/projects";
import { cn } from "@/utils/cn";

const STATUS_STYLES: Record<ProjectStatus, string> = {
  quote: "bg-muted text-muted-foreground",
  approved: "bg-primary/15 text-primary",
  prep: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100",
  setup: "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-100",
  teardown: "bg-violet-100 text-violet-900 dark:bg-violet-950 dark:text-violet-100",
  closed: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100",
};

interface ProjectStatusBadgeProps {
  status: ProjectStatus;
  className?: string;
}

export function ProjectStatusBadge({ status, className }: ProjectStatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        STATUS_STYLES[status],
        className,
      )}
    >
      {PROJECT_STATUS_LABELS[status]}
    </span>
  );
}
