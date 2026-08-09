"use server";

import { revalidatePath } from "next/cache";
import type { LoginCredentials } from "@/lib/auth/login-schema";
import { loginSchema } from "@/lib/auth/login-schema";
import { createClient } from "@/lib/supabase/server";

export type LoginActionResult =
  | { success: true }
  | {
      success: false;
      message: string;
      fieldErrors?: Partial<Record<keyof LoginCredentials, string[]>>;
    };

export async function login(
  credentials: LoginCredentials,
): Promise<LoginActionResult> {
  const parsed = loginSchema.safeParse(credentials);

  if (!parsed.success) {
    return {
      success: false,
      message: "Check the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword(parsed.data);

    if (error) {
      return {
        success: false,
        message: "Unable to sign in with those credentials.",
      };
    }

    revalidatePath("/", "layout");
    return { success: true };
  } catch {
    return {
      success: false,
      message: "VEO OS could not reach the authentication service. Try again.",
    };
  }
}
