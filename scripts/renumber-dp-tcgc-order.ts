/**
 * DP2/DP3/DP5-H/DP5-A 를 tcgcollector(=Bulbapedia 표준 타입그룹) 번호로 재번호.
 * 카드 풀은 tcgc와 100% 동일(검증완). 매칭: 포켓몬=dex+LV.X+폼토큰(JP명 마커 vs tcgc 영문폼 — EN연결 교차 무력화),
 *   트레이너/에너지=영문연결명, 폴백 잔여 1:1. 기본에너지 8종은 tcgc 최대번호 뒤로 append. number-only(id 보존).
 * 실행: npx tsx scripts/renumber-dp-tcgc-order.ts [--set=DP2] [--apply]
 */
import "dotenv/config";
import { prisma } from "@/lib/prisma";
import { readFileSync, writeFileSync } from "node:fs";
import { resolveCardDexes } from "./lib/pokeapi-names";

const SP = "/tmp/claude-1000/-home-lyyw205-repos-raredoc/351871d5-fe23-4a04-b450-81a162627087/scratchpad";
const APPLY = process.argv.includes("--apply");
const VERBOSE = process.argv.includes("--verbose");
const ONLY = process.argv.find((a) => a.startsWith("--set="))?.split("=")[1];
const MAP = [
  { key: "DP2",  set: "jp-tcg-DP2",  tc: "p-11210" },
  { key: "DP3",  set: "jp-tcg-DP3",  tc: "p-11231" },
  { key: "DP5H", set: "jp-tcg-DP5H", tc: "p-11255" },
  { key: "DP5A", set: "jp-tcg-DP5A", tc: "p-11200" },
].filter((m) => !ONLY || m.key === ONLY);

