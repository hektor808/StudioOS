import "server-only";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  createListeningToken,
  digestListeningToken,
  isPrivateObjectKey,
  normalizeListeningToken,
} from "@/lib/listening/tokens";
import type {
  CreateListeningLinkInput,
  CreateListeningLinkResult,
  ListeningLinkLookupRow,
  ListeningLinkStatus,
  ListeningLinkSummary,
  ListeningLinkSummaryRow,
  PublicListeningAvailability,
  PublicListeningRefreshResult,
  PublicListeningSessionResult,
  ReadyListeningVersion,
  RefreshListeningResult,
} from "@/lib/listening/types";
import {
  createListeningLinkSchema,
  listeningMessages,
  revokeListeningLinkSchema,
} from "@/lib/listening/validation";

export const PUBLIC_SIGNED_URL_TTL_SECONDS = 300;

const uuidSchema = z.string().uuid();

type SupabaseRequestClient = Awaited<ReturnType<typeof createClient>>;

type ResolvedPublicLink = {
  link: { id: string };
  version: { storageUrl: string };
  trackTitle: string;
  versionLabel: string;
};

function linkUnavailable(): never {
  throw new Error(listeningMessages.linkUnavailable);
}

async function requireAuthenticatedUser(
  supabase: SupabaseRequestClient,
): Promise<void> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error(listeningMessages.signInRequired);
  }
}

function deriveStatus(row: ListeningLinkSummaryRow): ListeningLinkStatus {
  if (row.revoked_at !== null) {
    return "revoked";
  }

  const expiresAt = new Date(row.expires_at).getTime();
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    return "expired";
  }

  return "active";
}

function mapSummaryRow(row: ListeningLinkSummaryRow): ListeningLinkSummary {
  return {
    id: row.id,
    versionId: row.version_id,
    versionLabel: row.version_label,
    label: row.label,
    status: deriveStatus(row),
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at,
    createdAt: row.created_at,
    lastAccessedAt: row.last_accessed_at,
    accessCount: row.access_count,
  };
}

function firstSummaryRow(data: unknown): ListeningLinkSummaryRow | null {
  if (!Array.isArray(data) || data.length === 0) {
    return null;
  }

  return data[0] as ListeningLinkSummaryRow;
}

export async function listListeningLinks(
  trackId: string,
): Promise<ListeningLinkSummary[]> {
  if (!uuidSchema.safeParse(trackId).success) {
    return [];
  }

  const supabase = await createClient();
  await requireAuthenticatedUser(supabase);

  const result = (await supabase.rpc(
    "list_listening_link_summaries" as never,
    { p_track_id: trackId } as never,
  )) as { data: unknown; error: unknown };

  if (result.error || !Array.isArray(result.data)) {
    linkUnavailable();
  }

  return (result.data as ListeningLinkSummaryRow[]).map(mapSummaryRow);
}

export async function listReadyListeningVersions(
  trackId: string,
): Promise<ReadyListeningVersion[]> {
  if (!uuidSchema.safeParse(trackId).success) {
    return [];
  }

  const supabase = await createClient();
  await requireAuthenticatedUser(supabase);

  const { data, error } = await supabase
    .from("track_versions")
    .select("id,version_num,status,storage_provider,storage_bucket,storage_url")
    .eq("track_id", trackId)
    .eq("status", "ready")
    .eq("storage_provider", "supabase")
    .eq("storage_bucket", "playback")
    .order("version_num", { ascending: false });

  if (error) {
    linkUnavailable();
  }

  return data
    .filter((row) => isPrivateObjectKey(row.storage_url))
    .map((row) => ({
      id: row.id,
      versionNumber: row.version_num,
      versionLabel: `Version ${row.version_num}`,
    }));
}

export async function createListeningLink(
  input: CreateListeningLinkInput,
): Promise<CreateListeningLinkResult> {
  const parsed = createListeningLinkSchema.safeParse(input);
  if (!parsed.success) {
    linkUnavailable();
  }

  const expiresAtMs = new Date(parsed.data.expiresAt).getTime();
  if (!Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now()) {
    linkUnavailable();
  }

  const supabase = await createClient();
  await requireAuthenticatedUser(supabase);

  const { rawToken, tokenHash } = createListeningToken();

  const result = (await supabase.rpc(
    "create_listening_link" as never,
    {
      p_track_id: parsed.data.trackId,
      p_version_id: parsed.data.versionId,
      p_token_hash: tokenHash,
      p_label: parsed.data.label,
      p_expires_at: parsed.data.expiresAt,
    } as never,
  )) as { data: unknown; error: unknown };

  if (result.error) {
    linkUnavailable();
  }

  const row = firstSummaryRow(result.data);
  if (!row) {
    linkUnavailable();
  }

  revalidatePath("/studio");
  revalidatePath(`/studio/${parsed.data.trackId}`);

  return { link: mapSummaryRow(row), rawToken };
}

