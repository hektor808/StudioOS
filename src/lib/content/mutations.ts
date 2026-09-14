"use server";

import { revalidatePath } from "next/cache";

import type { ContentActionResult } from "@/lib/content/types";
import { contentIdeaSchema } from "@/lib/content/validation";
import { createClient } from "@/lib/supabase/server";

const CONTENT_SAVE_ERROR = "Content idea could not be saved. Try again.";
const CONTENT_SAVE_SUCCESS = "Content idea saved.";

function validationMessage(issues: { message: string }[]): string {
  return issues[0]?.message ?? CONTENT_SAVE_ERROR;
}

export async function saveContentIdea(
  previousState: ContentActionResult,
  formData: FormData,
): Promise<ContentActionResult> {
  void previousState;
  const parsed = contentIdeaSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    return {
      status: "error",
      message: validationMessage(parsed.error.issues),
      fieldErrors: {
        title: fieldErrors.title?.[0],
        platform: fieldErrors.platform?.[0],
        difficulty: fieldErrors.difficulty?.[0],
        contentStatus: fieldErrors.contentStatus?.[0],
        referenceUrl: fieldErrors.referenceUrl?.[0],
        notes: fieldErrors.notes?.[0],
      },
    };
  }

  const platform = parsed.data.platform.replace(/\s+/g, " ");
  const referenceUrl = parsed.data.referenceUrl || null;

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { status: "error", message: CONTENT_SAVE_ERROR };
    }

    if (parsed.data.contentIdeaId === "") {
      const { error } = await supabase.from("content_ideas").insert({
        title: parsed.data.title,
        platform,
        difficulty: parsed.data.difficulty,
        status: parsed.data.contentStatus,
        reference_url: referenceUrl,
        notes: parsed.data.notes,
        created_by: user.id,
      });

      if (error) {
        return { status: "error", message: CONTENT_SAVE_ERROR };
      }
    } else {
      const { data, error } = await supabase
        .from("content_ideas")
        .update({
          title: parsed.data.title,
          platform,
          difficulty: parsed.data.difficulty,
          status: parsed.data.contentStatus,
          reference_url: referenceUrl,
          notes: parsed.data.notes,
        })
        .eq("id", parsed.data.contentIdeaId)
        .select("id")
        .maybeSingle();

      if (error || !data) {
        return { status: "error", message: CONTENT_SAVE_ERROR };
      }
    }

    revalidatePath("/content");
    return { status: "success", message: CONTENT_SAVE_SUCCESS };
  } catch {
    return { status: "error", message: CONTENT_SAVE_ERROR };
  }
}
