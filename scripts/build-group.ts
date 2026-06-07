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

type Cfg = { nameKo: string; nameEn: string; jp: string[]; kr: string[]; krMirror: Record<string, string>; enNative: string[] | null; krMirrorAll?: boolean; enMerged?: boolean; enAnchor?: boolean; krMerged?: boolean };
// krMerged: KR 이 DB 에서 JP/EN 앵커 LC 로 정체성 병합됨(크로스그룹 합본 KR — DP 한국판 kr-bs 등) → setGroupId 스코프로 추가 로드(enMerged 의 KR 대칭).
// enMerged: EN 이 DB 에서 JP LC 로 정체성 병합됨(merge-en-identity) → 공유 lcid 로 읽음, 미병합 EN 은 영판전용 섹션.
// krMirrorAll: KR 세트가 JP 정수번호 완전미러(트레이너 포함)일 때 true — 모든 카드 번호로 매칭.
//   (일반 KR은 트레이너 번호가 JP와 어긋나 일러스트레이터 페어링 필요 → false/미지정)
const CONFIG: Record<string, Cfg> = {
  "sv-base": {
    nameKo: "스칼렛 ex", nameEn: "Scarlet ex",
    jp: ["jp-tcg-SV1S"], kr: ["kr-sv1s"],
    krMirror: { "kr-sv1s": "jp-tcg-SV1S" }, enNative: ["sv1"], krMirrorAll: true, enMerged: true, // 2026-06-06 JP단위 분할(합본=EN기준이었음); EN=Scarlet & Violet 합본, 영판전용 여기 귀속
  },
  "sv-violet-ex": {
    nameKo: "바이올렛 ex", nameEn: "Violet ex",
    jp: ["jp-tcg-SV1V"], kr: ["kr-sv1v"],
    krMirror: { "kr-sv1v": "jp-tcg-SV1V" }, enNative: ["sv1"], krMirrorAll: true, enMerged: true,
  },
  "sv-triplet-beat": {
    nameKo: "트리플렛비트", nameEn: "Triplet Beat",
    jp: ["jp-sv-triplet-beat"], kr: ["kr-sv1a"],
    krMirror: { "kr-sv1a": "jp-sv-triplet-beat" }, enNative: null, // EN 네이티브 없음 → 교차그룹
  },
  "sv-paldea-evolved": {
    nameKo: "클레이버스트", nameEn: "Clay Burst",
    jp: ["jp-tcg-SV2D"], kr: ["kr-sv2d"],
    krMirror: { "kr-sv2d": "jp-tcg-SV2D" }, enNative: ["sv2"], krMirrorAll: true, enMerged: true, // 2026-06-06 JP단위 분할; EN=Paldea Evolved 합본, 영판전용 여기 귀속
  },
  "sv-snow-hazard": {
    nameKo: "스노해저드", nameEn: "Snow Hazard",
    jp: ["jp-tcg-SV2P"], kr: ["kr-sv2p"],
    krMirror: { "kr-sv2p": "jp-tcg-SV2P" }, enNative: ["sv2"], krMirrorAll: true, enMerged: true,
  },
  "sv-paradox-rift": {
    nameKo: "고대의 포효", nameEn: "Ancient Roar",
    jp: ["jp-tcg-SV4K"], kr: ["kr-sv4k"],
    krMirror: { "kr-sv4k": "jp-tcg-SV4K" }, enNative: ["sv4"], krMirrorAll: true, enMerged: true, // 2026-06-06 JP단위 분할; EN=Paradox Rift 합본, 영판전용 여기 귀속
  },
  "sv-future-flash": {
    nameKo: "미래의 일섬", nameEn: "Future Flash",
    jp: ["jp-tcg-SV4M"], kr: ["kr-sv4m"],
    krMirror: { "kr-sv4m": "jp-tcg-SV4M" }, enNative: ["sv4"], krMirrorAll: true, enMerged: true,
  },
  "sv-151": {
    nameKo: "포켓몬 카드 151", nameEn: "151",
    jp: ["jp-sv-151"], kr: ["kr-sv-151"],
    krMirror: { "kr-sv-151": "jp-sv-151" }, enNative: ["sv3pt5"], krMirrorAll: true, enMerged: true,
  },
  "sv-obsidian-flames": {
    nameKo: "흑염의 지배자", nameEn: "Obsidian Flames",
    jp: ["jp-sv-obsidian-flames"], kr: ["kr-sv3"],
    krMirror: { "kr-sv3": "jp-sv-obsidian-flames" }, enNative: ["sv3"], krMirrorAll: true, enMerged: true,
  },
  "sv-raging-surf": {
    nameKo: "레이징서프", nameEn: "Raging Surf",
    jp: ["jp-sv-raging-surf"], kr: ["kr-sv3a"],
    krMirror: { "kr-sv3a": "jp-sv-raging-surf" }, enNative: null, krMirrorAll: true, // EN 네이티브 없음 → 교차그룹
  },
  "sv-paldean-fates": {
    nameKo: "샤이니트레저 ex", nameEn: "Paldean Fates",
    jp: ["jp-sv-paldean-fates"], kr: ["kr-sv4a"],
    krMirror: { "kr-sv4a": "jp-sv-paldean-fates" }, enNative: ["sv4pt5"], krMirrorAll: true, enMerged: true, // EN-merge(204매칭·영판전용 41)
  },
  "sv-temporal-forces": {
    nameKo: "와일드포스", nameEn: "Wild Force",
    jp: ["jp-tcg-SV5K"], kr: ["kr-sv5k"],
    krMirror: { "kr-sv5k": "jp-tcg-SV5K" }, enNative: ["sv5"], krMirrorAll: true, enMerged: true, // 2026-06-06 JP단위 분할; EN=Temporal Forces 합본, 영판전용 여기 귀속
  },
  "sv-cyber-judge": {
    nameKo: "사이버저지", nameEn: "Cyber Judge",
    jp: ["jp-tcg-SV5M"], kr: ["kr-sv5m"],
    krMirror: { "kr-sv5m": "jp-tcg-SV5M" }, enNative: ["sv5"], krMirrorAll: true, enMerged: true,
  },
  "sv-crimson-haze": {
    nameKo: "크림슨헤이즈", nameEn: "Crimson Haze",
    jp: ["jp-sv-crimson-haze"], kr: ["kr-sv5a"],
    krMirror: { "kr-sv5a": "jp-sv-crimson-haze" }, enNative: null, krMirrorAll: true, // EN 네이티브 없음 → 교차그룹
  },
  "sv-twilight-masquerade": {
    nameKo: "변환의 가면", nameEn: "Twilight Masquerade",
    jp: ["jp-sv-twilight-masquerade"], kr: ["kr-sv6"],
    krMirror: { "kr-sv6": "jp-sv-twilight-masquerade" }, enNative: ["sv6"], krMirrorAll: true, enMerged: true, // EN-merge(122매칭·영판전용 104)
  },
  "sv-shrouded-fable": {
    nameKo: "나이트원더러", nameEn: "Shrouded Fable",
    jp: ["jp-sv-shrouded-fable"], kr: ["kr-sv6a"],
    krMirror: { "kr-sv6a": "jp-sv-shrouded-fable" }, enNative: ["sv6pt5"], krMirrorAll: true, enMerged: true,
  },
  "sv-stellar-crown": {
    nameKo: "스텔라미라클", nameEn: "Stellar Crown",
    jp: ["jp-sv-stellar-crown"], kr: ["kr-sv7"],
    krMirror: { "kr-sv7": "jp-sv-stellar-crown" }, enNative: ["sv7"], krMirrorAll: true, enMerged: true,
  },
  "sv-paradise-dragona": {
    nameKo: "낙원드래고나", nameEn: "Paradise Dragona",
    jp: ["jp-sv-paradise-dragona"], kr: ["kr-sv7a"],
    krMirror: { "kr-sv7a": "jp-sv-paradise-dragona" }, enNative: null, krMirrorAll: true, // EN 네이티브 없음 → 교차그룹
  },
  "sv-surging-sparks": {
    nameKo: "초전브레이커", nameEn: "Surging Sparks",
    jp: ["jp-sv-surging-sparks"], kr: ["kr-sv8"],
    krMirror: { "kr-sv8": "jp-sv-surging-sparks" }, enNative: ["sv8"], krMirrorAll: true, enMerged: true, // EN-merge(116매칭·영판전용 136)
  },
  "sv-prismatic-evolutions": {
    nameKo: "테라스탈 페스타 ex", nameEn: "Prismatic Evolutions",
    jp: ["jp-sv-prismatic-evolutions"], kr: ["kr-sv8a"],
    krMirror: { "kr-sv8a": "jp-sv-prismatic-evolutions" }, enNative: ["sv8pt5"], krMirrorAll: true, enMerged: true,
  },
  "sv-journey-together": {
    nameKo: "배틀파트너즈", nameEn: "Journey Together",
    jp: ["jp-sv-journey-together"], kr: ["kr-sv9"],
    krMirror: { "kr-sv9": "jp-sv-journey-together" }, enNative: ["sv9"], krMirrorAll: true, enMerged: true,
  },
  "sv-heatwave-arena": {
    nameKo: "열풍의 아레나", nameEn: "Heat Wave Arena",
    jp: ["jp-sv-heatwave-arena"], kr: ["kr-sv9a"],
    krMirror: { "kr-sv9a": "jp-sv-heatwave-arena" }, enNative: null, krMirrorAll: true, // EN 네이티브 없음 → 교차그룹
  },
  "sv-destined-rivals": {
    nameKo: "로켓단의 영광", nameEn: "Destined Rivals",
    jp: ["jp-sv-destined-rivals"], kr: ["kr-sv10"],
    krMirror: { "kr-sv10": "jp-sv-destined-rivals" }, enNative: ["sv10"], krMirrorAll: true, enMerged: true, // EN-merge(111매칭·영판전용 133=SAR시크릿+로켓단트레이너19 사전미등록)
  },
  "sv-black-bolt-white-flare": {
    nameKo: "블랙볼트", nameEn: "Black Bolt",
    jp: ["jp-tcg-SV11B"], kr: ["kr-sv11b"],
    krMirror: { "kr-sv11b": "jp-tcg-SV11B" }, enNative: ["zsv10pt5"], krMirrorAll: true, enMerged: true, // 2026-06-06 JP단위 분할; EN도 분리발매(zsv10pt5 1:1)
  },
  "sv-white-flare": {
    nameKo: "화이트플레어", nameEn: "White Flare",
    jp: ["jp-tcg-SV11W"], kr: ["kr-sv11w"],
    krMirror: { "kr-sv11w": "jp-tcg-SV11W" }, enNative: ["rsv10pt5"], krMirrorAll: true, enMerged: true, // EN rsv10pt5 1:1
  },
  // ── MEGA ──
  "mega-brave-symphonia": {
    nameKo: "메가브레이브", nameEn: "Mega Brave",
    jp: ["jp-tcg-M1L"], kr: ["kr-m1l"],
    krMirror: { "kr-m1l": "jp-tcg-M1L" }, enNative: ["en-tcg-me1"], krMirrorAll: true, enMerged: true, // 2026-06-06 JP단위 분할; EN=Mega Evolution(me1 합본·주귀속, 91+91 분산 — 2026-06-07), 영판전용 여기 귀속
  },
  "mega-symphonia": {
    nameKo: "메가심포니아", nameEn: "Mega Symphonia",
    jp: ["jp-tcg-M1S"], kr: ["kr-m1s"],
    krMirror: { "kr-m1s": "jp-tcg-M1S" }, enNative: ["en-tcg-me1"], krMirrorAll: true, enMerged: true, // EN=Mega Evolution(me1 합본)
  },
  "mega-infernox": {
    nameKo: "인페르노X", nameEn: "Inferno X",
    jp: ["jp-mega-infernox"], kr: ["kr-m2"],
    krMirror: { "kr-m2": "jp-mega-infernox" }, enNative: ["en-tcg-me2"], krMirrorAll: true, enMerged: true, // EN=Phantasmal Flames(합본·주귀속) — 인페르노X 110 + MBD/MBG 18 분산 병합(2026-06-07)
  },
  "mega-dream-ex": { // EN=Ascended Heroes(me2pt5 합본·주귀속) — 메가드림 190 + MC 98 분산 병합(2026-06-07), 영판전용 orphan 여기 귀속
    nameKo: "메가드림 ex", nameEn: "Mega Dream ex",
    jp: ["jp-mega-dream-ex"], kr: ["kr-m2a"],
    krMirror: { "kr-m2a": "jp-mega-dream-ex" }, enNative: ["en-tcg-me2pt5"], krMirrorAll: true, enMerged: true,
  },
  "mega-munikisuzero": {
    nameKo: "니힐제로", nameEn: "Nihil Zero",
    jp: ["jp-mega-munikisuzero"], kr: ["kr-m3"],
    krMirror: { "kr-m3": "jp-mega-munikisuzero" }, enNative: ["en-tcg-me3"], krMirrorAll: true, enMerged: true, // EN=Perfect Order(바레 me3 승격, 병합 116/124 — 2026-06-07)
  },
  "mega-ninja-spinner": {
    nameKo: "닌자스피너", nameEn: "Ninja Spinner",
    jp: ["jp-mega-ninja-spinner"], kr: ["kr-m4"],
    krMirror: { "kr-m4": "jp-mega-ninja-spinner" }, enNative: ["en-tcg-me4"], krMirrorAll: true, enMerged: true, // EN=Chaos Rising(me4, 2026-05-22) 2026-06-07 병합
  },
  "mega-abyss-eye": {
    nameKo: "아비스아이", nameEn: "Abyss Eye",
    jp: ["jp-mega-abyss-eye"], kr: [],
    krMirror: {}, enNative: [], krMirrorAll: true,
  },
  // ── DP 구축덱 (2026-06-07 정본화; st2/st3 = JP 미게재 KR 전용 페어 → krOnly 꼬리) ──
  "dp-decks": {
    nameKo: "DP 구축덱", nameEn: "DP Starter Decks",
    jp: ["jp-tcg-DPST1"], kr: ["kr-st1", "kr-st2", "kr-st3"],
    krMirror: {}, enNative: [], krMirrorAll: true, krMerged: true, // KR 3종 전부 독자 재구성(BS 패턴) → krOnly 꼬리
  },
  // ── BW 구축덱 (2026-06-07 정본화) ──
  "bw-decks": {
    nameKo: "BW 구축덱", nameEn: "BW Starter & Battle Decks",
    jp: ["jp-tcg-BWFS", "jp-tcg-BGV", "jp-tcg-BGT", "jp-tcg-BGC", "jp-tcg-BGREX", "jp-tcg-BGZ2", "jp-tcg-TD2", "jp-tcg-BD2", "jp-tcg-SBD", "jp-tcg-GBD", "jp-tcg-KD2", "jp-tcg-PD2", "jp-tcg-BGB2", "jp-tcg-BGW2", "jp-tcg-PSS2", "jp-tcg-GK", "jp-tcg-MG"],
    kr: ["kr-fs", "kr-bg_virizion", "kr-bg_terrakion", "kr-bg_cobalon", "kr-bgrex", "kr-bgz", "kr-td", "kr-bd", "kr-sbd", "kr-gbd", "kr-kd", "kr-pd", "kr-bgb", "kr-bgw", "kr-pss", "kr-g+k", "kr-mg"],
    krMirror: { "kr-fs": "jp-tcg-BWFS", "kr-bg_virizion": "jp-tcg-BGV", "kr-bg_terrakion": "jp-tcg-BGT", "kr-bg_cobalon": "jp-tcg-BGC", "kr-bgrex": "jp-tcg-BGREX", "kr-bgz": "jp-tcg-BGZ2", "kr-td": "jp-tcg-TD2", "kr-bd": "jp-tcg-BD2", "kr-sbd": "jp-tcg-SBD", "kr-gbd": "jp-tcg-GBD", "kr-kd": "jp-tcg-KD2", "kr-pd": "jp-tcg-PD2", "kr-bgb": "jp-tcg-BGB2", "kr-bgw": "jp-tcg-BGW2", "kr-pss": "jp-tcg-PSS2", "kr-g+k": "jp-tcg-GK", "kr-mg": "jp-tcg-MG" },
    enNative: [], krMirrorAll: true,
  },
  // ── XY 구축덱 (2026-06-07 정본화; EN=Kalos Starter(xy0)만 존재 — jp-tcg-XY0에 병합) ──
  "xy-decks": {
    nameKo: "XY 구축덱", nameEn: "XY Starter & Battle Decks",
    jp: ["jp-tcg-XY0", "jp-tcg-XY30", "jp-tcg-XY30B", "jp-tcg-XYA", "jp-tcg-XYB", "jp-tcg-XYC", "jp-tcg-XYD", "jp-tcg-XYE", "jp-tcg-RBD", "jp-tcg-UBD", "jp-tcg-XYF", "jp-tcg-XYG", "jp-tcg-XYH"],
    kr: ["kr-fxy", "kr-xy30", "kr-xy30b", "kr-xya", "kr-xyb", "kr-xyc", "kr-xyd", "kr-xye", "kr-rbd", "kr-ubd", "kr-xyf", "kr-xyg", "kr-xyh"],
    krMirror: { "kr-fxy": "jp-tcg-XY0", "kr-xy30": "jp-tcg-XY30", "kr-xy30b": "jp-tcg-XY30B", "kr-xya": "jp-tcg-XYA", "kr-xyb": "jp-tcg-XYB", "kr-xyc": "jp-tcg-XYC", "kr-xyd": "jp-tcg-XYD", "kr-xye": "jp-tcg-XYE", "kr-rbd": "jp-tcg-RBD", "kr-ubd": "jp-tcg-UBD", "kr-xyf": "jp-tcg-XYF", "kr-xyg": "jp-tcg-XYG", "kr-xyh": "jp-tcg-XYH" },
    enNative: ["en-tcg-xy0"], krMirrorAll: true, enMerged: true,
  },
  // ── SM 구축덱 (2026-06-06 정본화; sm30a/60a/60b = KR 전용 재구성 → krOnly 꼬리) ──
  "sm-decks": {
    nameKo: "썬·문 구축덱", nameEn: "SM Starter & Battle Decks",
    jp: ["jp-tcg-SMA", "jp-tcg-SMC", "jp-tcg-SMD", "jp-tcg-SME", "jp-tcg-SM30A", "jp-tcg-SMI", "jp-tcg-SMN", "jp-tcg-SMNP", "jp-tcg-SML", "jp-tcg-SMK", "jp-tcg-SMM"],
    kr: ["kr-sma", "kr-smc", "kr-smd", "kr-sme", "kr-sm30a", "kr-smi", "kr-smn", "kr-sml_", "kr-smk", "kr-smm", "kr-sm60a", "kr-sm60b"],
    krMirror: { "kr-sma": "jp-tcg-SMA", "kr-smc": "jp-tcg-SMC", "kr-smd": "jp-tcg-SMD", "kr-sme": "jp-tcg-SME", "kr-smi": "jp-tcg-SMI", "kr-smn": "jp-tcg-SMN", "kr-sml_": "jp-tcg-SML", "kr-smk": "jp-tcg-SMK", "kr-smm": "jp-tcg-SMM" },
    enNative: [], krMirrorAll: true,
  },
  // ── SWSH 구축덱/강화상품/스타트덱100 (2026-06-06 정본화; EN 상품 없음) ──
  "swsh-decks": {
    nameKo: "소드실드 구축덱", nameEn: "SWSH Starter & Battle Decks",
    jp: ["jp-tcg-SA", "jp-tcg-SD", "jp-tcg-SEF", "jp-tcg-SEK", "jp-tcg-SGG", "jp-tcg-SGI", "jp-tcg-SH", "jp-tcg-SJ", "jp-tcg-SLL", "jp-tcg-SLD", "jp-tcg-SPZ", "jp-tcg-SPD", "jp-tcg-SO"],
    kr: ["kr-sa", "kr-sd", "kr-se", "kr-seb", "kr-sgg", "kr-sg", "kr-sh", "kr-sj", "kr-sl", "kr-sld", "kr-spz", "kr-spd", "kr-so"],
    krMirror: { "kr-sa": "jp-tcg-SA", "kr-sd": "jp-tcg-SD", "kr-se": "jp-tcg-SEF", "kr-seb": "jp-tcg-SEK", "kr-sgg": "jp-tcg-SGG", "kr-sg": "jp-tcg-SGI", "kr-sh": "jp-tcg-SH", "kr-sj": "jp-tcg-SJ", "kr-sl": "jp-tcg-SLL", "kr-sld": "jp-tcg-SLD", "kr-spz": "jp-tcg-SPZ", "kr-spd": "jp-tcg-SPD", "kr-so": "jp-tcg-SO" },
    enNative: [], krMirrorAll: true,
  },
  "swsh-goods": {
    nameKo: "소드실드 기타 강화상품", nameEn: "SWSH Enhancement Products",
    jp: ["jp-tcg-SB", "jp-tcg-SP1", "jp-tcg-SP2", "jp-tcg-SP3", "jp-tcg-SP4", "jp-tcg-SP5", "jp-tcg-SP6"],
    kr: ["kr-sb", "kr-sp1", "kr-sp2", "kr-sp3", "kr-sp4", "kr-sp5", "kr-sp6"],
    krMirror: { "kr-sb": "jp-tcg-SB", "kr-sp1": "jp-tcg-SP1", "kr-sp2": "jp-tcg-SP2", "kr-sp3": "jp-tcg-SP3", "kr-sp4": "jp-tcg-SP4", "kr-sp5": "jp-tcg-SP5", "kr-sp6": "jp-tcg-SP6" },
    enNative: [], krMirrorAll: true, // kr-sp1 에너지 1장 = KR 전용 꼬리
  },
  "swsh-start-deck-100": {
    nameKo: "스타트 덱 100", nameEn: "Start Deck 100",
    jp: ["jp-tcg-SI", "jp-tcg-SN"], kr: ["kr-si", "kr-sn"],
    krMirror: { "kr-si": "jp-tcg-SI", "kr-sn": "jp-tcg-SN" }, enNative: [], krMirrorAll: true,
  },
  // ── SV 구축덱/강화상품 (2026-06-06 정본화; EN 상품 없음 — 신규분은 sv3/sv9/sv10/svp 분산 수록) ──
  "sv-decks": {
    nameKo: "SV 구축덱", nameEn: "SV Starter & Battle Decks",
    jp: ["jp-tcg-SVAM", "jp-tcg-SVAL", "jp-tcg-SVAW", "jp-tcg-SVC", "jp-tcg-SVEM", "jp-tcg-SVEL", "jp-tcg-SVG", "jp-tcg-SVHK", "jp-tcg-SVHM", "jp-tcg-SVI", "jp-tcg-SVJL", "jp-tcg-SVJP", "jp-tcg-SVLN", "jp-tcg-SVLS", "jp-tcg-SVOM", "jp-tcg-SVOD"],
    kr: ["kr-sva", "kr-sval", "kr-svc", "kr-svem", "kr-svel", "kr-svg", "kr-svhk", "kr-svhm", "kr-svi", "kr-svjl", "kr-svjp", "kr-svln", "kr-svls", "kr-svom", "kr-svod"],
    krMirror: { "kr-sva": "jp-tcg-SVAW", "kr-sval": "jp-tcg-SVAL", "kr-svc": "jp-tcg-SVC", "kr-svem": "jp-tcg-SVEM", "kr-svel": "jp-tcg-SVEL", "kr-svg": "jp-tcg-SVG", "kr-svhk": "jp-tcg-SVHK", "kr-svhm": "jp-tcg-SVHM", "kr-svi": "jp-tcg-SVI", "kr-svjl": "jp-tcg-SVJL", "kr-svjp": "jp-tcg-SVJP", "kr-svln": "jp-tcg-SVLN", "kr-svls": "jp-tcg-SVLS", "kr-svom": "jp-tcg-SVOM", "kr-svod": "jp-tcg-SVOD" },
    enNative: [], krMirrorAll: true, // JP SVAM 은 KR 미러 없음(KR 미발매 — 꾸왁스·호게타만), SVI=배틀아카데미(JP·KR 동코드)
  },
  "sv-goods": {
    nameKo: "SV 기타 강화상품", nameEn: "SV Enhancement Products",
    jp: ["jp-tcg-SVB", "jp-tcg-SVP1", "jp-tcg-SVF", "jp-tcg-SVK", "jp-tcg-SVN"],
    kr: ["kr-svb", "kr-svp1", "kr-svp2", "kr-svf", "kr-svk", "kr-svn"],
    krMirror: { "kr-svb": "jp-tcg-SVB", "kr-svp1": "jp-tcg-SVP1", "kr-svf": "jp-tcg-SVF", "kr-svk": "jp-tcg-SVK", "kr-svn": "jp-tcg-SVN" },
    enNative: [], krMirrorAll: true, // kr-svp2 = JP 부재(KR 전용) → 한국판 전용 꼬리
  },
  "sv-ex-start-deck": {
    nameKo: "ex 스타트 덱", nameEn: "ex Start Deck",
    jp: ["jp-tcg-SVD"], kr: ["kr-svd"],
    krMirror: { "kr-svd": "jp-tcg-SVD" }, enNative: [], krMirrorAll: true,
  },
  "sv-start-deck-generations": {
    nameKo: "랜덤 스타트 덱 Generations", nameEn: "Start Deck Generations",
    jp: ["jp-tcg-SVM"], kr: ["kr-svm"],
    krMirror: { "kr-svm": "jp-tcg-SVM" }, enNative: [], krMirrorAll: true,
  },
  // ── MEGA 구축덱/강화상품 (JP·KR 1:1, EN 상품 없음 — 신규분은 me2/me2pt5 분산 수록) ──
  "mega-start-deck-100": {
    nameKo: "스타트 덱 100 배틀컬렉션", nameEn: "Start Deck 100 Battle Collection",
    jp: ["jp-tcg-MC"], kr: ["kr-mc"],
    krMirror: { "kr-mc": "jp-tcg-MC" }, enNative: ["en-tcg-me2pt5"], krMirrorAll: true, enMerged: true, // MC 신규분 98이 me2pt5(Ascended Heroes)로 병합 — setGroupId 스코프 로드라 자동 분배
  },
  "mega-decks": {
    nameKo: "MEGA 구축덱", nameEn: "MEGA Starter Sets",
    jp: ["jp-tcg-MBD", "jp-tcg-MBG"], kr: ["kr-mbd", "kr-mbg"],
    krMirror: { "kr-mbd": "jp-tcg-MBD", "kr-mbg": "jp-tcg-MBG" }, enNative: ["en-tcg-me2"], krMirrorAll: true, enMerged: true, // MBD/MBG 신규분 18이 me2(Phantasmal Flames)로 병합
  },
  "mega-goods": {
    nameKo: "MEGA 기타 강화상품", nameEn: "MEGA Premium Trainer Box",
    jp: ["jp-tcg-MA"], kr: ["kr-ma"],
    krMirror: { "kr-ma": "jp-tcg-MA" }, enNative: [], krMirrorAll: true,
  },
  // ── SWSH (역순 진행) ──
  "og-s1a": {
    nameKo: "VMAX라이징", nameEn: "VMAX Rising",
    jp: ["jp-tcg-S1a"], kr: ["kr-s1a"],
    krMirror: { "kr-s1a": "jp-tcg-S1a" }, enNative: ["en-tcg-swsh2"], krMirrorAll: true, enMerged: true, // EN=Rebel Clash(S2+S1a 합본, 배치11 병합)
  },
  "og-s1h": {
    nameKo: "실드", nameEn: "Shield",
    jp: ["jp-tcg-S1H"], kr: ["kr-s1h"],
    krMirror: { "kr-s1h": "jp-tcg-S1H" }, enNative: ["en-tcg-swsh1"], krMirrorAll: true, enMerged: true, // EN=Sword & Shield base(S1W+S1H 합본, 배치11 병합)
  },
  "og-s1w": {
    nameKo: "소드", nameEn: "Sword",
    jp: ["jp-tcg-S1W"], kr: ["kr-s1w"],
    krMirror: { "kr-s1w": "jp-tcg-S1W" }, enNative: ["en-tcg-swsh1"], krMirrorAll: true, enMerged: true, // EN=Sword & Shield base(S1W+S1H 합본 병합); 영판전용 81 여기 귀속
  },
  "og-s2": {
    nameKo: "반역크래시", nameEn: "Rebel Clash",
    jp: ["jp-tcg-S2"], kr: ["kr-s2"],
    krMirror: { "kr-s2": "jp-tcg-S2" }, enNative: ["en-tcg-swsh2"], krMirrorAll: true, enMerged: true, // EN=Rebel Clash(S2+S1a 합본 병합); 영판전용 15 여기 귀속
  },
  "og-s2a": {
    nameKo: "폭염워커", nameEn: "Explosive Walker",
    jp: ["jp-tcg-S2a"], kr: ["kr-s2a"],
    krMirror: { "kr-s2a": "jp-tcg-S2a" }, enNative: ["en-tcg-swsh3"], krMirrorAll: true, enMerged: true, // EN=Darkness Ablaze(S3+S2a 합본, 배치11 병합); 영판전용 26 여기 귀속
  },
  "og-s3a": {
    nameKo: "전설의고동", nameEn: "Legendary Heartbeat",
    jp: ["jp-tcg-S3a"], kr: ["kr-s3a"],
    krMirror: { "kr-s3a": "jp-tcg-S3a" }, enNative: ["en-tcg-swsh4"], krMirrorAll: true, enMerged: true, // EN=Vivid Voltage(S4+S3a 합본, 배치11); 영판전용 31 여기 귀속
  },
  "og-s3": {
    nameKo: "무한존", nameEn: "Infinity Zone",
    jp: ["jp-tcg-S3"], kr: ["kr-s3"],
    krMirror: { "kr-s3": "jp-tcg-S3" }, enNative: ["en-tcg-swsh3"], krMirrorAll: true, enMerged: true, // EN=Darkness Ablaze(S3+S2a 합본 병합)
  },
  "og-s4a": {
    nameKo: "샤이니스타V", nameEn: "Shiny Star V",
    jp: ["jp-tcg-S4a"], kr: ["kr-s4a"],
    krMirror: { "kr-s4a": "jp-tcg-S4a" }, enNative: [], krMirrorAll: true,
  },
  "og-s4": {
    nameKo: "앙천의볼트태클", nameEn: "Amazing Volt Tackle",
    jp: ["jp-tcg-S4"], kr: ["kr-s4"],
    krMirror: { "kr-s4": "jp-tcg-S4" }, enNative: ["en-tcg-swsh4"], krMirrorAll: true, enMerged: true, // EN=Vivid Voltage(S4+S3a 합본 병합)
  },
  "og-s5i": {
    nameKo: "일격마스터", nameEn: "Single Strike Master",
    jp: ["jp-tcg-S5I"], kr: ["kr-s5"],
    krMirror: { "kr-s5": "jp-tcg-S5I" }, enNative: ["en-tcg-swsh5"], krMirrorAll: true, enMerged: true, // EN=Battle Styles(S5I+S5R 합본, 배치11); 영판전용 36 여기 귀속
  },
  "og-s5r": {
    nameKo: "연격마스터", nameEn: "Rapid Strike Master",
    jp: ["jp-tcg-S5R"], kr: ["kr-s5r"],
    krMirror: { "kr-s5r": "jp-tcg-S5R" }, enNative: ["en-tcg-swsh5"], krMirrorAll: true, enMerged: true, // EN=Battle Styles(S5I+S5R 합본 병합)
  },
  "og-s5a": {
    nameKo: "쌍벽의 파이터", nameEn: "Matchless Fighters",
    jp: ["jp-tcg-S5a"], kr: ["kr-s5a"],
    krMirror: { "kr-s5a": "jp-tcg-S5a" }, enNative: ["en-tcg-swsh6"], krMirrorAll: true, enMerged: true, // EN=Chilling Reign(S6H+S6K+S5a 합본 병합)
  },
  "og-s6h": {
    nameKo: "백은의랜스", nameEn: "Silver Lance",
    jp: ["jp-tcg-S6H"], kr: ["kr-s6"],
    krMirror: { "kr-s6": "jp-tcg-S6H" }, enNative: ["en-tcg-swsh6"], krMirrorAll: true, enMerged: true, // EN=Chilling Reign(S6H+S6K+S5a 합본, 배치11); 영판전용 21 여기 귀속
  },
  "og-s6k": {
    nameKo: "칠흑의가이스트", nameEn: "Jet-Black Spirit",
    jp: ["jp-tcg-S6K"], kr: ["kr-s6k"],
    krMirror: { "kr-s6k": "jp-tcg-S6K" }, enNative: ["en-tcg-swsh6"], krMirrorAll: true, enMerged: true, // EN=Chilling Reign(합본 병합)
  },
  "og-s7d": {
    nameKo: "마천퍼펙트", nameEn: "Skyscraping Perfection",
    jp: ["jp-tcg-S7D"], kr: ["kr-s7"],
    krMirror: { "kr-s7": "jp-tcg-S7D" }, enNative: ["en-tcg-swsh7"], krMirrorAll: true, enMerged: true, // EN=Evolving Skies(S7R+S7D+S6a 합본 병합)
  },
  "og-s7r": {
    nameKo: "창공스트림", nameEn: "Blue Sky Stream",
    jp: ["jp-tcg-S7R"], kr: ["kr-s7r"],
    krMirror: { "kr-s7r": "jp-tcg-S7R" }, enNative: ["en-tcg-swsh7"], krMirrorAll: true, enMerged: true, // EN=Evolving Skies(S7R+S7D+S6a 합본, 배치12); 영판전용 62 여기 귀속
  },
  "og-s6a": {
    nameKo: "이브이 히어로즈", nameEn: "Eevee Heroes",
    jp: ["jp-tcg-S6a"], kr: ["kr-s6a"],
    krMirror: { "kr-s6a": "jp-tcg-S6a" }, enNative: ["en-tcg-swsh7"], krMirrorAll: true, enMerged: true, // EN=Evolving Skies(S7R+S7D+S6a 합본 병합)
  },
  "og-s8a": {
    nameKo: "25th 아니버서리 컬렉션", nameEn: "25th Anniversary Collection",
    jp: ["jp-tcg-S8a"], kr: ["kr-s8a"],
    krMirror: { "kr-s8a": "jp-tcg-S8a" }, enNative: ["en-tcg-cel25"], krMirrorAll: true, enMerged: true, // EN=Celebrations(cel25, 22매칭·영판전용 3)
  },
  "og-s8a-g": {
    nameKo: "25th 골든박스", nameEn: "25th Anniversary Golden Box",
    jp: ["jp-tcg-S8a-G"], kr: ["kr-s8a-g"],
    krMirror: { "kr-s8a-g": "jp-tcg-S8a-G" }, enNative: [], krMirrorAll: true,
  },
  "og-s8": {
    nameKo: "퓨전아츠", nameEn: "Fusion Arts",
    jp: ["jp-tcg-S8"], kr: ["kr-s8"],
    krMirror: { "kr-s8": "jp-tcg-S8" }, enNative: ["en-tcg-swsh8"], krMirrorAll: true, enMerged: true, // EN=Fusion Strike(S8 단독, 배치12); EN 284≫JP 129 영판전용 160 여기 귀속
  },
  "og-s8b": {
    nameKo: "VMAX 클라이맥스", nameEn: "VMAX Climax",
    jp: ["jp-tcg-S8b"], kr: ["kr-s8b"],
    krMirror: { "kr-s8b": "jp-tcg-S8b" }, enNative: [], krMirrorAll: true,
  },
  "og-s9": {
    nameKo: "스타버스", nameEn: "Star Birth",
    jp: ["jp-tcg-S9"], kr: ["kr-s9"],
    krMirror: { "kr-s9": "jp-tcg-S9" }, enNative: ["en-tcg-swsh9"], krMirrorAll: true, enMerged: true, // EN=Brilliant Stars(1:1 병합 126); 영판전용 60(TG갤러리·타세트+트레이너 사전미등록)
  },
  "og-s9a": {
    nameKo: "배틀리전", nameEn: "Battle Region",
    jp: ["jp-tcg-S9a"], kr: ["kr-s9a"],
    krMirror: { "kr-s9a": "jp-tcg-S9a" }, enNative: [], krMirrorAll: true,
  },
  "og-s10p": {
    nameKo: "스페이스저글러", nameEn: "Space Juggler",
    jp: ["jp-tcg-S10P"], kr: ["kr-s10p"],
    krMirror: { "kr-s10p": "jp-tcg-S10P" }, enNative: ["en-tcg-swsh10"], krMirrorAll: true, enMerged: true, // EN=Astral Radiance(S10P+S10D 합본 병합); 매칭 EN 여기 귀속
  },
  "og-s10d": {
    nameKo: "타임게이저", nameEn: "Time Gazer",
    jp: ["jp-tcg-S10D"], kr: ["kr-s10"],
    krMirror: { "kr-s10": "jp-tcg-S10D" }, enNative: ["en-tcg-swsh10"], krMirrorAll: true, enMerged: true, // EN=Astral Radiance(S10P+S10D 합본 병합); 영판전용 110 여기 귀속(TG갤러리·Radiant·EN커먼+트레이너)
  },
  "og-s10a": {
    nameKo: "다크 판타스마", nameEn: "Dark Phantasma",
    jp: ["jp-tcg-S10a"], kr: ["kr-s10a"],
    krMirror: { "kr-s10a": "jp-tcg-S10a" }, enNative: [], krMirrorAll: true,
  },
  "og-s10b": {
    nameKo: "포켓몬 GO", nameEn: "Pokémon GO",
    jp: ["jp-tcg-S10b"], kr: ["kr-s10b"],
    krMirror: { "kr-s10b": "jp-tcg-S10b" }, enNative: ["en-tcg-pgo"], krMirrorAll: true, enMerged: true, // EN=Pokémon GO(pgo, 1:1 병합); 영판전용 13(GO트레이너 사전미등록)
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
  // ── SM (썬·문) ── EN(Sun&Moon=en-tcg-sm1)이 SM1S/SM1M/SM1+ 3그룹에 걸침, EN(Guardians Rising=en-tcg-sm2)이 SM2K/SM2L 2그룹에 걸침.
  //   enMerged → build 가 EN 을 LC.setGroupId 로 그룹스코프 로드(크로스그룹 정확 분배). 영판전용 orphan 은 EN세트의 setGroupId 그룹에 귀속.
  "og-sm1s": {
    nameKo: "썬 컬렉션", nameEn: "Sun Collection",
    jp: ["jp-tcg-SM1S"], kr: ["kr-sm1s"],
    krMirror: { "kr-sm1s": "jp-tcg-SM1S" }, enNative: ["en-tcg-sm1"], krMirrorAll: true, enMerged: true,
  },
  "og-sm1m": {
    nameKo: "문 컬렉션", nameEn: "Moon Collection",
    jp: ["jp-tcg-SM1M"], kr: ["kr-sm1m"],
    krMirror: { "kr-sm1m": "jp-tcg-SM1M" }, enNative: ["en-tcg-sm1"], krMirrorAll: true, enMerged: true,
  },
  "og-sm1+": {
    nameKo: "썬&문 강화확장팩", nameEn: "Sun & Moon",
    jp: ["jp-tcg-SM1+"], kr: ["kr-sm1+"],
    krMirror: { "kr-sm1+": "jp-tcg-SM1+" }, enNative: ["en-tcg-sm1"], krMirrorAll: true, enMerged: true,
  },
  "og-sm2k": {
    nameKo: "알로라의 햇빛", nameEn: "Alolan Sunshine",
    jp: ["jp-tcg-SM2K"], kr: ["kr-sm2k"],
    krMirror: { "kr-sm2k": "jp-tcg-SM2K" }, enNative: ["en-tcg-sm2"], krMirrorAll: true, enMerged: true,
  },
  "og-sm2l": {
    nameKo: "알로라의 달빛", nameEn: "Alolan Moonlight",
    jp: ["jp-tcg-SM2L"], kr: ["kr-sm2l"],
    krMirror: { "kr-sm2l": "jp-tcg-SM2L" }, enNative: ["en-tcg-sm2"], krMirrorAll: true, enMerged: true,
  },
  // EN(Burning Shadows=en-tcg-sm3)이 SM2+/SM3N/SM3H 3그룹에 걸침(en-tcg-sm3 은 og-sm3h 에 귀속). EN(Shining Legends=en-tcg-sm35)←SM3+.
  "og-sm2+": {
    nameKo: "새로운 시련", nameEn: "Facing a New Trial",
    jp: ["jp-tcg-sm2+"], kr: ["kr-sm2+"],
    krMirror: { "kr-sm2+": "jp-tcg-sm2+" }, enNative: ["en-tcg-sm3"], krMirrorAll: true, enMerged: true,
  },
  "og-sm3n": {
    nameKo: "빛을 삼킨 어둠", nameEn: "Darkness that Consumed Light",
    jp: ["jp-tcg-SM3N"], kr: ["kr-sm3n"],
    krMirror: { "kr-sm3n": "jp-tcg-SM3N" }, enNative: ["en-tcg-sm3"], krMirrorAll: true, enMerged: true,
  },
  "og-sm3h": {
    nameKo: "어둠을 밝힌 무지개", nameEn: "Burning Shadows",
    jp: ["jp-tcg-SM3H"], kr: ["kr-sm3h"],
    krMirror: { "kr-sm3h": "jp-tcg-SM3H" }, enNative: ["en-tcg-sm3"], krMirrorAll: true, enMerged: true,
  },
  "og-sm3+": {
    nameKo: "빛나는 전설", nameEn: "Shining Legends",
    jp: ["jp-tcg-SM3+"], kr: ["kr-sm3+"],
    krMirror: { "kr-sm3+": "jp-tcg-SM3+" }, enNative: ["en-tcg-sm35"], krMirrorAll: true, enMerged: true,
  },
  // EN(Crimson Invasion=en-tcg-sm4)←SM4S+SM4A(en-tcg-sm4 는 og-sm4s 귀속). GX배틀부스트(SM4+)는 EN 없음(하이클래스 컴필).
  "og-sm4s": {
    nameKo: "각성의 용사", nameEn: "Crimson Invasion",
    jp: ["jp-tcg-SM4S"], kr: ["kr-sm4s"],
    krMirror: { "kr-sm4s": "jp-tcg-SM4S" }, enNative: ["en-tcg-sm4"], krMirrorAll: true, enMerged: true,
  },
  "og-sm4a": {
    nameKo: "초차원의 침략자", nameEn: "Ultradimensional Beasts",
    jp: ["jp-tcg-SM4A"], kr: ["kr-sm4a"],
    krMirror: { "kr-sm4a": "jp-tcg-SM4A" }, enNative: ["en-tcg-sm4"], krMirrorAll: true, enMerged: true,
  },
  "og-sm4+": {
    nameKo: "GX 배틀부스트", nameEn: "GX Battle Boost",
    jp: ["jp-tcg-SM4+"], kr: ["kr-sm4+"],
    krMirror: { "kr-sm4+": "jp-tcg-SM4+" }, enNative: [], krMirrorAll: true, // EN 없음(JP 하이클래스 컴필)
  },
  // SM5: en-tcg-sm5(Ultra Prism)←SM5S+SM5M+SM5+(3그룹). SM6: en-tcg-sm6←SM6(SM6b 제외=EN無). SM6a 자체 en-tcg-sm75(Dragon Majesty).
  // SM7: en-tcg-sm7(Celestial Storm)←SM7+SM7a(SM7b 제외=EN無, Lost Thunder행).
  "og-sm5s": {
    nameKo: "울트라썬", nameEn: "Ultra Sun",
    jp: ["jp-tcg-SM5S"], kr: ["kr-sm5s"],
    krMirror: { "kr-sm5s": "jp-tcg-SM5S" }, enNative: ["en-tcg-sm5"], krMirrorAll: true, enMerged: true,
  },
  "og-sm5m": {
    nameKo: "울트라문", nameEn: "Ultra Moon",
    jp: ["jp-tcg-SM5M"], kr: ["kr-sm5m"],
    krMirror: { "kr-sm5m": "jp-tcg-SM5M" }, enNative: ["en-tcg-sm5"], krMirrorAll: true, enMerged: true,
  },
  "og-sm5+": {
    nameKo: "울트라포스", nameEn: "Ultra Force",
    jp: ["jp-tcg-SM5+"], kr: ["kr-sm5+"],
    krMirror: { "kr-sm5+": "jp-tcg-SM5+" }, enNative: ["en-tcg-sm5"], krMirrorAll: true, enMerged: true,
  },
  "og-sm6": {
    nameKo: "금단의 빛", nameEn: "Forbidden Light",
    jp: ["jp-tcg-SM6"], kr: ["kr-sm6"],
    krMirror: { "kr-sm6": "jp-tcg-SM6" }, enNative: ["en-tcg-sm6"], krMirrorAll: true, enMerged: true,
  },
  "og-sm6a": {
    nameKo: "드래곤스톰", nameEn: "Dragon Majesty",
    jp: ["jp-tcg-SM6a"], kr: ["kr-sm6a"],
    krMirror: { "kr-sm6a": "jp-tcg-SM6a" }, enNative: ["en-tcg-sm75"], krMirrorAll: true, enMerged: true,
  },
  "og-sm6b": {
    nameKo: "챔피언로드", nameEn: "Champion Road",
    jp: ["jp-tcg-SM6b"], kr: ["kr-sm6b"],
    krMirror: { "kr-sm6b": "jp-tcg-SM6b" }, enNative: [], krMirrorAll: true, // EN 없음(이 배치 범위 밖)
  },
  "og-sm7": {
    nameKo: "창공의 카리스마", nameEn: "Celestial Storm",
    jp: ["jp-tcg-SM7"], kr: ["kr-sm7"],
    krMirror: { "kr-sm7": "jp-tcg-SM7" }, enNative: ["en-tcg-sm7"], krMirrorAll: true, enMerged: true,
  },
  "og-sm7a": {
    nameKo: "플라스마 스파크", nameEn: "Thunderclap Spark",
    jp: ["jp-tcg-SM7a"], kr: ["kr-sm7a"],
    krMirror: { "kr-sm7a": "jp-tcg-SM7a" }, enNative: ["en-tcg-sm7"], krMirrorAll: true, enMerged: true,
  },
  "og-sm7b": {
    nameKo: "페어리라이즈", nameEn: "Fairy Rise",
    jp: ["jp-tcg-SM7b"], kr: ["kr-sm7b"],
    krMirror: { "kr-sm7b": "jp-tcg-SM7b" }, enNative: ["en-tcg-sm8"], krMirrorAll: true, enMerged: true, // EN=Lost Thunder(sm8, 배치5에서 병합)
  },
  // SM8: en-tcg-sm8(Lost Thunder)←SM8+SM7b+SM8a(3그룹). SM8b 자체 en-tcg-sm115(Hidden Fates, 소량 9 — 샤이니 대부분 EN無).
  "og-sm8": {
    nameKo: "버스트임팩트", nameEn: "Lost Thunder",
    jp: ["jp-tcg-SM8"], kr: ["kr-sm8"],
    krMirror: { "kr-sm8": "jp-tcg-SM8" }, enNative: ["en-tcg-sm8"], krMirrorAll: true, enMerged: true,
  },
  "og-sm8a": {
    nameKo: "다크오더", nameEn: "Dark Order",
    jp: ["jp-tcg-SM8a"], kr: ["kr-sm8a"],
    krMirror: { "kr-sm8a": "jp-tcg-SM8a" }, enNative: ["en-tcg-sm9"], krMirrorAll: true, enMerged: true, // EN=Team Up(sm9, 배치6에서 병합 — Dark Order 본체가 Team Up행)
  },
  "og-sm8b": {
    nameKo: "GX 울트라샤이니", nameEn: "Hidden Fates",
    jp: ["jp-tcg-SM8b"], kr: ["kr-sm8b"],
    krMirror: { "kr-sm8b": "jp-tcg-SM8b" }, enNative: ["en-tcg-sm115"], krMirrorAll: true, enMerged: true,
  },
  "og-sm9": {
    nameKo: "태그볼트", nameEn: "Team Up",
    jp: ["jp-tcg-SM9"], kr: ["kr-sm9"],
    krMirror: { "kr-sm9": "jp-tcg-SM9" }, enNative: ["en-tcg-sm9"], krMirrorAll: true, enMerged: true, // EN=Team Up(SM8a+SM9 합본 병합)
  },
  "og-sm9a": {
    nameKo: "나이트 유니슨", nameEn: "Night Unison",
    jp: ["jp-tcg-SM9a"], kr: ["kr-sm9a"],
    krMirror: { "kr-sm9a": "jp-tcg-SM9a" }, enNative: ["en-tcg-sm10"], krMirrorAll: true, enMerged: true, // EN=Unbroken Bonds(SM9b+SM9a+SM10 합본, 배치7 병합)
  },
  "og-sm9b": {
    nameKo: "풀 메탈 월", nameEn: "Full Metal Wall",
    jp: ["jp-tcg-SM9b"], kr: ["kr-sm9b"],
    krMirror: { "kr-sm9b": "jp-tcg-SM9b" }, enNative: ["en-tcg-sm10"], krMirrorAll: true, enMerged: true, // EN=Unbroken Bonds(배치7 병합)
  },
  "og-sm10": {
    nameKo: "더블블레이즈", nameEn: "Unbroken Bonds",
    jp: ["jp-tcg-SM10"], kr: ["kr-sm10"],
    krMirror: { "kr-sm10": "jp-tcg-SM10" }, enNative: ["en-tcg-sm10"], krMirrorAll: true, enMerged: true, // EN=Unbroken Bonds(SM9b+SM9a+SM10 합본 병합)
  },
  "og-sn10a": {
    nameKo: "GG 엔드", nameEn: "GG End",
    jp: ["jp-tcg-sn10a"], kr: ["kr-sm10a"],
    krMirror: { "kr-sm10a": "jp-tcg-sn10a" }, enNative: ["en-tcg-sm11"], krMirrorAll: true, enMerged: true, // EN=Unified Minds(SM10a+SM10b+SM11+SM11a 합본, 배치8 병합). ※그룹/세트ID 'sn' 오타이나 일관
  },
  "og-sm10b": {
    nameKo: "스카이 레전드", nameEn: "Sky Legend",
    jp: ["jp-tcg-SM10b"], kr: ["kr-sm10b"],
    krMirror: { "kr-sm10b": "jp-tcg-SM10b" }, enNative: ["en-tcg-sm11"], krMirrorAll: true, enMerged: true, // EN=Unified Minds(배치8 병합)
  },
  "og-sn11": {
    nameKo: "미라클 트윈", nameEn: "Unified Minds",
    jp: ["jp-tcg-sn11"], kr: ["kr-sm11"],
    krMirror: { "kr-sm11": "jp-tcg-sn11" }, enNative: ["en-tcg-sm11"], krMirrorAll: true, enMerged: true, // EN=Unified Minds(합본 병합). ※그룹/세트ID 'sn' 오타이나 일관
  },
  "og-sm11a": {
    nameKo: "리믹스 바우트", nameEn: "Remix Bout",
    jp: ["jp-tcg-SM11a"], kr: ["kr-sm11a"],
    krMirror: { "kr-sm11a": "jp-tcg-SM11a" }, enNative: ["en-tcg-sm11", "en-tcg-sm12"], krMirrorAll: true, enMerged: true, // SM11a JP의 EN=Cosmic Eclipse(sm12, 배치9 병합). + en-tcg-sm11(UM)이 이 그룹 소속이라 UM 영판전용 tail 도 노출(enMerged는 setGroupId 스코프라 둘 다 로드)
  },
  "og-sm11b": {
    nameKo: "드림 리그", nameEn: "Dream League",
    jp: ["jp-tcg-SM11b"], kr: ["kr-sm11b"],
    krMirror: { "kr-sm11b": "jp-tcg-SM11b" }, enNative: ["en-tcg-sm12"], krMirrorAll: true, enMerged: true, // EN=Cosmic Eclipse(배치9 병합)
  },
  "og-sm12": {
    nameKo: "얼터제네시스", nameEn: "Cosmic Eclipse",
    jp: ["jp-tcg-SM12"], kr: ["kr-sm12"],
    krMirror: { "kr-sm12": "jp-tcg-SM12" }, enNative: ["en-tcg-sm12"], krMirrorAll: true, enMerged: true, // EN=Cosmic Eclipse(SM11a+SM11b+SM12 합본 병합)
  },
  "og-sm12a": {
    nameKo: "태그 올스타즈", nameEn: "Tag All Stars",
    jp: ["jp-tcg-SM12a"], kr: ["kr-sm12a"],
    krMirror: { "kr-sm12a": "jp-tcg-SM12a" }, enNative: [], krMirrorAll: true, // JP 전용 하이클래스 컴필 — EN 단일세트 없음(각 EN은 원본세트). JP+KR만
  },
  "og-smp2": {
    nameKo: "명탐정 피카츄", nameEn: "Detective Pikachu",
    jp: ["jp-tcg-SMP2"], kr: ["kr-smp2"],
    krMirror: { "kr-smp2": "jp-tcg-SMP2" }, enNative: ["en-tcg-det1"], krMirrorAll: true, enMerged: true, // 영화 스페셜팩
  },
  "og-sm0": {
    nameKo: "피카츄와 새로운 친구들", nameEn: "Pikachu & New Friends",
    jp: ["jp-tcg-SM0"], kr: [],
    krMirror: {}, enNative: [], krMirrorAll: true, // JP 전용 4장 프로모(스타터+피카츄). KR/EN 없음
  },
  "og-smp": {
    nameKo: "SM 블랙스타 프로모", nameEn: "SM Black Star Promos",
    jp: [], kr: [],
    krMirror: {}, enNative: ["en-tcg-smp"], enAnchor: true, // EN 전용 프로모 250장 — JP/KR 앵커 없음, EN 자체 앵커(promo=독립카드, 병합 안 함)
  },
  "og-dpmd": {
    nameKo: "마제스틱 던", nameEn: "Majestic Dawn",
    jp: [], kr: [],
    krMirror: {}, enNative: ["en-tcg-dp5"], enAnchor: true, // EN 전용 세트(JP 원본=미수집 엔트리팩'08) — KR(DP한국판 kr-bs) 18장이 EN앵커 LC 공유(2026-06-07)
  },
  "og-dpp": {
    nameKo: "DP 블랙스타 프로모", nameEn: "DP Black Star Promos",
    jp: [], kr: [],
    krMirror: {}, enNative: ["en-tcg-dpp"], enAnchor: true, // EN 전용 프로모 56장
  },
  // ── XY (정석 재수집 진행, 배치12) ── EN(XY=en-tcg-xy1)이 XY1a/XY1b 2그룹에 걸침.
  "og-xy1a": {
    nameKo: "콜렉션 X", nameEn: "Collection X",
    jp: ["jp-tcg-XY1a"], kr: ["kr-xy1"],
    krMirror: { "kr-xy1": "jp-tcg-XY1a" }, enNative: ["en-tcg-xy1"], krMirrorAll: true, enMerged: true, // EN=XY(XY1a+XY1b 합본); 영판전용 여기 귀속
  },
  "og-xy1b": {
    nameKo: "콜렉션 Y", nameEn: "Collection Y",
    jp: ["jp-tcg-XY1b"], kr: ["kr-xy1b"],
    krMirror: { "kr-xy1b": "jp-tcg-XY1b" }, enNative: ["en-tcg-xy1"], krMirrorAll: true, enMerged: true, // EN=XY(합본 병합)
  },
  "og-xy2": {
    nameKo: "와일드 블레이즈", nameEn: "Wild Blaze",
    jp: ["jp-tcg-XY2"], kr: ["kr-xy2"],
    krMirror: { "kr-xy2": "jp-tcg-XY2" }, enNative: ["en-tcg-xy2"], krMirrorAll: true, enMerged: true, // EN=Flashfire(XY2 단독); 영판전용 여기 귀속
  },
  "og-xy3": {
    nameKo: "라이징 피스트", nameEn: "Rising Fist",
    jp: ["jp-tcg-XY3"], kr: ["kr-xy3"],
    krMirror: { "kr-xy3": "jp-tcg-XY3" }, enNative: ["en-tcg-xy3"], krMirrorAll: true, enMerged: true, // EN=Furious Fists(XY3 단독); 영판전용 여기 귀속
  },
  "og-xy4": {
    nameKo: "팬텀 게이트", nameEn: "Phantom Gate",
    jp: ["jp-tcg-XY4"], kr: ["kr-xy4"],
    krMirror: { "kr-xy4": "jp-tcg-XY4" }, enNative: ["en-tcg-xy4"], krMirrorAll: true, enMerged: true, // EN=Phantom Forces(XY4 단독); 영판전용 여기 귀속
  },
  // ── XY5 분할(가이아볼케이노+타이달스톰) → EN Primal Clash 합본 ──
  "og-xy5": {
    nameKo: "가이아 볼케이노", nameEn: "Gaia Volcano",
    jp: ["jp-tcg-XY5"], kr: ["kr-xy5g"],
    krMirror: { "kr-xy5g": "jp-tcg-XY5" }, enNative: ["en-tcg-xy5"], krMirrorAll: true, enMerged: true, // EN=Primal Clash(XY5+XY5a 합본); 영판전용 여기 귀속
  },
  "og-xy5a": {
    nameKo: "타이달 스톰", nameEn: "Tidal Storm",
    jp: ["jp-tcg-XY5a"], kr: ["kr-xy5"],
    krMirror: { "kr-xy5": "jp-tcg-XY5a" }, enNative: ["en-tcg-xy5"], krMirrorAll: true, enMerged: true, // EN=Primal Clash(합본 병합)
  },
  // ── XY6~8 (정석 재수집 배치15) ──
  "og-xy6": {
    nameKo: "에메랄드 브레이크", nameEn: "Emerald Break",
    jp: ["jp-tcg-XY6"], kr: ["kr-xy6"],
    krMirror: { "kr-xy6": "jp-tcg-XY6" }, enNative: ["en-tcg-xy6"], krMirrorAll: true, enMerged: true, // EN=Roaring Skies(XY6 단독); 영판전용 여기 귀속
  },
  "og-xy7": {
    nameKo: "밴디트링", nameEn: "Bandit Ring",
    jp: ["jp-tcg-XY7"], kr: ["kr-xy7"],
    krMirror: { "kr-xy7": "jp-tcg-XY7" }, enNative: ["en-tcg-xy7"], krMirrorAll: true, enMerged: true, // EN=Ancient Origins(XY7 단독); 영판전용 여기 귀속
  },
  "og-xy8a": {
    nameKo: "푸른 충격", nameEn: "Blue Impact",
    jp: ["jp-tcg-XY8a"], kr: ["kr-xy8"],
    krMirror: { "kr-xy8": "jp-tcg-XY8a" }, enNative: ["en-tcg-xy8"], krMirrorAll: true, enMerged: true, // EN=BREAKthrough(XY8 분할 합본); 영판전용 여기 귀속
  },
  "og-xy8b": {
    nameKo: "붉은 섬광", nameEn: "Red Flash",
    jp: ["jp-tcg-XY8b"], kr: ["kr-xy8b"],
    krMirror: { "kr-xy8b": "jp-tcg-XY8b" }, enNative: ["en-tcg-xy8"], krMirrorAll: true, enMerged: true, // EN=BREAKthrough(합본 병합)
  },
  // ── XY9~11 (정석 재수집 배치14, BREAK 시대) ──
  "og-xy9": {
    nameKo: "천공의 분노", nameEn: "Rage of the Broken Heavens",
    jp: ["jp-tcg-XY9"], kr: ["kr-xy9"],
    krMirror: { "kr-xy9": "jp-tcg-XY9" }, enNative: ["en-tcg-xy9"], krMirrorAll: true, enMerged: true, // EN=BREAKpoint(XY9 단독); 영판전용 여기 귀속
  },
  "og-xy10": {
    nameKo: "초능력의 제왕", nameEn: "Awakened Psychic King",
    jp: ["jp-tcg-XY10"], kr: ["kr-xy10"],
    krMirror: { "kr-xy10": "jp-tcg-XY10" }, enNative: ["en-tcg-xy10"], krMirrorAll: true, enMerged: true, // EN=Fates Collide(XY10 단독); 영판전용 여기 귀속
  },
  "og-xy11b": {
    nameKo: "타오르는 투사", nameEn: "Explosive Fighter",
    jp: ["jp-tcg-XY11b"], kr: ["kr-xy11"],
    krMirror: { "kr-xy11": "jp-tcg-XY11b" }, enNative: ["en-tcg-xy11"], krMirrorAll: true, enMerged: true, // EN=Steam Siege(XY11 분할 합본)
  },
  "og-xy11a": {
    nameKo: "냉혹한 반역자", nameEn: "Cruel Traitor",
    jp: ["jp-tcg-XY11a"], kr: ["kr-xy11r"],
    krMirror: { "kr-xy11r": "jp-tcg-XY11a" }, enNative: ["en-tcg-xy11"], krMirrorAll: true, enMerged: true, // EN=Steam Siege(합본 병합); 영판전용 여기 귀속
  },
  // ── BW3~4·드래곤셀렉션 (정석 재수집 BW배치2) ──
  "og-bw3": {
    nameKo: "사이코 드라이브", nameEn: "Psycho Drive",
    jp: ["jp-tcg-BW3P"], kr: ["kr-bw3p"],
    krMirror: { "kr-bw3p": "jp-tcg-BW3P" }, enNative: ["en-tcg-bw4"], krMirrorAll: true, enMerged: true, // EN=Next Destinies(BW3 분할 합본, 시프트교정); KR 제3탄 정발(2026-06-06 발견 — 미발매 오판 정정); 영판전용 여기 귀속
  },
  "og-bw3h": {
    nameKo: "헤일 블리자드", nameEn: "Hail Blizzard",
    jp: ["jp-tcg-BW3H"], kr: ["kr-bw3h"],
    krMirror: { "kr-bw3h": "jp-tcg-BW3H" }, enNative: ["en-tcg-bw4"], krMirrorAll: true, enMerged: true, // EN=Next Destinies(합본 병합); KR 제3탄 정발
  },
  "og-bw4": {
    nameKo: "다크러시", nameEn: "Dark Rush",
    jp: ["jp-tcg-bw4"], kr: ["kr-bgr"],
    krMirror: { "kr-bgr": "jp-tcg-bw4" }, enNative: ["en-tcg-bw5"], krMirrorAll: true, enMerged: true, // EN=Dark Explorers(시프트교정); 영판전용 여기 귀속
  },
  "og-dv1": {
    nameKo: "드래곤 컬렉션", nameEn: "Dragon Selection",
    jp: ["jp-tcg-DC"], kr: ["kr-dc"],
    krMirror: { "kr-dc": "jp-tcg-DC" }, enNative: ["en-tcg-dv1"], krMirrorAll: true, enMerged: true, // EN=Dragon Vault(20/20 완전)
  },
  // ── BW5~6 분할 (정석 재수집 BW배치3) ──
  "og-bw5": {
    nameKo: "드래곤 블라스트", nameEn: "Dragon Blast",
    jp: ["jp-tcg-BW5B"], kr: ["kr-bw5"],
    krMirror: { "kr-bw5": "jp-tcg-BW5B" }, enNative: ["en-tcg-bw6"], krMirrorAll: true, enMerged: true, // JP공식명=リューズブラスト(pg341); EN=Dragons Exalted(BW5 분할 합본, 시프트교정); 영판전용 여기 귀속
  },
  "og-bw5d": {
    nameKo: "드래곤 블레이드", nameEn: "Dragon Blade",
    jp: ["jp-tcg-BW5D"], kr: ["kr-bw5d"],
    krMirror: { "kr-bw5d": "jp-tcg-BW5D" }, enNative: ["en-tcg-bw6"], krMirrorAll: true, enMerged: true, // JP공식명=リューノブレード(pg342); EN=Dragons Exalted(합본 병합)
  },
  "og-bw6": {
    nameKo: "프리즈볼트", nameEn: "Freeze Bolt",
    jp: ["jp-tcg-BW6F"], kr: ["kr-bw6"],
    krMirror: { "kr-bw6": "jp-tcg-BW6F" }, enNative: ["en-tcg-bw7"], krMirrorAll: true, enMerged: true, // pg361; EN=Boundaries Crossed(BW6 분할 합본, 시프트교정); 영판전용 여기 귀속
  },
  "og-bw6c": {
    nameKo: "콜드플레어", nameEn: "Cold Flare",
    jp: ["jp-tcg-BW6C"], kr: ["kr-bw6c"],
    krMirror: { "kr-bw6c": "jp-tcg-BW6C" }, enNative: ["en-tcg-bw7"], krMirrorAll: true, enMerged: true, // pg362; EN=Boundaries Crossed(합본 병합)
  },
  // ── BW7~9·EBB·샤이니 (정석 재수집 BW배치4) ──
  "og-bw7": {
    nameKo: "플라스마게일", nameEn: "Plasma Gale",
    jp: ["jp-tcg-BW7"], kr: ["kr-bw7"],
    krMirror: { "kr-bw7": "jp-tcg-BW7" }, enNative: ["en-tcg-bw8"], krMirrorAll: true, enMerged: true, // pg366; EN=Plasma Storm(시프트교정); 영판전용 여기 귀속
  },
  "og-bw8": {
    nameKo: "라센포스", nameEn: "Spiral Force",
    jp: ["jp-tcg-BW8S"], kr: ["kr-bw8"],
    krMirror: { "kr-bw8": "jp-tcg-BW8S" }, enNative: ["en-tcg-bw9"], krMirrorAll: false, enMerged: true, // pg373; EN=Plasma Freeze(BW8 분할 합본); KR 볼트너클 합본의 라센포스측 카드 렌더
  },
  "og-bw8t": {
    nameKo: "볼트너클", nameEn: "Thunder Knuckle",
    jp: ["jp-tcg-BW8T"], kr: ["kr-bw8"],
    krMirror: { "kr-bw8": "jp-tcg-BW8T" }, enNative: ["en-tcg-bw9"], krMirrorAll: true, enMerged: true, // pg374; KR 볼트너클=JP 양팩 합본 선별 55(라센포스 카드 포함); 영판전용 여기 귀속 안함(og-bw8 귀속)
  },
  "og-bw9": {
    nameKo: "메갈로캐논", nameEn: "Megalo Cannon",
    jp: ["jp-tcg-BW9"], kr: ["kr-bw9"],
    krMirror: { "kr-bw9": "jp-tcg-BW9" }, enNative: ["en-tcg-bw10"], krMirrorAll: true, enMerged: true, // pg377; EN=Plasma Blast(시프트교정); 영판전용 여기 귀속
  },
  "og-ebb": {
    nameKo: "EX 배틀 부스트", nameEn: "EX Battle Boost",
    jp: ["jp-tcg-EBB"], kr: ["kr-ebb"],
    krMirror: { "kr-ebb": "jp-tcg-EBB" }, enNative: ["en-tcg-bw11"], krMirrorAll: true, enMerged: true, // pg378; EN=Legendary Treasures 본세트(RC subset은 og-bw-shiny)
  },
  "og-bw-shiny": {
    nameKo: "샤이니 컬렉션", nameEn: "Shiny Collection",
    jp: ["jp-tcg-SC"], kr: ["kr-sc"],
    krMirror: { "kr-sc": "jp-tcg-SC" }, enNative: ["en-tcg-bw11"], krMirrorAll: true, enMerged: true, // pg375; EN=Legendary Treasures RC subset(RC1~25)
  },
  // ── PCG (EX 시리즈 후반, 2026-06-06 배치1) — ⚠ JP 원어 미보유 시대(기계번역 대체명, pc-jp 미커버) — 1:1 교차dry 확증(82:1/82:1) ──
  "og-pcg1": {
    nameKo: "전설의 비상", nameEn: "Flight of Legends",
    jp: ["jp-tcg-PCG1"], kr: [],
    krMirror: {}, enNative: ["en-tcg-ex6"], krMirrorAll: false, enMerged: true, // EN=EX FireRed & LeafGreen; KR PCG시대 미발매
  },
  "og-pcg2": {
    nameKo: "창공의 격돌", nameEn: "Clash of the Blue Sky",
    jp: ["jp-tcg-PCG2"], kr: [],
    krMirror: {}, enNative: ["en-tcg-ex8"], krMirrorAll: false, enMerged: true, // EN=EX Deoxys
  },
  "og-pcg3": {
    nameKo: "로켓단의 역습", nameEn: "Rocket Gang Strikes Back",
    jp: ["jp-tcg-PCG3"], kr: [],
    krMirror: {}, enNative: ["en-tcg-ex7", "en-tcg-ex10"], krMirrorAll: false, enMerged: true, // EN=EX Team Rocket Returns (+Celebi ex는 UF #117로 이월 수록)
  },
  "og-pcg4": {
    nameKo: "금빛 하늘, 은빛 바다", nameEn: "Golden Sky, Silvery Sea",
    jp: ["jp-tcg-PCG4"], kr: [],
    krMirror: {}, enNative: ["en-tcg-ex10"], krMirrorAll: false, enMerged: true, // EN=EX Unseen Forces; Unown 25 폼식별 보류
  },
  "og-pcg5": {
    nameKo: "환상의 숲", nameEn: "Mirage Forest",
    jp: ["jp-tcg-PCG5"], kr: [],
    krMirror: {}, enNative: ["en-tcg-ex12"], krMirrorAll: false, enMerged: true, // EN=EX Legend Maker
  },
  "og-pcg6": {
    nameKo: "호론의 연구탑", nameEn: "Holon Research Tower",
    jp: ["jp-tcg-PCG6"], kr: [],
    krMirror: {}, enNative: ["en-tcg-ex11"], krMirrorAll: false, enMerged: true, // EN=EX Delta Species(δ 시대 개막)
  },
  "og-pcg7": {
    nameKo: "호론의 환영", nameEn: "Holon Phantom",
    jp: ["jp-tcg-PCG7"], kr: [],
    krMirror: {}, enNative: ["en-tcg-ex13"], krMirrorAll: false, enMerged: true, // EN=EX Holon Phantoms(EN 111≫JP 52)
  },
  "og-pcg8": {
    nameKo: "기적의 결정", nameEn: "Miracle Crystal",
    jp: ["jp-tcg-PCG8"], kr: [],
    krMirror: {}, enNative: ["en-tcg-ex14"], krMirrorAll: false, enMerged: true, // EN=EX Crystal Guardians
  },
  "og-pcg9": {
    nameKo: "끝자락의 공방", nameEn: "Offense and Defense of the Furthest Ends",
    jp: ["jp-tcg-PCG9"], kr: [],
    krMirror: {}, enNative: ["en-tcg-ex15"], krMirrorAll: false, enMerged: true, // EN=EX Dragon Frontiers
  },
  "og-pcg10": {
    nameKo: "월드 챔피언스 팩", nameEn: "World Champions Pack",
    jp: ["jp-tcg-PCG10"], kr: [],
    krMirror: {}, enNative: ["en-tcg-ex16"], krMirrorAll: false, enMerged: true, // EN=EX Power Keepers(EN 선발매 특이); JP 데이터=무번역 EN raw(supertype null 백필)
  },
  // ── ADV (EX 시리즈 전반, 2026-06-06) — ⚠ JP 전체 무번역 EN raw·3중 결손 백필. ADV4(마그마VS아쿠아)는 ex2/ex3/ex4 분산(일러쌍 확정) ──
  "og-adv1": {
    nameKo: "확장팩", nameEn: "Expansion Pack",
    jp: ["jp-tcg-ADV1"], kr: [],
    krMirror: {}, enNative: ["en-tcg-ex1"], krMirrorAll: false, enMerged: true, // EN=EX Ruby & Sapphire
  },
  "og-adv2": {
    nameKo: "사막의 기적", nameEn: "Miracle of the Desert",
    jp: ["jp-tcg-ADV2"], kr: [],
    krMirror: {}, enNative: ["en-tcg-ex2"], krMirrorAll: false, enMerged: true, // EN=EX Sandstorm(+ADV4 분산 수용)
  },
  "og-adv3": {
    nameKo: "천공의 패자", nameEn: "Rulers of the Heavens",
    jp: ["jp-tcg-ADV3"], kr: [],
    krMirror: {}, enNative: ["en-tcg-ex3"], krMirrorAll: false, enMerged: true, // EN=EX Dragon(+ADV4/ADV5 분산 수용)
  },
  "og-adv4": {
    nameKo: "마그마단VS아쿠아단 두 야망", nameEn: "Magma VS Aqua: Two Ambitions",
    jp: ["jp-tcg-ADV4"], kr: [],
    krMirror: {}, enNative: ["en-tcg-ex4", "en-tcg-ex2", "en-tcg-ex3"], krMirrorAll: false, enMerged: true, // EN=EX Team Magma vs Team Aqua + 일반 포켓몬은 Sandstorm/Dragon 분산
  },
  "og-adv5": {
    nameKo: "풀린 봉인", nameEn: "Undone Seal",
    jp: ["jp-tcg-ADV5"], kr: [],
    krMirror: {}, enNative: ["en-tcg-ex5"], krMirrorAll: false, enMerged: true, // EN=EX Hidden Legends
  },
  // ── e-Card (2026-06-06) — 기본확장팩↔Expedition 1:1, 아쿠아폴리스/스카이리지 각 2→1(합산 182=182 완전 합치) ──
  "og-e1": {
    nameKo: "기본 확장팩", nameEn: "Base Expansion Pack",
    jp: ["jp-tcg-E1"], kr: [],
    krMirror: {}, enNative: ["en-tcg-ecard1"], krMirrorAll: false, enMerged: true, // EN=Expedition Base Set
  },
  "og-e2": {
    nameKo: "지도에 없는 마을", nameEn: "The Town on No Map",
    jp: ["jp-tcg-E2"], kr: [],
    krMirror: {}, enNative: ["en-tcg-ecard2"], krMirrorAll: false, enMerged: true, // EN=Aquapolis(E2+E3 2→1)
  },
  "og-e3": {
    nameKo: "바다에서 부는 바람", nameEn: "Wind from the Sea",
    jp: ["jp-tcg-E3"], kr: [],
    krMirror: {}, enNative: ["en-tcg-ecard2"], krMirrorAll: false, enMerged: true, // EN=Aquapolis 합본(영판전용은 og-e2 귀속)
  },
  "og-e4": {
    nameKo: "갈라진 대지", nameEn: "Split Earth",
    jp: ["jp-tcg-E4"], kr: [],
    krMirror: {}, enNative: ["en-tcg-ecard3"], krMirrorAll: false, enMerged: true, // EN=Skyridge(E4+E5 2→1)
  },
  "og-e5": {
    nameKo: "신비로운 산", nameEn: "Mysterious Mountains",
    jp: ["jp-tcg-E5"], kr: [],
    krMirror: {}, enNative: ["en-tcg-ecard3"], krMirrorAll: false, enMerged: true, // EN=Skyridge 합본
  },
  // ── web·VS (2026-06-06) — JP단독, EN 영구 미발매 → enNative 빈 배열(crossGroup 전역탐색 회피) ──
  "og-web1": {
    nameKo: "포켓몬카드 web", nameEn: "Pokémon Card web",
    jp: ["jp-tcg-web1"], kr: [],
    krMirror: {}, enNative: [], krMirrorAll: false, enMerged: false, // JP단독(웹 한정판매 2001)
  },
  "og-vs1": {
    nameKo: "포켓몬카드 VS", nameEn: "Pokémon Card VS",
    jp: ["jp-tcg-VS1"], kr: [],
    krMirror: {}, enNative: [], krMirrorAll: false, enMerged: false, // JP단독(2001)
  },
  // ── NEO·구판 (2026-06-06) — 짐 2팩은 상호분배(PMCG5+PMCG6 ↔ gym1+gym2 합산 병합) ──
  "og-neo1": { nameKo: "금, 은 신세계로", nameEn: "Gold, Silver, to a New World", jp: ["jp-tcg-neo1"], kr: [], krMirror: {}, enNative: ["en-tcg-neo1"], krMirrorAll: false, enMerged: true },
  "og-neo2": { nameKo: "유적을 넘어서", nameEn: "Crossing the Ruins", jp: ["jp-tcg-neo2"], kr: [], krMirror: {}, enNative: ["en-tcg-neo2"], krMirrorAll: false, enMerged: true },
  "og-neo3": { nameKo: "각성하는 전설", nameEn: "Awakening Legends", jp: ["jp-tcg-neo3"], kr: [], krMirror: {}, enNative: ["en-tcg-neo3"], krMirrorAll: false, enMerged: true },
  "og-neo4": { nameKo: "어둠, 그리고 빛으로", nameEn: "Darkness, and to Light", jp: ["jp-tcg-neo4"], kr: [], krMirror: {}, enNative: ["en-tcg-neo4"], krMirrorAll: false, enMerged: true },
  "og-pmcg1": { nameKo: "확장팩 제1탄", nameEn: "Expansion Pack", jp: ["jp-tcg-PMCG1"], kr: [], krMirror: {}, enNative: ["en-tcg-base1"], krMirrorAll: false, enMerged: true },
  "og-pmcg2": { nameKo: "확장팩 제2탄 포켓몬 정글", nameEn: "Pokémon Jungle", jp: ["jp-tcg-PMCG2"], kr: [], krMirror: {}, enNative: ["en-tcg-base2"], krMirrorAll: false, enMerged: true },
  "og-pmcg3": { nameKo: "확장팩 제3탄 화석의 비밀", nameEn: "Mystery of the Fossils", jp: ["jp-tcg-PMCG3"], kr: [], krMirror: {}, enNative: ["en-tcg-base3"], krMirrorAll: false, enMerged: true },
  "og-pmcg4": { nameKo: "확장팩 제4탄 로켓단", nameEn: "Rocket Gang", jp: ["jp-tcg-PMCG4"], kr: [], krMirror: {}, enNative: ["en-tcg-base5"], krMirrorAll: false, enMerged: true },
  "og-pmcg5": { nameKo: "짐 확장 제1탄 리더스 스타디움", nameEn: "Leaders' Stadium", jp: ["jp-tcg-PMCG5"], kr: [], krMirror: {}, enNative: ["en-tcg-gym1", "en-tcg-gym2"], krMirrorAll: false, enMerged: true },
  "og-pmcg6": { nameKo: "짐 확장 제2탄 어둠에서의 도전", nameEn: "Challenge from the Darkness", jp: ["jp-tcg-PMCG6"], kr: [], krMirror: {}, enNative: ["en-tcg-gym1", "en-tcg-gym2"], krMirrorAll: false, enMerged: true },
  // ── DP·Pt (정석 재수집 DPPt배치, 2026-06-06) — EN: D&P↔DP1쌍·MT↔DP2·SW↔DP3·GE↔DP4쌍·LA↔DP5쌍·SF↔DP6·Pt1:1×4 교차dry 확증, MD=잔여 분산 병합(og-dpmd) ──
  "og-dp1": {
    nameKo: "시공의 창조 다이아몬드 컬렉션", nameEn: "Space-Time Creation: Diamond Collection",
    jp: ["jp-tcg-DP1D"], kr: [],
    krMirror: {}, enNative: ["en-tcg-dp1", "en-tcg-dp5"], krMirrorAll: false, enMerged: true, krMerged: true, // pg4; KR=DP한국판 확장팩(kr-bs 크로스그룹, 2026-06-07 — 미카탈로그 오판 정정); 영판전용 여기 귀속
  },
  "og-dp1p": {
    nameKo: "시공의 창조 펄 컬렉션", nameEn: "Space-Time Creation: Pearl Collection",
    jp: ["jp-tcg-DP1P"], kr: [],
    krMirror: {}, enNative: ["en-tcg-dp1", "en-tcg-dp5"], krMirrorAll: false, enMerged: true, krMerged: true, // pg3
  },
  "og-dp2": {
    nameKo: "호수의 비밀", nameEn: "Secret of the Lakes",
    jp: ["jp-tcg-DP2"], kr: [],
    krMirror: {}, enNative: ["en-tcg-dp2", "en-tcg-dp5"], krMirrorAll: false, enMerged: true, krMerged: true, // pg7; EN=Mysterious Treasures
  },
  "og-dp3": {
    nameKo: "빛나는 어둠", nameEn: "Shining Darkness",
    jp: ["jp-tcg-DP3"], kr: [],
    krMirror: {}, enNative: ["en-tcg-dp3", "en-tcg-dp5"], krMirrorAll: false, enMerged: true, krMerged: true, // pg10; EN=Secret Wonders(가이드의 輝く闇 표기는 오기 — 공식 ひかる闇)
  },
  "og-dp4": {
    nameKo: "월광의 추적", nameEn: "Moonlit Pursuit",
    jp: ["jp-tcg-DP4M"], kr: [],
    krMirror: {}, enNative: ["en-tcg-dp4", "en-tcg-dp5"], krMirrorAll: false, enMerged: true, krMerged: true, // pg20; EN=Great Encounters(DP4 분할 합본)
  },
  "og-dp4d": {
    nameKo: "새벽의 질주", nameEn: "Dawn Dash",
    jp: ["jp-tcg-DP4D"], kr: [],
    krMirror: {}, enNative: ["en-tcg-dp4", "en-tcg-dp5"], krMirrorAll: false, enMerged: true, krMerged: true, // pg19
  },
  "og-dp5": {
    nameKo: "비경의 외침", nameEn: "Cry from the Mysterious",
    jp: ["jp-tcg-DP5H"], kr: [],
    krMirror: {}, enNative: ["en-tcg-dp6", "en-tcg-dp5"], krMirrorAll: false, enMerged: true, krMerged: true, // pg25; EN=Legends Awakened(DP5 분할 합본)
  },
  "og-dp5a": {
    nameKo: "분노의 신전", nameEn: "Temple of Anger",
    jp: ["jp-tcg-DP5A"], kr: [],
    krMirror: {}, enNative: ["en-tcg-dp6", "en-tcg-dp5"], krMirrorAll: false, enMerged: true, krMerged: true, // pg26
  },
  "og-dp6": {
    nameKo: "파공의 격투", nameEn: "Intense Fight in the Destroyed Sky",
    jp: ["jp-tcg-DP6"], kr: [],
    krMirror: {}, enNative: ["en-tcg-dp7", "en-tcg-dp5"], krMirrorAll: false, enMerged: true, krMerged: true, // pg28; EN=Stormfront(가이드의 破空の覇者 표기는 오기 — 공식 破空の激闘)
  },
  "og-pl1": {
    nameKo: "은하의 패도", nameEn: "Galactic's Conquest",
    jp: ["jp-tcg-PT1"], kr: [],
    krMirror: {}, enNative: ["en-tcg-pl1"], krMirrorAll: false, enMerged: true, krMerged: true, // pg105; EN=Platinum
  },
  "og-pl2": {
    nameKo: "시간 끝의 인연", nameEn: "Bonds to the End of Time",
    jp: ["jp-tcg-PT2"], kr: [],
    krMirror: {}, enNative: ["en-tcg-pl2"], krMirrorAll: false, enMerged: true, krMerged: true, // pg109; EN=Rising Rivals
  },
  "og-pl3": {
    nameKo: "프론티어의 고동", nameEn: "Beat of the Frontier",
    jp: ["jp-tcg-PT3"], kr: [],
    krMirror: {}, enNative: ["en-tcg-pl3"], krMirrorAll: false, enMerged: true, krMerged: true, // pg113; EN=Supreme Victors
  },
  "og-pl4": {
    nameKo: "아르세우스 광림", nameEn: "Advent of Arceus",
    jp: ["jp-tcg-PT4"], kr: [],
    krMirror: {}, enNative: ["en-tcg-pl4"], krMirrorAll: false, enMerged: true, krMerged: true, // pg120; EN=Arceus
  },
  // ── LEGEND (정석 재수집 LHGSS배치, 2026-06-06) — EN: HGSS1↔L1쌍·Undaunted↔L2·Triumphant↔L3 교차dry 확증, Unleashed=잔여 분산 병합 ──
  "og-l1a": {
    nameKo: "하트골드 컬렉션", nameEn: "HeartGold Collection",
    jp: ["jp-tcg-L1a"], kr: [],
    krMirror: {}, enNative: ["en-tcg-hgss1", "en-tcg-hgss2"], krMirrorAll: false, enMerged: true, // pg204; KR 미발매(공백기); 영판전용 여기 귀속
  },
  "og-l1b": {
    nameKo: "소울실버 컬렉션", nameEn: "SoulSilver Collection",
    jp: ["jp-tcg-L1b"], kr: [],
    krMirror: {}, enNative: ["en-tcg-hgss1", "en-tcg-hgss2"], krMirrorAll: false, enMerged: true, // pg205
  },
  "og-l2": {
    nameKo: "되살아나는 전설", nameEn: "Reviving Legends",
    jp: ["jp-tcg-L2"], kr: [],
    krMirror: {}, enNative: ["en-tcg-hgss3", "en-tcg-hgss2"], krMirrorAll: false, enMerged: true, // pg217; EN=HS Undaunted(교차dry 50/91)
  },
  "og-l3": {
    nameKo: "정상대격돌", nameEn: "Clash at the Summit",
    jp: ["jp-tcg-L3"], kr: [],
    krMirror: {}, enNative: ["en-tcg-hgss4", "en-tcg-hgss2"], krMirrorAll: false, enMerged: true, // pg225; EN=HS Triumphant(교차dry 65/103)
  },
  "og-ll": {
    nameKo: "강화팩 로스트링크", nameEn: "Lost Link",
    jp: ["jp-tcg-LL"], kr: [],
    krMirror: {}, enNative: ["en-tcg-hgss2"], krMirrorAll: false, enMerged: true, // pg223; CoL은 재판컴필=EN단독 유지(병합 안함)
  },
  // ── BW1~2 (정석 재수집 BW배치1) ──
  "og-bw1": {
    nameKo: "블랙 컬렉션", nameEn: "Black Collection",
    jp: ["jp-tcg-BW1B"], kr: ["kr-bw1b"],
    krMirror: { "kr-bw1b": "jp-tcg-BW1B" }, enNative: ["en-tcg-bw1"], krMirrorAll: true, enMerged: true, // EN=Black & White(BW1 분할 합본); 영판전용 여기 귀속
  },
  "og-bw1w": {
    nameKo: "화이트 컬렉션", nameEn: "White Collection",
    jp: ["jp-tcg-BW1W"], kr: ["kr-bw1"],
    krMirror: { "kr-bw1": "jp-tcg-BW1W" }, enNative: ["en-tcg-bw1"], krMirrorAll: true, enMerged: true, // EN=Black & White(합본 병합)
  },
  "og-bw2": {
    nameKo: "레드 컬렉션", nameEn: "Red Collection",
    jp: ["jp-tcg-bw2"], kr: ["kr-bw2"],
    krMirror: { "kr-bw2": "jp-tcg-bw2" }, enNative: ["en-tcg-bw3"], krMirrorAll: true, enMerged: true, // EN=Noble Victories(가이드의 Emerging Powers 표기는 오류 — 교차dry 66/66 확증); 영판전용 여기 귀속
  },
  // ── CP1~4 (XY 컨셉팩, 정석 재수집 배치16) ──
  "og-cp1": {
    nameKo: "마그마단 VS 아쿠아단 더블 크라이시스", nameEn: "Magma Gang VS Aqua Gang: Double Crisis",
    jp: ["jp-tcg-CP1"], kr: ["kr-cp1"],
    krMirror: { "kr-cp1": "jp-tcg-CP1" }, enNative: ["en-tcg-dc1"], krMirrorAll: true, enMerged: true, // EN=Double Crisis(dc1 미니세트 1:1)
  },
  "og-cp2": {
    nameKo: "레전드 컬렉션", nameEn: "Legendary Shine Collection",
    jp: ["jp-tcg-CP2"], kr: ["kr-cp2"],
    krMirror: { "kr-cp2": "jp-tcg-CP2" }, enNative: [], krMirrorAll: true, // EN 미발매
  },
  "og-cp3": {
    nameKo: "포켓심쿵 컬렉션", nameEn: "Pokékyun Collection",
    jp: ["jp-tcg-CP3"], kr: ["kr-cp3"],
    krMirror: { "kr-cp3": "jp-tcg-CP3" }, enNative: [], krMirrorAll: true, // EN 미발매(Generations RC는 EN단독 별도)
  },
  "og-cp4": {
    nameKo: "프리미엄 챔피언팩 EX×M×BREAK", nameEn: "Premium Champion Pack EX×M×BREAK",
    jp: ["jp-tcg-CP4"], kr: ["kr-cp4"],
    krMirror: { "kr-cp4": "jp-tcg-CP4" }, enNative: [], krMirrorAll: true, // EN 미발매, 컴필 140
  },
  // ── XY 컨셉팩·하이클래스(정석 재수집 배치13) ──
  "sm-best-of-xy": {
    nameKo: "THE BEST OF XY", nameEn: "The Best of XY",
    jp: ["jp-tcg-SMXY"], kr: ["kr-smxy"],
    krMirror: { "kr-smxy": "jp-tcg-SMXY" }, enNative: [], krMirrorAll: true, // JP·KR 전용(EN 미발매), 트레이너 언어별 재정렬(ja↔ko 사전 매칭)
  },
  "og-cp6": {
    nameKo: "BASE PACK 20th Anniversary", nameEn: "Expansion Pack 20th Anniversary",
    jp: ["jp-tcg-CP6"], kr: ["kr-cp6"],
    krMirror: { "kr-cp6": "jp-tcg-CP6" }, enNative: ["en-tcg-xy12"], krMirrorAll: true, enMerged: true, // EN=Evolutions(특별 1:1); 3국 구성 상이(JP87+16/KR100+13/EN108+5), KR-EN 단독통합 12
  },
  "og-cp5": {
    nameKo: "환상 전설 드림 컬렉션", nameEn: "Mythical & Legendary Dream Shine Collection", // KR 공식 verbatim(가운뎃점 없음, 2026-06-06)
    jp: ["jp-tcg-CP5"], kr: ["kr-cp5"],
    krMirror: { "kr-cp5": "jp-tcg-CP5" }, enNative: [], krMirrorAll: true, // EN 미발매(Generations 는 EN단독 별도), JP 시크릿 2장 JP단독
  },
};

type Row = {
  cid: string; lcid: string; setId: string; region: string; number: string; numInt: number; name: string;
  image: string | null; dex: number | null; illus: string | null; tier: number | null; subtypes: string; supertype: string | null; rarity: string | null;
  types: string[]; hp: number | null; rel: number | null;
};
const sel = {
  id: true, logicalCardId: true, setId: true, region: true, number: true, numberInt: true, name: true, imageSmall: true, imageLarge: true,
  set: { select: { releaseDate: true } },
  logicalCard: { select: { pokedexNumbers: true, illustrator: true, subtypes: true, supertype: true, hp: true, types: true, rarity: { select: { tier: true, nameKo: true, nameJa: true, nameEn: true, code: true } } } },
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
    types: l.logicalCard.types ?? [], hp: l.logicalCard.hp ?? null, rel: l.set?.releaseDate ? +new Date(l.set.releaseDate) : null,
  };
}
const load = async (setIds: string[]) => (await prisma.cardLocale.findMany({ where: { setId: { in: setIds } }, select: sel })).map(toRow);
const pub = (r: Row | undefined) => r ? { id: r.cid, number: r.number, name: r.name, image: r.image, rarity: r.rarity, setId: r.setId, region: r.region } : null;

