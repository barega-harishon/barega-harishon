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
import { cn } from "@/utils/cn";
import { isNavHrefActive } from "@/utils/nav-active";

const LOGO_ALT = "אלוף הבמה והציוד";

export function SiteSidebar({ items }: { items: NavDrawerItem[] }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-header text-header-foreground">
      <div className="shrink-0 border-b border-white/10 p-4">
        <Link
          href="/"
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
        <ul className="flex flex-col gap-0.5">
          {items.map(({ href, label }) => {
            const active = isNavHrefActive(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    sidebarBarNavLinkClassName,
                    sidebarBarNavLinkActiveClassName(active),
                  )}
                >
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
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
