"use server";

import { revalidatePath } from "next/cache";

import {
  getOperationsTimeZone,
  localDateTimeToUtc,
} from "@/lib/operations/time-zone";
import type { OperationsActionResult } from "@/lib/operations/types";
import { operationsActionSchema } from "@/lib/operations/validation";
import { createClient } from "@/lib/supabase/server";

const ACTION_SAVE_ERROR = "Action could not be saved. Try again.";
const ACTION_SAVE_SUCCESS = "Action saved.";

function validationMessage(issues: { message: string }[]): string {
  return issues[0]?.message ?? ACTION_SAVE_ERROR;
}

export async function saveOperationAction(
  previousState: OperationsActionResult,
  formData: FormData,
): Promise<OperationsActionResult> {
  void previousState;
  const parsed = operationsActionSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    return {
      status: "error",
      message: validationMessage(parsed.error.issues),
      fieldErrors: {
        title: fieldErrors.title?.[0],
        description: fieldErrors.description?.[0],
        eventDate: fieldErrors.eventDate?.[0],
        eventTime: fieldErrors.eventTime?.[0],
        actionStatus: fieldErrors.actionStatus?.[0],
      },
    };
  }

  const timeZoneState = getOperationsTimeZone();
  if (timeZoneState.status === "error") {
    return { status: "error", message: timeZoneState.message };
  }

  const eventDate = localDateTimeToUtc(
    parsed.data.eventDate,
    parsed.data.eventTime,
    timeZoneState.timeZone,
  );
  if (!eventDate) {
    return {
      status: "error",
      message: "Choose a valid local date and time.",
      fieldErrors: {
        eventTime:
          "This local date and time does not exist in the configured time zone.",
      },
    };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { status: "error", message: ACTION_SAVE_ERROR };
    }

    if (parsed.data.actionId === "") {
      const { error } = await supabase.from("actions").insert({
        title: parsed.data.title,
        description: parsed.data.description,
        event_date: eventDate.toISOString(),
        status: parsed.data.actionStatus,
        created_by: user.id,
      });

      if (error) {
        return { status: "error", message: ACTION_SAVE_ERROR };
      }
    } else {
      const { data, error } = await supabase
        .from("actions")
        .update({
          title: parsed.data.title,
          description: parsed.data.description,
          event_date: eventDate.toISOString(),
          status: parsed.data.actionStatus,
        })
        .eq("id", parsed.data.actionId)
        .select("id")
        .maybeSingle();

      if (error || !data) {
        return { status: "error", message: ACTION_SAVE_ERROR };
      }
    }

    revalidatePath("/operations");
    return { status: "success", message: ACTION_SAVE_SUCCESS };
  } catch {
    return { status: "error", message: ACTION_SAVE_ERROR };
  }
}
