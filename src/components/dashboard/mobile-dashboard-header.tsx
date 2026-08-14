"use client";

import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { ThemeToggle } from "@/components/theme/theme-toggle";

export function MobileDashboardHeader() {
  const pathname = usePathname();
  const shouldReduceMotion = useReducedMotion();
  const isStudio = pathname === "/studio" || pathname.startsWith("/studio/");
  const currentModule = isStudio ? "Studio" : "Dashboard";
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

      <nav aria-label="Primary navigation" className="mt-3 grid grid-cols-2 gap-2">
        {[
          { href: "/", label: "Dashboard", isActive: pathname === "/" },
          { href: "/studio", label: "Studio", isActive: isStudio },
        ].map(({ href, label, isActive }) => (
          <Link
            key={href}
            href={href}
            prefetch={false}
            aria-current={isActive ? "page" : undefined}
            className={`relative flex min-h-10 items-center justify-center rounded-xl px-3 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none ${
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
            <span className="relative">{label}</span>
          </Link>
        ))}
      </nav>
    </header>
  );
}
