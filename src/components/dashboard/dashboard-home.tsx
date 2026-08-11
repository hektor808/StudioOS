import {
  CalendarBlank,
  ImagesSquare,
  Sparkle,
  Waveform,
} from "@phosphor-icons/react/dist/ssr";

const modules = [
  { label: "Studio", Icon: Waveform },
  { label: "Operations", Icon: CalendarBlank },
  { label: "Content", Icon: ImagesSquare },
  { label: "VEO AI", Icon: Sparkle },
];

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
          The private VEO workspace is ready. Studio catalog, operations,
          content, and VEO AI modules will come online in their dedicated
          phases.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {modules.map(({ label, Icon }) => (
          <article
            key={label}
            className="rounded-2xl border border-border bg-card/55 p-5 backdrop-blur-xl"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-container/20 text-primary">
                <Icon aria-hidden="true" size={20} weight="duotone" />
              </span>
              <h2 className="font-heading text-lg font-medium">{label}</h2>
              <span className="ml-auto text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Coming soon
              </span>
            </div>
          </article>
        ))}
      </div>

      <article className="glass-panel p-6 sm:p-8">
        <h2 className="font-heading text-xl font-medium">
          Listening layer ready
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Tracks will appear here when the Studio catalog is connected.
        </p>
      </article>
    </section>
  );
}
