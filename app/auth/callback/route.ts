import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getClientEnv } from "@/lib/env";

/**
 * החלפת קוד PKCE מהזמנה / OAuth להתקנת עוגיות סשן.
 * יש להוסיף את כתובת ההפניה המלאה (כולל נתיב זה) תחת Redirect URLs ב־Supabase Auth.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextRaw = searchParams.get("next");
  const nextPath =
    typeof nextRaw === "string" && nextRaw.startsWith("/") && !nextRaw.startsWith("//")
      ? nextRaw
      : "/projects";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth_callback`);
  }

  let clientEnv;
  try {
    clientEnv = getClientEnv();
  } catch {
    return NextResponse.redirect(`${origin}/login?error=auth_callback`);
  }

  const redirectResponse = NextResponse.redirect(`${origin}${nextPath}`);

  const supabase = createServerClient(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            redirectResponse.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error("auth callback exchangeCodeForSession failed", {
      message: error.message,
      status: (error as { status?: number }).status,
    });
    return NextResponse.redirect(`${origin}/login?error=auth_callback`);
  }

  return redirectResponse;
}
