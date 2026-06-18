/**
 * kr-sm8a(다크오더 KR) 중복비대 dedup — 94행 → 61행.
 * 분석: 33개 'lc-kr-sm8a-*' LC에 붙은 KR 행은 전부 (이름+레어도) 트윈이 jp-orphan 행에 존재하는 팬텀 중복.
 *   (규리U+SR·데인저러스드릴U+UR 등 레어도 다른 멀티프린트는 트윈조건 불충족이라 삭제대상 아님 — 안전.)
 *   검증: krlc_with_twin=33, krlc_no_twin=0, 타세트 참조 0, 삭제 후 61=JP65−HR4(KR미발매).
 * 삭제: 'lc-kr-sm8a-%' 가리키는 kr-sm8a CardLocale 33행 + 자식없어진 해당 LogicalCard(있으면). cardCount 동기화.
 * og-sm8a 비동결. 실행: npx tsx scripts/fix-sm8a-kr-dedup.ts --apply
 */
import "dotenv/config";
import { prisma } from "../../../src/lib/prisma";

async function main() {
  const APPLY = process.argv.includes("--apply");
  const victims = await prisma.regionCard.findMany({
    where: { setId: "kr-sm8a", cardId: { startsWith: "lc-kr-sm8a-" } },
    select: { id: true, numberInt: true, name: true, cardId: true },
    orderBy: { numberInt: "asc" },
  });
  console.log(`■ kr-sm8a dedup | 삭제대상 ${victims.length}행 | ${APPLY ? "★APPLY" : "(dry-run)"}`);
  console.log("  샘플:", victims.slice(0, 6).map((v) => `#${v.numberInt} ${v.name}`).join(", "), "...");

  // 안전 재확인: 각 victim 이 (이름+레어도) 트윈을 non-kr-LC 행에 가지는지
  const keepers = await prisma.regionCard.findMany({
    where: { setId: "kr-sm8a", cardId: { not: { startsWith: "lc-kr-sm8a-" } } },
    select: { name: true, rarityId: true },
  });
  const keeperKey = new Set(keepers.map((k) => `${k.name}|${k.rarityId ?? "null"}`));
  const victimRows = await prisma.regionCard.findMany({
    where: { setId: "kr-sm8a", cardId: { startsWith: "lc-kr-sm8a-" } },
    select: { id: true, name: true, rarityId: true, numberInt: true },
  });
  const noTwin = victimRows.filter((v) => !keeperKey.has(`${v.name}|${v.rarityId ?? "null"}`));
  if (noTwin.length) {
    console.log(`  🔴 트윈없는 victim ${noTwin.length}행 발견 → 중단(수동확인):`, noTwin.map((v) => `#${v.numberInt} ${v.name}`).join(", "));
    await prisma.$disconnect();
    return;
  }
  console.log("  ✅ 안전: 모든 삭제대상이 (이름+레어도) 트윈 보유");

  if (!APPLY) {
    console.log(`\n(dry-run) 적용 시: CardLocale ${victims.length}행 삭제 → kr-sm8a ${94 - victims.length}행. --apply`);
    await prisma.$disconnect();
    return;
  }

  const lcIds = [...new Set(victims.map((v) => v.cardId).filter((x): x is string => !!x))];
  const delLoc = await prisma.regionCard.deleteMany({ where: { id: { in: victims.map((v) => v.id) } } });
  console.log(`  CardLocale 삭제: ${delLoc.count}행`);
  // 자식 없어진 LC 삭제(타세트 참조 없음 확인됨). FK 막히면 skip.
  let lcDeleted = 0;
  for (const id of lcIds) {
    const refs = await prisma.regionCard.count({ where: { cardId: id } });
    if (refs > 0) continue;
    try { await prisma.card.delete({ where: { id } }); lcDeleted++; }
    catch (e) { console.log(`  ~ LC ${id} 삭제 skip(${(e as Error).message.slice(0, 40)})`); }
  }
  console.log(`  LogicalCard 삭제: ${lcDeleted}개`);
  const actual = await prisma.regionCard.count({ where: { setId: "kr-sm8a" } });
  await prisma.set.update({ where: { id: "kr-sm8a" }, data: { cardCount: actual } });
  console.log(`\n=== 검증 === kr-sm8a actual=${actual} cardCount=${actual}`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
