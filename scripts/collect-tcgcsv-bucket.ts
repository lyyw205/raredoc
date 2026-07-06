/**
 * tcgcsv 재판버킷 수집 — TCGplayer 가 한 그룹에 담은 '기존 카드 재판 묶음'을 우리 DB 기존 Card 에 연결.
 *
 * 대상 성격: TT 같은 단일 상품이 아니라, 여러 원본세트의 재판을 TCGplayer 가 한 바구니에 담은 것.
 *   - 대부분 = 우리 DB에 이미 있는 카드의 재판(스탬프/한정판) → 기존 Card 에 연결한 얇은 RegionCard(게임데이터 상속).
 *   - 일부(설정된 연도의 기본에너지 등) = 원본세트 없는 고유 프로모 → 신규 orphan Card + RegionCard.
 *
 * 리졸버(추측 금지·애매하면 UNRESOLVED):
 *   1) tcgcsv Number("019/123"·"DP16"·"189/198") + 이름 내장번호("- 171/182") 파싱, 불일치 플래그.
 *   2) 고유 에너지(denom 없음 + 기본에너지 이름 + cfg.orphanEnergyYears 연도) → ORPHAN.
 *   3) 그 외 → EN RegionCard 에서 numberInt+이름유사 매칭, 복수면 denom↔set.cardCount 로 판별.
 *      0건·복수모호 → UNRESOLVED(수동 검토).
 *   4) 문자접두 번호(DP16·SWSH167)는 번호문자열+이름 폴백.
 *
 * 적재(모두 EN 신규세트 = mapping-lock FREE): Set + RegionCard(재판=cardId 기존, 에너지=신규 orphan)
 *   + ExternalIdMapping(tcgcsv, productId↔RegionCard 직접기록 — 중복번호/불일치로 퍼지 크로스워크 우회).
 *   dry-run 기본, --apply. 멱등(재실행 안전).
 *
 * 입력: tcgcsv 상품 JSON 을 미리 다운로드(<scratchpad>/<setId>-tcgcsv.json):
 *   curl -s -H "User-Agent: Mozilla/5.0" "https://tcgcsv.com/tcgplayer/3/<group>/products" -o <scratchpad>/<setId>-tcgcsv.json
 *
 * 실행:
 *   npx tsx scripts/collect-tcgcsv-bucket.ts --set=ccp            # dry-run(3버킷 표)
 *   npx tsx scripts/collect-tcgcsv-bucket.ts --set=ccp --apply
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import { prisma } from "@/lib/prisma";
import { Logger } from "./lib/price-sync-lib";

const log = new Logger("collect-bucket");
const SP = "/tmp/claude-1000/-home-lyyw205-repos-raredoc/e99f8394-a0d1-4723-8caf-5e59e34dd937/scratchpad";

type SetCfg = {
  setId: string; name: string; series: string; code: string;
  release: string; packType: string; group: number;
  orphanEnergyYears: string[]; // 기본에너지를 고유 프로모로 취급할 연도(대개 [])
  mode?: "reprint" | "orphan"; // reprint(기본)=기존 Card 연결 / orphan=전부 신규 Card(고유 프로모)
  orphanHp?: number | null;    // orphan 모드 포켓몬 HP(균일 HP 세트)
  orphanSubtypes?: string[];   // orphan 모드 포켓몬 subtypes(예: ["Basic"])
  orphanIdBy?: "number" | "name"; // orphan id 기준. number(기본)=번호 / name=이름슬러그(번호중복·공백 세트)
  // 분모(본편장수) → 원본세트 id(또는 여러 세트: 같은 본편장수 세트가 둘 이상일 때 [swsh10, swsh3]).
  // 시크릿 때문에 우리 cardCount≠denom 이라 복수모호일 때 유효세트로 좁혀 판별.
  denomSet?: Record<number, string | string[]>;
  collapseStamps?: boolean; // "(#N Stamped)" 덱슬롯 SKU 변형을 distinct (이름,번호)로 병합(Battle Academy)
  // 자동해석 실패 카드 명시연결: tcgcsv productId(문자열) → 원본 RegionCard id(이미지/이름확정). WCD 잔여 등.
  overrides?: Record<string, string>;
};
const SETS: SetCfg[] = [
  { setId: "ppp", name: "Professor Program Promos", series: "Promo", code: "PPP", release: "2004-01-01", packType: "promo", group: 2332, orphanEnergyYears: ["2023", "2024"] },
  { setId: "ccp", name: "Countdown Calendar Promos", series: "Promo", code: "CCP", release: "2008-10-01", packType: "promo", group: 2155, orphanEnergyYears: [] },
  { setId: "fpp", name: "First Partner Pack", series: "Promo", code: "FPP", release: "2021-04-30", packType: "promo", group: 2776, orphanEnergyYears: [] },
  // TT2022(할로윈 부스터 번들) — 기존 세트 재판. TT2023(tt2023, collect-tcgc-reprint.ts)의 형제팩.
  { setId: "tt2022", name: "Trick or Trade BOOster Bundle", series: "Sword & Shield", code: "TTBB", release: "2022-09-01", packType: "box_set", group: 3179, orphanEnergyYears: [],
    denomSet: { 198: "en-tcg-swsh6", 172: "en-tcg-swsh9", 203: "en-tcg-swsh7", 264: "en-tcg-swsh8" } },
  { setId: "tt2024", name: "Trick or Trade BOOster Bundle 2024", series: "Scarlet & Violet", code: "TTBB24", release: "2024-08-30", packType: "box_set", group: 23561, orphanEnergyYears: [],
    denomSet: { 193: "sv2", 91: "sv4pt5", 167: "sv6" } },
  // PWCP: 19장 전부 고유 Pikachu(아이코닉 재판 9 + 언어변형 10). 번호 중복(#4×2, PW5×2)·공백("PW 1")이라 이름기반 id.
  { setId: "pwcp", name: "Pikachu World Collection Promos", series: "Promo", code: "PWCP", release: "2010-07-01", packType: "box_set", group: 2205, orphanEnergyYears: [], mode: "orphan", orphanSubtypes: ["Basic"], orphanIdBy: "name" },
  // Battle Academy(2020): 기존 카드 재판. "(#N Stamped)" 덱슬롯 SKU 변형 병합 → distinct 38종. 기본에너지 스탬프는 스킵.
  { setId: "ba2020", name: "Battle Academy", series: "Sword & Shield", code: "BTA", release: "2020-07-31", packType: "box_set", group: 2686, orphanEnergyYears: [], collapseStamps: true,
    denomSet: { 147: "en-tcg-sm3", 70: "en-tcg-sm75", 149: "en-tcg-sm1", 214: "en-tcg-sm8" } },
  { setId: "ba2022", name: "Battle Academy 2022", series: "Sword & Shield", code: "BA22", release: "2022-04-01", packType: "box_set", group: 3051, orphanEnergyYears: [], collapseStamps: true,
    denomSet: { 192: "en-tcg-swsh2", 73: "en-tcg-swsh35", 185: "en-tcg-swsh4" } },
  { setId: "ba2024", name: "Battle Academy 2024", series: "Scarlet & Violet", code: "BA24", release: "2024-06-21", packType: "box_set", group: 23520, orphanEnergyYears: [], collapseStamps: true,
    denomSet: { 193: "sv2", 182: "sv4", 198: "sv1", 197: "sv3" } },
  // KWBP(Kids' WB! Poké Card Creator, 2004): 고유 5장(1/5~5/5) — 재판 아님. tcgcollector 교차검증(set 11115).
  //   전부 Basic 포켓몬 60HP(웹 확인). 재판 리졸버 억지매칭 방지 위해 orphan 모드.
  { setId: "kwbp", name: "Kids WB Promos", series: "Promo", code: "KWBP", release: "2004-07-02", packType: "promo", group: 2214, orphanEnergyYears: [], mode: "orphan", orphanHp: 60, orphanSubtypes: ["Basic"] },
  // SAMPLE: e-Reader 데모 Pikachu 1장(고유). 30C: 미발매(2026-09) 신규세트라 게임데이터 없음 → minimal orphan.
  { setId: "sample", name: "e-Reader Sample Cards", series: "Promo", code: "SAMPLE", release: "2002-08-02", packType: "promo", group: 24493, orphanEnergyYears: [], mode: "orphan", orphanSubtypes: ["Basic"] },
  { setId: "30c", name: "ME: 30th Celebration", series: "Mega Evolution", code: "30C", release: "2026-09-16", packType: "expansion", group: 24722, orphanEnergyYears: [], mode: "orphan" },
  // Prize Pack Series(Play! Pokémon 프라이즈, 2022~): 대형 재판 버킷. base+Cosmos Holo 변형 병합.
  // World Championship Decks(세계대회 우승덱 재판, 2004~): 초대형. 선수/연도 변형 병합.
  { setId: "wcd", name: "World Championship Decks", series: "Promo", code: "WCD", release: "2004-08-01", packType: "deck", group: 2282, orphanEnergyYears: [], collapseStamps: true,
    denomSet: {
      106: "en-tcg-ex9", 108: "en-tcg-xy6", 109: "en-tcg-ex7", 112: "en-tcg-ex6",
      111: ["en-tcg-pl2", "en-tcg-xy3"], 113: ["en-tcg-ex11", "en-tcg-bw11"],
      115: "en-tcg-ex10", 116: "en-tcg-bw9", 100: "en-tcg-dp7", 147: "en-tcg-pl3",
      95: "en-tcg-col1", 99: "en-tcg-bw4", 149: ["en-tcg-bw7", "en-tcg-sm1"],
      145: "en-tcg-sm2", 168: "en-tcg-sm7", 70: "en-tcg-sm75", 196: "en-tcg-swsh11",
      198: ["sv1", "en-tcg-swsh6"], 189: ["en-tcg-swsh10", "en-tcg-swsh3"],
      195: "en-tcg-swsh12", 64: "sv6pt5", 78: "en-tcg-pgo",
    },
    // 자동해석 실패 6건 명시연결(이미지/이름확정): Piplup·Sableye(이미지), 에너지약어·RC·SWSH154.
    overrides: {
      "479803": "pop6-15",              // Piplup 15/17 (이미지=pop6)
      "479818": "en-tcg-ex14-10",       // Sableye 10/100 (이미지=ex14 Crystal Guardians)
      "480823": "en-tcg-bw6-118",       // Blend Energy WLFM = WaterLightningFightingMetal
      "482031": "en-tcg-sm5-138",       // Unit Energy LPM = LightningPsychicMetal
      "482032": "en-tcg-g1-RC11",       // Wobbuffet RC11 (Generations Radiant Collection)
      "542073": "en-tcg-swshp-SWSH154", // Dragonite V 154 = SWSH154
    } },
  // MCAP: 잡화 재판 버킷(다양한 프로모 변형). 재판 해석 + 변형 병합. 미해결(고유 프로모)은 --allow-unresolved.
  // BLE: 블리스터 전용 프로모(Cosmos Holo·Dragon Vault 변형). 재판 버킷.
  { setId: "ble", name: "Blister Exclusives", series: "Promo", code: "BLE", release: "2012-01-01", packType: "promo", group: 2289, orphanEnergyYears: [], collapseStamps: true,
    denomSet: {
      99: "en-tcg-bw4", 114: "en-tcg-bw1", 214: ["en-tcg-sm8", "en-tcg-sm10"],
      122: "en-tcg-xy9", 119: "en-tcg-xy4", 202: "en-tcg-swsh1", 124: "en-tcg-bw6",
      149: ["en-tcg-sm1", "en-tcg-bw7"], 94: "en-tcg-me2",
    } },
  { setId: "mcap", name: "Miscellaneous Cards & Products", series: "Promo", code: "MCAP", release: "1999-01-01", packType: "promo", group: 2374, orphanEnergyYears: [], collapseStamps: true,
    denomSet: {
      165: "sv3pt5", 193: "sv2", 83: "en-tcg-g1", 160: "en-tcg-xy5", 185: "en-tcg-swsh4",
      86: ["en-tcg-me4", "zsv10pt5", "rsv10pt5"], 94: "en-tcg-me2", 182: ["sv4", "sv10"],
      142: "sv7", 131: "sv8pt5", 132: "en-tcg-me1", 147: "en-tcg-sm3",
      73: ["en-tcg-pgo", "en-tcg-swsh35"], 172: "en-tcg-swsh9", 198: ["sv1", "en-tcg-swsh6"],
      197: "sv3", 191: "sv8", 91: "sv4pt5", 217: "en-tcg-me1",
      108: "en-tcg-xy12", 202: "en-tcg-swsh1", 116: "en-tcg-swsh45", 214: "en-tcg-sm8",
      149: ["en-tcg-sm1", "en-tcg-bw7"], 163: "en-tcg-sm5", 78: "en-tcg-pgo",
      195: "en-tcg-swsh12", 203: "en-tcg-swsh7", 167: "sv6", 159: "sv9",
    } },
  { setId: "pp", name: "Prize Pack Series Cards", series: "Promo", code: "PPS", release: "2022-11-30", packType: "promo", group: 22880, orphanEnergyYears: [], collapseStamps: true,
    denomSet: {
      172: "en-tcg-swsh9", 198: ["sv1", "en-tcg-swsh6"], 132: "en-tcg-me1",
      189: ["en-tcg-swsh10", "en-tcg-swsh3"], 193: "sv2", 182: ["sv4", "sv10"],
      203: "en-tcg-swsh7", 167: "sv6", 131: "sv8pt5", 94: "en-tcg-me2",
      142: "sv7", 191: "sv8", 163: "en-tcg-swsh5", 195: "en-tcg-swsh12",
      196: "en-tcg-swsh11", 197: "sv3", 159: "sv9", 88: "en-tcg-me3",
      185: "en-tcg-swsh4", 73: "en-tcg-swsh35", 86: ["rsv10pt5", "zsv10pt5"],
    } },
];

type Prod = { productId: number; name: string; imageUrl?: string; extendedData?: { name: string; value: string }[] };
type Parsed = {
  productId: number; rawName: string; cleanName: string; numField: string; fullNum: string;
  num: number; denom: number | null; letterPrefix: boolean; year: string | null;
  fieldNum: number; fieldDenom: number | null; // Number 필드의 파싱값(이름과 불일치 시 대체 해석용)
  isStaff: boolean; cardType: string | null; image: string; discrepancy: string | null;
};

const ext = (p: Prod, k: string) => p.extendedData?.find((e) => e.name === k)?.value ?? "";
// 악센트 폴딩(é→e 등) 후 영숫자만 — "Pokémon"↔"Pokemon" 매칭.
const norm = (s: string) => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
const slug = (s: string) => (s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const BASIC_ENERGY = /^(grass|fire|water|lightning|psychic|fighting|darkness|metal|fairy|dragon)\s+energy$/i;
// 이 로더가 만든 재판/특수 버킷 세트들 — 재판 해석 후보에서 제외(원본세트에만 연결).
const BUCKET_SETS = ["ppp", "ccp", "fpp", "kwbp", "pwcp", "tt2022", "tt2023", "tt2024", "ba2020", "ba2022", "ba2024", "pp", "wcd", "sample", "30c", "mcap", "ble", "mcd23", "mcd24", "tk-sm-l", "tk-sm-r"];

function parseProd(p: Prod, deckStrip = false): Parsed {
  const raw = p.name;
  const numField = ext(p, "Number");
  const cardType = ext(p, "Card Type") || null;

  // 연도 "(2013)" / "(2004-2005)" — [Staff] 가 뒤에 붙을 수 있어 끝 앵커 없이.
  const ym = raw.match(/\((\d{4}(?:-\d{4})?)\)/);
  const year = ym ? ym[1] : null;
  const isStaff = /\[staff\]/i.test(raw);

  // 이름 정리(순서 중요): [Staff]·스탬프변형 먼저 → 연도 → 내장번호 꼬리 제거. "[Professor X]" 서브타이틀 보존.
  let clean = raw.replace(/\[staff\]/i, "").trim();
  // "(#1 Charizard Stamped)"·"(Mewtwo Stamped)" 같은 덱슬롯 스탬프 SKU 표기 제거.
  clean = clean.replace(/\s*\(#?\s*\d*\s*[A-Za-z]+\s+stamped\)\s*$/i, "").trim();
  // 포일 descriptor 제거(Cosmos Holo 등) — 같은 카드의 변형(Prize Pack 등). 항상 안전(카드명 아님).
  clean = clean.replace(/\s*\((cosmos holo|reverse holo|non-holo|holo)\)\s*$/i, "").trim();
  // collapseStamps 세트 변형 접미 제거(선수/연도·덱슬롯).
  if (deckStrip) {
    clean = clean.replace(/\s*-\s*\d{4}\s*\([^)]*\)\s*$/, "").trim(); // WCD "- 2004 (Chris Fulop)"
    clean = clean.replace(/\s*-\s*[A-Za-z][A-Za-z' ]*?(\s+\d+|\s+Deck)\s*$/i, "").trim(); // BA2024 "- Pikachu 1"·"- Darkrai Deck"
    clean = clean.replace(/\s*\([A-Z0-9/]+\)\s*$/, "").trim(); // 번호코드 중복 괄호 "(DP03)"·"(15)"·"(067/195/)"
    // 후행 변형 descriptor 괄호 전반 제거 "(2014 Movie Promo)"·"(E3 Stamped)"·"(Toys R Us Promo)" 등.
    //   ★번호 뒤 끝에 있을 때만 — 폼 괄호 "Burmy (Plant Cloak) - 78/132"는 번호가 뒤라 안 걸림(안전).
    clean = clean.replace(/\s*\([^)]*\)\s*$/, "").trim();
  }
  clean = clean.replace(/\((\d{4}(?:-\d{4})?)\)\s*$/, "").trim();
  const embMatch = clean.match(/-\s*([A-Za-z]*\d+(?:\/\d+)?)\s*$/);
  const embNum = embMatch ? embMatch[1] : null;
  clean = clean.replace(/-\s*[A-Za-z]*\d+(?:\/\d+)?\s*$/, "").trim();

  // 번호 파싱 헬퍼: "057/100"/"DP16"/"222" → {num, denom, letterPrefix}
  const parseNum = (s: string) => {
    const sl = s.match(/^([A-Za-z]*)(\d+)\/(\d+)$/);
    const pl = s.match(/^([A-Za-z]*)(\d+)$/);
    if (sl) return { num: parseInt(sl[2], 10), denom: parseInt(sl[3], 10), letter: sl[1] !== "" };
    if (pl) return { num: parseInt(pl[2], 10), denom: null as number | null, letter: pl[1] !== "" };
    return { num: 0, denom: null as number | null, letter: false };
  };
  const pf = parseNum(numField);
  const pe = embNum ? parseNum(embNum) : null;
  // 진짜 불일치 = 숫자(num/denom)가 실제로 다름(선행 0 차이는 무시). 그때만 이름내장(권위) 채택.
  const realDiscrepancy = !!(pe && (pe.num !== pf.num || pe.denom !== pf.denom));
  const chosen = realDiscrepancy ? pe! : pf;
  const num = chosen.num, denom = chosen.denom, letterPrefix = chosen.letter;

  const discrepancy = realDiscrepancy ? `Number필드 ${numField} ≠ 이름 ${embNum}` : null;
  // 표시/식별 full 번호: 불일치면 이름내장, 아니면 numField(패딩 유지 — 선행0 일관성).
  const fullNum = realDiscrepancy && embNum ? embNum : numField;

  const image = (p.imageUrl || "").replace("_200w.jpg", "_in_1000x1000.jpg");
  return { productId: p.productId, rawName: raw, cleanName: clean, numField, fullNum, num, denom, letterPrefix, year, fieldNum: pf.num, fieldDenom: pf.denom, isStaff, cardType, image, discrepancy };
}

async function resolveReprint(pp: Parsed, selfSetId: string, denomSet?: Record<number, string | string[]>) {
  const nClean = norm(pp.cleanName);
  // 문자접두 번호(DP16·SWSH167): numberInt 매칭 불가 → 번호문자열 정확 + 이름으로 매칭.
  if (pp.letterPrefix) {
    // 번호문자열 정확 일치로 후보 뽑고, 이름은 정규화 비교(하이픈/공백/악센트 무관: "Xurkitree GX"↔"Xurkitree-GX").
    const byNum = await prisma.regionCard.findMany({
      where: { region: "EN", number: pp.numField, setId: { notIn: [selfSetId, ...BUCKET_SETS] } },
      select: { id: true, name: true, number: true, setId: true, cardId: true, set: { select: { cardCount: true, name: true } } },
    });
    const hit = byNum.filter((c) => { const nc = norm(c.name); return nc === nClean || nc.includes(nClean) || nClean.includes(nc); });
    if (hit.length === 1) return { ok: true as const, pick: hit[0] };
    if (hit.length > 1) return { ok: false as const, reason: `문자번호 복수 ${hit.length}`, cands: hit.map((c) => `${c.setId} ${c.number} ${c.name}`) };
    return { ok: false as const, reason: `문자번호 매칭 0 (num=${pp.numField}, "${pp.cleanName}")`, cands: byNum.map((c) => `${c.setId} ${c.number} ${c.name}`) };
  }
  // 숫자 경로: 우선 해석(이름내장/필드 chosen) 실패 시 Number필드 해석 재시도 — tcgcsv 이름/필드 오타 양방향 대응.
  const attempts: { num: number; denom: number | null; alt: boolean }[] = [{ num: pp.num, denom: pp.denom, alt: false }];
  if (pp.fieldNum !== pp.num || pp.fieldDenom !== pp.denom) attempts.push({ num: pp.fieldNum, denom: pp.fieldDenom, alt: true });
  let lastFail: { ok: false; reason: string; cands: string[] } = { ok: false, reason: `번호 파싱 실패`, cands: [] };
  for (const a of attempts) {
    const r = await tryNumeric(a.num, a.denom, nClean, pp.cleanName, selfSetId, denomSet);
    if (r.ok) return { ...r, usedAlt: a.alt, num: a.num, denom: a.denom };
    lastFail = r;
  }
  return lastFail;
}

// numberInt + 이름 + (denomSet/cardCount) 로 후보 확정. 실패 시 {ok:false}.
async function tryNumeric(num: number, denom: number | null, nClean: string, cleanName: string, selfSetId: string, denomSet?: Record<number, string | string[]>) {
  const cands = await prisma.regionCard.findMany({
    where: { region: "EN", numberInt: num, setId: { notIn: [selfSetId, ...BUCKET_SETS] } },
    select: { id: true, name: true, number: true, setId: true, cardId: true, set: { select: { cardCount: true, name: true } } },
  });
  const pool = cands.filter((c) => {
    const nc = norm(c.name);
    return nc === nClean || nc.includes(nClean) || nClean.includes(nc);
  });
  if (pool.length === 0) return { ok: false as const, reason: `이름+번호 매칭 0 (num=${num}, "${cleanName}")`, cands: cands.map((c) => `${c.setId} ${c.number} ${c.name}`) };
  if (pool.length === 1) return { ok: true as const, pick: pool[0] };
  // 정확 이름매칭 우선(V/VMAX/ex 접미 구분) — 가장 신뢰도 높음. 유일하면 채택.
  const exact = pool.filter((c) => norm(c.name) === nClean);
  if (exact.length === 1) return { ok: true as const, pick: exact[0] };
  // 명시 분모→유효세트 매핑(시크릿으로 cardCount≠denom 인 경우). 다중값 지원.
  if (denom != null && denomSet?.[denom]) {
    const allow = denomSet[denom];
    const list = Array.isArray(allow) ? allow : [allow];
    const byMap = (exact.length ? exact : pool).filter((c) => list.includes(c.setId));
    if (byMap.length === 1) return { ok: true as const, pick: byMap[0] };
  }
  if (denom != null) {
    const byDenom = pool.filter((c) => c.set?.cardCount === denom);
    if (byDenom.length === 1) return { ok: true as const, pick: byDenom[0] };
    const near = pool.filter((c) => c.set?.cardCount != null && Math.abs((c.set.cardCount as number) - denom) <= 3);
    if (near.length === 1) return { ok: true as const, pick: near[0] };
  }
  return { ok: false as const, reason: `복수모호 ${pool.length}건`, cands: pool.map((c) => `${c.setId} ${c.number} ${c.name} [cc=${c.set?.cardCount}]`) };
}

async function collectSet(cfg: SetCfg, apply: boolean, allowUnresolved = false) {
  log.info(`${apply ? "APPLY" : "DRY-RUN"} — ${cfg.setId.toUpperCase()} (${cfg.name}, group ${cfg.group})`);

  const d = JSON.parse(readFileSync(`${SP}/${cfg.setId}-tcgcsv.json`, "utf-8"));
  const prods: Prod[] = d.results ?? d;
  let parsed = prods.map((p) => parseProd(p, cfg.collapseStamps));
  log.info(`tcgcsv 상품 ${parsed.length}장`);

  // 스탬프 SKU 병합: 같은 (이름,번호)의 "(#N Stamped)" 변형은 첫 상품만 대표로(나머지 접힘).
  if (cfg.collapseStamps) {
    const seen = new Set<string>();
    const deduped: Parsed[] = [];
    let collapsed = 0;
    for (const pp of parsed) {
      if (!pp.numField.trim()) { deduped.push(pp); continue; } // 실드는 그대로(뒤에서 스킵)
      // fullNum(교정된 번호) 기준 — tcgcsv 오타(예: 226/164 vs 226/264)도 이름내장 교정 후 병합.
      const k = `${norm(pp.cleanName)}|${pp.fullNum}`;
      if (seen.has(k)) { collapsed++; continue; }
      seen.add(k); deduped.push(pp);
    }
    log.info(`스탬프 변형 병합: ${parsed.length} → ${deduped.length} (${collapsed} 접힘)`);
    parsed = deduped;
  }

  const linked: { pp: Parsed; cardId: string; via: string; srcSetId: string; fullNum: string; num: number }[] = [];
  const orphanEnergy: Parsed[] = [];
  const orphanCards: Parsed[] = []; // orphan 모드 전용 — 전부 신규 Card(고유 프로모)
  const unresolved: { pp: Parsed; reason: string; cands: string[] }[] = [];
  const skipped: Parsed[] = []; // 실드 상품(Number 없음) = 카드 아님

  for (const pp of parsed) {
    // 실드 상품(팩/바인더 등)은 Number 가 없음 → 카드 아니므로 스킵.
    if (!pp.numField.trim()) { skipped.push(pp); continue; }
    // 기본에너지 덱필러(Battle Academy 등 collapseStamps 세트) 스킵 — 재판 카탈로그 대상 아님.
    if (cfg.collapseStamps && /^basic\s+.+\s+energy$/i.test(pp.cleanName)) { skipped.push(pp); continue; }
    // 명시 override(자동해석 실패분 이미지/이름확정): productId → 원본 RegionCard id.
    const ovId = cfg.overrides?.[String(pp.productId)];
    if (ovId) {
      const tgt = await prisma.regionCard.findUnique({ where: { id: ovId }, select: { setId: true, number: true, name: true, cardId: true } });
      if (!tgt) { unresolved.push({ pp, reason: `override 대상 ${ovId} 없음`, cands: [] }); continue; }
      linked.push({ pp, cardId: tgt.cardId, via: `override→${tgt.setId} ${tgt.number} "${tgt.name}"`, srcSetId: tgt.setId, fullNum: pp.fullNum, num: pp.num });
      continue;
    }
    // orphan 모드: 재판 해석 없이 전부 신규 Card 로.
    if (cfg.mode === "orphan") { orphanCards.push(pp); continue; }
    if (pp.denom == null && BASIC_ENERGY.test(pp.cleanName) && pp.year != null && cfg.orphanEnergyYears.includes(pp.year)) {
      orphanEnergy.push(pp); continue;
    }
    const r = await resolveReprint(pp, cfg.setId, cfg.denomSet);
    if (r.ok) {
      // 대체(Number필드) 해석이 이겼으면 표시번호도 필드값으로 교정(이름에 오타가 있던 경우).
      const fullNum = r.usedAlt ? `${String(r.num).padStart(3, "0")}${r.denom != null ? `/${r.denom}` : ""}` : pp.fullNum;
      linked.push({ pp, cardId: r.pick.cardId, via: `${r.pick.setId} ${r.pick.number} "${r.pick.name}"`, srcSetId: r.pick.setId, fullNum, num: r.num });
    } else unresolved.push({ pp, reason: r.reason, cands: r.cands ?? [] });
  }

  console.log(`\n===== ① LINKED (기존 Card 연결 재판) : ${linked.length} =====`);
  for (const l of linked)
    console.log(`  #${l.pp.numField.padEnd(9)} ${l.pp.cleanName.slice(0, 34).padEnd(34)} ${l.pp.isStaff ? "[Staff]" : "       "} → ${l.via}  card=${l.cardId}`);

  console.log(`\n===== ② ORPHAN ENERGY (신규 Card) : ${orphanEnergy.length} =====`);
  for (const e of orphanEnergy) console.log(`  #${e.numField.padEnd(5)} ${e.cleanName.padEnd(20)} (${e.year})`);

  if (orphanCards.length) {
    console.log(`\n===== ②' ORPHAN CARDS (신규 Card·고유 프로모) : ${orphanCards.length} =====`);
    for (const o of orphanCards) console.log(`  #${o.fullNum.padEnd(9)} ${o.cleanName.padEnd(20)} [${o.cardType ?? "?"}] hp=${cfg.orphanHp ?? "-"}`);
  }

  console.log(`\n===== ③ UNRESOLVED (수동 검토) : ${unresolved.length} =====`);
  for (const u of unresolved) {
    console.log(`  #${u.pp.numField.padEnd(9)} ${u.pp.rawName.slice(0, 44).padEnd(44)} — ${u.reason}${u.pp.discrepancy ? "  ⚠" + u.pp.discrepancy : ""}`);
    u.cands.slice(0, 4).forEach((c) => console.log(`        후보: ${c}`));
  }
  if (skipped.length) {
    console.log(`\n===== ④ SKIPPED (실드 상품·카드 아님) : ${skipped.length} =====`);
    for (const s of skipped) console.log(`  ${s.rawName}`);
  }
  const cardCount = parsed.length - skipped.length;
  console.log(`\n요약: LINKED ${linked.length} · ENERGY ${orphanEnergy.length} · ORPHAN ${orphanCards.length} · UNRESOLVED ${unresolved.length} · SKIP ${skipped.length} / 카드 ${cardCount} (총상품 ${parsed.length})`);

  if (!apply) { log.info("(dry-run) 미해결 정리 후 --apply."); return; }
  if (unresolved.length && !allowUnresolved) { log.warn(`UNRESOLVED ${unresolved.length}건 — 전량 해결 전 적재 중단(--allow-unresolved 로 스킵 적재).`); return; }
  if (unresolved.length) log.warn(`UNRESOLVED ${unresolved.length}건 스킵(--allow-unresolved) — 나머지만 적재.`);

  // ── 적재 (EN 신규세트 = mapping-lock FREE) ──
  await prisma.set.upsert({
    where: { id: cfg.setId },
    create: {
      id: cfg.setId, name: cfg.name, series: cfg.series, releaseDate: new Date(`${cfg.release}T00:00:00Z`),
      cardCount, region: "EN", code: cfg.code, packType: cfg.packType, titleCleanEn: cfg.name,
      logoUrl: null, symbolUrl: null, cardPackId: null,
    },
    update: { name: cfg.name, cardCount, code: cfg.code, titleCleanEn: cfg.name },
  });

  const CDN = (id: number, sz: string) => `https://tcgplayer-cdn.tcgplayer.com/product/${id}_${sz}.jpg`;
  const src = await prisma.externalSource.findUnique({ where: { code: "tcgcsv" }, select: { id: true } });
  if (!src) throw new Error("ExternalSource 'tcgcsv' 미시드");
  const mappings: { productId: number; rcId: string; url: string }[] = [];
  let nLinked = 0, nEnergy = 0;

  // 같은 fullNum 이 서로 다른 원본세트에서 오는 충돌(예: Ariados swsh3 vs Nickit swsh10, 둘 다 103/189) 감지.
  const baseIdOf = (l: typeof linked[number]) => `${cfg.setId}-${l.fullNum.replace(/\//g, "-")}${l.pp.isStaff ? "-staff" : ""}`;
  const baseIdCounts = new Map<string, number>();
  for (const l of linked) baseIdCounts.set(baseIdOf(l), (baseIdCounts.get(baseIdOf(l)) ?? 0) + 1);

  const seenRcId = new Set<string>();
  for (const l of linked) {
    const baseId = baseIdOf(l);
    // 충돌 시에만 원본세트 슬러그로 구분(비충돌은 id 유지 → 기존 세트 멱등).
    const rcId = (baseIdCounts.get(baseId) ?? 0) > 1 ? `${baseId}-${l.srcSetId.replace(/^en-tcg-/, "")}` : baseId;
    // 같은 rcId 재등장(tcgcsv 오타로 collapse 못한 같은카드 등) → 첫 것만, 중복 매핑 생략.
    if (seenRcId.has(rcId)) continue;
    seenRcId.add(rcId);
    const dispName = l.pp.cleanName.replace(/\[/g, "(").replace(/\]/g, ")") + (l.pp.isStaff ? " (Staff)" : "");
    await prisma.regionCard.upsert({
      where: { id: rcId },
      create: {
        id: rcId, cardId: l.cardId, language: "en", region: "EN", setId: cfg.setId,
        number: l.fullNum, numberInt: l.num, name: dispName,
        imageSmall: CDN(l.pp.productId, "200w"), imageLarge: CDN(l.pp.productId, "in_1000x1000"),
        rarityId: null, regulationMark: null, legalities: undefined,
      },
      update: { cardId: l.cardId, name: dispName, imageSmall: CDN(l.pp.productId, "200w"), imageLarge: CDN(l.pp.productId, "in_1000x1000") },
    });
    mappings.push({ productId: l.pp.productId, rcId, url: `https://www.tcgplayer.com/product/${l.pp.productId}` });
    nLinked++;
  }

  const ENERGY_TYPE: Record<string, string> = {
    grass: "Grass", fire: "Fire", water: "Water", lightning: "Lightning",
    psychic: "Psychic", fighting: "Fighting", darkness: "Darkness", metal: "Metal",
  };
  for (const e of orphanEnergy) {
    const num3 = String(e.num).padStart(3, "0");
    const cardId = `lc-orphan-${cfg.setId}-e${e.year}-${num3}`;
    const rcId = `${cfg.setId}-e${e.year}-${num3}`;
    const type = ENERGY_TYPE[e.cleanName.toLowerCase().replace(/\s+energy$/, "")] ?? null;
    const dispName = `${e.cleanName} (${e.year})`;
    await prisma.card.upsert({
      where: { id: cardId },
      create: {
        id: cardId, primarySetId: cfg.setId, primaryNumber: num3, primaryNumberInt: e.num,
        supertype: "Energy", subtypes: ["Basic"], types: type ? [type] : [],
        hp: null, retreatCost: null, evolvesTo: [], pokedexNumbers: [], rarityId: null, rules: [],
      },
      update: { supertype: "Energy", subtypes: ["Basic"], types: type ? [type] : [] },
    });
    await prisma.regionCard.upsert({
      where: { id: rcId },
      create: {
        id: rcId, cardId, language: "en", region: "EN", setId: cfg.setId,
        number: num3, numberInt: e.num, name: dispName,
        imageSmall: CDN(e.productId, "200w"), imageLarge: CDN(e.productId, "in_1000x1000"),
        rarityId: null, regulationMark: null, legalities: undefined,
      },
      update: { name: dispName, imageSmall: CDN(e.productId, "200w"), imageLarge: CDN(e.productId, "in_1000x1000") },
    });
    mappings.push({ productId: e.productId, rcId, url: `https://www.tcgplayer.com/product/${e.productId}` });
    nEnergy++;
  }

  // ORPHAN CARDS — 고유 프로모(재판 아님). Card Type 으로 supertype 도출.
  let nOrphan = 0;
  for (const o of orphanCards) {
    const num3 = String(o.num).padStart(3, "0");
    // id 기준: name(번호중복·공백 세트) 또는 number(기본). 둘 다 버킷 내 유니크해야 함.
    const key = cfg.orphanIdBy === "name" ? slug(o.cleanName) : `${num3}`;
    const cardId = `lc-orphan-${cfg.setId}-${key}`;
    const rcId = `${cfg.setId}-${cfg.orphanIdBy === "name" ? key : o.fullNum.replace(/\//g, "-")}`;
    const ct = (o.cardType || "").trim();
    const ctl = ct.toLowerCase();
    let supertype: string, subtypes: string[], types: string[], hp: number | null;
    if (ctl === "energy") { supertype = "Energy"; subtypes = ["Basic"]; types = []; hp = null; }
    else if (ctl === "trainer") { supertype = "Trainer"; subtypes = []; types = []; hp = null; }
    else { supertype = "Pokémon"; subtypes = cfg.orphanSubtypes ?? []; types = ct ? [ct] : []; hp = cfg.orphanHp ?? null; }
    await prisma.card.upsert({
      where: { id: cardId },
      create: {
        id: cardId, primarySetId: cfg.setId, primaryNumber: num3, primaryNumberInt: o.num,
        supertype, subtypes, types, hp, retreatCost: null, evolvesTo: [], pokedexNumbers: [], rarityId: null, rules: [],
      },
      update: { supertype, subtypes, types, hp },
    });
    await prisma.regionCard.upsert({
      where: { id: rcId },
      create: {
        id: rcId, cardId, language: "en", region: "EN", setId: cfg.setId,
        number: o.fullNum, numberInt: o.num, name: o.cleanName,
        imageSmall: CDN(o.productId, "200w"), imageLarge: CDN(o.productId, "in_1000x1000"),
        rarityId: null, regulationMark: null, legalities: undefined,
      },
      update: { name: o.cleanName, imageSmall: CDN(o.productId, "200w"), imageLarge: CDN(o.productId, "in_1000x1000") },
    });
    mappings.push({ productId: o.productId, rcId, url: `https://www.tcgplayer.com/product/${o.productId}` });
    nOrphan++;
  }

  let nMap = 0;
  for (const m of mappings) {
    await prisma.externalIdMapping.upsert({
      where: { sourceId_externalId: { sourceId: src.id, externalId: String(m.productId) } },
      create: {
        sourceId: src.id, externalId: String(m.productId), regionCardId: m.rcId, printVariantId: null,
        url: m.url, verifiedBy: "auto:collect-tcgcsv-bucket", confidence: 1.0, verifiedAt: new Date(),
      },
      update: { regionCardId: m.rcId, url: m.url, printVariantId: null },
    });
    nMap++;
  }
  log.info(`✓ ${cfg.setId}: Set + LINKED ${nLinked} + ENERGY ${nEnergy} + ORPHAN ${nOrphan} + ExternalIdMapping ${nMap} 적재 완료`);
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const allowUnresolved = args.includes("--allow-unresolved");
  const only = args.find((a) => a.startsWith("--set="))?.split("=")[1];
  if (!only) throw new Error(`--set=<id> 필요 (${SETS.map((s) => s.setId).join(", ")})`);
  const cfg = SETS.find((s) => s.setId === only);
  if (!cfg) throw new Error(`--set='${only}' 미정의`);
  await collectSet(cfg, apply, allowUnresolved);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
