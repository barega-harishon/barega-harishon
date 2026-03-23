import { FieldAppShell } from "@/components/field/field-app-shell";

export const dynamic = "force-dynamic";

export default function FieldLayout({ children }: { children: React.ReactNode }) {
  return <FieldAppShell>{children}</FieldAppShell>;
}
