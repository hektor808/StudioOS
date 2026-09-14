import {
  CalendarBlank,
  ImagesSquare,
  Sparkle,
  Waveform,
} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

const activeModules = [
  {
    href: "/studio",
    label: "Studio",
    linkLabel: "Open Studio",
    Icon: Waveform,
  },
  {
    href: "/operations",
    label: "Operations",
    linkLabel: "Open Operations",
    Icon: CalendarBlank,
  },
  {
    href: "/content",
    label: "Content",
    linkLabel: "Open Content",
    Icon: ImagesSquare,
  },
] as const;

export function DashboardHome() {
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
          The private VEO workspace is ready. Studio, Operations, and Content
          are connected; VEO AI will come online in its dedicated phase.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {activeModules.map(({ href, label, linkLabel, Icon }) => (
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
          </Link>
        ))}

        <article className="rounded-2xl border border-border bg-card/55 p-5 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-container/20 text-primary">
              <Sparkle aria-hidden="true" size={20} weight="duotone" />
            </span>
            <h2 className="font-heading text-lg font-medium">VEO AI</h2>
            <span className="ml-auto text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Coming soon
            </span>
          </div>
        </article>
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
