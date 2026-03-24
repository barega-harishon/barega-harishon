import { NextResponse } from "next/server";

import { getCronSecret } from "@/lib/env";

function getBearerToken(request: Request): string | null {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) {
    return null;
  }
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() ?? null;
}

function isAuthorized(request: Request): boolean {
  const cronSecret = getCronSecret();
  if (!cronSecret) {
    return false;
  }

  const url = new URL(request.url);
  const querySecret = url.searchParams.get("secret");
  const headerSecret = request.headers.get("x-cron-secret");
  const bearerSecret = getBearerToken(request);
  const providedSecret = bearerSecret ?? headerSecret ?? querySecret;

  return providedSecret === cronSecret;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  return NextResponse.json({ ok: true, message: "Cron task executed." });
}
