import "server-only";

import { SupabasePublicEnvironmentError } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import type {
  StudioCatalogFilters,
  StudioCatalogResult,
  StudioComment,
  StudioCreator,
  StudioFile,
  StudioTrackDetail,
  StudioTrackSummary,
  StudioTrackVersion,
  TrackStatus,
} from "@/lib/studio/types";
import { versionIdSchema } from "@/lib/studio/validation";

const STUDIO_DATA_UNAVAILABLE = "Studio data is unavailable.";
const UNNAMED_TEAM_MEMBER = "Unnamed team member";
const TRACK_STATUSES = [
  "draft",
  "active",
  "completed",
  "cancelled",
] as const satisfies readonly TrackStatus[];

function dataUnavailable(): never {
  throw new Error(STUDIO_DATA_UNAVAILABLE);
}

function handleQueryFailure(error: unknown): never {
  if (error instanceof SupabasePublicEnvironmentError) {
    throw error;
  }

  dataUnavailable();
}

function mapCreator(
  id: string,
  profile: { full_name: string; avatar_url: string | null } | null,
): StudioCreator {
  return {
    id,
    fullName: profile?.full_name.trim() || UNNAMED_TEAM_MEMBER,
    avatarUrl: profile?.avatar_url ?? null,
  };
}

export async function getStudioCatalog(
  filters: StudioCatalogFilters,
): Promise<StudioCatalogResult> {
  try {
    const supabase = await createClient();
    const escapedQuery = filters.query.replace(/[\\%_]/g, "\\\\$&");

    let catalogQuery = supabase
      .from("tracks")
      .select(
        "id,title,status,created_by,updated_at,users!tracks_created_by_fkey(full_name,avatar_url),track_versions(id,version_num,status,duration_seconds,created_at)",
      )
      .order("updated_at", { ascending: false });

    if (filters.query) {
      catalogQuery = catalogQuery.ilike("title", `%${escapedQuery}%`);
    }

    if (filters.status !== null) {
      catalogQuery = catalogQuery.eq("status", filters.status);
    }

    const [catalogResult, countResults] = await Promise.all([
      catalogQuery,
      Promise.all(
        TRACK_STATUSES.map((status) =>
          supabase
            .from("tracks")
            .select("id", { count: "exact", head: true })
            .eq("status", status),
        ),
      ),
    ]);

    if (catalogResult.error) {
      dataUnavailable();
    }

    const statusCounts: Record<TrackStatus, number> = {
      draft: 0,
      active: 0,
      completed: 0,
      cancelled: 0,
    };

    TRACK_STATUSES.forEach((status, index) => {
      const result = countResults[index];
      if (result.error || result.count === null) {
        dataUnavailable();
      }

      statusCounts[status] = result.count;
    });

    const tracks: StudioTrackSummary[] = catalogResult.data.map((row) => {
      const versions = [...row.track_versions].sort(
        (left, right) => right.version_num - left.version_num,
      );
      const latestVersion = versions[0] ?? null;
      const lastActivityAt = versions.reduce(
        (latest, version) =>
          version.created_at > latest ? version.created_at : latest,
        row.updated_at,
      );

      return {
        id: row.id,
        title: row.title,
        status: row.status,
        latestVersion: latestVersion
          ? {
              id: latestVersion.id,
              versionNumber: latestVersion.version_num,
              status: latestVersion.status,
              durationSeconds: latestVersion.duration_seconds,
            }
          : null,
        createdBy: mapCreator(row.created_by, row.users),
        lastActivityAt,
      };
    });

    return { tracks, statusCounts };
  } catch (error) {
    handleQueryFailure(error);
  }
}

export async function getStudioTrackDetail(
  trackId: string,
): Promise<StudioTrackDetail | null> {
  if (!versionIdSchema.safeParse(trackId).success) {
    return null;
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("tracks")
      .select(
        "id,title,status,description,artwork_path,created_at,updated_at,created_by,users!tracks_created_by_fkey(full_name,avatar_url)",
      )
      .eq("id", trackId)
      .maybeSingle();

    if (error) {
      dataUnavailable();
    }

    if (!data) {
      return null;
    }

    return {
      id: data.id,
      title: data.title,
      status: data.status,
      description: data.description,
      hasArtwork: data.artwork_path !== null,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      createdBy: mapCreator(data.created_by, data.users),
    };
  } catch (error) {
    handleQueryFailure(error);
  }
}

export async function getStudioTrackVersions(
  trackId: string,
): Promise<StudioTrackVersion[]> {
  if (!versionIdSchema.safeParse(trackId).success) {
    return [];
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("track_versions")
      .select(
        "id,track_id,version_num,status,original_filename,mime_type,size_bytes,storage_provider,duration_seconds,created_at,created_by,users!track_versions_created_by_fkey(full_name,avatar_url)",
      )
      .eq("track_id", trackId)
      .order("version_num", { ascending: false });

    if (error) {
      dataUnavailable();
    }

    return data.map((row) => ({
      id: row.id,
      trackId: row.track_id,
      versionNumber: row.version_num,
      status: row.status,
      originalFilename: row.original_filename,
      mimeType: row.mime_type,
      sizeBytes: row.size_bytes,
      durationSeconds: row.duration_seconds,
      createdAt: row.created_at,
      createdBy: mapCreator(row.created_by, row.users),
      storageAvailability:
        row.storage_provider === "supabase" ? "playback" : "production",
    }));
  } catch (error) {
    handleQueryFailure(error);
  }
}

export async function getStudioTrackFiles(
  trackId: string,
): Promise<StudioFile[]> {
  if (!versionIdSchema.safeParse(trackId).success) {
    return [];
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("files")
      .select(
        "id,track_id,type,original_filename,mime_type,size_bytes,created_at,uploaded_by,users!files_uploaded_by_fkey(id,full_name,avatar_url)",
      )
      .eq("track_id", trackId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error("Studio files are unavailable.");
    }

    return data.map((row) => ({
      id: row.id,
      trackId: row.track_id,
      fileType: row.type,
      originalFilename: row.original_filename,
      mimeType: row.mime_type,
      sizeBytes: row.size_bytes,
      createdAt: row.created_at,
      uploadedBy: mapCreator(row.uploaded_by, row.users),
      storageAvailability: "production",
    }));
  } catch (error) {
    if (error instanceof SupabasePublicEnvironmentError) {
      throw error;
    }

    throw new Error("Studio files are unavailable.");
  }
}

export async function getStudioComments(
  versionIds: readonly string[],
): Promise<StudioComment[]> {
  try {
    const supabase = await createClient();

    if (versionIds.length === 0) {
      return [];
    }

    if (!versionIds.every((id) => versionIdSchema.safeParse(id).success)) {
      return [];
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      dataUnavailable();
    }

    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      dataUnavailable();
    }

    const { data, error } = await supabase
      .from("comments")
      .select(
        "id,version_id,user_id,timestamp_marker,content,is_resolved,created_at,users!comments_user_id_fkey(full_name,avatar_url)",
      )
      .in("version_id", [...versionIds])
      .order("created_at", { ascending: true });

    if (error) {
      dataUnavailable();
    }

    const requesterIsAdmin = profile?.role === "admin";

    return data.map((row) => ({
      id: row.id,
      versionId: row.version_id,
      user: mapCreator(row.user_id, row.users),
      timestampMarker: row.timestamp_marker,
      content: row.content,
      isResolved: row.is_resolved,
      createdAt: row.created_at,
      canResolve: row.user_id === user.id || requesterIsAdmin,
    }));
  } catch (error) {
    handleQueryFailure(error);
  }
}