const tfp = (r: Row) => `${(r.illus ?? "").trim().toLowerCase()}|${r.tier}|${r.subtypes}`;     // 트레이너 지문
const fpP = (r: Row) => `${r.dex}|${(r.illus ?? "").trim().toLowerCase()}|${r.subtypes}`;       // 포켓몬 dex버킷(tier 제외)
// 지역형 폼 토큰(언어중립): 같은 dex+일러라도 폼이 다르면 다른 카드(파르데아 우퍼 ≠ 우퍼).
const FORM_RE: [RegExp, string][] = [[/パルデア|paldean/i, "paldean"], [/ガラル|galar/i, "galarian"], [/アローラ|alolan/i, "alolan"], [/ヒスイ|hisuian/i, "hisuian"]];
const formKey = (name: string) => { for (const [re, k] of FORM_RE) if (re.test(name)) return k; return "—"; };
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

  // EN-앵커 그룹(JP/KR 없는 EN전용 프로모 등): EN 카드 자체를 앵커로 줄세움(병합 없음)
  if (cfg.enAnchor) {
    const numOf = (s: string) => parseInt((s.match(/\d+/) ?? ["0"])[0], 10);
    const enCards = (await load(cfg.enNative ?? [])).sort((a, b) => numOf(a.number) - numOf(b.number) || a.number.localeCompare(b.number));
    // EN 앵커 LC 에 병합된 KR(DP 한국판 kr-bs — JP 미발매·EN 발매 카드의 한국판 등) → KR 탭 노출
    const krRows = (await prisma.cardLocale.findMany({ where: { region: "KR", logicalCardId: { in: enCards.map((e) => e.lcid) } }, select: sel })).map(toRow);
    const krByLcidA = new Map(krRows.map((k) => [k.lcid, k]));
    const anchors = enCards.map((e) => ({ jp: null, en: pub(e), kr: pub(krByLcidA.get(e.lcid)), dex: e.dex }));
    const krMatchedA = anchors.filter((a) => a.kr).length;
    const payload = {
      group: { id: groupId, nameKo: cfg.nameKo, nameEn: cfg.nameEn, enAnchor: true },
      counts: { anchors: anchors.length, enMatched: anchors.length, krMatched: krMatchedA, enOnly: 0, krOnly: 0 },
      anchors, tail: { enOnly: [], krOnly: [], enKr: [] },
    };
    mkdirSync(join(process.cwd(), "src", "data"), { recursive: true });
    const out = join(process.cwd(), "src", "data", `group-${groupId.replace(/\+/g, "plus")}.json`);
    writeFileSync(out, JSON.stringify(payload, null, 2));
    console.log(`✅ ${out}\n[${groupId}] EN-앵커 ${anchors.length}`);
    await prisma.$disconnect(); return;
  }

  const jp = await load(cfg.jp);
  let kr = await load(cfg.kr);
  if (cfg.krMerged) {
    // 크로스그룹 합본 KR(kr-bs 등): setGroupId 스코프로 이 그룹 LC 에 병합된 KR 추가 로드 (enMerged 의 KR 대칭)
    const merged = (await prisma.cardLocale.findMany({ where: { region: "KR", logicalCard: { setGroupId: groupId } }, select: sel })).map(toRow);
    const seenK = new Set(kr.map((k) => k.cid));
    kr = [...kr, ...merged.filter((m) => !seenK.has(m.cid))];
  }
  const crossGroup = !cfg.enNative;
  let en: Row[];
  if (cfg.enMerged) {
    // EN 은 DB 에서 JP 앵커 LC(매칭) + 영판전용 orphan 으로 병합되며 setGroupId 를 가짐 → **그룹 단위로 스코프** 로드.
    //   한 EN 세트가 여러 JP 그룹에 걸친 경우(SM Sun&Moon en-tcg-sm1 → SM1S/SM1M/SM1+)에도 그룹별로 정확히 분배.
    //   (단일그룹 EN 세트(sv-base 등)는 결과 동일 — 하위호환.)
    en = (await prisma.cardLocale.findMany({ where: { region: "EN", logicalCard: { setGroupId: groupId } }, select: sel })).map(toRow);
  } else if (cfg.enNative) en = await load(cfg.enNative);
  else {
    const dexes = [...new Set(jp.filter(isPoke).map((r) => r.dex))] as number[];
    en = (await prisma.cardLocale.findMany({ where: { region: "EN", logicalCard: { supertype: { in: POKE }, pokedexNumbers: { hasSome: dexes } } }, select: sel })).map(toRow);
  }

  // ── KR ↔ JP ──
  const krForJp = new Map<string, Row>();
  if (cfg.krMirrorAll || cfg.krMerged) {
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
  if (cfg.enMerged) {
    // EN 이 JP LC 로 정체성 병합됨 → 공유 lcid 로 읽음(KR 과 동일). 미병합 EN = 영판전용 섹션.
    const enByLcid = new Map<string, Row>(); for (const e of en) enByLcid.set(e.lcid, e);
    const jpLcids = new Set(jp.map((j) => j.lcid));
    for (const j of jp) { const e = enByLcid.get(j.lcid); if (e) enForJp.set(j.cid, e); }
    for (const e of en) if (!jpLcids.has(e.lcid)) enUnmatched.push(e);
  } else if (!crossGroup) {
    bucketPair(en.filter(isPoke), jp.filter(isPoke), fpP, fpP, enForJp, byTier);
    // 폴백: EN 일러 결손(null) 등으로 미매칭된 앵커를 dex+subtypes(일러 제외)로 2차 매칭
    const lpP = (r: Row) => `${r.dex}|${r.subtypes}`;
    const usedEn = new Set([...enForJp.values()].map((r) => r.cid));
    const jpUnmatched = jp.filter((r) => isPoke(r) && !enForJp.has(r.cid));
    const enRemain = en.filter((r) => isPoke(r) && !usedEn.has(r.cid));
    bucketPair(enRemain, jpUnmatched, lpP, lpP, enForJp, byTier);
    const matchedCids = new Set([...enForJp.values()].map((r) => r.cid));
    const jpDex = new Set(jp.filter(isPoke).map((r) => r.dex));
    for (const e of en) if (isPoke(e) && !matchedCids.has(e.cid)) { if (jpDex.has(e.dex) || true) enUnmatched.push(e); }
  } else {
    // 교차그룹: JP 카드마다 같은 dex+일러+subtypes EN 중 *강한신호*로 선별.
    //   dex+일러는 시대·폼 가로질러 충돌(같은 일러가 2004 우퍼·2023 파르데아우퍼·2007 프로젤·2023 프로젤을 다 그림)
    //   → 폼토큰·타입·HP 일치 필수 + 발매 era 근접(±4년) 컷오프, 그 뒤 발매근접→tier근접 정렬.
    const ERA = 1460 * 86400000; // 4년 (TCG 시대 구분)
    const enByBk = new Map<string, Row[]>(); for (const e of en) if (isPoke(e)) { const k = fpP(e); const a = enByBk.get(k) ?? []; a.push(e); enByBk.set(k, a); }
    const used = new Set<string>();
    for (const j of jp.filter(isPoke)) {
      let cands = (enByBk.get(fpP(j)) ?? []).filter((c) => !used.has(c.cid));
      cands = cands.filter((c) => formKey(c.name) === formKey(j.name));                                         // 폼토큰 일치(하드: 파르데아≠일반, 명백)
      cands = cands.filter((c) => !(j.types.length && c.types.length) || j.types.some((t) => c.types.includes(t))); // 타입 교집합(하드: 타입은 불변)
      if (j.rel != null) cands = cands.filter((c) => c.rel == null || Math.abs(j.rel! - c.rel) <= ERA);          // 발매 era 근접(하드: 시대 구분)
      // ⚠ HP는 하드 필터 아님 — 우리 EN HP 데이터가 오염·누락 가능(sv2 Tinkatuff 등)이라 같은 카드도 떨굴 위험.
      //    HP/기술 일치는 verify-fingerprint(라이브 fetch)에서 confidence로 다룬다.
      if (!cands.length) continue;
      const era = (c: Row) => (c.rel != null && j.rel != null ? Math.abs(j.rel - c.rel) : 9e15);
      cands.sort((a, b) => era(a) - era(b) || (Math.abs((a.tier ?? 0) - (j.tier ?? 0)) - Math.abs((b.tier ?? 0) - (j.tier ?? 0))) || a.setId.localeCompare(b.setId));
      enForJp.set(j.cid, cands[0]); used.add(cands[0].cid);
    }
  }

  // ── 앵커(JP 세트순 → 번호순) ──
  const setOrder = (s: string) => cfg.jp.indexOf(s);
  const anchors = jp.slice().sort((a, b) => setOrder(a.setId) - setOrder(b.setId) || a.numInt - b.numInt).map((j) => ({
    jp: pub(j), en: pub(enForJp.get(j.cid) ?? undefined), kr: pub(krForJp.get(j.cid) ?? undefined), dex: j.dex,
  }));

  // ── 꼬리(영판전용; 교차그룹은 없음) ──
  // JP 전수 인덱스: ①dex 집합(jpElsewhere 불리언, 기존) ②지문(dex|일러[|subtypes]) → 수록 JP 세트 (jpPacks 팩명 표기용)
  const jpAll = crossGroup ? [] : await prisma.cardLocale.findMany({
    where: { region: "JP", logicalCard: { supertype: { in: POKE } } },
    select: { setId: true, set: { select: { releaseDate: true } }, logicalCard: { select: { pokedexNumbers: true, illustrator: true, subtypes: true } } },
  });
  const jpAllDex = new Set(jpAll.flatMap((l) => l.logicalCard.pokedexNumbers ?? []));
  // setId → 그룹 한국명(231/231 채움) 폴백 Set nameKo/name
  const setMeta = new Map((await prisma.set.findMany({ where: { region: "JP" }, select: { id: true, name: true, nameKo: true, setGroupId: true, setGroup: { select: { nameKo: true } } } }))
    .map((s) => [s.id, { groupId: s.setGroupId, name: s.setGroup?.nameKo ?? s.nameKo ?? s.name }]));
  const fpIndex = new Map<string, { setId: string; rel: number | null }[]>(); // 정확지문·일러지문 양 키 등록
  for (const l of jpAll) {
    const dex = l.logicalCard.pokedexNumbers?.[0]; if (dex == null) continue;
    const il = (l.logicalCard.illustrator ?? "").trim().toLowerCase(); if (!il) continue;
    const sub = [...(l.logicalCard.subtypes ?? [])].sort().join(",");
    const ent = { setId: l.setId, rel: l.set?.releaseDate ? +new Date(l.set.releaseDate) : null };
    for (const k of [`${dex}|${il}|${sub}`, `${dex}|${il}`]) { const a = fpIndex.get(k) ?? []; a.push(ent); fpIndex.set(k, a); }
  }
  // 동일 카드(dex+일러 지문)의 JP 수록처 — 정확지문 우선, 없으면 일러지문 폴백(표시 힌트 용도). 트레이너(dex無)는 대상 외.
  //   ⚠ 같은 dex+일러가 시대를 가로질러 다른 카드를 그림(M Gallade-EX'15 ≠ Mega Gallade ex'26) → 교차그룹과 동일 era ±4년 컷.
  const FP_ERA = 1460 * 86400000;
  const jpPacksOf = (e: Row) => {
    if (e.dex == null) return undefined;
    const il = (e.illus ?? "").trim().toLowerCase(); if (!il) return undefined;
    const eraOk = (c: { rel: number | null }) => e.rel == null || c.rel == null || Math.abs(e.rel - c.rel) <= FP_ERA;
    const cands = (fpIndex.get(`${e.dex}|${il}|${e.subtypes}`) ?? fpIndex.get(`${e.dex}|${il}`) ?? []).filter(eraOk);
    if (!cands.length) return undefined;
    const dedup = new Set<string>(); const out: { groupId: string | null; name: string }[] = [];
    for (const c of cands) {
      const m = setMeta.get(c.setId); if (!m) continue;
      const key = m.groupId ?? c.setId; if (dedup.has(key)) continue; dedup.add(key);
      out.push({ groupId: m.groupId, name: m.name });
    }
    return out.length ? out : undefined;
  };
  const seen = new Set<string>();
  const enOnly = (crossGroup ? [] : enUnmatched).filter((e) => (seen.has(e.cid) ? false : (seen.add(e.cid), true)))
    .sort((a, b) => a.numInt - b.numInt)
    .map((e) => { const jpPacks = jpPacksOf(e); return { ...pub(e), dex: e.dex, jpElsewhere: e.dex != null && jpAllDex.has(e.dex), ...(jpPacks ? { jpPacks } : {}) }; });
  // 한국판 전용 꼬리: JP 앵커에 매칭 안 된 KR 카드(KR>JP 초과팩, 예 SM1+ [SM-A] 48장). 정체성 미상 보존본.
  const krMatchedCids = new Set([...krForJp.values()].map((r) => r.cid));
  const krOnly = crossGroup ? [] : kr.filter((k) => !krMatchedCids.has(k.cid))
    .sort((a, b) => a.numInt - b.numInt)
    .map((k) => { const jpPacks = jpPacksOf(k); return { ...pub(k), dex: k.dex, jpElsewhere: k.dex != null && jpAllDex.has(k.dex), ...(jpPacks ? { jpPacks } : {}) }; });

  const payload = {
    group: { id: groupId, nameKo: cfg.nameKo, nameEn: cfg.nameEn, crossGroupEN: crossGroup },
    counts: { anchors: anchors.length, enMatched: enForJp.size, krMatched: krForJp.size, enOnly: enOnly.length, krOnly: krOnly.length },
    anchors, tail: { enOnly, krOnly, enKr: [] },
  };
  mkdirSync(join(process.cwd(), "src", "data"), { recursive: true });
  const safeId = groupId.replace(/\+/g, "plus"); // 파일명 안전(og-sm1+ → group-og-sm1plus.json), DATA 키는 groupId 유지
  const out = join(process.cwd(), "src", "data", `group-${safeId}.json`);
  writeFileSync(out, JSON.stringify(payload, null, 2));
  console.log(`✅ ${out}`);
  console.log(`[${groupId}] 앵커 ${anchors.length} | EN매칭 ${enForJp.size}${crossGroup ? "(교차그룹)" : ""} | KR매칭 ${krForJp.size} | 영판전용 ${enOnly.length}`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
