/**
 * KR 분할세트 한글이름 채우기 — 포켓몬은 PokeAPI ko(표준표) by dex.
 *   - LogicalCard.nameKo = 종 한글명(예: 쏘콘)
 *   - KR CardLocale.name = 종명 + suffix(ex/V/VMAX/VSTAR/GX) (예: 쏘콘ex)
 *   - 멀티 dex(태그팀)는 " & " 로 종명 결합.
 * 트레이너/에너지(dex 없음)는 건너뛰고 카운트만 보고 → namu 로 별도 처리.
 *
 * 실행: npx tsx scripts/fill-kr-names.ts [--set=kr-sv2p] [--apply]
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { getName } from "./lib/pokeapi-names";

const APPLY = process.argv.includes("--apply");
const SETS = ["kr-sv2p", "kr-sv2d", "kr-sv4k", "kr-sv4m"];
const POKE = ["Pokémon", "Pokemon"];

// LC.subtypes → 카드명 접미사 (한국판 표기: 공백 + 접미사, 예 "갸라도스 ex")
function suffixOf(subtypes: string[]): string {
  const s = subtypes.map((x) => x.toLowerCase());
  if (s.includes("vmax")) return " VMAX";
  if (s.includes("vstar")) return " VSTAR";
  if (s.includes("v")) return " V";
  if (s.includes("gx")) return " GX";
  if (s.includes("ex")) return " ex";
  return "";
}

async function main() {
  const setArg = process.argv.find((a) => a.startsWith("--set="))?.slice("--set=".length);
  const targets = setArg ? [setArg] : SETS;

  for (const setId of targets) {
    const cards = await prisma.cardLocale.findMany({ where: { setId }, orderBy: { numberInt: "asc" },
      select: { id: true, number: true, name: true, logicalCardId: true,
        logicalCard: { select: { supertype: true, subtypes: true, pokedexNumbers: true, nameKo: true } } } });
    let pokeOk = 0, pokeNoDexKo = 0, trainer = 0, sample = 0; const miss: string[] = [];

    for (const c of cards) {
      const lc = c.logicalCard;
      if (!POKE.includes(lc.supertype ?? "")) { trainer++; continue; }
      const dexes = lc.pokedexNumbers ?? [];
      const koParts = dexes.map((d) => getName(d, "ko")).filter(Boolean) as string[];
      if (!koParts.length) { pokeNoDexKo++; miss.push(`#${c.number} "${c.name}"(dex[${dexes}])`); continue; }
      const species = koParts.join(" & ");
      const suffix = suffixOf(lc.subtypes ?? []);
      const cardName = species + suffix; // 풀 카드명 (예: "쏘콘 ex") — kr-sv1s 컨벤션: CardLocale.name == nameKo

      if (sample < 5) { console.log(`  #${c.number} "${c.name}" → "${cardName}" (nameKo 동일)`); sample++; }
      if (APPLY) {
        await prisma.cardLocale.update({ where: { id: c.id }, data: { name: cardName } });
        if (c.logicalCardId) await prisma.logicalCard.update({ where: { id: c.logicalCardId }, data: { nameKo: cardName } });
      }
      pokeOk++;
    }
    console.log(`${setId}: 포켓몬 채움 ${pokeOk} · 포켓몬 dex/ko없음 ${pokeNoDexKo} · 트레이너·에너지(namu대상) ${trainer} ${APPLY ? "★적용" : "(dry)"}`);
    if (miss.length) console.log(`   ko못찾음: ${miss.slice(0, 8).join(", ")}`);
  }
  await prisma.$disconnect();
  if (!APPLY) console.log(`\n(dry) 적용: --apply`);
}
main().catch((e) => { console.error(e); process.exit(1); });
