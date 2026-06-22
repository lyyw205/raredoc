// cross-pack 형제 풀 확장 — feature flag + 헬퍼.
//
// flag OFF(기본): 기존 per-Card locales 그대로. 추가 쿼리 0.
// flag ON: artCardId 그룹 전체 RegionCard 를 후보로 확장.
//
// 설계 근거: docs/migration/identity-model-migration-plan.md §0′ (D3, 2026-06-22).
// DB 쓰기 없음 — 읽기 전용.

import { prisma } from "@/lib/prisma";
import type { SiblingCandidate } from "./sibling-resolver";

/** 서버사이드 feature flag. 기본 OFF(env 미설정 시 false). */
export const CROSS_PACK_SIBLINGS_ENABLED =
  process.env.CROSS_PACK_SIBLINGS === "1";

/**
 * artCardId 그룹 전체의 RegionCard 를 SiblingCandidate[] 로 반환.
 * artCardId 가 null/undefined 이면 빈 배열 → 호출부가 per-pack 폴백 사용.
 *
 * DB 쓰기 없음.
 */
export async function loadArtGroupCandidates(
  artCardId: string | null | undefined,
): Promise<SiblingCandidate[]> {
  if (!artCardId) return [];

  const rows = await prisma.regionCard.findMany({
    where: { card: { artCardId } },
    select: {
      id: true,
      region: true,
      setId: true,
      set: { select: { releaseDate: true } },
      imageSmall: true,
      imageLarge: true,
      numberInt: true,
      number: true,
      // role 은 CardPackLink 에 있고 RegionCard 에 없다 → 생략(기존과 동일)
    },
  });

  return rows.map((r) => ({
    id: r.id,
    region: r.region,
    setId: r.setId,
    releaseDate: r.set.releaseDate,
    hasImage: !!(r.imageLarge || r.imageSmall),
    numberInt: r.numberInt,
    number: r.number,
  }));
}

/**
 * 여러 artCardId 의 그룹을 한 번에 로드. artCardId → ArtGroupEntry[] 맵 반환.
 * IN 쿼리 1회로 N+1 방지(buildSetCards 배치 프리페치용).
 *
 * DB 쓰기 없음.
 */
export type ArtGroupEntry = SiblingCandidate & {
  /** RegionCard.name */
  name: string;
  /** RegionCard.imageSmall */
  imageSmall: string | null;
  /** RegionCard.rarity (variant 표시용) */
  rarity: {
    code: string;
    nameKo: string | null;
    nameJa: string | null;
    nameEn: string | null;
    tier: number;
    category: {
      code: string;
      nameKo: string;
      nameJa: string | null;
      nameEn: string;
      tier: number;
    } | null;
  } | null;
};

export async function loadArtGroupCandidatesBatch(
  artCardIds: string[],
): Promise<Map<string, ArtGroupEntry[]>> {
  if (artCardIds.length === 0) return new Map();

  const rows = await prisma.regionCard.findMany({
    where: { card: { artCardId: { in: artCardIds } } },
    select: {
      id: true,
      name: true,
      region: true,
      setId: true,
      set: { select: { releaseDate: true } },
      imageSmall: true,
      imageLarge: true,
      numberInt: true,
      number: true,
      rarity: {
        select: {
          code: true, nameKo: true, nameJa: true, nameEn: true, tier: true,
          category: { select: { code: true, nameKo: true, nameJa: true, nameEn: true, tier: true } },
        },
      },
      card: { select: { artCardId: true } }, // 그룹핑 키
    },
  });

  const map = new Map<string, ArtGroupEntry[]>();
  for (const r of rows) {
    const key = r.card.artCardId!; // WHERE 조건으로 non-null 보장
    const entry: ArtGroupEntry = {
      id: r.id,
      region: r.region,
      setId: r.setId,
      releaseDate: r.set.releaseDate,
      hasImage: !!(r.imageLarge || r.imageSmall),
      numberInt: r.numberInt,
      number: r.number,
      name: r.name,
      imageSmall: r.imageSmall,
      rarity: r.rarity,
    };
    const arr = map.get(key);
    if (arr) arr.push(entry);
    else map.set(key, [entry]);
  }
  return map;
}
