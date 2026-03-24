import { FieldMobileTopBar } from "@/components/field/field-mobile-top-bar";
import { FieldSidebar } from "@/components/field/field-sidebar";

export function FieldAppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-col bg-background pb-[env(safe-area-inset-bottom,0px)] pt-[env(safe-area-inset-top,0px)] lg:ps-64">
      <aside
        className="fixed inset-y-0 start-0 z-40 hidden w-64 max-w-full flex-col border-e border-white/10 bg-header lg:flex"
        aria-label="ניווט שטח"
      >
        <FieldSidebar />
      </aside>
      <FieldMobileTopBar />
      <main className="app-authenticated-main flex min-h-0 flex-1 flex-col lg:items-center lg:px-4 xl:px-8">
        <div className="flex w-full max-w-[72rem] flex-1 flex-col">{children}</div>
      </main>
    </div>
  );
}
