"use client";

import { useActionState } from "react";

import { setThemeFromForm } from "@/actions/preferences";
import { Button } from "@/components/ui/button";
import type { ThemePreference } from "@/lib/ui-preferences";
import type { ActionResult } from "@/types/common";

export function ThemeToggle({ current }: { current: ThemePreference }) {
  const [state, action, pending] = useActionState(
    setThemeFromForm,
    null as ActionResult<Record<string, never>> | null,
  );

  return (
    <form action={action} className="space-y-2">
      <p className="text-xs text-muted-foreground">מצב תצוגה</p>
      <div className="flex gap-2">
        <Button
          type="submit"
          name="theme"
          value="light"
          size="sm"
          variant={current === "light" ? "default" : "outline"}
          disabled={pending}
          className="flex-1"
        >
          יום
        </Button>
        <Button
          type="submit"
          name="theme"
          value="dark"
          size="sm"
          variant={current === "dark" ? "default" : "outline"}
          disabled={pending}
          className="flex-1"
        >
          לילה
        </Button>
      </div>
      {state?.success ? <p className="text-xs text-emerald-700 dark:text-emerald-400">{state.message}</p> : null}
    </form>
  );
}
