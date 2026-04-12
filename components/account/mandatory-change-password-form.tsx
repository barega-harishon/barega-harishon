"use client";

import { useActionState, useTransition } from "react";

import { completeMandatoryPasswordChangeFromForm } from "@/actions/account-password";
import { signOut } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function MandatoryChangePasswordForm() {
  const [state, formAction, isPending] = useActionState(completeMandatoryPasswordChangeFromForm, null);
  const [isSigningOut, startSignOut] = useTransition();

  return (
    <div className="space-y-6">
      <form action={formAction} className="space-y-4">
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-foreground" htmlFor="new-password">
            סיסמה חדשה
          </label>
          <Input
            autoComplete="new-password"
            id="new-password"
            minLength={8}
            name="password"
            required
            type="password"
          />
        </div>
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-foreground" htmlFor="confirm-new-password">
            אימות סיסמה
          </label>
          <Input
            autoComplete="new-password"
            id="confirm-new-password"
            minLength={8}
            name="confirmPassword"
            required
            type="password"
          />
        </div>
        <Button className="w-full" disabled={isPending} type="submit">
          {isPending ? "שומרים…" : "עדכון סיסמה והמשך"}
        </Button>
        {state && !state.success ? (
          <p className="text-sm text-destructive" role="alert">
            {state.message}
          </p>
        ) : null}
      </form>
      <div className="border-t border-border pt-4">
        <Button
          className="w-full"
          disabled={isSigningOut}
          type="button"
          variant="outline"
          onClick={() => startSignOut(() => void signOut())}
        >
          {isSigningOut ? "מתנתקים…" : "התנתקות"}
        </Button>
      </div>
    </div>
  );
}
