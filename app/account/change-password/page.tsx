import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRightCircle } from "lucide-react";

import { MandatoryChangePasswordForm } from "@/components/account/mandatory-change-password-form";
import { selectorButtonClass } from "@/components/common/selector-button-styles";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { userMustChangePassword } from "@/lib/auth/must-change-password";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function MandatoryChangePasswordPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/account/change-password");
  }

  if (!userMustChangePassword(user)) {
    return (
      <main className="container-page flex flex-1 flex-col items-center justify-center py-10">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>החלפת סיסמה</CardTitle>
            <CardDescription>אין דרישה להחלפת סיסמה כרגע.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className={selectorButtonClass(false)} variant="outline">
              <Link className="inline-flex items-center gap-1.5" href="/dashboard">
                <ArrowRightCircle className="h-4 w-4" />
                חזרה לדשבורד
              </Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="container-page flex flex-1 flex-col items-center justify-center py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>הגדרת סיסמה</CardTitle>
          <CardDescription>
            חשבון זה נוצר על ידי מנהל המערכת. לפני המשך השימוש נדרשת סיסמה אישית חדשה.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MandatoryChangePasswordForm />
        </CardContent>
      </Card>
    </main>
  );
}
