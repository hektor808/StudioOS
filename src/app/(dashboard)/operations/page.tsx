import { OperationsBoard } from "@/components/operations/operations-board";
import { getOperationsPageData } from "@/lib/operations/queries";
import { getOperationsTimeZone } from "@/lib/operations/time-zone";
import { normalizeOperationsFilters } from "@/lib/operations/validation";

export type OperationsPageProps = {
  searchParams?: {
    month?: string | string[] | undefined;
    status?: string | string[] | undefined;
  };
};

export default async function OperationsPage({
  searchParams,
}: OperationsPageProps) {
  const timeZoneState = getOperationsTimeZone();

  if (timeZoneState.status === "error") {
    const filters = normalizeOperationsFilters(searchParams ?? {}, "UTC");
    return <OperationsBoard filters={filters} configurationError={timeZoneState.message} />;
  }

  const filters = normalizeOperationsFilters(
    searchParams ?? {},
    timeZoneState.timeZone,
  );
  const data = await getOperationsPageData(filters, timeZoneState.timeZone);

  return <OperationsBoard data={data} />;
}
