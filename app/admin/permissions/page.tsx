import Link from "next/link";
import { redirect } from "next/navigation";

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
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">מטריצת הרשאות לפי תפקיד</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            סיכום יכולות לפי סוג משתמש במערכת הנוכחית. מיועד למנהל מערכת בלבד.
          </p>
        </div>
        <Button asChild className={selectorButtonClass(false)} variant="outline">
          <Link href="/dashboard">חזרה לדשבורד</Link>
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
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[36rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border">
                <th
                  scope="col"
                  className="sticky start-0 z-[1] bg-card py-3 pe-3 text-start font-medium text-foreground"
                >
                  יכולת / מסך
                </th>
                {ROLE_PERMISSION_MATRIX_ROLE_ORDER.map((r) => (
                  <th
                    key={r}
                    scope="col"
                    className="px-2 py-3 text-center font-medium text-muted-foreground"
                  >
                    {APP_ROLE_LABELS_HE[r]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROLE_PERMISSION_MATRIX_ROWS.map((row) => (
                <tr key={row.key} className="border-b border-border last:border-0">
                  <th
                    scope="row"
                    className="sticky start-0 z-[1] bg-card py-2.5 pe-3 text-start font-normal text-foreground"
                  >
                    {row.labelHe}
                  </th>
                  {ROLE_PERMISSION_MATRIX_ROLE_ORDER.map((r) => (
                    <td key={r} className="px-2 py-2.5 text-center tabular-nums text-muted-foreground">
                      {row.roles[r] ? "כן" : "לא"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
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
