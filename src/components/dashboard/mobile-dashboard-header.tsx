import { ThemeToggle } from "@/components/theme/theme-toggle";

export function MobileDashboardHeader() {
  return (
    <header className="ml-[max(1rem,env(safe-area-inset-left))] mr-[max(1rem,env(safe-area-inset-right))] mt-4 flex min-h-14 items-center justify-between rounded-2xl border border-border bg-card/60 px-4 backdrop-blur-xl lg:hidden">
      <div>
        <p className="font-heading text-sm font-semibold">VEO OS</p>
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Dashboard
        </p>
      </div>
      <ThemeToggle />
    </header>
  );
}
