"use client";

import { useActionState } from "react";

import { linkEmployeeAuthUserFromForm, unlinkEmployeeAuthUserFromForm } from "@/actions/employee-auth-link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface EmployeeAuthAccountSectionProps {
  employeeId: string;
  linkedAuthUserId: string | null;
}

export function EmployeeAuthAccountSection({
  employeeId,
  linkedAuthUserId,
}: EmployeeAuthAccountSectionProps) {
  const [linkState, linkAction, linkPending] = useActionState(linkEmployeeAuthUserFromForm, null);
  const [unlinkState, unlinkAction, unlinkPending] = useActionState(unlinkEmployeeAuthUserFromForm, null);

  return (
    <section className="rounded-[var(--radius)] border border-border bg-card p-4">
      <h2 className="text-base font-semibold">חשבון התחברות (שטח)</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        קישור בין כרטיס העובד למשתמש מחובר מאפשר שיבוץ ופרויקטים באזור השטח. ניתן לקשר לפי דוא״ל (דורש מפתח
        שרת) או להדביק מזהה משתמש מ־Supabase Auth.
      </p>
      {linkedAuthUserId ? (
        <p className="mt-2 text-sm">
          <span className="text-muted-foreground">מזהה משתמש משויך: </span>
          <span className="font-mono text-xs break-all">{linkedAuthUserId}</span>
        </p>
      ) : (
        <p className="mt-2 text-sm text-amber-600">אין חשבון משויך — שטח לא יזהה שיבוץ עד לקישור.</p>
      )}

      <form action={linkAction} className="mt-4 grid gap-3 sm:grid-cols-2">
        <input name="employeeId" type="hidden" value={employeeId} />
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-foreground" htmlFor={`auth-email-${employeeId}`}>
            דוא״ל משתמש
          </label>
          <Input autoComplete="off" id={`auth-email-${employeeId}`} name="email" type="email" />
        </div>
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-foreground" htmlFor={`auth-uid-${employeeId}`}>
            או מזהה משתמש (UUID)
          </label>
          <Input
            autoComplete="off"
            dir="ltr"
            id={`auth-uid-${employeeId}`}
            name="authUserId"
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
          />
        </div>
        <div className="sm:col-span-2 flex flex-wrap items-center gap-2">
          <Button disabled={linkPending} type="submit" variant="default">
            {linkPending ? "מקשרים…" : "שמירת קישור"}
          </Button>
        </div>
        {linkState?.message ? (
          <p
            className={`text-sm sm:col-span-2 ${linkState.success ? "text-emerald-600" : "text-destructive"}`}
            role="status"
          >
            {linkState.message}
          </p>
        ) : null}
      </form>

      {linkedAuthUserId ? (
        <form action={unlinkAction} className="mt-4 border-t border-border pt-4">
          <input name="employeeId" type="hidden" value={employeeId} />
          <Button disabled={unlinkPending} type="submit" variant="outline">
            {unlinkPending ? "מסירים…" : "הסרת קישור חשבון"}
          </Button>
          {unlinkState?.message ? (
            <p
              className={`mt-2 text-sm ${unlinkState.success ? "text-emerald-600" : "text-destructive"}`}
              role="status"
            >
              {unlinkState.message}
            </p>
          ) : null}
        </form>
      ) : null}
    </section>
  );
}
