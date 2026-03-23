"use server";

import { z } from "zod";

import { getSafeClientErrorMessage, toServerError } from "@/lib/errors";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types/common";
import type { AssignmentRole, ProjectAssignmentLine } from "@/types/assignments";
import type { EmployeeOption } from "@/types/employees";

const roleSchema = z.enum(["team_lead", "driver", "worker"]);

export async function listEmployeeOptionsForAssignments(): Promise<EmployeeOption[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("employees")
    .select("id, name")
    .order("name", { ascending: true });

  if (error || !data) {
    return [];
  }

  return data as EmployeeOption[];
}

export async function listAssignmentsForProject(projectId: string): Promise<ProjectAssignmentLine[]> {
  const parsed = z.string().uuid().safeParse(projectId);
  if (!parsed.success) {
    return [];
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("assignments")
    .select(
      `
      id,
      project_id,
      employee_id,
      role,
      employees ( name )
    `,
    )
    .eq("project_id", parsed.data)
    .order("role", { ascending: true });

  if (error || !data) {
    return [];
  }

  const rows = data as unknown as ProjectAssignmentLine[];
  const roleOrder: Record<AssignmentRole, number> = {
    team_lead: 0,
    driver: 1,
    worker: 2,
  };
  return [...rows].sort(
    (a, b) =>
      roleOrder[a.role as AssignmentRole] - roleOrder[b.role as AssignmentRole] ||
      (a.employees?.name ?? "").localeCompare(b.employees?.name ?? "", "he"),
  );
}

const addSchema = z.object({
  projectId: z.string().uuid(),
  employeeId: z.string().uuid(),
  role: roleSchema,
});

export async function addProjectAssignment(payload: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = addSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, message: "נתוני שיבוץ לא תקינים." };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("assignments")
      .insert({
        project_id: parsed.data.projectId,
        employee_id: parsed.data.employeeId,
        role: parsed.data.role as AssignmentRole,
      })
      .select("id")
      .single();

    if (error) {
      const code = (error as { code?: string }).code;
      if (code === "23505") {
        return {
          success: false,
          message: "העובד כבר משובץ לתפקיד זה בפרויקט.",
        };
      }
      return { success: false, message: getSafeClientErrorMessage() };
    }

    if (!data) {
      return { success: false, message: getSafeClientErrorMessage() };
    }

    return {
      success: true,
      message: "השיבוץ נשמר.",
      data: { id: data.id as string },
    };
  } catch (error) {
    console.error("addProjectAssignment failed", toServerError(error));
    return { success: false, message: getSafeClientErrorMessage() };
  }
}

export async function addProjectAssignmentFromForm(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }> | null> {
  return addProjectAssignment({
    projectId: formData.get("projectId"),
    employeeId: formData.get("employeeId"),
    role: formData.get("role"),
  });
}

const removeSchema = z.object({
  assignmentId: z.string().uuid(),
});

export async function removeProjectAssignment(
  payload: unknown,
): Promise<ActionResult<Record<string, never>>> {
  const parsed = removeSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, message: "בקשה לא תקינה." };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.from("assignments").delete().eq("id", parsed.data.assignmentId);

    if (error) {
      return { success: false, message: getSafeClientErrorMessage() };
    }

    return { success: true, message: "השיבוץ הוסר." };
  } catch (error) {
    console.error("removeProjectAssignment failed", toServerError(error));
    return { success: false, message: getSafeClientErrorMessage() };
  }
}
