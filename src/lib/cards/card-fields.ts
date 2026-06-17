/**
 * 카드 표시값 공용 헬퍼 — 여러 쿼리/액션/페이지가 동일한 표현식을 인라인으로 중복해 사용하던 것을 추출.
 * 런타임 결과는 기존 인라인 삼항과 100% 동일하다.
 */
import type { Region } from "./dex-region";

/** 지역 표시순 배열(JP-first) — 지역탭/팩목록 순회·필터 공용. */
export const REGION_ORDER: Region[] = ["JP", "EN", "KR"];

/** 지역 정렬 우선순위 맵(EN-first) — variants 정렬용. ★배열 REGION_ORDER 와 의미가 다름. */
export const REGION_SORT_PRIORITY: Record<string, number> = { EN: 0, JP: 1, KR: 2 };

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

/**
 * 카드 subtype(영문값) → 한글 라벨. 단계·특수타입·트레이너 종류·에너지 종류를 한 사전으로 커버.
 */
export const SUBTYPE_KO: Record<string, string> = {
  Basic: "기본", "Stage 1": "1진화", "Stage 2": "2진화",
  "Mega Evolution": "메가진화", MEGA: "메가진화", "Level-Up": "레벨업", BREAK: "BREAK",
  Restored: "복원", Baby: "베이비", "V-UNION": "V-UNION",
  ex: "ex", EX: "EX", V: "V", VMAX: "VMAX", VSTAR: "VSTAR", GX: "GX",
  "TAG TEAM": "태그팀", SP: "SP", Tera: "테라", Radiant: "카가야쿠", "Prism Star": "프리즘스타",
  "Single Strike": "일격", "Rapid Strike": "연격", "Fusion Strike": "퓨전", "ACE SPEC": "ACE SPEC",
  "Ultra Beast": "울트라비스트", Prime: "프라임", LEGEND: "레전드",
  Item: "아이템", Supporter: "서포트", Stadium: "스타디움",
  "Pokémon Tool": "포켓몬의 도구", Tool: "포켓몬의 도구", "Technical Machine": "기술머신",
  "Rocket's Secret Machine": "로켓단 비밀머신", "Goldenrod Game Corner": "코가네 게임코너",
  Special: "특수 에너지", "Basic Energy": "기본 에너지",
};

/** 카드 supertype(영문값) → 한글 라벨. 알 수 없는 값은 원문 그대로. */
export function supertypeKo(s: string): string {
  switch (s) {
    case "Pokémon": return "포켓몬";
    case "Trainer": return "트레이너";
    case "Energy": return "에너지";
    default: return s;
  }
}

/** 카드 포맷(레귤레이션 사용범위) → 한글 라벨. */
export const FORMAT_LABEL: Record<string, string> = {
  standard: "스탠다드", expanded: "익스텐디드", unlimited: "언리미티드",
};

/** 지역(region) → 카드판 풀라벨. dex/cards 카드판 탭·라벨 공용. */
export const REGION_LABEL: Record<string, string> = {
  JP: "일본판", EN: "영문판", KR: "한국판",
};

