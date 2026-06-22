// 형제(다른 지역판) 선택 — 단일 결정성 리졸버 (표시 전용)
//
// 설계 근거: docs/migration/identity-model-migration-plan.md §0′ (D3, 2026-06-22).
// 한 실물(RegionCard)을 클릭했을 때, 그 카드가 속한 "같은 그림(ArtCard)" 안에서
// 대상 지역(EN/JP/KR)별로 보여줄 형제 1장을 결정한다.
//
//   후보풀 = (호출부가 넘긴) 같은 그림의 locale 들 중 region == 대상지역
//     · ArtCard 병합 전: 현 Card.id 의 locales(card.locales) 1:1 = per-pack
//     · 병합 후: artCard.locales = cross-pack (같은 함수 그대로 확장)
//   비면 → { unavailable: true } ("이 지역 미발매"). 다른 그림에서 빌리지 않는다.
//   Tier-A(정확 트윈) = 후보 중 Set 이 anchor 의 Set 과 같은 CardPackLink wave(twinSetIds)
//     · MERGE_N_TO_1 이면 단수 아님. 비면 Tier-B(후보 전체).
//   tie-break(순서 고정): ① 이미지有 > ② 역할(ANCHOR/NATIVE>그외)
//     > ③ |Set.releaseDate − anchor.releaseDate| 최소(=클릭카드에 최근접, '최초' 아님)
//     > ④ number 오름차순(비시크릿 우선) > ⑤ 안정 id
//   날짜 ≤ 1996-01-01(=1970 센티넬 포함)은 '불명' 취급 → ③ 건너뜀.
//
// ★시세(getCardPrices/deck-pricing)는 이 리졸버를 절대 사용하지 않는다(D5).
//   엉뚱한 팩 가격은 오해를 부른다. 가격은 자기 RegionCard/ArtCard 전체로 따로 집계.
//
// 순수 함수 — DB·prisma 비의존. 호출부가 plain 객체 배열을 만들어 넘긴다(테스트 용이).

export type Region = "EN" | "JP" | "KR";

/** 리졸버 입력 1행 — RegionCard + 그 Set/역할 정보를 평탄화한 형태. */
export interface SiblingCandidate {
  /** RegionCard.id (URL·식별용) */
  id: string;
  /** "EN" | "JP" | "KR" (RegionCard.region) */
  region: string;
  /** RegionCard.setId */
  setId: string;
  /** Set.releaseDate. Date | ISO 문자열 | epoch(ms) | null 허용. */
  releaseDate: Date | string | number | null;
  /** 이미지 존재 여부 (imageLarge || imageSmall) */
  hasImage: boolean;
  /** CardPackLink.role (ANCHOR|NATIVE|MIRROR|…). 모르면 생략. */
  role?: string | null;
  /** RegionCard.numberInt (정렬용, 없으면 number 에서 추출) */
  numberInt?: number | null;
  /** RegionCard.number (원문) */
  number?: string | null;
  /** Card.gameCardId — 풀을 넓게 받았을 때의 방어용 가드(선택). */
  gameCardId?: string | null;
}

export interface ResolveOpts {
  /** anchor 의 Set 과 같은 CardPackLink wave 에 속한 setId 집합(Tier-A). 호출부가 계산. */
  twinSetIds?: ReadonlySet<string>;
  /**
   * 지정 시, gameCardId 가 이와 "명시적으로 다른" 후보는 제외(다른 그림 혼입 방지).
   * 풀을 같은 Card.id 로 좁혀 받으면 불필요(생략).
   */
  anchorGameCardId?: string | null;
}

export type SiblingPick = SiblingCandidate | { unavailable: true };

/** 1970/플레이스홀더 발매일 컷오프 — 포켓몬 TCG 개시(1996-10) 이전은 '불명'으로 본다. */
export const RELEASE_DATE_SENTINEL_CUTOFF_MS = Date.UTC(1996, 0, 1);

export function isUnavailable(pick: SiblingPick): pick is { unavailable: true } {
  return (pick as { unavailable?: true }).unavailable === true;
}

