import Link from "next/link";

import { EQUIPMENT_UNCATEGORIZED } from "@/lib/equipment/catalog-constants";
import { cn } from "@/utils/cn";

interface EquipmentCategoryFilterProps {
  categories: string[];
  hasUncategorized: boolean;
  /** ערך הפרמטר `cat` ב-URL כרגע (או null = הכל) */
  activeCat: string | null;
}

function hrefFor(cat: string | null): string {
  if (cat === null) {
    return "/equipment";
  }
  const enc = encodeURIComponent(cat);
  return `/equipment?cat=${enc}`;
}

export function EquipmentCategoryFilter({
  categories,
  hasUncategorized,
  activeCat,
}: EquipmentCategoryFilterProps) {
  const showBar = categories.length > 0 || hasUncategorized;
  if (!showBar) {
    return null;
  }

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
      <span className="text-muted-foreground">סינון לפי קטגוריה:</span>
      <Link
        className={cn(
          "rounded-md border px-3 py-1.5 font-medium transition-colors",
          activeCat === null
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border bg-card text-foreground hover:bg-muted",
        )}
        href={hrefFor(null)}
      >
        הכל
      </Link>
      {hasUncategorized ? (
        <Link
          className={cn(
            "rounded-md border px-3 py-1.5 font-medium transition-colors",
            activeCat === EQUIPMENT_UNCATEGORIZED
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-card text-foreground hover:bg-muted",
          )}
          href={hrefFor(EQUIPMENT_UNCATEGORIZED)}
        >
          ללא קטגוריה
        </Link>
      ) : null}
      {categories.map((c) => (
        <Link
          className={cn(
            "rounded-md border px-3 py-1.5 font-medium transition-colors",
            activeCat === c
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-card text-foreground hover:bg-muted",
          )}
          href={hrefFor(c)}
          key={c}
        >
          {c}
        </Link>
      ))}
    </div>
  );
}
