/**
 * JP 세트 from-scratch 수집 — tcgdex(ja) 에서 LogicalCard+CardLocale 신규 생성. (JP 데이터가 통째로 없는 팩용)
 * 각 카드: supertype·subtypes(stage+suffix/trainerType)·dex(dexId or PokeAPI ja폴백)·illustrator·hp·types·
 *   retreat·evolveFrom·rarity·image 적재. LC 는 JP 앵커(primarySetId/primaryNumber=이 세트).
 * 멱등: 이미 있는 CardLocale id 는 skip. EN/KR 병합은 이후 단계(merge-group-apply / apply-kr-official)에서.
 *
 * 실행: npx tsx scripts/collect-jp-set-tcgdex.ts <jpSetId> <tcgId> [--apply]
 *   예: npx tsx scripts/collect-jp-set-tcgdex.ts jp-sv-paldean-fates SV4a --apply
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { buildNameIndex } from "./lib/pokeapi-names";
import { supertypeOf } from "./lib/supertype";
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
const fetchJson = async (url: string) => { try { const { stdout } = await execFileP("curl", ["-sSL", "--max-time", "20", url], { maxBuffer: 16 * 1024 * 1024 }); return JSON.parse(stdout); } catch { return null; } };
function dexFromJa(name: string, ja: Map<string, number>): number | null {
  const clean = name.replace(/(ex|EX|V|VMAX|VSTAR|GX|δ)\s*$/g, "").replace(/[\s　]/g, "").trim().toLowerCase();
  return ja.get(clean) ?? null;
}

async function main() {
  const jpSet = process.argv[2], tcgId = process.argv[3];
  const APPLY = process.argv.includes("--apply");
  if (!jpSet || !tcgId) { console.error("usage: <jpSetId> <tcgId> [--apply]"); process.exit(1); }
  const setRow = await prisma.set.findUnique({ where: { id: jpSet }, select: { id: true } });
  if (!setRow) { console.error(`Set 없음: ${jpSet} (먼저 Set 행 필요)`); process.exit(1); }

  const rarities = await prisma.rarity.findMany({ select: { id: true, nameEn: true, nameJa: true } });
  const rarIdx = new Map<string, string>(); for (const r of rarities) for (const n of [r.nameEn, r.nameJa]) if (n) rarIdx.set(n.trim().toLowerCase(), r.id);
  const ja = buildNameIndex("ja");

  const setDetail = await fetchJson(`https://api.tcgdex.net/v2/ja/sets/${tcgId}`);
  const list: { localId: string; id: string }[] = setDetail?.cards ?? [];
  console.log(`■ ${jpSet} ← tcgdex:${tcgId}(ja) | 카드목록 ${list.length} ${APPLY ? "★APPLY" : "(dry)"}`);
  if (!list.length) { console.error("카드목록 비어있음"); await prisma.$disconnect(); return; }

  const existing = new Set((await prisma.cardLocale.findMany({ where: { setId: jpSet }, select: { id: true } })).map((r) => r.id));
  let made = 0, skip = 0, fail = 0, dexTcg = 0, dexJa = 0, dexNone = 0, rarNone = 0; const sample: string[] = [];
  for (const c of list) {
    const cid = `${jpSet}-${c.localId}`;
    if (existing.has(cid)) { skip++; continue; }
    const d = await fetchJson(`https://api.tcgdex.net/v2/ja/cards/${c.id}`); await sleep(80);
    if (!d) { fail++; console.log(`  ✗fetch ${c.id}`); continue; }
    const supertype = supertypeOf(d.category);
    const subtypes = subtypesOf(d);
    let dex: number[] = [];
    if (d.dexId?.length) { dex = d.dexId; dexTcg++; }
    else if (supertype === "Pokémon") { const x = dexFromJa(d.name, ja); if (x) { dex = [x]; dexJa++; } else dexNone++; }
    const rarId = d.rarity ? rarIdx.get(String(d.rarity).trim().toLowerCase()) : undefined;
    if (d.rarity && !rarId) rarNone++;
    const numInt = parseInt(c.localId, 10) || null;
    const img = d.image ? `${d.image}/high.webp` : null; const imgS = d.image ? `${d.image}/low.webp` : null;
    if (sample.length < 5) sample.push(`#${c.localId} ${d.name} st=${supertype} dex=[${dex}] sub=[${subtypes}] rar=${d.rarity ?? "∅"}`);
    if (APPLY) {
      const lcId = `lc-${jpSet}-${c.localId}`;
      await prisma.logicalCard.create({ data: {
        id: lcId, supertype: supertype ?? undefined, subtypes, pokedexNumbers: dex,
        illustrator: d.illustrator ?? undefined, hp: d.hp ?? undefined, types: d.types ?? [],
        retreatCost: d.retreat ?? undefined, evolvesFrom: d.evolveFrom ?? undefined, rarityId: rarId,
        primarySetId: jpSet, primaryNumber: c.localId, primaryNumberInt: numInt ?? undefined,
      } });
      await prisma.cardLocale.create({ data: {
        id: cid, logicalCardId: lcId, region: "JP", language: "ja", setId: jpSet,
        number: c.localId, numberInt: numInt ?? undefined, name: d.name, imageSmall: imgS, imageLarge: img,
      } });
    }
    made++;
  }
  if (APPLY) await prisma.set.update({ where: { id: jpSet }, data: { cardCount: made + skip } });
  console.log(`  생성 ${made} · skip ${skip} · fetch실패 ${fail} | dex[tcgdex ${dexTcg}·ja폴백 ${dexJa}·없음 ${dexNone}] · rarity미매칭 ${rarNone}`);
  if (sample.length) console.log("  예:\n   " + sample.join("\n   "));
  await prisma.$disconnect();
  if (!APPLY) console.log(`\n(dry) 적용: --apply`);
}
main().catch((e) => { console.error(e); process.exit(1); });
