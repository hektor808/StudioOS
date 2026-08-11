import { redirect } from "next/navigation";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
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
