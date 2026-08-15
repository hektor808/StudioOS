import "server-only";

export const OPERATIONS_TIME_ZONE_ERROR =
  "Operations time zone is not configured correctly.";

export type OperationsTimeZoneState =
  | { status: "ready"; timeZone: string }
  | { status: "error"; message: typeof OPERATIONS_TIME_ZONE_ERROR };

type ZonedDateParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_PATTERN = /^(\d{2}):(\d{2})$/;

function utcLikeMilliseconds(parts: ZonedDateParts): number {
  const date = new Date(0);
  date.setUTCFullYear(parts.year, parts.month - 1, parts.day);
  date.setUTCHours(parts.hour, parts.minute, parts.second, 0);
  return date.getTime();
}

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hourCycle: "h23",
  });
}

function hasExactParts(left: ZonedDateParts, right: ZonedDateParts): boolean {
  return (
    left.year === right.year &&
    left.month === right.month &&
    left.day === right.day &&
    left.hour === right.hour &&
    left.minute === right.minute &&
    left.second === right.second
  );
}

export function getOperationsTimeZone(
  value: string | undefined = process.env.VEO_TIME_ZONE,
): OperationsTimeZoneState {
  const timeZone = value?.trim() || "UTC";

  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return { status: "ready", timeZone };
  } catch (error) {
    if (error instanceof RangeError) {
      return { status: "error", message: OPERATIONS_TIME_ZONE_ERROR };
    }

    return { status: "error", message: OPERATIONS_TIME_ZONE_ERROR };
  }
}

export function getZonedDateParts(
  instant: Date,
  timeZone: string,
): ZonedDateParts {
  const values: Partial<Record<keyof ZonedDateParts, number>> = {};

  for (const part of formatterFor(timeZone).formatToParts(instant)) {
    if (
      (part.type === "year" ||
        part.type === "month" ||
        part.type === "day" ||
        part.type === "hour" ||
        part.type === "minute" ||
        part.type === "second") &&
      part.value
    ) {
      values[part.type] = Number(part.value);
    }
  }

  if (
    values.year === undefined ||
    values.month === undefined ||
    values.day === undefined ||
    values.hour === undefined ||
    values.minute === undefined ||
    values.second === undefined
  ) {
    throw new Error(OPERATIONS_TIME_ZONE_ERROR);
  }

  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour,
    minute: values.minute,
    second: values.second,
  };
}

export function localDateTimeToUtc(
  date: string,
  time: string,
  timeZone: string,
): Date | null {
  const dateMatch = DATE_PATTERN.exec(date);
  const timeMatch = TIME_PATTERN.exec(time);

  if (!dateMatch || !timeMatch) {
    return null;
  }

  const target: ZonedDateParts = {
    year: Number(dateMatch[1]),
    month: Number(dateMatch[2]),
    day: Number(dateMatch[3]),
    hour: Number(timeMatch[1]),
    minute: Number(timeMatch[2]),
    second: 0,
  };
  const calendarCheck = new Date(0);
  calendarCheck.setUTCFullYear(target.year, target.month - 1, target.day);
  calendarCheck.setUTCHours(target.hour, target.minute, target.second, 0);

  if (
    calendarCheck.getUTCFullYear() !== target.year ||
    calendarCheck.getUTCMonth() + 1 !== target.month ||
    calendarCheck.getUTCDate() !== target.day ||
    calendarCheck.getUTCHours() !== target.hour ||
    calendarCheck.getUTCMinutes() !== target.minute
  ) {
    return null;
  }

  const targetMilliseconds = utcLikeMilliseconds(target);
  let candidate = new Date(targetMilliseconds);

  for (let pass = 0; pass < 3; pass += 1) {
    const actual = getZonedDateParts(candidate, timeZone);
    candidate = new Date(
      candidate.getTime() + (targetMilliseconds - utcLikeMilliseconds(actual)),
    );
  }

  return hasExactParts(getZonedDateParts(candidate, timeZone), target)
    ? candidate
    : null;
}

export function formatInOperationsTimeZone(
  iso: string,
  timeZone: string,
  options: Intl.DateTimeFormatOptions,
): string {
  const instant = new Date(iso);

  if (Number.isNaN(instant.getTime())) {
    return "Date unavailable";
  }

  return new Intl.DateTimeFormat("en-US", { timeZone, ...options }).format(
    instant,
  );
}
