import type { Database } from "@/types/database.types";

export type UploadKind = "version" | "file";
export type UploadCategory =
  | "versions"
  | "stems"
  | "projects"
  | "archives"
  | "artwork"
  | "other";
export type FileType = Database["public"]["Enums"]["file_type"];

/** Server-side persistent storage locator. Never return this to the browser. */
export type StorageLocator = {
  provider: Database["public"]["Enums"]["storage_provider"];
  bucket: string;
  key: string;
};

/** Server-side claims carried only inside a signed completion grant. */
export type CompletionGrantClaims = {
  version: 1;
  userId: string;
  trackId: string;
  object: StorageLocator & { provider: "r2" };
  uploadKind: UploadKind;
  fileType: FileType | null;
  originalFilename: string;
  contentType: string;
  expectedSize: number;
  expiresAt: number;
};

/** Browser-facing presign metadata. The object locator remains opaque. */
export type PresignResponse = {
  method: "PUT";
  url: string;
  headers: { "Content-Type": string };
  expiresAt: string;
  completionGrant: string;
};

export type CompletedUploadDTO =
  | {
      kind: "version";
      row: {
        id: string;
        trackId: string;
        versionNumber: number;
        status: Database["public"]["Enums"]["track_version_status"];
        originalFilename: string;
        mimeType: string | null;
        sizeBytes: number | null;
        createdAt: string;
        storageAvailability: "production";
      };
    }
  | {
      kind: "file";
      row: {
        id: string;
        trackId: string;
        fileType: FileType;
        originalFilename: string;
        mimeType: string | null;
        sizeBytes: number;
        createdAt: string;
        storageAvailability: "production";
      };
    };

export type SignedDownloadDTO = {
  url: string;
  expiresAt: string;
};
