"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { upsertProjectSiteDetailsFromForm } from "@/actions/project-site-details";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ProjectSiteDetails } from "@/types/project-site";

interface ProjectSiteDetailsFormProps {
  projectId: string;
  initial: ProjectSiteDetails | null;
}

export function ProjectSiteDetailsForm({
  projectId,
  initial,
}: ProjectSiteDetailsFormProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    upsertProjectSiteDetailsFromForm,
    null,
  );

  useEffect(() => {
    if (state?.success) {
      router.refresh();
    }
  }, [state, router]);

  return (
    <form action={formAction} className="space-y-4">
      <input name="projectId" type="hidden" value={projectId} />

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground" htmlFor="accessNotes">
          דרכי גישה
        </label>
        <Textarea
          defaultValue={initial?.access_notes ?? ""}
          id="accessNotes"
          name="accessNotes"
          placeholder="הנחיות גישה לשטח"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground" htmlFor="claddingColor">
          צבע חיפוי
        </label>
        <Input
          defaultValue={initial?.cladding_color ?? ""}
          id="claddingColor"
          name="claddingColor"
          placeholder="למשל לבן / מותג צבע"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground" htmlFor="notes">
          הערות
        </label>
        <Textarea
          defaultValue={initial?.notes ?? ""}
          id="notes"
          name="notes"
          placeholder="הערות כלליות לאירוע"
        />
      </div>

      <p className="text-xs text-muted-foreground">
        תמונות שטח וסקיצה מנוהלות בסעיף &quot;מדיה וקבצים&quot; מתחת לטופס זה.
      </p>

      <label className="flex cursor-pointer items-center gap-2 text-sm">
        <input
          className="size-4 rounded border-border"
          defaultChecked={initial?.submitted_by_client ?? false}
          name="submittedByClient"
          type="checkbox"
          value="on"
        />
        <span>הטופס הוגש על ידי הלקוח</span>
      </label>

      {state && !state.success ? (
        <p className="text-sm text-destructive">{state.message}</p>
      ) : null}
      {state?.success ? (
        <p className="text-sm text-emerald-700 dark:text-emerald-400">{state.message}</p>
      ) : null}

      <div className="flex justify-end">
        <Button disabled={isPending} type="submit">
          {isPending ? "שומרים…" : "שמירת פרטי אתר"}
        </Button>
      </div>
    </form>
  );
}
