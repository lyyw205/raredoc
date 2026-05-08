import { prisma } from "@/lib/prisma";
import { ExpansionGrid } from "@/components/expansions/ExpansionGrid";
import { SeriesFilter } from "@/components/expansions/SeriesFilter";
import { getAllSets } from "@/lib/api/pokemontcg";
import { SERIES_KO } from "@/lib/constants";
import { getTranslations } from "next-intl/server";
import { AdUnit } from "@/components/seo/AdUnit";
import type { Metadata } from "next";

export const revalidate = 86400;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("expansions");
  return {
    title: t("title"),
    description: "포켓몬 카드 모든 확장팩 시리즈. 시세와 카드 정보를 확인하세요.",
  };
}

async function getSets() {
  try {
    const sets = await prisma.set.findMany({
      orderBy: { releaseDate: "desc" },
    });
    if (sets.length > 0) return sets;
  } catch {}
  // DB 없으면 API 직접 호출 (폴백)
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

export default async function ExpansionsPage({
  searchParams,
  params,
}: {
  searchParams: Promise<{ series?: string }>;
  params: Promise<{ locale: string }>;
}) {
  const [{ series: selectedSeries }, { locale }] = await Promise.all([searchParams, params]);
  const [sets, t] = await Promise.all([getSets(), getTranslations("expansions")]);

  // 시리즈 목록 추출
  const seriesMap = new Map<string, number>();
  sets.forEach((s) => {
    seriesMap.set(s.series, (seriesMap.get(s.series) ?? 0) + 1);
  });
  const allSeries = Array.from(seriesMap.entries()).map(([name, count]) => ({ name, count }));

  const filtered = selectedSeries
    ? sets.filter((s) => s.series === selectedSeries)
    : sets;

  // 시리즈별 그룹핑
  const grouped = new Map<string, typeof sets>();
  filtered.forEach((s) => {
    const key = s.series;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(s);
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-white mb-6">{t("title")}</h1>
      <SeriesFilter series={allSeries} selected={selectedSeries} />
      {/* 광고: 필터 아래 */}
      <AdUnit slot="XXXXXXXXXX" format="horizontal" className="mt-6 mb-2" />
      <div className="mt-6 space-y-12">
        {Array.from(grouped.entries()).map(([seriesName, seriesSets]) => (
          <section key={seriesName}>
            <h2 className="text-lg font-semibold text-gray-300 mb-4 flex items-center gap-2">
              {locale === "ko" ? (SERIES_KO[seriesName] ?? seriesName) : seriesName}
              <span className="text-sm font-normal text-gray-500">({seriesSets.length})</span>
            </h2>
            <ExpansionGrid sets={seriesSets} />
          </section>
        ))}
      </div>
    </div>
  );
}
