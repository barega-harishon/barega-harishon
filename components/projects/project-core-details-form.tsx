"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { updateProjectCoreFromForm } from "@/actions/projects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ActionResult } from "@/types/common";
import type { ProjectDetailRow } from "@/types/projects";
import { toDateTimeLocalValue } from "@/utils/date";

interface ProjectCoreDetailsFormProps {
  project: ProjectDetailRow;
}

export function ProjectCoreDetailsForm({ project }: ProjectCoreDetailsFormProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    updateProjectCoreFromForm,
    null as ActionResult<Record<string, never>> | null,
  );

  useEffect(() => {
    if (state?.success) {
      router.refresh();
    }
  }, [state, router]);

  return (
    <form action={formAction} className="space-y-4 rounded-[var(--radius)] border border-border bg-muted/20 p-4">
      <input name="projectId" type="hidden" value={project.id} />
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground" htmlFor="locationAddress">
          כתובת אירוע <span className="text-destructive">*</span>
        </label>
        <Input
          defaultValue={project.location_address ?? ""}
          id="locationAddress"
          name="locationAddress"
          required
          type="text"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground" htmlFor="setupStartsAt">
            הקמה
          </label>
          <Input
            defaultValue={toDateTimeLocalValue(project.setup_starts_at)}
            id="setupStartsAt"
            name="setupStartsAt"
            type="datetime-local"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground" htmlFor="eventStartsAt">
            תחילת אירוע <span className="text-destructive">*</span>
          </label>
          <Input
            defaultValue={toDateTimeLocalValue(project.event_starts_at)}
            id="eventStartsAt"
            name="eventStartsAt"
            required
            type="datetime-local"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground" htmlFor="eventEndsAt">
            סיום אירוע
          </label>
          <Input
            defaultValue={toDateTimeLocalValue(project.event_ends_at)}
            id="eventEndsAt"
            name="eventEndsAt"
            type="datetime-local"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground" htmlFor="teardownAt">
            פירוק
          </label>
          <Input
            defaultValue={toDateTimeLocalValue(project.teardown_at)}
            id="teardownAt"
            name="teardownAt"
            type="datetime-local"
          />
        </div>
      </div>
      {state && !state.success ? (
        <p className="text-sm text-destructive" role="alert">
          {state.message}
        </p>
      ) : null}
      {state?.success ? (
        <p className="text-sm text-emerald-700 dark:text-emerald-400">{state.message}</p>
      ) : null}
      <div className="flex justify-end">
        <Button disabled={isPending} type="submit" variant="outline">
          {isPending ? "שומרים…" : "שמירת פרטי ליבה"}
        </Button>
      </div>
    </form>
  );
}
