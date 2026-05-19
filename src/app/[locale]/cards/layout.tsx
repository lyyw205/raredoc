import { CardSidebar } from "@/components/cards/CardSidebar";
import { searchCardsAction } from "@/lib/actions/searchCards";
import { getFilterOptions } from "@/lib/api/cardFilters";

export const revalidate = 3600;

export default async function CardsLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const [initial, filterOptions] = await Promise.all([
    searchCardsAction({ limit: 100 }),
    getFilterOptions(),
  ]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-4 flex gap-4 items-start">
      <aside className="w-full shrink-0 max-w-[320px] sticky top-14 rounded-lg border border-gray-800 overflow-hidden">
        <CardSidebar
          locale={locale}
          initial={initial}
          filterOptions={filterOptions}
          fetcher={searchCardsAction}
        />
      </aside>

      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
