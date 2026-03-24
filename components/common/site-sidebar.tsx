"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { signOut } from "@/actions/auth";
import {
  sidebarBarNavLinkActiveClassName,
  sidebarBarNavLinkClassName,
} from "@/components/common/nav-link-styles";
import { Button } from "@/components/ui/button";
import type { NavDrawerItem } from "@/lib/nav/nav-types";
import type { AppRole } from "@/types/app-role";
import { cn } from "@/utils/cn";
import { isNavHrefActive } from "@/utils/nav-active";

const LOGO_ALT = "אלוף הבמה והציוד";

function renderNavItem(item: NavDrawerItem, pathname: string) {
  const active = isNavHrefActive(pathname, item.href);
  return (
    <li key={item.href} className={cn(item.dividerBefore ? "mt-2 border-t border-white/12 pt-2" : "")}>
      <Link
        href={item.href}
        className={cn(
          sidebarBarNavLinkClassName,
          sidebarBarNavLinkActiveClassName(active),
        )}
      >
        {item.label}
      </Link>
    </li>
  );
}

function isInGroup(href: string, key: string) {
  if (key === "core") return href === "/dashboard" || href === "/projects/go" || href === "/projects" || href === "/projects/calendar" || href === "/projects/kanban";
  if (key === "quick") return href === "/projects/new";
  if (key === "ops") return href === "/clients" || href === "/equipment" || href === "/employees" || href === "/trucks";
  if (key === "field") return href === "/field";
  if (key === "finance") return href === "/collections" || href === "/reports";
  if (key === "system") return href === "/settings";
  return false;
}

export function SiteSidebar({
  items,
  role,
}: {
  items: NavDrawerItem[];
  role: AppRole | null;
}) {
  const pathname = usePathname();
  const isAdmin = role === "admin";

  const adminGroups = [
    { key: "core", title: "ליבה" },
    { key: "quick", title: "פעולות מהירות" },
    { key: "ops", title: "תפעול" },
    { key: "field", title: "שטח" },
    { key: "finance", title: "כספים" },
    { key: "system", title: "מערכת" },
  ] as const;

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-header text-header-foreground">
      <div className="shrink-0 border-b border-white/10 p-4">
        <Link
          href="/dashboard"
          className="inline-flex rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4a373] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--header)]"
        >
          <Image
            src="/brand/logo.png"
            alt={LOGO_ALT}
            width={200}
            height={56}
            className="h-10 w-auto max-w-full object-contain object-start"
          />
        </Link>
      </div>
      <nav aria-label="ניווט ראשי" className="min-h-0 flex-1 overflow-y-auto p-2">
        {isAdmin ? (
          <div className="space-y-1.5">
            {adminGroups.map((group) => {
              const groupItems = items.filter((item) => isInGroup(item.href, group.key));
              if (groupItems.length === 0) {
                return null;
              }
              const hasActive = groupItems.some((item) => isNavHrefActive(pathname, item.href));
              return (
                <details
                  key={group.key}
                  className="rounded-md border border-white/10 bg-white/[0.03]"
                  open={hasActive}
                >
                  <summary className="cursor-pointer list-none px-3 py-2 text-sm font-semibold text-header-foreground/95">
                    {group.title}
                  </summary>
                  <ul className="flex flex-col gap-0.5 p-1.5 pt-0">
                    {groupItems.map((item) => renderNavItem(item, pathname))}
                  </ul>
                </details>
              );
            })}
          </div>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {items.map((item) => renderNavItem(item, pathname))}
          </ul>
        )}
      </nav>
      <div className="shrink-0 border-t border-white/10 p-3">
        <form action={signOut} className="w-full">
          <Button
            type="submit"
            variant="outline"
            size="sm"
            className="w-full border-white/25 bg-transparent text-header-foreground hover:bg-white/10 hover:text-header-foreground"
          >
            התנתקות
          </Button>
        </form>
      </div>
    </div>
  );
}
