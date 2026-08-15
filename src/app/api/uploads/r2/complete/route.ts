import {
  UploadCompletionError,
  completeR2Upload,
  completeUploadSchema,
} from "@/lib/uploads/complete";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ message: "Upload request is invalid." }, { status: 400 });
  }

  const parsed = completeUploadSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ message: "Upload request is invalid." }, { status: 400 });
  }

  try {
    return Response.json(await completeR2Upload(parsed.data));
  } catch (error) {
    if (error instanceof UploadCompletionError) {
      return Response.json({ message: error.message }, { status: error.status });
    }

    return Response.json(
      { message: "Upload verification is temporarily unavailable." },
      { status: 503 },
    );
  }
}
