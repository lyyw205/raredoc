/**
 * NEO2 untangle 잔류 처리: EN#35 Wobbuffet 를 Unown[A] LC(lc-orphan-jp-tcg-neo2-030)에서 분리 → EN 전용 고아 LC.
 *
 * 배경: EN Neo Discovery 엔 Wobbuffet 2장(#16·#35), JP 遺跡をこえて 엔 1장(#031). 스크램블 시절 #035 가 (당시 Wobbuffet 였던)
 *   JP#030 LC 에 묶임. JP#030 이 Unown[A] 로 교정되며 EN#35 가 Unown[A] LC 에 잘못 잔류 → 떼어내 자체 고아로.
 *   EN#16 은 JP#031 Wobbuffet 에 유지. EN#35(HP90 Counter, 다른 일러)는 EN 단독 카드.
 *
 * dry: npx tsx scripts/detach-neo2-en35-wobbuffet.ts
 * 적용: npx tsx scripts/detach-neo2-en35-wobbuffet.ts --apply
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { assertMappingWritable, hasAllowProtectedFlag } from "./lib/protected-groups";

const APPLY = process.argv.includes("--apply");
const NEW_LC = "lc-orphan-en-tcg-neo2-35";
const OLD_LC = "lc-orphan-jp-tcg-neo2-030";
const WOBBUFFET = 202;

async function main() {
  const enSet = await prisma.set.findUnique({ where: { id: "en-tcg-neo2" }, select: { cardPackId: true } });
  assertMappingWritable([enSet!.cardPackId!], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "detach-neo2-en35-wobbuffet", what: "EN#35 Wobbuffet 분리(cardId 재연결)" });

  const en = await prisma.regionCard.findFirst({ where: { setId: "en-tcg-neo2", number: "35", region: "EN" }, select: { id: true, name: true, cardId: true, rarityId: true } });
  if (!en) throw new Error("EN#35 없음");
  if (en.cardId !== OLD_LC) { console.log(`EN#35 cardId=${en.cardId} (이미 ${OLD_LC} 아님) — 이미 분리됨? 중단`); return; }
  if (await prisma.card.findUnique({ where: { id: NEW_LC } })) throw new Error(`${NEW_LC} 이미 존재`);
  const sp = await prisma.species.findUnique({ where: { id: WOBBUFFET }, select: { nameKo: true, nameEn: true } });

  const cardData = {
    id: NEW_LC,
    primarySetId: "en-tcg-neo2", primaryNumber: "35", primaryNumberInt: 35,
    pokedexNumbers: [WOBBUFFET],
    supertype: "Pokémon", subtypes: ["Basic"], types: ["Psychic"], hp: 90,
    retreatCost: 3, weakness: null, resistance: null,
    illustrator: null,
    attacks: [{
      cost: ["Psychic"], name: "Counter", damage: "",
      effect: "If an attack damages Wobbuffet during your opponent's next turn (even if Wobbuffet is Knocked Out), flip a coin. If heads, Wobbuffet attacks the Defending Pokémon for an equal amount of damage.",
    }] as any,
    rarityId: en.rarityId,
    nameKo: sp?.nameKo ?? null,
  };

  console.log(`${APPLY ? "APPLY" : "DRY"} detach EN#35 Wobbuffet`);
  console.log(`  새 LC ${NEW_LC} 생성 (Wobbuffet ${WOBBUFFET}, HP90 Counter, ko=${cardData.nameKo})`);
  console.log(`  EN#35 RegionCard cardId ${OLD_LC} → ${NEW_LC}`);
  if (!APPLY) { console.log("적용: --apply"); return; }

  await prisma.card.create({ data: cardData as any });
  await prisma.cardSpecies.create({ data: { cardId: NEW_LC, speciesId: WOBBUFFET } });
  await prisma.regionCard.update({ where: { id: en.id }, data: { cardId: NEW_LC } });

  // 검증
  const lc030en = await prisma.regionCard.findMany({ where: { cardId: OLD_LC, region: "EN" }, select: { number: true, name: true } });
  const lc035 = await prisma.regionCard.findMany({ where: { cardId: NEW_LC }, select: { region: true, number: true, name: true } });
  console.log("  Unown[A] LC(030) 남은 EN:", JSON.stringify(lc030en), "(Unown[A]=#14 만 남아야)");
  console.log("  새 Wobbuffet LC(035):", JSON.stringify(lc035));
}
main().catch((e) => { console.error("FAIL:", e); process.exit(1); }).finally(() => prisma.$disconnect());
