"use client";

import { Check, Copy, LinkBreak, WarningCircle } from "@phosphor-icons/react";
import { useEffect, useRef, useState, type FormEvent } from "react";

import type {
  ListeningCreateActionResult,
  ListeningRevokeActionResult,
} from "@/app/(dashboard)/studio/[trackId]/listening-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type {
  CreateListeningLinkInput,
  ListeningLinkSummary,
  ReadyListeningVersion,
} from "@/lib/listening/types";
import { cn } from "@/lib/utils";

const dateFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

const COPY_RESET_MS = 2000;

export type ListeningLinkManagerProps = {
  trackId: string;
  versions: ReadyListeningVersion[];
  initialLinks: ListeningLinkSummary[];
  createListeningLinkAction: (
    input: CreateListeningLinkInput,
  ) => Promise<ListeningCreateActionResult>;
  revokeListeningLinkAction: (input: {
    linkId: string;
  }) => Promise<ListeningRevokeActionResult>;
};

type ListeningLinkState = "active" | "expired" | "revoked";

function linkState(link: ListeningLinkSummary): ListeningLinkState {
  if (link.revokedAt) {
    return "revoked";
  }

  if (link.expiresAt <= new Date().toISOString()) {
    return "expired";
  }

  return "active";
}

function formatTimestamp(value: string): string {
  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : dateFormatter.format(date);
}

