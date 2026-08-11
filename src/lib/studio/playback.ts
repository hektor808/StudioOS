import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { SignedPlaybackSource } from "@/lib/studio/types";
import { studioMessages, versionIdSchema } from "@/lib/studio/validation";

export const SIGNED_PLAYBACK_TTL_SECONDS = 900;

function playbackUnavailable(): never {
  throw new Error(studioMessages.playbackUnavailable);
}

function isPrivateObjectKey(value: string): boolean {
  const objectKey = value.trim();
  return (
    objectKey.length > 0 &&
    !/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(objectKey)
  );
}

export async function getSignedPlaybackSource(
  versionId: string,
): Promise<SignedPlaybackSource> {
  if (!versionIdSchema.safeParse(versionId).success) {
    playbackUnavailable();
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      playbackUnavailable();
    }

    const { data: version, error: versionError } = await supabase
      .from("track_versions")
      .select(
        "id,track_id,version_num,status,storage_url,storage_provider,storage_bucket,tracks!track_versions_track_id_fkey(title)",
      )
      .eq("id", versionId)
      .maybeSingle();

    if (versionError || !version) {
      playbackUnavailable();
    }

    if (
      version.status !== "ready" ||
      version.storage_provider !== "supabase" ||
      version.storage_bucket !== "playback" ||
      !isPrivateObjectKey(version.storage_url)
    ) {
      playbackUnavailable();
    }

    const track = version.tracks;
    if (!track) {
      playbackUnavailable();
    }

    const { createAdminClient } = await import("@/lib/supabase/admin");
    const { data, error } = await createAdminClient().storage
      .from("playback")
      .createSignedUrl(version.storage_url, SIGNED_PLAYBACK_TTL_SECONDS);

    if (error || !data?.signedUrl) {
      playbackUnavailable();
    }

    return {
      sourceId: version.id,
      trackId: version.track_id,
      title: track.title,
      subtitle: `Version ${version.version_num}`,
      playbackUrl: data.signedUrl,
      expiresAt: new Date(
        Date.now() + SIGNED_PLAYBACK_TTL_SECONDS * 1000,
      ).toISOString(),
    };
  } catch {
    playbackUnavailable();
  }
}
