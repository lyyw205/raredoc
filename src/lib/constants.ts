// RARITY_ORDER 는 Rarity.tier(0~9) 기반 정렬로 대체됨. 정렬 헬퍼: `@/lib/cards/rarity`.

export const RARITY_KO: Record<string, string> = {
  Common: "커먼",
  Uncommon: "언커먼",
  Rare: "레어",
  "Rare Holo": "레어 홀로",
  "Rare Holo EX": "레어 홀로 EX",
  "Rare Holo GX": "레어 홀로 GX",
  "Rare Holo V": "레어 홀로 V",
  "Rare Holo VMAX": "레어 홀로 VMAX",
  "Rare Holo VSTAR": "레어 홀로 VSTAR",
  "Rare Ultra": "울트라 레어",
  "Rare Rainbow": "레인보우 레어",
  "Rare Secret": "시크릿 레어",
  "Amazing Rare": "어메이징 레어",
  "Illustration Rare": "일러스트 레어",
  "Special Illustration Rare": "스페셜 일러스트 레어",
  "Hyper Rare": "하이퍼 레어",
};

export const SERIES_KO: Record<string, string> = {
  "Mega Evolution": "메가 에볼루션",
  "Scarlet & Violet": "스칼렛 & 바이올렛",
  "Sword & Shield": "소드 & 실드",
  "Sun & Moon": "썬 & 문",
  XY: "XY",
  "Black & White": "블랙 & 화이트",
  HeartGold: "하트골드 & 소울실버",
  Platinum: "플래티넘",
  "Diamond & Pearl": "다이아몬드 & 펄",
  EX: "EX 시리즈",
  "Neo Genesis": "네오",
  Base: "베이스",
  Other: "기타",
};

export const TIER_LABELS: Record<string, string> = {
  S: "S — 최상위 투자가치",
  A: "A — 높은 투자가치",
  B: "B — 보통",
  C: "C — 관망",
  D: "D — 비추천",
};

export const TIER_COLORS: Record<string, string> = {
  S: "bg-yellow-400 text-yellow-900",
  A: "bg-orange-400 text-orange-900",
  B: "bg-blue-400 text-blue-900",
  C: "bg-gray-400 text-gray-900",
  D: "bg-red-400 text-red-900",
};
