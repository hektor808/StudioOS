import {
  CalendarBlank,
  ImagesSquare,
  Sparkle,
  Waveform,
} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

import type { DashboardSummaryResult } from "@/lib/dashboard/queries";

type DashboardHomeProps = {
  summaryResult?: DashboardSummaryResult;
};

export function DashboardHome({
  summaryResult = { state: "unavailable" },
}: DashboardHomeProps) {
  const ready = summaryResult.state === "ready" ? summaryResult.summary : null;

  const modules = [
    {
      href: "/studio",
      label: "Studio",
      linkLabel: "Open Studio",
      Icon: Waveform,
      counts: ready
        ? [
            ready.trackCount === 0
              ? "No tracks yet"
              : `${ready.trackCount} tracks`,
            ready.unresolvedCommentCount === 0
              ? "No unresolved comments"
              : `${ready.unresolvedCommentCount} unresolved comments`,
          ]
        : [],
    },
    {
      href: "/operations",
      label: "Operations",
      linkLabel: "Open Operations",
      Icon: CalendarBlank,
      counts: ready
        ? [
            ready.upcomingActionCount === 0
              ? "No upcoming actions"
              : `${ready.upcomingActionCount} upcoming actions`,
          ]
        : [],
    },
    {
      href: "/content",
      label: "Content",
      linkLabel: "Open Content",
      Icon: ImagesSquare,
      counts: ready
        ? [
            ready.contentIdeaCount === 0
              ? "No content ideas"
              : `${ready.contentIdeaCount} content ideas`,
          ]
        : [],
    },
    {
      href: "/veo-ai",
      label: "VEO AI",
      linkLabel: "Open VEO AI",
      Icon: Sparkle,
      counts: [],
    },
  ] as const;

  return (
    <section aria-labelledby="dashboard-heading" className="grid gap-6">
      <div className="glass-panel overflow-hidden p-6 sm:p-8">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
          Private workspace
        </p>
        <h1
          id="dashboard-heading"
          className="mt-3 max-w-3xl font-heading text-3xl font-semibold tracking-tight sm:text-4xl"
        >
          Studio command center
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
          The private VEO workspace is ready. Studio, Operations, Content, and
          VEO AI are connected.
        </p>
        {summaryResult.state === "unavailable" ? (
          <p role="status" className="mt-4 text-sm text-muted-foreground">
            Dashboard data is temporarily unavailable.
          </p>
        ) : null}
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {modules.map(({ href, label, linkLabel, Icon, counts }) => (
          <Link
            key={href}
            href={href}
            prefetch={false}
            className="rounded-2xl border border-border bg-card/55 p-5 outline-none transition-colors hover:border-primary/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-container/20 text-primary">
                <Icon aria-hidden="true" size={20} weight="duotone" />
              </span>
              <h2 className="font-heading text-lg font-medium">{label}</h2>
              <span className="ml-auto text-[10px] font-semibold uppercase tracking-[0.08em] text-primary">
                {linkLabel}
              </span>
            </div>
            {counts.length > 0 ? (
              <ul className="mt-3 grid gap-1 text-sm text-muted-foreground">
                {counts.map((count) => (
                  <li key={count}>{count}</li>
                ))}
              </ul>
            ) : null}
          </Link>
        ))}
      </div>

      <article className="glass-panel p-6 sm:p-8">
        <h2 className="font-heading text-xl font-medium">
          Studio catalog connected
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Tracks, versions, and production files live in Studio. The player
          dock stays mounted across every module.
        </p>
      </article>
    </section>
  );
}
