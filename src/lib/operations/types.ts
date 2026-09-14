import type { Database } from "@/types/database.types";

export type ActionStatus = Database["public"]["Enums"]["action_status"];
export type SearchParamValue = string | string[] | undefined;

export type OperationsAction = {
  id: string;
  title: string;
  description: string;
  eventDate: string;
  status: ActionStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  isOverdue: boolean;
};

export type OperationsCalendarDay = {
  date: string;
  dayNumber: number;
  inCurrentMonth: boolean;
  actionIds: string[];
  statusCounts: Record<ActionStatus, number>;
};

export type OperationsFilters = {
  month: string;
  status: ActionStatus | null;
};

export type OperationsPageData = {
  filters: OperationsFilters;
  timeZone: string;
  monthLabel: string;
  previousMonth: string;
  nextMonth: string;
  upcoming: OperationsAction[];
  agenda: OperationsAction[];
  calendar: OperationsCalendarDay[];
};

export type OperationsActionResult = {
  status: "idle" | "success" | "error";
  message: string;
  fieldErrors?: Partial<
    Record<
      "title" | "description" | "eventDate" | "eventTime" | "actionStatus",
      string
    >
  >;
};

export const initialOperationsActionResult: OperationsActionResult = {
  status: "idle",
  message: "",
};
