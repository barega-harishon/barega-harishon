"use client";

import Link from "next/link";
import { useActionState } from "react";

import { requestPasswordResetFromForm } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(requestPasswordResetFromForm, null);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-foreground" htmlFor="email">
          דוא״ל
        </label>
        <Input autoComplete="email" id="email" name="email" required type="email" />
      </div>
      {state?.message ? (
        <p className={`text-sm ${state.success ? "text-emerald-600" : "text-destructive"}`} role="status">
          {state.message}
        </p>
      ) : null}
      <Button className="w-full" disabled={pending} type="submit">
        {pending ? "שולחים…" : "שליחת קישור לאיפוס"}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        <Link className="underline underline-offset-4 hover:text-foreground" href="/login">
          חזרה להתחברות
        </Link>
      </p>
    </form>
  );
}
