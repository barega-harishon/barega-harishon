"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { deleteTruck } from "@/actions/trucks";
import { Button } from "@/components/ui/button";

interface DeleteTruckButtonProps {
  truckId: string;
  licensePlate: string;
}

export function DeleteTruckButton({ truckId, licensePlate }: DeleteTruckButtonProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleClick() {
    if (!window.confirm(`למחוק את המשאית ${licensePlate} מהמערכת?`)) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await deleteTruck({ id: truckId });
      if (result.success) {
        router.push("/trucks");
        router.refresh();
        return;
      }
      setError(result.message);
    });
  }

  return (
    <div className="space-y-2 border-t border-border pt-6">
      <h3 className="text-sm font-semibold text-destructive">אזור מסוכן</h3>
      <p className="text-sm text-muted-foreground">מחיקת משאית זמינה רק למנהל מערכת.</p>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <Button disabled={pending} onClick={handleClick} type="button" variant="destructive">
        {pending ? "מוחקים…" : "מחיקת משאית"}
      </Button>
    </div>
  );
}
