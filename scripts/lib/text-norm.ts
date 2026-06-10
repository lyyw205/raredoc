/**
 * 공통 문자열 정규화 헬퍼.
 *
 * ★변형별 정확 분리 — 런타임 동작(문자열 매칭 결과) 변경 금지:
 *   normLower : trim + 소문자 (공백 보존). (s ?? "") — null/undefined → ""
 *   normSpace : 소문자 + 공백접기 + trim.   (s || "")  — null/undefined/falsy → ""
 *
 * ⚠ (s||"") vs (s??"") 는 타입상 다름(??는 null/undefined만 대체, ||는 falsy 전체).
 *    호출처 본문과 글자단위 동일한 헬퍼로만 교체할 것.
 */

/** trim + 소문자. `(s ?? "")` 변형 — null/undefined → "". */
export const normLower = (s: string | null | undefined): string =>
  (s ?? "").trim().toLowerCase();

/** 소문자 + 공백접기(\s+→" ") + trim. `(s || "")` 변형 — falsy → "". */
export const normSpace = (s: any): string =>
  (s || "").toLowerCase().replace(/\s+/g, " ").trim();
