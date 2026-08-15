import { z } from "zod";

import { getR2Config } from "@/lib/r2/env";
import { createClient } from "@/lib/supabase/server";
import {
  isSafePrivateObjectKey,
  signStorageDownload,
} from "@/lib/storage/signer";
import type { StorageLocator } from "@/lib/uploads/types";

const downloadRequestSchema = z
  .object({
    recordType: z.enum(["version", "file"]),
    recordId: z.string().uuid(),
  })
  .strict();

const DOWNLOAD_NOT_FOUND = "Download not found.";
const DOWNLOAD_UNAVAILABLE = "Download is temporarily unavailable.";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ message: "Download request is invalid." }, { status: 400 });
  }

  const parsed = downloadRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ message: "Download request is invalid." }, { status: 400 });
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return Response.json(
        { message: "Sign in to download files." },
        { status: 401 },
      );
    }

    const table =
      parsed.data.recordType === "version" ? "track_versions" : "files";
    const { data: record, error: recordError } = await supabase
      .from(table)
      .select("storage_provider,storage_bucket,storage_url,original_filename")
      .eq("id", parsed.data.recordId)
      .maybeSingle();

    if (recordError || !record) {
      return Response.json({ message: DOWNLOAD_NOT_FOUND }, { status: 404 });
    }

    const locator: StorageLocator = {
      provider: record.storage_provider,
      bucket: record.storage_bucket,
      key: record.storage_url,
    };

    if (!isSafePrivateObjectKey(locator.key)) {
      return Response.json({ message: DOWNLOAD_NOT_FOUND }, { status: 404 });
    }

    if (locator.provider === "supabase") {
      if (locator.bucket !== "playback") {
        return Response.json({ message: DOWNLOAD_NOT_FOUND }, { status: 404 });
      }
    } else if (locator.provider === "r2") {
      let bucketName: string;
      try {
        bucketName = getR2Config().bucketName;
      } catch {
        return Response.json({ message: DOWNLOAD_UNAVAILABLE }, { status: 503 });
      }

      if (locator.bucket !== bucketName) {
        return Response.json({ message: DOWNLOAD_NOT_FOUND }, { status: 404 });
      }
    } else {
      return Response.json({ message: DOWNLOAD_NOT_FOUND }, { status: 404 });
    }

    try {
      return Response.json(
        await signStorageDownload(locator, record.original_filename),
      );
    } catch {
      return Response.json({ message: DOWNLOAD_UNAVAILABLE }, { status: 503 });
    }
  } catch {
    return Response.json({ message: DOWNLOAD_UNAVAILABLE }, { status: 503 });
  }
}
