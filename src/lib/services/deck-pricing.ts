/**
 * 덱 견적 엔진 — docs/cardgame-ui-plan.md §2-I1 (UI-1b)
 *
 * 레시피(INTL) → cardName 그룹 → 인쇄판 후보(레시피 logicalCardId + EN명 역추적) →
 * 모드별 인쇄판 선택(budget=저레어/premium=고레어, RarityCategory.tier 5/6 경계) →
 * 최신 시세 합산(KRW 환산).
 *
 * 실측 함정 반영(2026-06-06 사실확인):
 * - 가격 필드 혼재: yuyu/cardmarket=marketPrice만, tcgplayer=변형필드 → 폴백 체인
 * - (locale,source)당 1~3행 시계열 → 최신 1행 선택
 * - SWSH 병합 LC 의 EN 가격이 orphan LC 에 분열 → EN명 역추적으로 인쇄판 확장
 * - condition 행(tcgplayer 16k) 혼재 → condition null 만
 * - rarity null 24% → tier 0(저레어) 취급
 * - 기본 에너지(logicalCardId null) → 장당 고정 추정가
 * - 환율 = src/lib/trades/shared.ts 상수(캡션에 명시 의무)
 *
 * 정확도 가드: missing 에 고레어(tier>=6) 인쇄판만 가진 카드가 있으면 hasExpensiveMissing —
 * UI 는 "±변동 큼" 라벨 의무.
 */
import { prisma } from "@/lib/prisma";
import { toKrw } from "@/lib/trades/shared";

const PRICE_SOURCES = ["yuyu_tei_sell", "tcgplayer", "cardmarket"] as const;
/** 표기 우선순위: JP 매장가(한국 유저 직구 기준) > 미국 > 유럽 */
const SOURCE_PRIORITY: Record<string, number> = { yuyu_tei_sell: 0, tcgplayer: 1, cardmarket: 2 };
const ENERGY_ESTIMATE_KRW = 200; // 기본 에너지(미연결) 장당 추정 — 캡션 표기
const EXPENSIVE_TIER = 6; // ultra_rare 이상 = 고레어

export type DeckCostLine = {
  cardName: string;
  count: number;
  unitKrw: number;
  rarity: string | null; // 선택 인쇄판 레어도 코드
  source: string; // yuyu_tei_sell | tcgplayer | cardmarket | estimate
  cardLocaleId: string | null;
};

export type DeckCostSide = {
  totalKrw: number;
  lines: DeckCostLine[];
};

export type DeckCostResult = {
  budget: DeckCostSide;
  premium: DeckCostSide;
  totalCount: number; // 견적 대상 장수
  pricedCount: number; // 시세 확보 장수
  missing: { cardName: string; count: number; expensive: boolean }[];
  hasExpensiveMissing: boolean;
  asOf: string | null; // 사용한 시세의 최신 recordedAt (YYYY-MM-DD)
  basis: string; // 캡션용 기준 문구
};

type PrintInfo = {
  logicalCardId: string;
  rarityTier: number;
  rarityCode: string | null;
};

