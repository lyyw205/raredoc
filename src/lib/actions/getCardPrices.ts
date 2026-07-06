"use server";

/**
 * 카드 한 장(RegionCard)의 시세를 출처별 최신 1건씩 반환.
 *
 * - 입력: regionCardId (모달이 보여주고 있는 카드)
 * - 묶음 단위: 해당 Card에 매달린 모든 region(EN/JP/KR) RegionCard의 Price를 통합
 *   (예: 같은 카드라도 EN은 tcgplayer, JP는 yuyu-tei에서 가격이 들어옴 → 같은 카드의 한 모달에 4개 출처 행 표시)
 * - 출처별 dedup: PriceSource.code 기준 가장 최근 1건만
 * - 정렬: PriceSource.priority asc (낮은 숫자 우선)
 * - 가격: 단일값 amount
 *
 * 참고: count(거래·리스팅 수) 컬럼은 현 스키마에 없음 → 표시 X.
 */

import { prisma } from "@/lib/prisma";
import { variantLabel } from "@/lib/cards/price-display";

export type CardPriceRow = {
  sourceCode: string;
  sourceName: string;
  region: string; // US | GLOBAL | JP | KR
  currency: string; // USD | EUR | JPY | KRW
  market: number | null;
  recordedAt: string;
};

export async function getCardPrices(regionCardId: string): Promise<CardPriceRow[]> {
  const anchor = await prisma.regionCard.findUnique({
    where: { id: regionCardId },
    select: { cardId: true },
  });
  if (!anchor) return [];

  const regionCardIds = await prisma.regionCard.findMany({
    where: { cardId: anchor.cardId },
    select: { id: true },
  });
  if (regionCardIds.length === 0) return [];

  const prices = await prisma.price.findMany({
    where: { regionCardId: { in: regionCardIds.map((l) => l.id) }, sourceId: { not: null } },
    orderBy: { recordedAt: "desc" },
    include: { priceSource: true },
  });

  const seen = new Set<string>();
  const priorityByCode = new Map<string, number>(); // 정렬용 — include 된 priceSource 에서 바로 캡처
  const rows: CardPriceRow[] = [];
  for (const p of prices) {
    const ps = p.priceSource;
    if (!ps) continue;
    if (seen.has(ps.code)) continue;
    seen.add(ps.code);
    priorityByCode.set(ps.code, ps.priority);

    const market = p.amount ?? null;
    rows.push({
      sourceCode: ps.code,
      sourceName: ps.name,
      region: ps.marketRegion,
      currency: p.currency,
      market,
      recordedAt: p.recordedAt.toISOString(),
    });
  }

  // priority asc (낮은 숫자 우선)
  rows.sort((a, b) => (priorityByCode.get(a.sourceCode) ?? 999) - (priorityByCode.get(b.sourceCode) ?? 999));

  return rows;
}

/**
 * 같은 아트(Card)의 시세를 ★팩별(에디션×세트×번호 = RegionCard)로 분리★ 반환.
 *
 * getCardPrices 와 달리 출처를 Card 전체로 합치지 않는다 — 같은 그림이 여러 팩(본탄·재판·하이클래스)에
 * 있으면 가격이 수배~수십배 갈리므로(docs/plans/card-model-and-pricing-taxonomy.md ④) 절대 합치면 안 된다.
 * 각 RegionCard(=Print) 단위로 출처별 최신 1건씩 묶고, 가격이 1건 이상 있는 프린트만 반환.
 * 에디션은 RegionCard.region(JP/EN/KR) 그대로(=실물 판본) — PriceSource.marketRegion 이 아님.
 */
// 프린트(RegionCard) 안의 변형(PrintVariant=SKU)별 시세 — 마감(마스터볼/리버스/섀도우리스 등)마다 시세가
// 다르므로(taxonomy §0·§2·④) 출처 dedup 을 변형 안에서 따로 한다(변형끼리 안 덮이게).
export type PrintVariantPriceGroup = {
  kind: string; // standard|reverse|masterball|pokeball|first_edition|shadowless|stamp|error
  slug: string;
  label: string | null; // 표시 라벨(standard 면 null)
  prices: CardPriceRow[];
};

