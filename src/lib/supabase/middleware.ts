import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database.types";
import { getSupabaseEnv, SupabasePublicEnvironmentError } from "./env";
import {
  isStudioPathname,
  STUDIO_PUBLIC_ENV_FALLBACK_HEADER,
  STUDIO_PUBLIC_ENV_FALLBACK_VALUE,
} from "./studio-config-boundary";

export async function updateSession(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete(STUDIO_PUBLIC_ENV_FALLBACK_HEADER);
  let response = NextResponse.next({ request: { headers: requestHeaders } });
  let url: string;
  let anonKey: string;

  try {
    ({ url, anonKey } = getSupabaseEnv());
  } catch (error) {
    if (
      error instanceof SupabasePublicEnvironmentError &&
      isStudioPathname(request.nextUrl.pathname)
    ) {
      requestHeaders.set(
        STUDIO_PUBLIC_ENV_FALLBACK_HEADER,
        STUDIO_PUBLIC_ENV_FALLBACK_VALUE,
      );
      return NextResponse.next({ request: { headers: requestHeaders } });
    }

    throw error;
  }

  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        response = NextResponse.next({
          request: { headers: requestHeaders },
        });

        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });

        Object.entries(headers).forEach(([name, value]) => {
          response.headers.set(name, value);
        });
      },
    },
  });

  await supabase.auth.getClaims();
  return response;
}
