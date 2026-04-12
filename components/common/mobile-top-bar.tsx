"use client";

import Image from "next/image";
import Link from "next/link";

import { signOut } from "@/actions/auth";
import { NavSideDrawer } from "@/components/common/nav-side-drawer";
import { SettingsGearLink } from "@/components/common/settings-gear-link";
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

const LOGO_ALT = "אלוף הבמה והציוד";

export function MobileTopBar({
  items,
  role,
}: {
  items: NavDrawerItem[];
  role: AppRole | null;
}) {
  const isAdmin = role === "admin";
  const orphanItems = isAdmin ? adminSidebarOrphanNavItems(items) : [];
  const groups = isAdmin
    ? [
        ...ADMIN_SIDEBAR_GROUP_ORDER.map((key) => ({
          title: ADMIN_SIDEBAR_GROUP_LABELS[key],
          items: items.filter((i) => adminSidebarGroupContainsHref(i.href, key)),
        })),
        ...(orphanItems.length > 0
          ? [{ title: ADMIN_SIDEBAR_ORPHAN_GROUP_TITLE, items: orphanItems }]
          : []),
      ].filter((g) => g.items.length > 0)
    : undefined;

  const signOutForm = (
    <form action={signOut} className="w-full">
      <Button className="w-full" type="submit" variant="outline" size="sm">
        התנתקות
      </Button>
    </form>
  );

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-header text-header-foreground backdrop-blur-sm lg:hidden">
      <div className="container-page flex w-full items-center justify-between gap-3 py-2.5">
        <NavSideDrawer items={items} groups={groups} footer={signOutForm} title="תפריט ראשי" />
        <div className="flex items-center gap-2">
          <SettingsGearLink className="h-9 w-9 border-white/25 bg-transparent text-header-foreground hover:bg-white/10 hover:text-header-foreground" />
          <Link
            href="/dashboard"
            className="flex shrink-0 items-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4a373] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--header)]"
          >
            <Image
              src="/brand/logo.png"
              alt={LOGO_ALT}
              width={200}
              height={56}
              className="h-9 w-auto max-w-[min(11rem,50vw)] object-contain object-end"
              priority
            />
          </Link>
        </div>
      </div>
    </header>
  );
}
