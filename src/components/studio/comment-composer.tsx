"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useFormState } from "react-dom";

import { Button } from "@/components/ui/button";
import { formatPlaybackTime } from "@/lib/audio/format-time";
import { addCommentAction } from "@/lib/studio/mutations";
import { initialStudioActionResult } from "@/lib/studio/types";

export type CommentComposerProps = {
  versionId: string | null;
  marker: number | null;
};

export function CommentComposer({ versionId, marker }: CommentComposerProps) {
  const [state, formAction] = useFormState(
    addCommentAction,
    initialStudioActionResult,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const contentError = state.fieldErrors?.content;
  const canSubmit = versionId !== null && marker !== null;

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
      router.refresh();
    }
  }, [router, state.status]);

  return (
    <section aria-labelledby="comment-composer-heading">
      <div className="mb-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
          Add feedback
        </p>
        <h3 id="comment-composer-heading" className="mt-2 font-heading text-lg font-semibold">
          Timestamp comment
        </h3>
      </div>

      <form ref={formRef} action={formAction} className="grid gap-4">
        <p className="text-sm text-muted-foreground">
          Selected timestamp {formatPlaybackTime(marker ?? 0)}
        </p>
        {canSubmit ? (
          <>
            <input type="hidden" name="versionId" value={versionId} />
            <input type="hidden" name="timestampMarker" value={marker} />
          </>
        ) : null}
        <div className="grid gap-2">
          <label htmlFor="timestamp-comment-content" className="text-sm font-medium">
            Comment
          </label>
          <textarea
            id="timestamp-comment-content"
            name="content"
            rows={4}
            maxLength={2000}
            required
            disabled={!canSubmit}
            aria-invalid={contentError ? true : undefined}
            aria-describedby={contentError ? "timestamp-comment-content-error" : undefined}
            className="w-full resize-y rounded-[10px] border border-input bg-background/50 px-3 py-2 text-sm text-foreground shadow-inner shadow-black/5 outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-destructive/20 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none"
          />
          {contentError ? (
            <p id="timestamp-comment-content-error" className="text-sm text-destructive" role="alert">
              {contentError}
            </p>
          ) : null}
        </div>

        {!canSubmit ? (
          <p className="text-sm text-muted-foreground" role="status">
            Select a point on the waveform before adding a comment.
          </p>
        ) : null}

        {state.message ? (
          <p
            className={
              state.status === "error" ? "text-sm text-destructive" : "text-sm text-primary"
            }
            role={state.status === "error" ? "alert" : "status"}
          >
            {state.message}
          </p>
        ) : null}

        <div>
          <Button type="submit" disabled={!canSubmit}>
            Add timestamp comment
          </Button>
        </div>
      </form>
    </section>
  );
}
