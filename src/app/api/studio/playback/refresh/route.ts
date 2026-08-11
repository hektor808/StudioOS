import { getSignedPlaybackSource } from "@/lib/studio/playback";
import {
  playbackRefreshSchema,
  studioMessages,
} from "@/lib/studio/validation";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json(
      { message: studioMessages.playbackUnavailable },
      { status: 400 },
    );
  }

  const parsed = playbackRefreshSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { message: studioMessages.playbackUnavailable },
      { status: 400 },
    );
  }

  try {
    const source = await getSignedPlaybackSource(parsed.data.versionId);
    return Response.json({
      playbackUrl: source.playbackUrl,
      expiresAt: source.expiresAt,
    });
  } catch {
    return Response.json(
      { message: studioMessages.playbackUnavailable },
      { status: 403 },
    );
  }
}
