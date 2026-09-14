"use client";

import Uppy, { type Meta, type UppyFile } from "@uppy/core";
import AwsS3 from "@uppy/aws-s3";
import Dashboard from "@uppy/react/dashboard";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import type {
  CompletedUploadDTO,
  FileType,
  PresignResponse,
  UploadKind,
} from "@/lib/uploads/types";
import {
  MAX_UPLOAD_SIZE_BYTES,
  PRESIGN_TTL_SECONDS,
  getAllowedUploadTypes,
} from "@/lib/uploads/validation";

type R2UploadMeta = Meta & {
  completionGrant?: string;
};

type R2UploadBody = {
  ETag: string;
  etag?: string;
};

export type R2UploaderProps = {
  trackId: string;
  uploadKind: UploadKind;
  fileType: FileType | null;
  onRegistered?: (upload: CompletedUploadDTO) => void;
};

type RegistrationRetry = {
  fileId: string;
  completionGrant: string;
  etag: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isPresignResponse(value: unknown): value is PresignResponse {
  if (!isRecord(value) || !isRecord(value.headers)) {
    return false;
  }

  return (
    value.method === "PUT" &&
    typeof value.url === "string" &&
    typeof value.headers["Content-Type"] === "string" &&
    typeof value.expiresAt === "string" &&
    typeof value.completionGrant === "string"
  );
}

function isCompletedUpload(value: unknown): value is CompletedUploadDTO {
  if (!isRecord(value) || !isRecord(value.row)) {
    return false;
  }

  return (
    (value.kind === "version" || value.kind === "file") &&
    typeof value.row.id === "string" &&
    typeof value.row.trackId === "string" &&
    typeof value.row.originalFilename === "string"
  );
}

async function readErrorMessage(response: Response): Promise<string | null> {
  try {
    const payload: unknown = await response.json();
    return isRecord(payload) && typeof payload.message === "string"
      ? payload.message
      : null;
  } catch {
    return null;
  }
}

function presignFailureMessage(status: number): string {
  if (status === 400) return "Choose an approved file below 5 GiB.";
  if (status === 401) return "Sign in again before uploading.";
  if (status === 403) return "You cannot upload to this track.";
  if (status === 404) return "This track is no longer available.";
  return "Uploads are temporarily unavailable.";
}

export function R2Uploader({
  trackId,
  uploadKind,
  fileType,
  onRegistered,
}: R2UploaderProps) {
  const router = useRouter();
  const [r2Unavailable, setR2Unavailable] = useState(false);
  const [registeringFileId, setRegisteringFileId] = useState<string | null>(
    null,
  );
  const [registrationRetries, setRegistrationRetries] = useState<
    RegistrationRetry[]
  >([]);
  const [registeredUploads, setRegisteredUploads] = useState<
    CompletedUploadDTO[]
  >([]);
  const onRegisteredRef = useRef(onRegistered);
  onRegisteredRef.current = onRegistered;

  const [uppy] = useState(() => {
    const instance = new Uppy<R2UploadMeta, R2UploadBody>({
      autoProceed: false,
      allowMultipleUploadBatches: true,
      restrictions: {
        maxFileSize: MAX_UPLOAD_SIZE_BYTES,
        maxNumberOfFiles: 10,
        minNumberOfFiles: 1,
        allowedFileTypes: getAllowedUploadTypes(uploadKind, fileType),
      },
    });

    instance.use(AwsS3, {
      shouldUseMultipart: false,
      retryDelays: [0, 1000, 3000, 5000],
      getUploadParameters: async (file, { signal }) => {
        const response = await fetch("/api/uploads/r2/presign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            trackId,
            filename: file.name,
            contentType: file.type ?? "",
            size: file.size,
            uploadKind,
            ...(uploadKind === "file" ? { fileType } : {}),
          }),
          signal,
        });

        if (!response.ok) {
          const message = await readErrorMessage(response);
          if (
            response.status === 503 &&
            message === "R2 storage is not configured."
          ) {
            setR2Unavailable(true);
            instance.cancelAll();
          }

          throw new Error(presignFailureMessage(response.status));
        }

        const payload: unknown = await response.json();
        if (!isPresignResponse(payload)) {
          throw new Error("Uploads are temporarily unavailable.");
        }

        instance.setFileMeta(file.id, {
          completionGrant: payload.completionGrant,
        });

        return {
          method: "PUT",
          url: payload.url,
          fields: {},
          headers: payload.headers,
          expires: PRESIGN_TTL_SECONDS,
        };
      },
    });

    return instance;
  });

  const registerProductionFile = useCallback(
    async (retry: RegistrationRetry) => {
      setRegisteringFileId(retry.fileId);

      try {
        const response = await fetch("/api/uploads/r2/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            completionGrant: retry.completionGrant,
            etag: retry.etag,
          }),
        });

        if (!response.ok) {
          throw new Error("Upload registration failed.");
        }

        const payload: unknown = await response.json();
        if (!isCompletedUpload(payload)) {
          throw new Error("Upload registration failed.");
        }

        uppy.setFileMeta(retry.fileId, { completionGrant: undefined });
        setRegistrationRetries((current) =>
          current.filter((entry) => entry.fileId !== retry.fileId),
        );
        setRegisteredUploads((current) => [
          payload,
          ...current.filter((entry) => entry.row.id !== payload.row.id),
        ]);
        onRegisteredRef.current?.(payload);
        router.refresh();
      } catch {
        setRegistrationRetries((current) => [
          ...current.filter((entry) => entry.fileId !== retry.fileId),
          retry,
        ]);
      } finally {
        setRegisteringFileId(null);
      }
    },
    [router, uppy],
  );

  useEffect(() => {
    uppy.setOptions({
      restrictions: {
        maxFileSize: MAX_UPLOAD_SIZE_BYTES,
        maxNumberOfFiles: 10,
        minNumberOfFiles: 1,
        allowedFileTypes: getAllowedUploadTypes(uploadKind, fileType),
      },
    });
  }, [fileType, uploadKind, uppy]);

  useEffect(() => {
    const handleUploadSuccess = (
      file: UppyFile<R2UploadMeta, R2UploadBody> | undefined,
      response: NonNullable<UppyFile<R2UploadMeta, R2UploadBody>["response"]>,
    ) => {
      if (!file) {
        return;
      }

      const completionGrant = file.meta.completionGrant;
      const body = response.body;
      const etag = body?.ETag ?? body?.etag;

      if (!completionGrant || !etag) {
        return;
      }

      void registerProductionFile({
        fileId: file.id,
        completionGrant,
        etag,
      });
    };

    uppy.on("upload-success", handleUploadSuccess);

    return () => {
      uppy.off("upload-success", handleUploadSuccess);
      uppy.destroy();
    };
  }, [registerProductionFile, uppy]);

  if (r2Unavailable) {
    return (
      <p
        className="rounded-xl border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive"
        role="alert"
      >
        R2 storage is not configured. Existing Studio data remains available.
      </p>
    );
  }

  return (
    <div className="grid gap-4">
      {registeringFileId ? (
        <p className="text-sm text-muted-foreground" role="status">
          Registering production file…
        </p>
      ) : null}

      {registrationRetries.map((retry) => (
        <div
          key={retry.fileId}
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/50 bg-destructive/10 p-4"
          role="alert"
        >
          <p className="text-sm text-destructive">
            The object uploaded, but registration failed. Retry registration
            without uploading again.
          </p>
          <button
            type="button"
            className="rounded-lg border border-destructive/60 px-3 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={registeringFileId === retry.fileId}
            onClick={() => void registerProductionFile(retry)}
          >
            Retry registration
          </button>
        </div>
      ))}

      {registeredUploads.map((upload) => (
        <p
          key={upload.row.id}
          className="rounded-xl border border-primary/30 bg-primary-container/10 p-3 text-sm text-foreground"
          role="status"
        >
          Registered {upload.row.originalFilename}.
        </p>
      ))}

      <Dashboard
        uppy={uppy}
        width="100%"
        height={360}
        proudlyDisplayPoweredByUppy={false}
        hideProgressDetails={false}
        note="Direct private R2 upload. Maximum 5 GiB per file."
      />
    </div>
  );
}
