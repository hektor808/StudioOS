import "server-only";

import { createClient } from "@/lib/supabase/server";
import {
  formatInOperationsTimeZone,
  getZonedDateParts,
  localDateTimeToUtc,
} from "@/lib/operations/time-zone";
import type {
  ActionStatus,
  OperationsAction,
  OperationsCalendarDay,
  OperationsFilters,
  OperationsPageData,
} from "@/lib/operations/types";

const OPERATIONS_DATA_UNAVAILABLE = "Operations data is unavailable.";

function statusCounts(): Record<ActionStatus, number> {
  return {
    planned: 0,
    in_progress: 0,
    completed: 0,
    cancelled: 0,
  };
}

function serializeDate(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function serializeMonth(year: number, month: number): string {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}`;
}

function parseMonth(month: string): { year: number; month: number } | null {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) return null;

  const year = Number(match[1]);
  const monthNumber = Number(match[2]);
  return monthNumber >= 1 && monthNumber <= 12 ? { year, month: monthNumber } : null;
}

function monthAtOffset(
  year: number,
  month: number,
  offset: number,
): { year: number; month: number } {
  const value = year * 12 + (month - 1) + offset;
  return {
    year: Math.floor(value / 12),
    month: ((value % 12) + 12) % 12 + 1,
  };
}

function weekdayMondayFirst(year: number, month: number, day: number): number {
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(0, 0, 0, 0);
  return (date.getUTCDay() + 6) % 7;
}

function calendarDays(
  year: number,
  month: number,
): OperationsCalendarDay[] {
  const firstWeekday = weekdayMondayFirst(year, month, 1);
  const firstCell = monthAtOffset(year, month, 0);
  const startDate = new Date(0);
  startDate.setUTCFullYear(firstCell.year, firstCell.month - 1, 1 - firstWeekday);
  startDate.setUTCHours(0, 0, 0, 0);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(startDate.getTime());
    date.setUTCDate(startDate.getUTCDate() + index);
    const cellYear = date.getUTCFullYear();
    const cellMonth = date.getUTCMonth() + 1;

    return {
      date: serializeDate(cellYear, cellMonth, date.getUTCDate()),
      dayNumber: date.getUTCDate(),
      inCurrentMonth: cellYear === year && cellMonth === month,
      actionIds: [],
      statusCounts: statusCounts(),
    };
  });
}

function mapAction(
  row: {
    id: string;
    title: string;
    description: string;
    event_date: string;
    status: ActionStatus;
    created_by: string;
    created_at: string;
    updated_at: string;
    users: { full_name: string } | null;
  },
  now: Date,
): OperationsAction {
  const eventInstant = new Date(row.event_date);
  const isScheduled = row.status === "planned" || row.status === "in_progress";

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    eventDate: row.event_date,
    status: row.status,
    createdBy: row.users?.full_name.trim() || "Unnamed team member",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    isOverdue:
      isScheduled &&
      !Number.isNaN(eventInstant.getTime()) &&
      eventInstant.getTime() < now.getTime(),
  };
}

export async function getOperationsPageData(
  filters: OperationsFilters,
  timeZone: string,
  now: Date = new Date(),
): Promise<OperationsPageData> {
  const parsedMonth = parseMonth(filters.month);
  if (!parsedMonth) {
    throw new Error(OPERATIONS_DATA_UNAVAILABLE);
  }

  const nextMonth = monthAtOffset(parsedMonth.year, parsedMonth.month, 1);
  const start = localDateTimeToUtc(
    `${filters.month}-01`,
    "00:00",
    timeZone,
  );
  const nextStart = localDateTimeToUtc(
    `${serializeMonth(nextMonth.year, nextMonth.month)}-01`,
    "00:00",
    timeZone,
  );

  if (!start || !nextStart) {
    throw new Error(OPERATIONS_DATA_UNAVAILABLE);
  }

  try {
    const supabase = await createClient();
    const selection =
      "id,title,description,event_date,status,created_by,created_at,updated_at,users!actions_created_by_fkey(full_name)";
    const monthQuery = filters.status
      ? supabase
          .from("actions")
          .select(selection)
          .gte("event_date", start.toISOString())
          .lt("event_date", nextStart.toISOString())
          .eq("status", filters.status)
          .order("event_date", { ascending: true })
      : supabase
          .from("actions")
          .select(selection)
          .gte("event_date", start.toISOString())
          .lt("event_date", nextStart.toISOString())
          .order("event_date", { ascending: true });
    const upcomingQuery = supabase
      .from("actions")
      .select(selection)
      .gte("event_date", now.toISOString())
      .in("status", ["planned", "in_progress"])
      .order("event_date", { ascending: true })
      .limit(5);
    const [monthResult, upcomingResult] = await Promise.all([
      monthQuery,
      upcomingQuery,
    ]);

    if (monthResult.error || upcomingResult.error) {
      throw new Error(OPERATIONS_DATA_UNAVAILABLE);
    }

    const agenda = monthResult.data.map((row) => mapAction(row, now));
    const upcoming = upcomingResult.data.map((row) => mapAction(row, now));
    const calendar = calendarDays(parsedMonth.year, parsedMonth.month);
    const calendarByDate = new Map(calendar.map((day) => [day.date, day]));

    for (const action of agenda) {
      const parts = getZonedDateParts(new Date(action.eventDate), timeZone);
      const day = calendarByDate.get(
        serializeDate(parts.year, parts.month, parts.day),
      );
      if (!day) continue;

      day.actionIds.push(action.id);
      day.statusCounts[action.status] += 1;
    }

    const previousMonth = monthAtOffset(parsedMonth.year, parsedMonth.month, -1);
    return {
      filters,
      timeZone,
      monthLabel: formatInOperationsTimeZone(start.toISOString(), timeZone, {
        month: "long",
        year: "numeric",
      }),
      previousMonth: serializeMonth(previousMonth.year, previousMonth.month),
      nextMonth: serializeMonth(nextMonth.year, nextMonth.month),
      upcoming,
      agenda,
      calendar,
    };
  } catch {
    throw new Error(OPERATIONS_DATA_UNAVAILABLE);
  }
}
