import { NextResponse } from "next/server";

import {
  answerVeoAiQuestion,
  VEO_AI_UNAVAILABLE_MESSAGE,
  veoAiChatRequestSchema,
} from "@/lib/ai/chat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const INVALID_MESSAGE = "Invalid VEO AI message.";
const responseHeaders = { "Cache-Control": "no-store" } as const;

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: INVALID_MESSAGE },
      { status: 400, headers: responseHeaders },
    );
  }

  const parsed = veoAiChatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: INVALID_MESSAGE },
      { status: 400, headers: responseHeaders },
    );
  }

  try {
    const result = await answerVeoAiQuestion(parsed.data.messages);
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status, headers: responseHeaders },
      );
    }
    return NextResponse.json(
      { answer: result.answer, sources: result.sources },
      { headers: responseHeaders },
    );
  } catch {
    return NextResponse.json(
      { error: VEO_AI_UNAVAILABLE_MESSAGE },
      { status: 503, headers: responseHeaders },
    );
  }
}
