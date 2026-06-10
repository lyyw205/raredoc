/**
 * EN 병합 검증 게이트 ① — 병합된 EN 포켓몬의 national dex 가 공유 JP LC 의 dex 와 일치하는지.
 * 실행: npx tsx scripts/verify-en-dex.ts <enSet> <jpSetId[,jpSetId2]>
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { POKE, isPokemonSupertype } from "./lib/supertype";
async function fetchSet(sid: string) { const code = sid.replace(/^en-tcg-/, ""); const out: any[] = []; for (let pg = 1; pg <= 5; pg++) { const r = await fetch(`https://api.pokemontcg.io/v2/cards?q=set.id:${code}&pageSize=250&page=${pg}`); const j = await r.json(); if (!j.data?.length) break; out.push(...j.data); if (j.data.length < 250) break; } return out; }
async function main() {
  const enSet = process.argv[2], jpSets = process.argv[3].split(",").map((s) => s.trim());
  const enDex = new Map((await fetchSet(enSet)).map((c: any) => [c.number, c.nationalPokedexNumbers?.[0] ?? null]));
  const jpL = new Set((await prisma.cardLocale.findMany({ where: { setId: { in: jpSets } }, select: { logicalCardId: true } })).map((x) => x.logicalCardId));
  const en = await prisma.cardLocale.findMany({ where: { setId: enSet }, select: { number: true, name: true, logicalCardId: true, logicalCard: { select: { supertype: true, pokedexNumbers: true } } } });
  let mism = 0, merged = 0;
  for (const e of en) { if (!jpL.has(e.logicalCardId)) continue; merged++; if (!isPokemonSupertype(e.logicalCard.supertype)) continue; const ed = enDex.get(e.number); const ld = e.logicalCard.pokedexNumbers?.[0]; if (ed != null && ld != null && ed !== ld) { mism++; console.log(`⚠ EN#${e.number} ${e.name} enDex=${ed}≠LC ${ld}`); } }
  console.log(`[${enSet}] 병합 ${merged}장 · dex ${mism ? `⚠불일치 ${mism}` : "✔전부 일치"}`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
