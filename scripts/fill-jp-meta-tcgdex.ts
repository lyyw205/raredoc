/**
 * JP 세트 메타 보강 — tcgdex(ja) 에서 supertype·subtypes·dex·hp·types 를 비어있을 때만 채움.
 *   (illustrator·rarity·name 은 기존 보존). fill-jp-subtypes 의 상위호환(필드 더 채움).
 * dex: tcgdex dexId 우선, 없으면 PokeAPI ja(폼접두어 제거) 폴백.
 *
 * 실행: npx tsx scripts/fill-jp-meta-tcgdex.ts <jpSetId> <tcgId> [--apply]
 *   예: npx tsx scripts/fill-jp-meta-tcgdex.ts jp-sv-crimson-haze SV5a --apply
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { buildNameIndex } from "./lib/pokeapi-names";
const execFileP = promisify(execFile);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const pad = (n: string) => { const i = parseInt(n, 10); return isNaN(i) ? n : String(i).padStart(3, "0"); };
const mapStage = (s?: string | null) => { if (!s) return null; const m: Record<string, string> = { Basic: "Basic", Stage1: "Stage 1", Stage2: "Stage 2", "Stage 1": "Stage 1", "Stage 2": "Stage 2", VMAX: "VMAX", VSTAR: "VSTAR" }; return m[s] ?? s; };
const mapTrainer = (t?: string | null) => { if (!t) return null; const m: Record<string, string> = { Supporter: "Supporter", Item: "Item", Stadium: "Stadium", Tool: "Pokémon Tool", "Pokémon Tool": "Pokémon Tool" }; return m[t] ?? t; };
function subtypesOf(d: any): string[] {
  const out: string[] = [];
  if (d.category === "Pokemon") { const st = mapStage(d.stage); if (st) out.push(st); const suf = (d.suffix ?? "").trim();
    if (/^ex$/i.test(suf)) out.push("ex"); else if (suf && /^(V|VMAX|VSTAR|GX|EX)$/i.test(suf)) out.push(suf.toUpperCase() === "EX" ? "ex" : suf.toUpperCase()); }
  else if (d.category === "Trainer") { const tt = mapTrainer(d.trainerType); if (tt) out.push(tt); }
  else if (d.category === "Energy") out.push(d.energyType === "Special" ? "Special" : "Basic");
  return out;
}
const supertypeOf = (c?: string) => c === "Pokemon" ? "Pokémon" : c === "Trainer" ? "Trainer" : c === "Energy" ? "Energy" : null;
const fetchJson = async (url: string) => { try { const { stdout } = await execFileP("curl", ["-sSL", "--max-time", "20", url], { maxBuffer: 8 * 1024 * 1024 }); return JSON.parse(stdout); } catch { return null; } };
function dexFromJa(name: string, ja: Map<string, number>): number | null {
  const clean = name.replace(/^(パルデア|ヒスイ|アローラ|ガラル)\s*/, "").replace(/(ex|EX|V|VMAX|VSTAR|GX|δ)\s*$/g, "").replace(/[\s　]/g, "").trim().toLowerCase();
  return ja.get(clean) ?? null;
}

async function main() {
  const jpSet = process.argv[2], tcgId = process.argv[3];
  const APPLY = process.argv.includes("--apply");
  if (!jpSet || !tcgId) { console.error("usage: <jpSetId> <tcgId> [--apply]"); process.exit(1); }
  const ja = buildNameIndex("ja");
  const cards = await prisma.cardLocale.findMany({ where: { setId: jpSet }, orderBy: { numberInt: "asc" },
    select: { number: true, name: true, logicalCardId: true, logicalCard: { select: { supertype: true, subtypes: true, pokedexNumbers: true, hp: true, types: true } } } });
  console.log(`■ ${jpSet} ← tcgdex:${tcgId}(ja) | ${cards.length}장 ${APPLY ? "★적용" : "(dry)"}`);
  let touched = 0, fail = 0, dexTcg = 0, dexJa = 0, dexNone = 0; const noDex: string[] = []; const sample: string[] = [];

  const OW = process.argv.includes("--overwrite"); // 기존 값이 틀린 경우 tcgdex 로 덮어쓰기
  for (const c of cards) {
    const lc = c.logicalCard;
    const needs = OW || !lc.supertype || (lc.subtypes?.length ?? 0) === 0 || (lc.pokedexNumbers?.length ?? 0) === 0 || lc.hp == null || (lc.types?.length ?? 0) === 0;
    if (!needs) continue;
    let d = await fetchJson(`https://api.tcgdex.net/v2/ja/cards/${tcgId}-${pad(c.number)}`); await sleep(80);
    if (!d) { const ni = parseInt(c.number, 10); if (!isNaN(ni)) { d = await fetchJson(`https://api.tcgdex.net/v2/ja/cards/${tcgId}-${ni}`); await sleep(60); } }
    if (!d) { fail++; continue; }
    const supertype = supertypeOf(d.category);
    const update: Record<string, unknown> = {};
    if (supertype && (OW || !lc.supertype)) update.supertype = supertype;
    if (OW || (lc.subtypes?.length ?? 0) === 0) { const st = subtypesOf(d); if (st.length || OW) update.subtypes = st; }
    if (supertype === "Pokémon" && (OW || (lc.pokedexNumbers?.length ?? 0) === 0)) {
      if (d.dexId?.length) { update.pokedexNumbers = d.dexId; dexTcg++; }
      else { const x = dexFromJa(d.name, ja); if (x) { update.pokedexNumbers = [x]; dexJa++; } else { dexNone++; noDex.push(`#${c.number} ${c.name}`); } }
    } else if (OW && supertype && supertype !== "Pokémon") update.pokedexNumbers = []; // 비포켓몬 dex 정리
    if (d.hp != null && (OW || lc.hp == null)) update.hp = d.hp;
    if (d.types?.length && (OW || (lc.types?.length ?? 0) === 0)) update.types = d.types;
    if (Object.keys(update).length) {
      if (sample.length < 5) sample.push(`#${c.number} ${c.name} ${JSON.stringify(update)}`);
      if (APPLY) await prisma.logicalCard.update({ where: { id: c.logicalCardId }, data: update });
      touched++;
    }
  }
  console.log(`  보강 ${touched} · fetch실패 ${fail} | dex[tcgdex ${dexTcg}·ja폴백 ${dexJa}·없음 ${dexNone}]`);
  if (noDex.length) console.log(`   dex못찾음: ${noDex.slice(0, 10).join(", ")}`);
  if (sample.length) console.log("  예:\n   " + sample.join("\n   "));
  await prisma.$disconnect();
  if (!APPLY) console.log(`\n(dry) 적용: --apply`);
}
main().catch((e) => { console.error(e); process.exit(1); });
