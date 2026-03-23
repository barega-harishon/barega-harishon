"use client";

import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
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
        <CardTitle>קישור מעקב ללקוח</CardTitle>
        <CardDescription>
          דף ציבורי ללא התחברות — סטטוס, תאריכים ויתרה לתשלום. שמרו את הקישור במקום בטוח.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input readOnly className="font-mono text-xs sm:flex-1" dir="ltr" value={trackingUrl} />
        <Button className="shrink-0" onClick={copy} type="button" variant="outline">
          {copied ? "הועתק" : "העתקה"}
        </Button>
      </CardContent>
    </Card>
  );
}
