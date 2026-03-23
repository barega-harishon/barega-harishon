import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

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
        <Input
          defaultValue={defaultValues?.category ?? ""}
          id="category"
          name="category"
          placeholder="כיסאות / במות"
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
