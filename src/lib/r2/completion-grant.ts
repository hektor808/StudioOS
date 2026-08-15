import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

import { getR2Config } from "@/lib/r2/env";
import type { CompletionGrantClaims } from "@/lib/uploads/types";

const INVALID_GRANT_ERROR = "Upload completion grant is invalid.";

const storageLocatorSchema = z
  .object({
    provider: z.literal("r2"),
    bucket: z.string().min(1),
    key: z.string().min(1),
  })
  .strict();

const completionGrantClaimsSchema = z
  .object({
    version: z.literal(1),
    userId: z.string().min(1),
    trackId: z.string().min(1),
    object: storageLocatorSchema,
    uploadKind: z.enum(["version", "file"]),
    fileType: z
      .enum(["stem", "flp", "zip", "artwork", "mix", "master", "other"])
      .nullable(),
    originalFilename: z.string().min(1),
    contentType: z.string().min(1),
    expectedSize: z.number().int().nonnegative(),
    expiresAt: z.number().int().positive(),
  })
  .strict();

export function createCompletionGrant(claims: CompletionGrantClaims): string {
  const payload = Buffer.from(JSON.stringify(claims), "utf8").toString("base64url");
  const signature = createHmac("sha256", getR2Config().uploadGrantSecret)
    .update(payload)
    .digest("base64url");

  return `${payload}.${signature}`;
}

export function verifyCompletionGrant(
  token: string,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): CompletionGrantClaims {
  try {
    const segments = token.split(".");
    if (segments.length !== 2 || !segments[0] || !segments[1]) {
      throw new Error(INVALID_GRANT_ERROR);
    }

    const [payload, signature] = segments;
    const expectedSignature = createHmac("sha256", getR2Config().uploadGrantSecret)
      .update(payload)
      .digest("base64url");
    const signatureBuffer = Buffer.from(signature, "base64url");
    const expectedSignatureBuffer = Buffer.from(expectedSignature, "base64url");

    if (
      signatureBuffer.length !== expectedSignatureBuffer.length ||
      !timingSafeEqual(signatureBuffer, expectedSignatureBuffer)
    ) {
      throw new Error(INVALID_GRANT_ERROR);
    }

    const claims = completionGrantClaimsSchema.parse(
      JSON.parse(Buffer.from(payload, "base64url").toString("utf8")),
    );

    if (claims.expiresAt <= nowSeconds) {
      throw new Error(INVALID_GRANT_ERROR);
    }

    return claims;
  } catch {
    throw new Error(INVALID_GRANT_ERROR);
  }
}
