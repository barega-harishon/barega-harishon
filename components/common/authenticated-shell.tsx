import { MobileTopBar } from "@/components/common/mobile-top-bar";
import { SettingsGearLink } from "@/components/common/settings-gear-link";
import { SiteSidebar } from "@/components/common/site-sidebar";
import { getCurrentAppRole } from "@/lib/auth/current-profile";
import { buildMainNavItems } from "@/lib/nav/build-main-nav-items";

export async function AuthenticatedShell({ children }: { children: React.ReactNode }) {
  const role = await getCurrentAppRole();
  const items = buildMainNavItems(role);

  return (
    <div className="flex min-h-full flex-1 flex-col lg:ps-64">
      <aside
        className="fixed inset-y-0 start-0 z-40 hidden w-64 max-w-full flex-col border-e border-white/10 bg-header lg:flex"
        aria-label="ניווט ראשי"
      >
        <SiteSidebar items={items} role={role} />
      </aside>
      <MobileTopBar items={items} role={role} />
      <main className="app-authenticated-main flex min-h-0 flex-1 flex-col lg:items-center lg:px-4 xl:px-8">
        <div className="flex w-full max-w-[72rem] flex-1 flex-col">
          <div className="mb-2 hidden justify-end lg:flex">
            <SettingsGearLink className="h-9 w-9" />
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
