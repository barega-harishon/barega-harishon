"use client";

import { useActionState, useState } from "react";

import { deleteAuthUserFromAdminForm } from "@/actions/admin-users";
import { Button } from "@/components/ui/button";

interface RemoveUserFromTenantFormProps {
  profileId: string;
  /** כשאין מפתח שרת — אי אפשר למחוק מ־Auth */
  serviceRoleAvailable: boolean;
  isSelf: boolean;
}

export function RemoveUserFromTenantForm({
  profileId,
  serviceRoleAvailable,
  isSelf,
}: RemoveUserFromTenantFormProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(deleteAuthUserFromAdminForm, null);

  if (!serviceRoleAvailable) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  if (isSelf) {
    return <span className="text-xs text-muted-foreground">לא זמין</span>;
  }

  if (!confirmOpen) {
    return (
      <Button
        className="w-full max-w-[11rem]"
        onClick={() => setConfirmOpen(true)}
        type="button"
        variant="outline"
      >
        הסרת משתמש
      </Button>
    );
  }

  return (
    <div className="flex max-w-[14rem] flex-col gap-2">
      <p className="text-xs text-destructive">
        החשבון יימחק לצמיתות מ־Auth והמשתמש לא יוכל להתחבר. פעולה בלתי הפיכה.
      </p>
      <form action={formAction} className="flex flex-wrap gap-2">
        <input name="profileId" type="hidden" value={profileId} />
        <Button disabled={isPending} type="submit" variant="destructive">
          {isPending ? "מוחקים…" : "אישור הסרה"}
        </Button>
        <Button disabled={isPending} onClick={() => setConfirmOpen(false)} type="button" variant="outline">
          ביטול
        </Button>
      </form>
      {state?.message ? (
        <p className={`text-xs ${state.success ? "text-emerald-600" : "text-destructive"}`} role="status">
          {state.message}
        </p>
      ) : null}
    </div>
  );
}
