/**
 * tcgcollector 기반 신규 세트 수집 — tcgdex 게임데이터 병합 (EN 프로모/특수 세트).
 *
 * 배경: pokemontcg.io·tcgdex 가 불완전한 세트(트레이너킷 2덱 합본, 프로모 등)를 위해
 *       tcgcollector(Cloudflare 뒤, patchright 렌더로 추출한 카드리스트+이미지)를 권위 리스트로,
 *       tcgdex 를 게임데이터(hp·types·attacks·dex) 보강으로 병합해 적재.
 *
 * 입력: --cards-json=<path> — patchright 렌더 파싱 산출물 [{num,name,image,cardId}] (권위 카드리스트).
 *       tcgdex 는 config.tcgdexSetId 로 라이브 조회(게임데이터, 번호로 매칭. 없는 카드=에너지 등은 name 추론).
 *
 * 정체성: 신규 EN 세트 = mapping-lock FREE. Card 는 orphan(lc-orphan-{setId}-{num}), region=EN.
 *         Card 먼저 → RegionCard. PrintVariant 는 시세 기록 시 자동.
 * 안전: tcgdex 가 있는 번호는 이름 대조(불일치 시 abort). dry-run 기본, --apply 로 적재.
 *
 * 실행:
 *   npx tsx scripts/collect-tcgc-set.ts --set=tk-sm-l --cards-json=/…/tksml-cards.json
 *   npx tsx scripts/collect-tcgc-set.ts --set=tk-sm-l --cards-json=… --apply
 */
import "dotenv/config";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFileSync } from "node:fs";
import { prisma } from "@/lib/prisma";
import { supertypeOf } from "./lib/supertype";
import { resolveCardDexes } from "./lib/pokeapi-names";
import { Logger } from "./lib/price-sync-lib";

const execFileP = promisify(execFile);
const log = new Logger("collect-tcgc");

async function tcgdexJson<T>(url: string): Promise<T | null> {
  try {
    const { stdout } = await execFileP("curl", ["-sSL", "--max-time", "20", url], { maxBuffer: 16 * 1024 * 1024 });
    return stdout ? (JSON.parse(stdout) as T) : null;
  } catch {
    return null;
  }
}
const TCGDEX = "https://api.tcgdex.net/v2/en";

type SetCfg = {
  setId: string;
  name: string;
  series: string;
  code: string | null;
  release: string; // YYYY-MM-DD
  packType: string;
  tcgdexSetId: string | null; // 게임데이터 소스(없으면 name 추론만)
};

const SETS: SetCfg[] = [
  // code="SMK1" — tcgcsv 합본 그룹(2069, 두 덱)과 크로스워크 code-family 매칭용(번호+이름으로 덱 라우팅).
  { setId: "tk-sm-l", name: "SM Trainer Kit (Lycanroc)", series: "Sun & Moon", code: "SMK1", release: "2017-04-21", packType: "deck", tcgdexSetId: "tk-sm-l" },
  { setId: "tk-sm-r", name: "SM Trainer Kit (Alolan Raichu)", series: "Sun & Moon", code: "SMK1", release: "2017-04-21", packType: "deck", tcgdexSetId: "tk-sm-r" },
];

type TcgcCard = { num: number; name: string; image: string; cardId?: string };
type TdCard = {
  localId: string | number; name: string; category?: string; hp?: number; types?: string[];
  stage?: string; trainerType?: string; energyType?: string; retreat?: number;
  weaknesses?: { type: string; value: string }[]; resistances?: { type: string; value: string }[];
  illustrator?: string; dexId?: number[]; effect?: string;
  attacks?: { cost?: string[]; name?: string; effect?: string; damage?: number | string | null }[];
  abilities?: { type?: string; name: string; effect?: string }[];
};
type TdSet = { cards: { localId: string | number; id: string }[] };

const BASIC_ENERGY = /^(Grass|Fire|Water|Lightning|Psychic|Fighting|Darkness|Metal|Fairy) Energy$/;

