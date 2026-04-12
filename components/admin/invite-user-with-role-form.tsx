"use client";

import { useActionState } from "react";

import { inviteUserWithRoleFromForm } from "@/actions/admin-users";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { APP_ROLE_LABELS_HE, APP_ROLE_OPTIONS, type AppRole } from "@/types/app-role";

const selectClassName =
  "flex h-10 w-full rounded-[var(--radius)] border border-border bg-input px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

interface InviteUserWithRoleFormProps {
  defaultAppRole: AppRole;
}

export function InviteUserWithRoleForm({ defaultAppRole }: InviteUserWithRoleFormProps) {
  const [state, formAction, isPending] = useActionState(inviteUserWithRoleFromForm, null);

  return (
    <form action={formAction} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
      <div className="space-y-1.5 sm:col-span-2">
        <label className="block text-sm font-medium text-foreground" htmlFor="invite-email">
          דוא״ל להזמנה
        </label>
        <Input autoComplete="email" id="invite-email" name="email" required type="email" />
      </div>
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-foreground" htmlFor="invite-app-role">
          תפקיד בחשבון
        </label>
        <select
          className={selectClassName}
          defaultValue={defaultAppRole}
          id="invite-app-role"
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
          {isPending ? "שולחים…" : "שליחת הזמנה"}
        </Button>
      </div>
      {state?.message ? (
        <p
          className={`text-sm sm:col-span-2 lg:col-span-4 ${state.success ? "text-emerald-600" : "text-destructive"}`}
          role="status"
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
