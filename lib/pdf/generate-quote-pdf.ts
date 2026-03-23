import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  buildQuotePdfHtml,
  type QuoteLineInput,
  type QuotePdfContext,
} from "@/lib/pdf/quote-html";
import { getPdfRuntimeDependencies } from "@/lib/pdf/runtime";

export async function generateQuotePdfBuffer(
  supabase: SupabaseClient,
  projectId: string,
): Promise<Buffer | null> {
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select(
      `
      id,
      total_price,
      location_address,
      setup_starts_at,
      event_starts_at,
      event_ends_at,
      teardown_at,
      clients ( name, phone, email, address )
    `,
    )
    .eq("id", projectId)
    .maybeSingle();

  if (projectError || !project) {
    return null;
  }

  const { data: linesRaw, error: linesError } = await supabase
    .from("project_equipment")
    .select(
      `
      quantity,
      equipment:equipment_id ( name, rent_price )
    `,
    )
    .eq("project_id", projectId);

  if (linesError) {
    return null;
  }

  const lines: QuoteLineInput[] = [];
  let equipmentSubtotal = 0;

  for (const row of linesRaw ?? []) {
    const qty = Number(row.quantity);
    const equip = row.equipment as { name?: string; rent_price?: string | number } | null;
    const name = equip?.name ?? "פריט";
    const unit = Number(equip?.rent_price ?? 0);
    const lineTotal = unit * qty;
    equipmentSubtotal += lineTotal;
    lines.push({
      name,
      quantity: qty,
      unitPrice: unit,
      lineTotal,
    });
  }

  const clients = project.clients as {
    name?: string;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
  } | null;

  const ctx: QuotePdfContext = {
    projectId: project.id as string,
    clientName: clients?.name ?? "—",
    clientPhone: clients?.phone ?? null,
    clientEmail: clients?.email ?? null,
    clientAddress: clients?.address ?? null,
    locationAddress: (project.location_address as string | null) ?? null,
    totalPriceSystem: Number(project.total_price ?? 0),
    lines,
    equipmentSubtotal,
    setupStartsAt: (project.setup_starts_at as string | null) ?? null,
    eventStartsAt: (project.event_starts_at as string | null) ?? null,
    eventEndsAt: (project.event_ends_at as string | null) ?? null,
    teardownAt: (project.teardown_at as string | null) ?? null,
  };

  const html = buildQuotePdfHtml(ctx);
  const deps = await getPdfRuntimeDependencies();

  let browser;
  try {
    if ("chromium" in deps && deps.chromium) {
      const ch = deps.chromium;
      browser = await deps.puppeteer.launch({
        args: ch.args,
        executablePath: await ch.executablePath(),
      });
    } else {
      browser = await deps.puppeteer.launch({
        headless: true,
      });
    }

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0", timeout: 60_000 });
    const pdfUint8 = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "16mm", bottom: "16mm", left: "12mm", right: "12mm" },
    });
    await browser.close();
    return Buffer.from(pdfUint8);
  } catch (e) {
    console.error("generateQuotePdfBuffer failed", e);
    if (browser) {
      await browser.close().catch(() => undefined);
    }
    return null;
  }
}
