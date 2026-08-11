import {
  CalendarBlank,
  ImagesSquare,
  Sparkle,
  SquaresFour,
  Waveform,
} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

import { ThemeToggle } from "@/components/theme/theme-toggle";

const futureDestinations = [
  { label: "Studio", Icon: Waveform },
  { label: "Operations", Icon: CalendarBlank },
  { label: "Content", Icon: ImagesSquare },
  { label: "VEO AI", Icon: Sparkle },
];

export function DashboardSidebar() {
  return (
    <aside className="glass-panel fixed inset-y-8 left-8 z-30 hidden w-[260px] flex-col p-5 lg:flex">
      <div>
        <p className="font-heading text-xl font-semibold">VEO OS</p>
        <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          VEO // PRIVATE NETWORK
        </p>
      </div>

      <nav aria-label="Primary navigation" className="mt-10 grid gap-2">
        <Link
          href="/"
          aria-current="page"
          className="relative flex min-h-11 items-center gap-3 rounded-2xl border border-primary-container/40 bg-primary-container px-4 text-sm font-medium text-primary-container-foreground shadow-[0_0_24px_hsl(var(--primary-container)/0.2)] outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span
            aria-hidden="true"
            className="absolute left-0 h-4 w-1 rounded-full bg-primary"
          />
          <SquaresFour aria-hidden="true" size={19} weight="duotone" />
          Dashboard
        </Link>

        {futureDestinations.map(({ label, Icon }) => (
          <div
            key={label}
            className="flex min-h-11 items-center gap-3 rounded-2xl px-4 text-sm text-muted-foreground"
          >
            <Icon aria-hidden="true" size={19} weight="duotone" />
            <span>{label}</span>
            <span className="ml-auto text-[10px] font-semibold uppercase tracking-[0.08em]">
              Coming soon
            </span>
          </div>
        ))}
      </nav>

      <div className="mt-auto flex items-center justify-between border-t border-border pt-5">
        <span className="text-xs text-muted-foreground">Interface theme</span>
        <ThemeToggle />
      </div>
    </aside>
  );
}
