"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  sidebarBarNavLinkActiveClassName,
  sidebarBarNavLinkClassName,
} from "@/components/common/nav-link-styles";
import { FIELD_NAV_ITEMS } from "@/components/field/field-nav-items";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/cn";
import { isFieldNavHrefActive } from "@/utils/nav-active";

const LOGO_ALT = "אלוף הבמה והציוד";

export function FieldSidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-header text-header-foreground">
      <div className="shrink-0 border-b border-white/10 p-4">
        <Link
          href="/field"
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
      <nav aria-label="ניווט שטח" className="min-h-0 flex-1 overflow-y-auto p-2">
        <ul className="flex flex-col gap-0.5">
          {FIELD_NAV_ITEMS.map(({ href, label }) => {
            const active = isFieldNavHrefActive(pathname, href);
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
        <Button
          asChild
          variant="outline"
          size="sm"
          className="w-full border-white/25 bg-transparent text-header-foreground hover:bg-white/10 hover:text-header-foreground"
        >
          <Link href="/projects">מערכת מלאה</Link>
        </Button>
      </div>
    </div>
  );
}
