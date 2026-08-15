import { z } from "zod";

import type { FileType, UploadKind } from "@/lib/uploads/types";

export const MAX_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024 * 1024;
export const PRESIGN_TTL_SECONDS = 600;
export const COMPLETION_GRANT_TTL_SECONDS = 1800;

const fileTypeSchema = z.enum([
  "stem",
  "flp",
  "zip",
  "artwork",
  "mix",
  "master",
  "other",
]);

export const presignRequestSchema = z
  .object({
    trackId: z.string().uuid(),
    filename: z.string().trim().min(1).max(512),
    contentType: z.string().max(255),
    size: z.number().int().positive().max(MAX_UPLOAD_SIZE_BYTES),
    uploadKind: z.enum(["version", "file"]),
    fileType: fileTypeSchema.optional(),
  })
  .superRefine((value, context) => {
    if (value.uploadKind === "file" && !value.fileType) {
      context.addIssue({
        code: "custom",
        path: ["fileType"],
        message: "Choose a production file type.",
      });
    }

    if (value.uploadKind === "version" && value.fileType) {
      context.addIssue({
        code: "custom",
        path: ["fileType"],
        message: "Versions do not accept a production file type.",
      });
    }
  });

type UploadRule = {
  canonicalContentType: string;
  aliases: readonly string[];
};

const UPLOAD_RULES: Record<string, UploadRule> = {
  ".wav": {
    canonicalContentType: "audio/wav",
    aliases: ["audio/x-wav", "audio/wave", "audio/vnd.wave"],
  },
  ".aif": {
    canonicalContentType: "audio/aiff",
    aliases: ["audio/x-aiff", "audio/aif"],
  },
  ".aiff": {
    canonicalContentType: "audio/aiff",
    aliases: ["audio/x-aiff", "audio/aif"],
  },
  ".flac": {
    canonicalContentType: "audio/flac",
    aliases: ["audio/x-flac"],
  },
  ".mp3": {
    canonicalContentType: "audio/mpeg",
    aliases: ["audio/mp3"],
  },
  ".m4a": {
    canonicalContentType: "audio/mp4",
    aliases: ["audio/x-m4a"],
  },
  ".flp": {
    canonicalContentType: "application/octet-stream",
    aliases: ["application/x-fl-studio"],
  },
  ".zip": {
    canonicalContentType: "application/zip",
    aliases: ["application/x-zip-compressed"],
  },
  ".png": { canonicalContentType: "image/png", aliases: [] },
  ".jpg": { canonicalContentType: "image/jpeg", aliases: ["image/jpg"] },
  ".jpeg": { canonicalContentType: "image/jpeg", aliases: ["image/jpg"] },
  ".webp": { canonicalContentType: "image/webp", aliases: [] },
  ".tif": { canonicalContentType: "image/tiff", aliases: ["image/x-tiff"] },
  ".tiff": { canonicalContentType: "image/tiff", aliases: ["image/x-tiff"] },
  ".pdf": { canonicalContentType: "application/pdf", aliases: [] },
  ".txt": { canonicalContentType: "text/plain", aliases: [] },
  ".md": { canonicalContentType: "text/markdown", aliases: ["text/plain"] },
  ".json": { canonicalContentType: "application/json", aliases: ["text/json"] },
  ".mid": {
    canonicalContentType: "audio/midi",
    aliases: ["audio/x-midi", "application/x-midi"],
  },
  ".midi": {
    canonicalContentType: "audio/midi",
    aliases: ["audio/x-midi", "application/x-midi"],
  },
};

const AUDIO_EXTENSIONS = [".wav", ".aif", ".aiff", ".flac", ".mp3", ".m4a"];
const ARTWORK_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp", ".tif", ".tiff"];
const OTHER_EXTENSIONS = [".pdf", ".txt", ".md", ".json", ".mid", ".midi"];
const INVALID_UPLOAD_TYPE_MESSAGE =
  "This file type is not allowed for the selected upload kind.";

function extensionsForSelection(
  uploadKind: UploadKind,
  fileType: FileType | null,
): readonly string[] {
  if (uploadKind === "version") return AUDIO_EXTENSIONS;
  if (!fileType) return [];
  if (fileType === "stem" || fileType === "mix" || fileType === "master") {
    return AUDIO_EXTENSIONS;
  }
  if (fileType === "flp") return [".flp"];
  if (fileType === "zip") return [".zip"];
  if (fileType === "artwork") return ARTWORK_EXTENSIONS;
  return OTHER_EXTENSIONS;
}

function extensionForFilename(filename: string): string | null {
  return filename
    .trim()
    .normalize("NFKC")
    .toLowerCase()
    .match(/\.[a-z0-9]+$/)?.[0] ?? null;
}

function normalizeBrowserContentType(contentType: string): string {
  return contentType.split(";", 1)[0]?.trim().toLowerCase() ?? "";
}

export function normalizeUploadSelection(input: {
  filename: string;
  browserContentType: string;
  uploadKind: UploadKind;
  fileType: FileType | null;
}):
  | { ok: true; extension: string; canonicalContentType: string }
  | { ok: false; message: string } {
  const extension = extensionForFilename(input.filename);
  const allowedExtensions = extensionsForSelection(
    input.uploadKind,
    input.fileType,
  );

  if (!extension || !allowedExtensions.includes(extension)) {
    return { ok: false, message: INVALID_UPLOAD_TYPE_MESSAGE };
  }

  const rule = UPLOAD_RULES[extension];
  const browserContentType = normalizeBrowserContentType(input.browserContentType);
  const isGenericContentType =
    !browserContentType || browserContentType === "application/octet-stream";

  if (
    !isGenericContentType &&
    browserContentType !== rule.canonicalContentType &&
    !rule.aliases.includes(browserContentType)
  ) {
    return { ok: false, message: INVALID_UPLOAD_TYPE_MESSAGE };
  }

  return {
    ok: true,
    extension,
    canonicalContentType: rule.canonicalContentType,
  };
}

export function getAllowedUploadTypes(
  uploadKind: UploadKind,
  fileType: FileType | null,
): string[] {
  const extensions = extensionsForSelection(uploadKind, fileType);

  return Array.from(
    new Set(
      extensions.flatMap((extension) => {
        const rule = UPLOAD_RULES[extension];
        return [extension, rule.canonicalContentType, ...rule.aliases];
      }),
    ),
  );
}
