"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import { addEmployeeFilesFromForm } from "@/actions/employees";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ActionResult } from "@/types/common";

type Props = {
  employeeId: string;
  category: "documents" | "licenses";
  title: string;
};

export function EmployeeFilesUploadForm({ employeeId, category, title }: Props) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement | null>(null);
  const [state, action, pending] = useActionState(
    addEmployeeFilesFromForm,
    null as ActionResult<{ added: number }> | null,
  );

  useEffect(() => {
    if (state?.success) {
      formRef.current?.reset();
      router.refresh();
    }
  }, [router, state?.success]);

  return (
    <form ref={formRef} action={action} className="space-y-2 rounded-[var(--radius)] border border-border bg-card/60 p-3">
      <p className="text-sm font-medium">{title}</p>
      <input type="hidden" name="employeeId" value={employeeId} />
      <input type="hidden" name="category" value={category} />
      <Input
        name="files"
        type="file"
        multiple
        accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.txt"
      />
      {state ? (
        <p className={`text-xs ${state.success ? "text-emerald-700 dark:text-emerald-400" : "text-destructive"}`}>
          {state.message}
        </p>
      ) : null}
      <div>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "מעלה..." : "העלה קבצים"}
        </Button>
      </div>
    </form>
  );
}
