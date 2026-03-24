"use server";

import { z } from "zod";

import { getSafeClientErrorMessage, toServerError } from "@/lib/errors";
import { buildObjectPath, sanitizeStorageFileName } from "@/lib/storage/file-names";
import {
  MAX_SITE_PHOTO_BYTES,
  MAX_SKETCH_BYTES,
  SITE_PHOTOS_BUCKET,
  SITE_PHOTO_MIME,
  SKETCHES_BUCKET,
  SKETCH_MIME,
} from "@/lib/storage/buckets";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types/common";

const projectIdSchema = z.string().uuid();

async function loadSiteRow(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>, projectId: string) {
  const { data } = await supabase
    .from("project_site_details")
    .select(
      "access_notes, cladding_color, notes, sketch_path, site_photo_paths, submitted_by_client",
    )
    .eq("project_id", projectId)
    .maybeSingle();

  return data;
}

async function upsertSiteDetails(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  projectId: string,
  patch: Record<string, unknown>,
) {
  const row = await loadSiteRow(supabase, projectId);
  const now = new Date().toISOString();

  const { error } = await supabase.from("project_site_details").upsert(
    {
      project_id: projectId,
      access_notes: row?.access_notes ?? null,
      cladding_color: row?.cladding_color ?? null,
      notes: row?.notes ?? null,
      sketch_path: row?.sketch_path ?? null,
      site_photo_paths: row?.site_photo_paths ?? [],
      submitted_by_client: row?.submitted_by_client ?? false,
      updated_at: now,
      ...patch,
    },
    { onConflict: "project_id" },
  );

  if (error) {
    console.error("upsertSiteDetails db error", error);
    throw new Error("DB_UPSERT_FAILED");
  }
}

export async function uploadProjectSitePhotos(
  formData: FormData,
): Promise<ActionResult<{ added: string[] }>> {
  const projectIdParsed = projectIdSchema.safeParse(formData.get("projectId"));
  if (!projectIdParsed.success) {
    return { success: false, message: "מזהה פרויקט לא תקין." };
  }

  const projectId = projectIdParsed.data;
  const files = formData.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);

  if (files.length === 0) {
    return { success: false, message: "נא לבחור לפחות תמונה אחת." };
  }

  if (files.length > 12) {
    return { success: false, message: "ניתן להעלות עד 12 תמונות בבת אחת." };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, message: "נדרשת התחברות." };
    }

    const addedPaths: string[] = [];

    for (const file of files) {
      if (file.size > MAX_SITE_PHOTO_BYTES) {
        return { success: false, message: "קובץ גדול מדי (מקסימום 5MB לתמונה)." };
      }

      if (!SITE_PHOTO_MIME.has(file.type)) {
        return {
          success: false,
          message: "סוג קובץ לא נתמך. השתמשו ב־JPEG, PNG או WebP.",
        };
      }

      const safeName = sanitizeStorageFileName(file.name);
      const objectPath = buildObjectPath(projectId, safeName);

      const { error } = await supabase.storage
        .from(SITE_PHOTOS_BUCKET)
        .upload(objectPath, file, {
          contentType: file.type,
          upsert: false,
        });

      if (error) {
        console.error("uploadProjectSitePhotos storage error", error);
        return { success: false, message: getSafeClientErrorMessage() };
      }

      addedPaths.push(objectPath);
    }

    const row = await loadSiteRow(supabase, projectId);
    const existing = Array.isArray(row?.site_photo_paths) ? row?.site_photo_paths : [];
    const merged = [...existing, ...addedPaths].slice(0, 60);

    await upsertSiteDetails(supabase, projectId, { site_photo_paths: merged });

    return {
      success: true,
      message: "התמונות הועלו בהצלחה.",
      data: { added: addedPaths },
    };
  } catch (error) {
    console.error("uploadProjectSitePhotos failed", toServerError(error));
    return { success: false, message: getSafeClientErrorMessage() };
  }
}