export async function revokeListeningLink(
  linkId: string,
): Promise<ListeningLinkSummary> {
  const parsed = revokeListeningLinkSchema.safeParse({ linkId });
  if (!parsed.success) {
    linkUnavailable();
  }

  const supabase = await createClient();
  await requireAuthenticatedUser(supabase);

  const result = (await supabase.rpc(
    "revoke_listening_link" as never,
    { p_link_id: parsed.data.linkId } as never,
  )) as { data: unknown; error: unknown };

  if (result.error) {
    linkUnavailable();
  }

  const row = firstSummaryRow(result.data);
  if (!row) {
    linkUnavailable();
  }

  const summary = mapSummaryRow(row);

  const { data: versionRow } = await supabase
    .from("track_versions")
    .select("track_id")
    .eq("id", summary.versionId)
    .maybeSingle();

  revalidatePath("/studio");
  if (versionRow?.track_id) {
    revalidatePath(`/studio/${versionRow.track_id}`);
  }

  return summary;
}

async function resolveValidatedPublicLink(
  rawToken: string,
): Promise<ResolvedPublicLink | null> {
  const token = normalizeListeningToken(rawToken);
  if (token === null) {
    return null;
  }

  const admin = createAdminClient();
  const tokenHash = digestListeningToken(token);

  const linkResult = (await admin
    .from("listening_links" as never)
    .select("id,track_id,version_id,expires_at,revoked_at")
    .eq("token_hash", tokenHash)
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle()) as { data: unknown; error: unknown };

  if (linkResult.error) {
    linkUnavailable();
  }

  const link = linkResult.data as ListeningLinkLookupRow | null;
  if (!link) {
    return null;
  }

  const { data: version, error: versionError } = await admin
    .from("track_versions")
    .select(
      "id,track_id,version_num,status,storage_provider,storage_bucket,storage_url,tracks!track_versions_track_id_fkey(title)",
    )
    .eq("id", link.version_id)
    .maybeSingle();

  if (versionError) {
    linkUnavailable();
  }

  if (
    !version ||
    version.track_id !== link.track_id ||
    version.status !== "ready" ||
    version.storage_provider !== "supabase" ||
    version.storage_bucket !== "playback" ||
    !isPrivateObjectKey(version.storage_url)
  ) {
    return null;
  }

  const track = version.tracks;
  if (!track) {
    return null;
  }

  return {
    link: { id: link.id },
    version: { storageUrl: version.storage_url },
    trackTitle: track.title,
    versionLabel: `Version ${version.version_num}`,
  };
}

export async function validatePublicListeningToken(
  rawToken: string,
): Promise<PublicListeningAvailability | null> {
  const resolved = await resolveValidatedPublicLink(rawToken);
  if (!resolved) {
    return null;
  }

  return {
    trackTitle: resolved.trackTitle,
    versionLabel: resolved.versionLabel,
    artworkUrl: null,
  };
}

async function signPublicPlayback(
  resolved: ResolvedPublicLink,
): Promise<RefreshListeningResult | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from("playback")
    .createSignedUrl(resolved.version.storageUrl, PUBLIC_SIGNED_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) {
    return null;
  }

  const telemetry = await admin.rpc(
    "record_listening_link_access" as never,
    { p_link_id: resolved.link.id } as never,
  );

  if (telemetry.error) {
    return null;
  }

  return {
    playbackUrl: data.signedUrl,
    expiresAt: new Date(
      Date.now() + PUBLIC_SIGNED_URL_TTL_SECONDS * 1000,
    ).toISOString(),
  };
}

export async function createPublicListeningSession(
  rawToken: string,
): Promise<PublicListeningSessionResult> {
  try {
    const resolved = await resolveValidatedPublicLink(rawToken);
    if (!resolved) {
      return { state: "unavailable" };
    }

    const refresh = await signPublicPlayback(resolved);
    if (!refresh) {
      return { state: "temporarily_unavailable" };
    }

    return {
      state: "ready",
      session: {
        trackTitle: resolved.trackTitle,
        versionLabel: resolved.versionLabel,
        artworkUrl: null,
        playbackUrl: refresh.playbackUrl,
        expiresAt: refresh.expiresAt,
      },
    };
  } catch {
    return { state: "temporarily_unavailable" };
  }
}

export async function refreshPublicListeningToken(
  rawToken: string,
): Promise<PublicListeningRefreshResult> {
  try {
    const resolved = await resolveValidatedPublicLink(rawToken);
    if (!resolved) {
      return { state: "unavailable" };
    }

    const refresh = await signPublicPlayback(resolved);
    if (!refresh) {
      return { state: "temporarily_unavailable" };
    }

    return { state: "ready", refresh };
  } catch {
    return { state: "temporarily_unavailable" };
  }
}
