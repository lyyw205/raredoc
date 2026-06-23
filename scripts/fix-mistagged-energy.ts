/**
 * 오분류 기본에너지 교정 — supertype 이 Pokémon 으로 잘못 박힌 기본에너지를 Energy 로.
 *   대상: 주 이름(JP 基本…エネルギー / EN Basic … Energy)이 기본에너지인데 supertype=Pokémon.
 *   조치: supertype→"Energy", pokedexNumbers→[](에너지 무dex), CardSpecies 링크 삭제(잘못 연결된 종).
 *         subtypes·gameCardId 는 보존(차후 GameCard 재빌드가 정합).
 *   ※ 동결팩 가드: 영향 카드가 PROTECTED_GROUPS 면 기본 스킵(보고). --allow-protected 로만 포함.
 *      (supertype 은 EN/KR 매칭과 무관하나, 동결팩 DB 변경은 규칙상 확인 체크포인트.)
 *
 * 실행: npx tsx scripts/fix-mistagged-energy.ts            (dry-run)
 *       npx tsx scripts/fix-mistagged-energy.ts --apply
 *       npx tsx scripts/fix-mistagged-energy.ts --apply --allow-protected   (동결팩 포함)
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { PROTECTED_GROUPS } from "./lib/protected-groups";

const APPLY = process.argv.includes("--apply");
const ALLOW = process.argv.includes("--allow-protected");

const isEnergyName = (jp: string, en: string) =>
  /^基本.*エネルギー$/.test(jp) || /^basic .*energy$/i.test(en.trim());

async function main() {
  console.log(`오분류 기본에너지 교정 ${APPLY ? "★APPLY" : "(dry-run)"}${ALLOW ? " [+동결]" : ""}`);
  const cands = await prisma.card.findMany({
    where: {
      supertype: { in: ["Pokémon", "Pokemon"] },
      locales: { some: { OR: [{ name: { startsWith: "基本" } }, { name: { startsWith: "Basic" } }] } },
    },
    select: {
      id: true, pokedexNumbers: true,
      locales: { select: { region: true, name: true, set: { select: { cardPackId: true } } } },
      speciesLinks: { select: { speciesId: true } },
    },
  });

  const targets = cands.filter((c) => {
    const jp = c.locales.find((l) => l.region === "JP")?.name ?? "";
    const en = c.locales.find((l) => l.region === "EN")?.name ?? "";
    return isEnergyName(jp, en);
  });

  // 동결 판정: 카드의 어떤 locale 이든 PROTECTED_GROUPS 팩 소속이면 보호(보수적).
  const isProtected = (c: typeof targets[number]) =>
    c.locales.some((l) => l.set.cardPackId && PROTECTED_GROUPS.has(l.set.cardPackId));

  const free = targets.filter((c) => !isProtected(c));
  const frozen = targets.filter((c) => isProtected(c));
  const apply = ALLOW ? targets : free;

  console.log(`대상 ${targets.length} = 비동결 ${free.length} + 동결 ${frozen.length}`);
  if (frozen.length) {
    console.log(`  ⚠ 동결팩 ${frozen.length}장 ${ALLOW ? "(--allow-protected: 포함)" : "(스킵 — --allow-protected 필요)"}:`);
    frozen.forEach((c) => console.log(`    ${c.id}  팩=[${[...new Set(c.locales.map((l) => l.set.cardPackId).filter(Boolean))]}]  dex=[${c.pokedexNumbers}] 링크=${c.speciesLinks.length}`));
  }
  const withDex = apply.filter((c) => c.pokedexNumbers.length > 0 || c.speciesLinks.length > 0);
  console.log(`  적용대상 ${apply.length}장: supertype→Energy · dex클리어/링크삭제 필요 ${withDex.length}장`);

  if (!APPLY) { console.log(`\n[dry-run] 변경 없음.`); await prisma.$disconnect(); return; }

  let done = 0;
  for (const c of apply) {
    await prisma.$transaction([
      prisma.card.update({ where: { id: c.id }, data: { supertype: "Energy", pokedexNumbers: [] } }),
      prisma.cardSpecies.deleteMany({ where: { cardId: c.id } }),
    ]);
    done++;
  }
  console.log(`\n✅ 교정 ${done}장 (supertype→Energy, dex/링크 정리)`);
  console.log(`  ※ gameCardId 는 보존 — 차후 GameCard 재빌드 시 Energy 키로 재그룹.`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
