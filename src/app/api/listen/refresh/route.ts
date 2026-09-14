import { NextResponse } from "next/server";

import { refreshPublicListeningToken } from "@/lib/listening/service";
import { refreshListeningSchema } from "@/lib/listening/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const sensitiveHeaders = {
  "Cache-Control": "no-store",
  "Referrer-Policy": "no-referrer",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
} as const;

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Listening link unavailable." },
      { status: 400, headers: sensitiveHeaders },
    );
  }

  const parsed = refreshListeningSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Listening link unavailable." },
      { status: 400, headers: sensitiveHeaders },
    );
  }

  const result = await refreshPublicListeningToken(parsed.data.token);

  switch (result.state) {
    case "ready":
      return NextResponse.json(result.refresh, {
        headers: sensitiveHeaders,
      });
    case "unavailable":
      return NextResponse.json(
        { error: "Listening link unavailable." },
        { status: 410, headers: sensitiveHeaders },
      );
    case "temporarily_unavailable":
      return NextResponse.json(
        { error: "Playback is temporarily unavailable." },
        { status: 503, headers: sensitiveHeaders },
      );
  }
}
