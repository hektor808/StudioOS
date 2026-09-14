import "server-only";

import { createClient } from "@/lib/supabase/server";

export type DashboardSummary = {
  trackCount: number;
  upcomingActionCount: number;
  contentIdeaCount: number;
  unresolvedCommentCount: number;
};

export type DashboardSummaryResult =
  | { state: "ready"; summary: DashboardSummary }
  | { state: "unavailable" };

export async function getDashboardSummary(): Promise<DashboardSummaryResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { state: "unavailable" };
    }

    const now = new Date().toISOString();
    const [tracks, actions, ideas, comments] = await Promise.all([
      supabase.from("tracks").select("id", { count: "exact", head: true }),
      supabase
        .from("actions")
        .select("id", { count: "exact", head: true })
        .in("status", ["planned", "in_progress"])
        .gte("event_date", now),
      supabase.from("content_ideas").select("id", { count: "exact", head: true }),
      supabase
        .from("comments")
        .select("id", { count: "exact", head: true })
        .eq("is_resolved", false),
    ]);

    if (tracks.error || actions.error || ideas.error || comments.error) {
      return { state: "unavailable" };
    }

    return {
      state: "ready",
      summary: {
        trackCount: tracks.count ?? 0,
        upcomingActionCount: actions.count ?? 0,
        contentIdeaCount: ideas.count ?? 0,
        unresolvedCommentCount: comments.count ?? 0,
      },
    };
  } catch {
    return { state: "unavailable" };
  }
}
