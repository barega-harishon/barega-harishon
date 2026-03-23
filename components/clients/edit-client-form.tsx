"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { updateClientFromForm } from "@/actions/clients";
import type { ActionResult } from "@/types/common";
import type { ClientDetailRow } from "@/types/clients";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface EditClientFormProps {
  client: ClientDetailRow;
}

export function EditClientForm({ client }: EditClientFormProps) {
  const router = useRouter();
  const [state, action, pending] = useActionState(
    updateClientFromForm,
    null as ActionResult<{ id: string }> | null,
  );

  useEffect(() => {
    if (state?.success) {
      router.refresh();
    }
  }, [state, router]);

  return (
    <form action={action} className="space-y-4">
      <input name="id" type="hidden" value={client.id} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <label className="text-sm font-medium" htmlFor="clientName">
            שם
          </label>
          <Input defaultValue={client.name} id="clientName" name="name" required type="text" />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="clientPhone">
            טלפון
          </label>
          <Input defaultValue={client.phone ?? ""} id="clientPhone" name="phone" type="text" />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="clientEmail">
            דוא״ל
          </label>
          <Input defaultValue={client.email ?? ""} id="clientEmail" name="email" type="email" />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <label className="text-sm font-medium" htmlFor="clientAddress">
            כתובת
          </label>
          <Textarea defaultValue={client.address ?? ""} id="clientAddress" name="address" rows={2} />
        </div>
      </div>
      {state && !state.success ? (
        <p className="text-sm text-destructive" role="alert">
          {state.message}
        </p>
      ) : null}
      {state?.success ? (
        <p className="text-sm text-emerald-700 dark:text-emerald-400">{state.message}</p>
      ) : null}
      <div className="flex justify-end">
        <Button disabled={pending} type="submit">
          {pending ? "שומרים…" : "שמירה"}
        </Button>
      </div>
    </form>
  );
}
