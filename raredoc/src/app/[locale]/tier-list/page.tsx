import { loadAllTierLists } from "@/lib/tier";
import { TIER_LABELS, TIER_COLORS } from "@/lib/constants";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "투자 티어리스트",
  description: "포켓몬 카드 투자 가치 티어리스트. S~D등급으로 분류한 카드 투자 가이드.",
};

export const revalidate = 3600;

export default async function TierListPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const tierLists = await loadAllTierLists();

  const allEntries = tierLists.flatMap((tl) => tl.entries);
  const byTier: Record<string, typeof allEntries> = { S: [], A: [], B: [], C: [], D: [] };
  allEntries.forEach((e) => {
    if (byTier[e.tier]) byTier[e.tier].push(e);
  });

  const lastUpdated = tierLists[0]?.updatedAt ?? "—";

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">
          {locale === "ko" ? "투자 티어리스트" : "Investment Tier List"}
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          {locale === "ko" ? `마지막 업데이트: ${lastUpdated}` : `Last updated: ${lastUpdated}`}
        </p>
        <p className="text-gray-500 text-xs mt-2">
          {locale === "ko"
            ? "시세 추세, 희귀도, 수요를 종합한 투자 가치 등급입니다. 실제 투자 손익을 보장하지 않습니다."
            : "Tier rankings based on price trends, rarity, and demand. Not financial advice."}
        </p>
      </div>

      <div className="space-y-6">
        {(["S", "A", "B", "C", "D"] as const).map((tier) => (
          <div key={tier} className="border border-gray-800 rounded-xl overflow-hidden">
            {/* 티어 헤더 */}
            <div className={`px-4 py-3 font-bold flex items-center gap-3 ${TIER_COLORS[tier]}`}>
              <span className="text-2xl font-black">{tier}</span>
              <span className="text-sm font-medium opacity-80">
                {TIER_LABELS[tier].split("—")[1]?.trim()}
              </span>
            </div>

            {/* 카드 목록 */}
            {byTier[tier].length > 0 ? (
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {byTier[tier].map((entry) => (
                  <a
                    key={entry.cardId}
                    href={`../cards/${entry.cardId}`}
                    className="flex items-center gap-3 p-3 rounded-lg bg-gray-800/50 hover:bg-gray-800 transition-colors"
                  >
                    <img
                      src={entry.imageSmall}
                      alt={entry.name}
                      className="h-16 w-12 object-contain flex-shrink-0 rounded"
                      loading="lazy"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">
                        {locale === "ko" ? (entry.nameKo ?? entry.name) : entry.name}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">
                        {locale === "ko" ? entry.reason : (entry.reasonEn ?? entry.reason)}
                      </p>
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <div className="p-4 text-sm text-gray-600">데이터 준비 중</div>
            )}
          </div>
        ))}
      </div>

      {/* 세트별 티어리스트 링크 */}
      {tierLists.length > 0 && (
        <div className="mt-12">
          <h2 className="text-lg font-semibold text-gray-300 mb-4">
            {locale === "ko" ? "세트별 티어리스트" : "Tier List by Set"}
          </h2>
          <div className="flex flex-wrap gap-3">
            {tierLists.map((tl) => (
              <a
                key={tl.setCode}
                href={`./tier-list/${tl.setCode}`}
                className="px-4 py-2 rounded-lg border border-gray-700 bg-gray-800 hover:border-gray-500 text-sm text-gray-300 hover:text-white transition-colors"
              >
                {tl.label}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
