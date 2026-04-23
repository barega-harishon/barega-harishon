"use server";

import { z } from "zod";

import { getSafeClientErrorMessage, toServerError } from "@/lib/errors";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types/common";
import { zCladdingSwatchField } from "@/lib/inquiry/cladding-options";
import { sanitizeText } from "@/utils/sanitize";

const zOptionalNumberField = z.preprocess(
  (value) => {
    if (value === null || value === undefined) {
      return null;
    }
    if (typeof value === "string" && value.trim() === "") {
      return null;
    }
    return value;
  },
  z.coerce.number().min(0).max(100000).nullable(),
);

const zOptionalIntField = z.preprocess(
  (value) => {
    if (value === null || value === undefined) {
      return null;
    }
    if (typeof value === "string" && value.trim() === "") {
      return null;
    }
    return value;
  },
  z.coerce.number().int().min(0).max(100000).nullable(),
);

const upsertSchema = z.object({
  projectId: z.string().uuid(),
  accessNotes: z
    .string()
    .max(2000, "דרכי גישה ארוכות מדי")
    .optional()
    .transform((v) => (v ? sanitizeText(v) : "")),
  carpetCladdingColor: zCladdingSwatchField,
  fabricCladdingColor: zCladdingSwatchField,
  carpetCladdingMeters: zOptionalNumberField.optional(),
  carpetCladdingRolls: zOptionalIntField.optional(),
  fabricCladdingMeters: zOptionalNumberField.optional(),
  fabricCladdingRolls: zOptionalIntField.optional(),
  notes: z
    .string()
    .max(2000, "הערות ארוכות מדי")
    .optional()
    .transform((v) => (v ? sanitizeText(v) : "")),
  submittedByClient: z
    .union([z.string(), z.null(), z.undefined()])
    .transform((v) => v === "on" || v === "true"),
});

function parsePhotoPaths(raw: string): string[] {
  if (!raw.trim()) {
    return [];
  }
  const parts = raw
    .split(/\r?\n/)
    .map((line) => sanitizeText(line.trim()))
    .filter(Boolean);
  return parts.slice(0, 30).map((p) => p.slice(0, 500));
}

export async function upsertProjectSiteDetails(
  payload: unknown,
): Promise<ActionResult<{ updatedAt: string }>> {
  const parsed = upsertSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, message: "יש שדות לא תקינים בפרטי האתר." };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, message: "נדרשת התחברות." };
    }

    const { data: existing } = await supabase
      .from("project_site_details")
      .select("site_photo_paths, sketch_path")
      .eq("project_id", parsed.data.projectId)
      .maybeSingle();

    const sitePhotoPaths = Array.isArray(existing?.site_photo_paths)
      ? existing?.site_photo_paths
      : [];
    const sketchPath =
      typeof existing?.sketch_path === "string" ? existing.sketch_path : null;

    const { data, error } = await supabase
      .from("project_site_details")
      .upsert(
        {
          project_id: parsed.data.projectId,
          access_notes: parsed.data.accessNotes || null,
          cladding_color: null,
          carpet_cladding_color: parsed.data.carpetCladdingColor || null,
          fabric_cladding_color: parsed.data.fabricCladdingColor || null,
          carpet_cladding_meters: parsed.data.carpetCladdingMeters ?? null,
          carpet_cladding_rolls: parsed.data.carpetCladdingRolls ?? null,
          fabric_cladding_meters: parsed.data.fabricCladdingMeters ?? null,
          fabric_cladding_rolls: parsed.data.fabricCladdingRolls ?? null,
          notes: parsed.data.notes || null,
          sketch_path: sketchPath,
          site_photo_paths: sitePhotoPaths,
          submitted_by_client: parsed.data.submittedByClient,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "project_id" },
      )
      .select("updated_at")
      .single();

    if (error || !data) {
      return { success: false, message: getSafeClientErrorMessage() };
    }

    return {
      success: true,
      message: "פרטי האתר נשמרו.",
      data: { updatedAt: data.updated_at as string },
    };
  } catch (error) {
    console.error("upsertProjectSiteDetails failed", toServerError(error));
    return { success: false, message: getSafeClientErrorMessage() };
  }
}

export async function setProjectSitePhotoPathsRawFromForm(
  _prev: ActionResult<{ count: number }> | null,
  formData: FormData,
): Promise<ActionResult<{ count: number }> | null> {
  return setProjectSitePhotoPathsRaw(
    String(formData.get("projectId") ?? ""),
    String(formData.get("raw") ?? ""),
  );
}

export async function setProjectSitePhotoPathsRaw(
  projectId: string,
  raw: string,
): Promise<ActionResult<{ count: number }>> {
  const idParsed = z.string().uuid().safeParse(projectId);
  if (!idParsed.success) {
    return { success: false, message: "מזהה פרויקט לא תקין." };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, message: "נדרשת התחברות." };
    }

    const paths = parsePhotoPaths(raw);

    const { data: row } = await supabase
      .from("project_site_details")
      .select(
        "access_notes, cladding_color, carpet_cladding_color, fabric_cladding_color, carpet_cladding_meters, carpet_cladding_rolls, fabric_cladding_meters, fabric_cladding_rolls, notes, sketch_path, site_photo_paths, submitted_by_client",
      )
      .eq("project_id", idParsed.data)
      .maybeSingle();

    const { error } = await supabase.from("project_site_details").upsert(
      {
        project_id: idParsed.data,
        access_notes: row?.access_notes ?? null,
        cladding_color: row?.cladding_color ?? null,
        carpet_cladding_color: row?.carpet_cladding_color ?? null,
        fabric_cladding_color: row?.fabric_cladding_color ?? null,
        carpet_cladding_meters: row?.carpet_cladding_meters ?? null,
        carpet_cladding_rolls: row?.carpet_cladding_rolls ?? null,
        fabric_cladding_meters: row?.fabric_cladding_meters ?? null,
        fabric_cladding_rolls: row?.fabric_cladding_rolls ?? null,
        notes: row?.notes ?? null,
        sketch_path: row?.sketch_path ?? null,
        site_photo_paths: paths,
        submitted_by_client: row?.submitted_by_client ?? false,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "project_id" },
    );

    if (error) {
      console.error("setProjectSitePhotoPathsRaw db error", error);
      return { success: false, message: getSafeClientErrorMessage() };
    }

    return {
      success: true,
      message: "רשימת נתיבי התמונות עודכנה.",
      data: { count: paths.length },
    };
  } catch (error) {
    console.error("setProjectSitePhotoPathsRaw failed", toServerError(error));
    return { success: false, message: getSafeClientErrorMessage() };
  }
}

export async function upsertProjectSiteDetailsFromForm(
  _prev: ActionResult<{ updatedAt: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ updatedAt: string }> | null> {
  return upsertProjectSiteDetails({
    projectId: formData.get("projectId"),
    accessNotes: formData.get("accessNotes"),
    carpetCladdingColor: formData.get("carpetCladdingColor"),
    fabricCladdingColor: formData.get("fabricCladdingColor"),
    carpetCladdingMeters: formData.get("carpetCladdingMeters"),
    carpetCladdingRolls: formData.get("carpetCladdingRolls"),
    fabricCladdingMeters: formData.get("fabricCladdingMeters"),
    fabricCladdingRolls: formData.get("fabricCladdingRolls"),
    notes: formData.get("notes"),
    submittedByClient: formData.get("submittedByClient"),
  });
}
