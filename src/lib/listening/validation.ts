import { z } from "zod";

export const listeningMessages = {
  linkUnavailable: "Listening link unavailable.",
  playbackTemporarilyUnavailable: "Playback is temporarily unavailable.",
  signInRequired: "You must sign in to manage listening links.",
} as const;

export const createListeningLinkSchema = z
  .object({
    trackId: z.string().uuid(),
    versionId: z.string().uuid(),
    label: z.string().trim().min(1).max(120).nullable(),
    expiresAt: z.string().datetime({ offset: true }),
  })
  .strict();

export const revokeListeningLinkSchema = z
  .object({ linkId: z.string().uuid() })
  .strict();

export const refreshListeningSchema = z
  .object({ token: z.string().regex(/^[A-Za-z0-9_-]{43}$/) })
  .strict();

export type CreateListeningLinkSchemaInput = z.infer<
  typeof createListeningLinkSchema
>;
export type RevokeListeningLinkSchemaInput = z.infer<
  typeof revokeListeningLinkSchema
>;
export type RefreshListeningSchemaInput = z.infer<typeof refreshListeningSchema>;
