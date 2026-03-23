"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { updateProjectStatusFromForm } from "@/actions/projects";
import { Button } from "@/components/ui/button";
import type { ProjectStatus } from "@/types/projects";
import { PROJECT_STATUS_KANBAN_ORDER, PROJECT_STATUS_LABELS } from "@/types/projects";

const selectClassName =
  "flex h-10 w-full max-w-xs rounded-[var(--radius)] border border-border bg-input px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

interface ProjectStatusFormProps {
  projectId: string;
  currentStatus: ProjectStatus;
}

export function ProjectStatusForm({ projectId, currentStatus }: ProjectStatusFormProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    updateProjectStatusFromForm,
    null,
  );

  useEffect(() => {
    if (state?.success) {
      router.refresh();
    }
  }, [state, router]);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <input name="projectId" type="hidden" value={projectId} />
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground" htmlFor="status">
          סטטוס פרויקט
        </label>
        <select
          className={selectClassName}
          defaultValue={currentStatus}
          id="status"
          name="status"
        >
          {PROJECT_STATUS_KANBAN_ORDER.map((s) => (
            <option key={s} value={s}>
              {PROJECT_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>
      <Button disabled={isPending} type="submit" variant="outline">
        {isPending ? "מעדכנים…" : "עדכון סטטוס"}
      </Button>
      {state && !state.success ? (
        <p className="w-full text-sm text-destructive">{state.message}</p>
      ) : null}
      {state?.success ? (
        <p className="w-full text-sm text-emerald-700 dark:text-emerald-400">{state.message}</p>
      ) : null}
    </form>
  );
}
