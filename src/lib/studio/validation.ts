import { z } from "zod";

export const COMMENT_TIMESTAMP_TOLERANCE_SECONDS = 0.25;

export const studioMessages = {
  trackTitleRequired: "Enter a track title.",
  trackTitleLength: "Track titles must be 160 characters or fewer.",
  trackDescriptionLength: "Descriptions must be 4,000 characters or fewer.",
  versionRequired: "Choose a valid version.",
  markerInvalid: "Choose a valid timestamp.",
  commentRequired: "Enter a comment.",
  commentLength: "Comments must be 2,000 characters or fewer.",
  mutationFailed: "Your changes could not be saved. Try again.",
  playbackUnavailable: "Playback is unavailable. Try again.",
} as const;

export const createTrackSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, studioMessages.trackTitleRequired)
    .max(160, studioMessages.trackTitleLength),
  description: z
    .string()
    .trim()
    .max(4000, studioMessages.trackDescriptionLength),
});

export const versionIdSchema = z.string().uuid(studioMessages.versionRequired);

export const addCommentSchema = z.object({
  versionId: versionIdSchema,
  timestampMarker: z.coerce
    .number()
    .finite(studioMessages.markerInvalid)
    .min(0, studioMessages.markerInvalid),
  content: z
    .string()
    .trim()
    .min(1, studioMessages.commentRequired)
    .max(2000, studioMessages.commentLength),
});

export const playbackRefreshSchema = z.object({ versionId: versionIdSchema });

export type CreateTrackInput = z.infer<typeof createTrackSchema>;
export type VersionIdInput = z.infer<typeof versionIdSchema>;
export type AddCommentInput = z.infer<typeof addCommentSchema>;
export type PlaybackRefreshInput = z.infer<typeof playbackRefreshSchema>;
