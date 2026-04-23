"use client";

import { useCallback, useState } from "react";
import { Check, Copy } from "lucide-react";

import { HeaderInfoModal } from "@/components/common/header-info-modal";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface ProjectTrackingLinkPanelProps {
  /** כתובת מלאה לשיתוף (כולל מקור) */
  trackingUrl: string;
}

export function ProjectTrackingLinkPanel({ trackingUrl }: ProjectTrackingLinkPanelProps) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(trackingUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  }, [trackingUrl]);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle>קישור מעקב ללקוח</CardTitle>
          <HeaderInfoModal label="הנחיות קישור מעקב ללקוח">
            <p>דף ציבורי ללא התחברות — סטטוס, תאריכים ויתרה לתשלום. שמרו את הקישור במקום בטוח.</p>
          </HeaderInfoModal>
        </div>
      </CardHeader>
      <CardContent className="flex min-w-0 items-center gap-2">
        <Input readOnly className="min-w-0 font-mono text-xs" dir="ltr" value={trackingUrl} />
        <Button
          aria-label={copied ? "הועתק" : "העתקת קישור"}
          className="shrink-0"
          onClick={copy}
          size="icon"
          type="button"
          variant="outline"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </Button>
      </CardContent>
    </Card>
  );
}
