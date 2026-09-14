"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

export type DownloadButtonProps = {
  recordType: "version" | "file";
  recordId: string;
  filename: string;
};

function isSignedDownload(value: unknown): value is { url: string; expiresAt: string } {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const response = value as { url?: unknown; expiresAt?: unknown };
  return (
    typeof response.url === "string" &&
    typeof response.expiresAt === "string" &&
    Number.isFinite(Date.parse(response.expiresAt))
  );
}

export function DownloadButton({
  recordType,
  recordId,
  filename,
}: DownloadButtonProps) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async () => {
    setIsPending(true);
    setError(null);

    try {
      const response = await fetch("/api/studio/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recordType, recordId }),
      });

      if (!response.ok) {
        throw new Error("Download unavailable.");
      }

      const payload: unknown = await response.json();
      if (!isSignedDownload(payload)) {
        throw new Error("Download unavailable.");
      }

      const anchor = document.createElement("a");
      anchor.href = payload.url;
      anchor.download = filename;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
    } catch {
      setError("Download is unavailable. Try again.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="grid gap-2">
      <Button
        type="button"
        size="sm"
        variant="glass"
        disabled={isPending}
        onClick={() => void handleDownload()}
      >
        {isPending ? "Preparing…" : "Download"}
      </Button>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
