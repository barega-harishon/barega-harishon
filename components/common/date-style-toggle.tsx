"use client";

import { useActionState } from "react";

import { setDateStyleFromForm } from "@/actions/preferences";
import { Button } from "@/components/ui/button";
import type { DateStylePreference } from "@/lib/date-style";
import type { ActionResult } from "@/types/common";

export function DateStyleToggle({ currentStyle }: { currentStyle: DateStylePreference }) {
  const [state, action, pending] = useActionState(
    setDateStyleFromForm,
    null as ActionResult<Record<string, never>> | null,
  );

  return (
    <form action={action} className="space-y-2">
      <p className="text-xs text-muted-foreground">תצוגת תאריך</p>
      <div className="flex gap-2">
        <Button
          type="submit"
          name="dateStyle"
          value="hebrew"
          size="sm"
          variant={currentStyle === "hebrew" ? "default" : "outline"}
          disabled={pending}
          className="flex-1"
        >
          עברי מלא
        </Button>
        <Button
          type="submit"
          name="dateStyle"
          value="short"
          size="sm"
          variant={currentStyle === "short" ? "default" : "outline"}
          disabled={pending}
          className="flex-1"
        >
          קצר
        </Button>
      </div>
      {state?.success ? <p className="text-xs text-emerald-700 dark:text-emerald-400">{state.message}</p> : null}
    </form>
  );
}
