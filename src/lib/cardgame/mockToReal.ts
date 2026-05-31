// mock 카드게임 ID → 실제 pokemontcg.io 카드 ID 매핑.
// 카드 상세 리다이렉트(`cardgame/cards/[id]/page.tsx`)와 시드/서비스에서 공유한다.
// 매핑이 없는 가상 카드는 mock id 를 그대로 사용하며, 표시 데이터는 mock CARDS 로 폴백한다.
export const MOCK_TO_REAL: Record<string, string> = {
  "sv8-180": "sv8pt5-76", // 잠만보 ex → Snorlax ex (Prismatic Evolutions)
  "sv1-198": "sv4pt5-234", // 리자몽 ex → Charizard ex (Paldean Fates)
  "sv3pt5-200": "sv3pt5-199", // 리자몽 ex → Charizard ex (151)
  "sv3pt5-205": "sv3pt5-205", // 뮤 ex → Mew ex (151) — 동일 ID
  "sv3pt5-207": "me2pt5-281", // 뮤츠 ex → (Team Rocket's) Mewtwo ex
  "sv3pt5-215": "me2pt5-277", // 피카츄 ex → Pikachu ex (Ascended Heroes)
  "sv4pt5-182": "svp-178", // 가이오가 ex → Kyogre ex (SV Promos)
  "sv4pt5-191": "sv4pt5-54", // 리자몽 ex → Charizard ex (Paldean Fates)
  "m5-120": "me2pt5-160", // 드라파르트 ex → Dragapult ex (Ascended Heroes)
  "m5-007": "swsh11-216", // 다크파치 → Dark Patch (Lost Origin)
  // 실제 대응 카드 없음(가상 카드): sv4pt5-176 아마루르가 ex, m5-118 메가다크라이 ex,
  //   m5-061 부스터에너지, m5-055 마니아 → mock 폴백 표시
};

/** 실제 pokemontcg id → mock id 역매핑 (mock 폴백 표시용). */
export const REAL_TO_MOCK: Record<string, string> = Object.fromEntries(
  Object.entries(MOCK_TO_REAL).map(([mock, real]) => [real, mock])
);
