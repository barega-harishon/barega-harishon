"use client";

import { useActionState, useState } from "react";

import { createUserWithRoleFromForm } from "@/actions/admin-users";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { APP_ROLE_LABELS_HE, APP_ROLE_OPTIONS, type AppRole } from "@/types/app-role";

const selectClassName =
  "flex h-10 w-full rounded-[var(--radius)] border border-border bg-input px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

async function copyText(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    /* ignore */
  }
}

export function CreateUserWithRoleForm({ defaultAppRole }: { defaultAppRole: AppRole }) {
  const [passwordMode, setPasswordMode] = useState<"auto" | "manual">("auto");
  const [state, formAction, isPending] = useActionState(createUserWithRoleFromForm, null);

  return (
    <div className="space-y-4">
      <form action={formAction} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
        <div className="space-y-1.5 sm:col-span-2">
          <label className="block text-sm font-medium text-foreground" htmlFor="create-user-email">
            דוא״ל למשתמש
          </label>
          <Input
            autoComplete="off"
            id="create-user-email"
            name="email"
            required
            type="email"
          />
        </div>
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-foreground" htmlFor="create-user-app-role">
            תפקיד בחשבון
          </label>
          <select
            className={selectClassName}
            defaultValue={defaultAppRole}
            id="create-user-app-role"
            name="appRole"
            required
          >
            {APP_ROLE_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {APP_ROLE_LABELS_HE[r]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <Button className="w-full" disabled={isPending} type="submit">
            {isPending ? "יוצרים…" : "יצירת משתמש"}
          </Button>
        </div>

        <fieldset className="space-y-2 sm:col-span-2 lg:col-span-4">
          <legend className="text-sm font-medium text-foreground">סיסמה ראשונית</legend>
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="inline-flex cursor-pointer items-center gap-2">
              <input
                checked={passwordMode === "auto"}
                name="passwordMode"
                onChange={() => setPasswordMode("auto")}
                type="radio"
                value="auto"
              />
              יצירה אוטומטית (מומלץ)
            </label>
            <label className="inline-flex cursor-pointer items-center gap-2">
              <input
                checked={passwordMode === "manual"}
                name="passwordMode"
                onChange={() => setPasswordMode("manual")}
                type="radio"
                value="manual"
              />
              הזנה ידנית
            </label>
          </div>
        </fieldset>

        {passwordMode === "manual" ? (
          <div className="space-y-1.5 sm:col-span-2 lg:col-span-4">
            <label className="block text-sm font-medium text-foreground" htmlFor="create-user-manual-password">
              סיסמה זמנית (לפחות 8 תווים)
            </label>
            <Input
              autoComplete="new-password"
              id="create-user-manual-password"
              minLength={8}
              name="manualPassword"
              required
              type="password"
            />
          </div>
        ) : null}

        {state && !state.success ? (
          <p className="text-sm text-destructive sm:col-span-2 lg:col-span-4" role="alert">
            {state.message}
          </p>
        ) : null}
      </form>

      {state?.success && state.data ? (
        <div
          className="rounded-md border border-amber-600/50 bg-amber-50 p-4 dark:border-amber-500/40 dark:bg-amber-950/25"
          role="status"
        >
          <p className="text-sm font-medium text-foreground">{state.message}</p>
          {state.data.initialPassword ? (
            <div className="mt-3 space-y-2">
              <p className="text-xs text-muted-foreground">
                הסיסמה מוצגת פעם אחת בלבד במסך זה. העתיקו והעבירו למשתמש בערוץ מאובטח.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
                <Input className="font-mono text-xs sm:flex-1" readOnly value={state.data.initialPassword} />
                <Button
                  className="shrink-0"
                  type="button"
                  variant="outline"
                  onClick={() => void copyText(state.data!.initialPassword!)}
                >
                  העתקה
                </Button>
              </div>
              <p className="text-xs text-muted-foreground font-mono break-all">{state.data.email}</p>
            </div>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground font-mono break-all">{state.data.email}</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
