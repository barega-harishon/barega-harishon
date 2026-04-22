import { NextResponse } from "next/server";

import { isAuthorizedCronRequest } from "@/lib/cron/auth";

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  return NextResponse.json({ ok: true, message: "Cron task executed." });
}
