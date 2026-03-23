"use client";

import Image from "next/image";
import Link from "next/link";

import { NavSideDrawer } from "@/components/common/nav-side-drawer";
import { FIELD_NAV_ITEMS } from "@/components/field/field-nav-items";
import { Button } from "@/components/ui/button";
import { isFieldNavHrefActive } from "@/utils/nav-active";

const LOGO_ALT = "אלוף הבמה והציוד";

export function FieldMobileTopBar() {
  const fullSystemFooter = (
    <Button asChild variant="outline" className="w-full" size="sm">
      <Link href="/projects">מערכת מלאה</Link>
    </Button>
  );

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-header text-header-foreground backdrop-blur-sm lg:hidden">
      <div className="container-page flex w-full items-center justify-between gap-3 py-2.5">
        <Link
          href="/field"
          className="flex shrink-0 items-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4a373] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--header)]"
        >
          <Image
            src="/brand/logo.png"
            alt={LOGO_ALT}
            width={200}
            height={56}
            className="h-9 w-auto max-w-[min(11rem,50vw)] object-contain object-start"
            priority
          />
        </Link>
        <NavSideDrawer
          items={FIELD_NAV_ITEMS}
          isItemActive={isFieldNavHrefActive}
          title="אזור שטח"
          footer={fullSystemFooter}
        />
      </div>
    </header>
  );
}
