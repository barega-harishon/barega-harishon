"use client";

import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { useActionState } from "react";
import { useState } from "react";

import { signInWithPassword } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface LoginFormProps {
  nextPath: string;
}

export function LoginForm({ nextPath }: LoginFormProps) {
  const [state, formAction, isPending] = useActionState(signInWithPassword, null);
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);

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
          placeholder="הזינו כתובת דוא״ל"
        />
      </div>
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-foreground" htmlFor="password">
          סיסמה
        </label>
        <div className="relative">
          <Input
            className="pe-11"
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            onKeyUp={(e) => setCapsLockOn(e.getModifierState("CapsLock"))}
            onBlur={() => setCapsLockOn(false)}
          />
          <button
            aria-label={showPassword ? "הסתרת סיסמה" : "הצגת סיסמה"}
            className="absolute end-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => setShowPassword((v) => !v)}
            type="button"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          <Link className="underline underline-offset-4 hover:text-foreground" href="/forgot-password">
            שכחתי סיסמה
          </Link>
        </p>
        {capsLockOn ? (
          <p className="text-xs text-amber-600" role="status">
            שימו לב: Caps Lock פעיל.
          </p>
        ) : null}
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
