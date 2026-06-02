/**
 * jp-sv-base(합본 복제본) 은퇴 — 분할 SV1S/SV1V 로 일원화 (staged, 가드 다수).
 *   1) jp-sv-base CardLocale 216 삭제 (각 LC 는 SV1S/SV1V locale 보유 확인됨)
 *   2) LogicalCard.primarySetId=jp-sv-base → 그 LC 의 분할 세트로 재지정
 *   3) jp-sv-base TierEntry/Set 삭제
 *   4) jp-tcg-SV1V 를 sv-base 그룹에 배정 (현재 null)
 *
 * 실행: npx tsx scripts/retire-jp-sv-base.ts            # dry(계획·가드만)
 *       npx tsx scripts/retire-jp-sv-base.ts --apply    # 실제
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";

const APPLY = process.argv.includes("--apply");

async function main() {
  const SID = "jp-sv-base";
  const baseLoc = await prisma.cardLocale.findMany({ where: { setId: SID }, select: { id: true, logicalCardId: true } });
  const baseIds = baseLoc.map((l) => l.id);
  const lcids = [...new Set(baseLoc.map((l) => l.logicalCardId))];

  // 가드 1: 각 LC 가 분할(SV1S/SV1V) locale 보유?
  const lcs = await prisma.logicalCard.findMany({ where: { id: { in: lcids } }, select: { id: true, primarySetId: true, locales: { select: { setId: true } } } });
  const noSplit = lcs.filter((lc) => !lc.locales.some((l) => l.setId === "jp-tcg-SV1S" || l.setId === "jp-tcg-SV1V"));
  // 가드 2: jp-sv-base locale 을 가리키는 컬렉션/거래
  const coll = await prisma.collectionItem.count({ where: { localeId: { in: baseIds } } });
  const trade = await prisma.trade.count({ where: { localeId: { in: baseIds } } });
  // primarySetId / tierEntry 참조
  const primRefs = lcs.filter((lc) => lc.primarySetId === SID);
  const tierRefs = await prisma.tierEntry.count({ where: { setId: SID } });
  const sv1v = await prisma.set.findUnique({ where: { id: "jp-tcg-SV1V" }, select: { setGroupId: true } });

  console.log("■ jp-sv-base 은퇴 계획 (가드)");
  console.log(`  삭제할 jp-sv-base CardLocale: ${baseIds.length} | 영향 LC: ${lcids.length}`);
  console.log(`  가드1 분할 없는 LC(=삭제하면 JP 손실): ${noSplit.length}  ${noSplit.length === 0 ? "✅" : "⚠️중단"}`);
  console.log(`  가드2 컬렉션 ${coll} · 거래 ${trade} (jp-sv-base locale 참조)  ${coll + trade === 0 ? "✅" : "⚠️재지정필요"}`);
  console.log(`  primarySetId=jp-sv-base 인 LC: ${primRefs.length} → 분할로 재지정 예정`);
  console.log(`  TierEntry(setId=jp-sv-base): ${tierRefs}`);
  console.log(`  jp-tcg-SV1V 현재 그룹: ${sv1v?.setGroupId ?? "null"} → sv-base 로 배정 예정`);

  if (noSplit.length > 0 || coll + trade > 0) { console.log("\n⚠️ 가드 실패 — 중단."); await prisma.$disconnect(); return; }
  if (!APPLY) { console.log("\n(dry) 이상 없음. 실제 적용: --apply"); await prisma.$disconnect(); return; }

  // 적용
  console.log("\n적용 중...");
  // 2) primarySetId 재지정 (각 LC 의 분할 세트로)
  let primFixed = 0;
  for (const lc of primRefs) {
    const split = lc.locales.find((l) => l.setId === "jp-tcg-SV1S" || l.setId === "jp-tcg-SV1V")?.setId ?? null;
    await prisma.logicalCard.update({ where: { id: lc.id }, data: { primarySetId: split } });
    primFixed++;
  }
  // 1) jp-sv-base CardLocale 삭제 (Price cascade; 0)
  const delLoc = await prisma.cardLocale.deleteMany({ where: { setId: SID } });
  // 3) TierEntry + Set 삭제
  const delTier = await prisma.tierEntry.deleteMany({ where: { setId: SID } });
  const delSet = await prisma.set.delete({ where: { id: SID } });
  // 4) SV1V 그룹 배정
  const sv1vUpd = await prisma.set.update({ where: { id: "jp-tcg-SV1V" }, data: { setGroupId: "sv-base" } });

  console.log(`  primarySetId 재지정 ${primFixed} · CardLocale 삭제 ${delLoc.count} · TierEntry 삭제 ${delTier.count} · Set 삭제 ${delSet.id} · SV1V→${sv1vUpd.setGroupId}`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
