"use client";

import { useFormState } from "react-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createTrackAction } from "@/lib/studio/mutations";
import { initialStudioActionResult } from "@/lib/studio/types";

export function CreateTrackForm() {
  const [state, formAction] = useFormState(
    createTrackAction,
    initialStudioActionResult,
  );
  const titleError = state.fieldErrors?.title;
  const descriptionError = state.fieldErrors?.description;
  const messageRole = state.status === "error" ? "alert" : "status";

  return (
    <section className="glass-panel p-5 sm:p-6" aria-labelledby="create-track-heading">
      <div className="mb-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
          New track
        </p>
        <h2 id="create-track-heading" className="mt-2 font-heading text-xl font-semibold">
          Create a track
        </h2>
      </div>

      <form action={formAction} className="grid gap-4">
        <div className="grid gap-2">
          <label htmlFor="track-title" className="text-sm font-medium">
            Title
          </label>
          <Input
            id="track-title"
            name="title"
            maxLength={160}
            required
            aria-invalid={titleError ? true : undefined}
            aria-describedby={titleError ? "track-title-error" : undefined}
          />
          {titleError ? (
            <p id="track-title-error" className="text-sm text-destructive" role="alert">
              {titleError}
            </p>
          ) : null}
        </div>

        <div className="grid gap-2">
          <label htmlFor="track-description" className="text-sm font-medium">
            Description <span className="text-muted-foreground">(optional)</span>
          </label>
          <textarea
            id="track-description"
            name="description"
            maxLength={4000}
            rows={4}
            className="w-full resize-y rounded-[10px] border border-input bg-background/50 px-3 py-2 text-sm text-foreground shadow-inner shadow-black/5 outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-destructive/20 motion-reduce:transition-none"
            aria-invalid={descriptionError ? true : undefined}
            aria-describedby={descriptionError ? "track-description-error" : undefined}
          />
          {descriptionError ? (
            <p id="track-description-error" className="text-sm text-destructive" role="alert">
              {descriptionError}
            </p>
          ) : null}
        </div>

        {state.message ? (
          <p
            className={
              state.status === "error" ? "text-sm text-destructive" : "text-sm text-primary"
            }
            role={messageRole}
          >
            {state.message}
          </p>
        ) : null}

        <div>
          <Button type="submit">Create track</Button>
        </div>
      </form>
    </section>
  );
}
