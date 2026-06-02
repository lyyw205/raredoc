/**
 * JP 세트 subtypes 백필 — tcgdex(ja) stage/suffix/trainerType 에서. (구세션 enrich-sv-meta 가 subtypes 미설정한 분)
 * subtypes 가 비어있는 LogicalCard 만 채움(기존 보존). EN 지문매칭(dex+일러+subtypes) 정합에 필요.
 *
 * 실행: npx tsx scripts/fill-jp-subtypes-tcgdex.ts <jpSetId> <tcgId> [--apply]
 *   예: npx tsx scripts/fill-jp-subtypes-tcgdex.ts jp-sv-obsidian-flames SV3 --apply
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const execFileP = promisify(execFile);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const pad = (n: string) => { const i = parseInt(n, 10); return isNaN(i) ? n : String(i).padStart(3, "0"); };
const mapStage = (s?: string | null) => { if (!s) return null; const m: Record<string, string> = { Basic: "Basic", Stage1: "Stage 1", Stage2: "Stage 2", "Stage 1": "Stage 1", "Stage 2": "Stage 2", VMAX: "VMAX", VSTAR: "VSTAR" }; return m[s] ?? s; };
const mapTrainer = (t?: string | null) => { if (!t) return null; const m: Record<string, string> = { Supporter: "Supporter", Item: "Item", Stadium: "Stadium", Tool: "Pokémon Tool", "Pokémon Tool": "Pokémon Tool" }; return m[t] ?? t; };
function subtypesOf(d: any): string[] {
  const out: string[] = [];
  if (d.category === "Pokemon") {
    const st = mapStage(d.stage); if (st) out.push(st);
    const suf = (d.suffix ?? "").trim();
    if (/^ex$/i.test(suf)) out.push("ex");
    else if (suf && /^(V|VMAX|VSTAR|GX|EX)$/i.test(suf)) out.push(suf.toUpperCase() === "EX" ? "ex" : suf.toUpperCase());
  } else if (d.category === "Trainer") { const tt = mapTrainer(d.trainerType); if (tt) out.push(tt); }
  else if (d.category === "Energy") out.push(d.energyType === "Special" ? "Special" : "Basic");
  return out;
}
const fetchJson = async (url: string) => { try { const { stdout } = await execFileP("curl", ["-sSL", "--max-time", "20", url], { maxBuffer: 8 * 1024 * 1024 }); return JSON.parse(stdout); } catch { return null; } };

async function main() {
  const jpSet = process.argv[2], tcgId = process.argv[3];
  const APPLY = process.argv.includes("--apply");
  if (!jpSet || !tcgId) { console.error("usage: <jpSetId> <tcgId> [--apply]"); process.exit(1); }
  const cards = await prisma.cardLocale.findMany({ where: { setId: jpSet }, orderBy: { numberInt: "asc" },
    select: { number: true, name: true, logicalCardId: true, logicalCard: { select: { subtypes: true } } } });
  const todo = cards.filter((c) => (c.logicalCard.subtypes?.length ?? 0) === 0);
  console.log(`■ ${jpSet} ← tcgdex:${tcgId}(ja) | subtypes 누락 ${todo.length}/${cards.length} ${APPLY ? "★적용" : "(dry)"}`);
  let filled = 0, fail = 0, empty = 0; const sample: string[] = [];
  for (const c of todo) {
    let d = await fetchJson(`https://api.tcgdex.net/v2/ja/cards/${tcgId}-${pad(c.number)}`); await sleep(80);
    if (!d) { const ni = parseInt(c.number, 10); if (!isNaN(ni)) { d = await fetchJson(`https://api.tcgdex.net/v2/ja/cards/${tcgId}-${ni}`); await sleep(60); } }
    if (!d) { fail++; continue; }
    const st = subtypesOf(d);
    if (!st.length) { empty++; continue; }
    if (sample.length < 6) sample.push(`#${c.number} ${c.name}=[${st}]`);
    if (APPLY) await prisma.logicalCard.update({ where: { id: c.logicalCardId }, data: { subtypes: st } });
    filled++;
  }
  console.log(`  채움 ${filled} · 빈subtypes ${empty} · fetch실패 ${fail}`);
  if (sample.length) console.log(`  예: ${sample.join(", ")}`);
  await prisma.$disconnect();
  if (!APPLY) console.log(`\n(dry) 적용: --apply`);
}
main().catch((e) => { console.error(e); process.exit(1); });
