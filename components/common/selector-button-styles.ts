import { cn } from "@/utils/cn";

/**
 * Visual style for "screen/state selector" buttons (tabs/chips).
 */
export function selectorButtonClass(active: boolean): string {
  return cn(
    "rounded-full border px-4 shadow-sm transition-all duration-200",
    "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    active
      ? "border-[#b07d4f]/70 bg-gradient-to-l from-[#8d623f] via-[#c29160] to-[#f2c9a7] text-[#2b1a0d] hover:opacity-95 dark:border-[#d4a373]/60 dark:from-[#7d5536] dark:via-[#b88757] dark:to-[#e2b691] dark:text-[#1f130a]"
      : "border-border/90 bg-card/85 text-foreground hover:border-[#d4a373]/45 hover:bg-muted/60",
  );
}
