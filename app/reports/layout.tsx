import { AuthenticatedShell } from "@/components/common/authenticated-shell";

export const dynamic = "force-dynamic";

export default function ReportsLayout({ children }: { children: React.ReactNode }) {
  return <AuthenticatedShell>{children}</AuthenticatedShell>;
}