export async function removeProjectSitePhoto(
  payload: unknown,
): Promise<ActionResult<{ path: string }>> {
  const parsed = z
    .object({
      projectId: z.string().uuid(),
      path: z.string().min(3).max(500),
    })
    .safeParse(payload);

  if (!parsed.success) {
    return { success: false, message: "בקשה לא תקינה." };
  }

  const { projectId, path } = parsed.data;

  if (!path.startsWith(`${projectId}/`) || path.includes("..")) {
    return { success: false, message: "נתיב קובץ לא תקין." };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, message: "נדרשת התחברות." };
    }

    const row = await loadSiteRow(supabase, projectId);
    const existing = Array.isArray(row?.site_photo_paths) ? row?.site_photo_paths : [];

    if (!existing.includes(path)) {
      return { success: false, message: "הקובץ לא משויך לפרויקט." };
    }

    const { error: removeError } = await supabase.storage
      .from(SITE_PHOTOS_BUCKET)
      .remove([path]);

    if (removeError) {
      console.error("removeProjectSitePhoto storage error", removeError);
    }

    const merged = existing.filter((p) => p !== path);
    await upsertSiteDetails(supabase, projectId, { site_photo_paths: merged });

    return { success: true, message: "התמונה הוסרה.", data: { path } };
  } catch (error) {
    console.error("removeProjectSitePhoto failed", toServerError(error));
    return { success: false, message: getSafeClientErrorMessage() };
  }
}

export async function uploadProjectSketch(
  formData: FormData,
): Promise<ActionResult<{ path: string }>> {
  const projectIdParsed = projectIdSchema.safeParse(formData.get("projectId"));
  if (!projectIdParsed.success) {
    return { success: false, message: "מזהה פרויקט לא תקין." };
  }

  const projectId = projectIdParsed.data;
  const file = formData.get("sketch");

  if (!(file instanceof File) || file.size === 0) {
    return { success: false, message: "נא לבחור קובץ סקיצה." };
  }

  if (file.size > MAX_SKETCH_BYTES) {
    return { success: false, message: "קובץ הסקיצה גדול מדי (מקסימום 8MB)." };
  }

  if (!SKETCH_MIME.has(file.type)) {
    return {
      success: false,
      message: "סוג קובץ לא נתמך לסקיצה (JPEG, PNG, WebP או PDF).",
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

    const row = await loadSiteRow(supabase, projectId);
    const previousPath = typeof row?.sketch_path === "string" ? row.sketch_path : null;

    if (previousPath && previousPath.startsWith(`${projectId}/`)) {
      await supabase.storage.from(SKETCHES_BUCKET).remove([previousPath]);
    }

    const ext =
      file.type === "application/pdf"
        ? "pdf"
        : file.type === "image/png"
          ? "png"
          : file.type === "image/webp"
            ? "webp"
            : "jpg";
    const objectPath = buildObjectPath(projectId, `sketch.${ext}`);

    const { error } = await supabase.storage.from(SKETCHES_BUCKET).upload(objectPath, file, {
      contentType: file.type,
      upsert: false,
    });

    if (error) {
      console.error("uploadProjectSketch storage error", error);
      return { success: false, message: getSafeClientErrorMessage() };
    }

    await upsertSiteDetails(supabase, projectId, { sketch_path: objectPath });

    return {
      success: true,
      message: "הסקיצה הועלתה בהצלחה.",
      data: { path: objectPath },
    };
  } catch (error) {
    console.error("uploadProjectSketch failed", toServerError(error));
    return { success: false, message: getSafeClientErrorMessage() };
  }
}

export async function removeProjectSketch(
  payload: unknown,
): Promise<ActionResult<Record<string, never>>> {
  const parsed = z.object({ projectId: z.string().uuid() }).safeParse(payload);
  if (!parsed.success) {
    return { success: false, message: "בקשה לא תקינה." };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, message: "נדרשת התחברות." };
    }

    const row = await loadSiteRow(supabase, parsed.data.projectId);
    const previousPath = typeof row?.sketch_path === "string" ? row.sketch_path : null;

    if (previousPath) {
      await supabase.storage.from(SKETCHES_BUCKET).remove([previousPath]);
    }

    await upsertSiteDetails(supabase, parsed.data.projectId, { sketch_path: null });

    return { success: true, message: "הסקיצה הוסרה." };
  } catch (error) {
    console.error("removeProjectSketch failed", toServerError(error));
    return { success: false, message: getSafeClientErrorMessage() };
  }
}
