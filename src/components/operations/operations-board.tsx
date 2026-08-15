import Link from "next/link";

import { ActionForm } from "@/components/operations/action-form";
import type {
  ActionStatus,
  OperationsAction,
  OperationsFilters,
  OperationsPageData,
} from "@/lib/operations/types";

const STATUS_OPTIONS: readonly { value: ActionStatus | null; label: string }[] = [
  { value: null, label: "All" },
  { value: "planned", label: "Planned" },
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const ACTION_STATUSES = [
  "planned",
  "in_progress",
  "completed",
  "cancelled",
] as const satisfies readonly ActionStatus[];

type OperationsBoardProps =
  | { data: OperationsPageData; filters?: never; configurationError?: never }
  | {
      data?: never;
      filters: OperationsFilters;
      configurationError: string;
    };

type AgendaGroup = {
  date: string;
  label: string;
  actions: OperationsAction[];
};

function statusLabel(status: ActionStatus): string {
  return status === "in_progress"
    ? "In progress"
    : `${status.charAt(0).toUpperCase()}${status.slice(1)}`;
}

function statusClass(status: ActionStatus): string {
  if (status === "completed") return "bg-primary-container/25 text-primary";
  if (status === "cancelled") return "bg-muted text-muted-foreground";
  if (status === "in_progress") return "bg-amber-500/15 text-amber-700 dark:text-amber-300";
  return "bg-sky-500/15 text-sky-700 dark:text-sky-300";
}

function partsFor(iso: string, timeZone: string): Record<string, string> {
  const instant = new Date(iso);
  const values: Record<string, string> = {};
  if (Number.isNaN(instant.getTime())) return values;

  for (const part of new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant)) {
    if (["year", "month", "day"].includes(part.type)) values[part.type] = part.value;
  }

  return values;
}

function agendaDateKey(iso: string, timeZone: string): string {
  const parts = partsFor(iso, timeZone);
  return parts.year && parts.month && parts.day
    ? `${parts.year}-${parts.month}-${parts.day}`
    : "unavailable";
}

