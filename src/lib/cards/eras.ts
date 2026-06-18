// 카드 도감 사이드바의 카드팩 카테고리(시리즈) 정렬·라벨 단일 출처.
// JP(일본) 발매 기준 연대순(신→구). 상세 매핑 근거는 docs/design/card-packs-jp-en-guide.md.
//
// - ERA_ORDER:  카테고리(canonical era) 노출 순서 (신→구)
// - ERA_LABEL:  사이드바/헤더 표시 라벨 (한글 병기)
// - canonEra(): DB 의 raw CardPack.era → canonical era 로 정규화
//               (예: "XY (컨셉팩)"·"XY-SP" → "XY", "L (레전드)" → "LEGEND")

export const ERA_ORDER = [
  "MEGA",
  "SV",
  "S",
  "SM",
  "XY",
  "BW",
  "HGSS",
  "LEGEND",
  "Pt",
  "DP",
  "PCG",
  "ADV",
  "e-Card",
  "web",
  "VS",
  "NEO",
  "BASE",
] as const;

export type EraKey = (typeof ERA_ORDER)[number];

export const ERA_LABEL: Record<string, string> = {
  MEGA: "MEGA (메가신화)",
  SV: "SV (스칼렛 & 바이올렛)",
  S: "S (소드 & 실드)",
  SM: "SM (썬 & 문)",
  XY: "XY (엑스 & 와이)",
  BW: "BW (블랙 & 화이트)",
  HGSS: "HGSS (하트골드 & 소울실버)",
  LEGEND: "LEGEND (레전드)",
  Pt: "Pt (플래티넘)",
  DP: "DP (다이아몬드 & 펄)",
  PCG: "PCG (플레이어즈)",
  ADV: "ADV (루비 & 사파이어)",
  "e-Card": "e-Card (포켓몬카드 e)",
  web: "web (포켓몬카드 web)",
  VS: "VS (포켓몬카드 VS)",
  NEO: "NEO (네오·금은)",
  BASE: "Base Set (구판)",
};

// DB raw era → canonical era. 미등록 값은 그대로 통과(폴백).
const CANON: Record<string, EraKey> = {
  MEGA: "MEGA",
  "MEGA-SP": "MEGA",
  SV: "SV",
  "SV-SP": "SV",
  "S (소드·실드)": "S",
  "S-SP": "S",
  "SM (썬·문)": "SM",
  "SM-SP": "SM",
  XY: "XY",
  "XY (컨셉팩)": "XY",
  "XY-SP": "XY",
  BW: "BW",
  "BW-SP": "BW",
  HGSS: "HGSS",
  "L (레전드)": "LEGEND",
  Pt: "Pt",
  DP: "DP",
  "DP-SP": "DP",
  PCG: "PCG",
  "ADV (루비·사파이어)": "ADV",
  e카드: "e-Card",
  web: "web",
  VS: "VS",
  네오: "NEO",
  구판: "BASE",
};

export function canonEra(raw: string): string {
  return CANON[raw] ?? raw;
}

export function eraLabel(canon: string): string {
  return ERA_LABEL[canon] ?? canon;
}

/** "SV (스칼렛 & 바이올렛)" → { code: "SV", name: "스칼렛 & 바이올렛" }. 괄호 라벨 없으면 name=null. */
export function eraParts(canon: string): { code: string; name: string | null } {
  const full = ERA_LABEL[canon] ?? canon;
  const m = full.match(/^(.+?) \((.+)\)$/);
  return m ? { code: m[1], name: m[2] } : { code: full, name: null };
}

/** ERA_ORDER 내 인덱스(노출 순서). 미등록은 맨 뒤. */
export function eraOrderIndex(canon: string): number {
  const i = (ERA_ORDER as readonly string[]).indexOf(canon);
  return i === -1 ? ERA_ORDER.length : i;
}
