import { NextResponse } from "next/server";

import { getServerEnv } from "@/lib/env";

function isAuthorized(request: Request): boolean {
  const serverEnv = getServerEnv();

  if (!serverEnv.success) {
    return false;
  }

  const url = new URL(request.url);
  const querySecret = url.searchParams.get("secret");
  const headerSecret = request.headers.get("x-cron-secret");
  const providedSecret = headerSecret ?? querySecret;

  return providedSecret === serverEnv.data.CRON_SECRET;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  return NextResponse.json({ ok: true, message: "Cron task executed." });
}
