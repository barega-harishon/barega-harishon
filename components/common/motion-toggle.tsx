"use client";

import { useActionState } from "react";

import { setMotionFromForm } from "@/actions/preferences";
import { Button } from "@/components/ui/button";
import type { MotionPreference } from "@/lib/ui-preferences";
import type { ActionResult } from "@/types/common";

export function MotionToggle({ current }: { current: MotionPreference }) {
  const [state, action, pending] = useActionState(
    setMotionFromForm,
    null as ActionResult<Record<string, never>> | null,
  );

  return (
    <form action={action} className="space-y-2">
      <p className="text-xs text-muted-foreground">תנועה ואנימציות</p>
      <div className="flex gap-2">
        <Button
          type="submit"
          name="motion"
          value="full"
          size="sm"
          variant={current === "full" ? "default" : "outline"}
          disabled={pending}
          className="flex-1"
        >
          רגיל
        </Button>
        <Button
          type="submit"
          name="motion"
          value="reduced"
          size="sm"
          variant={current === "reduced" ? "default" : "outline"}
          disabled={pending}
          className="flex-1"
        >
          מופחת
        </Button>
      </div>
      {state?.success ? <p className="text-xs text-emerald-700 dark:text-emerald-400">{state.message}</p> : null}
    </form>
  );
}
