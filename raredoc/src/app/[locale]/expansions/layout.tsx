import { prisma } from "@/lib/prisma";
import { getAllSets } from "@/lib/api/pokemontcg";
import { SERIES_KO } from "@/lib/constants";
import { ExpansionSidebar } from "@/components/expansions/ExpansionSidebar";

export const revalidate = 86400;

async function getSets() {
  try {
    const sets = await prisma.set.findMany({ orderBy: { releaseDate: "desc" } });
    if (sets.length > 0) return sets;
  } catch {}
  const apiSets = await getAllSets();
  return apiSets.map((s) => ({
    id: s.id,
    name: s.name,
    nameKo: null as string | null,
    series: s.series,
    seriesKo: SERIES_KO[s.series] ?? s.series,
    releaseDate: new Date(s.releaseDate),
    cardCount: s.total || s.printedTotal,
    logoUrl: s.images?.logo ?? null,
    symbolUrl: s.images?.symbol ?? null,
    language: "en",
    createdAt: new Date(),
    updatedAt: new Date(),
  }));
}

export default async function ExpansionsLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const sets = await getSets();

  return (
    // 페이지 자연 흐름 — body 스크롤, 사이드바만 sticky
    <div className="max-w-7xl mx-auto px-4 py-4 flex gap-4 items-start">
      {/* 좌측 사이드바: sticky, 내부만 독립 스크롤 */}
      <aside className="w-full shrink-0 max-w-[280px] sticky top-14 rounded-lg border border-gray-800 overflow-hidden">
        <ExpansionSidebar sets={sets} locale={locale} />
      </aside>

      {/* 우측 콘텐츠: 자연 높이 */}
      <div className="flex-1 min-w-0">
        {children}
      </div>
    </div>
  );
}
