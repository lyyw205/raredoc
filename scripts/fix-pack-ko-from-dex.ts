/**
 * 팩 단위 한글명 정정 — pokedexNumbers(정본) 기준으로 CardText(ko)/nameKo 재파생.
 *
 * 배경: 일부 TCGdex 수록 세트는 과거 한글명이 "카드번호=도감번호" 오매핑으로 채워졌고
 *       (예: #1 イトマル(dex167)인데 ko="이상해씨"(dex1)), 이후 pokedexNumbers만 올바르게
 *       교정돼 한글명이 stale 상태. 올바른 pokedexNumbers 로 ko 를 다시 만든다.
 *
 * 동작: 포켓몬(hp 보유 + pokedexNumbers 있음) 카드에 대해 PokeAPI species/{dex} 의 ko 이름과
 *       현재 CardText(ko).name 을 비교, 다르면 **덮어쓰기**(nameKo 도). source="pokeapi".
 *       (확신 없음 = dex 없거나 PokeAPI 실패 → 건너뜀)
 *
 * 실행: npx tsx scripts/fix-pack-ko-from-dex.ts <setId> [--dry-run]
 */
import "dotenv/config";
import { prisma } from "@/lib/prisma";

const SET = process.argv[2];
const DRY = process.argv.includes("--dry-run");
if (!SET || SET.startsWith("--")) { console.error("usage: <setId> [--dry-run]"); process.exit(1); }
const UA = "raredoc-meta-enricher/0.1 (non-commercial)";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const koCache = new Map<number, string | null>();
async function koByDex(dex: number): Promise<string | null> {
  if (koCache.has(dex)) return koCache.get(dex)!;
  let ko: string | null = null;
  try {
    const res = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${dex}/`, { headers: { "User-Agent": UA } });
    if (res.ok) { const j: any = await res.json(); ko = j.names?.find((x: any) => x.language.name === "ko")?.name ?? null; }
  } catch { /* skip */ }
  koCache.set(dex, ko);
  return ko;
}

async function main() {
  const cards = await prisma.regionCard.findMany({
    where: { setId: SET },
    select: { name: true, card: { select: { id: true, hp: true, pokedexNumbers: true, nameKo: true } } },
  });
  const pokes = cards.filter((c) => c.card.hp != null && c.card.pokedexNumbers?.length);
  console.log(`[init] ${SET}: 포켓몬+도감번호 ${pokes.length} (dry=${DRY})`);

  let corrected = 0, ok = 0, miss = 0;
  const seen = new Set<string>();
  const samples: string[] = [];
  for (const c of pokes) {
    const lc = c.card;
    if (seen.has(lc.id)) continue; seen.add(lc.id);
    const dex = lc.pokedexNumbers[0];
    const ko = await koByDex(dex);
    await sleep(40);
    if (!ko) { miss++; continue; }
    const cur = await prisma.cardText.findUnique({ where: { cardId_language: { cardId: lc.id, language: "ko" } }, select: { name: true } });
    if (cur?.name === ko && lc.nameKo === ko) { ok++; continue; }
    if (samples.length < 12) samples.push(`"${c.name}" dex${dex}: "${cur?.name ?? "-"}" → "${ko}"`);
    if (!DRY) {
      await prisma.cardText.upsert({
        where: { cardId_language: { cardId: lc.id, language: "ko" } },
        update: { name: ko, source: "pokeapi" },
        create: { cardId: lc.id, language: "ko", name: ko, source: "pokeapi", confidence: 0.95 },
      });
      await prisma.card.update({ where: { id: lc.id }, data: { nameKo: ko } });
    }
    corrected++;
  }
  console.log("\n=== KO FIX SUMMARY ===");
  console.log({ set: SET, pokemon: seen.size, alreadyOk: ok, corrected, pokeapiMiss: miss });
  console.log("변경 샘플:"); samples.forEach((s) => console.log("  " + s));
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
