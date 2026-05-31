/**
 * Phase 5 — 카드게임 메타 외부 수집 파이프라인 (스텁).
 *
 * 실행: npm run sync:meta
 *
 * ⚠️ 현재 외부 크롤링은 **승인 대기 중**이라 실제 네트워크 호출은 하지 않는다.
 *    승인 후 디시인사이드 포켓몬 카드 갤러리 / 일본 まとめ(まとめ 사이트)에서
 *    덱 메타·대회 결과·사용률을 수집해 DeckArchetype/Tournament/ArchetypeTrend 에
 *    upsert 하도록 구현한다.
 *    검증된 출처 카탈로그: memory/reference_pokemon_tcg_sites.md 참고.
 *
 * TODO(승인 후):
 *   1) 출처별 fetcher 작성 (rate-limit·캐싱 준수, robots.txt 확인)
 *   2) 파싱 → 정규화 → upsert (seed-cardgame.ts 의 멱등 패턴 재사용)
 *   3) ArchetypeTrend 주차 누적 / Tournament 신규 결과 반영
 */
function main() {
  console.log("[sync:meta] 외부 크롤링은 승인 대기 중입니다. 실제 수집을 수행하지 않습니다.");
  console.log("[sync:meta] 승인 후 디시/일본 まとめ 수집 구현 예정 — memory/reference_pokemon_tcg_sites.md 참고.");
  console.log("[sync:meta] 현재 메타 데이터는 `npm run seed:cardgame` 로 mock 을 적재해 사용하세요.");
}

main();
