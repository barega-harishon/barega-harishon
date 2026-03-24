import { redirect } from "next/navigation";

import { getProjectsDefaultViewPreference } from "@/lib/ui-preferences-server";

export const dynamic = "force-dynamic";

export default async function ProjectsGoPage() {
  const pref = await getProjectsDefaultViewPreference();
  if (pref === "kanban") {
    redirect("/projects/kanban");
  }
  if (pref === "calendar") {
    redirect("/projects/calendar");
  }
  redirect("/projects");
}
