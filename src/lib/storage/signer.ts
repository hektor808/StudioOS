import "server-only";

import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { getR2Client } from "@/lib/r2/client";
import { getR2Config } from "@/lib/r2/env";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SignedDownloadDTO, StorageLocator } from "@/lib/uploads/types";

export const SIGNED_DOWNLOAD_TTL_SECONDS = 600;

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

export function isSafePrivateObjectKey(value: string): boolean {
  const key = value.trim();

  if (
    !key ||
    key.startsWith("/") ||
    key.includes("\\") ||
    key.includes("%") ||
    key.includes("://") ||
    key.includes("?") ||
    key.includes("#") ||
    containsControlCharacters(key) ||
    ABSOLUTE_SCHEME_PREFIX.test(key)
  ) {
    return false;
  }

  return !key.split("/").some((segment) => {
    return !segment || segment === "." || segment === "..";
  });
}

export async function signStorageDownload(
  locator: StorageLocator,
  filename: string,
): Promise<SignedDownloadDTO> {
  const key = locator.key.trim();

  if (!isSafePrivateObjectKey(key) || !locator.bucket.trim()) {
    throw new Error("Download is unavailable.");
  }

  try {
    if (locator.provider === "supabase") {
      if (locator.bucket !== "playback") {
        throw new Error("Download is unavailable.");
      }

      const { data, error } = await createAdminClient().storage
        .from("playback")
        .createSignedUrl(key, SIGNED_DOWNLOAD_TTL_SECONDS, { download: filename });

      if (error || !data?.signedUrl) {
        throw new Error("Download is unavailable.");
      }

      return {
        url: data.signedUrl,
        expiresAt: new Date(
          Date.now() + SIGNED_DOWNLOAD_TTL_SECONDS * 1000,
        ).toISOString(),
      };
    }

    if (locator.provider !== "r2" || locator.bucket !== getR2Config().bucketName) {
      throw new Error("Download is unavailable.");
    }

    const { client, bucket } = getR2Client();
    const url = await getSignedUrl(
      client,
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
        ResponseContentDisposition: `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      }),
      { expiresIn: SIGNED_DOWNLOAD_TTL_SECONDS },
    );

    return {
      url,
      expiresAt: new Date(
        Date.now() + SIGNED_DOWNLOAD_TTL_SECONDS * 1000,
      ).toISOString(),
    };
  } catch {
    throw new Error("Download is unavailable.");
  }
}