// dex 권위 = PokeAPI(이름기반). tcgdex dexId 는 오류가 있어(Caterpie→251) 폴백만.
function dexFor(name: string, td: TdCard | null): number[] {
  if (td?.category !== "Pokemon") return [];
  const r = resolveCardDexes(name, "en");
  return r.length ? r : (td?.dexId ?? []);
}

function subtypesOf(td: TdCard | null, name: string): string[] {
  if (td?.category === "Pokemon" && td.stage) {
    const s = td.stage.replace(/\s+/g, "").toLowerCase();
    if (s === "basic") return ["Basic"];
    if (s === "stage1") return ["Stage 1"];
    if (s === "stage2") return ["Stage 2"];
    return [td.stage];
  }
  if (td?.category === "Trainer" && td.trainerType) {
    return [td.trainerType === "Tool" ? "Pokémon Tool" : td.trainerType];
  }
  if (td?.category === "Energy" || BASIC_ENERGY.test(name)) {
    return td?.energyType && td.energyType !== "Normal" ? [td.energyType] : ["Basic Energy"];
  }
  return [];
}
function supertypeFor(td: TdCard | null, name: string): string | null {
  if (td?.category) return supertypeOf(td.category);
  if (BASIC_ENERGY.test(name)) return "Energy";
  return null; // 알 수 없으면 null (dry-run에서 눈에 띔)
}
function typeValue(rows?: { type: string; value: string }[]): string | null {
  if (!rows || !rows.length) return null;
  return `${rows[0].type}${rows[0].value}`;
}
function normAttacks(atks?: TdCard["attacks"]) {
  if (!atks || !atks.length) return null;
  return atks.map((a) => ({
    cost: Array.isArray(a.cost) ? a.cost : [], name: a.name ?? "",
    text: a.effect ?? "", damage: a.damage != null && a.damage !== "" ? String(a.damage) : null,
  }));
}

