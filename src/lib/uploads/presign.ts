import "server-only";

import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { z } from "zod";

import { createCompletionGrant } from "@/lib/r2/completion-grant";
import { getR2Client } from "@/lib/r2/client";
import { buildR2ObjectKey } from "@/lib/r2/object-key";
import { createClient } from "@/lib/supabase/server";
import type { PresignResponse } from "@/lib/uploads/types";
import {
  COMPLETION_GRANT_TTL_SECONDS,
  PRESIGN_TTL_SECONDS,
  normalizeUploadSelection,
  presignRequestSchema,
} from "@/lib/uploads/validation";

export type CreateR2PresignInput = z.infer<typeof presignRequestSchema>;

export class UploadHttpError extends Error {
  constructor(
    public readonly status: 400 | 401 | 403 | 404 | 503,
    message: string,
  ) {
    super(message);
    this.name = "UploadHttpError";
  }
}

export async function createR2Presign(
  input: CreateR2PresignInput,
): Promise<PresignResponse> {
  const fileType = input.uploadKind === "file" ? input.fileType! : null;
  const selection = normalizeUploadSelection({
    filename: input.filename,
    browserContentType: input.contentType,
    uploadKind: input.uploadKind,
    fileType,
  });

  if (!selection.ok) {
    throw new UploadHttpError(400, selection.message);
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new UploadHttpError(401, "Sign in to upload files.");
  }

  const { data: track, error: trackError } = await supabase
    .from("tracks")
    .select("id")
    .eq("id", input.trackId)
    .maybeSingle();

  if (trackError) {
    throw new UploadHttpError(503, "Uploads are temporarily unavailable.");
  }

  if (!track) {
    throw new UploadHttpError(404, "Track not found.");
  }

  const { data: canManageTrack, error: capabilityError } = await supabase.rpc(
    "can_manage_track",
    { track_id: input.trackId },
  );

  if (capabilityError) {
    throw new UploadHttpError(503, "Uploads are temporarily unavailable.");
  }

  if (!canManageTrack) {
    throw new UploadHttpError(403, "You cannot upload to this track.");
  }

  let r2: ReturnType<typeof getR2Client>;
  try {
    r2 = getR2Client();
  } catch {
    throw new UploadHttpError(503, "R2 storage is not configured.");
  }

  const key = buildR2ObjectKey({
    userId: user.id,
    trackId: input.trackId,
    uploadKind: input.uploadKind,
    fileType,
    filename: input.filename,
  });
  const nowSeconds = Math.floor(Date.now() / 1000);
  const url = await getSignedUrl(
    r2.client,
    new PutObjectCommand({
      Bucket: r2.bucket,
      Key: key,
      ContentType: selection.canonicalContentType,
    }),
    { expiresIn: PRESIGN_TTL_SECONDS },
  );
  const completionGrant = createCompletionGrant({
    version: 1,
    userId: user.id,
    trackId: input.trackId,
    object: {
      provider: "r2",
      bucket: r2.bucket,
      key,
    },
    uploadKind: input.uploadKind,
    fileType,
    originalFilename: input.filename.trim(),
    contentType: selection.canonicalContentType,
    expectedSize: input.size,
    expiresAt: nowSeconds + COMPLETION_GRANT_TTL_SECONDS,
  });

  return {
    method: "PUT",
    url,
    headers: { "Content-Type": selection.canonicalContentType },
    expiresAt: new Date(
      (nowSeconds + PRESIGN_TTL_SECONDS) * 1000,
    ).toISOString(),
    completionGrant,
  };
}
