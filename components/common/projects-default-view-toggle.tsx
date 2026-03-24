"use client";

import { useActionState } from "react";

import { setProjectsDefaultViewFromForm } from "@/actions/preferences";
import { Button } from "@/components/ui/button";
import type { ProjectsDefaultViewPreference } from "@/lib/ui-preferences";
import type { ActionResult } from "@/types/common";

export function ProjectsDefaultViewToggle({ current }: { current: ProjectsDefaultViewPreference }) {
  const [state, action, pending] = useActionState(
    setProjectsDefaultViewFromForm,
    null as ActionResult<Record<string, never>> | null,
  );

  return (
    <form action={action} className="space-y-2">
      <p className="text-xs text-muted-foreground">ברירת מחדל לפתיחת פרויקטים</p>
      <div className="flex flex-wrap gap-2">
        <Button
          type="submit"
          name="projectsDefaultView"
          value="list"
          size="sm"
          variant={current === "list" ? "default" : "outline"}
          disabled={pending}
        >
          רשימה
        </Button>
        <Button
          type="submit"
          name="projectsDefaultView"
          value="kanban"
          size="sm"
          variant={current === "kanban" ? "default" : "outline"}
          disabled={pending}
        >
          קנבן
        </Button>
        <Button
          type="submit"
          name="projectsDefaultView"
          value="calendar"
          size="sm"
          variant={current === "calendar" ? "default" : "outline"}
          disabled={pending}
        >
          יומן
        </Button>
      </div>
      {state?.success ? <p className="text-xs text-emerald-700 dark:text-emerald-400">{state.message}</p> : null}
    </form>
  );
}
