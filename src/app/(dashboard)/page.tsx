import { DashboardHome } from "@/components/dashboard/dashboard-home";
import { getDashboardSummary } from "@/lib/dashboard/queries";

export default async function DashboardPage() {
  const summaryResult = await getDashboardSummary();

  return <DashboardHome summaryResult={summaryResult} />;
}
