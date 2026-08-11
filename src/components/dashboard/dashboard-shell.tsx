import { GlobalPlayer } from "@/components/audio/GlobalPlayer";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { MobileDashboardHeader } from "@/components/dashboard/mobile-dashboard-header";

export type DashboardShellProps = {
  children: React.ReactNode;
};

export function DashboardShell({ children }: DashboardShellProps) {
  return (
    <div className="min-h-screen lg:pl-[292px]">
      <DashboardSidebar />
      <MobileDashboardHeader />
      <main
        data-testid="dashboard-route-content"
        className="dashboard-shell-main mx-auto w-full max-w-6xl pt-6 sm:pt-8 lg:pt-8"
      >
        {children}
      </main>
      <GlobalPlayer />
    </div>
  );
}
