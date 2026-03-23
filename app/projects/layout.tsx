import { AuthenticatedShell } from "@/components/common/authenticated-shell";

export const dynamic = "force-dynamic";

export default async function ProjectsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthenticatedShell>{children}</AuthenticatedShell>;
}
