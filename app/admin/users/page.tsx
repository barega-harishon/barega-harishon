import Link from "next/link";
import { redirect } from "next/navigation";
import { z } from "zod";

import { listAdminUserRows } from "@/actions/admin-users";
import { CreateUserWithRoleForm } from "@/components/admin/create-user-with-role-form";
import { InviteUserWithRoleForm } from "@/components/admin/invite-user-with-role-form";
import { ProfileRoleUpdateForm } from "@/components/admin/profile-role-update-form";
import { RemoveUserFromTenantForm } from "@/components/admin/remove-user-from-tenant-form";
import { ResetUserPasswordForm } from "@/components/admin/reset-user-password-form";
import { selectorButtonClass } from "@/components/common/selector-button-styles";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getDateStylePreference } from "@/lib/date-style-server";
import type { DateStylePreference } from "@/lib/ui-preferences";
import { getCurrentAppRoles } from "@/lib/auth/current-profile";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { hasServiceRoleKey } from "@/lib/supabase/service-role";
import { formatDateTimeByPreference } from "@/utils/date";

export const dynamic = "force-dynamic";

function formatWhen(iso: string, dateStyle: DateStylePreference): string {
  if (!iso) {
    return "—";
  }
  return formatDateTimeByPreference(iso, dateStyle);
}

function parseInviteEmailParam(raw: string | string[] | undefined): string | undefined {
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (typeof v !== "string") {
    return undefined;
  }
  const t = v.trim();
  const parsed = z.string().email().safeParse(t);
  return parsed.success ? parsed.data : undefined;
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams?: Promise<{ inviteEmail?: string | string[] }>;
}) {
  const sp = searchParams ? await searchParams : {};
  const inviteEmailPrefill = parseInviteEmailParam(sp.inviteEmail);

  const [roles, dateStyle] = await Promise.all([getCurrentAppRoles(), getDateStylePreference()]);
  if (!roles.includes("admin")) {
    redirect("/dashboard");
  }

  const [{ rows, loadError, emailsNote }, inviteOk, authMe] = await Promise.all([
    listAdminUserRows(),
    Promise.resolve(hasServiceRoleKey()),
    createServerSupabaseClient().then(async (s) => {
      const {
        data: { user },
      } = await s.auth.getUser();
      return user?.id ?? null;
    }),
  ]);

  return (
    <main className="container-page py-8">
      <div className="page-header-row mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">משתמשים ותפקידים</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            ניהול תפקידי אפליקציה ב־profiles, יצירת משתמשים עם סיסמה ראשונית, או הזמנה במייל (אופציונלי).
          </p>
        </div>
        <Button asChild className={selectorButtonClass(false)} variant="outline">
          <Link href="/dashboard">חזרה לדשבורד</Link>
        </Button>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>יצירת משתמש חדש (מומלץ)</CardTitle>
          <CardDescription className="space-y-2">
            <span className="block">
              נוצר חשבון ב־Supabase עם דוא״ל וסיסמה זמנית. המשתמש יתבקש להחליף סיסמה בכניסה ראשונה. אין שליחת
              מייל מהמערכת בנתיב זה.
            </span>
            <span className="block text-amber-900/90 dark:text-amber-100/90">
              העבירו את הסיסמה החד־פעמית בערוץ מאובטח (לא בדוא״ל פתוח או צ׳אט ציבורי).
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {inviteOk ? (
            <CreateUserWithRoleForm defaultAppRole="office" />
          ) : (
            <p className="text-sm text-muted-foreground">
              יצירת משתמש דורשת <span className="font-mono">SUPABASE_SERVICE_ROLE_KEY</span> בסביבת השרת.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>הזמנה במייל (אופציונלי)</CardTitle>
          <CardDescription className="space-y-2">
            <span className="block">
              נשלח מייל הזמנה מ־Supabase. הקישור יוביל ל־<span className="font-mono text-xs">/auth/callback</span> —
              יש להוסיף את כתובת ההפניה המלאה תחת Redirect URLs ב־Supabase Auth (כולל פרודקשן ולוקאלי אם נדרש).
            </span>
            <span className="block text-amber-900/90 dark:text-amber-100/90">
              חשוב: אם פותחים את קישור ההזמנה בדפדפן שבו כבר מחובר אדמין, תישאר סשן האדמין. המוזמן צריך חלון
              גלישה פרטית או להתנתק לפני לחיצה על הקישור.
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {inviteOk ? (
            <InviteUserWithRoleForm defaultAppRole="office" initialEmail={inviteEmailPrefill} />
          ) : (
            <p className="text-sm text-muted-foreground">
              שליחת הזמנה דורשת <span className="font-mono">SUPABASE_SERVICE_ROLE_KEY</span> בסביבת השרת.
              בינתיים ניתן ליצור משתמשים מלוח Supabase ולעדכן תפקידים מהטבלה למטה.
            </p>
          )}
        </CardContent>
      </Card>

      {emailsNote ? (
        <p className="mb-4 text-sm text-muted-foreground" role="status">
          {emailsNote}
        </p>
      ) : null}

      {loadError ? (
        <p className="text-sm text-destructive" role="alert">
          {loadError}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius)] border border-border">
          <table className="w-full min-w-[52rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-start">
                <th className="p-3 font-medium">דוא״ל</th>
                <th className="p-3 font-medium">שם בתצוגה</th>
                <th className="p-3 font-medium">נוצר</th>
                <th className="p-3 font-medium">תפקיד ראשי ונוספים</th>
                <th className="p-3 font-medium">איפוס סיסמה</th>
                <th className="p-3 font-medium">הסרה</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr className="border-b border-border last:border-0" key={row.profileId}>
                  <td className="p-3 align-top font-mono text-xs break-all">
                    {row.email ?? <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="p-3 align-top">{row.fullName || "—"}</td>
                  <td className="p-3 align-top text-muted-foreground whitespace-nowrap">
                    {formatWhen(row.createdAt, dateStyle)}
                  </td>
                  <td className="p-3 align-top">
                    <ProfileRoleUpdateForm
                      defaultExtraRoles={row.extraRoles}
                      defaultRole={row.role}
                      profileId={row.profileId}
                    />
                  </td>
                  <td className="p-3 align-top">
                    {inviteOk ? (
                      <ResetUserPasswordForm isSelf={authMe !== null && row.profileId === authMe} profileId={row.profileId} />
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="p-3 align-top">
                    <RemoveUserFromTenantForm
                      isSelf={authMe !== null && row.profileId === authMe}
                      profileId={row.profileId}
                      serviceRoleAvailable={inviteOk}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
