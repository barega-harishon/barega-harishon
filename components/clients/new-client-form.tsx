"use client";

import Link from "next/link";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { createClientFromForm } from "@/actions/clients";
import type { ActionResult } from "@/types/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function NewClientForm() {
  const router = useRouter();
  const [state, action, pending] = useActionState(
    createClientFromForm,
    null as ActionResult<{ id: string; name: string }> | null,
  );

  useEffect(() => {
    if (state?.success && state.data?.id) {
      router.push(`/clients/${state.data.id}`);
    }
  }, [state, router]);

  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <label className="text-sm font-medium" htmlFor="new-client-name">
            שם לקוח
          </label>
          <Input
            id="new-client-name"
            name="name"
            placeholder="שם חברה / איש קשר"
            required
            type="text"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="new-client-phone">
            טלפון
          </label>
          <Input id="new-client-phone" name="phone" type="text" />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="new-client-email">
            דוא״ל
          </label>
          <Input id="new-client-email" name="email" type="email" />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <label className="text-sm font-medium" htmlFor="new-client-address">
            כתובת
          </label>
          <Textarea id="new-client-address" name="address" rows={2} />
        </div>
      </div>
      {state && !state.success ? (
        <p className="text-sm text-destructive" role="alert">
          {state.message}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-3">
        <Button disabled={pending} type="submit">
          {pending ? "שומרים…" : "יצירת לקוח"}
        </Button>
        <Button asChild disabled={pending} type="button" variant="outline">
          <Link href="/clients">ביטול</Link>
        </Button>
      </div>
    </form>
  );
}
