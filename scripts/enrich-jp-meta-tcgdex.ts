/**
 * JP 세트 Card 메타를 tcgdex JP 에서 보강 (additive: null/빈 필드만, 덮어쓰기 안함).
 * 언어순수성: attacks·abilities(언어내용) 는 **EN locale 없는 JP단독 카드에만** 채움(EN병합 카드의 EN텍스트 보존).
 *   regulationMark·types·hp·illustrator·supertype(언어중립/JP권위) 은 null 인 모든 카드에 채움.
 * tcgdex 응답은 data/jp-official/tcgdex-<tcgId>.json 캐시 → dry 후 apply 시 재fetch 안함.
 *
 * 실행: npx tsx scripts/enrich-jp-meta-tcgdex.ts <jpSetId> <tcgdexId> [--apply]
 *   예: npx tsx scripts/enrich-jp-meta-tcgdex.ts jp-tcg-S12a S12a
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const execFileP = promisify(execFile);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const cat2st = (c?: string) => (c === "Pokemon" ? "Pokémon" : c === "Trainer" ? "Trainer" : c === "Energy" ? "Energy" : null);

type Card = { id?: string; category?: string; types?: string[]; hp?: number | string; regulationMark?: string; illustrator?: string;
  attacks?: { cost?: string[]; name: string; effect?: string; damage?: string | number }[]; abilities?: { name: string; effect?: string; type?: string }[]; };

async function fetchCard(tcgId: string, num: string): Promise<Card | null> {
  for (const n of [num, String(parseInt(num, 10))]) {
    try { const { stdout } = await execFileP("curl", ["-sSL", "--max-time", "20", `https://api.tcgdex.net/v2/ja/cards/${tcgId}-${n}`], { maxBuffer: 8 * 1024 * 1024 }); const j = JSON.parse(stdout); if (j && j.id) return j; } catch { /* next */ }
  }
  return null;
}

async function main() {
  const jpSet = process.argv[2], tcgId = process.argv[3], APPLY = process.argv.includes("--apply");
  if (!jpSet || !tcgId) { console.error("usage: <jpSetId> <tcgdexId> [--apply]"); process.exit(1); }
  const locs = await prisma.regionCard.findMany({ where: { setId: jpSet }, select: { number: true, cardId: true,
    card: { select: { supertype: true, types: true, hp: true, attacks: true, abilities: true, regulationMark: true, illustrator: true, locales: { select: { region: true } } } } } });

  const cache = `data/jp-official/tcgdex-${tcgId}.json`;
  let byNum: Record<string, Card>;
  if (existsSync(cache)) { byNum = JSON.parse(readFileSync(cache, "utf8")); console.log(`■ 캐시 ${cache}`); }
  else {
    byNum = {}; let ok = 0, fail = 0; const fn: string[] = [];
    for (const l of locs) { const c = await fetchCard(tcgId, l.number); await sleep(90); if (c) { byNum[String(parseInt(l.number, 10))] = c; ok++; } else { fail++; if (fn.length < 12) fn.push(l.number); } }
    writeFileSync(cache, JSON.stringify(byNum));
    console.log(`■ 스크랩 ${locs.length}: ok ${ok} fail ${fail}${fn.length ? "(#" + fn.join(",") + ")" : ""} → ${cache}`);
  }

  const cnt: Record<string, number> = { supertype: 0, types: 0, hp: 0, attacks: 0, abilities: 0, regMark: 0, illust: 0 };
  const updates: { id: string; data: any }[] = [];
  for (const l of locs) {
    const c = byNum[String(parseInt(l.number, 10))]; if (!c) continue;
    const lc = l.card; const hasEn = lc.locales.some((x) => x.region === "EN"); const data: any = {};
    if (!lc.supertype && cat2st(c.category)) { data.supertype = cat2st(c.category); cnt.supertype++; }
    if (!lc.types.length && c.types?.length) { data.types = c.types; cnt.types++; }
    if (lc.hp == null && c.hp != null) { const h = typeof c.hp === "number" ? c.hp : parseInt(String(c.hp), 10); if (!isNaN(h)) { data.hp = h; cnt.hp++; } }
    if (!lc.regulationMark && c.regulationMark) { data.regulationMark = c.regulationMark; cnt.regMark++; }
    if (!lc.illustrator && c.illustrator) { data.illustrator = c.illustrator; cnt.illust++; }
    // 언어내용 — JP단독(EN없음) 만
    if (!hasEn) {
      if (!lc.attacks && c.attacks?.length) { data.attacks = c.attacks.map((a) => ({ name: a.name, text: a.effect ?? "", cost: a.cost ?? [], damage: a.damage != null ? String(a.damage) : "" })); cnt.attacks++; }
      if (!lc.abilities && c.abilities?.length) { data.abilities = c.abilities.map((a) => ({ name: a.name, text: a.effect ?? "", type: a.type ?? "Ability" })); cnt.abilities++; }
    }
    if (Object.keys(data).length) updates.push({ id: l.cardId, data });
  }
  console.log(`채움 LC ${updates.length} | 필드별: ${JSON.stringify(cnt)} (attacks/abilities=JP단독만) ${APPLY ? "★APPLY" : "(dry)"}`);
  if (APPLY) { for (const u of updates) await prisma.card.update({ where: { id: u.id }, data: u.data }); console.log(`★적용 LC ${updates.length}`); }
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
