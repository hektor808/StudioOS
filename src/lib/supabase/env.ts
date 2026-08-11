export type SupabasePublicEnv = {
  url: string;
  anonKey: string;
};

export class SupabasePublicEnvironmentError extends Error {
  constructor() {
    super("Supabase environment is not configured.");
    this.name = "SupabasePublicEnvironmentError";
  }
}

export function getSupabaseEnv(
  values: Partial<SupabasePublicEnv> = {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
): SupabasePublicEnv {
  const url = values.url?.trim();
  const anonKey = values.anonKey?.trim();

  if (!url || !anonKey) {
    throw new SupabasePublicEnvironmentError();
  }

  return { url, anonKey };
}
