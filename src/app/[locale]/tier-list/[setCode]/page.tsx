import { loadTierList, loadAllTierLists } from "@/lib/tier";
import { TIER_LABELS, TIER_COLORS } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export const revalidate = 3600;

export async function generateStaticParams() {
  const lists = await loadAllTierLists();
  return lists.map((tl) => ({ setCode: tl.setCode }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ setCode: string }>;
}): Promise<Metadata> {
  const { setCode } = await params;
  const tl = await loadTierList(setCode);
  if (!tl) return {};
  return { title: `${tl.label} 티어리스트` };
}

export default async function SetTierListPage({
  params,
}: {
  params: Promise<{ setCode: string; locale: string }>;
}) {
  const { setCode, locale } = await params;
  const tl = await loadTierList(setCode);
  if (!tl) notFound();

  // 표시 데이터(name/image/rarity)는 DB CardLocale 로 enrich, 미발견 시 YAML 폴백.
  // tier/reason 은 YAML 큐레이션 그대로 사용.
  const entryIds = tl.entries.map((e) => e.cardId);
  const locales = entryIds.length
    ? await prisma.cardLocale.findMany({
        where: { id: { in: Array.from(new Set(entryIds)) } },
        include: { logicalCard: { include: { rarity: true } }, set: true },
      })
    : [];
  const localeById = new Map(locales.map((l) => [l.id, l]));
  const enrichedEntries = tl.entries.map((e) => {
    const db = localeById.get(e.cardId);
    if (!db) return { ...e, rarity: null as string | null };
    return {
      ...e,
      // locale=ko 면 한국어 우선: CardLocale.name 자체가 해당 locale 표시명.
      // 기존 YAML 의 name/nameKo 는 폴백용으로 유지.
      name: db.name,
      nameKo: db.name,
      imageSmall: db.imageSmall ?? e.imageSmall,
      rarity: db.logicalCard.rarity?.code ?? null,
    };
  });

  const byTier: Record<string, typeof enrichedEntries> = { S: [], A: [], B: [], C: [], D: [] };
  enrichedEntries.forEach((e) => {
    if (byTier[e.tier]) byTier[e.tier].push(e);
  });

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <a
        href="../tier-list"
        className="text-sm text-gray-400 hover:text-white mb-6 inline-block"
      >
        ← 전체 티어리스트
      </a>
      <h1 className="text-2xl font-bold text-white mb-2">{tl.label} 티어리스트</h1>
      <p className="text-gray-500 text-sm mb-8">
        {locale === "ko" ? `업데이트: ${tl.updatedAt}` : `Updated: ${tl.updatedAt}`}
      </p>

      <div className="space-y-6">
        {(["S", "A", "B", "C", "D"] as const).map((tier) => (
          <div key={tier} className="border border-gray-800 rounded-xl overflow-hidden">
            <div className={`px-4 py-3 font-bold flex items-center gap-3 ${TIER_COLORS[tier]}`}>
              <span className="text-2xl font-black">{tier}</span>
              <span className="text-sm opacity-80">
                {TIER_LABELS[tier].split("—")[1]?.trim()}
              </span>
            </div>
            {byTier[tier].length > 0 ? (
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {byTier[tier].map((entry) => (
                  <a
                    key={entry.cardId}
                    href={`../../cards/${entry.cardId}`}
                    className="flex items-center gap-3 p-3 rounded-lg bg-gray-800/50 hover:bg-gray-800 transition-colors"
                  >
                    {entry.imageSmall ? (
                      <img
                        src={entry.imageSmall}
                        alt={entry.name}
                        className="h-16 w-12 object-contain flex-shrink-0 rounded"
                        loading="lazy"
                      />
                    ) : (
                      <div className="h-16 w-12 flex-shrink-0 rounded bg-gray-800" />
                    )}
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
    </div>
  );
}