type Tc = { number: string; name: string; rarity: string | null };
const norm = (s: string) => s.toLowerCase().replace(/♀/g, "f").replace(/♂/g, "m").replace(/lv\.?\s*x/g, "lvx").replace(/[^a-z0-9]/g, "");
const lvx = (s: string | null | undefined) => !!s && /lv\.?\s*x/i.test(s);
const stripEn = (s: string | null | undefined) => (s ? s.replace(/\s*\[.*$/, "").trim() : null);

// 폼 토큰 (언어무관 canonical)
const enForm = (n: string): string | null => {
  if (/West Sea/i.test(n)) return "west"; if (/East Sea/i.test(n)) return "east";
  if (/Plant Cloak/i.test(n)) return "plant"; if (/Sandy Cloak/i.test(n)) return "sandy"; if (/Trash Cloak/i.test(n)) return "trash";
  if (/Sunny/i.test(n)) return "sunny"; if (/Rain Form/i.test(n)) return "rain"; if (/Snow/i.test(n)) return "snow";
  if (/Normal Forme/i.test(n)) return "normal"; if (/Attack Forme/i.test(n)) return "attack"; if (/Defense Forme/i.test(n)) return "defense"; if (/Speed Forme/i.test(n)) return "speed";
  const u = n.match(/Unown\s*\[?([A-Za-z?!])\]?/i); if (u) return "u:" + u[1].toUpperCase();
  return null;
};
const jpForm = (n: string): string | null => {
  if (/にしのうみ/.test(n)) return "west"; if (/ひがしのうみ/.test(n)) return "east";
  if (/くさき/.test(n)) return "plant"; if (/すなち/.test(n)) return "sandy"; if (/ゴミ/.test(n)) return "trash";
  if (/太陽/.test(n)) return "sunny"; if (/雨水/.test(n)) return "rain"; if (/雪雲/.test(n)) return "snow";
  if (/ノーマル/.test(n)) return "normal"; if (/アタック/.test(n)) return "attack"; if (/ディフェンス/.test(n)) return "defense"; if (/スピード/.test(n)) return "speed";
  const u = n.match(/[\[［]([A-Za-z?!])[\]］]/); if (u) return "u:" + u[1].toUpperCase();
  return null;
};

async function run(m: typeof MAP[number]) {
  const tc: Tc[] = JSON.parse(readFileSync(`${SP}/${m.tc}.json`, "utf-8"));
  const rcs = await prisma.regionCard.findMany({
    where: { setId: m.set },
    select: { id: true, number: true, numberInt: true, name: true,
      card: { select: { id: true, supertype: true, pokedexNumbers: true, primarySetId: true,
        locales: { where: { region: "EN" }, select: { name: true }, take: 1 } } } },
  });
  type R = typeof rcs[number];
  const isBasic = (r: R) => r.card?.supertype === "Energy" && /基本.*エネルギー/.test(r.name);
  const main = rcs.filter((r) => !isBasic(r));
  const basics = rcs.filter((r) => isBasic(r));
  const dbEn = (r: R) => stripEn(r.card?.locales?.[0]?.name);
  const dbDex = (r: R) => (r.card?.pokedexNumbers ?? []).slice().sort((a, b) => a - b);

  // composite poké key: dex|lvx|form (DB form=jpForm, tcgc form=enForm)
  const dbPoke = (r: R) => { const d = dbDex(r); if (!d.length) return null; return `${d.join("/")}|${lvx(r.card?.locales?.[0]?.name) || lvx(r.name) ? "X" : ""}|${jpForm(r.name) ?? ""}`; };
  const tcPoke = (c: Tc) => { const d = resolveCardDexes(c.name, "en"); if (!d.length) return null; return `${d.slice().sort((a, b) => a - b).join("/")}|${lvx(c.name) ? "X" : ""}|${enForm(c.name) ?? ""}`; };

  const assign = new Map<string, { num: string; via: string; tcName: string }>();
  const usedRc = new Set<string>();
  const queue = (arr: R[], keyf: (r: R) => string | null) => { const mp = new Map<string, R[]>(); for (const r of arr) { const k = keyf(r); if (k) (mp.get(k) ?? mp.set(k, []).get(k)!).push(r); } return mp; };

  // Pass A: poké composite key
  const byPoke = queue(main, dbPoke);
  // Pass B: en-link
  const byEn = queue(main, (r) => { const e = dbEn(r); return e ? "e:" + norm(e) : null; });
  // Pass C: dex+lvx ignoring form
  const byDexLvx = queue(main, (r) => { const d = dbDex(r); return d.length ? `${d.join("/")}|${lvx(r.card?.locales?.[0]?.name) || lvx(r.name) ? "X" : ""}` : null; });

  const take = (mp: Map<string, R[]>, k: string | null): R | undefined => { if (!k) return; const q = mp.get(k)?.filter((r) => !usedRc.has(r.id)); return q && q.length ? q[0] : undefined; };
  const unresolved: Tc[] = [];
  for (const c of tc) {
    let cand = take(byPoke, tcPoke(c)); let via = "poke";
    if (!cand) { cand = take(byEn, "e:" + norm(c.name)); via = "en"; }
    if (!cand) { const d = resolveCardDexes(c.name, "en"); cand = take(byDexLvx, d.length ? `${d.slice().sort((a, b) => a - b).join("/")}|${lvx(c.name) ? "X" : ""}` : null); via = "dexlvx"; }
    if (!cand) { unresolved.push(c); continue; }
    usedRc.add(cand.id); assign.set(cand.id, { num: c.number, via, tcName: c.name });
  }
  let unmatchedDb = main.filter((r) => !usedRc.has(r.id));
  // Pass D: residue 1:1 (둘 다 1개씩 남으면 매칭) — supertype 같을 때만
  if (unresolved.length && unmatchedDb.length) {
    for (const c of [...unresolved]) {
      const cands = unmatchedDb;
      if (cands.length === 1) { const r = cands[0]; usedRc.add(r.id); assign.set(r.id, { num: c.number, via: "residue1:1", tcName: c.name }); unmatchedDb = main.filter((x) => !usedRc.has(x.id)); unresolved.splice(unresolved.indexOf(c), 1); }
    }
  }

  // form contradiction 검사
  const contradictions: string[] = [];
  for (const r of main) { const a = assign.get(r.id); if (!a) continue; const jf = jpForm(r.name), ef = enForm(a.tcName); if (jf && ef && jf !== ef) contradictions.push(`${a.num} tcgc=${a.tcName}(${ef}) ↔ DB ${r.name}(${jf})`); }

  // basics append
  const tcMax = Math.max(...tc.map((c) => parseInt(c.number, 10)));
  basics.slice().sort((a, b) => (a.numberInt ?? 0) - (b.numberInt ?? 0)).forEach((r, i) => assign.set(r.id, { num: String(tcMax + 1 + i).padStart(3, "0"), via: "basicE", tcName: r.name }));

  const newNums = [...assign.values()].map((v) => v.num); const dup = [...new Set(newNums.filter((n, i) => newNums.indexOf(n) !== i))];
  const changes = rcs.filter((r) => { const a = assign.get(r.id); return a && a.num !== r.number; }).length;
  const ok = unresolved.length === 0 && unmatchedDb.length === 0 && dup.length === 0 && contradictions.length === 0;
  console.log(`\n### ${m.key} (${m.set}): tc ${tc.length} | DB ${rcs.length} (main ${main.length}, basicE ${basics.length}) | changes ${changes}`);
  const vias: Record<string, number> = {}; for (const v of assign.values()) vias[v.via] = (vias[v.via] || 0) + 1;
  console.log(`   via:`, JSON.stringify(vias));
  if (unresolved.length) console.log(`   ⚠ tcgc UNRESOLVED:`, unresolved.map((c) => `${c.number}:${c.name}`).join(", "));
  if (unmatchedDb.length) console.log(`   ⚠ DB UNMATCHED:`, unmatchedDb.map((r) => `${r.number}:${r.name}`).join(", "));
  if (dup.length) console.log(`   ✗ DUP new numbers: ${dup.join(", ")}`);
  if (contradictions.length) console.log(`   ✗ FORM CONTRADICTION:\n     ` + contradictions.join("\n     "));
  console.log(`   integrity: ${ok ? "✓ OK" : "✗ NEEDS FIX"}`);
  // 폼 그룹 검증 출력
  const formRows = main.filter((r) => jpForm(r.name)).map((r) => { const a = assign.get(r.id)!; return `     #${a.num} ← ${r.name}  (tcgc:${a.tcName})`; });
  if (formRows.length && (VERBOSE || contradictions.length)) { console.log(`   form pairings:`); formRows.sort().forEach((s) => console.log(s)); }

  if (APPLY && ok) {
    const backup = rcs.map((r) => ({ id: r.id, old: r.number, oldInt: r.numberInt, new: assign.get(r.id)?.num })).filter((x) => x.new && x.new !== x.old);
    writeFileSync(`${SP}/renumber-backup-${m.set}.json`, JSON.stringify(backup, null, 0));
    console.log(`   💾 backup ${backup.length} → renumber-backup-${m.set}.json`);
    let n = 0;
    for (const r of rcs) { const a = assign.get(r.id); if (!a || a.num === r.number) continue;
      await prisma.regionCard.update({ where: { id: r.id }, data: { number: a.num, numberInt: parseInt(a.num, 10) } });
      if (r.card?.primarySetId === m.set) await prisma.card.update({ where: { id: r.card.id }, data: { primaryNumber: a.num, primaryNumberInt: parseInt(a.num, 10) } });
      n++; }
    console.log(`   ✅ applied ${n}`);
  } else if (APPLY) console.log(`   ⛔ SKIP apply (integrity fail)`);
  return ok;
}
async function main() {
  console.log(`=== DP renumber → tcgc order ${APPLY ? "★APPLY" : "(dry-run)"} ===`);
  let allOk = true; for (const m of MAP) allOk = (await run(m)) && allOk;
  console.log(`\n${allOk ? "✓ all integrity OK" : "✗ fix needed"}`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
