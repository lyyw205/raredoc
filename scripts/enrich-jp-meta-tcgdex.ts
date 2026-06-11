/**
 * JP 세트 Card 메타를 tcgdex JP(ja) 에서 보강 (additive: null/빈 필드만, --overwrite 시 덮어쓰기).
 *   언어중립/JP권위 필드(supertype·subtypes·pokedexNumbers·types·hp·regulationMark·illustrator) → null 인 모든 카드.
 *   언어내용(attacks·abilities) → **EN locale 없는 JP단독 카드에만** 채움(EN병합 카드의 EN텍스트 보존, --overwrite 무관).
 *   dex: tcgdex dexId 우선, 없으면 PokeAPI ja(폼접두어 제거) 폴백.
 *   tcgdex 응답은 data/jp-official/tcgdex-<tcgId>.json 캐시 → dry 후 apply 시 재fetch 안함.
 *
 * 실행: npx tsx scripts/enrich-jp-meta-tcgdex.ts <jpSetId> <tcgdexId> [--apply] [--overwrite]
 *   예: npx tsx scripts/enrich-jp-meta-tcgdex.ts jp-tcg-S12a S12a
 *
 * ※ 통합 이력: 구 fill-jp-meta-tcgdex.ts(subtypes·dex·--overwrite) 흡수 → 본 스크립트가 상위집합.
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { buildNameIndex } from "./lib/pokeapi-names";
const execFileP = promisify(execFile);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const cat2st = (c?: string) => (c === "Pokemon" ? "Pokémon" : c === "Trainer" ? "Trainer" : c === "Energy" ? "Energy" : null);

const mapStage = (s?: string | null) => { if (!s) return null; const m: Record<string, string> = { Basic: "Basic", Stage1: "Stage 1", Stage2: "Stage 2", "Stage 1": "Stage 1", "Stage 2": "Stage 2", VMAX: "VMAX", VSTAR: "VSTAR" }; return m[s] ?? s; };
const mapTrainer = (t?: string | null) => { if (!t) return null; const m: Record<string, string> = { Supporter: "Supporter", Item: "Item", Stadium: "Stadium", Tool: "Pokémon Tool", "Pokémon Tool": "Pokémon Tool" }; return m[t] ?? t; };
function subtypesOf(d: Card): string[] {
  const out: string[] = [];
  if (d.category === "Pokemon") { const st = mapStage(d.stage); if (st) out.push(st); const suf = (d.suffix ?? "").trim();
    if (/^ex$/i.test(suf)) out.push("ex"); else if (suf && /^(V|VMAX|VSTAR|GX|EX)$/i.test(suf)) out.push(suf.toUpperCase() === "EX" ? "ex" : suf.toUpperCase()); }
  else if (d.category === "Trainer") { const tt = mapTrainer(d.trainerType); if (tt) out.push(tt); }
  else if (d.category === "Energy") out.push(d.energyType === "Special" ? "Special" : "Basic");
  return out;
}
function dexFromJa(name: string, ja: Map<string, number>): number | null {
  const clean = name.replace(/^(パルデア|ヒスイ|アローラ|ガラル)\s*/, "").replace(/(ex|EX|V|VMAX|VSTAR|GX|δ)\s*$/g, "").replace(/[\s　]/g, "").trim().toLowerCase();
  return ja.get(clean) ?? null;
}

type Card = { id?: string; name?: string; category?: string; stage?: string; suffix?: string; trainerType?: string; energyType?: string;
  types?: string[]; hp?: number | string; regulationMark?: string; illustrator?: string; dexId?: number[];
  attacks?: { cost?: string[]; name: string; effect?: string; damage?: string | number }[]; abilities?: { name: string; effect?: string; type?: string }[]; };

async function fetchCard(tcgId: string, num: string): Promise<Card | null> {
  for (const n of [num, String(parseInt(num, 10))]) {
    try { const { stdout } = await execFileP("curl", ["-sSL", "--max-time", "20", `https://api.tcgdex.net/v2/ja/cards/${tcgId}-${n}`], { maxBuffer: 8 * 1024 * 1024 }); const j = JSON.parse(stdout); if (j && j.id) return j; } catch { /* next */ }
  }
  return null;
}

