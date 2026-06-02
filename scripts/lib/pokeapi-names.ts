/**
 * PokeAPI 표준 포켓몬 이름 매핑표 (단일 출처).
 *
 * 도감번호(national dex) → 다국어 종(species) 이름. 이 레포의 "표준 이름 매핑표"이며,
 * 앞으로 KR/JP/EN 종 이름이 필요한 모든 스크립트는 pokeapi.co 라이브 API 대신 이 로더를 쓴다.
 *
 * 데이터: data/pokeapi/*.csv (PokeAPI/pokeapi 의 data/v2/csv 에서 클론, 커밋 핀: data/pokeapi/.pinned-commit)
 *   - pokemon_species_names.csv : (species_id, language_id, name, genus)
 *   - languages.csv             : (id, iso639, iso3166, identifier, ...)  language_id → 코드
 *   - pokemon_species.csv       : (id, identifier, ...)  dex# → slug
 * 갱신: npx tsx scripts/refresh-pokeapi-names.ts  (docs 참고)
 *
 * 언어 키는 PokeAPI identifier 를 그대로 쓴다:
 *   ko = 한국어, ja-hrkt = 일본어 카타카나(TCG 표준 일본명), en = 영어, ja = 일본어 한자표기 등.
 * 앱은 보통 "ko" | "ja" | "en" 만 쓰므로 편의 접근자(ko/ja/en)를 제공한다(ja = ja-hrkt 카타카나).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

const DATA_DIR = join(process.cwd(), "data", "pokeapi");

/** 따옴표를 인식하는 최소 CSV 한 줄 파서. */
function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; } // escaped quote
        else inQuotes = false;
      } else cur += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

/** 헤더 포함 CSV 를 객체 배열로. */
function readCsv(file: string): Record<string, string>[] {
  const text = readFileSync(join(DATA_DIR, file), "utf8");
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
  const header = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const cells = parseCsvLine(line);
    const row: Record<string, string> = {};
    header.forEach((h, i) => (row[h] = cells[i] ?? ""));
    return row;
  });
}

export type DexNames = {
  dex: number;
  /** PokeAPI slug, 예: "bulbasaur" */
  slug: string;
  /** 한국어 (language id 3) */
  ko?: string;
  /** 일본어 카타카나 = TCG 표준 일본명 (language id 1, ja-hrkt) */
  ja?: string;
  /** 영어 (language id 9) */
  en?: string;
  /** identifier(언어코드) → 이름 전체 매핑 */
  all: Record<string, string>;
  /** identifier(언어코드) → 분류(genus), 예: ko "씨앗포켓몬" */
  genus: Record<string, string>;
};

let _cache: Map<number, DexNames> | null = null;

/** 표준 매핑표 적재(최초 1회 파싱 후 캐시). */
export function loadPokeapiNames(): Map<number, DexNames> {
  if (_cache) return _cache;

  // language_id → identifier (예: 1→"ja-hrkt", 3→"ko", 9→"en")
  const langById = new Map<string, string>();
  for (const l of readCsv("languages.csv")) langById.set(l.id, l.identifier);

  // dex# → slug
  const slugByDex = new Map<number, string>();
  for (const s of readCsv("pokemon_species.csv")) {
    slugByDex.set(Number(s.id), s.identifier);
  }

  const map = new Map<number, DexNames>();
  for (const row of readCsv("pokemon_species_names.csv")) {
    const dex = Number(row.pokemon_species_id);
    const code = langById.get(row.local_language_id);
    if (!code) continue;
    let entry = map.get(dex);
    if (!entry) {
      entry = { dex, slug: slugByDex.get(dex) ?? "", all: {}, genus: {} };
      map.set(dex, entry);
    }
    entry.all[code] = row.name;
    if (row.genus) entry.genus[code] = row.genus;
    if (code === "ko") entry.ko = row.name;
    else if (code === "ja-hrkt") entry.ja = row.name; // 카타카나 표준 일본명
    else if (code === "en") entry.en = row.name;
  }

  _cache = map;
  return map;
}

/** 도감번호로 이름 1건 조회. lang 기본 "ko". */
export function getName(dex: number, lang: "ko" | "ja" | "en" = "ko"): string | undefined {
  return loadPokeapiNames().get(dex)?.[lang];
}

/** 정규화(공백/구두점 제거 + 소문자) — 이름→도감번호 역索引용. */
function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[\s.'’\-:·・]/g, "");
}

const _nameIdxCache = new Map<string, Map<string, number>>();

/**
 * 이름 → 도감번호 역索引. lang 의 이름을 정규화 키로. 동음이 있으면 첫 항목 유지.
 * KR/JP 카드명에서 종을 역추적할 때 사용. lang 별 1회 빌드 후 캐시.
 */
export function buildNameIndex(lang: "ko" | "ja" | "en" = "ko"): Map<string, number> {
  const cached = _nameIdxCache.get(lang);
  if (cached) return cached;
  const idx = new Map<string, number>();
  for (const e of loadPokeapiNames().values()) {
    const n = e[lang];
    if (!n) continue;
    const key = normalizeName(n);
    if (!idx.has(key)) idx.set(key, e.dex);
  }
  _nameIdxCache.set(lang, idx);
  return idx;
}

/**
 * 카드/종 이름 1건을 도감번호로 해석. 정규화(공백·구두점 제거) 후 역索引 조회.
 * 매칭 실패 시 undefined. 호출측에서 수식어 제거 후보를 만들어 순차 시도하는 용도.
 */
