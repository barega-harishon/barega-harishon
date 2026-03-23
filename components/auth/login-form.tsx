"use client";

import { useActionState } from "react";

import { signInWithPassword } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface LoginFormProps {
  nextPath: string;
}

export function LoginForm({ nextPath }: LoginFormProps) {
  const [state, formAction, isPending] = useActionState(signInWithPassword, null);

  return (
    <form action={formAction} className="space-y-4">
      <input name="next" type="hidden" value={nextPath} />
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-foreground" htmlFor="email">
          דוא״ל
        </label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
        />
      </div>
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-foreground" htmlFor="password">
          סיסמה
        </label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>
      {state?.message ? (
        <p className="text-sm text-destructive" role="alert">
          {state.message}
        </p>
      ) : null}
      <Button className="w-full" disabled={isPending} type="submit">
        {isPending ? "מתחברים…" : "התחברות"}
      </Button>
    </form>
  );
}
