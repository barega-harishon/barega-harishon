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
import {
  ADMIN_SIDEBAR_GROUP_LABELS,
  ADMIN_SIDEBAR_GROUP_ORDER,
  ADMIN_SIDEBAR_ORPHAN_GROUP_TITLE,
  adminSidebarGroupContainsHref,
  adminSidebarOrphanNavItems,
} from "@/lib/nav/admin-nav-grouping";
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

export function SiteSidebar({
  items,
  role,
}: {
  items: NavDrawerItem[];
  role: AppRole | null;
}) {
  const pathname = usePathname();
  const isAdmin = role === "admin";
  const orphanNavItems = isAdmin ? adminSidebarOrphanNavItems(items) : [];

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
            {ADMIN_SIDEBAR_GROUP_ORDER.map((groupKey) => {
              const groupItems = items.filter((item) =>
                adminSidebarGroupContainsHref(item.href, groupKey),
              );
              if (groupItems.length === 0) {
                return null;
              }
              const hasActive = groupItems.some((item) => isNavHrefActive(pathname, item.href));
              return (
                <details
                  key={groupKey}
                  className="rounded-md border border-white/10 bg-white/[0.03]"
                  open={hasActive}
                >
                  <summary className="cursor-pointer list-none px-3 py-2 text-sm font-semibold text-header-foreground/95">
                    {ADMIN_SIDEBAR_GROUP_LABELS[groupKey]}
                  </summary>
                  <ul className="flex flex-col gap-0.5 p-1.5 pt-0">
                    {groupItems.map((item) => renderNavItem(item, pathname))}
                  </ul>
                </details>
              );
            })}
            {orphanNavItems.length > 0 ? (
              <details
                className="rounded-md border border-white/10 bg-white/[0.03]"
                open={orphanNavItems.some((item) => isNavHrefActive(pathname, item.href))}
              >
                <summary className="cursor-pointer list-none px-3 py-2 text-sm font-semibold text-header-foreground/95">
                  {ADMIN_SIDEBAR_ORPHAN_GROUP_TITLE}
                </summary>
                <ul className="flex flex-col gap-0.5 p-1.5 pt-0">
                  {orphanNavItems.map((item) => renderNavItem(item, pathname))}
                </ul>
              </details>
            ) : null}
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
