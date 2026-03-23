"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { updateEquipmentFromForm } from "@/actions/equipment-catalog";
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
import type { EquipmentRow } from "@/types/equipment-catalog";
import { formatCurrencyIl } from "@/utils/money";

interface EditEquipmentFormProps {
  equipment: EquipmentRow;
}

export function EditEquipmentForm({ equipment }: EditEquipmentFormProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(updateEquipmentFromForm, null);

  useEffect(() => {
    if (state?.success) {
      router.refresh();
    }
  }, [state, router]);

  const rentNum =
    typeof equipment.rent_price === "string"
      ? Number.parseFloat(equipment.rent_price)
      : Number(equipment.rent_price);

  return (
    <Card>
      <CardHeader>
        <CardTitle>עריכת פריט</CardTitle>
        <CardDescription>
          מחיר נוכחי לתצוגה: {formatCurrencyIl(equipment.rent_price)}
        </CardDescription>
      </CardHeader>
      <form action={formAction}>
        <input name="id" type="hidden" value={equipment.id} />
        <CardContent>
          <EquipmentFormFields
            defaultValues={{
              name: equipment.name,
              category: equipment.category,
              totalQty: equipment.total_qty,
              rentPrice: Number.isNaN(rentNum) ? 0 : rentNum,
              warehouseLocation: equipment.warehouse_location ?? "",
            }}
          />
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
            {isPending ? "שומרים…" : "עדכון פריט"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
