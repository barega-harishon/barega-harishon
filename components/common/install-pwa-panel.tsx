"use client";

import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

/** Chrome/Edge — אירוע התקנה לפני הצגת ברירת המחדל של הדפדפן */
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function detectIOS(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

function detectStandalone(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  if (window.matchMedia("(display-mode: standalone)").matches) {
    return true;
  }
  return Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
}

/**
 * כפתור התקנת PWA + הנחיות ל־iOS / דפדפנים בלי beforeinstallprompt.
 */
export function InstallPwaPanel() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [busy, setBusy] = useState(false);
  const [showFallbackHelp, setShowFallbackHelp] = useState(false);
  const [standalone, setStandalone] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    setStandalone(detectStandalone());
    setIos(detectIOS());
  }, []);

  useEffect(() => {
    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setShowFallbackHelp(false);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  }, []);

  const runInstallPrompt = useCallback(async () => {
    if (!deferred) {
      return;
    }
    setBusy(true);
    try {
      await deferred.prompt();
      await deferred.userChoice;
    } finally {
      setDeferred(null);
      setBusy(false);
    }
  }, [deferred]);

  const handleMainClick = useCallback(() => {
    if (deferred) {
      void runInstallPrompt();
      return;
    }
    setShowFallbackHelp((v) => !v);
  }, [deferred, runInstallPrompt]);

  if (standalone) {
    return (
      <p className="text-center text-xs text-muted-foreground">
        האפליקציה כבר מותקנת ופועלת במצב עצמאי.
      </p>
    );
  }

  return (
    <div className="rounded-[var(--radius)] border border-border bg-muted/20 p-4 text-sm">
      <p className="mb-3 text-center font-medium text-foreground">התקנה על המכשיר</p>
      <p className="mb-3 text-center text-xs text-muted-foreground">
        התקינו קיצור דרך למסך הבית — בלי חנות אפליקציות. מתאים לטלפון ולמחשב.
      </p>

      {ios ? (
        <div className="space-y-3 text-xs leading-relaxed text-muted-foreground">
          <p className="text-center">
            <strong className="text-foreground">ב־Safari (אייפון / אייפד):</strong>
            <br />
            הקישו על <strong className="text-foreground">שיתוף</strong> (תחתית המסך או ליד שורת
            הכתובת) ← בחרו <strong className="text-foreground">&quot;הוסף למסך הבית&quot;</strong>.
          </p>
          <p className="text-center text-[11px]">
            ב־Chrome ל־iOS ההתקנה דרך אותו תפריט שיתוף של המערכת.
          </p>
        </div>
      ) : (
        <>
          <div className="flex justify-center">
            <Button
              className="w-full max-w-xs"
              disabled={busy}
              onClick={handleMainClick}
              type="button"
              variant="outline"
            >
              {busy
                ? "פותחים התקנה…"
                : deferred
                  ? "הורדה והתקנת האפליקציה"
                  : "הוראות התקנה"}
            </Button>
          </div>
          {deferred ? (
            <p className="mt-2 text-center text-[11px] text-muted-foreground">
              ייפתח חלון של הדפדפן לאישור ההתקנה.
            </p>
          ) : null}
          {showFallbackHelp && !deferred ? (
            <div className="mt-3 rounded-md border border-dashed border-border bg-card p-3 text-[11px] leading-relaxed text-muted-foreground">
              <p className="mb-2 font-medium text-foreground">אם לא הופיעה התקנה אוטומטית:</p>
              <ul className="list-inside list-disc space-y-1 text-start">
                <li>
                  <strong className="text-foreground">Chrome / Edge:</strong> תפריט (⋮ או⋯) ← &quot;התקן
                  אפליקציה&quot; או &quot;יישום&quot; / <span dir="ltr">Install app</span>.
                </li>
                <li>
                  <strong className="text-foreground">Firefox:</strong> לעיתים אין התקנה כ־PWA — השתמשו
                  ב־Chrome לשמירה למסך הבית.
                </li>
              </ul>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
