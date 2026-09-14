import "server-only";

import type {
  ContentDifficulty,
  ContentFilters,
  ContentIdea,
  ContentPageData,
  ContentStatus,
} from "@/lib/content/types";
import { createClient } from "@/lib/supabase/server";

const CONTENT_DATA_UNAVAILABLE = "Content ideas are unavailable.";
const UNNAMED_TEAM_MEMBER = "Unnamed team member";
const PLATFORM_MAX_LENGTH = 80;

type ContentIdeaRow = {
  id: string;
  title: string;
  platform: string;
  difficulty: ContentDifficulty;
  status: ContentStatus;
  reference_url: string | null;
  notes: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  users: { full_name: string } | null;
};

function normalizePlatform(platform: string): string {
  return platform.trim().replace(/\s+/g, " ");
}

function parseReference(rawUrl: string | null): {
  referenceUrl: string | null;
  referenceHost: string | null;
} {
  if (!rawUrl) {
    return { referenceUrl: null, referenceHost: null };
  }

  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return { referenceUrl: null, referenceHost: null };
    }

    return { referenceUrl: url.toString(), referenceHost: url.host };
  } catch {
    return { referenceUrl: null, referenceHost: null };
  }
}

function mapIdea(row: ContentIdeaRow): ContentIdea {
  const reference = parseReference(row.reference_url);

  return {
    id: row.id,
    title: row.title,
    platform: normalizePlatform(row.platform) || row.platform,
    difficulty: row.difficulty,
    status: row.status,
    referenceUrl: reference.referenceUrl,
    referenceHost: reference.referenceHost,
    notes: row.notes,
    createdBy: row.users?.full_name.trim() || UNNAMED_TEAM_MEMBER,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function collectPlatforms(platforms: readonly string[]): string[] {
  const byLowercase = new Map<string, string>();

  for (const platform of platforms) {
    const normalized = normalizePlatform(platform);
    if (!normalized || normalized.length > PLATFORM_MAX_LENGTH) continue;

    const key = normalized.toLowerCase();
    if (!byLowercase.has(key)) {
      byLowercase.set(key, normalized);
    }
  }

  return Array.from(byLowercase.values()).sort((left, right) =>
    left.localeCompare(right),
  );
}

export async function getContentPageData(
  filters: ContentFilters,
): Promise<ContentPageData> {
  try {
    const supabase = await createClient();
    const selection =
      "id,title,platform,difficulty,status,reference_url,notes,created_by,created_at,updated_at,users!content_ideas_created_by_fkey(full_name)";

    let ideasQuery = supabase
      .from("content_ideas")
      .select(selection)
      .order("updated_at", { ascending: false });

    if (filters.platform) {
      ideasQuery = ideasQuery.eq("platform", filters.platform);
    }

    if (filters.status) {
      ideasQuery = ideasQuery.eq("status", filters.status);
    }

    const [platformsResult, ideasResult] = await Promise.all([
      supabase.from("content_ideas").select("platform"),
      ideasQuery,
    ]);

    if (platformsResult.error || ideasResult.error) {
      throw new Error(CONTENT_DATA_UNAVAILABLE);
    }

    return {
      ideas: ideasResult.data.map((row) => mapIdea(row)),
      platforms: collectPlatforms(
        platformsResult.data.map((row) => row.platform),
      ),
      filters,
    };
  } catch {
    throw new Error(CONTENT_DATA_UNAVAILABLE);
  }
}
