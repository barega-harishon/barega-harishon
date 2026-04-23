import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRightCircle } from "lucide-react";

import { HeaderInfoModal } from "@/components/common/header-info-modal";
import { selectorButtonClass } from "@/components/common/selector-button-styles";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ROLE_PERMISSION_MATRIX_ROLE_ORDER,
  ROLE_PERMISSION_MATRIX_ROWS,
} from "@/lib/admin/role-permissions-matrix";
import { getCurrentAppRoles } from "@/lib/auth/current-profile";
import { APP_ROLE_LABELS_HE } from "@/types/app-role";

export const dynamic = "force-dynamic";

export default async function AdminPermissionsPage() {
  const roles = await getCurrentAppRoles();
  if (!roles.includes("admin")) {
    redirect("/dashboard");
  }

  return (
    <main className="container-page py-8">
      <div className="page-header-row mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">מטריצת הרשאות לפי תפקיד</h1>
          <HeaderInfoModal label="הנחיות מטריצת הרשאות">
            <p>סיכום יכולות לפי סוג משתמש במערכת הנוכחית. מיועד למנהל מערכת בלבד.</p>
          </HeaderInfoModal>
        </div>
        <Button asChild className={selectorButtonClass(false)} variant="outline">
          <Link className="inline-flex items-center gap-1.5" href="/dashboard">
            <ArrowRightCircle className="h-4 w-4" />
            חזרה לדשבורד
          </Link>
        </Button>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>טבלת הרשאות</CardTitle>
          <CardDescription>
            הערכים משקפים את בדיקות התפקיד בקוד ובניווט הראשי. שינויים עתידיים בלוגיקה יעדכנו גם את
            הטבלה כאן.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-3 sm:px-4">
          <p className="sr-only">
            טבלת הרשאות: עמודת יכולות לצד טבלת תפקידים; גלילה אופקית רק בעמודת התפקידים.
          </p>
          <div className="flex items-stretch gap-0 overflow-hidden">
            <div className="shrink-0 border-e border-border bg-card">
              <table className="w-full min-w-[12rem] border-separate border-spacing-0 text-sm">
                <thead>
                  <tr>
                    <th
                      scope="col"
                      className="border-b border-border px-4 py-3 text-start font-medium text-foreground"
                    >
                      יכולת / מסך
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {ROLE_PERMISSION_MATRIX_ROWS.map((row, rowIndex) => {
                    const isLastRow = rowIndex === ROLE_PERMISSION_MATRIX_ROWS.length - 1;
                    const rowBorder = isLastRow ? "" : "border-b border-border";
                    return (
                      <tr key={row.key}>
                        <th
                          scope="row"
                          className={`bg-card px-4 py-3 text-start font-normal text-foreground ${rowBorder}`}
                        >
                          {row.labelHe}
                        </th>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="min-w-0 flex-1 overflow-x-auto overscroll-x-contain bg-card">
              <table className="min-w-[28rem] w-full border-separate border-spacing-0 text-sm">
                <thead>
                  <tr>
                    {ROLE_PERMISSION_MATRIX_ROLE_ORDER.map((r) => (
                      <th
                        key={r}
                        scope="col"
                        className="border-b border-border px-3 py-3 text-center font-medium text-muted-foreground"
                      >
                        {APP_ROLE_LABELS_HE[r]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ROLE_PERMISSION_MATRIX_ROWS.map((row, rowIndex) => {
                    const isLastRow = rowIndex === ROLE_PERMISSION_MATRIX_ROWS.length - 1;
                    const rowBorder = isLastRow ? "" : "border-b border-border";
                    return (
                      <tr key={row.key}>
                        {ROLE_PERMISSION_MATRIX_ROLE_ORDER.map((r) => (
                          <td
                            key={r}
                            className={`px-3 py-3 text-center tabular-nums text-muted-foreground ${rowBorder}`}
                          >
                            {row.roles[r] ? "כן" : "לא"}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>יותר מתפקיד אחד לאותו משתמש?</CardTitle>
          <CardDescription>איך זה עובד במערכת</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            יש <strong className="text-foreground">תפקיד ראשי</strong> ב־
            <code className="rounded bg-muted px-1 py-0.5 text-xs text-foreground">profiles.role</code>
            , ואפשר להוסיף <strong className="text-foreground">תפקידים נוספים</strong> ב־
            <code className="rounded bg-muted px-1 py-0.5 text-xs text-foreground">profiles.extra_roles</code>
            . האיחוד משמש לניווט, ל־RLS ב־Postgres ולבדיקות הרשאה בשרת.
          </p>
          <p>
            התפקיד הראשי לא יופיע כפול ברשימת הנוספים; הזמנת משתמש חדש מגדירה רק תפקיד ראשי (ללא נוספים)
            עד שאדמין יעדכן מהטבלה ב־«משתמשים».
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