function toLocalDateTimeInputValue(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");

  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

const stateBadgeClasses: Record<ListeningLinkState, string> = {
  active: "bg-primary-container/20 text-primary",
  expired: "border border-border text-muted-foreground",
  revoked: "bg-destructive/15 text-destructive",
};

export function ListeningLinkManager({
  trackId,
  versions,
  initialLinks,
  createListeningLinkAction,
  revokeListeningLinkAction,
}: ListeningLinkManagerProps) {
  const [links, setLinks] = useState<ListeningLinkSummary[]>(initialLinks);
  const [versionId, setVersionId] = useState<string>(versions[0]?.id ?? "");
  const [label, setLabel] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [minExpiresAt, setMinExpiresAt] = useState("");
  const [createdShareUrl, setCreatedShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [confirmRevokeId, setConfirmRevokeId] = useState<string | null>(null);
  const [revokeError, setRevokeError] = useState<string | null>(null);
  const [isRevoking, setIsRevoking] = useState(false);

  const sectionRef = useRef<HTMLElement>(null);
  const shareInputRef = useRef<HTMLInputElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const revokeButtonRefs = useRef(new Map<string, HTMLButtonElement>());
  const pendingFocusLinkId = useRef<string | null>(null);

  // The datetime-local default must come from the visitor's clock, so it is
  // seeded on mount rather than during server rendering.
  useEffect(() => {
    const now = new Date();
    setMinExpiresAt(toLocalDateTimeInputValue(now));
    setExpiresAt(
      toLocalDateTimeInputValue(new Date(now.getTime() + 72 * 60 * 60 * 1000)),
    );
  }, []);

  // Keep the rendered list aligned with the revalidated server payload.
  useEffect(() => {
    setLinks(initialLinks);
  }, [initialLinks]);

  // Focus management runs after commit: opening moves focus to Cancel, and
  // closing returns it to the originating revoke button. When a successful
  // revoke removed that button from the DOM, focus lands on the section.
  useEffect(() => {
    if (confirmRevokeId !== null) {
      cancelButtonRef.current?.focus();
      return;
    }

    if (pendingFocusLinkId.current !== null) {
      const originButton = revokeButtonRefs.current.get(
        pendingFocusLinkId.current,
      );
      pendingFocusLinkId.current = null;

      if (originButton?.isConnected) {
        originButton.focus();
      } else {
        sectionRef.current?.focus();
      }
    }
  }, [confirmRevokeId]);

  useEffect(
    () => () => {
      if (copyTimerRef.current !== null) {
        clearTimeout(copyTimerRef.current);
      }
    },
    [],
  );

  const closeRevokeConfirm = (linkId: string) => {
    pendingFocusLinkId.current = linkId;
    setConfirmRevokeId(null);
    setRevokeError(null);
  };

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreateError(null);
    setCopyError(null);
    setCopied(false);
    // The one-time URL is dropped before every new creation attempt.
    setCreatedShareUrl(null);

    if (!versionId) {
      setCreateError("Choose a version to share.");
      return;
    }

    const expiryDate = new Date(expiresAt);
    if (!expiresAt || Number.isNaN(expiryDate.getTime())) {
      setCreateError("Choose when this link expires.");
      return;
    }

    if (expiryDate.getTime() <= Date.now()) {
      setCreateError("The expiry must be in the future.");
      return;
    }

    setIsCreating(true);
    try {
      const result = await createListeningLinkAction({
        trackId,
        versionId,
        label: label.trim() === "" ? null : label.trim(),
        expiresAt: expiryDate.toISOString(),
      });

      if (!result.success) {
        setCreateError(result.message);
        return;
      }

      setLinks((current) => [result.link, ...current]);
      setLabel("");
      // The raw token exists only inside this URL, only in local state, and
      // only until it is cleared. It is never stored, routed, or logged.
      setCreatedShareUrl(
        new URL(`/listen/${result.rawToken}`, window.location.origin).toString(),
      );
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopy = async () => {
    if (!createdShareUrl) {
      return;
    }

    setCopyError(null);
    try {
      await navigator.clipboard.writeText(createdShareUrl);
      setCopied(true);
      if (copyTimerRef.current !== null) {
        clearTimeout(copyTimerRef.current);
      }
      copyTimerRef.current = setTimeout(() => setCopied(false), COPY_RESET_MS);
    } catch {
      shareInputRef.current?.select();
      setCopyError("Copy failed. The link is selected; copy it manually.");
    }
  };

  const handleRevokeConfirm = async (linkId: string) => {
    setRevokeError(null);
    setIsRevoking(true);

    try {
      const result = await revokeListeningLinkAction({ linkId });

      if (!result.success) {
        setRevokeError(result.message);
        return;
      }

      setLinks((current) =>
        current.map((link) => (link.id === linkId ? result.link : link)),
      );
      // A revoked link's previously displayed URL is dead; drop it.
      setCreatedShareUrl(null);
      setCopied(false);
      closeRevokeConfirm(linkId);
    } finally {
      setIsRevoking(false);
    }
  };

  return (
    <section
      ref={sectionRef}
      tabIndex={-1}
      className="glass-panel grid gap-5 p-5 outline-none sm:p-6"
      aria-labelledby="listening-links-heading"
    >
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
          External listening
        </p>
        <h2
          id="listening-links-heading"
          className="mt-2 font-heading text-xl font-semibold"
        >
          Listening links
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Share a revocable, expiring link to a playback-ready version.
          Listeners stay outside your library and never reach storage directly.
        </p>
      </div>

      {versions.length === 0 ? (
        <p className="rounded-xl border border-border bg-background/35 p-4 text-sm text-muted-foreground">
          External listening becomes available after a playback-ready Supabase
          version is registered.
        </p>
      ) : (
        <form
          className="grid gap-4"
          aria-label="Create a listening link"
          onSubmit={(event) => void handleCreate(event)}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium">
              Version
              <select
                className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={versionId}
                onChange={(event) => setVersionId(event.target.value)}
                required
              >
                {versions.map((version) => (
                  <option key={version.id} value={version.id}>
                    {version.versionLabel}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm font-medium">
              Expires
              <Input
                type="datetime-local"
                value={expiresAt}
                min={minExpiresAt || undefined}
                onChange={(event) => setExpiresAt(event.target.value)}
                required
              />
            </label>
          </div>

          <label className="grid gap-2 text-sm font-medium">
            Label <span className="font-normal text-muted-foreground">(optional)</span>
            <Input
              type="text"
              value={label}
              maxLength={120}
              placeholder="e.g. A&R review"
              onChange={(event) => setLabel(event.target.value)}
            />
          </label>

          <div>
            <Button type="submit" disabled={isCreating}>
              {isCreating ? "Creating…" : "Create listening link"}
            </Button>
          </div>

          {createError ? (
            <p className="text-sm text-destructive" role="alert">
              {createError}
            </p>
          ) : null}
        </form>
      )}

      {createdShareUrl ? (
        <div
          role="status"
          className="grid gap-3 rounded-xl border border-primary/40 bg-primary-container/10 p-4"
        >
          <p className="text-sm font-medium">
            Copy this link now. Its token cannot be shown again; create a new
            link to replace it.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              ref={shareInputRef}
              type="text"
              readOnly
              value={createdShareUrl}
              aria-label="New listening link URL"
              onFocus={(event) => event.currentTarget.select()}
              className="font-mono text-xs"
            />
            <Button
              type="button"
              variant="glass"
              className="shrink-0"
              onClick={() => void handleCopy()}
            >
              {copied ? (
                <Check className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Copy className="h-4 w-4" aria-hidden="true" />
              )}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
          {copyError ? (
            <p className="text-sm text-destructive" role="alert">
              {copyError}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-3">
        <h3 className="text-sm font-semibold">Existing links</h3>
        {links.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No listening links have been created for this track.
          </p>
        ) : (
          <ul className="grid gap-3">
            {links.map((link) => {
              const state = linkState(link);
              const isConfirming = confirmRevokeId === link.id;

              return (
                <li
                  key={link.id}
                  className="rounded-xl border border-border bg-background/35 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">
                          {link.label || "Untitled link"}
                        </p>
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em]",
                            stateBadgeClasses[state],
                          )}
                        >
                          {state}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {link.versionLabel}
                      </p>
                      <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm text-muted-foreground sm:grid-cols-3">
                        <div>
                          <dt className="sr-only">Expires</dt>
                          <dd>Expires {formatTimestamp(link.expiresAt)}</dd>
                        </div>
                        <div>
                          <dt className="sr-only">Access count</dt>
                          <dd>
                            {link.accessCount}{" "}
                            {link.accessCount === 1 ? "access" : "accesses"}
                          </dd>
                        </div>
                        <div>
                          <dt className="sr-only">Last accessed</dt>
                          <dd>
                            {link.lastAccessedAt
                              ? `Last access ${formatTimestamp(link.lastAccessedAt)}`
                              : "No accesses yet"}
                          </dd>
                        </div>
                      </dl>
                    </div>

                    {state === "active" ? (
                      <Button
                        type="button"
                        variant="glass"
                        size="sm"
                        ref={(element) => {
                          if (element) {
                            revokeButtonRefs.current.set(link.id, element);
                          } else {
                            revokeButtonRefs.current.delete(link.id);
                          }
                        }}
                        onClick={() => {
                          setRevokeError(null);
                          setConfirmRevokeId(link.id);
                        }}
                      >
                        <LinkBreak className="h-4 w-4" aria-hidden="true" />
                        Revoke link
                      </Button>
                    ) : null}
                  </div>

                  {isConfirming ? (
                    <div
                      role="alertdialog"
                      aria-labelledby="listening-revoke-title"
                      aria-describedby="listening-revoke-desc"
                      className="mt-4 grid gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-4"
                    >
                      <div className="flex items-start gap-2">
                        <WarningCircle
                          className="mt-0.5 h-4 w-4 shrink-0 text-destructive"
                          aria-hidden="true"
                        />
                        <div>
                          <p
                            id="listening-revoke-title"
                            className="text-sm font-semibold"
                          >
                            Revoke this listening link?
                          </p>
                          <p
                            id="listening-revoke-desc"
                            className="mt-1 text-sm text-muted-foreground"
                          >
                            Revoked links cannot issue new playback URLs.
                            Previously issued URLs expire within five minutes.
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="glass"
                          size="sm"
                          ref={cancelButtonRef}
                          disabled={isRevoking}
                          onClick={() => closeRevokeConfirm(link.id)}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          disabled={isRevoking}
                          onClick={() => void handleRevokeConfirm(link.id)}
                        >
                          {isRevoking ? "Revoking…" : "Revoke permanently"}
                        </Button>
                      </div>
                      {revokeError ? (
                        <p className="text-sm text-destructive" role="alert">
                          {revokeError}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
