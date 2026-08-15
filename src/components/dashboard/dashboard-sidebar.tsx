"use client";

import {
  CalendarBlank,
  ImagesSquare,
  Sparkle,
  SquaresFour,
  Waveform,
} from "@phosphor-icons/react";
import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { ThemeToggle } from "@/components/theme/theme-toggle";

const activeDestinations = [
  {
    href: "/",
    label: "Dashboard",
    Icon: SquaresFour,
    matches: (pathname: string) => pathname === "/",
  },
  {
    href: "/studio",
    label: "Studio",
    Icon: Waveform,
    matches: (pathname: string) =>
      pathname === "/studio" || pathname.startsWith("/studio/"),
  },
  {
    href: "/operations",
    label: "Operations",
    Icon: CalendarBlank,
    matches: (pathname: string) => pathname === "/operations",
  },
] as const;

const futureDestinations = [
  { label: "Content", Icon: ImagesSquare },
  { label: "VEO AI", Icon: Sparkle },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const shouldReduceMotion = useReducedMotion();
  const indicatorTransition = shouldReduceMotion
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 400, damping: 30 };

  return (
    <aside className="glass-panel fixed inset-y-8 left-8 z-30 hidden w-[260px] flex-col p-5 lg:flex">
      <div>
        <p className="font-heading text-xl font-semibold">VEO OS</p>
        <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          VEO // PRIVATE NETWORK
        </p>
      </div>

      <nav aria-label="Primary navigation" className="mt-10 grid gap-2">
        {activeDestinations.map(({ href, label, Icon, matches }) => {
          const isActive = matches(pathname);

          return (
            <Link
              key={href}
              href={href}
              prefetch={false}
              aria-current={isActive ? "page" : undefined}
              className={`relative flex min-h-11 items-center gap-3 rounded-2xl px-4 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none ${
                isActive
                  ? "border border-primary-container/40 bg-primary-container text-primary-container-foreground shadow-[0_0_24px_hsl(var(--primary-container)/0.2)]"
                  : "text-muted-foreground hover:bg-background/40 hover:text-foreground"
              }`}
            >
              {isActive ? (
                <motion.span
                  layoutId="dashboard-active-indicator"
                  aria-hidden="true"
                  className="absolute left-0 h-4 w-1 rounded-full bg-primary"
                  transition={indicatorTransition}
                />
              ) : null}
              <Icon aria-hidden="true" size={19} weight="duotone" />
              {label}
            </Link>
          );
        })}

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