function toEpoch(d: Date | string | number | null | undefined): number | null {
  if (d == null) return null;
  if (d instanceof Date) {
    const t = d.getTime();
    return Number.isNaN(t) ? null : t;
  }
  if (typeof d === "number") return Number.isNaN(d) ? null : d;
  const t = Date.parse(d);
  return Number.isNaN(t) ? null : t;
}

/** 알려진(=신뢰 가능한) 발매일인가. null·센티넬(≤1996-01-01)은 false. */
function isKnownReleaseMs(ms: number | null): ms is number {
  return ms != null && ms > RELEASE_DATE_SENTINEL_CUTOFF_MS;
}

function roleRank(role: string | null | undefined): number {
  return role === "ANCHOR" || role === "NATIVE" ? 0 : 1;
}

function numberRank(c: SiblingCandidate): number {
  if (c.numberInt != null) return c.numberInt;
  if (c.number) {
    const m = c.number.match(/\d+/);
    if (m) return Number(m[0]);
  }
  return Number.POSITIVE_INFINITY;
}

/**
 * 대상 지역 1곳의 형제를 고른다. 후보가 없으면 { unavailable: true }.
 * candidates 는 anchor 가 속한 "같은 그림"의 전체 locale(anchor 자신 포함 가능).
 */
export function pickSiblingForRegion(
  anchor: SiblingCandidate,
  candidates: readonly SiblingCandidate[],
  targetRegion: string,
  opts: ResolveOpts = {},
): SiblingPick {
  const { twinSetIds, anchorGameCardId } = opts;

  // 1) 후보풀: 대상 지역 + (가드 시) 같은 gameCard
  let pool = candidates.filter((c) => c.region === targetRegion);
  if (anchorGameCardId != null) {
    pool = pool.filter((c) => c.gameCardId == null || c.gameCardId === anchorGameCardId);
  }
  if (pool.length === 0) return { unavailable: true };

  // 2) Tier-A(정확 트윈) → 비면 Tier-B(전체)
  let tier = pool;
  if (twinSetIds && twinSetIds.size > 0) {
    const tierA = pool.filter((c) => twinSetIds.has(c.setId));
    if (tierA.length > 0) tier = tierA;
  }

  // 3) tie-break
  const anchorMs = toEpoch(anchor.releaseDate);
  const anchorDateKnown = isKnownReleaseMs(anchorMs);
  const dateDist = (c: SiblingCandidate): number => {
    if (!anchorDateKnown) return 0; // anchor 불명 → 날짜 키 무력(모두 동률)
    const ms = toEpoch(c.releaseDate);
    return isKnownReleaseMs(ms) ? Math.abs(ms - anchorMs) : Number.POSITIVE_INFINITY;
  };

  const sorted = [...tier].sort(
    (a, b) =>
      (b.hasImage ? 1 : 0) - (a.hasImage ? 1 : 0) || // ① 이미지有 우선
      roleRank(a.role) - roleRank(b.role) || // ② 역할
      dateDist(a) - dateDist(b) || // ③ 클릭카드에 최근접 발매일
      numberRank(a) - numberRank(b) || // ④ 낮은 번호(비시크릿) 우선
      a.id.localeCompare(b.id), // ⑤ 안정 id
  );
  return sorted[0];
}

/**
 * anchor 클릭 시, 요청 지역들의 형제 맵을 만든다.
 * anchor 자신의 지역은 anchor 를 그대로 대표로 둔다.
 */
export function resolveSiblings(
  anchor: SiblingCandidate,
  candidates: readonly SiblingCandidate[],
  opts: ResolveOpts = {},
  regions: readonly Region[] = ["EN", "JP", "KR"],
): Record<Region, SiblingPick> {
  const out = {} as Record<Region, SiblingPick>;
  for (const r of regions) {
    out[r] = r === anchor.region ? anchor : pickSiblingForRegion(anchor, candidates, r, opts);
  }
  return out;
}
