import Link from "next/link";

import { DateStyleToggle } from "@/components/common/date-style-toggle";
import { MotionToggle } from "@/components/common/motion-toggle";
import { ProjectsDefaultViewToggle } from "@/components/common/projects-default-view-toggle";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { Button } from "@/components/ui/button";
import { getDateStylePreference } from "@/lib/date-style-server";
import {
  getMotionPreference,
  getProjectsDefaultViewPreference,
  getThemePreference,
} from "@/lib/ui-preferences-server";
import { formatDateTimeHe, formatHebrewDateTimeWithLetters } from "@/utils/date";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [dateStyle, motion, projectsDefaultView, theme] = await Promise.all([
    getDateStylePreference(),
    getMotionPreference(),
    getProjectsDefaultViewPreference(),
    getThemePreference(),
  ]);
  const sample = new Date().toISOString();

  return (
    <main className="container-page py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">הגדרות</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            העדפות תצוגה אישיות למערכת.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard">חזרה לדשבורד</Link>
        </Button>
      </div>

      <section className="max-w-xl space-y-4 rounded-[var(--radius)] border border-border bg-card p-4">
        <h2 className="text-base font-semibold">פורמט תאריך</h2>
        <DateStyleToggle currentStyle={dateStyle} />
        <div className="rounded-md border border-border bg-muted/20 p-3 text-sm">
          <p className="font-medium">תצוגה נוכחית לדוגמה</p>
          <p className="mt-1 text-muted-foreground">
            {dateStyle === "short"
              ? formatDateTimeHe(sample)
              : formatHebrewDateTimeWithLetters(sample)}
          </p>
        </div>
      </section>

      <section className="mt-4 max-w-xl space-y-4 rounded-[var(--radius)] border border-border bg-card p-4">
        <h2 className="text-base font-semibold">מצב יום / לילה</h2>
        <ThemeToggle current={theme} />
      </section>

      <section className="mt-4 max-w-xl space-y-4 rounded-[var(--radius)] border border-border bg-card p-4">
        <h2 className="text-base font-semibold">תנועה ואנימציות</h2>
        <MotionToggle current={motion} />
      </section>

      <section className="mt-4 max-w-xl space-y-4 rounded-[var(--radius)] border border-border bg-card p-4">
        <h2 className="text-base font-semibold">פתיחת פרויקטים</h2>
        <ProjectsDefaultViewToggle current={projectsDefaultView} />
      </section>
    </main>
  );
}