async function collectSet(cfg: SetCfg, cardsJson: string, apply: boolean, force: boolean) {
  log.info(`── ${cfg.setId} (${cfg.name}) ──`);
  const existing = await prisma.set.findUnique({ where: { id: cfg.setId }, select: { id: true } });
  if (existing && !force) { log.warn(`${cfg.setId} 이미 존재 → 스킵 (--force 로 재적재)`); return; }

  const tcgc: TcgcCard[] = JSON.parse(readFileSync(cardsJson, "utf-8"));
  tcgc.sort((a, b) => a.num - b.num);
  log.info(`tcgcollector 권위 리스트: ${tcgc.length}장`);

  // tcgdex 게임데이터(번호=localId 로 인덱싱)
  const td = new Map<number, TdCard>();
  if (cfg.tcgdexSetId) {
    const tdSet = await tcgdexJson<TdSet>(`${TCGDEX}/sets/${cfg.tcgdexSetId}`);
    for (const c of tdSet?.cards ?? []) {
      const d = await tcgdexJson<TdCard>(`${TCGDEX}/cards/${c.id}`);
      if (d) td.set(Number(c.localId), d);
    }
    log.info(`tcgdex ${cfg.tcgdexSetId}: ${td.size}장 게임데이터`);
  }

  // 이름 대조(tcgdex 있는 번호만) — 불일치 abort
  const norm = (s: string) => (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  for (const c of tcgc) {
    const d = td.get(c.num);
    if (d && !(norm(c.name) === norm(d.name) || norm(c.name).includes(norm(d.name)) || norm(d.name).includes(norm(c.name)))) {
      throw new Error(`${cfg.setId} #${c.num} 이름 불일치 ABORT: tcgc"${c.name}" ≠ tcgdex"${d.name}"`);
    }
  }

  // dry-run 표
  let gameDataN = 0;
  for (const c of tcgc) {
    const d = td.get(c.num) ?? null;
    const st = supertypeFor(d, c.name);
    if (d && d.category === "Pokemon") gameDataN++;
    console.log(
      `  #${String(c.num).padStart(2)} ${c.name.padEnd(18)} ${(st ?? "?").padEnd(8)} ` +
      `${d?.category === "Pokemon" ? `hp=${d.hp ?? "-"} type=${(d.types ?? []).join("/")} dex=${dexFor(c.name, d).join(",")}` : `sub=${subtypesOf(d, c.name).join(",")}`}` +
      `${d ? "" : "  (tcgdex없음→name추론)"}`
    );
  }
  log.info(`포켓몬 게임데이터 ${gameDataN}장 · 나머지(트레이너/에너지) ${tcgc.length - gameDataN}장`);
  if (!apply) { log.info(`(dry-run) --apply 로 적재.`); return; }

  // 적재
  await prisma.set.upsert({
    where: { id: cfg.setId },
    create: {
      id: cfg.setId, name: cfg.name, series: cfg.series, releaseDate: new Date(`${cfg.release}T00:00:00Z`),
      cardCount: tcgc.length, region: "EN", code: cfg.code, packType: cfg.packType, titleCleanEn: cfg.name,
      logoUrl: null, symbolUrl: null, cardPackId: null,
    },
    update: { name: cfg.name, cardCount: tcgc.length, code: cfg.code, titleCleanEn: cfg.name },
  });

  let n = 0;
  for (const c of tcgc) {
    const d = td.get(c.num) ?? null;
    const cardId = `lc-orphan-${cfg.setId}-${c.num}`;
    const rcId = `${cfg.setId}-${c.num}`;
    const st = supertypeFor(d, c.name);
    const isPokemon = d?.category === "Pokemon";
    const dex = dexFor(c.name, d);
    await prisma.card.upsert({
      where: { id: cardId },
      create: {
        id: cardId, primarySetId: cfg.setId, primaryNumber: String(c.num), primaryNumberInt: c.num,
        supertype: st, subtypes: subtypesOf(d, c.name), types: isPokemon ? (d?.types ?? []) : [],
        hp: isPokemon ? (d?.hp ?? null) : null, retreatCost: isPokemon ? (d?.retreat ?? null) : null,
        weakness: isPokemon ? typeValue(d?.weaknesses) : null, resistance: isPokemon ? typeValue(d?.resistances) : null,
        illustrator: d?.illustrator ?? null, evolvesTo: [],
        attacks: isPokemon ? (normAttacks(d?.attacks) ?? undefined) : undefined,
        rules: d?.category === "Trainer" && d.effect ? [d.effect] : [],
        pokedexNumbers: dex, rarityId: null,
      },
      update: {
        supertype: st, subtypes: subtypesOf(d, c.name), types: isPokemon ? (d?.types ?? []) : [],
        hp: isPokemon ? (d?.hp ?? null) : null, retreatCost: isPokemon ? (d?.retreat ?? null) : null,
        weakness: isPokemon ? typeValue(d?.weaknesses) : null, illustrator: d?.illustrator ?? null,
        attacks: isPokemon ? (normAttacks(d?.attacks) ?? undefined) : undefined, pokedexNumbers: dex,
        rules: d?.category === "Trainer" && d.effect ? [d.effect] : [],
      },
    });
    await prisma.regionCard.upsert({
      where: { id: rcId },
      create: {
        id: rcId, cardId, language: "en", region: "EN", setId: cfg.setId,
        number: String(c.num), numberInt: c.num, name: c.name,
        imageSmall: c.image, imageLarge: c.image, rarityId: null, regulationMark: null, legalities: undefined,
      },
      update: { name: c.name, imageSmall: c.image, imageLarge: c.image },
    });
    n++;
  }
  log.info(`✓ ${cfg.setId}: Set + ${n} Card/RegionCard 적재 완료`);
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const force = args.includes("--force");
  const only = args.find((a) => a.startsWith("--set="))?.split("=")[1];
  const cardsJson = args.find((a) => a.startsWith("--cards-json="))?.split("=")[1];
  if (!only) throw new Error("--set=<setId> 필요");
  if (!cardsJson) throw new Error("--cards-json=<path> 필요 (tcgcollector 렌더 파싱 산출물)");
  const cfg = SETS.find((s) => s.setId === only);
  if (!cfg) throw new Error(`--set='${only}' 미정의 (${SETS.map((s) => s.setId).join(", ")})`);

  log.info(`${apply ? "APPLY" : "DRY-RUN"} — ${cfg.setId}`);
  await collectSet(cfg, cardsJson, apply, force);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
