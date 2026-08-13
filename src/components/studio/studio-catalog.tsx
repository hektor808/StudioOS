import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type {
  StudioCatalogFilters,
  StudioCatalogResult,
  TrackStatus,
} from "@/lib/studio/types";

const statuses: TrackStatus[] = ["draft", "active", "completed", "cancelled"];
const dateFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
});

type StudioCatalogProps = {
  result: StudioCatalogResult;
  filters: StudioCatalogFilters;
};

export function StudioCatalog({ result, filters }: StudioCatalogProps) {
  const hasFilters = Boolean(filters.query || filters.status);

  return (
    <div className="studio-page-grid grid gap-6">
      <section className="glass-panel p-5 sm:p-6" aria-labelledby="catalog-controls-heading">
        <div className="mb-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
            Catalog controls
          </p>
          <h2 id="catalog-controls-heading" className="mt-2 font-heading text-xl font-semibold">
            Find tracks
          </h2>
        </div>

        <form action="/studio" method="get" className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_13rem_auto_auto] lg:items-end">
          <div className="grid gap-2">
            <label htmlFor="studio-search" className="text-sm font-medium">
              Search tracks
            </label>
            <Input
              id="studio-search"
              name="q"
              type="search"
              defaultValue={filters.query}
              maxLength={160}
            />
          </div>
          <div className="grid gap-2">
            <label htmlFor="studio-status" className="text-sm font-medium">
              Status
            </label>
            <select
              id="studio-status"
              name="status"
              defaultValue={filters.status ?? ""}
              className="h-10 w-full rounded-[10px] border border-input bg-background/50 px-3 text-sm text-foreground shadow-inner shadow-black/5 outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
            >
              <option value="">All statuses</option>
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit">Apply filters</Button>
          {hasFilters ? (
            <Button asChild type="button" variant="glass">
              <Link href="/studio">Clear filters</Link>
            </Button>
          ) : null}
        </form>
      </section>

      <section className="glass-panel p-5 sm:p-6" aria-labelledby="catalog-summary-heading">
        <div className="mb-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
            Status rail
          </p>
          <h2 id="catalog-summary-heading" className="mt-2 font-heading text-xl font-semibold">
            Track status
          </h2>
        </div>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {statuses.map((status) => (
            <li
              key={status}
              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background/35 px-3 py-2 text-sm"
            >
              <span>{status}</span>
              <strong className="font-heading">{result.statusCounts[status]}</strong>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="catalog-tracks-heading">
        <div className="mb-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
            Private catalog
          </p>
          <h2 id="catalog-tracks-heading" className="mt-2 font-heading text-xl font-semibold">
            Tracks
          </h2>
        </div>

        {result.tracks.length === 0 ? (
          <div className="glass-panel p-6 sm:p-8">
            <h3 className="font-heading text-xl font-semibold">Studio is connected but empty</h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Create a track to begin the private Studio catalog. Playback becomes available after a version is registered.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {result.tracks.map((track) => {
              const versionLabel = track.latestVersion
                ? `V${track.latestVersion.versionNumber} · ${track.latestVersion.status}`
                : "No versions registered";

              return (
                <Link
                  key={track.id}
                  href={`/studio/${track.id}`}
                  className="glass-panel grid gap-4 p-5 outline-none transition-colors hover:border-primary/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="min-w-0 font-heading text-lg font-semibold">{track.title}</h3>
                    <span className="shrink-0 rounded-full bg-primary-container/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-primary">
                      {track.status}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{versionLabel}</p>
                  <dl className="grid gap-1 text-sm text-muted-foreground">
                    <div className="flex justify-between gap-3">
                      <dt>Created by</dt>
                      <dd className="text-right text-foreground">{track.createdBy.fullName}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt>Last activity</dt>
                      <dd className="text-right text-foreground">
                        {dateFormatter.format(new Date(track.lastActivityAt))}
                      </dd>
                    </div>
                  </dl>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
