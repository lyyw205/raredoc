/**
 * 그룹 단위 EN/JP/KR 그룹핑 → 렌더용 JSON (읽기전용, DB 무변경). 일반화 빌더.
 *
 * 노출 스펙(D1/D2/D3 + 2b):
 *   - JP 앵커(분할 세트, 번호순) | KR↔JP: 포켓몬=번호 / 트레이너=일러+세트+번호순
 *   - EN↔JP: 그룹에 EN 네이티브 세트 있으면 그룹내 dex+지문(tier순위),
 *            없으면 전 EN 세트 교차검색(dex+일러+형태, tier 근접)
 *   - 미매칭 EN(네이티브만) → 영판전용 꼬리
 *
 * 실행: npx tsx scripts/build-group.ts <groupId>   (sv-base | sv-triplet-beat)
 * 출력: src/data/group-<groupId>.json
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const POKE = ["Pokémon", "Pokemon"];

type Cfg = { nameKo: string; nameEn: string; jp: string[]; kr: string[]; krMirror: Record<string, string>; enNative: string[] | null; krMirrorAll?: boolean };
// krMirrorAll: KR 세트가 JP 정수번호 완전미러(트레이너 포함)일 때 true — 모든 카드 번호로 매칭.
//   (일반 KR은 트레이너 번호가 JP와 어긋나 일러스트레이터 페어링 필요 → false/미지정)
const CONFIG: Record<string, Cfg> = {
  "sv-base": {
    nameKo: "스칼렛 ex + 바이올렛 ex", nameEn: "Scarlet & Violet",
    jp: ["jp-tcg-SV1S", "jp-tcg-SV1V"], kr: ["kr-sv1s", "kr-sv1v"],
    krMirror: { "kr-sv1s": "jp-tcg-SV1S", "kr-sv1v": "jp-tcg-SV1V" }, enNative: ["sv1"],
  },
  "sv-triplet-beat": {
    nameKo: "트리플렛비트", nameEn: "Triplet Beat",
    jp: ["jp-sv-triplet-beat"], kr: ["kr-sv1a"],
    krMirror: { "kr-sv1a": "jp-sv-triplet-beat" }, enNative: null, // EN 네이티브 없음 → 교차그룹
  },
  "sv-paldea-evolved": {
    nameKo: "스노해저드 + 클레이버스트", nameEn: "Paldea Evolved",
    jp: ["jp-tcg-SV2P", "jp-tcg-SV2D"], kr: ["kr-sv2p", "kr-sv2d"],
    krMirror: { "kr-sv2p": "jp-tcg-SV2P", "kr-sv2d": "jp-tcg-SV2D" }, enNative: ["sv2"], krMirrorAll: true,
  },
  "sv-paradox-rift": {
    nameKo: "고대의 포효 + 미래의 일섬", nameEn: "Paradox Rift",
    jp: ["jp-tcg-SV4K", "jp-tcg-SV4M"], kr: ["kr-sv4k", "kr-sv4m"],
    krMirror: { "kr-sv4k": "jp-tcg-SV4K", "kr-sv4m": "jp-tcg-SV4M" }, enNative: ["sv4"], krMirrorAll: true,
  },
  "sv-151": {
    nameKo: "포켓몬 카드 151", nameEn: "151",
    jp: ["jp-sv-151"], kr: ["kr-sv-151"],
    krMirror: { "kr-sv-151": "jp-sv-151" }, enNative: ["sv3pt5"], krMirrorAll: true,
  },
  "sv-obsidian-flames": {
    nameKo: "흑염의 지배자", nameEn: "Obsidian Flames",
    jp: ["jp-sv-obsidian-flames"], kr: ["kr-sv3"],
    krMirror: { "kr-sv3": "jp-sv-obsidian-flames" }, enNative: ["sv3"], krMirrorAll: true,
  },
  "sv-raging-surf": {
    nameKo: "레이징서프", nameEn: "Raging Surf",
    jp: ["jp-sv-raging-surf"], kr: ["kr-sv3a"],
    krMirror: { "kr-sv3a": "jp-sv-raging-surf" }, enNative: null, krMirrorAll: true, // EN 네이티브 없음 → 교차그룹
  },
  "sv-paldean-fates": {
    nameKo: "샤이니트레저 ex", nameEn: "Paldean Fates",
    jp: ["jp-sv-paldean-fates"], kr: ["kr-sv4a"],
    krMirror: { "kr-sv4a": "jp-sv-paldean-fates" }, enNative: ["sv4pt5"], krMirrorAll: true,
  },
  "sv-temporal-forces": {
    nameKo: "와일드포스 + 사이버저지", nameEn: "Temporal Forces",
    jp: ["jp-tcg-SV5K", "jp-tcg-SV5M"], kr: ["kr-sv5k", "kr-sv5m"],
    krMirror: { "kr-sv5k": "jp-tcg-SV5K", "kr-sv5m": "jp-tcg-SV5M" }, enNative: ["sv5"], krMirrorAll: true,
  },
  "sv-crimson-haze": {
    nameKo: "크림슨헤이즈", nameEn: "Crimson Haze",
    jp: ["jp-sv-crimson-haze"], kr: ["kr-sv5a"],
    krMirror: { "kr-sv5a": "jp-sv-crimson-haze" }, enNative: null, krMirrorAll: true, // EN 네이티브 없음 → 교차그룹
  },
  "sv-twilight-masquerade": {
    nameKo: "변환의 가면", nameEn: "Twilight Masquerade",
    jp: ["jp-sv-twilight-masquerade"], kr: ["kr-sv6"],
    krMirror: { "kr-sv6": "jp-sv-twilight-masquerade" }, enNative: ["sv6"], krMirrorAll: true,
  },
  "sv-shrouded-fable": {
    nameKo: "나이트원더러", nameEn: "Shrouded Fable",
    jp: ["jp-sv-shrouded-fable"], kr: ["kr-sv6a"],
    krMirror: { "kr-sv6a": "jp-sv-shrouded-fable" }, enNative: ["sv6pt5"], krMirrorAll: true,
  },
  "sv-stellar-crown": {
    nameKo: "스텔라미라클", nameEn: "Stellar Crown",
    jp: ["jp-sv-stellar-crown"], kr: ["kr-sv7"],
    krMirror: { "kr-sv7": "jp-sv-stellar-crown" }, enNative: ["sv7"], krMirrorAll: true,
  },
  "sv-paradise-dragona": {
    nameKo: "낙원드래고나", nameEn: "Paradise Dragona",
    jp: ["jp-sv-paradise-dragona"], kr: ["kr-sv7a"],
    krMirror: { "kr-sv7a": "jp-sv-paradise-dragona" }, enNative: null, krMirrorAll: true, // EN 네이티브 없음 → 교차그룹
  },
  "sv-surging-sparks": {
    nameKo: "초전브레이커", nameEn: "Surging Sparks",
    jp: ["jp-sv-surging-sparks"], kr: ["kr-sv8"],
    krMirror: { "kr-sv8": "jp-sv-surging-sparks" }, enNative: ["sv8"], krMirrorAll: true,
  },
  "sv-prismatic-evolutions": {
    nameKo: "테라스탈 페스타 ex", nameEn: "Prismatic Evolutions",
    jp: ["jp-sv-prismatic-evolutions"], kr: ["kr-sv8a"],
    krMirror: { "kr-sv8a": "jp-sv-prismatic-evolutions" }, enNative: ["sv8pt5"], krMirrorAll: true,
  },
  "sv-journey-together": {
    nameKo: "배틀파트너즈", nameEn: "Journey Together",
    jp: ["jp-sv-journey-together"], kr: ["kr-sv9"],
    krMirror: { "kr-sv9": "jp-sv-journey-together" }, enNative: ["sv9"], krMirrorAll: true,
  },
  "sv-heatwave-arena": {
    nameKo: "열풍의 아레나", nameEn: "Heat Wave Arena",
    jp: ["jp-sv-heatwave-arena"], kr: ["kr-sv9a"],
    krMirror: { "kr-sv9a": "jp-sv-heatwave-arena" }, enNative: null, krMirrorAll: true, // EN 네이티브 없음 → 교차그룹
  },
  "sv-destined-rivals": {
    nameKo: "로켓단의 영광", nameEn: "Destined Rivals",
    jp: ["jp-sv-destined-rivals"], kr: ["kr-sv10"],
    krMirror: { "kr-sv10": "jp-sv-destined-rivals" }, enNative: ["sv10"], krMirrorAll: true,
  },
  "sv-black-bolt-white-flare": {
    nameKo: "블랙볼트 + 화이트플레어", nameEn: "Black Bolt & White Flare",
    jp: ["jp-tcg-SV11B", "jp-tcg-SV11W"], kr: ["kr-sv11b", "kr-sv11w"],
    krMirror: { "kr-sv11b": "jp-tcg-SV11B", "kr-sv11w": "jp-tcg-SV11W" }, enNative: ["zsv10pt5", "rsv10pt5"], krMirrorAll: true,
  },
  // ── MEGA ──
  "mega-brave-symphonia": {
    nameKo: "메가브레이브 + 메가심포니아", nameEn: "Mega Brave & Mega Symphonia",
    jp: ["jp-tcg-M1L", "jp-tcg-M1S"], kr: ["kr-m1l", "kr-m1s"],
    krMirror: { "kr-m1l": "jp-tcg-M1L", "kr-m1s": "jp-tcg-M1S" }, enNative: [], krMirrorAll: true,
  },
  "mega-infernox": {
    nameKo: "인페르노X", nameEn: "Inferno X",
    jp: ["jp-mega-infernox"], kr: ["kr-m2"],
    krMirror: { "kr-m2": "jp-mega-infernox" }, enNative: [], krMirrorAll: true,
  },
  "mega-dream-ex": {
    nameKo: "메가드림 ex", nameEn: "Mega Dream ex",
    jp: ["jp-mega-dream-ex"], kr: ["kr-m2a"],
    krMirror: { "kr-m2a": "jp-mega-dream-ex" }, enNative: [], krMirrorAll: true,
  },
  "mega-munikisuzero": {
    nameKo: "니힐제로", nameEn: "Nihil Zero",
    jp: ["jp-mega-munikisuzero"], kr: ["kr-m3"],
    krMirror: { "kr-m3": "jp-mega-munikisuzero" }, enNative: [], krMirrorAll: true,
  },
  "mega-ninja-spinner": {
    nameKo: "닌자스피너", nameEn: "Ninja Spinner",
    jp: ["jp-mega-ninja-spinner"], kr: ["kr-m4"],
    krMirror: { "kr-m4": "jp-mega-ninja-spinner" }, enNative: [], krMirrorAll: true,
  },
  "mega-abyss-eye": {
    nameKo: "아비스아이", nameEn: "Abyss Eye",
    jp: ["jp-mega-abyss-eye"], kr: [],
    krMirror: {}, enNative: [], krMirrorAll: true,
  },
  // ── SWSH (역순 진행) ──
  "og-s1a": {
    nameKo: "VMAX라이징", nameEn: "VMAX Rising",
    jp: ["jp-tcg-S1a"], kr: ["kr-s1a"],
    krMirror: { "kr-s1a": "jp-tcg-S1a" }, enNative: [], krMirrorAll: true,
  },
  "og-s1h": {
    nameKo: "실드", nameEn: "Shield",
    jp: ["jp-tcg-S1H"], kr: ["kr-s1h"],
    krMirror: { "kr-s1h": "jp-tcg-S1H" }, enNative: [], krMirrorAll: true,
  },
  "og-s1w": {
    nameKo: "소드", nameEn: "Sword",
    jp: ["jp-tcg-S1W"], kr: ["kr-s1w"],
    krMirror: { "kr-s1w": "jp-tcg-S1W" }, enNative: [], krMirrorAll: true,
  },
  "og-s2": {
    nameKo: "반역크래시", nameEn: "Rebellion Crash",
    jp: ["jp-tcg-S2"], kr: ["kr-s2"],
    krMirror: { "kr-s2": "jp-tcg-S2" }, enNative: [], krMirrorAll: true,
  },
  "og-s2a": {
    nameKo: "폭염워커", nameEn: "Explosive Walker",
    jp: ["jp-tcg-S2a"], kr: ["kr-s2a"],
    krMirror: { "kr-s2a": "jp-tcg-S2a" }, enNative: [], krMirrorAll: true,
  },
  "og-s3a": {
    nameKo: "전설의고동", nameEn: "Legendary Heartbeat",
    jp: ["jp-tcg-S3a"], kr: ["kr-s3a"],
    krMirror: { "kr-s3a": "jp-tcg-S3a" }, enNative: [], krMirrorAll: true,
  },
  "og-s3": {
    nameKo: "무한존", nameEn: "Infinity Zone",
    jp: ["jp-tcg-S3"], kr: ["kr-s3"],
    krMirror: { "kr-s3": "jp-tcg-S3" }, enNative: [], krMirrorAll: true,
  },
  "og-s4a": {
    nameKo: "샤이니스타V", nameEn: "Shiny Star V",
    jp: ["jp-tcg-S4a"], kr: ["kr-s4a"],
    krMirror: { "kr-s4a": "jp-tcg-S4a" }, enNative: [], krMirrorAll: true,
  },
  "og-s4": {
    nameKo: "앙천의볼트태클", nameEn: "Amazing Volt Tackle",
    jp: ["jp-tcg-S4"], kr: ["kr-s4"],
    krMirror: { "kr-s4": "jp-tcg-S4" }, enNative: [], krMirrorAll: true,
  },
  "og-s5i": {
    nameKo: "일격마스터", nameEn: "Single Strike Master",
    jp: ["jp-tcg-S5I"], kr: ["kr-s5"],
    krMirror: { "kr-s5": "jp-tcg-S5I" }, enNative: [], krMirrorAll: true,
  },
  "og-s5r": {
    nameKo: "연격마스터", nameEn: "Rapid Strike Master",
    jp: ["jp-tcg-S5R"], kr: ["kr-s5r"],
    krMirror: { "kr-s5r": "jp-tcg-S5R" }, enNative: [], krMirrorAll: true,
  },
  "og-s6h": {
    nameKo: "백은의랜스", nameEn: "Silver Lance",
    jp: ["jp-tcg-S6H"], kr: ["kr-s6"],
    krMirror: { "kr-s6": "jp-tcg-S6H" }, enNative: [], krMirrorAll: true,
  },
  "og-s6k": {
    nameKo: "칠흑의가이스트", nameEn: "Jet-Black Spirit",
    jp: ["jp-tcg-S6K"], kr: ["kr-s6k"],
    krMirror: { "kr-s6k": "jp-tcg-S6K" }, enNative: [], krMirrorAll: true,
  },
  "og-s7d": {
    nameKo: "마천퍼펙트", nameEn: "Skyscraping Perfection",
    jp: ["jp-tcg-S7D"], kr: ["kr-s7"],
    krMirror: { "kr-s7": "jp-tcg-S7D" }, enNative: [], krMirrorAll: true,
  },
  "og-s7r": {
    nameKo: "창공스트림", nameEn: "Blue Sky Stream",
    jp: ["jp-tcg-S7R"], kr: ["kr-s7r"],
    krMirror: { "kr-s7r": "jp-tcg-S7R" }, enNative: [], krMirrorAll: true,
  },
  "og-s8": {
    nameKo: "퓨전아츠", nameEn: "Fusion Arts",
    jp: ["jp-tcg-S8"], kr: ["kr-s8"],
    krMirror: { "kr-s8": "jp-tcg-S8" }, enNative: [], krMirrorAll: true,
  },
  "og-s8b": {
    nameKo: "VMAX 클라이맥스", nameEn: "VMAX Climax",
    jp: ["jp-tcg-S8b"], kr: ["kr-s8b"],
    krMirror: { "kr-s8b": "jp-tcg-S8b" }, enNative: [], krMirrorAll: true,
  },
  "og-s9": {
    nameKo: "스타버스", nameEn: "Star Birth",
    jp: ["jp-tcg-S9"], kr: ["kr-s9"],
    krMirror: { "kr-s9": "jp-tcg-S9" }, enNative: [], krMirrorAll: true,
  },
  "og-s9a": {
    nameKo: "배틀리전", nameEn: "Battle Region",
    jp: ["jp-tcg-S9a"], kr: ["kr-s9a"],
    krMirror: { "kr-s9a": "jp-tcg-S9a" }, enNative: [], krMirrorAll: true,
  },
  "og-s10p": {
    nameKo: "스페이스저글러", nameEn: "Space Juggler",
    jp: ["jp-tcg-S10P"], kr: ["kr-s10p"],
    krMirror: { "kr-s10p": "jp-tcg-S10P" }, enNative: [], krMirrorAll: true,
  },
  "og-s10d": {
    nameKo: "타임게이저", nameEn: "Time Gazer",
    jp: ["jp-tcg-S10D"], kr: ["kr-s10"],
    krMirror: { "kr-s10": "jp-tcg-S10D" }, enNative: [], krMirrorAll: true,
  },
  "og-s10a": {
    nameKo: "다크 판타스마", nameEn: "Dark Phantasma",
    jp: ["jp-tcg-S10a"], kr: ["kr-s10a"],
    krMirror: { "kr-s10a": "jp-tcg-S10a" }, enNative: [], krMirrorAll: true,
  },
  "og-s10b": {
    nameKo: "포켓몬 GO", nameEn: "Pokémon GO",
    jp: ["jp-tcg-S10b"], kr: ["kr-s10b"],
    krMirror: { "kr-s10b": "jp-tcg-S10b" }, enNative: [], krMirrorAll: true,
  },
  "og-s11": {
    nameKo: "로스트어비스", nameEn: "Lost Abyss",
    jp: ["jp-tcg-S11"], kr: ["kr-s11"],
    krMirror: { "kr-s11": "jp-tcg-S11" }, enNative: [], krMirrorAll: true,
  },
  "og-s11a": {
    nameKo: "백열의 아르카나", nameEn: "Incandescent Arcana",
    jp: ["jp-tcg-S11a"], kr: ["kr-s11a"],
    krMirror: { "kr-s11a": "jp-tcg-S11a" }, enNative: [], krMirrorAll: true,
  },
  "og-s12": {
    nameKo: "패러다임 트리거", nameEn: "Paradigm Trigger",
    jp: ["jp-tcg-S12"], kr: ["kr-s12"],
    krMirror: { "kr-s12": "jp-tcg-S12" }, enNative: [], krMirrorAll: true,
  },
  "og-s12a": {
    nameKo: "VSTAR 유니버스", nameEn: "VSTAR Universe",
    jp: ["jp-tcg-S12a"], kr: ["kr-s12a"],
    krMirror: { "kr-s12a": "jp-tcg-S12a" }, enNative: [], krMirrorAll: true, // EN(Crown Zenith) 보류 — EN phase에서 enrich 후 연결
  },
};

type Row = {
  cid: string; lcid: string; setId: string; region: string; number: string; numInt: number; name: string;
  image: string | null; dex: number | null; illus: string | null; tier: number | null; subtypes: string; supertype: string | null; rarity: string | null;
};
const sel = {
  id: true, logicalCardId: true, setId: true, region: true, number: true, numberInt: true, name: true, imageSmall: true, imageLarge: true,
  logicalCard: { select: { pokedexNumbers: true, illustrator: true, subtypes: true, supertype: true, rarity: { select: { tier: true, nameKo: true, nameJa: true, nameEn: true, code: true } } } },
} as const;
function toRow(l: any): Row {
  return {
    cid: l.id, lcid: l.logicalCardId, setId: l.setId, region: l.region, number: l.number, numInt: l.numberInt ?? (parseInt(l.number.replace(/\D/g, "")) || 0),
    name: l.name, image: l.imageSmall ?? l.imageLarge ?? null,
    dex: l.logicalCard.pokedexNumbers?.[0] ?? null, illus: l.logicalCard.illustrator,
    tier: l.logicalCard.rarity?.tier ?? null, subtypes: [...(l.logicalCard.subtypes ?? [])].sort().join(","), supertype: l.logicalCard.supertype,
    rarity: l.region === "JP" ? l.logicalCard.rarity?.nameJa ?? l.logicalCard.rarity?.nameEn ?? l.logicalCard.rarity?.code ?? null
      : l.region === "KR" ? l.logicalCard.rarity?.nameKo ?? l.logicalCard.rarity?.nameEn ?? l.logicalCard.rarity?.code ?? null
      : l.logicalCard.rarity?.nameEn ?? l.logicalCard.rarity?.code ?? null,
  };
}
const load = async (setIds: string[]) => (await prisma.cardLocale.findMany({ where: { setId: { in: setIds } }, select: sel })).map(toRow);
const pub = (r: Row | undefined) => r ? { id: r.cid, number: r.number, name: r.name, image: r.image, rarity: r.rarity, setId: r.setId, region: r.region } : null;

const tfp = (r: Row) => `${(r.illus ?? "").trim().toLowerCase()}|${r.tier}|${r.subtypes}`;     // 트레이너 지문
const fpP = (r: Row) => `${r.dex}|${(r.illus ?? "").trim().toLowerCase()}|${r.subtypes}`;       // 포켓몬 dex버킷(tier 제외)
const byNum = (a: Row, b: Row) => a.numInt - b.numInt;
const byTier = (a: Row, b: Row) => (a.tier ?? 0) - (b.tier ?? 0) || a.numInt - b.numInt;

function bucketPair(src: Row[], jp: Row[], srcKey: (r: Row) => string, jpKey: (r: Row) => string, out: Map<string, Row>, cmp: (a: Row, b: Row) => number) {
  const push = (m: Map<string, Row[]>, k: string, v: Row) => { const a = m.get(k) ?? []; a.push(v); m.set(k, a); };
  const jb = new Map<string, Row[]>(); for (const j of jp) push(jb, jpKey(j), j);
  const sb = new Map<string, Row[]>(); for (const s of src) push(sb, srcKey(s), s);
  for (const [k, sl] of sb) {
    const jl = (jb.get(k) ?? []).slice().sort(cmp);
    const ss = sl.slice().sort(cmp);
    const n = Math.min(ss.length, jl.length);
    for (let i = 0; i < n; i++) out.set(jl[i].cid, ss[i]);
  }
}

async function main() {
  const groupId = process.argv[2];
  const cfg = CONFIG[groupId];
  if (!cfg) { console.error(`알 수 없는 groupId. 가능: ${Object.keys(CONFIG).join(", ")}`); process.exit(1); }
  const isPoke = (r: Row) => POKE.includes(r.supertype ?? "") && r.dex != null;

  const jp = await load(cfg.jp);
  const kr = await load(cfg.kr);
  const crossGroup = !cfg.enNative;
  let en: Row[];
  if (cfg.enNative) en = await load(cfg.enNative);
  else {
    const dexes = [...new Set(jp.filter(isPoke).map((r) => r.dex))] as number[];
    en = (await prisma.cardLocale.findMany({ where: { region: "EN", logicalCard: { supertype: { in: POKE }, pokedexNumbers: { hasSome: dexes } } }, select: sel })).map(toRow);
  }

  // ── KR ↔ JP ──
  const krForJp = new Map<string, Row>();
  if (cfg.krMirrorAll) {
    // KR 은 DB 에서 JP 앵커 LC 로 병합됨(공식 번호가 JP 와 달라도 정체성으로 매핑 완료) → 공유 logicalCardId 로 읽음
    const krByLcid = new Map<string, Row>(); for (const k of kr) krByLcid.set(k.lcid, k);
    for (const j of jp) { const k = krByLcid.get(j.lcid); if (k) krForJp.set(j.cid, k); }
  } else {
    const jpByKey = new Map(jp.filter(isPoke).map((r) => [`${r.setId}|${r.number}`, r]));
    for (const k of kr) if (isPoke(k)) { const j = jpByKey.get(`${cfg.krMirror[k.setId]}|${k.number}`); if (j) krForJp.set(j.cid, k); }
    bucketPair(kr.filter((r) => !isPoke(r)), jp.filter((r) => !isPoke(r)), (k) => `${cfg.krMirror[k.setId]}|${tfp(k)}`, (j) => `${j.setId}|${tfp(j)}`, krForJp, byNum);
  }

  // ── EN ↔ JP (포켓몬) ──
  const enForJp = new Map<string, Row>();
  const enUnmatched: Row[] = [];
  if (!crossGroup) {
    bucketPair(en.filter(isPoke), jp.filter(isPoke), fpP, fpP, enForJp, byTier);
    const matchedCids = new Set([...enForJp.values()].map((r) => r.cid));
    const jpDex = new Set(jp.filter(isPoke).map((r) => r.dex));
    for (const e of en) if (isPoke(e) && !matchedCids.has(e.cid)) { if (jpDex.has(e.dex) || true) enUnmatched.push(e); }
  } else {
    // 교차그룹: JP 카드마다 (dex+일러+형태) 같은 EN 중 tier 가장 근접 1장
    const enByBk = new Map<string, Row[]>(); for (const e of en) if (isPoke(e)) { const k = fpP(e); const a = enByBk.get(k) ?? []; a.push(e); enByBk.set(k, a); }
    const used = new Set<string>();
    for (const j of jp.filter(isPoke)) {
      const cands = (enByBk.get(fpP(j)) ?? []).filter((c) => !used.has(c.cid));
      if (!cands.length) continue;
      cands.sort((a, b) => Math.abs((a.tier ?? 0) - (j.tier ?? 0)) - Math.abs((b.tier ?? 0) - (j.tier ?? 0)) || a.setId.localeCompare(b.setId));
      enForJp.set(j.cid, cands[0]); used.add(cands[0].cid);
    }
  }

  // ── 앵커(JP 세트순 → 번호순) ──
  const setOrder = (s: string) => cfg.jp.indexOf(s);
  const anchors = jp.slice().sort((a, b) => setOrder(a.setId) - setOrder(b.setId) || a.numInt - b.numInt).map((j) => ({
    jp: pub(j), en: pub(enForJp.get(j.cid) ?? undefined), kr: pub(krForJp.get(j.cid) ?? undefined), dex: j.dex,
  }));

  // ── 꼬리(영판전용; 교차그룹은 없음) ──
  const jpAllDex = crossGroup ? new Set<number>() : new Set((await prisma.cardLocale.findMany({ where: { region: "JP", logicalCard: { supertype: { in: POKE } } }, select: { logicalCard: { select: { pokedexNumbers: true } } } })).flatMap((l) => l.logicalCard.pokedexNumbers ?? []));
  const seen = new Set<string>();
  const enOnly = (crossGroup ? [] : enUnmatched).filter((e) => (seen.has(e.cid) ? false : (seen.add(e.cid), true)))
    .sort((a, b) => a.numInt - b.numInt)
    .map((e) => ({ ...pub(e), dex: e.dex, jpElsewhere: e.dex != null && jpAllDex.has(e.dex) }));

  const payload = {
    group: { id: groupId, nameKo: cfg.nameKo, nameEn: cfg.nameEn, crossGroupEN: crossGroup },
    counts: { anchors: anchors.length, enMatched: enForJp.size, krMatched: krForJp.size, enOnly: enOnly.length },
    anchors, tail: { enOnly, krOnly: [], enKr: [] },
  };
  mkdirSync(join(process.cwd(), "src", "data"), { recursive: true });
  const out = join(process.cwd(), "src", "data", `group-${groupId}.json`);
  writeFileSync(out, JSON.stringify(payload, null, 2));
  console.log(`✅ ${out}`);
  console.log(`[${groupId}] 앵커 ${anchors.length} | EN매칭 ${enForJp.size}${crossGroup ? "(교차그룹)" : ""} | KR매칭 ${krForJp.size} | 영판전용 ${enOnly.length}`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
