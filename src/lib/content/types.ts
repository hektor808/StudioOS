import type { Database } from "@/types/database.types";

export type ContentStatus = Database["public"]["Enums"]["content_status"];
export type ContentDifficulty =
  Database["public"]["Enums"]["content_difficulty"];
export type ContentSearchParamValue = string | string[] | undefined;

export type ContentIdea = {
  id: string;
  title: string;
  platform: string;
  difficulty: ContentDifficulty;
  status: ContentStatus;
  referenceUrl: string | null;
  referenceHost: string | null;
  notes: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type ContentFilters = {
  platform: string | null;
  status: ContentStatus | null;
};

export type ContentPageData = {
  ideas: ContentIdea[];
  platforms: string[];
  filters: ContentFilters;
};

export type ContentActionResult = {
  status: "idle" | "success" | "error";
  message: string;
  fieldErrors?: Partial<
    Record<
      | "title"
      | "platform"
      | "difficulty"
      | "contentStatus"
      | "referenceUrl"
      | "notes",
      string
    >
  >;
};

export const initialContentActionResult: ContentActionResult = {
  status: "idle",
  message: "",
};