async function main() {
  const jpSet = process.argv[2], tcgId = process.argv[3], APPLY = process.argv.includes("--apply"), OW = process.argv.includes("--overwrite");
  if (!jpSet || !tcgId) { console.error("usage: <jpSetId> <tcgdexId> [--apply] [--overwrite]"); process.exit(1); }
  const ja = buildNameIndex("ja");
  const locs = await prisma.regionCard.findMany({ where: { setId: jpSet }, select: { number: true, name: true, cardId: true,
    card: { select: { supertype: true, subtypes: true, pokedexNumbers: true, types: true, hp: true, attacks: true, abilities: true, regulationMark: true, illustrator: true, locales: { select: { region: true } } } } } });

  const cache = `data/jp-official/tcgdex-${tcgId}.json`;
  let byNum: Record<string, Card>;
  if (existsSync(cache)) { byNum = JSON.parse(readFileSync(cache, "utf8")); console.log(`■ 캐시 ${cache}`); }
  else {
    byNum = {}; let ok = 0, fail = 0; const fn: string[] = [];
    for (const l of locs) { const c = await fetchCard(tcgId, l.number); await sleep(90); if (c) { byNum[String(parseInt(l.number, 10))] = c; ok++; } else { fail++; if (fn.length < 12) fn.push(l.number); } }
    writeFileSync(cache, JSON.stringify(byNum));
    console.log(`■ 스크랩 ${locs.length}: ok ${ok} fail ${fail}${fn.length ? "(#" + fn.join(",") + ")" : ""} → ${cache}`);
  }

  const cnt: Record<string, number> = { supertype: 0, subtypes: 0, dex: 0, types: 0, hp: 0, attacks: 0, abilities: 0, regMark: 0, illust: 0 };
  let dexTcg = 0, dexJa = 0, dexNone = 0; const noDex: string[] = [];
  const updates: { id: string; data: any }[] = [];
  for (const l of locs) {
    const c = byNum[String(parseInt(l.number, 10))]; if (!c) continue;
    const lc = l.card; const hasEn = lc.locales.some((x) => x.region === "EN"); const data: any = {};
    const st = cat2st(c.category);
    if ((OW || !lc.supertype) && st) { data.supertype = st; cnt.supertype++; }
    if (OW || (lc.subtypes?.length ?? 0) === 0) { const subs = subtypesOf(c); if (subs.length || OW) { data.subtypes = subs; cnt.subtypes++; } }
    if (st === "Pokémon" && (OW || (lc.pokedexNumbers?.length ?? 0) === 0)) {
      if (c.dexId?.length) { data.pokedexNumbers = c.dexId; dexTcg++; cnt.dex++; }
      else { const x = dexFromJa(c.name ?? "", ja); if (x) { data.pokedexNumbers = [x]; dexJa++; cnt.dex++; } else { dexNone++; noDex.push(`#${l.number} ${l.name}`); } }
    } else if (OW && st && st !== "Pokémon") data.pokedexNumbers = []; // 비포켓몬 dex 정리
    if ((OW || !lc.types.length) && c.types?.length) { data.types = c.types; cnt.types++; }
    if ((OW || lc.hp == null) && c.hp != null) { const h = typeof c.hp === "number" ? c.hp : parseInt(String(c.hp), 10); if (!isNaN(h)) { data.hp = h; cnt.hp++; } }
    if ((OW || !lc.regulationMark) && c.regulationMark) { data.regulationMark = c.regulationMark; cnt.regMark++; }
    if ((OW || !lc.illustrator) && c.illustrator) { data.illustrator = c.illustrator; cnt.illust++; }
    // 언어내용 — JP단독(EN없음) 만, --overwrite 와 무관히 null 만
    if (!hasEn) {
      if (!lc.attacks && c.attacks?.length) { data.attacks = c.attacks.map((a) => ({ name: a.name, text: a.effect ?? "", cost: a.cost ?? [], damage: a.damage != null ? String(a.damage) : "" })); cnt.attacks++; }
      if (!lc.abilities && c.abilities?.length) { data.abilities = c.abilities.map((a) => ({ name: a.name, text: a.effect ?? "", type: a.type ?? "Ability" })); cnt.abilities++; }
    }
    if (Object.keys(data).length) updates.push({ id: l.cardId, data });
  }
  console.log(`채움 LC ${updates.length} | 필드별: ${JSON.stringify(cnt)} (attacks/abilities=JP단독만) ${OW ? "[OVERWRITE]" : ""} ${APPLY ? "★APPLY" : "(dry)"}`);
  console.log(`  dex[tcgdex ${dexTcg}·ja폴백 ${dexJa}·없음 ${dexNone}]${noDex.length ? " 못찾음: " + noDex.slice(0, 10).join(", ") : ""}`);
  if (APPLY) { for (const u of updates) await prisma.card.update({ where: { id: u.id }, data: u.data }); console.log(`★적용 LC ${updates.length}`); }
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
