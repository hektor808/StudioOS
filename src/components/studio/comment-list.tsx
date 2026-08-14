"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { formatPlaybackTime } from "@/lib/audio/format-time";
import { resolveCommentAction } from "@/lib/studio/mutations";
import type { StudioComment } from "@/lib/studio/types";

const dateFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
});

export type CommentListProps = {
  comments: StudioComment[];
  activeSourceId: string | null;
  onSeekComment: (versionId: string, seconds: number) => void;
};

export function CommentList({
  comments,
  activeSourceId,
  onSeekComment,
}: CommentListProps) {
  const router = useRouter();
  const [seekMessage, setSeekMessage] = useState<string | null>(null);
  const [resolveMessage, setResolveMessage] = useState<string | null>(null);
  const [isResolvePending, setIsResolvePending] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <section aria-labelledby="comment-list-heading">
      <div className="mb-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
          Discussion
        </p>
        <h3 id="comment-list-heading" className="mt-2 font-heading text-lg font-semibold">
          Comments
        </h3>
      </div>

      {comments.length === 0 ? (
        <p className="text-sm text-muted-foreground">No timestamp comments yet.</p>
      ) : (
        <ol className="grid gap-3">
          {comments.map((comment) => {
            const timestamp = formatPlaybackTime(comment.timestampMarker);

            return (
              <li
                key={comment.id}
                className="rounded-xl border border-border bg-background/35 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="glass"
                      size="sm"
                      aria-label={`Seek to ${timestamp}`}
                      onClick={() => {
                        setSeekMessage(null);
                        if (comment.versionId === activeSourceId) {
                          onSeekComment(comment.versionId, comment.timestampMarker);
                          return;
                        }

                        setSeekMessage(
                          "Start this comment’s version in the global player before seeking.",
                        );
                      }}
                    >
                      {timestamp}
                    </Button>
                    {comment.isResolved ? (
                      <span className="rounded-full bg-primary-container/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-primary">
                        Resolved
                      </span>
                    ) : null}
                  </div>
                  <time className="text-xs text-muted-foreground" dateTime={comment.createdAt}>
                    {dateFormatter.format(new Date(comment.createdAt))}
                  </time>
                </div>

                <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6">
                  {comment.content}
                </p>
                <p className="mt-3 text-sm text-muted-foreground">
                  {comment.user.fullName}
                </p>

                {!comment.isResolved && comment.canResolve ? (
                  <div className="mt-4">
                    <Button
                      type="button"
                      variant="glass"
                      size="sm"
                      disabled={isPending || isResolvePending}
                      onClick={() => {
                        setResolveMessage(null);
                        setIsResolvePending(true);
                        startTransition(() => {
                          void resolveCommentAction(comment.id)
                            .then((result) => {
                              if (result.status === "error") {
                                setResolveMessage(result.message);
                                return;
                              }

                              router.refresh();
                            })
                            .finally(() => setIsResolvePending(false));
                        });
                      }}
                    >
                      Resolve comment
                    </Button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ol>
      )}

      {seekMessage ? (
        <p className="mt-3 text-sm text-muted-foreground" role="status">
          {seekMessage}
        </p>
      ) : null}
      {resolveMessage ? (
        <p className="mt-3 text-sm text-destructive" role="alert">
          {resolveMessage}
        </p>
      ) : null}
    </section>
  );
}
