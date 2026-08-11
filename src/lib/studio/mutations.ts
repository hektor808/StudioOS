"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSignedPlaybackSource } from "@/lib/studio/playback";
import type {
  SignedPlaybackSource,
  StudioActionResult,
} from "@/lib/studio/types";
import {
  addCommentSchema,
  COMMENT_TIMESTAMP_TOLERANCE_SECONDS,
  createTrackSchema,
  studioMessages,
  versionIdSchema,
} from "@/lib/studio/validation";

const studioSuccessMessages = {
  trackCreated: "Track created.",
  commentAdded: "Comment added.",
  commentResolved: "Comment resolved.",
} as const;

function validationMessage(issues: { message: string }[]): string {
  return issues[0]?.message ?? studioMessages.mutationFailed;
}

export async function createTrackAction(
  previousState: StudioActionResult,
  formData: FormData,
): Promise<StudioActionResult> {
  void previousState;
  const parsed = createTrackSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    return {
      status: "error",
      message: validationMessage(parsed.error.issues),
      fieldErrors: {
        title: fieldErrors.title?.[0],
        description: fieldErrors.description?.[0],
      },
    };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { status: "error", message: studioMessages.mutationFailed };
    }

    const { error } = await supabase.from("tracks").insert({
      title: parsed.data.title,
      description: parsed.data.description,
      created_by: user.id,
    });

    if (error) {
      return { status: "error", message: studioMessages.mutationFailed };
    }

    revalidatePath("/studio");
    return { status: "success", message: studioSuccessMessages.trackCreated };
  } catch {
    return { status: "error", message: studioMessages.mutationFailed };
  }
}

export async function addCommentAction(
  previousState: StudioActionResult,
  formData: FormData,
): Promise<StudioActionResult> {
  void previousState;
  const parsed = addCommentSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    return {
      status: "error",
      message: validationMessage(parsed.error.issues),
      fieldErrors: {
        versionId: fieldErrors.versionId?.[0],
        timestampMarker: fieldErrors.timestampMarker?.[0],
        content: fieldErrors.content?.[0],
      },
    };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { status: "error", message: studioMessages.mutationFailed };
    }

    const { data: version, error: versionError } = await supabase
      .from("track_versions")
      .select("track_id,status,duration_seconds")
      .eq("id", parsed.data.versionId)
      .maybeSingle();

    if (versionError) {
      return { status: "error", message: studioMessages.mutationFailed };
    }

    const durationSeconds = version?.duration_seconds;
    if (
      !version ||
      version.status !== "ready" ||
      durationSeconds === null ||
      durationSeconds === undefined ||
      !Number.isFinite(durationSeconds) ||
      durationSeconds < 0 ||
      parsed.data.timestampMarker >
        durationSeconds + COMMENT_TIMESTAMP_TOLERANCE_SECONDS
    ) {
      return {
        status: "error",
        message: studioMessages.markerInvalid,
        fieldErrors: { timestampMarker: studioMessages.markerInvalid },
      };
    }

    const { error } = await supabase.from("comments").insert({
      version_id: parsed.data.versionId,
      user_id: user.id,
      timestamp_marker: parsed.data.timestampMarker,
      content: parsed.data.content,
    });

    if (error) {
      return { status: "error", message: studioMessages.mutationFailed };
    }

    revalidatePath("/studio");
    revalidatePath(`/studio/${version.track_id}`);
    return { status: "success", message: studioSuccessMessages.commentAdded };
  } catch {
    return { status: "error", message: studioMessages.mutationFailed };
  }
}

export async function resolveCommentAction(
  commentId: string,
): Promise<StudioActionResult> {
  if (!versionIdSchema.safeParse(commentId).success) {
    return { status: "error", message: studioMessages.mutationFailed };
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("comments")
      .update({ is_resolved: true })
      .eq("id", commentId)
      .select(
        "track_versions!comments_version_id_fkey(track_id,tracks!track_versions_track_id_fkey(id))",
      )
      .maybeSingle();

    if (error || !data?.track_versions?.tracks) {
      return { status: "error", message: studioMessages.mutationFailed };
    }

    const trackId = data.track_versions.track_id;
    revalidatePath("/studio");
    revalidatePath(`/studio/${trackId}`);
    return { status: "success", message: studioSuccessMessages.commentResolved };
  } catch {
    return { status: "error", message: studioMessages.mutationFailed };
  }
}

export async function requestPlaybackSourceAction(
  versionId: string,
): Promise<
  | { status: "success"; source: SignedPlaybackSource }
  | { status: "error"; message: string }
> {
  try {
    const source = await getSignedPlaybackSource(versionId);
    return { status: "success", source };
  } catch {
    return { status: "error", message: studioMessages.playbackUnavailable };
  }
}
