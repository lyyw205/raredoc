/**
 * Rarity 마스터 정리 — 중복/미사용 row 정리.
 *
 * 실행: npx tsx scripts/cleanup-rarity-master.ts
 *
 * 처리:
 *   1) PROMO (0건) → 사용 0건 재확인 후 단건 삭제
 *   2) Double Rare/Illustration Rare/Special Illustration Rare 계열 0건 중복 코드 정리
 *      (RR, AR, SAR, SR, UR, Illustration rare 소문자 등)
 *   3) Mega Attack Rare 계열 — MEGA_ATTACK_RARE(7건) → Mega Attack Rare(10건)으로 재매핑 후 삭제
 *   4) nameEn 같은데 code 다른 쌍 리포트
 *   5) imageSmall/imageLarge 절대 건드리지 않음
 */
import "dotenv/config";
import dns from "dns";
dns.setDefaultResultOrder("ipv4first");
import { prisma } from "@/lib/prisma";

// 사용 0건인 코드만 삭제 대상 (재확인 후 처리)
// value: 삭제 후 대체 rarityId (재매핑 필요 시). null = 그냥 삭제
const DELETE_CANDIDATES: Array<{ code: string; mergeIntoCode: string | null }> = [
  { code: "PROMO", mergeIntoCode: null },            // 0건, 대문자 중복. Promo(2152건) 유지
  { code: "Double rare", mergeIntoCode: "Double Rare" }, // 0건
  { code: "Illustration rare", mergeIntoCode: "Illustration Rare" }, // 0건
  { code: "Special illustration rare", mergeIntoCode: "Special Illustration Rare" }, // 0건
  { code: "RR", mergeIntoCode: "Double Rare" },      // 0건
  { code: "AR", mergeIntoCode: "Art Rare" },         // 0건
  { code: "SAR", mergeIntoCode: "Special Art Rare" },// 0건
  { code: "SR", mergeIntoCode: "Super Rare" },       // 0건
  { code: "UR", mergeIntoCode: "Ultra Rare" },       // 1건 → 재매핑
  { code: "HR", mergeIntoCode: "Hyper Rare" },       // 1건 → 재매핑
  { code: "MEGA_ATTACK_RARE", mergeIntoCode: "Mega Attack Rare" }, // 7건 → 재매핑
];

async function main() {
  // 현황 스냅샷
  const before = await prisma.rarity.findMany({
    select: { id: true, code: true, nameEn: true, _count: { select: { cards: true } } },
    orderBy: { code: "asc" },
  });
  console.log("=== Rarity 마스터 현황 ===");
  console.log(`총 ${before.length}개 row`);
  before.forEach((r) => {
    const flag = r._count.cards === 0 ? " [0건]" : "";
    console.log(`  [${r.code}] ${r.nameEn ?? "-"}: ${r._count.cards}건${flag}`);
  });

  // nameEn 중복 감지
  const nameEnGroups = new Map<string, typeof before>();
  for (const r of before) {
    const key = (r.nameEn ?? "").toLowerCase();
    if (!nameEnGroups.has(key)) nameEnGroups.set(key, []);
    nameEnGroups.get(key)!.push(r);
  }
  console.log("\n=== nameEn 중복 쌍 감지 ===");
  let dupFound = 0;
  for (const [key, rows] of nameEnGroups) {
    if (key && rows.length > 1) {
      dupFound++;
      console.log(
        `  nameEn="${rows[0].nameEn}": ${rows.map((r) => `[${r.code}](${r._count.cards}건)`).join(", ")}`,
      );
    }
  }
  if (dupFound === 0) console.log("  없음");

  // 삭제/재매핑 처리
  let deleted = 0;
  let remapped = 0;
  let skipped = 0;

  for (const cand of DELETE_CANDIDATES) {
    const row = await prisma.rarity.findUnique({
      where: { code: cand.code },
      select: { id: true, _count: { select: { cards: true } } },
    });
    if (!row) {
      console.log(`\n[SKIP] code="${cand.code}" — row 없음`);
      skipped++;
      continue;
    }

    const usageCount = row._count.cards;

    if (usageCount > 0) {
      if (cand.mergeIntoCode) {
        // 사용 건수 있음 → 대상 row로 재매핑 후 삭제
        const target = await prisma.rarity.findUnique({
          where: { code: cand.mergeIntoCode },
          select: { id: true },
        });
        if (!target) {
          console.log(`\n[SKIP] code="${cand.code}" (${usageCount}건) — mergeInto "${cand.mergeIntoCode}" 없음`);
          skipped++;
          continue;
        }
        await prisma.logicalCard.updateMany({
          where: { rarityId: row.id },
          data: { rarityId: target.id },
        });
        remapped += usageCount;
        console.log(`\n[REMAP] code="${cand.code}" ${usageCount}건 → "${cand.mergeIntoCode}"`);
        await prisma.rarity.delete({ where: { id: row.id } });
        deleted++;
        console.log(`  [DELETE] code="${cand.code}" 삭제 완료`);
      } else {
        console.log(`\n[SKIP] code="${cand.code}" — 사용 ${usageCount}건 (mergeInto 없음, 수동 처리 필요)`);
        skipped++;
      }
    } else {
      // 사용 0건 → 바로 삭제
      await prisma.rarity.delete({ where: { id: row.id } });
      deleted++;
      console.log(`\n[DELETE] code="${cand.code}" — 0건, 삭제 완료`);
    }
  }

  // After 통계
  const after = await prisma.rarity.findMany({
    select: { id: true, code: true, nameEn: true, _count: { select: { cards: true } } },
    orderBy: { code: "asc" },
  });

  console.log("\n─".repeat(25));
  console.log(`\n=== 결과 ===`);
  console.log(`삭제: ${deleted}건`);
  console.log(`재매핑: ${remapped}건`);
  console.log(`스킵: ${skipped}건`);
  console.log(`\nRarity 마스터 최종 (${after.length}개 row):`);
  after.forEach((r) => {
    console.log(`  [${r.code}] ${r.nameEn ?? "-"}: ${r._count.cards}건`);
  });

  // None 분포 확인
  const noneRow = after.find((r) => r.code === "None");
  if (noneRow) {
    console.log(`\n[참고] None(${noneRow._count.cards}건): 작업2 fill-rarity 실행 후 잔여 미분류`);
  }

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
