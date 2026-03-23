"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { createEquipmentFromForm } from "@/actions/equipment-catalog";
import { EquipmentFormFields } from "@/components/equipment/equipment-form-fields";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function NewEquipmentForm() {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(createEquipmentFromForm, null);

  useEffect(() => {
    if (state?.success) {
      router.refresh();
    }
  }, [state, router]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>הוספת פריט למלאי</CardTitle>
        <CardDescription>פרטים בסיסיים לקטלוג ההשכרות.</CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent>
          <EquipmentFormFields />
          {state && !state.success ? (
            <p className="mt-4 text-sm text-destructive">{state.message}</p>
          ) : null}
          {state?.success ? (
            <p className="mt-4 text-sm text-emerald-700 dark:text-emerald-400">
              {state.message}
            </p>
          ) : null}
        </CardContent>
        <CardFooter className="justify-end">
          <Button disabled={isPending} type="submit">
            {isPending ? "שומרים…" : "שמירת פריט"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
