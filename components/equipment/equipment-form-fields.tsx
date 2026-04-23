import { EQUIPMENT_PREDEFINED_CATEGORIES } from "@/lib/equipment/equipment-categories";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const selectClassName =
  "flex h-10 w-full rounded-[var(--radius)] border border-border bg-input px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

interface EquipmentFormFieldsProps {
  defaultValues?: {
    name: string;
    category: string;
    totalQty: number;
    rentPrice: string | number;
    warehouseLocation: string;
  };
}

export function EquipmentFormFields({ defaultValues }: EquipmentFormFieldsProps) {
  const rent =
    typeof defaultValues?.rentPrice === "number"
      ? defaultValues.rentPrice
      : defaultValues?.rentPrice
        ? Number.parseFloat(String(defaultValues.rentPrice))
        : "";

  const currentCat = defaultValues?.category?.trim() ?? "";
  const legacyCategory =
    currentCat !== "" &&
    !(EQUIPMENT_PREDEFINED_CATEGORIES as readonly string[]).includes(currentCat)
      ? currentCat
      : null;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-1.5 sm:col-span-2">
        <label className="text-sm font-medium" htmlFor="name">
          שם פריט
        </label>
        <Input
          defaultValue={defaultValues?.name ?? ""}
          id="name"
          name="name"
          required
          placeholder="למשל כיסא פלסטיק"
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium" htmlFor="category">
          קטגוריה
        </label>
        <select className={selectClassName} defaultValue={currentCat} id="category" name="category">
          <option value="">ללא קטגוריה</option>
          {EQUIPMENT_PREDEFINED_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
          {legacyCategory ? (
            <option value={legacyCategory}>
              {legacyCategory} (קטגוריה קיימת — בחרו &quot;אחר&quot; אם צריך לאחד)
            </option>
          ) : null}
        </select>
        <p className="text-xs text-muted-foreground">אפשר לבחור מהרשימה או להגדיר קטגוריה חדשה בשדה הבא.</p>
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium" htmlFor="newCategory">
          קטגוריה חדשה (אופציונלי)
        </label>
        <Input
          id="newCategory"
          name="newCategory"
          placeholder="לדוגמה: מחסומים"
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium" htmlFor="totalQty">
          כמות במלאי
        </label>
        <Input
          defaultValue={defaultValues?.totalQty ?? 0}
          id="totalQty"
          min={0}
          name="totalQty"
          required
          type="number"
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium" htmlFor="rentPrice">
          מחיר השכרה (יחידה)
        </label>
        <Input
          defaultValue={rent === "" ? "" : rent}
          id="rentPrice"
          min={0}
          name="rentPrice"
          required
          step="0.01"
          type="number"
        />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <label className="text-sm font-medium" htmlFor="warehouseLocation">
          מיקום במחסן
        </label>
        <Textarea
          className="min-h-[72px]"
          defaultValue={defaultValues?.warehouseLocation ?? ""}
          id="warehouseLocation"
          name="warehouseLocation"
          placeholder="מדף / אזור"
        />
      </div>
    </div>
  );
}