export async function computeDeckCost(archetypeId: string): Promise<DeckCostResult | null> {
  // ① 레시피 (INTL) — 인쇄판별 행
  const rows = await prisma.deckRecipeCard.findMany({
    where: { archetypeId, region: "INTL" },
    select: { cardName: true, category: true, avgCount: true, adoptionRate: true, logicalCardId: true },
  });
  if (rows.length === 0) return null;

  // ② cardName 그룹: 수량 = Σ avgCount 반올림 (비에너지 상한 4 — Limitless name=게임 텍스트 단위 의미론)
  type Group = { cardName: string; category: string; qty: number; maxAdoption: number; lcIds: Set<string> };
  const groups = new Map<string, Group>();
  for (const r of rows) {
    let g = groups.get(r.cardName);
    if (!g) {
      g = { cardName: r.cardName, category: r.category, qty: 0, maxAdoption: 0, lcIds: new Set() };
      groups.set(r.cardName, g);
    }
    g.qty += r.avgCount;
    g.maxAdoption = Math.max(g.maxAdoption, r.adoptionRate);
    if (r.logicalCardId) g.lcIds.add(r.logicalCardId);
  }
  for (const g of groups.values()) {
    g.qty = Math.max(1, Math.round(g.qty));
    if (g.category !== "energy") g.qty = Math.min(4, g.qty);
  }

  // ②-b "표준 60장" 절사 — 채용률 내림차순 누적 60장 (계획 의사코드 ①: 테크 카드 전량 합산 방지)
  const DECK_SIZE = 60;
  const ordered = [...groups.values()].sort((a, b) => b.maxAdoption - a.maxAdoption || b.qty - a.qty);
  const deck: Group[] = [];
  let acc = 0;
  for (const g of ordered) {
    if (acc >= DECK_SIZE) break;
    const take = Math.min(g.qty, DECK_SIZE - acc);
    deck.push({ ...g, qty: take });
    acc += take;
  }

  // ③ EN명 역추적 — orphan LC 가격 분열 흡수 (배치 1쿼리)
  // ⚠ 시대 제한: 동명 빈티지 인쇄판(rarity null=tier0)이 budget 후보로 끌려와 "콤버스천 12만원" 류
  //   왜곡을 만들었음(실측) → 현행 시대 setId prefix 로 한정. 시대 내 가격 없으면 missing(정직).
  const MODERN_SET_PREFIXES = ["sv", "me", "zsv", "rsv", "swsh", "en-tcg-swsh"];
  const names = deck.map((g) => g.cardName);
  const enLocales = await prisma.cardLocale.findMany({
    where: { region: "EN", name: { in: names } },
    select: { name: true, logicalCardId: true, setId: true },
  });
  const groupByName = new Map(deck.map((g) => [g.cardName, g]));
  for (const l of enLocales) {
    if (!MODERN_SET_PREFIXES.some((p) => l.setId.startsWith(p))) continue;
    groupByName.get(l.name)?.lcIds.add(l.logicalCardId);
  }

  // ④ 인쇄판 레어도 (배치)
  const allLcIds = [...new Set(deck.flatMap((g) => [...g.lcIds]))];
  const lcs = await prisma.logicalCard.findMany({
    where: { id: { in: allLcIds } },
    select: {
      id: true,
      // P7: rarity→CardLocale.rarity (P4a 기계복제, diff=0). 전환기: 새층 locales.rarity 우선, LC rarity 폴백.
      rarity: { select: { code: true, category: { select: { tier: true } } } },
      locales: { select: { rarity: { select: { code: true, category: { select: { tier: true } } } } } },
    },
  });
  const printInfo = new Map<string, PrintInfo>(
    lcs.map((l) => [
      l.id,
      (() => {
        const lr = l.locales.find((x) => x.rarity != null)?.rarity ?? l.rarity;
        return { logicalCardId: l.id, rarityTier: lr?.category?.tier ?? 0, rarityCode: lr?.code ?? null };
      })(),
    ]),
  );

  // ⑤ 시세 (배치 1쿼리) — 소스 3종·condition null → (locale,source) 최신 1행
  const sources = await prisma.priceSource.findMany({
    where: { code: { in: [...PRICE_SOURCES] } },
    select: { id: true, code: true },
  });
  const sourceCode = new Map(sources.map((s) => [s.id, s.code]));
  const priceRows = await prisma.price.findMany({
    where: {
      sourceId: { in: sources.map((s) => s.id) },
      condition: null,
      cardLocale: { logicalCardId: { in: allLcIds } },
    },
    select: {
      sourceId: true,
      currency: true,
      marketPrice: true,
      holofoil: true,
      normal: true,
      reverseHolo: true,
      firstEdition: true,
      recordedAt: true,
      cardLocaleId: true,
      cardLocale: { select: { logicalCardId: true } },
    },
    orderBy: { recordedAt: "desc" },
  });

  // (locale,source) 최신 1행 → 인쇄판(LC)별 최우선 소스 가격
  type PricePick = { krw: number; source: string; recordedAt: Date; cardLocaleId: string };
  const seen = new Set<string>();
  const byPrint = new Map<string, PricePick>();
  let latest: Date | null = null;
  for (const p of priceRows) {
    const key = `${p.cardLocaleId}|${p.sourceId}`;
    if (seen.has(key)) continue; // recordedAt desc 정렬 → 첫 행이 최신
    seen.add(key);
    const raw = p.marketPrice ?? p.holofoil ?? p.normal ?? p.reverseHolo ?? p.firstEdition;
    if (raw == null || raw <= 0) continue;
    const code = sourceCode.get(p.sourceId!) ?? "?";
    const krw = Math.round(toKrw(raw, p.currency));
    const lcId = p.cardLocale.logicalCardId;
    const cur = byPrint.get(lcId);
    if (!cur || (SOURCE_PRIORITY[code] ?? 9) < (SOURCE_PRIORITY[cur.source] ?? 9)) {
      byPrint.set(lcId, { krw, source: code, recordedAt: p.recordedAt, cardLocaleId: p.cardLocaleId });
    }
    if (!latest || p.recordedAt > latest) latest = p.recordedAt;
  }

  // ⑥ 모드별 인쇄판 선택 + 합산
  const budget: DeckCostSide = { totalKrw: 0, lines: [] };
  const premium: DeckCostSide = { totalKrw: 0, lines: [] };
  const missing: DeckCostResult["missing"] = [];
  let totalCount = 0;
  let pricedCount = 0;

  for (const g of deck) {
    totalCount += g.qty;

    // 기본 에너지 — 고정 추정가 (미연결 + 이름 패턴 강제: sve 명칭 차이("Basic ~ Energy")로
    // 역추적이 빗나가 특수판 고가가 잡히는 왜곡 방지. 스페셜 에너지는 일반 경로)
    const isBasicEnergy =
      g.category === "energy" &&
      /^(Basic )?(Grass|Fire|Water|Lightning|Psychic|Fighting|Darkness|Metal) Energy$/i.test(g.cardName.replace(/\s*-\s*Basic$/i, ""));
    if ((g.lcIds.size === 0 && g.category === "energy") || isBasicEnergy) {
      const line: DeckCostLine = {
        cardName: g.cardName,
        count: g.qty,
        unitKrw: ENERGY_ESTIMATE_KRW,
        rarity: null,
        source: "estimate",
        cardLocaleId: null,
      };
      budget.totalKrw += ENERGY_ESTIMATE_KRW * g.qty;
      premium.totalKrw += ENERGY_ESTIMATE_KRW * g.qty;
      budget.lines.push(line);
      premium.lines.push(line);
      pricedCount += g.qty;
      continue;
    }

    const priced = [...g.lcIds]
      .map((id) => ({ info: printInfo.get(id), price: byPrint.get(id) }))
      .filter((x): x is { info: PrintInfo; price: PricePick } => !!x.info && !!x.price);

    if (priced.length === 0) {
      const maxTier = Math.max(0, ...[...g.lcIds].map((id) => printInfo.get(id)?.rarityTier ?? 0));
      missing.push({ cardName: g.cardName, count: g.qty, expensive: maxTier >= EXPENSIVE_TIER });
      continue;
    }
    pricedCount += g.qty;

    // budget = 최저가 (레어도 프록시는 프로모(tier 0)를 '저레어'로 오인 — 실측 "보스의 지령 프로모
    // 1.8만원" 왜곡 → 가격 직접 기준이 "싸게 짠다"의 본질)
    const pickBudget = [...priced].sort((a, b) => a.price.krw - b.price.krw)[0];
    // premium = 최고 레어도 (tie → 최고가). promo/None(tier 0)은 자연 후순위.
    const pickPremium = [...priced].sort(
      (a, b) => b.info.rarityTier - a.info.rarityTier || b.price.krw - a.price.krw,
    )[0];

    for (const [side, pick] of [
      [budget, pickBudget],
      [premium, pickPremium],
    ] as const) {
      side.totalKrw += pick.price.krw * g.qty;
      side.lines.push({
        cardName: g.cardName,
        count: g.qty,
        unitKrw: pick.price.krw,
        rarity: pick.info.rarityCode,
        source: pick.price.source,
        cardLocaleId: pick.price.cardLocaleId,
      });
    }
  }

  budget.lines.sort((a, b) => b.unitKrw * b.count - a.unitKrw * a.count);
  premium.lines.sort((a, b) => b.unitKrw * b.count - a.unitKrw * a.count);

  return {
    budget,
    premium,
    totalCount,
    pricedCount,
    missing,
    hasExpensiveMissing: missing.some((m) => m.expensive),
    asOf: latest ? latest.toISOString().slice(0, 10) : null,
    basis: "遊々亭 판매가(JPY) 우선 + TCGplayer(USD) 폴백 · 환율 고정(100엔=900원, 1달러=1,400원)",
  };
}
