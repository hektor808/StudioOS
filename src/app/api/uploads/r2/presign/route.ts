import { createR2Presign, UploadHttpError } from "@/lib/uploads/presign";
import { presignRequestSchema } from "@/lib/uploads/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ message: "Upload request is invalid." }, { status: 400 });
  }

  const parsed = presignRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ message: "Upload request is invalid." }, { status: 400 });
  }

  try {
    return Response.json(await createR2Presign(parsed.data));
  } catch (error) {
    if (error instanceof UploadHttpError) {
      return Response.json({ message: error.message }, { status: error.status });
    }

    return Response.json(
      { message: "Uploads are temporarily unavailable." },
      { status: 503 },
    );
  }
}
