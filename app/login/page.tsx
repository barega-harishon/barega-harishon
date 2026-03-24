import Image from "next/image";
import Link from "next/link";

import { LoginForm } from "@/components/auth/login-form";
import { InstallPwaPanel } from "@/components/common/install-pwa-panel";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const dynamic = "force-dynamic";

const LOGO_ALT = "אלוף הבמה והציוד";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const rawNext = params.next;
  const nextPath =
    typeof rawNext === "string" &&
    rawNext.startsWith("/") &&
    !rawNext.startsWith("//")
      ? rawNext
      : "/dashboard";

  return (
    <main className="container-page flex flex-1 flex-col items-center justify-center gap-10 py-10 sm:gap-12 sm:py-14">
      <Link
        href="/"
        className="rounded-md transition-opacity hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <Image
          src="/brand/logo.png"
          alt={LOGO_ALT}
          width={360}
          height={108}
          className="h-24 w-auto max-w-[min(22rem,88vw)] object-contain drop-shadow-[0_8px_24px_rgba(44,44,44,0.12)] sm:h-28 sm:max-w-[min(26rem,90vw)] md:h-32"
          priority
        />
      </Link>
      <Card className="w-full max-w-md overflow-hidden border-border/50 bg-card/95 shadow-xl shadow-stone-900/10 ring-1 ring-stone-900/[0.06] backdrop-blur-sm dark:shadow-black/40 dark:ring-white/10">
        <CardHeader className="space-y-3 px-8 pb-2 pt-8 text-center sm:px-10 sm:pt-10">
          <CardTitle className="text-3xl font-bold tracking-tight sm:text-4xl">התחברות</CardTitle>
          <CardDescription className="text-base leading-relaxed">
            הזינו דוא״ל וסיסמה כדי לגשת לפרויקטים.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 border-t border-border/70 px-8 pb-8 pt-6 sm:px-10 sm:pb-10">
          <LoginForm nextPath={nextPath} />
          <InstallPwaPanel />
          <p className="text-center text-sm text-muted-foreground">
            <Link
              className="rounded-sm underline underline-offset-4 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
              href="/"
            >
              חזרה לדף הבית
            </Link>
          </p>
          <p className="text-center text-xs text-muted-foreground">
            התחברות מאובטחת דרך Supabase Auth.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
