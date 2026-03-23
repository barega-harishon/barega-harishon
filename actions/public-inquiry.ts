"use server";

import { z } from "zod";

import { getSafeClientErrorMessage, toServerError } from "@/lib/errors";
import { getRequestClientIpKey } from "@/lib/http/client-ip";
import { checkIpWindowRateLimit } from "@/lib/rate-limit/ip-window";
import { buildObjectPath, sanitizeStorageFileName } from "@/lib/storage/file-names";
import {
  MAX_SITE_PHOTO_BYTES,
  MAX_SKETCH_BYTES,
  SITE_PHOTO_MIME,
  SITE_PHOTOS_BUCKET,
  SKETCH_MIME,
  SKETCHES_BUCKET,
} from "@/lib/storage/buckets";
import { hasServiceRoleKey, createServiceRoleSupabaseClient } from "@/lib/supabase/service-role";
import type { ActionResult } from "@/types/common";
import { sanitizeText } from "@/utils/sanitize";

const MAX_PUBLIC_PHOTOS = 8;

/** ~6 פניות ל־15 דקות לכל IP (הגנה בסיסית; בפריסה מרובת מופעים — חלקית) */
const PUBLIC_INQUIRY_WINDOW_MS = 15 * 60 * 1000;
const PUBLIC_INQUIRY_MAX_PER_WINDOW = 6;

function formatRateLimitRetryHe(seconds: number): string {
  if (seconds <= 120) {
    return `נסו שוב בעוד כ־${Math.max(30, Math.ceil(seconds / 15) * 15)} שניות.`;
  }
  const m = Math.ceil(seconds / 60);
  return `נסו שוב בעוד כ־${m} דקות.`;
}

function toIsoOrNull(value: string | undefined): string | null {
  if (!value || value.trim() === "") {
    return null;
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    return null;
  }
  return d.toISOString();
}

const inquirySchema = z
  .object({
    honeypot: z
      .union([z.string(), z.null(), z.undefined()])
      .transform((v) => (typeof v === "string" ? v : "")),
    clientName: z
      .string()
      .min(2, "שם מלא חייב להכיל לפחות 2 תווים")
      .max(120)
      .transform((v) => sanitizeText(v)),
    clientPhone: z
      .string()
      .max(40)
      .optional()
      .transform((v) => (v ? sanitizeText(v.trim()) : "")),
    clientEmail: z
      .string()
      .max(120)
      .optional()
      .transform((v) => (v ? sanitizeText(v.trim().toLowerCase()) : "")),
    clientAddress: z
      .string()
      .max(500)
      .optional()
      .transform((v) => (v ? sanitizeText(v) : "")),
    eventAddress: z
      .string()
      .min(3, "נא למלא כתובת אירוע")
      .max(500)
      .transform((v) => sanitizeText(v)),
    setupStartsAt: z.string().optional(),
    eventStartsAt: z.string().min(1, "נא לבחור תאריך ושעה לאירוע"),
    eventEndsAt: z.string().optional(),
    teardownAt: z.string().optional(),
    accessNotes: z
      .string()
      .max(2000)
      .optional()
      .transform((v) => (v ? sanitizeText(v) : "")),
    claddingColor: z
      .string()
      .max(200)
      .optional()
      .transform((v) => (v ? sanitizeText(v) : "")),
    notes: z
      .string()
      .max(2000)
      .optional()
      .transform((v) => (v ? sanitizeText(v) : "")),
  })
  .refine((d) => d.honeypot === "", {
    message: "בקשה לא תקינה.",
  })
  .refine((d) => Boolean(d.clientPhone) || Boolean(d.clientEmail), {
    message: "נא למלא לפחות טלפון או דוא״ל ליצירת קשר.",
  })
  .refine(
    (d) => {
      const setup = toIsoOrNull(d.setupStartsAt);
      const start = toIsoOrNull(d.eventStartsAt);
      if (!setup || !start) {
        return true;
      }
      return new Date(setup).getTime() <= new Date(start).getTime();
    },
    { message: "תאריך הקמה חייב להיות לפני או באותו זמן כמו תחילת האירוע." },
  )
  .refine(
    (d) => {
      const start = toIsoOrNull(d.eventStartsAt);
      const end = toIsoOrNull(d.eventEndsAt);
      if (!start || !end) {
        return true;
      }
      return new Date(start).getTime() <= new Date(end).getTime();
    },
    { message: "תחילת האירוע חייבת להיות לפני או בזמן סיום האירוע." },
  )
  .refine(
    (d) => {
      const end = toIsoOrNull(d.eventEndsAt);
      const tear = toIsoOrNull(d.teardownAt);
      if (!end || !tear) {
        return true;
      }
      return new Date(end).getTime() <= new Date(tear).getTime();
    },
    { message: "סיום האירוע חייב להיות לפני או בזמן הפירוק." },
  );

