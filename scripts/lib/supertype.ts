/** 공통 supertype 헬퍼 — scripts 전역 정본. */

export const POKE = ["Pokémon", "Pokemon"] as const;
export const isPokemonSupertype = (s?: string | null): boolean =>
  (POKE as readonly string[]).includes(s ?? "");

/** tcgdex/공식 카테고리 문자열('Pokemon'/'Trainer'/'Energy')을 DB supertype 으로 정규화. */
export const supertypeOf = (c?: string) =>
  c === "Pokemon" ? "Pokémon" : c === "Trainer" ? "Trainer" : c === "Energy" ? "Energy" : null;
