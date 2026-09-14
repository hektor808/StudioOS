import { z } from "zod";

import { getZonedDateParts } from "@/lib/operations/time-zone";
import type {
  ActionStatus,
  OperationsFilters,
  SearchParamValue,
} from "@/lib/operations/types";

export const actionStatusSchema = z.enum([
  "planned",
  "in_progress",
  "completed",
  "cancelled",
]);

export const operationsActionSchema = z.object({
  actionId: z.union([z.literal(""), z.string().uuid()]),
  title: z
    .string()
    .trim()
    .min(1, "Enter an action title.")
    .max(160, "Action titles must be 160 characters or fewer."),
  description: z
    .string()
    .trim()
    .max(4000, "Descriptions must be 4,000 characters or fewer."),
  eventDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid date."),
  eventTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Choose a valid time."),
  actionStatus: actionStatusSchema,
});

const MONTH_PATTERN = /^(\d{4})-(\d{2})$/;

function serializeMonth(year: number, month: number): string {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}`;
}

function isRealMonth(value: string): boolean {
  const match = MONTH_PATTERN.exec(value);

  return match !== null && Number(match[2]) >= 1 && Number(match[2]) <= 12;
}

export function firstSearchParam(value: SearchParamValue): string | undefined {
  const first = Array.isArray(value) ? value[0] : value;
  const normalized = first?.trim();
  return normalized || undefined;
}

export function normalizeOperationsFilters(
  input: { month?: SearchParamValue; status?: SearchParamValue },
  timeZone: string,
  now: Date = new Date(),
): OperationsFilters {
  const zonedNow = getZonedDateParts(now, timeZone);
  const monthInput = firstSearchParam(input.month);
  const statusInput = firstSearchParam(input.status);

  return {
    month:
      monthInput && isRealMonth(monthInput)
        ? monthInput
        : serializeMonth(zonedNow.year, zonedNow.month),
    status: actionStatusSchema.safeParse(statusInput).success
      ? (statusInput as ActionStatus)
      : null,
  };
}
