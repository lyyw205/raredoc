/**
 * 공용 검색 정규화/매칭 — 모든 검색 표면(도감 카드·팩명 등)이 동일 로직을 쓰도록.
 *
 * 목표: 입력 언어/표기(전각·반각, 대소문자, 하이픈·슬래시·중점 등)에 무관하게
 *       해당 종(species)의 카드/팩이 매칭된다. 예) "피카츄"/"pikachu"/"ピカチュウ" → 같은 결과.
 *
 * 설계:
 *   - normalizeSearch(): 입력어와 인덱스 양쪽에 동일 적용하는 정규형 변환.
 *   - buildSearchText(): 한 엔티티의 다국어 이름들을 정규화·결합한 검색 인덱스.
 *   - matchesSearch(): 인덱스가 쿼리의 모든 토큰(AND)을 포함하는지.
 */

/**
 * NFKC(전각↔반각 통일) + 소문자 + 공백/기호/중점 표준화.
 * 입력어·인덱스 양쪽에 동일 적용해야 매칭이 성립한다.
 *   - NFKC: ＧＸ→GX, 전각 공백/숫자/라틴을 반각으로.
 *   - 중점(・ U+30FB / · U+00B7 / ･ U+FF65) → 공백.
 *   - 하이픈/언더바/슬래시/앰퍼샌드/마침표/쉼표 → 공백(예: "Pikachu-ex" ↔ "Pikachu ex").
 */
export function normalizeSearch(input: string | null | undefined): string {
  if (!input) return "";
  return input
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[・·･]/g, " ")
    .replace(/[-_/&.,]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * 여러 이름 조각을 정규화·결합해 검색 인덱스 문자열 생성.
 * 중복 정규형은 제거(인덱스 비대화 방지). 빈 조각은 무시.
 * 예) buildSearchText([jaName, koName, enName, nameKo]) → "ピカチュウ pikachu 피카츄"(정규형)
 */
export function buildSearchText(parts: Array<string | null | undefined>): string {
  const seen = new Set<string>();
  for (const p of parts) {
    const n = normalizeSearch(p);
    if (n) seen.add(n);
  }
  return [...seen].join(" ");
}

/**
 * 인덱스가 쿼리의 모든 토큰을 포함하는지(AND 매칭). 빈 쿼리는 항상 true.
 * 인덱스(searchText)도 한 번 더 정규화한다 — buildSearchText 결과면 멱등(추가비용 무시),
 * 원본 이름(예: c.name 폴백)을 넘겨도 안전하게 동작.
 */
export function matchesSearch(searchText: string, query: string): boolean {
  const q = normalizeSearch(query);
  if (!q) return true;
  const idx = normalizeSearch(searchText);
  return q.split(" ").every((tok) => idx.includes(tok));
}
