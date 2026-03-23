import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * RPC ב-Postgres (`SECURITY DEFINER`) — ראו `20260324160000_truck_status_sync_rpc.sql`.
 * טריגרים על `project_trucks` ועל `projects.status` מרעננים אוטומטית; נשאר קריאה מהאפליקציה
 * אחרי עדכון טופס משאית (`updateTruck`) כי שם לא משתנה `project_trucks`.
 */
export async function refreshTruckStatusFromProjectsRpc(truckId: string): Promise<void> {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("refresh_truck_status_from_projects", {
    p_truck_id: truckId,
  });
  if (error) {
    console.error("refresh_truck_status_from_projects RPC failed", error);
  }
}
