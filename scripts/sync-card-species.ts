/**
 * 종(Species) 링크 동기화 — Card.pokedexNumbers ↔ CardSpecies 정합.
 *   목적: /test·/dex 도감번호 뷰에서 누락된 포켓몬 0 (번호는 맞는데 링크만 빠진 것 채움).
 *   권위: Card.pokedexNumbers (fix-pokedex-mapping.ts 로 PokeAPI 정합 완료된 값).
 *
 * 정책:
 *   ADD   : pokedexNumbers 에 있고 Species 존재하는데 CardSpecies 링크 없음 → 생성
 *   PRUNE : (--prune) CardSpecies 있는데 pokedexNumbers 에 없음(=교정으로 stale) → 삭제. 기본 OFF(안전).
 *   포켓몬(supertype Pokémon)만 대상. 트레이너/아이템/에너지는 종 없음이 정상 → 건드리지 않음.
 *   Species 미존재(시드 밖 dex)·dex<=0 은 건너뜀(FK 안전).
 *   ※ EN/KR 매칭·팩소속과 무관(종은 도감 네비 축) → 동결팩 가드 불필요.
 *
 * 실행:
 *   npx tsx scripts/sync-card-species.ts --dry-run         # 계획만 ← 먼저
 *   npx tsx scripts/sync-card-species.ts                   # ADD 적용
 *   npx tsx scripts/sync-card-species.ts --prune           # ADD + stale 삭제
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { POKE } from "./lib/supertype";

const DRY = process.argv.includes("--dry-run");
const PRUNE = process.argv.includes("--prune");
const SAMPLES = parseInt(process.argv.find((a) => a.startsWith("--samples="))?.split("=")[1] ?? "15", 10);

async function main() {
  console.log(`종 링크 싱크 ${DRY ? "[DRY-RUN]" : ""}${PRUNE ? " [+prune]" : ""}`);

  const validSpecies = new Set((await prisma.species.findMany({ select: { id: true } })).map((s) => s.id));
  console.log(`Species 시드 ${validSpecies.size}개`);

  const cards = await prisma.card.findMany({
    where: { supertype: { in: POKE as unknown as string[] } },
    select: {
      id: true,
      pokedexNumbers: true,
      speciesLinks: { select: { speciesId: true } },
      locales: { select: { name: true }, take: 1 },
    },
  });
  console.log(`포켓몬 Card ${cards.length}\n`);

  const toAdd: { cardId: string; speciesId: number }[] = [];
  const toRemove: { cardId: string; speciesId: number }[] = [];
  let cardsGainingLinks = 0;
  let cardsNoValidDex = 0; // dex 없거나 Species 미존재 → 링크 불가(어려운 꼬리)
  const noDexSamples: string[] = [];
  const addSamples: string[] = [];

  for (const c of cards) {
    const desired = new Set(
      (c.pokedexNumbers ?? []).filter((d) => d > 0 && validSpecies.has(d)),
    );
    const current = new Set(c.speciesLinks.map((l) => l.speciesId));

    if (desired.size === 0) {
      if (current.size === 0) {
        cardsNoValidDex++;
        if (noDexSamples.length < SAMPLES) noDexSamples.push(`"${c.locales[0]?.name ?? "?"}" (${c.id})`);
      }
      // desired 0 인데 current 있으면 prune 대상(아래)
    }

    const adds = [...desired].filter((d) => !current.has(d));
    if (adds.length > 0) {
      cardsGainingLinks++;
      for (const d of adds) toAdd.push({ cardId: c.id, speciesId: d });
      if (addSamples.length < SAMPLES) addSamples.push(`"${c.locales[0]?.name ?? "?"}" +[${adds}] (${c.id})`);
    }
    for (const d of current) if (!desired.has(d)) toRemove.push({ cardId: c.id, speciesId: d });
  }

  console.log(`계획:`);
  console.log(`  ADD   링크 ${toAdd.length}개 (카드 ${cardsGainingLinks}장 새로 도감 노출)`);
  console.log(`  PRUNE stale 링크 ${toRemove.length}개 ${PRUNE ? "(삭제함)" : "(--prune 시 삭제, 지금은 보존)"}`);
  console.log(`  링크 불가(dex없음·Species밖) ${cardsNoValidDex}장 ← 어려운 꼬리(자동 안 됨)`);

  console.log(`\n── ADD 샘플 앞 ${SAMPLES} ──`);
  addSamples.forEach((s) => console.log(`  ${s}`));
  console.log(`\n── 링크 불가(dex없음) 샘플 앞 ${SAMPLES} ──`);
  noDexSamples.forEach((s) => console.log(`  ${s}`));

  if (DRY) { console.log(`\n[DRY-RUN] 변경 없음.`); await prisma.$disconnect(); return; }

  if (toAdd.length > 0) {
    let done = 0;
    for (let i = 0; i < toAdd.length; i += 1000) {
      const r = await prisma.cardSpecies.createMany({ data: toAdd.slice(i, i + 1000), skipDuplicates: true });
      done += r.count;
    }
    console.log(`\n✅ ADD 적용 ${done}/${toAdd.length}`);
  }
  if (PRUNE && toRemove.length > 0) {
    let pruned = 0;
    for (const r of toRemove) {
      const res = await prisma.cardSpecies.deleteMany({ where: { cardId: r.cardId, speciesId: r.speciesId } });
      pruned += res.count;
    }
    console.log(`✅ PRUNE 삭제 ${pruned}/${toRemove.length}`);
  }
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
