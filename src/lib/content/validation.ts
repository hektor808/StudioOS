import { z } from "zod";

import type {
  ContentFilters,
  ContentSearchParamValue,
  ContentStatus,
} from "@/lib/content/types";

export const contentStatusSchema = z.enum([
  "idea",
  "planned",
  "in_production",
  "published",
  "archived",
]);

export const contentDifficultySchema = z.enum(["low", "medium", "high"]);

const optionalHttpUrl = z
  .string()
  .trim()
  .max(2048, "Reference URLs must be 2,048 characters or fewer.")
  .refine((value) => {
    if (!value) return true;
    try {
      const url = new URL(value);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  }, "Use a valid http or https reference URL.");

export const contentIdeaSchema = z.object({
  contentIdeaId: z.union([z.literal(""), z.string().uuid()]),
  title: z
    .string()
    .trim()
    .min(1, "Enter an idea title.")
    .max(200, "Idea titles must be 200 characters or fewer."),
  platform: z
    .string()
    .trim()
    .min(1, "Enter a platform.")
    .max(80, "Platforms must be 80 characters or fewer."),
  difficulty: contentDifficultySchema,
  contentStatus: contentStatusSchema,
  referenceUrl: optionalHttpUrl,
  notes: z
    .string()
    .trim()
    .max(5000, "Notes must be 5,000 characters or fewer."),
});

export function firstContentSearchParam(
  value: ContentSearchParamValue,
): string | undefined {
  const first = Array.isArray(value) ? value[0] : value;
  const normalized = first?.trim();
  return normalized || undefined;
}

export function normalizeContentFilters(input: {
  platform?: ContentSearchParamValue;
  status?: ContentSearchParamValue;
}): ContentFilters {
  const platformInput = firstContentSearchParam(input.platform);
  const statusInput = firstContentSearchParam(input.status);
  const platform = platformInput?.replace(/\s+/g, " ") ?? "";

  return {
    platform: platform && platform.length <= 80 ? platform : null,
    status: contentStatusSchema.safeParse(statusInput).success
      ? (statusInput as ContentStatus)
      : null,
  };
}
