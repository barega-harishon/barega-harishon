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
import {
  reservationWindowFromProjectDates,
  reservationWindowsOverlap,
} from "@/lib/equipment/reservation-window";
import { zCladdingSwatchField } from "@/lib/inquiry/cladding-options";
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

function normalizeNationalId(raw: string | undefined): string {
  return (raw ?? "").replace(/\D/g, "").slice(0, 20);
}

function normalizePhone(raw: string | undefined): string {
  return (raw ?? "").replace(/[^\d+]/g, "").slice(0, 20);
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
      .min(6, "נא למלא מספר טלפון תקין")
      .max(40)
      .transform((v) => sanitizeText(v.trim())),
    clientEmail: z
      .string()
      .min(3, "נא למלא דוא״ל")
      .max(120)
      .email({ message: "נא למלא כתובת דוא״ל תקינה" })
      .transform((v) => sanitizeText(v.trim().toLowerCase())),
    nationalId: z
      .string()
      .min(1, "נא למלא מספר זהות או ח״פ")
      .max(20)
      .transform((v) => sanitizeText(v.trim()))
      .refine((v) => normalizeNationalId(v).length >= 5, {
        message: "נא למלא לפחות 5 ספרות במספר הזהות או בח״פ.",
      }),
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
    setupStartsAt: z.string().min(1, "נא לבחור תאריך ושעת הקמה"),
    eventStartsAt: z.string().min(1, "נא לבחור תאריך ושעה לאירוע"),
    eventEndsAt: z.string().optional(),
    teardownAt: z.string().min(1, "נא לבחור תאריך ושעת פירוק"),
    accessNotes: z
      .string()
      .max(2000)
      .optional()
      .transform((v) => (v ? sanitizeText(v) : "")),
    carpetCladdingColor: zCladdingSwatchField,
    fabricCladdingColor: zCladdingSwatchField,
    notes: z
      .string()
      .max(2000)
      .optional()
      .transform((v) => (v ? sanitizeText(v) : "")),
  })
  .refine((d) => d.honeypot === "", {
    message: "בקשה לא תקינה.",
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
  )
  .refine(
    (d) => {
      const start = toIsoOrNull(d.eventStartsAt);
      const tear = toIsoOrNull(d.teardownAt);
      if (!start || !tear) {
        return true;
      }
      return new Date(start).getTime() <= new Date(tear).getTime();
    },
    { message: "תחילת האירוע חייבת להיות לפני או בזמן הפירוק." },
  );

function collectPhotoFiles(formData: FormData): File[] {
  const files = formData.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
  return files.slice(0, MAX_PUBLIC_PHOTOS);
}

function getSketchFile(formData: FormData): File | null {
  const f = formData.get("sketch");
  return f instanceof File && f.size > 0 ? f : null;
}

async function checkCentralIpWindowRateLimit(
  key: string,
  windowMs: number,
  max: number,
): Promise<{ ok: true } | { ok: false; retryAfterSec: number }> {
  const supabase = createServiceRoleSupabaseClient();
  const now = Date.now();
  const windowStartIso = new Date(now - windowMs).toISOString();

  const { data: existing, error: readErr } = await supabase
    .from("request_rate_limits")
    .select("window_start, count")
    .eq("key", key)
    .maybeSingle();
  if (readErr) {
    return { ok: true };
  }

  const existingStartMs = existing?.window_start ? new Date(existing.window_start).getTime() : 0;
  const expired = !existing || Number.isNaN(existingStartMs) || existingStartMs < now - windowMs;
  const nextCount = expired ? 1 : Number(existing.count ?? 0) + 1;
  const nextWindowStart = expired ? new Date(now).toISOString() : String(existing.window_start);

  if (!expired && Number(existing?.count ?? 0) >= max) {
    const retryAfterMs = windowMs - (now - existingStartMs);
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil(retryAfterMs / 1000)) };
  }

  await supabase.from("request_rate_limits").upsert({
    key,
    window_start: nextWindowStart,
    count: nextCount,
    updated_at: new Date(now).toISOString(),
  });
  await supabase.from("request_rate_limits").delete().lt("window_start", windowStartIso);
  return { ok: true };
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
  const localRate = checkIpWindowRateLimit(`pniha:${ipKey}`, {
    windowMs: PUBLIC_INQUIRY_WINDOW_MS,
    max: PUBLIC_INQUIRY_MAX_PER_WINDOW,
  });
  if (!localRate.ok) {
    return {
      success: false,
      message: `נשלחו יותר מדי פניות ממכשיר זה. ${formatRateLimitRetryHe(localRate.retryAfterSec)}`,
    };
  }
  const rate = await checkCentralIpWindowRateLimit(
    `pniha:${ipKey}`,
    PUBLIC_INQUIRY_WINDOW_MS,
    PUBLIC_INQUIRY_MAX_PER_WINDOW,
  );
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
    nationalId: formData.get("nationalId"),
    clientAddress: formData.get("clientAddress"),
    eventAddress: formData.get("eventAddress"),
    setupStartsAt: formData.get("setupStartsAt"),
    eventStartsAt: formData.get("eventStartsAt"),
    eventEndsAt: formData.get("eventEndsAt"),
    teardownAt: formData.get("teardownAt"),
    accessNotes: formData.get("accessNotes"),
    carpetCladdingColor: formData.get("carpetCladdingColor"),
    fabricCladdingColor: formData.get("fabricCladdingColor"),
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
  if (!setupIso || !teardownIso) {
    return { success: false, message: "תאריכי הקמה או פירוק לא תקינים." };
  }

  try {
    const supabase = createServiceRoleSupabaseClient();

    let createdClientId: string | null = null;
    let createdProjectId: string | null = null;

    const normalizedPhone = normalizePhone(d.clientPhone);
    const normalizedEmail = d.clientEmail.trim().toLowerCase();
    const normalizedNationalId = normalizeNationalId(d.nationalId);
    let existingClientId: string | null = null;
    if (normalizedNationalId || normalizedPhone || normalizedEmail) {
      let q = supabase.from("clients").select("id").limit(1);
      if (normalizedNationalId) {
        q = q.eq("national_id", normalizedNationalId);
      } else if (normalizedPhone && normalizedEmail) {
        q = q.or(`phone.eq.${normalizedPhone},email.eq.${normalizedEmail}`);
      } else if (normalizedPhone) {
        q = q.eq("phone", normalizedPhone);
      } else if (normalizedEmail) {
        q = q.eq("email", normalizedEmail);
      }
      const { data: existing } = await q.maybeSingle();
      existingClientId = existing?.id ? String(existing.id) : null;
    }

    let clientId = existingClientId;
    if (!clientId) {
      const { data: clientRow, error: clientErr } = await supabase
        .from("clients")
        .insert({
          name: d.clientName,
          national_id: normalizedNationalId || null,
          phone: normalizedPhone || null,
          email: normalizedEmail || null,
          address: d.clientAddress || null,
        })
        .select("id")
        .single();

      if (clientErr || !clientRow) {
        console.error("public inquiry client insert", clientErr);
        return { success: false, message: getSafeClientErrorMessage() };
      }
      clientId = clientRow.id as string;
      createdClientId = clientId;
    }

    const newReservationWindow = reservationWindowFromProjectDates({
      setup_starts_at: setupIso,
      event_starts_at: eventStartIso,
      event_ends_at: eventEndIso,
      teardown_at: teardownIso,
    });

    if (clientId && newReservationWindow) {
      const { data: siblingProjects } = await supabase
        .from("projects")
        .select("id, status, setup_starts_at, event_starts_at, event_ends_at, teardown_at")
        .eq("client_id", clientId)
        .neq("status", "closed");

      for (const sib of siblingProjects ?? []) {
        const row = sib as {
          status: string;
          setup_starts_at: string | null;
          event_starts_at: string | null;
          event_ends_at: string | null;
          teardown_at: string | null;
        };
        if (String(row.status) === "closed") {
          continue;
        }
        const otherWin = reservationWindowFromProjectDates({
          setup_starts_at: row.setup_starts_at,
          event_starts_at: row.event_starts_at,
          event_ends_at: row.event_ends_at,
          teardown_at: row.teardown_at,
        });
        const overlaps = otherWin === null || reservationWindowsOverlap(newReservationWindow, otherWin);
        if (overlaps) {
          if (createdClientId) {
            await supabase.from("clients").delete().eq("id", createdClientId);
          }
          return {
            success: false,
            message:
              "נראה שכבר קיימת פנייה או פרויקט דומה בתאריכים האלה לאותם פרטי קשר. אם מדובר בהזמנה נפרדת — פנו למשרד.",
          };
        }
      }
    }

    const { data: projectRow, error: projectErr } = await supabase
      .from("projects")
      .insert({
        client_id: clientId,
        status: "incoming",
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
      if (createdClientId) {
        await supabase.from("clients").delete().eq("id", createdClientId);
      }
      return { success: false, message: getSafeClientErrorMessage() };
    }

    const projectId = projectRow.id as string;
    createdProjectId = projectId;
    const trackingToken =
      typeof projectRow.public_tracking_token === "string"
        ? projectRow.public_tracking_token
        : null;

    const { error: siteErr } = await supabase.from("project_site_details").insert({
      project_id: projectId,
      access_notes: d.accessNotes || null,
      cladding_color: null,
      carpet_cladding_color: d.carpetCladdingColor || null,
      fabric_cladding_color: d.fabricCladdingColor || null,
      notes: d.notes || null,
      site_photo_paths: [],
      sketch_path: null,
      submitted_by_client: true,
      updated_at: new Date().toISOString(),
    });

    if (siteErr) {
      console.error("public inquiry site details insert", siteErr);
      if (createdProjectId) {
        await supabase.from("projects").delete().eq("id", createdProjectId);
      }
      if (createdClientId) {
        await supabase.from("clients").delete().eq("id", createdClientId);
      }
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
        if (createdProjectId) {
          await supabase.from("projects").delete().eq("id", createdProjectId);
        }
        if (createdClientId) {
          await supabase.from("clients").delete().eq("id", createdClientId);
        }
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
        if (createdProjectId) {
          await supabase.from("projects").delete().eq("id", createdProjectId);
        }
        if (createdClientId) {
          await supabase.from("clients").delete().eq("id", createdClientId);
        }
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
        if (createdProjectId) {
          await supabase.from("projects").delete().eq("id", createdProjectId);
        }
        if (createdClientId) {
          await supabase.from("clients").delete().eq("id", createdClientId);
        }
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
