import { ContentBoard } from "@/components/content/content-board";
import { getContentPageData } from "@/lib/content/queries";
import { normalizeContentFilters } from "@/lib/content/validation";

export type ContentPageProps = {
  searchParams?: {
    platform?: string | string[] | undefined;
    status?: string | string[] | undefined;
  };
};

export default async function ContentPage({
  searchParams,
}: ContentPageProps) {
  const filters = normalizeContentFilters(searchParams ?? {});
  const data = await getContentPageData(filters);

  return <ContentBoard data={data} />;
}
