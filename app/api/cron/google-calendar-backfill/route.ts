import { NextResponse } from "next/server";

import { backfillAllProjectsToGoogle } from "@/lib/google-calendar/sync";
import { isAuthorizedCronRequest } from "@/lib/cron/auth";

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  try {
    const result = await backfillAllProjectsToGoogle();
    return NextResponse.json({
      ok: true,
      message: "Google Calendar backfill completed.",
      syncedProjects: result.total,
    });
  } catch (error) {
    console.error("google-calendar-backfill failed", error);
    return NextResponse.json(
      { ok: false, message: "Backfill failed." },
      { status: 500 },
    );
  }
}
