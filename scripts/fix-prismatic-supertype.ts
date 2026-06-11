/**
 * jp-sv-prismatic-evolutions 데이터 교정 — 일부 시크릿레어 포켓몬이 supertype="Trainer"/subtypes=[Supporter]·
 * dex 누락으로 오분류돼 있음. 이름이 포켓몬으로 resolve 되는 Trainer 카드를 EN(pokemontcg.io, 권위) 기준으로
 *   supertype=Pokémon, pokedexNumbers=[dex], subtypes=EN기반(Stage/ex; Tera/Ancient/Future 는 병합때 enrich) 로 교정.
 * 실행: npx tsx scripts/fix-prismatic-supertype.ts [--apply]
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { resolveCardDexes } from "./lib/pokeapi-names";

const ENMECH = ["Tera", "Ancient", "Future"];
const JP = "jp-sv-prismatic-evolutions", EN = "sv8pt5", APPLY = process.argv.includes("--apply");
// jaDex 가 못 푸는 특수 폼은 수동 매핑
const NAME_DEX: Record<string, number> = { "ガチグマ アカツキex": 901 }; // Bloodmoon Ursaluna ex
const jaDex = (n: string): number | null => { if (NAME_DEX[n.trim()] != null) return NAME_DEX[n.trim()]; const c = n.replace(/(ex|ＥＸ|V|VMAX|VSTAR|GX)$/i, "").replace(/\s+/g, "").trim(); const d = resolveCardDexes(c, "ja" as "ko"); return d.length ? d[0] : null; };
const baseSubs = (subs: string[]) => subs.filter((s) => !ENMECH.includes(s)); // JP 베이스(Stage/ex). Tera/Ancient/Future 는 병합 enrich
// EN sv8pt5 에 없는 JP단독 종(진화단계/패러독스를 EN 으로 못 얻음) → 명시 오버라이드(dex 기준)
const SUB_OVERRIDE: Record<number, string[]> = {
  571: ["Stage 1"],                 // ゾロアーク Zoroark
  1021: ["Basic", "ex", "Ancient"], // タケルライコex Raging Bolt ex (고대)
  986: ["Basic", "Ancient"],        // アラブルタケ Brute Bonnet (고대)
  901: ["Basic", "ex"],             // ガチグマ アカツキex Bloodmoon Ursaluna ex (특수 Basic ex)
};
async function fetchSet(sid: string) { const out: any[] = []; for (let pg = 1; pg <= 5; pg++) { const r = await fetch(`https://api.pokemontcg.io/v2/cards?q=set.id:${sid}&pageSize=250&page=${pg}`); const j = await r.json(); if (!j.data?.length) break; out.push(...j.data); if (j.data.length < 250) break; } return out; }

async function main() {
  const en = await fetchSet(EN);
  // EN dex → { ex여부: subtypes }
  const enByDexEx = new Map<string, string[]>();
  for (const c of en) { if (!["Pokémon", "Pokemon"].includes(c.supertype)) continue; const dex = c.nationalPokedexNumbers?.[0]; if (dex == null) continue; const ex = (c.subtypes ?? []).includes("ex"); enByDexEx.set(`${dex}|${ex}`, baseSubs(c.subtypes ?? [])); }

  const jp = await prisma.regionCard.findMany({ where: { setId: JP }, select: { number: true, name: true, logicalCardId: true, logicalCard: { select: { supertype: true } } } });
  const mis = jp.filter((j) => j.logicalCard.supertype === "Trainer" && jaDex(j.name) != null);
  console.log(`오분류 포켓몬 ${mis.length}장 교정 ${APPLY ? "★적용" : "(dry)"}:`);
  for (const j of mis) {
    const dex = jaDex(j.name)!;
    const isEx = /ex$/i.test(j.name.trim());
    const subs = SUB_OVERRIDE[dex] ?? enByDexEx.get(`${dex}|${isEx}`) ?? enByDexEx.get(`${dex}|${!isEx}`) ?? (isEx ? ["Basic", "ex"] : ["Basic"]);
    console.log(`  #${j.number} ${j.name} → Pokémon dex${dex} [${subs}]`);
    if (APPLY) await prisma.logicalCard.update({ where: { id: j.logicalCardId }, data: { supertype: "Pokémon", pokedexNumbers: [dex], subtypes: subs } });
  }
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
