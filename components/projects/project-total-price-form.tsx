"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { updateProjectTotalPriceFromForm } from "@/actions/projects";
import type { ActionResult } from "@/types/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ProjectTotalPriceFormProps {
  projectId: string;
  initialTotalPrice: string | number | null;
}

export function ProjectTotalPriceForm({ projectId, initialTotalPrice }: ProjectTotalPriceFormProps) {
  const router = useRouter();
  const initialNum =
    initialTotalPrice === null || initialTotalPrice === undefined || initialTotalPrice === ""
      ? 0
      : Number(initialTotalPrice);

  const [state, action, pending] = useActionState(
    updateProjectTotalPriceFromForm,
    null as ActionResult<{ total_price: number }> | null,
  );

  useEffect(() => {
    if (state?.success) {
      router.refresh();
    }
  }, [state, router]);

  return (
    <form action={action} className="space-y-3 rounded-[var(--radius)] border border-border bg-muted/20 p-4">
      <input name="projectId" type="hidden" value={projectId} />
      <div className="space-y-1.5">
        <label className="text-sm font-medium" htmlFor="totalPrice">
          עדכון סכום כולל (הצעה / חוזה)
        </label>
        <Input
          defaultValue={Number.isNaN(initialNum) ? 0 : initialNum}
          id="totalPrice"
          min={0}
          name="totalPrice"
          step="0.01"
          type="number"
        />
      </div>
      {state && !state.success ? (
        <p className="text-sm text-destructive" role="alert">
          {state.message}
        </p>
      ) : null}
      {state?.success ? (
        <p className="text-sm text-emerald-700 dark:text-emerald-400">{state.message}</p>
      ) : null}
      <Button disabled={pending} size="sm" type="submit" variant="outline">
        {pending ? "שומרים…" : "שמירת סכום"}
      </Button>
    </form>
  );
}
