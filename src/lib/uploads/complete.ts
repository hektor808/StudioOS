import "server-only";

import { HeadObjectCommand } from "@aws-sdk/client-s3";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getR2Client } from "@/lib/r2/client";
import { categoryForUpload, isExpectedR2Key } from "@/lib/r2/object-key";
import { createClient } from "@/lib/supabase/server";
import type { CompletedUploadDTO } from "@/lib/uploads/types";
import { verifyCompletionGrant } from "@/lib/r2/completion-grant";

export const completeUploadSchema = z
  .object({
    completionGrant: z.string().min(32).max(8192),
    etag: z.string().trim().min(1).max(256),
  })
  .strict();

export function normalizeEtag(value: string): string {
  return value.trim().replace(/^W\//, "").replace(/^"|"$/g, "").toLowerCase();
}

export class UploadCompletionError extends Error {
  constructor(
    public readonly status: 400 | 401 | 403 | 404 | 409 | 503,
    message: string,
  ) {
    super(message);
    this.name = "UploadCompletionError";
  }
}

function isNotFoundProviderError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  const candidate = error as {
    name?: unknown;
    $metadata?: { httpStatusCode?: unknown };
  };

  return (
    candidate.$metadata?.httpStatusCode === 404 ||
    candidate.name === "NotFound" ||
    candidate.name === "NoSuchKey" ||
    candidate.name === "NotFoundError"
  );
}

function toSafeInteger(value: number): number {
  const numericValue = Number(value);

  if (!Number.isSafeInteger(numericValue)) {
    throw new UploadCompletionError(
      503,
      "Upload registration is temporarily unavailable.",
    );
  }

  return numericValue;
}

function toNullableSafeInteger(value: number | null): number | null {
  return value === null ? null : toSafeInteger(value);
}

export async function completeR2Upload(input: {
  completionGrant: string;
  etag: string;
}): Promise<CompletedUploadDTO> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new UploadCompletionError(401, "Sign in to finish this upload.");
  }

  let claims;
  try {
    claims = verifyCompletionGrant(input.completionGrant);
  } catch {
    throw new UploadCompletionError(400, "Upload completion grant is invalid.");
  }

  if (claims.userId !== user.id) {
    throw new UploadCompletionError(403, "Upload completion is not authorized.");
  }

  const { data: track, error: trackError } = await supabase
    .from("tracks")
    .select("id")
    .eq("id", claims.trackId)
    .maybeSingle();

  if (trackError) {
    throw new UploadCompletionError(
      503,
      "Upload verification is temporarily unavailable.",
    );
  }

  if (!track) {
    throw new UploadCompletionError(404, "Track not found.");
  }

  const { data: canManageTrack, error: capabilityError } = await supabase.rpc(
    "can_manage_track",
    { track_id: claims.trackId },
  );

  if (capabilityError) {
    throw new UploadCompletionError(
      503,
      "Upload verification is temporarily unavailable.",
    );
  }

  if (!canManageTrack) {
    throw new UploadCompletionError(403, "Upload completion is not authorized.");
  }

  if (
    (claims.uploadKind === "file" && claims.fileType === null) ||
    (claims.uploadKind === "version" && claims.fileType !== null)
  ) {
    throw new UploadCompletionError(403, "Upload completion is not authorized.");
  }

  let r2: ReturnType<typeof getR2Client>;
  try {
    r2 = getR2Client();
  } catch {
    throw new UploadCompletionError(
      503,
      "Upload verification is temporarily unavailable.",
    );
  }

  const category = categoryForUpload(claims.uploadKind, claims.fileType);
  if (
    claims.object.provider !== "r2" ||
    claims.object.bucket !== r2.bucket ||
    !isExpectedR2Key({
      key: claims.object.key,
      userId: claims.userId,
      trackId: claims.trackId,
      category,
    })
  ) {
    throw new UploadCompletionError(403, "Upload completion is not authorized.");
  }

  let head;
  try {
    head = await r2.client.send(
      new HeadObjectCommand({
        Bucket: claims.object.bucket,
        Key: claims.object.key,
      }),
    );
  } catch (error) {
    if (isNotFoundProviderError(error)) {
      throw new UploadCompletionError(404, "Uploaded object was not found.");
    }

    throw new UploadCompletionError(
      503,
      "Upload verification is temporarily unavailable.",
    );
  }

  const actualContentType = head.ContentType?.split(";", 1)[0]
    ?.trim()
    .toLowerCase();
  if (
    head.ContentLength !== claims.expectedSize ||
    actualContentType !== claims.contentType.toLowerCase()
  ) {
    throw new UploadCompletionError(
      409,
      "Uploaded object does not match the authorized file.",
    );
  }

  if (
    head.ETag &&
    normalizeEtag(head.ETag) !== normalizeEtag(input.etag)
  ) {
    throw new UploadCompletionError(
      409,
      "Uploaded object does not match the authorized file.",
    );
  }

  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();

  if (claims.uploadKind === "version") {
    const { data, error } = await admin.rpc("register_r2_track_version", {
      p_user_id: user.id,
      p_track_id: claims.trackId,
      p_bucket: claims.object.bucket,
      p_object_key: claims.object.key,
      p_original_filename: claims.originalFilename,
      p_mime_type: claims.contentType,
      p_size_bytes: claims.expectedSize,
    });

    if (error || !data) {
      throw new UploadCompletionError(
        503,
        "Upload registration is temporarily unavailable.",
      );
    }

    const result: CompletedUploadDTO = {
      kind: "version",
      row: {
        id: data.id,
        trackId: data.track_id,
        versionNumber: toSafeInteger(data.version_num),
        status: data.status,
        originalFilename: data.original_filename,
        mimeType: data.mime_type,
        sizeBytes: toNullableSafeInteger(data.size_bytes),
        createdAt: data.created_at,
        storageAvailability: "production",
      },
    };

    revalidatePath("/studio");
    revalidatePath(`/studio/${claims.trackId}`);
    return result;
  }

  if (claims.uploadKind !== "file" || claims.fileType === null) {
    throw new UploadCompletionError(403, "Upload completion is not authorized.");
  }

  const { data, error } = await admin.rpc("register_r2_file", {
    p_user_id: user.id,
    p_track_id: claims.trackId,
    p_file_type: claims.fileType,
    p_bucket: claims.object.bucket,
    p_object_key: claims.object.key,
    p_original_filename: claims.originalFilename,
    p_mime_type: claims.contentType,
    p_size_bytes: claims.expectedSize,
  });

  if (error || !data) {
    throw new UploadCompletionError(
      503,
      "Upload registration is temporarily unavailable.",
    );
  }

  const result: CompletedUploadDTO = {
    kind: "file",
    row: {
      id: data.id,
      trackId: data.track_id,
      fileType: data.type,
      originalFilename: data.original_filename,
      mimeType: data.mime_type,
      sizeBytes: toSafeInteger(data.size_bytes),
      createdAt: data.created_at,
      storageAvailability: "production",
    },
  };

  revalidatePath("/studio");
  revalidatePath(`/studio/${claims.trackId}`);
  return result;
}
