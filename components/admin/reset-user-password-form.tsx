"use client";

import { useActionState, useId, useState } from "react";

import { resetAuthUserPasswordFromAdminForm } from "@/actions/admin-users";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ResetUserPasswordFormProps {
  profileId: string;
  isSelf: boolean;
}

export function ResetUserPasswordForm({ profileId, isSelf }: ResetUserPasswordFormProps) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(resetAuthUserPasswordFromAdminForm, null);
  const inputId = useId();

  if (isSelf) {
    return <span className="text-xs text-muted-foreground">לא זמין</span>;
  }

  if (!open) {
    return (
      <Button className="w-full max-w-[11rem]" onClick={() => setOpen(true)} size="sm" type="button" variant="outline">
        איפוס סיסמה
      </Button>
    );
  }

  return (
    <form action={formAction} className="flex max-w-[15rem] flex-col gap-2">
      <input name="profileId" type="hidden" value={profileId} />
      <label className="text-xs text-muted-foreground" htmlFor={inputId}>
        סיסמה זמנית חדשה
      </label>
      <Input
        autoComplete="new-password"
        id={inputId}
        minLength={8}
        name="newPassword"
        placeholder="לפחות 8 תווים"
        required
        type="password"
      />
      <div className="flex flex-wrap gap-2">
        <Button disabled={isPending} size="sm" type="submit">
          {isPending ? "מאפסים…" : "אישור"}
        </Button>
        <Button disabled={isPending} onClick={() => setOpen(false)} size="sm" type="button" variant="outline">
          ביטול
        </Button>
      </div>
      {state?.message ? (
        <p className={`text-xs ${state.success ? "text-emerald-600" : "text-destructive"}`} role="status">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