function collectPhotoFiles(formData: FormData): File[] {
  const files = formData.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
  return files.slice(0, MAX_PUBLIC_PHOTOS);
}

function getSketchFile(formData: FormData): File | null {
  const f = formData.get("sketch");
  return f instanceof File && f.size > 0 ? f : null;
}

export async function submitPublicInquiryFromForm(
  _prev: ActionResult<{ projectId: string; trackingToken: string | null }> | null,
  formData: FormData,
): Promise<ActionResult<{ projectId: string; trackingToken: string | null }> | null> {
  if (!hasServiceRoleKey()) {
    return {
      success: false,
      message: "שליחת פנייה אינה זמינה כרגע (חסרה הגדרת שרת). פנו למשרד.",
    };
  }

  const ipKey = await getRequestClientIpKey();
  const rate = checkIpWindowRateLimit(`pniha:${ipKey}`, {
    windowMs: PUBLIC_INQUIRY_WINDOW_MS,
    max: PUBLIC_INQUIRY_MAX_PER_WINDOW,
  });
  if (!rate.ok) {
    return {
      success: false,
      message: `נשלחו יותר מדי פניות ממכשיר זה. ${formatRateLimitRetryHe(rate.retryAfterSec)}`,
    };
  }

  const parsed = inquirySchema.safeParse({
    honeypot: formData.get("company"),
    clientName: formData.get("clientName"),
    clientPhone: formData.get("clientPhone"),
    clientEmail: formData.get("clientEmail"),
    clientAddress: formData.get("clientAddress"),
    eventAddress: formData.get("eventAddress"),
    setupStartsAt: formData.get("setupStartsAt"),
    eventStartsAt: formData.get("eventStartsAt"),
    eventEndsAt: formData.get("eventEndsAt"),
    teardownAt: formData.get("teardownAt"),
    accessNotes: formData.get("accessNotes"),
    claddingColor: formData.get("claddingColor"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      success: false,
      message: first?.message ?? "יש שדות לא תקינים בטופס.",
    };
  }

  const photos = collectPhotoFiles(formData);
  const sketch = getSketchFile(formData);

  for (const file of photos) {
    if (file.size > MAX_SITE_PHOTO_BYTES) {
      return { success: false, message: "תמונת שטח גדולה מדי (מקסימום 5MB לקובץ)." };
    }
    if (!SITE_PHOTO_MIME.has(file.type)) {
      return {
        success: false,
        message: "סוג קובץ לא נתמך לתמונות (JPEG, PNG או WebP).",
      };
    }
  }

  if (sketch) {
    if (sketch.size > MAX_SKETCH_BYTES) {
      return { success: false, message: "קובץ הסקיצה גדול מדי (מקסימום 8MB)." };
    }
    if (!SKETCH_MIME.has(sketch.type)) {
      return {
        success: false,
        message: "סוג קובץ לא נתמך לסקיצה (JPEG, PNG, WebP או PDF).",
      };
    }
  }

  const d = parsed.data;
  const setupIso = toIsoOrNull(d.setupStartsAt);
  const eventStartIso = toIsoOrNull(d.eventStartsAt);
  const eventEndIso = toIsoOrNull(d.eventEndsAt);
  const teardownIso = toIsoOrNull(d.teardownAt);

  if (!eventStartIso) {
    return { success: false, message: "תאריך אירוע לא תקין." };
  }

  try {
    const supabase = createServiceRoleSupabaseClient();

    const { data: clientRow, error: clientErr } = await supabase
      .from("clients")
      .insert({
        name: d.clientName,
        phone: d.clientPhone || null,
        email: d.clientEmail || null,
        address: d.clientAddress || null,
      })
      .select("id")
      .single();

    if (clientErr || !clientRow) {
      console.error("public inquiry client insert", clientErr);
      return { success: false, message: getSafeClientErrorMessage() };
    }

    const clientId = clientRow.id as string;

    const { data: projectRow, error: projectErr } = await supabase
      .from("projects")
      .insert({
        client_id: clientId,
        status: "quote",
        location_address: d.eventAddress,
        total_price: 0,
        setup_starts_at: setupIso,
        event_starts_at: eventStartIso,
        event_ends_at: eventEndIso,
        teardown_at: teardownIso,
        created_by: null,
      })
      .select("id, public_tracking_token")
      .single();

    if (projectErr || !projectRow) {
      console.error("public inquiry project insert", projectErr);
      return { success: false, message: getSafeClientErrorMessage() };
    }

    const projectId = projectRow.id as string;
    const trackingToken =
      typeof projectRow.public_tracking_token === "string"
        ? projectRow.public_tracking_token
        : null;

    const { error: siteErr } = await supabase.from("project_site_details").insert({
      project_id: projectId,
      access_notes: d.accessNotes || null,
      cladding_color: d.claddingColor || null,
      notes: d.notes || null,
      site_photo_paths: [],
      sketch_path: null,
      submitted_by_client: true,
      updated_at: new Date().toISOString(),
    });

    if (siteErr) {
      console.error("public inquiry site details insert", siteErr);
      return { success: false, message: getSafeClientErrorMessage() };
    }

    const photoPaths: string[] = [];

    for (const file of photos) {
      const safeName = sanitizeStorageFileName(file.name);
      const objectPath = buildObjectPath(projectId, safeName);
      const { error: upErr } = await supabase.storage
        .from(SITE_PHOTOS_BUCKET)
        .upload(objectPath, file, { contentType: file.type, upsert: false });

      if (upErr) {
        console.error("public inquiry photo upload", upErr);
        return {
          success: false,
          message: "נוצרה פנייה אך העלאת תמונות נכשלה. פנו למשרד עם פרטי האירוע.",
        };
      }
      photoPaths.push(objectPath);
    }

    let sketchPath: string | null = null;
    if (sketch) {
      const ext =
        sketch.type === "application/pdf"
          ? "pdf"
          : sketch.type === "image/png"
            ? "png"
            : sketch.type === "image/webp"
              ? "webp"
              : "jpg";
      const safeSketch = sanitizeStorageFileName(`sketch.${ext}`);
      const sketchObjectPath = buildObjectPath(projectId, safeSketch);
      const { error: skErr } = await supabase.storage
        .from(SKETCHES_BUCKET)
        .upload(sketchObjectPath, sketch, { contentType: sketch.type, upsert: false });

      if (skErr) {
        console.error("public inquiry sketch upload", skErr);
        return {
          success: false,
          message: "נוצרה פנייה אך העלאת הסקיצה נכשלה. ניתן לשלוח את הקובץ למשרד בנפרד.",
        };
      }
      sketchPath = sketchObjectPath;
    }

    if (photoPaths.length > 0 || sketchPath) {
      const patch: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      if (photoPaths.length > 0) {
        patch.site_photo_paths = photoPaths;
      }
      if (sketchPath) {
        patch.sketch_path = sketchPath;
      }
      const { error: updErr } = await supabase
        .from("project_site_details")
        .update(patch)
        .eq("project_id", projectId);

      if (updErr) {
        console.error("public inquiry site details update", updErr);
        return {
          success: false,
          message: "הקבצים הועלו אך עדכון פרטי האתר נכשל. פנו למשרד.",
        };
      }
    }

    return {
      success: true,
      message: "הפנייה נשלחה בהצלחה. נחזור אליכם בהקדם.",
      data: { projectId, trackingToken },
    };
  } catch (error) {
    console.error("submitPublicInquiryFromForm failed", toServerError(error));
    return { success: false, message: getSafeClientErrorMessage() };
  }
}
