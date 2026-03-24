"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { createEmployeeFromForm } from "@/actions/employees";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ActionResult } from "@/types/common";
import { EMPLOYEE_TYPE_LABELS, type EmployeeType } from "@/types/employees";

const selectClassName =
  "flex h-10 w-full rounded-[var(--radius)] border border-border bg-input px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const TYPES: EmployeeType[] = ["fixed", "hourly", "agency"];

export function NewEmployeeForm() {
  const router = useRouter();
  const [state, action, pending] = useActionState(
    createEmployeeFromForm,
    null as ActionResult<{ id: string }> | null,
  );

  useEffect(() => {
    if (state?.success) {
      router.refresh();
    }
  }, [state, router]);

  return (
    <form
      action={action}
      className="space-y-8 rounded-[var(--radius)] border border-border bg-muted/20 p-5 sm:p-6"
    >
      <div>
        <h2 className="text-lg font-semibold tracking-tight">הוספת חבר צוות</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          הנתונים נשמרים ב־Supabase; צפייה ועריכה לפי תפקיד (משרד / תפעול / אדמין). אפשר
          למלא בהדרגה — שדות ריקים לא נשמרים.
        </p>
      </div>

      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-foreground">שיבוץ ותשלום</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-sm font-medium" htmlFor="emp-name">
              שם מלא <span className="text-destructive">*</span>
            </label>
            <Input id="emp-name" name="name" required type="text" autoComplete="name" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="emp-type">
              סוג העסקה
            </label>
            <select className={selectClassName} defaultValue="hourly" id="emp-type" name="type" required>
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {EMPLOYEE_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="emp-rate">
              תעריף שעתי (₪, לפי שעה בלבד)
            </label>
            <Input id="emp-rate" min={0} name="hourlyRate" step="0.01" type="number" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-sm font-medium" htmlFor="emp-note">
              הערת זמינות
            </label>
            <Input id="emp-note" maxLength={500} name="availabilityNote" type="text" />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-foreground">פרטים אישיים</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="emp-phone">
              טלפון
            </label>
            <Input id="emp-phone" name="phone" type="tel" autoComplete="tel" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="emp-email">
              דוא״ל
            </label>
            <Input id="emp-email" name="email" type="email" autoComplete="email" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-sm font-medium" htmlFor="emp-national-id">
              תעודת זהות / מזהה
            </label>
            <Input id="emp-national-id" name="nationalId" maxLength={20} type="text" />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-foreground">פרטי חשבון בנק</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-sm font-medium" htmlFor="emp-bank-holder">
              שם בעל החשבון
            </label>
            <Input id="emp-bank-holder" name="bankAccountHolder" type="text" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="emp-bank-name">
              שם בנק
            </label>
            <Input id="emp-bank-name" name="bankName" type="text" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="emp-bank-branch">
              סניף
            </label>
            <Input id="emp-bank-branch" name="bankBranch" type="text" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-sm font-medium" htmlFor="emp-bank-account">
              מספר חשבון
            </label>
            <Input id="emp-bank-account" name="bankAccountNumber" type="text" autoComplete="off" />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-foreground">מסמכים ורשיונות</h3>
        <p className="text-xs text-muted-foreground">
          ניתן לתאר מסמכים קיימים, מספרי רשיון או הערות; העלאת קבצים — בהמשך דרך אחסון מאובטח.
        </p>
        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="emp-docs">
            מסמכים והערות
          </label>
          <Textarea id="emp-docs" name="documentsNotes" rows={4} placeholder="למשל: חוזה, ביטוח, תעודות…" />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="emp-licenses">
            רשיונות
          </label>
          <Textarea id="emp-licenses" name="licensesNotes" rows={3} placeholder="למשל: רישיון נהיגה, הרשאות עבודה בגובה…" />
        </div>
      </section>

      {state && !state.success ? (
        <p className="text-sm text-destructive">{state.message}</p>
      ) : null}
      {state?.success ? (
        <p className="text-sm text-emerald-700 dark:text-emerald-400">{state.message}</p>
      ) : null}
      <div className="flex justify-end border-t border-border pt-4">
        <Button disabled={pending} type="submit" size="lg">
          {pending ? "שומרים…" : "שמירה והוספה לצוות"}
        </Button>
      </div>
    </form>
  );
}
