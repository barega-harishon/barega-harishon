"use client";

import { useActionState } from "react";

import { updateAdminProfileRoleFromForm } from "@/actions/admin-users";
import { Button } from "@/components/ui/button";
import { APP_ROLE_LABELS_HE, APP_ROLE_OPTIONS, type AppRole } from "@/types/app-role";

const selectClassName =
  "flex h-10 min-w-[10rem] rounded-[var(--radius)] border border-border bg-input px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

interface ProfileRoleUpdateFormProps {
  profileId: string;
  defaultRole: AppRole;
}

export function ProfileRoleUpdateForm({ profileId, defaultRole }: ProfileRoleUpdateFormProps) {
  const [state, formAction, isPending] = useActionState(updateAdminProfileRoleFromForm, null);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <input name="profileId" type="hidden" value={profileId} />
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-muted-foreground" htmlFor={`role-${profileId}`}>
          תפקיד
        </label>
        <select
          className={selectClassName}
          defaultValue={defaultRole}
          id={`role-${profileId}`}
          name="role"
          required
        >
          {APP_ROLE_OPTIONS.map((r) => (
            <option key={r} value={r}>
              {APP_ROLE_LABELS_HE[r]}
            </option>
          ))}
        </select>
      </div>
      <Button disabled={isPending} size="sm" type="submit" variant="outline">
        {isPending ? "שומרים…" : "עדכון"}
      </Button>
      {state?.message ? (
        <p className={`text-xs ${state.success ? "text-emerald-600" : "text-destructive"}`} role="status">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
