import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  getArchetypes,
  getArchetypeTrends,
  getRisingDecks,
  getRealTournaments,
  getRegionArchetypes,
  getTournaments,
} from "@/lib/services/cardgame";
import { MetaPageView } from "./MetaPageView";
import { RegionMetaView } from "./RegionMetaView";

// 메타 현황 — ?metaRegion= [글로벌(INTL)|일본(JP)|한국(KR)] 탭 (multisource P3).
// 글로벌은 본체 DeckArchetype(INTL 미러 — 무회귀), JP/KR 은 ArchetypeRegionStat 조인.
// 카드 매칭 보류(A단계)라 heroCardIds 빈 배열 → 화면은 tier 뱃지/덱명 폴백.

const TABS = [
  { key: "INTL", label: "🌍 글로벌" },
  { key: "JP", label: "🇯🇵 일본" },
  { key: "KR", label: "🇰🇷 한국" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

function RegionTabs({ locale, active }: { locale: string; active: TabKey }) {
  return (
    <div className="flex items-center gap-2 mb-6">
      {TABS.map((t) => (
        <Link
          key={t.key}
          href={t.key === "INTL" ? `/${locale}/cardgame` : `/${locale}/cardgame?metaRegion=${t.key}`}
          className={cn(
            "px-3.5 py-1.5 rounded-full text-toss-label font-semibold transition-colors",
            active === t.key
              ? "bg-toss-text-primary text-white"
              : "bg-toss-bg-muted text-toss-text-tertiary hover:text-toss-text-primary",
          )}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}

export default async function CardgameMetaPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ metaRegion?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  const tab: TabKey = sp.metaRegion === "JP" || sp.metaRegion === "KR" ? sp.metaRegion : "INTL";

  // JP/KR 탭 — RegionStat 기반 입상 점유율 리스트
  if (tab !== "INTL") {
    const [archetypes, tournaments] = await Promise.all([
      getRegionArchetypes(tab),
      getTournaments({ realOnly: true, metaRegion: tab }),
    ]);
    const latestDate = tournaments.length
      ? tournaments.map((t) => t.date).sort((a, b) => b.localeCompare(a))[0]
      : null;
    return (
      <div>
        <RegionTabs locale={locale} active={tab} />
        <RegionMetaView
          locale={locale}
          region={tab}
          archetypes={archetypes}
          tournamentCount={tournaments.length}
          latestDate={latestDate}
        />
      </div>
    );
  }

  // 글로벌(INTL) 탭 — 기존 화면 그대로
  const [archetypes, trend, rising, tournaments] = await Promise.all([
    getArchetypes({ realOnly: true }),
    getArchetypeTrends(),
    getRisingDecks(5),
    getRealTournaments(),
  ]);

  return (
    <div>
      <RegionTabs locale={locale} active="INTL" />
      <MetaPageView
        locale={locale}
        archetypes={archetypes}
        trend={trend}
        rising={rising}
        tournamentCount={tournaments.length}
      />
    </div>
  );
}
