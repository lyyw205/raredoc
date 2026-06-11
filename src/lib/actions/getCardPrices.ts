"use server";

/**
 * 카드 한 장(RegionCard)의 시세를 출처별 최신 1건씩 반환.
 *
 * - 입력: regionCardId (모달이 보여주고 있는 카드)
 * - 묶음 단위: 해당 Card에 매달린 모든 region(EN/JP/KR) RegionCard의 Price를 통합
 *   (예: 같은 카드라도 EN은 tcgplayer, JP는 yuyu-tei에서 가격이 들어옴 → 같은 카드의 한 모달에 4개 출처 행 표시)
 * - 출처별 dedup: PriceSource.code 기준 가장 최근 1건만
 * - 정렬: PriceSource.priority asc (낮은 숫자 우선)
 * - 가격 우선순위: marketPrice > holofoil > normal > reverseHolo > firstEdition
 *
 * 참고: count(거래·리스팅 수) 컬럼은 현 스키마에 없음 → 표시 X.
 */

import { prisma } from "@/lib/prisma";

export type CardPriceRow = {
  sourceCode: string;
  sourceName: string;
  region: string; // US | GLOBAL | JP | KR
  currency: string; // USD | EUR | JPY | KRW
  market: number | null;
  variants: { normal: number | null; holofoil: number | null; reverseHolo: number | null; firstEdition: number | null };
  recordedAt: string;
};

export async function getCardPrices(regionCardId: string): Promise<CardPriceRow[]> {
  const me = await prisma.regionCard.findUnique({
    where: { id: regionCardId },
    select: { cardId: true },
  });
  if (!me) return [];

  const localeIds = await prisma.regionCard.findMany({
    where: { cardId: me.cardId },
    select: { id: true },
  });
  if (localeIds.length === 0) return [];

  const prices = await prisma.price.findMany({
    where: { regionCardId: { in: localeIds.map((l) => l.id) }, sourceId: { not: null } },
    orderBy: { recordedAt: "desc" },
    include: { priceSource: true },
  });

  const seen = new Set<string>();
  const rows: CardPriceRow[] = [];
  for (const p of prices) {
    const ps = p.priceSource;
    if (!ps) continue;
    if (seen.has(ps.code)) continue;
    seen.add(ps.code);

    const market =
      p.marketPrice ??
      p.holofoil ??
      p.normal ??
      p.reverseHolo ??
      p.firstEdition ??
      null;
    rows.push({
      sourceCode: ps.code,
      sourceName: ps.name,
      region: ps.marketRegion,
      currency: p.currency,
      market,
      variants: {
        normal: p.normal,
        holofoil: p.holofoil,
        reverseHolo: p.reverseHolo,
        firstEdition: p.firstEdition,
      },
      recordedAt: p.recordedAt.toISOString(),
    });
  }

  // priority asc — PriceSource 마스터 한 번에 조회해서 정렬
  const priorityByCode = new Map<string, number>();
  const all = await prisma.priceSource.findMany({ select: { code: true, priority: true } });
  for (const s of all) priorityByCode.set(s.code, s.priority);

  rows.sort((a, b) => (priorityByCode.get(a.sourceCode) ?? 999) - (priorityByCode.get(b.sourceCode) ?? 999));

  return rows;
}
