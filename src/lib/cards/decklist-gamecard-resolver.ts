// 덱리스트 → GameCard 리졸버 (B 단계, docs/migration/identity-model-migration-plan.md §0′ 로드맵 B)
//
// 목적:
//   외부 Limitless 덱리스트 참조(setCode + number 또는 cardId(=LogicalCard.id))를
//   canonical gameCardId 로 통일하고,
//   collapse(P5) 후 생존자 Card(artCardId 대표)로의 재바인드 대상을 결정한다.
//
// 완료 판정 기준(로드맵 B): "채용률 diff0 · recon0 · non-null→생존자".
//   - gameCardId 통일 → 같은 플레이 카드의 재판이 별도 cardId 로 분산되던 채용률 집계를 단일 gameCardId 로 합산.
//   - 생존자 재바인드 → collapse 후 비대표 Card.id 가 사라져도 DeckRecipeCard.cardId 가 살아있는 대표(artCardId)를 가리키게 됨.
//   - non-null 보존 → 현재 cardId IS NOT NULL 인 행은 반드시 생존자가 지정됨(null 로 퇴행 금지).
//
// 규칙:
//   - 순수 함수 — DB·prisma 비의존. 호출부가 후보 풀을 조회해 넘긴다.
//   - 모호·미해결은 null / UNRESOLVED 로. 추측 병합 금지(under-merge 선호).
//   - 같은 gameCardId 를 가진 CardCandidate 가 여러 개면 artCardId 기준 대표(=artCardId 가 자기 id인 것)를 생존자로.
//   - gameCardId 없는 Card 는 cardId 자기 키로 무회귀(getCardAdoption 패턴 동일).
//
// 사용 예:
//   const pool = await buildCandidatePool(prisma);   // 호출부(스크립트)
//   const result = resolveRecipeCard(row, pool);
//   // result.gameCardId: canonical / result.survivorCardId: collapse 생존자
//
// 한국어 주석 관례 준수(이 레포). any 금지 — unknown/타입 명시.

/** DeckRecipeCard 한 행의 덱리스트 참조 입력. */
export interface RecipeCardRef {
  /** DeckRecipeCard.cardId (= LogicalCard.id, nullable). */
  cardId: string | null;
  /** DeckRecipeCard.setCode (EN ptcgoCode 세트코드, ""=미상). */
  setCode: string;
  /** DeckRecipeCard.number (덱리스트 번호, ""=미상). */
  number: string;
  /** DeckRecipeCard.cardName (Limitless 원문명 — 폴백 진단용). */
  cardName: string;
}

/**
 * 후보 Card(LogicalCard) 1행.
 * DB 조회 시: Card(id, gameCardId, artCardId) + RegionCard 의 (setCode=Set.code, number) 역매핑.
 * setCode 는 Set.code(EN ptcgoCode) 값이며 단일 카드가 여러 RegionCard 를 가질 수 있어 배열로 받는다.
 */
export interface CardCandidate {
  /** Card.id (= LogicalCard.id). */
  id: string;
  /** Card.gameCardId (nullable). */
  gameCardId: string | null;
  /**
   * Card.artCardId (nullable).
   * collapse 생존자 판별: artCardId === id 이면 이 Card 가 그룹 대표(생존자).
   * artCardId 가 null(build-art-groups 미실행)이면 자기 id를 생존자로 본다.
   */
  artCardId: string | null;
  /**
   * 이 Card 에 연결된 RegionCard 들의 (setCode, number) 쌍.
   * setCode = Set.code(EN ptcgoCode, nullable → null 로 표시).
   * 호출부가 RegionCard JOIN Set 으로 조회해 넘긴다.
   */
  printings: ReadonlyArray<{ setCode: string | null; number: string }>;
}

/** 리졸브 성공 결과. */
export interface ResolveSuccess {
  status: "resolved";
  /** 이 레시피 참조의 canonical gameCardId. */
  gameCardId: string;
  /**
   * collapse(P5) 후 DeckRecipeCard.cardId 가 바인드되어야 할 생존자 Card.id.
   * artCardId 기반(=artCardId 가 자기 id 인 Card); build-art-groups 미실행 시 cardId 자기값.
   */
  survivorCardId: string;
  /**
   * 리졸브에 사용된 입력 cardId (채용률 diff0 추적용).
   * cardId 경로: ref.cardId 그대로.
   * setCode 경로: 매칭된 CardCandidate.id (입력 ref.cardId 가 아님 — ref.cardId 는 null).
   */
  inputCardId: string;
}

