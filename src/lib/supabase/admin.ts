import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { getSupabaseEnv } from "./env";

// Signing-only boundary: use this client only for createSignedUrl after
// request-scoped RLS authorization has succeeded.
class SupabaseServiceRoleEnvironmentError extends Error {
  constructor() {
    super("Supabase administrative access is not configured.");
    this.name = "SupabaseServiceRoleEnvironmentError";
  }
}

function getServiceRoleKey(): string {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!serviceRoleKey) {
    throw new SupabaseServiceRoleEnvironmentError();
  }

  return serviceRoleKey;
}

export function createAdminClient(): SupabaseClient<Database> {
  const serviceRoleKey = getServiceRoleKey();
  const { url } = getSupabaseEnv();

  return createClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}
