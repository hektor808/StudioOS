import Link from "next/link";
import { ArrowSquareOut } from "@phosphor-icons/react/dist/ssr";

import { ContentIdeaForm } from "@/components/content/content-idea-form";
import type {
  ContentDifficulty,
  ContentIdea,
  ContentPageData,
  ContentStatus,
} from "@/lib/content/types";

const STATUS_OPTIONS: readonly { value: ContentStatus | null; label: string }[] =
  [
    { value: null, label: "All" },
    { value: "idea", label: "Idea" },
    { value: "planned", label: "Planned" },
    { value: "in_production", label: "In production" },
    { value: "published", label: "Published" },
    { value: "archived", label: "Archived" },
  ];

const STATUS_LABELS: Record<ContentStatus, string> = {
  idea: "Idea",
  planned: "Planned",
  in_production: "In production",
  published: "Published",
  archived: "Archived",
};

const DIFFICULTY_LABELS: Record<ContentDifficulty, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

const dateFormatter = new Intl.DateTimeFormat("en", { dateStyle: "medium" });

const filterLinkBaseClass =
  "rounded-lg border px-3 py-2 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring";

function statusClass(status: ContentStatus): string {
  if (status === "published") return "bg-primary-container/25 text-primary";
  if (status === "archived") return "bg-muted text-muted-foreground";
  if (status === "in_production") {
    return "bg-amber-500/15 text-amber-700 dark:text-amber-300";
  }
  if (status === "planned") {
    return "bg-sky-500/15 text-sky-700 dark:text-sky-300";
  }
  return "bg-violet-500/15 text-violet-700 dark:text-violet-300";
}

function filterLinkClass(isActive: boolean): string {
  return `${filterLinkBaseClass} ${
    isActive
      ? "border-primary bg-primary-container/20 text-primary"
      : "border-border text-muted-foreground hover:text-foreground"
  }`;
}

function hrefFor(
  platform: string | null,
  status: ContentStatus | null,
): string {
  const query = new URLSearchParams();
  if (platform) query.set("platform", platform);
  if (status) query.set("status", status);

  const serialized = query.toString();
  return serialized ? `/content?${serialized}` : "/content";
}

function titleInitial(title: string): string {
  return (title.trim().charAt(0) || "\u00B7").toUpperCase();
}

function IdeaCard({ idea }: { idea: ContentIdea }) {
  return (
    <article className="glass-panel rounded-2xl p-5">
      <div className="flex items-start gap-3">
        <div
          aria-hidden="true"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-container/20 font-heading text-lg font-semibold text-primary"
        >
          {titleInitial(idea.title)}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="break-words font-medium">{idea.title}</h3>
          <p className="mt-1 break-words text-sm text-muted-foreground">
            {idea.platform} · {DIFFICULTY_LABELS[idea.difficulty]} difficulty
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] ${statusClass(idea.status)}`}
        >
          {STATUS_LABELS[idea.status]}
        </span>
      </div>

      {idea.notes ? (
        <p className="mt-3 line-clamp-3 whitespace-pre-wrap break-words text-sm leading-6 text-muted-foreground">
          {idea.notes}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
        {idea.referenceUrl && idea.referenceHost ? (
          <a
            href={idea.referenceUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md font-medium text-primary outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ArrowSquareOut aria-hidden="true" size={14} />
            {idea.referenceHost}
          </a>
        ) : null}
        <span className="ml-auto">
          {idea.createdBy} · Updated{" "}
          {dateFormatter.format(new Date(idea.updatedAt))}
        </span>
      </div>

      <details className="mt-4 border-t border-border pt-4">
        <summary className="cursor-pointer text-sm font-medium text-primary outline-none focus-visible:ring-2 focus-visible:ring-ring">
          Edit idea
        </summary>
        <div className="mt-4">
          <ContentIdeaForm idea={idea} />
        </div>
      </details>
    </article>
  );
}

export function ContentBoard({ data }: { data: ContentPageData }) {
  const ideaCount = data.ideas.length;
  const hasActiveFilters = Boolean(data.filters.platform || data.filters.status);

  return (
    <section className="grid gap-6" aria-labelledby="content-heading">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
            Private workspace
          </p>
          <h1
            id="content-heading"
            className="mt-2 font-heading text-3xl font-semibold tracking-tight sm:text-4xl"
          >
            Content
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {ideaCount} {ideaCount === 1 ? "idea" : "ideas"}
          </p>
        </div>
      </header>

      <section
        className="glass-panel grid gap-4 p-5 sm:p-6"
        aria-labelledby="new-idea-heading"
      >
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
            Plan
          </p>
          <h2
            id="new-idea-heading"
            className="mt-2 font-heading text-xl font-semibold"
          >
            Add an idea
          </h2>
        </div>
        <ContentIdeaForm />
      </section>

      <div className="grid gap-3">
        <nav aria-label="Platform filters" className="flex flex-wrap gap-2">
          <Link
            href={hrefFor(null, data.filters.status)}
            aria-current={data.filters.platform === null ? "page" : undefined}
            className={filterLinkClass(data.filters.platform === null)}
          >
            All
          </Link>
          {data.platforms.map((platform) => {
            const isActive = data.filters.platform === platform;
            return (
              <Link
                key={platform}
                href={hrefFor(platform, data.filters.status)}
                aria-current={isActive ? "page" : undefined}
                className={filterLinkClass(isActive)}
              >
                {platform}
              </Link>
            );
          })}
        </nav>

        <nav aria-label="Status filters" className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((option) => {
            const isActive = data.filters.status === option.value;
            return (
              <Link
                key={option.label}
                href={hrefFor(data.filters.platform, option.value)}
                aria-current={isActive ? "page" : undefined}
                className={filterLinkClass(isActive)}
              >
                {option.label}
              </Link>
            );
          })}
        </nav>

        {hasActiveFilters ? (
          <div>
            <Link
              href="/content"
              className={`${filterLinkBaseClass} inline-block border-border text-muted-foreground hover:text-foreground`}
            >
              Clear filters
            </Link>
          </div>
        ) : null}
      </div>

      {data.ideas.length ? (
        <div className="content-board-grid grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.ideas.map((idea) => (
            <IdeaCard key={idea.id} idea={idea} />
          ))}
        </div>
      ) : (
        <section className="glass-panel p-5 text-sm text-muted-foreground sm:p-6">
          No content ideas match these filters. Create an idea or clear the
          filters.
        </section>
      )}
    </section>
  );
}