/** 리졸브 실패 결과. 추측 금지 — 미결 상태 유지. */
export interface ResolveUnresolved {
  status: "unresolved";
  /** 미해결 사유 코드. */
  reason:
    | "no_cardid_no_setcode" // cardId=null & setCode="" & number="" → 참조 정보 없음
    | "cardid_not_in_pool"   // cardId 있으나 pool에 없음 → DB 미수집 or 고아
    | "setcode_no_match"     // setCode+number 로 pool에서 못 찾음 → EN 미수집 or 코드 불일치
    | "no_gamecardid";       // Card 는 있으나 gameCardId 가 null → P3 미완료 카드
  /** 진단용 입력 값. */
  ref: RecipeCardRef;
}

export type ResolveResult = ResolveSuccess | ResolveUnresolved;

/**
 * (setCode, number) → CardCandidate 역인덱스.
 * setCode = null 인 RegionCard 는 인덱스에 포함하지 않는다(매칭 불확실).
 */
export type SetNumberIndex = Map<string, CardCandidate[]>;

/**
 * CardCandidate 배열로 (setCode|number) → 후보 역인덱스를 만든다.
 * 같은 키에 복수 후보가 있으면 모두 담는다(호출부가 gameCardId 통일로 dedup).
 */
export function buildSetNumberIndex(pool: ReadonlyArray<CardCandidate>): SetNumberIndex {
  const idx: SetNumberIndex = new Map();
  for (const card of pool) {
    for (const p of card.printings) {
      if (!p.setCode) continue; // setCode null → 인덱스 제외
      const key = `${p.setCode}|${p.number}`;
      const arr = idx.get(key);
      if (arr) arr.push(card);
      else idx.set(key, [card]);
    }
  }
  return idx;
}

/**
 * 한 레시피 참조(RecipeCardRef)를 canonical gameCardId + 생존자 Card.id 로 해석한다.
 *
 * 해석 우선순위:
 *   1) cardId → pool 직접 조회(가장 정확, 이미 연결된 카드)
 *   2) setCode + number → setNumberIndex 역매핑(cardId 미백필 행 보강)
 *   3) 어느 쪽도 실패 → UNRESOLVED(사유 코드 포함)
 *
 * @param ref         DeckRecipeCard 한 행
 * @param poolById    Card.id → CardCandidate 맵 (cardId 경로)
 * @param snIdx       (setCode|number) → CardCandidate[] 맵 (setCode 경로)
 */
export function resolveRecipeCard(
  ref: RecipeCardRef,
  poolById: ReadonlyMap<string, CardCandidate>,
  snIdx: SetNumberIndex,
): ResolveResult {
  // ── 경로 1: cardId 직접 조회 ──────────────────────────────────────────────
  if (ref.cardId) {
    const card = poolById.get(ref.cardId);
    if (!card) {
      return { status: "unresolved", reason: "cardid_not_in_pool", ref };
    }
    if (!card.gameCardId) {
      return { status: "unresolved", reason: "no_gamecardid", ref };
    }
    return {
      status: "resolved",
      gameCardId: card.gameCardId,
      survivorCardId: pickSurvivor(card),
      inputCardId: ref.cardId,
    };
  }

  // ── 경로 2: setCode + number 역매핑 ──────────────────────────────────────
  if (ref.setCode && ref.number) {
    const key = `${ref.setCode}|${ref.number}`;
    const candidates = snIdx.get(key);
    if (!candidates || candidates.length === 0) {
      return { status: "unresolved", reason: "setcode_no_match", ref };
    }
    // 복수 후보일 때 gameCardId 로 dedup: 모두 동일 gameCardId 이면 신뢰, 다르면 UNRESOLVED.
    const card = pickUnambiguousCandidate(candidates);
    if (!card) {
      // gameCardId 가 서로 달라 모호 → 추측 금지
      return { status: "unresolved", reason: "setcode_no_match", ref };
    }
    if (!card.gameCardId) {
      return { status: "unresolved", reason: "no_gamecardid", ref };
    }
    return {
      status: "resolved",
      gameCardId: card.gameCardId,
      survivorCardId: pickSurvivor(card),
      inputCardId: card.id,
    };
  }

  // ── 경로 3: 참조 정보 부족 ───────────────────────────────────────────────
  return { status: "unresolved", reason: "no_cardid_no_setcode", ref };
}