export function resolveDex(name: string, lang: "ko" | "ja" | "en" = "en"): number | undefined {
  return buildNameIndex(lang).get(normalizeName(name));
}

// ─────────────────────────────────────────────────────────────────────────────
// TCG 카드명 → 도감번호(들) 해석 — 수식어(ex/GX/V/Mega/지역폼/소유격/폼명) stripping.
//   resolveCardDexes 가 표준 진입점. fill-pack·audit·backfill 공용.
// ─────────────────────────────────────────────────────────────────────────────

/** 영문 카드명 → 종 후보들(우선순위). base → 지역폼 → 끝단어제거/단어/하이픈 폴백. */
function enCandidates(seg: string): string[] {
  let n = seg.trim();
  n = n.replace(/<[^>]*>/g, "");                 // HTML 잔재
  n = n.replace(/\[[^\]]*\]/g, "");              // "[J]" 등 폼 표기
  n = n.replace(/\s*\([^)]*\)/g, "");            // "(...)" 접미
  n = n.replace(/\s*-\s*\d+\/\d+\s*$/, "");      // " - 100/081" 번호 접미
  n = n.replace(/δ/gi, "").replace(/[★☆◇◆]/g, ""); // 델타·프리즘스타 등 마커(\b 안 통하는 비ASCII)
  n = n.replace(/^[^'’]*['’]s\s+/i, "");         // 소유격 접두(Ethan's 등)
  n = n.replace(/^(Mega|M|Primal|Origin|Dark|Light|Shining|Radiant|Crystal)\s+/i, ""); // 폼/팀 접두
  n = n.replace(/\b(ex|gx|v|vmax|vstar|v-union|break|prime|lv\.?x|star)\b/gi, ""); // 메커니즘 접미
  n = n.replace(/\s+[XY]\b/g, "");               // 메가 X/Y
  n = n.replace(/\s+/g, " ").trim();
  const base = n.toLowerCase();
  const out = new Set<string>();
  out.add(base);
  const forms: Record<string, string> = { hisuian: "hisui", alolan: "alola", galarian: "galar", paldean: "paldea" };
  const words = base.split(" ").filter(Boolean);
  if (words.length >= 2 && forms[words[0]]) {
    out.add(`${words.slice(1).join(" ")}-${forms[words[0]]}`); // growlithe-hisui
    out.add(words.slice(1).join(" "));                          // 지역폼 단어 제거(Galarian Mr. Mime→Mr. Mime)
  }
  if (words.length >= 2) {
    out.add(words.slice(0, -1).join(" "));        // 끝 단어 제거(Mr. Mime E4 / Luxray GL)
    out.add(words[0]); out.add(words[words.length - 1]);
    words.forEach((w) => out.add(w));
  }
  base.split(/[-\s]+/).filter(Boolean).forEach((w) => out.add(w)); // 하이픈 분해(Ash-Greninja-EX)
  return [...out].filter(Boolean);
}

/** 한국어 카드명 → 종 후보들. 원형 우선(메가니움/기가이어스 보호) + 접두제거/단어 폴백. */
function koCandidates(seg: string): string[] {
  let base = seg.trim();
  base = base.replace(/\s*\([^)]*\)/g, "");
  base = base.replace(/\b(ex|gx|v|vmax|vstar|break|lv\.?x)\b/gi, "");
  base = base.replace(/δ/gi, "").replace(/[★☆◇◆]/g, "");
  base = base.replace(/\s+/g, " ").trim();
  const out = new Set<string>();
  out.add(base);                                  // 원형 우선 — "메가니움"·"기가이어스" 같은 실제 종명 보호
  const noXY = base.replace(/\s*[XY]$/i, "").trim();
  if (noXY !== base) out.add(noXY);               // 트레일링 X/Y(메가 변형)
  // 접두 수식어는 "추가 후보"로만(원형이 우선이라 종명 파괴 없음). 공백 유무 모두 대응.
  const prefixes = ["거다이맥스","다이맥스","메가","원시","각성한","각성","빛나는","찬란한","샤이니","알로라","히스이","가라르","팔데아","오리진","백마","흑마","일격","연격"];
  for (const p of prefixes) {
    if (base.startsWith(p) && base.length > p.length) {
      out.add(base.slice(p.length).replace(/^\s+/, "").replace(/\s*[XY]$/i, "").trim());
    }
  }
  const words = base.split(" ").filter(Boolean);
  if (words.length >= 2) { out.add(words[words.length - 1]); out.add(words[0]); words.forEach((w) => out.add(w)); }
  return [...out].filter(Boolean);
}

/**
 * TCG 카드명 → 도감번호 배열. 태그팀("A & B")은 다중 dex. 매칭 0건이면 빈 배열.
 * lang: 카드명 언어("en" 우선 권장, "ko" 폴백).
 */
export function resolveCardDexes(name: string | null | undefined, lang: "en" | "ko" = "en"): number[] {
  if (!name) return [];
  const cands = lang === "ko" ? koCandidates : enCandidates;
  const segs = name.split(/\s*&\s*|\s*\+\s*/).filter(Boolean); // 태그팀/유나이트
  const found: number[] = [];
  for (const seg of segs) {
    for (const c of cands(seg)) { const d = resolveDex(c, lang); if (d) { found.push(d); break; } }
  }
  return [...new Set(found)];
}
