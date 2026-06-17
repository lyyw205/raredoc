/**
 * KRW 만/억 축약 표기 공용 단일출처(클라/서버 공용, 순수 함수).
 *
 * 호출부마다 표기가 미세하게 달라(억 분기 유무·접미사 '만'/'만원'·만단위 반올림 규칙·null 표기)
 * 각 차이를 옵션으로 정확히 매핑해 출력 1글자도 바뀌지 않게 한다.
 *
 *  - eok=true  → 1억 이상은 "N.N억원"으로, 만단위는 항상 정수 반올림 + ko-KR 천단위(시세 피드 톤).
 *  - eok=false → 만단위는 100 미만이면 소수 1자리, 100 이상이면 정수 반올림(덱 견적 톤).
 *  - suffix    → 만단위 접미사. '만원'(기본) 또는 '만'.
 *  - emptyDash → null 입력을 "—" 로(견적 전 표시). 기본은 빈 분기 없이 0 취급 안 함(아래 주석 참조).
 *
 * 1만 미만은 항상 "N원"(천단위 구분). eok 모드만 원 단위에도 ko-KR 로케일을 명시한다.
 */
export function formatKrwShort(
  value: number | null,
  opts?: { suffix?: "만" | "만원"; eok?: boolean; emptyDash?: boolean }
): string {
  const suffix = opts?.suffix ?? "만원";
  if (value == null) return opts?.emptyDash ? "—" : "";

  if (opts?.eok) {
    if (value >= 100_000_000) {
      return `${(value / 100_000_000).toFixed(1)}억원`;
    }
    if (value >= 10_000) {
      return `${Math.round(value / 10_000).toLocaleString("ko-KR")}${suffix}`;
    }
    return `${value.toLocaleString("ko-KR")}원`;
  }

  if (value >= 10_000) {
    const man = value / 10_000;
    return `${man >= 100 ? Math.round(man).toLocaleString() : man.toFixed(1)}${suffix}`;
  }
  return `${value.toLocaleString()}원`;
}