/**
 * collapse 후 생존자 Card.id.
 * artCardId === id 이면 이 Card 가 그룹 대표 → 자기 id 가 생존자.
 * artCardId 가 다른 id 이면 그 id 가 대표(생존자).
 * artCardId null(build-art-groups 미실행) → 자기 id 로 무회귀.
 */
function pickSurvivor(card: CardCandidate): string {
  if (!card.artCardId) return card.id; // build-art-groups 미실행 → 자기 id
  return card.artCardId; // artCardId = 그룹 대표 id
}

/**
 * 복수 후보 중 모호하지 않은 1개를 선택.
 * 모든 후보의 gameCardId 가 동일하면 생존자(artCardId=id) 우선 픽, 없으면 첫 번째.
 * gameCardId 가 서로 다르면 null(= 모호, 추측 금지).
 */
function pickUnambiguousCandidate(candidates: CardCandidate[]): CardCandidate | null {
  if (candidates.length === 1) return candidates[0];

  // gameCardId 다양성 검사
  const gcIds = new Set(candidates.map((c) => c.gameCardId));
  if (gcIds.size === 1 && gcIds.has(null)) return null; // 전부 gameCardId=null → Set{null}이라 size===1이지만 무의미, null 반환
  if (gcIds.size > 1) return null; // gameCardId 가 서로 다름 → 모호

  // 모두 동일 gameCardId → 생존자(artCardId===id) 우선
  const survivor = candidates.find((c) => !c.artCardId || c.artCardId === c.id);
  return survivor ?? candidates[0];
}

/**
 * 덱 레시피 전체 배치 처리.
 * 입력: RecipeCardRef[] + pool(전 Card 배열).
 * 출력: resolved / unresolved 분리 + 요약 통계.
 */
export function resolveRecipeCards(
  refs: ReadonlyArray<RecipeCardRef>,
  pool: ReadonlyArray<CardCandidate>,
): {
  resolved: ResolveSuccess[];
  unresolved: ResolveUnresolved[];
  /** resolved / total */
  resolveRate: number;
  /** 사유 코드별 미해결 카운트 */
  unresolvedByReason: Record<ResolveUnresolved["reason"], number>;
} {
  const poolById = new Map(pool.map((c) => [c.id, c]));
  const snIdx = buildSetNumberIndex(pool);

  const resolved: ResolveSuccess[] = [];
  const unresolved: ResolveUnresolved[] = [];
  const unresolvedByReason: Record<ResolveUnresolved["reason"], number> = {
    no_cardid_no_setcode: 0,
    cardid_not_in_pool: 0,
    setcode_no_match: 0,
    no_gamecardid: 0,
  };

  for (const ref of refs) {
    const result = resolveRecipeCard(ref, poolById, snIdx);
    if (result.status === "resolved") {
      resolved.push(result);
    } else {
      unresolved.push(result);
      unresolvedByReason[result.reason]++;
    }
  }

  const total = refs.length;
  return {
    resolved,
    unresolved,
    resolveRate: total === 0 ? 1 : resolved.length / total,
    unresolvedByReason,
  };
}

/**
 * 채용률 diff0 검증용 — collapse 전후 gameCardId 기준 채용률 합이 동일한지 확인.
 *
 * 입력: collapse 전 리졸브 결과(resolved[]) + 각 행의 adoptionRate.
 * 출력: gameCardId 별 채용률 합 맵.
 * 같은 gameCardId 에 여러 인쇄판이 있으면 adoptionRate 를 합산하되 Math.min(100) 으로 100% 초과 방지(cardgame.ts 폴백 경로 동일).
 *
 * diff0 게이트: collapse 전 맵 === collapse 후 맵 이어야 한다(단위테스트 또는 gate-fk 보조).
 */
export function computeAdoptionByGameCard(
  rows: ReadonlyArray<ResolveSuccess & { adoptionRate: number }>,
): Map<string, number> {
  const map = new Map<string, number>();
  for (const r of rows) {
    const cur = map.get(r.gameCardId) ?? 0;
    map.set(r.gameCardId, Math.min(100, cur + r.adoptionRate));
  }
  return map;
}
