import type { ReactNode } from "react";
import { Boxes, ChevronDown } from "lucide-react";

interface EquipmentCategoryAccordionGroup {
  key: string;
  label: string;
  count: number;
  content: ReactNode;
}

interface EquipmentCategoryAccordionProps {
  groups: EquipmentCategoryAccordionGroup[];
  emptyMessage?: string;
  headerContent?: ReactNode;
  stickyGroupHeaders?: boolean;
  defaultOpenFirst?: boolean;
}

export function EquipmentCategoryAccordion({
  groups,
  emptyMessage = "אין פריטים להצגה.",
  headerContent,
  stickyGroupHeaders = false,
  defaultOpenFirst = false,
}: EquipmentCategoryAccordionProps) {
  if (groups.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <div className="space-y-2">
      {headerContent}
      {groups.map((group, index) => (
        <details
          className="group rounded-[var(--radius)] border border-border bg-card"
          open={defaultOpenFirst && index === 0}
          key={group.key}
        >
          <summary
            className={[
              "flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-sm font-medium transition-colors hover:bg-muted/40 [&::-webkit-details-marker]:hidden",
              stickyGroupHeaders ? "sticky start-0 z-10 bg-card" : "",
            ].join(" ")}
          >
            <span className="inline-flex items-center gap-2">
              <Boxes className="h-4 w-4 text-muted-foreground" />
              <span className="truncate">{group.label}</span>
              <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                {group.count}
              </span>
            </span>
            <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
          </summary>
          <div className="border-t border-border px-4 py-3">{group.content}</div>
        </details>
      ))}
    </div>
  );
}
