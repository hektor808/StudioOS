import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { createClient } from "@/lib/supabase/server";
import {
  STUDIO_PUBLIC_ENV_FALLBACK_HEADER,
  STUDIO_PUBLIC_ENV_FALLBACK_VALUE,
} from "@/lib/supabase/studio-config-boundary";

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  if (
    headers().get(STUDIO_PUBLIC_ENV_FALLBACK_HEADER) ===
    STUDIO_PUBLIC_ENV_FALLBACK_VALUE
  ) {
    return (
      <DashboardShell>
        <section>
          <h1>Studio configuration is required</h1>
          <p>Supabase environment is not configured.</p>
        </section>
      </DashboardShell>
    );
  }

  const supabase = await createClient();
  let isAuthenticated = false;

  try {
    const result = await supabase.auth.getUser();
    isAuthenticated = !result.error && Boolean(result.data.user);
  } catch {
    isAuthenticated = false;
  }

  if (!isAuthenticated) {
    redirect("/login");
  }

  return <DashboardShell>{children}</DashboardShell>;
}
