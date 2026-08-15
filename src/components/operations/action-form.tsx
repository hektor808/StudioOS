"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveOperationAction } from "@/lib/operations/mutations";
import {
  initialOperationsActionResult,
  type OperationsAction,
} from "@/lib/operations/types";

type ActionFormProps = {
  timeZone: string;
  action?: OperationsAction;
};

type LocalFormValues = {
  date: string;
  time: string;
};

const statusOptions = [
  { value: "planned", label: "Planned" },
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
] as const;

function getLocalFormValues(iso: string | undefined, timeZone: string): LocalFormValues {
  if (!iso) return { date: "", time: "" };

  const instant = new Date(iso);
  if (Number.isNaN(instant.getTime())) return { date: "", time: "" };

  const values: Record<string, string> = {};
  for (const part of new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instant)) {
    if (["year", "month", "day", "hour", "minute"].includes(part.type)) {
      values[part.type] = part.value;
    }
  }

  return {
    date:
      values.year && values.month && values.day
        ? `${values.year}-${values.month}-${values.day}`
        : "",
    time: values.hour && values.minute ? `${values.hour}:${values.minute}` : "",
  };
}

function SubmitButton({ isEditing }: { isEditing: boolean }) {
  const { pending } = useFormStatus();

  return <Button type="submit" disabled={pending}>{pending ? "Saving…" : isEditing ? "Save action" : "Schedule action"}</Button>;
}

export function ActionForm({ timeZone, action }: ActionFormProps) {
  const [state, formAction] = useFormState(
    saveOperationAction,
    initialOperationsActionResult,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const isEditing = Boolean(action);
  const localValues = getLocalFormValues(action?.eventDate, timeZone);
  const baseId = action ? `action-${action.id}` : "new-action";

  useEffect(() => {
    if (state.status === "success") {
      if (!isEditing) formRef.current?.reset();
      router.refresh();
    }
  }, [isEditing, router, state.status]);

  return (
    <form ref={formRef} action={formAction} className="grid gap-4">
      <input type="hidden" name="actionId" value={action?.id ?? ""} />
      <p className="text-sm text-muted-foreground">Time zone: {timeZone}</p>

      <div className="grid gap-2">
        <label htmlFor={`${baseId}-title`} className="text-sm font-medium">Title</label>
        <Input id={`${baseId}-title`} name="title" maxLength={160} required defaultValue={action?.title ?? ""} aria-invalid={state.fieldErrors?.title ? true : undefined} aria-describedby={state.fieldErrors?.title ? `${baseId}-title-error` : undefined} />
        {state.fieldErrors?.title ? <p id={`${baseId}-title-error`} className="text-sm text-destructive" role="alert">{state.fieldErrors.title}</p> : null}
      </div>

      <div className="grid gap-2">
        <label htmlFor={`${baseId}-description`} className="text-sm font-medium">Description <span className="text-muted-foreground">(optional)</span></label>
        <textarea id={`${baseId}-description`} name="description" rows={3} maxLength={4000} defaultValue={action?.description ?? ""} aria-invalid={state.fieldErrors?.description ? true : undefined} aria-describedby={state.fieldErrors?.description ? `${baseId}-description-error` : undefined} className="w-full resize-y rounded-[10px] border border-input bg-background/50 px-3 py-2 text-sm text-foreground shadow-inner shadow-black/5 outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-destructive/20 motion-reduce:transition-none" />
        {state.fieldErrors?.description ? <p id={`${baseId}-description-error`} className="text-sm text-destructive" role="alert">{state.fieldErrors.description}</p> : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <label htmlFor={`${baseId}-date`} className="text-sm font-medium">Date</label>
          <Input id={`${baseId}-date`} name="eventDate" type="date" required defaultValue={localValues.date} aria-invalid={state.fieldErrors?.eventDate ? true : undefined} aria-describedby={state.fieldErrors?.eventDate ? `${baseId}-date-error` : undefined} />
          {state.fieldErrors?.eventDate ? <p id={`${baseId}-date-error`} className="text-sm text-destructive" role="alert">{state.fieldErrors.eventDate}</p> : null}
        </div>
        <div className="grid gap-2">
          <label htmlFor={`${baseId}-time`} className="text-sm font-medium">Time</label>
          <Input id={`${baseId}-time`} name="eventTime" type="time" required defaultValue={localValues.time} aria-invalid={state.fieldErrors?.eventTime ? true : undefined} aria-describedby={state.fieldErrors?.eventTime ? `${baseId}-time-error` : undefined} />
          {state.fieldErrors?.eventTime ? <p id={`${baseId}-time-error`} className="text-sm text-destructive" role="alert">{state.fieldErrors.eventTime}</p> : null}
        </div>
      </div>

      <div className="grid gap-2">
        <label htmlFor={`${baseId}-status`} className="text-sm font-medium">Status</label>
        <select id={`${baseId}-status`} name="actionStatus" defaultValue={action?.status ?? "planned"} aria-invalid={state.fieldErrors?.actionStatus ? true : undefined} aria-describedby={state.fieldErrors?.actionStatus ? `${baseId}-status-error` : undefined} className="h-10 rounded-[10px] border border-input bg-background/50 px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-destructive/20">
          {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        {state.fieldErrors?.actionStatus ? <p id={`${baseId}-status-error`} className="text-sm text-destructive" role="alert">{state.fieldErrors.actionStatus}</p> : null}
      </div>

      {state.message ? <p className={state.status === "error" ? "text-sm text-destructive" : "text-sm text-primary"} role={state.status === "error" ? "alert" : "status"}>{state.message}</p> : null}
      <div><SubmitButton isEditing={isEditing} /></div>
    </form>
  );
}
