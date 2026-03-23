"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { updateProjectStatusFromForm } from "@/actions/projects";
import { Button } from "@/components/ui/button";
import type { ProjectStatus } from "@/types/projects";
import { PROJECT_STATUS_FIELD_TARGET_ORDER, PROJECT_STATUS_LABELS } from "@/types/projects";

const selectClassName =
  "flex h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-base text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

interface FieldProjectStatusFormProps {
  projectId: string;
  currentStatus: ProjectStatus;
}

function defaultSelectValue(current: ProjectStatus): ProjectStatus {
  if (PROJECT_STATUS_FIELD_TARGET_ORDER.includes(current)) {
    return current;
  }
  return "prep";
}

export function FieldProjectStatusForm({ projectId, currentStatus }: FieldProjectStatusFormProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(updateProjectStatusFromForm, null);

  useEffect(() => {
    if (state?.success) {
      router.refresh();
    }
  }, [state, router]);

  const canUseForm =
    currentStatus === "approved" ||
    currentStatus === "prep" ||
    currentStatus === "setup" ||
    currentStatus === "teardown";

  if (!canUseForm) {
    return (
      <p className="text-sm text-muted-foreground">
        עדכון סטטוס מהשטח זמין רק לפרויקטים במצב מאושר / הכנה / הקמה / פירוק. לשינויים אחרים פנו למשרד.
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-3">
      <input name="projectId" type="hidden" value={projectId} />
      <div className="space-y-1.5">
        <label className="text-sm font-medium" htmlFor="field-status">
          עדכון שלב בשטח
        </label>
        <select
          className={selectClassName}
          defaultValue={defaultSelectValue(currentStatus)}
          id="field-status"
          name="status"
        >
          {PROJECT_STATUS_FIELD_TARGET_ORDER.map((s) => (
            <option key={s} value={s}>
              {PROJECT_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>
      <Button className="w-full" disabled={isPending} type="submit">
        {isPending ? "מעדכנים…" : "שמירת סטטוס"}
      </Button>
      {state && !state.success ? (
        <p className="text-sm text-destructive" role="alert">
          {state.message}
        </p>
      ) : null}
      {state?.success ? (
        <p className="text-sm text-green-700 dark:text-green-400" role="status">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
