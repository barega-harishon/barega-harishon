import Link from "next/link";

import { listMyAssignedProjectsBrief } from "@/actions/projects";
import { HeaderInfoModal } from "@/components/common/header-info-modal";
import { InstallPwaPanel } from "@/components/common/install-pwa-panel";
import { selectorButtonClass } from "@/components/common/selector-button-styles";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCurrentAppRoles } from "@/lib/auth/current-profile";
import { APP_ROLE_LABELS_HE } from "@/types/app-role";
import { PROJECT_STATUS_LABELS } from "@/types/projects";

export const dynamic = "force-dynamic";

export default async function FieldHomePage() {
  const roles = await getCurrentAppRoles();
  const projects = await listMyAssignedProjectsBrief();
  const showNonFieldRoleNote = roles.some((r) => r !== "field");
  const roleLabelsHe = roles.map((r) => APP_ROLE_LABELS_HE[r]).join(" · ");

  return (
    <main className="container-page space-y-6 py-6">
      <div className="page-intro">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">שלום</h1>
          <HeaderInfoModal label="הנחיות אזור שטח">
            <p>כאן מרוכזים הפרויקטים שלכם, יומן אישי ודיווח שעות — מותאם לנייד ול־PWA.</p>
          </HeaderInfoModal>
        </div>
        {showNonFieldRoleNote ? (
          <p className="mt-2 text-xs text-amber-800 dark:text-amber-200">
            אתם מחוברים עם התפקידים: {roleLabelsHe}. איזור השטח מיועד בעיקר לצוות משובץ; ניתן להמשיך גם
            כך.
          </p>
        ) : null}
      </div>

      <InstallPwaPanel />

      <div className="grid gap-3 rounded-[var(--radius)] border border-border/70 bg-card/60 p-2 sm:grid-cols-2">
        <Button
          asChild
          className={`${selectorButtonClass(true)} h-auto min-h-14 flex-col py-3`}
          size="lg"
          variant="outline"
        >
          <Link href="/field/time">דיווח שעות</Link>
        </Button>
        <Button
          asChild
          className={`${selectorButtonClass(false)} h-auto min-h-14 flex-col py-3`}
          size="lg"
          variant="outline"
        >
          <Link href="/field/calendar">היומן שלי</Link>
        </Button>
        <Button
          asChild
          className={`${selectorButtonClass(false)} h-auto min-h-14 flex-col py-3 sm:col-span-2`}
          variant="outline"
        >
          <Link href="/field/projects">כל הפרויקטים המשובצים</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>שיבוצים פעילים</CardTitle>
          <CardDescription>פרויקטים שאתם משובצים אליהם כרגע.</CardDescription>
        </CardHeader>
        <CardContent>
          {projects.length === 0 ? (
            <p className="text-sm text-muted-foreground">אין שיבוצים — המתינו לשיבוץ מהמשרד.</p>
          ) : (
            <ul className="space-y-3">
              {projects.slice(0, 6).map((p) => (
                <li className="border-b border-border pb-3 last:border-0 last:pb-0" key={p.id}>
                  <Link className="block font-medium hover:underline" href={`/field/projects/${p.id}`}>
                    {p.clientName ?? "לקוח"}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {PROJECT_STATUS_LABELS[p.status]}
                    {p.location_address ? ` · ${p.location_address}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
          {projects.length > 6 ? (
            <Button asChild className="mt-4" variant="ghost">
              <Link href="/field/projects">הצגת הכול ({projects.length})</Link>
            </Button>
          ) : null}
        </CardContent>
      </Card>
    </main>
  );
}
