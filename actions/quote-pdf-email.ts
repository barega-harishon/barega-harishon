"use server";

import { z } from "zod";

import { generateQuotePdfBuffer } from "@/lib/pdf/generate-quote-pdf";
import { getSafeClientErrorMessage, toServerError } from "@/lib/errors";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types/common";
import { Resend } from "resend";

const projectIdSchema = z.object({
  projectId: z.string().uuid(),
});

export async function sendQuotePdfByEmail(payload: unknown): Promise<ActionResult<Record<string, never>>> {
  const parsed = projectIdSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, message: "בקשה לא תקינה." };
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return {
      success: false,
      message: "שליחת מייל אינה מוגדרת (חסר מפתח Resend בסביבה).",
    };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, message: "נדרשת התחברות." };
    }

    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select(
        `
        id,
        clients ( name, email )
      `,
      )
      .eq("id", parsed.data.projectId)
      .maybeSingle();

    if (projectError || !project) {
      return { success: false, message: "הפרויקט לא נמצא." };
    }

    const clients = project.clients as { name?: string; email?: string | null } | null;
    const toEmail = clients?.email?.trim();
    if (!toEmail) {
      return {
        success: false,
        message: "ללקוח אין כתובת דוא״ל במערכת. עדכנו את פרטי הלקוח.",
      };
    }

    const pdfBuffer = await generateQuotePdfBuffer(supabase, parsed.data.projectId);
    if (!pdfBuffer) {
      return { success: false, message: "לא ניתן ליצור את קובץ ההצעה." };
    }

    const resend = new Resend(apiKey);
    const from =
      process.env.RESEND_FROM?.trim() ?? "Barega <onboarding@resend.dev>";
    const clientName = clients?.name ?? "לקוח";
    const subject = `הצעת מחיר – ${clientName}`;

    const { error: sendError } = await resend.emails.send({
      from,
      to: [toEmail],
      subject,
      html: `<p>שלום,</p><p>מצורפת הצעת מחיר מהמערכת.</p><p>בברכה,<br/>צוות Barega</p>`,
      attachments: [
        {
          filename: `quote-${parsed.data.projectId.slice(0, 8)}.pdf`,
          content: pdfBuffer.toString("base64"),
        },
      ],
    });

    if (sendError) {
      console.error("Resend sendQuotePdfByEmail", sendError);
      return { success: false, message: getSafeClientErrorMessage() };
    }

    return { success: true, message: "ההצעה נשלחה בדוא״ל." };
  } catch (error) {
    console.error("sendQuotePdfByEmail failed", toServerError(error));
    return { success: false, message: getSafeClientErrorMessage() };
  }
}

export async function sendQuotePdfByEmailFromForm(
  _prev: ActionResult<Record<string, never>> | null,
  formData: FormData,
): Promise<ActionResult<Record<string, never>> | null> {
  return sendQuotePdfByEmail({ projectId: formData.get("projectId") });
}
