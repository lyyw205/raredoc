/**
 * 덱리스트 → canonical gameCardId 리졸버 feature flag.
 *
 * 기본 OFF — 점등(DECKLIST_GAMECARD_RESOLVER=1) 시 채용률·시세·역링크 숫자가
 * gameCardId 기준으로 통일되어 변동함(의도된 정확도 개선).
 *
 * DB 쓰기 없음(읽기 경로 배선만).
 * DeckRecipeCard.cardId 실제 재바인드(생존자 UPDATE)는 P5 트랜잭션 소관 — 여기선 하지 않음.
 */
export const USE_GAMECARD_RESOLVER =
  process.env.DECKLIST_GAMECARD_RESOLVER === "1";