export type PrintPriceGroup = {
  regionCardId: string;
  region: string; // JP | EN | KR (실물 판본 = 에디션)
  setId: string;
  setName: string;
  number: string;
  numberInt: number | null;
  variants: PrintVariantPriceGroup[]; // standard 우선, 실변형 뒤
};

export async function getCardPrintPrices(regionCardId: string): Promise<PrintPriceGroup[]> {
  const anchor = await prisma.regionCard.findUnique({
    where: { id: regionCardId },
    select: { cardId: true },
  });
  if (!anchor) return [];

  const rcs = await prisma.regionCard.findMany({
    where: { cardId: anchor.cardId },
    select: { id: true, region: true, number: true, numberInt: true, setId: true },
  });
  if (rcs.length === 0) return [];

  const sets = await prisma.set.findMany({
    where: { id: { in: [...new Set(rcs.map((r) => r.setId))] } },
    select: { id: true, name: true },
  });
  const setName = new Map(sets.map((s) => [s.id, s.name]));

  const prices = await prisma.price.findMany({
    where: { regionCardId: { in: rcs.map((r) => r.id) }, sourceId: { not: null } },
    orderBy: { recordedAt: "desc" },
    include: { priceSource: true, printVariant: { select: { kind: true, slug: true, label: true } } },
  });

  // RegionCard(프린트) → 변형(kind|slug) → 출처(code)별 최신 1건. dedup 을 ★변형 안에서★ 한다.
  type VAgg = { kind: string; slug: string; label: string | null; rows: { row: CardPriceRow; priority: number }[]; seen: Set<string> };
  const byRc = new Map<string, Map<string, VAgg>>();
  for (const p of prices) {
    const ps = p.priceSource;
    if (!ps) continue;
    const kind = p.printVariant?.kind ?? "standard";
    const slug = p.printVariant?.slug ?? "standard";
    const vkey = `${kind}|${slug}`;
    let vmap = byRc.get(p.regionCardId);
    if (!vmap) {
      vmap = new Map();
      byRc.set(p.regionCardId, vmap);
    }
    let agg = vmap.get(vkey);
    if (!agg) {
      agg = { kind, slug, label: variantLabel(kind, p.printVariant?.label ?? null), rows: [], seen: new Set() };
      vmap.set(vkey, agg);
    }
    if (agg.seen.has(ps.code)) continue; // 같은 변형 안에서 출처별 최신 1건
    agg.seen.add(ps.code);
    agg.rows.push({
      row: {
        sourceCode: ps.code,
        sourceName: ps.name,
        region: ps.marketRegion,
        currency: p.currency,
        market: p.amount ?? null,
        recordedAt: p.recordedAt.toISOString(),
      },
      priority: ps.priority,
    });
  }

  const groups: PrintPriceGroup[] = [];
  for (const rc of rcs) {
    const vmap = byRc.get(rc.id);
    if (!vmap || vmap.size === 0) continue; // 시세 있는 프린트만
    const variants: PrintVariantPriceGroup[] = [];
    for (const agg of vmap.values()) {
      if (agg.rows.length === 0) continue;
      agg.rows.sort((a, b) => a.priority - b.priority);
      variants.push({ kind: agg.kind, slug: agg.slug, label: agg.label, prices: agg.rows.map((x) => x.row) });
    }
    if (variants.length === 0) continue;
    // standard 우선, 그 다음 라벨순
    variants.sort(
      (a, b) =>
        (a.kind === "standard" ? 0 : 1) - (b.kind === "standard" ? 0 : 1) ||
        (a.label ?? "").localeCompare(b.label ?? ""),
    );
    groups.push({
      regionCardId: rc.id,
      region: rc.region,
      setId: rc.setId,
      setName: setName.get(rc.setId) ?? rc.setId,
      number: rc.number,
      numberInt: rc.numberInt,
      variants,
    });
  }

  const regionOrder: Record<string, number> = { JP: 0, EN: 1, KR: 2 };
  groups.sort(
    (a, b) =>
      (regionOrder[a.region] ?? 9) - (regionOrder[b.region] ?? 9) ||
      (a.numberInt ?? 0) - (b.numberInt ?? 0),
  );
  return groups;
}
