/**
 * 덱리스트 리졸버용 CardCandidate 풀 빌더.
 *
 * Card(gameCardId NOT NULL) + RegionCard(setCode=Set.code, number) 1회 배치 조회.
 * 호출부(getArchetypeRecipe / computeDeckCost 등)가 이 풀을 받아
 * resolveRecipeCard / buildSetNumberIndex 에 넘긴다.
 *
 * 성능:
 * - gameCardId NOT NULL 필터로 리졸브 불가 카드 제외(빌드 속도·크기 절감).
 * - select 최소화(id/gameCardId/artCardId + locale setCode/number만).
 * - React cache() 로 request-scoped 메모이즈 — 같은 렌더 내 중복 호출을 1회로 dedup.
 *   (Next.js fetch() dedup 은 fetch 한정; Prisma 쿼리엔 적용 안 되므로 cache() 직접 사용)
 */
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import type { CardCandidate } from "./decklist-gamecard-resolver";
import type { SetNumberIndex } from "./decklist-gamecard-resolver";
import { buildSetNumberIndex } from "./decklist-gamecard-resolver";

export interface CandidatePool {
  pool: CardCandidate[];
  poolById: Map<string, CardCandidate>;
  snIdx: SetNumberIndex;
}

/** Card + RegionCard 조인으로 CardCandidate 풀과 인덱스를 1회 조회해 반환한다. */
export async function buildCandidatePool(): Promise<CandidatePool> {
  const cards = await prisma.card.findMany({
    where: { gameCardId: { not: null } },
    select: {
      id: true,
      gameCardId: true,
      artCardId: true,
      locales: {
        select: {
          number: true,
          set: { select: { code: true } },
        },
      },
    },
  });

  const pool: CardCandidate[] = cards.map((c) => ({
    id: c.id,
    gameCardId: c.gameCardId,
    artCardId: c.artCardId,
    printings: c.locales.map((l) => ({
      setCode: l.set.code,
      number: l.number,
    })),
  }));

  const poolById = new Map<string, CardCandidate>(pool.map((c) => [c.id, c]));
  const snIdx = buildSetNumberIndex(pool);

  return { pool, poolById, snIdx };
}

/**
 * React cache() 로 감싼 request-scoped 메모이즈 버전.
 * getArchetypeRecipe / computeDeckCost 같은 렌더 내 복수 호출 시 DB 조회를 1회로 dedup.
 */
export const getCandidatePool = cache(buildCandidatePool);
