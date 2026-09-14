"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveContentIdea } from "@/lib/content/mutations";
import {
  initialContentActionResult,
  type ContentIdea,
} from "@/lib/content/types";

type ContentIdeaFormProps = {
  idea?: ContentIdea;
};

const statusOptions = [
  { value: "idea", label: "Idea" },
  { value: "planned", label: "Planned" },
  { value: "in_production", label: "In production" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
] as const;

const difficultyOptions = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
] as const;

const selectClassName =
  "h-10 rounded-[10px] border border-input bg-background/50 px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-destructive/20";

const textareaClassName =
  "w-full resize-y rounded-[10px] border border-input bg-background/50 px-3 py-2 text-sm text-foreground shadow-inner shadow-black/5 outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-destructive/20 motion-reduce:transition-none";

function SubmitButton({ isEditing }: { isEditing: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : isEditing ? "Save idea" : "Add idea"}
    </Button>
  );
}

export function ContentIdeaForm({ idea }: ContentIdeaFormProps) {
  const [state, formAction] = useFormState(
    saveContentIdea,
    initialContentActionResult,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const isEditing = Boolean(idea);
  const baseId = idea ? `idea-${idea.id}` : "new-idea";

  useEffect(() => {
    if (state.status === "success") {
      if (!isEditing) formRef.current?.reset();
      router.refresh();
    }
  }, [isEditing, router, state.status]);

  return (
    <form ref={formRef} action={formAction} className="grid gap-4">
      <input type="hidden" name="contentIdeaId" value={idea?.id ?? ""} />

      <div className="grid gap-2">
        <label htmlFor={`${baseId}-title`} className="text-sm font-medium">
          Title
        </label>
        <Input
          id={`${baseId}-title`}
          name="title"
          maxLength={200}
          required
          defaultValue={idea?.title ?? ""}
          aria-invalid={state.fieldErrors?.title ? true : undefined}
          aria-describedby={
            state.fieldErrors?.title ? `${baseId}-title-error` : undefined
          }
        />
        {state.fieldErrors?.title ? (
          <p
            id={`${baseId}-title-error`}
            className="text-sm text-destructive"
            role="alert"
          >
            {state.fieldErrors.title}
          </p>
        ) : null}
      </div>

      <div className="grid gap-2">
        <label htmlFor={`${baseId}-platform`} className="text-sm font-medium">
          Platform
        </label>
        <Input
          id={`${baseId}-platform`}
          name="platform"
          maxLength={80}
          required
          defaultValue={idea?.platform ?? ""}
          aria-invalid={state.fieldErrors?.platform ? true : undefined}
          aria-describedby={
            state.fieldErrors?.platform
              ? `${baseId}-platform-error`
              : undefined
          }
        />
        {state.fieldErrors?.platform ? (
          <p
            id={`${baseId}-platform-error`}
            className="text-sm text-destructive"
            role="alert"
          >
            {state.fieldErrors.platform}
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <label
            htmlFor={`${baseId}-difficulty`}
            className="text-sm font-medium"
          >
            Difficulty
          </label>
          <select
            id={`${baseId}-difficulty`}
            name="difficulty"
            defaultValue={idea?.difficulty ?? "medium"}
            aria-invalid={state.fieldErrors?.difficulty ? true : undefined}
            aria-describedby={
              state.fieldErrors?.difficulty
                ? `${baseId}-difficulty-error`
                : undefined
            }
            className={selectClassName}
          >
            {difficultyOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {state.fieldErrors?.difficulty ? (
            <p
              id={`${baseId}-difficulty-error`}
              className="text-sm text-destructive"
              role="alert"
            >
              {state.fieldErrors.difficulty}
            </p>
          ) : null}
        </div>

        <div className="grid gap-2">
          <label htmlFor={`${baseId}-status`} className="text-sm font-medium">
            Status
          </label>
          <select
            id={`${baseId}-status`}
            name="contentStatus"
            defaultValue={idea?.status ?? "idea"}
            aria-invalid={state.fieldErrors?.contentStatus ? true : undefined}
            aria-describedby={
              state.fieldErrors?.contentStatus
                ? `${baseId}-status-error`
                : undefined
            }
            className={selectClassName}
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {state.fieldErrors?.contentStatus ? (
            <p
              id={`${baseId}-status-error`}
              className="text-sm text-destructive"
              role="alert"
            >
              {state.fieldErrors.contentStatus}
            </p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-2">
        <label htmlFor={`${baseId}-reference`} className="text-sm font-medium">
          Reference URL <span className="text-muted-foreground">(optional)</span>
        </label>
        <Input
          id={`${baseId}-reference`}
          name="referenceUrl"
          type="url"
          maxLength={2048}
          defaultValue={idea?.referenceUrl ?? ""}
          placeholder="https://"
          aria-invalid={state.fieldErrors?.referenceUrl ? true : undefined}
          aria-describedby={
            state.fieldErrors?.referenceUrl
              ? `${baseId}-reference-error`
              : undefined
          }
        />
        {state.fieldErrors?.referenceUrl ? (
          <p
            id={`${baseId}-reference-error`}
            className="text-sm text-destructive"
            role="alert"
          >
            {state.fieldErrors.referenceUrl}
          </p>
        ) : null}
      </div>

      <div className="grid gap-2">
        <label htmlFor={`${baseId}-notes`} className="text-sm font-medium">
          Notes <span className="text-muted-foreground">(optional)</span>
        </label>
        <textarea
          id={`${baseId}-notes`}
          name="notes"
          rows={3}
          maxLength={5000}
          defaultValue={idea?.notes ?? ""}
          aria-invalid={state.fieldErrors?.notes ? true : undefined}
          aria-describedby={
            state.fieldErrors?.notes ? `${baseId}-notes-error` : undefined
          }
          className={textareaClassName}
        />
        {state.fieldErrors?.notes ? (
          <p
            id={`${baseId}-notes-error`}
            className="text-sm text-destructive"
            role="alert"
          >
            {state.fieldErrors.notes}
          </p>
        ) : null}
      </div>

      {state.message ? (
        <p
          className={
            state.status === "error"
              ? "text-sm text-destructive"
              : "text-sm text-primary"
          }
          role={state.status === "error" ? "alert" : "status"}
        >
          {state.message}
        </p>
      ) : null}
      <div>
        <SubmitButton isEditing={isEditing} />
      </div>
    </form>
  );
}
