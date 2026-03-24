"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useState } from "react";

import { resetPasswordFromForm } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ResetPasswordForm() {
  const [state, formAction, pending] = useActionState(resetPasswordFromForm, null);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-foreground" htmlFor="password">
          סיסמה חדשה
        </label>
        <Input
          autoComplete="new-password"
          id="password"
          name="password"
          required
          type={showPassword ? "text" : "password"}
        />
      </div>
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-foreground" htmlFor="confirmPassword">
          אימות סיסמה
        </label>
        <Input
          autoComplete="new-password"
          id="confirmPassword"
          name="confirmPassword"
          required
          type={showPassword ? "text" : "password"}
        />
      </div>
      <Button onClick={() => setShowPassword((v) => !v)} type="button" variant="outline">
        {showPassword ? "הסתר סיסמה" : "הצג סיסמה"}
      </Button>
      {state?.message ? (
        <p className={`text-sm ${state.success ? "text-emerald-600" : "text-destructive"}`} role="status">
          {state.message}
        </p>
      ) : null}
      <Button className="w-full" disabled={pending} type="submit">
        {pending ? "שומרים…" : "עדכון סיסמה"}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        <Link className="underline underline-offset-4 hover:text-foreground" href="/login">
          חזרה להתחברות
        </Link>
      </p>
    </form>
  );
}
