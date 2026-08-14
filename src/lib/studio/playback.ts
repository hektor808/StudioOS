import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { SignedPlaybackSource } from "@/lib/studio/types";
import { studioMessages, versionIdSchema } from "@/lib/studio/validation";

export const SIGNED_PLAYBACK_TTL_SECONDS = 900;

function playbackUnavailable(): never {
  throw new Error(studioMessages.playbackUnavailable);
}

const ABSOLUTE_SCHEME_PREFIX = /^[a-z][a-z\d+.-]*:/i;

function containsControlCharacters(value: string): boolean {
  return Array.from(value).some((character) => {
    const codePoint = character.codePointAt(0);
    return (
      codePoint !== undefined &&
      (codePoint <= 31 || (codePoint >= 127 && codePoint <= 159))
    );
  });
}

function getSafeRelativeObjectKey(value: string): string | null {
  if (
    value.length === 0 ||
    value.trim().length === 0 ||
    value.startsWith("/") ||
    value.includes("\\") ||
    value.includes("%") ||
    value.includes("://") ||
    value.includes("?") ||
    value.includes("#") ||
    containsControlCharacters(value) ||
    ABSOLUTE_SCHEME_PREFIX.test(value)
  ) {
    return null;
  }

  const segments = value.split("/");
  if (
    segments.some(
      (segment) =>
        segment.length === 0 || segment === "." || segment === "..",
    )
  ) {
    return null;
  }

  return value;
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

    const objectKey = getSafeRelativeObjectKey(version.storage_url);
    if (
      version.status !== "ready" ||
      version.storage_provider !== "supabase" ||
      version.storage_bucket !== "playback" ||
      objectKey === null
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
      .createSignedUrl(objectKey, SIGNED_PLAYBACK_TTL_SECONDS);

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
