"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/utils/cn";
import type { NavDrawerItem } from "@/lib/nav/nav-types";
import { isNavHrefActive, type NavActiveFn } from "@/utils/nav-active";

export type { NavDrawerItem } from "@/lib/nav/nav-types";

type NavSideDrawerProps = {
  items: NavDrawerItem[];
  groups?: Array<{ title: string; items: NavDrawerItem[] }>;
  /** תוכן תחתון (למשל התנתקות) */
  footer?: React.ReactNode;
  triggerClassName?: string;
  /** תווית לכפתור הפתיחה (נגישות) */
  menuLabel?: string;
  title?: string;
  isItemActive?: NavActiveFn;
};

export function NavSideDrawer({
  items,
  groups,
  footer,
  triggerClassName,
  menuLabel = "פתח תפריט",
  title = "ניווט",
  isItemActive = isNavHrefActive,
}: NavSideDrawerProps) {
  const pathname = usePathname();

  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-header-foreground transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4a373] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--header)] lg:hidden",
            triggerClassName,
          )}
          aria-label={menuLabel}
        >
          <Menu className="h-6 w-6" aria-hidden />
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/55 data-[state=open]:animate-[fade-in_160ms_ease-out]" />
        <Dialog.Content
          className={cn(
            "fixed inset-y-0 start-0 z-50 flex w-[min(20rem,88vw)] flex-col border-e border-border bg-card text-card-foreground shadow-xl outline-none",
            /* ב־RTL: סרגל ב־start (ימין) — אנימציית slide-from-end מתאימה לכניסה מימין */
            "data-[state=open]:animate-[slide-from-end_200ms_ease-out]",
          )}
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <Dialog.Title className="text-base font-semibold tracking-tight">{title}</Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="סגור תפריט"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </Dialog.Close>
          </div>
          <nav aria-label={title} className="min-h-0 flex-1 overflow-y-auto p-3">
            {groups && groups.length > 0 ? (
              <div className="space-y-1.5">
                {groups.map((group) => {
                  const hasActive = group.items.some((item) => isItemActive(pathname, item.href));
                  return (
                    <details key={group.title} className="rounded-md border border-border bg-muted/20" open={hasActive}>
                      <summary className="cursor-pointer list-none px-3 py-2 text-sm font-semibold">{group.title}</summary>
                      <ul className="flex flex-col gap-0.5 p-1.5 pt-0">
                        {group.items.map(({ href, label, dividerBefore }) => {
                          const active = isItemActive(pathname, href);
                          return (
                            <li
                              key={href}
                              className={cn(dividerBefore ? "mt-2 border-t border-border pt-2" : "")}
                            >
                              <Dialog.Close asChild>
                                <Link
                                  href={href}
                                  className={cn(
                                    "block rounded-md px-3 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                    active
                                      ? "bg-primary/15 text-primary"
                                      : "text-foreground hover:bg-muted",
                                  )}
                                >
                                  {label}
                                </Link>
                              </Dialog.Close>
                            </li>
                          );
                        })}
                      </ul>
                    </details>
                  );
                })}
              </div>
            ) : (
              <ul className="flex flex-col gap-0.5">
                {items.map(({ href, label, dividerBefore }) => {
                  const active = isItemActive(pathname, href);
                  return (
                    <li
                      key={href}
                      className={cn(dividerBefore ? "mt-2 border-t border-border pt-2" : "")}
                    >
                      <Dialog.Close asChild>
                        <Link
                          href={href}
                          className={cn(
                            "block rounded-md px-3 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                            active
                              ? "bg-primary/15 text-primary"
                              : "text-foreground hover:bg-muted",
                          )}
                        >
                          {label}
                        </Link>
                      </Dialog.Close>
                    </li>
                  );
                })}
              </ul>
            )}
          </nav>
          {footer ? <div className="border-t border-border p-4">{footer}</div> : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
