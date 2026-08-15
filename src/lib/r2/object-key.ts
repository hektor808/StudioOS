import "server-only";

import { randomUUID } from "node:crypto";

import type {
  FileType,
  UploadCategory,
  UploadKind,
} from "@/lib/uploads/types";

export type BuildR2ObjectKeyInput = {
  userId: string;
  trackId: string;
  uploadKind: UploadKind;
  fileType: FileType | null;
  filename: string;
  uuid?: string;
};

function assertSafeIdentifier(value: string, name: string): void {
  if (!value || value.includes("/") || value.includes("\\") || value.includes("..")) {
    throw new Error(`Invalid ${name}.`);
  }
}

export function categoryForUpload(
  uploadKind: UploadKind,
  fileType: FileType | null,
): UploadCategory {
  if (uploadKind === "version") return "versions";
  if (fileType === "stem") return "stems";
  if (fileType === "flp") return "projects";
  if (fileType === "zip") return "archives";
  if (fileType === "artwork") return "artwork";
  return "other";
}

export function sanitizeUploadFilename(filename: string): string {
  const finalSegment = filename.split(/[\\/]/).filter(Boolean).at(-1) ?? "";
  const normalized = finalSegment.normalize("NFKC");
  const extensionMatch = normalized.match(/\.[A-Za-z0-9]{1,15}$/);
  const extension = extensionMatch?.[0].toLowerCase() ?? "";
  const baseSource = extension
    ? normalized.slice(0, -extension.length)
    : normalized;
  const base = baseSource
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/^[._-]+|[._-]+$/g, "");
  const fallbackBase = base || "upload";
  const maxBaseLength = 160 - extension.length;

  return `${fallbackBase.slice(0, maxBaseLength) || "upload"}${extension}`;
}

export function expectedR2Prefix(input: {
  userId: string;
  trackId: string;
  category: UploadCategory;
}): string {
  assertSafeIdentifier(input.userId, "user ID");
  assertSafeIdentifier(input.trackId, "track ID");

  return `teams/default/${input.userId}/${input.trackId}/${input.category}/`;
}

export function buildR2ObjectKey(input: BuildR2ObjectKeyInput): string {
  const category = categoryForUpload(input.uploadKind, input.fileType);
  const prefix = expectedR2Prefix({
    userId: input.userId,
    trackId: input.trackId,
    category,
  });

  return `${prefix}${input.uuid ?? randomUUID()}-${sanitizeUploadFilename(input.filename)}`;
}

export function isExpectedR2Key(input: {
  key: string;
  userId: string;
  trackId: string;
  category: UploadCategory;
}): boolean {
  try {
    if (
      !input.key ||
      input.key.includes("..") ||
      input.key.includes("\\")
    ) {
      return false;
    }

    const prefix = expectedR2Prefix(input);
    if (!input.key.startsWith(prefix)) {
      return false;
    }

    const objectName = input.key.slice(prefix.length);
    return Boolean(objectName) && !objectName.includes("/");
  } catch {
    return false;
  }
}
