import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const LOGO_ALT = "אלוף הבמה והציוד";

export default async function Home() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="container-page flex flex-1 flex-col items-center justify-center py-12 sm:py-16 lg:px-6">
      <section className="mx-auto w-full max-w-lg space-y-8 text-center">
        <Link
          href="/login"
          className="inline-block rounded-md transition-opacity hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <Image
            src="/brand/logo.png"
            alt={LOGO_ALT}
            width={320}
            height={96}
            className="mx-auto h-24 w-auto max-w-[min(18rem,85vw)] object-contain drop-shadow-[0_8px_24px_rgba(44,44,44,0.1)] sm:h-28"
            priority
          />
        </Link>

        <Card className="border-border/50 bg-card/95 shadow-xl shadow-stone-900/10 ring-1 ring-stone-900/[0.06] dark:shadow-black/40 dark:ring-white/10">
          <CardHeader className="space-y-2 px-6 pt-8">
            <CardTitle className="text-2xl font-bold tracking-tight sm:text-3xl">
              ברוכים הבאים
            </CardTitle>
            <CardDescription className="text-base leading-relaxed">
              ניהול השכרת ציוד לאירועים — התחברו לעבודה או שלחו פנייה ללא חשבון.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 px-6 pb-2 text-sm text-muted-foreground">
            <p>
              לאחר התחברות תועברו לדשבורד: סטטוס פרויקטים, לוח זמנים, מלאי ועוד — לפי ההרשאות שלכם
              ב־Supabase.
            </p>
          </CardContent>
          <CardFooter className="flex flex-col gap-3 px-6 pb-8 sm:flex-row sm:justify-center">
            <Button asChild className="w-full sm:w-auto" size="lg">
              <Link href="/login">התחברות למערכת</Link>
            </Button>
            <Button asChild className="w-full sm:w-auto" size="lg" variant="outline">
              <Link href="/pniha">פנייה לאירוע (ללא התחברות)</Link>
            </Button>
          </CardFooter>
        </Card>

        <p className="text-xs text-muted-foreground">
          קיבלתם קישור מעקב? פתחו אותו מהמייל — הוא מוביל ישירות לעמוד הפרויקט.
        </p>
      </section>
    </main>
  );
}
