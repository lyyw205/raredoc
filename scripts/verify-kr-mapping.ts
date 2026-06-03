/**
 * KR 공식 매핑 정합성 전수 검증 (읽기전용). apply-kr-official 결과가 옳은지 독립 신호로 교차검증.
 *   - 포켓몬: KR koName→dex(PokeAPI ko) 가 붙은 JP 앵커 LC 의 dex 와 일치하는가 (매칭키와 독립)
 *   - 전체: KR 공식 일러스트레이터 == JP 앵커 LC 일러스트레이터
 * 불일치 = 오매핑 의심 → 출력.
 *
 * 실행: npx tsx scripts/verify-kr-mapping.ts
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { readFileSync } from "node:fs";
import { resolveCardDexes } from "./lib/pokeapi-names";

const POKE = ["Pokémon", "Pokemon"];
const SETS: [string, string][] = [
  ["kr-sv2p", "sv2p"], ["kr-sv2d", "sv2d"], ["kr-sv4k", "sv4k"], ["kr-sv4m", "sv4m"], ["kr-sv-151", "sv2a"], ["kr-sv3", "sv3"], ["kr-sv3a", "sv3a"], ["kr-sv4a", "sv4a"], ["kr-sv5k", "sv5k"], ["kr-sv5m", "sv5m"], ["kr-sv5a", "sv5a"], ["kr-sv6", "sv6"], ["kr-sv6a", "sv6a"], ["kr-sv7", "sv7"], ["kr-sv7a", "sv7a"], ["kr-sv8", "sv8"], ["kr-sv8a", "sv8a"], ["kr-sv9", "sv9"], ["kr-sv9a", "sv9a"], ["kr-sv10", "sv10"], ["kr-sv11b", "sv11b"], ["kr-sv11w", "sv11w"],
  ["kr-m1l", "m1l"], ["kr-m1s", "m1s"], ["kr-m2", "m2"], ["kr-m2a", "m2a"], ["kr-m3", "m3"], ["kr-m4", "m4"], ["kr-s12a", "s12a"], ["kr-s12", "s12"], ["kr-s11a", "s11a"],
];
const norm = (s: string | null) => (s ?? "").trim().toLowerCase();

async function main() {
  let totDexBad = 0, totIllusBad = 0, totPoke = 0, totChk = 0;
  for (const [krSet, code] of SETS) {
    const off = JSON.parse(readFileSync(`data/kr-official/kr-official-${code}.json`, "utf8"));
    const offByNum = new Map<number, any>(off.map((c: any) => [parseInt(c.number, 10), c]));
    const kr = await prisma.cardLocale.findMany({ where: { setId: krSet },
      select: { number: true, numberInt: true, name: true, logicalCard: { select: { pokedexNumbers: true, illustrator: true, supertype: true } } } });

    const dexBad: string[] = [], illusBad: string[] = [];
    let poke = 0;
    for (const r of kr) {
      const o = offByNum.get(r.numberInt!);
      if (!o) { illusBad.push(`#${r.number} ${r.name} (공식 번호없음)`); continue; }
      const lc = r.logicalCard;
      // 일러 검증 (공식 일러 존재 시)
      if (o.illustrator && lc.illustrator && norm(o.illustrator) !== norm(lc.illustrator))
        illusBad.push(`#${r.number} ${r.name}: 공식일러"${o.illustrator}" ≠ 앵커"${lc.illustrator}"`);
      // dex 검증 (포켓몬: KR 한글명→dex 가 앵커 dex 와 일치?)
      if (POKE.includes(lc.supertype ?? "")) {
        poke++;
        const koDexes = resolveCardDexes(r.name, "ko");
        const anchorDex = lc.pokedexNumbers ?? [];
        const ok = koDexes.length === 0 ? null : koDexes.some((d) => anchorDex.includes(d));
        if (ok === false) dexBad.push(`#${r.number} ${r.name}: 이름→dex[${koDexes}] ≠ 앵커dex[${anchorDex}]`);
      }
    }
    totDexBad += dexBad.length; totIllusBad += illusBad.length; totPoke += poke; totChk += kr.length;
    console.log(`\n■ ${krSet} (n${kr.length}, 포켓몬 ${poke})`);
    console.log(`  dex 불일치 ${dexBad.length} · 일러 불일치 ${illusBad.length}`);
    for (const x of dexBad.slice(0, 12)) console.log(`   ✗dex ${x}`);
    for (const x of illusBad.slice(0, 12)) console.log(`   ✗illus ${x}`);
  }
  console.log(`\n═══ 합계: 검증 ${totChk}장(포켓몬 ${totPoke}) · dex불일치 ${totDexBad} · 일러불일치 ${totIllusBad} ═══`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
