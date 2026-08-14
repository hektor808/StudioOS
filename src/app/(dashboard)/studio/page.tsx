import { CreateTrackForm } from "@/components/studio/create-track-form";
import { StudioCatalog } from "@/components/studio/studio-catalog";
import { SupabasePublicEnvironmentError } from "@/lib/supabase/env";
import { getStudioCatalog } from "@/lib/studio/queries";
import type { StudioCatalogFilters, TrackStatus } from "@/lib/studio/types";

const allowedStatuses = new Set<TrackStatus>([
  "draft",
  "active",
  "completed",
  "cancelled",
]);

type StudioPageProps = {
  searchParams?: { q?: string | string[]; status?: string | string[] };
};

function oneSearchParam(value: string | string[] | undefined) {
  return typeof value === "string" ? value : "";
}

export default async function StudioPage({ searchParams }: StudioPageProps) {
  const query = oneSearchParam(searchParams?.q).trim().slice(0, 160);
  const statusValue = oneSearchParam(searchParams?.status);
  const filters: StudioCatalogFilters = {
    query,
    status: allowedStatuses.has(statusValue as TrackStatus)
      ? (statusValue as TrackStatus)
      : null,
  };

  let result;

  try {
    result = await getStudioCatalog(filters);
  } catch (error) {
    if (error instanceof SupabasePublicEnvironmentError) {
      return (
        <section
          className="glass-panel grid gap-3 p-6 sm:p-8"
          aria-labelledby="studio-configuration-heading"
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
            Studio
          </p>
          <h1
            id="studio-configuration-heading"
            className="font-heading text-2xl font-semibold"
          >
            Studio configuration is required
          </h1>
          <p className="text-sm text-muted-foreground">
            Supabase environment is not configured.
          </p>
        </section>
      );
    }

    throw error;
  }

  return (
    <section className="grid gap-6" aria-labelledby="studio-heading">
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
          Private workspace
        </p>
        <h1
          id="studio-heading"
          className="mt-2 font-heading text-3xl font-semibold tracking-tight sm:text-4xl"
        >
          Studio catalog
        </h1>
      </header>
      <CreateTrackForm />
      <StudioCatalog result={result} filters={filters} />
    </section>
  );
}
