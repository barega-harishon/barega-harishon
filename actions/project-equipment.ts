"use server";

import { z } from "zod";

import { getSafeClientErrorMessage, toServerError } from "@/lib/errors";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types/common";
import type {
  EquipmentAvailability,
  EquipmentOption,
  ProjectEquipmentLine,
} from "@/types/project-equipment";

function readProjectStatus(projects: unknown): string | undefined {
  if (!projects || typeof projects !== "object") {
    return undefined;
  }
  if (Array.isArray(projects)) {
    const first = projects[0];
    if (first && typeof first === "object" && "status" in first) {
      return String((first as { status: string }).status);
    }
    return undefined;
  }
  if ("status" in projects) {
    return String((projects as { status: string }).status);
  }
  return undefined;
}

export async function listEquipmentOptions(): Promise<EquipmentOption[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("equipment")
    .select("id, name, category, total_qty")
    .order("name", { ascending: true });

  if (error || !data) {
    return [];
  }

  return data as EquipmentOption[];
}

export async function getEquipmentAvailabilityMap(): Promise<
  Record<string, EquipmentAvailability>
> {
  const supabase = await createServerSupabaseClient();

  const [{ data: equipment }, { data: lines }] = await Promise.all([
    supabase.from("equipment").select("id, total_qty"),
    supabase
      .from("project_equipment")
      .select("id, equipment_id, quantity, projects!inner(status)"),
  ]);

  const allocated: Record<string, number> = {};

  for (const line of lines ?? []) {
    const row = line as {
      equipment_id: string;
      quantity: number;
      projects: unknown;
    };
    const status = readProjectStatus(row.projects);

    if (status === "closed") {
      continue;
    }

    const equipmentId = row.equipment_id;
    allocated[equipmentId] = (allocated[equipmentId] ?? 0) + Number(row.quantity);
  }

  const map: Record<string, EquipmentAvailability> = {};

  for (const item of equipment ?? []) {
    const id = item.id as string;
    const totalQty = Number(item.total_qty);
    const used = allocated[id] ?? 0;
    map[id] = {
      totalQty,
      allocated: used,
      available: Math.max(0, totalQty - used),
    };
  }

  return map;
}

export async function listProjectEquipmentLines(
  projectId: string,
): Promise<ProjectEquipmentLine[]> {
  const parsed = z.string().uuid().safeParse(projectId);
  if (!parsed.success) {
    return [];
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("project_equipment")
    .select(
      `
      id,
      quantity,
      picked_qty,
      equipment_id,
      equipment:equipment_id ( id, name, category, total_qty )
    `,
    )
    .eq("project_id", parsed.data)
    .order("id", { ascending: true });

  if (error || !data) {
    return [];
  }

  return data as unknown as ProjectEquipmentLine[];
}

async function allocatedExceptLine(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  equipmentId: string,
  excludeLineId?: string,
): Promise<number> {
  const { data } = await supabase
    .from("project_equipment")
    .select("id, quantity, projects!inner(status)")
    .eq("equipment_id", equipmentId);

  let sum = 0;

  for (const line of data ?? []) {
    const row = line as {
      id: string;
      quantity: number;
      projects: unknown;
    };
    const status = readProjectStatus(row.projects);

    if (status === "closed") {
      continue;
    }

    if (excludeLineId && row.id === excludeLineId) {
      continue;
    }

    sum += Number(row.quantity);
  }

  return sum;
}

const upsertLineSchema = z.object({
  projectId: z.string().uuid(),
  equipmentId: z.string().uuid(),
  quantity: z.coerce.number().int().min(1, "כמות חייבת להיות לפחות 1").max(50000),
});

export async function upsertProjectEquipmentLine(
  payload: unknown,
): Promise<ActionResult<{ id: string }>> {
  const parsed = upsertLineSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, message: "נתוני ציוד לא תקינים." };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, message: "נדרשת התחברות." };
    }

    const { data: equip, error: equipError } = await supabase
      .from("equipment")
      .select("total_qty")
      .eq("id", parsed.data.equipmentId)
      .maybeSingle();

    if (equipError || !equip) {
      return { success: false, message: "פריט הציוד לא נמצא." };
    }

    const totalQty = Number(equip.total_qty);

    const { data: existing } = await supabase
      .from("project_equipment")
      .select("id")
      .eq("project_id", parsed.data.projectId)
      .eq("equipment_id", parsed.data.equipmentId)
      .maybeSingle();

    const excludeId = existing?.id as string | undefined;
    const others = await allocatedExceptLine(
      supabase,
      parsed.data.equipmentId,
      excludeId,
    );

    if (others + parsed.data.quantity > totalQty) {
      return {
        success: false,
        message: "אין מספיק כמות זמינה בפריט זה לפי המלאי והשיבוצים הפעילים.",
      };
    }

    const { data, error } = await supabase
      .from("project_equipment")
      .upsert(
        {
          project_id: parsed.data.projectId,
          equipment_id: parsed.data.equipmentId,
          quantity: parsed.data.quantity,
        },
        { onConflict: "project_id,equipment_id" },
      )
      .select("id")
      .single();

    if (error || !data) {
      return { success: false, message: getSafeClientErrorMessage() };
    }

    return {
      success: true,
      message: "שורת הציוד נשמרה.",
      data: { id: data.id as string },
    };
  } catch (error) {
    console.error("upsertProjectEquipmentLine failed", toServerError(error));
    return { success: false, message: getSafeClientErrorMessage() };
  }
}

export async function upsertProjectEquipmentLineFromForm(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }> | null> {
  return upsertProjectEquipmentLine({
    projectId: formData.get("projectId"),
    equipmentId: formData.get("equipmentId"),
    quantity: formData.get("quantity"),
  });
}

const removeLineSchema = z.object({
  lineId: z.string().uuid(),
});

export async function removeProjectEquipmentLine(
  payload: unknown,
): Promise<ActionResult<Record<string, never>>> {
  const parsed = removeLineSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, message: "בקשה לא תקינה." };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase
      .from("project_equipment")
      .delete()
      .eq("id", parsed.data.lineId);

    if (error) {
      return { success: false, message: getSafeClientErrorMessage() };
    }

    return { success: true, message: "שורת הציוד הוסרה." };
  } catch (error) {
    console.error("removeProjectEquipmentLine failed", toServerError(error));
    return { success: false, message: getSafeClientErrorMessage() };
  }
}
