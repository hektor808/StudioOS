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

const destinations = [
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
    matches: (pathname: string) =>
      pathname === "/operations" || pathname.startsWith("/operations/"),
  },
  {
    href: "/content",
    label: "Content",
    Icon: ImagesSquare,
    matches: (pathname: string) =>
      pathname === "/content" || pathname.startsWith("/content/"),
  },
  {
    href: "/veo-ai",
    label: "VEO AI",
    Icon: Sparkle,
    matches: (pathname: string) =>
      pathname === "/veo-ai" || pathname.startsWith("/veo-ai/"),
  },
] as const;

export function MobileDashboardHeader() {
  const pathname = usePathname();
  const shouldReduceMotion = useReducedMotion();
  const currentModule =
    destinations.find((destination) => destination.matches(pathname))?.label ??
    "Dashboard";
  const selectionTransition = shouldReduceMotion
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 400, damping: 30 };

  return (
    <header className="ml-[max(1rem,env(safe-area-inset-left))] mr-[max(1rem,env(safe-area-inset-right))] mt-4 rounded-2xl border border-border bg-card/60 px-4 py-3 backdrop-blur-xl lg:hidden">
      <div className="flex min-h-11 items-center justify-between gap-4">
        <div>
          <p className="font-heading text-sm font-semibold">VEO OS</p>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {currentModule}
          </p>
        </div>
        <ThemeToggle />
      </div>

      <nav
        aria-label="Primary navigation"
        className="mt-3 flex gap-2 overflow-x-auto"
      >
        {destinations.map(({ href, label, Icon, matches }) => {
          const isActive = matches(pathname);

          return (
            <Link
              key={href}
              href={href}
              prefetch={false}
              aria-current={isActive ? "page" : undefined}
              className={`relative flex min-h-10 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-3 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none ${
                isActive
                  ? "bg-primary-container text-primary-container-foreground shadow-[0_0_18px_hsl(var(--primary-container)/0.16)]"
                  : "border border-border bg-background/35 text-muted-foreground"
              }`}
            >
              {isActive ? (
                <motion.span
                  layoutId="mobile-dashboard-active-selection"
                  aria-hidden="true"
                  className="absolute inset-0 rounded-xl border border-primary-container/40"
                  transition={selectionTransition}
                />
              ) : null}
              <Icon
                aria-hidden="true"
                size={15}
                weight="duotone"
                className="relative"
              />
              <span className="relative">{label}</span>
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
