/**
 * 카드 표시값 공용 헬퍼 — 여러 쿼리/액션/페이지가 동일한 표현식을 인라인으로 중복해 사용하던 것을 추출.
 * 런타임 결과는 기존 인라인 삼항과 100% 동일하다.
 */

/**
 * region별 rarity 표시 라벨 — JP는 일본어명, KR은 한국어명, 그 외 영어명 우선, 모두 code로 폴백.
 */
export function pickRarityLabel(
  region: string,
  r:
    | {
        nameJa?: string | null;
        nameEn?: string | null;
        nameKo?: string | null;
        code?: string | null;
      }
    | null
    | undefined
): string | undefined {
  if (region === "JP") return r?.nameJa ?? r?.nameEn ?? r?.code ?? undefined;
  if (region === "KR") return r?.nameKo ?? r?.nameEn ?? r?.code ?? undefined;
  return r?.nameEn ?? r?.code ?? undefined;
}

