import { z } from "zod";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { generateQuotePdfBuffer } from "@/lib/pdf/generate-quote-pdf";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const parsed = z.string().uuid().safeParse(id);
  if (!parsed.success) {
    return new Response("לא נמצא", { status: 404 });
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response("נדרשת התחברות", { status: 401 });
  }

  const buffer = await generateQuotePdfBuffer(supabase, parsed.data);
  if (!buffer) {
    return new Response("לא נמצא", { status: 404 });
  }

  const safeName = `quote-${parsed.data.slice(0, 8)}.pdf`;
  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${safeName}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
