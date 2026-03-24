"use client";

import Link from "next/link";
import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";

export function PublicInquiryLinkPanel() {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/pniha`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  }, []);

  return (
    <div className="mb-6 rounded-[var(--radius)] border border-border bg-card p-4 text-sm">
      <p className="font-medium">קישור לטופס פתיחת הזמנה ללקוח</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <code className="rounded bg-muted px-2 py-1" dir="ltr">
          /pniha
        </code>
        <Button onClick={copy} type="button" variant="outline">
          {copied ? "הועתק" : "העתקת קישור מלא"}
        </Button>
        <Button asChild variant="ghost">
          <Link href="/pniha" target="_blank">
            פתיחה בחלון חדש
          </Link>
        </Button>
      </div>
    </div>
  );
}