function formatDate(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

function formatTime(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

function hrefFor(month: string, status: ActionStatus | null): string {
  const query = new URLSearchParams({ month });
  if (status) query.set("status", status);
  return `/operations?${query.toString()}`;
}

function groupAgenda(
  actions: OperationsAction[],
  timeZone: string,
): AgendaGroup[] {
  const groups = new Map<string, AgendaGroup>();

  for (const action of actions) {
    const date = agendaDateKey(action.eventDate, timeZone);
    const current = groups.get(date);
    if (current) {
      current.actions.push(action);
      continue;
    }

    groups.set(date, {
      date,
      label: formatDate(action.eventDate, timeZone),
      actions: [action],
    });
  }

  return Array.from(groups.values());
}

function ActionCard({ action, timeZone }: { action: OperationsAction; timeZone: string }) {
  return (
    <article className={`rounded-xl border bg-background/35 p-4 ${action.isOverdue ? "border-destructive/70" : "border-border"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="break-words font-medium">{action.title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{formatTime(action.eventDate, timeZone)} · Created by {action.createdBy}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] ${statusClass(action.status)}`}>
          {statusLabel(action.status)}
        </span>
      </div>
      {action.description ? <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{action.description}</p> : null}
      {action.isOverdue ? <p className="mt-3 rounded-lg border border-destructive/60 bg-destructive/10 px-3 py-2 text-sm text-destructive">Overdue — this action remains {statusLabel(action.status).toLowerCase()}.</p> : null}
      <details className="mt-4 border-t border-border pt-4">
        <summary className="cursor-pointer text-sm font-medium text-primary outline-none focus-visible:ring-2 focus-visible:ring-ring">Edit action</summary>
        <div className="mt-4"><ActionForm action={action} timeZone={timeZone} /></div>
      </details>
    </article>
  );
}

function ConfigurationErrorBoard({ filters, message }: { filters: OperationsFilters; message: string }) {
  return (
    <section className="grid gap-6" aria-labelledby="operations-heading">
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">Private workspace</p>
        <h1 id="operations-heading" className="mt-2 font-heading text-3xl font-semibold tracking-tight sm:text-4xl">Operations</h1>
      </header>
      <section className="glass-panel grid gap-4 p-5 sm:p-6" aria-labelledby="operations-configuration-heading">
        <h2 id="operations-configuration-heading" className="font-heading text-xl font-semibold">Operations configuration is required</h2>
        <p className="text-sm text-destructive" role="alert">{message}</p>
        <p className="text-sm text-muted-foreground">Operations data is unavailable until a valid IANA time zone is configured.</p>
        <div className="flex flex-wrap gap-3">
          <Link href={hrefFor(filters.month, filters.status)} className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-primary outline-none focus-visible:ring-2 focus-visible:ring-ring">Current month</Link>
        </div>
      </section>
    </section>
  );
}

export function OperationsBoard(props: OperationsBoardProps) {
  if (!props.data) {
    return <ConfigurationErrorBoard filters={props.filters} message={props.configurationError} />;
  }

  const { data } = props;
  const agendaGroups = groupAgenda(data.agenda, data.timeZone);

  return (
    <section className="grid gap-6" aria-labelledby="operations-heading">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">Private workspace</p>
          <h1 id="operations-heading" className="mt-2 font-heading text-3xl font-semibold tracking-tight sm:text-4xl">Operations</h1>
          <p className="mt-2 text-sm text-muted-foreground">Time zone: {data.timeZone}</p>
        </div>
        <div className="flex items-center gap-2" aria-label="Month navigation">
          <Link href={hrefFor(data.previousMonth, data.filters.status)} className="rounded-lg border border-border px-3 py-2 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring">Previous</Link>
          <Link href={hrefFor(data.nextMonth, data.filters.status)} className="rounded-lg border border-border px-3 py-2 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring">Next</Link>
        </div>
      </header>

      <section className="glass-panel grid gap-4 p-5 sm:p-6" aria-labelledby="schedule-action-heading">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">Schedule</p>
          <h2 id="schedule-action-heading" className="mt-2 font-heading text-xl font-semibold">Add an action</h2>
        </div>
        <ActionForm timeZone={data.timeZone} />
      </section>

      <section className="glass-panel grid gap-4 p-5 sm:p-6" aria-labelledby="next-up-heading">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">Next up</p>
            <h2 id="next-up-heading" className="mt-2 font-heading text-xl font-semibold">{data.upcoming.length} upcoming {data.upcoming.length === 1 ? "action" : "actions"}</h2>
          </div>
        </div>
        {data.upcoming.length ? <ol className="grid gap-3">{data.upcoming.map((action) => <li key={action.id} className="rounded-xl border border-border bg-background/35 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-medium">{action.title}</p><p className="mt-1 text-sm text-muted-foreground">{formatDate(action.eventDate, data.timeZone)} · {formatTime(action.eventDate, data.timeZone)}</p></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] ${statusClass(action.status)}`}>{statusLabel(action.status)}</span></div></li>)}</ol> : <p className="text-sm text-muted-foreground">No upcoming planned or in-progress actions.</p>}
      </section>

      <nav aria-label="Action status filters" className="flex flex-wrap gap-2">
        {STATUS_OPTIONS.map((option) => {
          const isActive = data.filters.status === option.value;
          return <Link key={option.label} href={hrefFor(data.filters.month, option.value)} aria-current={isActive ? "page" : undefined} className={`rounded-lg border px-3 py-2 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring ${isActive ? "border-primary bg-primary-container/20 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}>{option.label}</Link>;
        })}
      </nav>

      <div className="grid gap-6">
        <section className="order-1 grid gap-5 md:order-2" aria-labelledby="agenda-heading">
          <div><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">Agenda</p><h2 id="agenda-heading" className="mt-2 font-heading text-xl font-semibold">Monthly schedule</h2></div>
          {agendaGroups.length ? <div className="grid gap-6">{agendaGroups.map((group) => <section key={group.date} id={`agenda-${group.date}`} className="glass-panel grid gap-3 p-5 sm:p-6" aria-labelledby={`agenda-heading-${group.date}`}><h3 id={`agenda-heading-${group.date}`} className="font-heading text-lg font-semibold">{group.label}</h3><div className="grid gap-3">{group.actions.map((action) => <ActionCard key={action.id} action={action} timeZone={data.timeZone} />)}</div></section>)}</div> : <section className="glass-panel p-5 text-sm text-muted-foreground sm:p-6">No actions are scheduled for this month. Use the form to schedule the first action.</section>}
        </section>

        <section className="order-2 glass-panel grid gap-5 p-5 sm:p-6 md:order-1" aria-labelledby="calendar-heading">
          <div><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">Calendar</p><h2 id="calendar-heading" className="mt-2 font-heading text-xl font-semibold">{data.monthLabel}</h2></div>
          <div className="hidden md:grid md:grid-cols-7 md:gap-2">
            {WEEKDAYS.map((weekday) => <div key={weekday} className="px-2 text-center text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">{weekday}</div>)}
            {data.calendar.map((day) => {
              const actionCount = day.actionIds.length;
              const countLabel = ACTION_STATUSES.filter((status) => day.statusCounts[status]).map((status) => `${day.statusCounts[status]} ${statusLabel(status).toLowerCase()}`).join(", ");
              return <Link key={day.date} href={`#agenda-${day.date}`} className={`min-h-24 rounded-xl border p-2 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring ${day.inCurrentMonth ? "border-border bg-background/35 hover:bg-accent/50" : "border-border/50 bg-background/10 text-muted-foreground"}`}><span className="text-sm font-medium">{day.dayNumber}</span>{actionCount ? <span className="mt-3 block rounded-md bg-primary-container/15 px-2 py-1 text-xs text-primary">{countLabel}</span> : <span className="sr-only">No actions</span>}</Link>;
            })}
          </div>
          <p className="text-sm text-muted-foreground md:hidden">The monthly calendar is available on wider screens. The agenda above is optimized for this device.</p>
        </section>
      </div>
    </section>
  );
}
