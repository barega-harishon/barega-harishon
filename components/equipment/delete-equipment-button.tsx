"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { deleteEquipment } from "@/actions/equipment-catalog";
import { Button } from "@/components/ui/button";

interface DeleteEquipmentButtonProps {
  equipmentId: string;
  equipmentName: string;
}

export function DeleteEquipmentButton({ equipmentId, equipmentName }: DeleteEquipmentButtonProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleClick() {
    const ok = window.confirm(
      `למחוק את "${equipmentName}" מהקטלוג?\nפעולה זו אינה הפיכה. אם הפריט משובץ בפרויקט, המחיקה תיחסם.`,
    );
    if (!ok) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await deleteEquipment({ id: equipmentId });
      if (result.success) {
        router.push("/equipment");
        router.refresh();
        return;
      }
      setError(result.message);
    });
  }

  return (
    <div className="space-y-2 border-t border-border pt-6">
      <h3 className="text-sm font-semibold text-destructive">אזור מסוכן</h3>
      <p className="text-sm text-muted-foreground">
        מחיקת פריט זמינה רק למנהל מערכת. לא ניתן למחוק פריט שמופיע בפרויקטים.
      </p>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <Button disabled={pending} onClick={handleClick} type="button" variant="destructive">
        {pending ? "מוחקים…" : "מחיקת פריט מהקטלוג"}
      </Button>
    </div>
  );
}
