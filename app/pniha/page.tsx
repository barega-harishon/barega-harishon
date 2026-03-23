import Link from "next/link";

import { PublicInquiryForm } from "@/components/inquiry/public-inquiry-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { hasServiceRoleKey } from "@/lib/supabase/service-role";

export const dynamic = "force-dynamic";

export default function PublicInquiryPage() {
  const enabled = hasServiceRoleKey();

  return (
    <main className="container-page flex flex-1 flex-col items-center py-10 lg:px-6">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <div className="page-header-row flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">פנייה לאירוע</h1>
            <p className="text-sm text-muted-foreground">
              מלאו את הפרטים — הצוות יקבל את הבקשה במערכת (ללא צורך בהתחברות).
            </p>
          </div>
          <Link className="text-sm font-medium text-primary hover:underline" href="/">
            דף הבית
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>טופס פרטי אירוע</CardTitle>
            <CardDescription>
              השדות מותאמים לאפיון MVP: תאריכים, כתובת, גישה לשטח, צבע חיפוי, תמונות וסקיצה.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {enabled ? (
              <PublicInquiryForm />
            ) : (
              <p className="text-sm text-destructive" role="alert">
                שליחת פנייה מהאתר אינה פעילה: חסר <code className="rounded bg-muted px-1">SUPABASE_SERVICE_ROLE_KEY</code>{" "}
                בשרת. הוסיפו אותו ל־<code className="rounded bg-muted px-1">.env.local</code> (רק בסביבת שרת, לעולם לא
                בדפדפן).
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
