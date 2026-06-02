/**
 * SV 부속상품(덱/박스/스타터) 임시 언그룹.
 *
 * 배경: 일부 KR 부속상품이 번호순(numberInt)으로 본세트 LogicalCard에 잘못 묶여 있어
 *       (예: kr-svjp 덱 #1 → kr-sv6a 본세트 #1) 본세트 카드명이 잘못 표시됨.
 *       올바른 수정은 제품별 실제 수록목록 재수집이 필요하나, 그 전까지 '잘못된 표시'를
 *       막기 위해 공유 LC에서 분리(각자 전용 빈 LogicalCard 부여)한다.
 *
 * 동작: 대상 setId의 CardLocale 중, 같은 logicalCardId를 다른 setId가 함께 쓰는('공유') 것만
 *       새 LogicalCard(primarySetId=해당 부속세트, 게임데이터 없음)로 재지정. 멱등.
 *       본세트/JP의 CardLocale은 기존 LC를 그대로 유지(고아 안 됨).
 *
 * 실행: npx tsx scripts/ungroup-sv-subproducts.ts [--dry-run]
 */
import "dotenv/config";
import { prisma } from "@/lib/prisma";

const DRY = process.argv.includes("--dry-run");
const TARGETS = ["kr-svf","kr-svjp","kr-svel","kr-svjl","kr-svn","kr-svom","kr-svod","kr-svd"];

async function main() {
  let totalUngrouped = 0;
  for (const setId of TARGETS) {
    const cards = await prisma.cardLocale.findMany({
      where: { setId },
      select: { id: true, number: true, numberInt: true, logicalCardId: true,
        logicalCard: { select: { setGroupId: true, primarySetId: true } } },
      orderBy: { numberInt: "asc" },
    });
    let cnt = 0;
    for (const c of cards) {
      // 공유 여부: 같은 LC를 쓰는 다른 set의 CardLocale이 존재하는가
      const otherUse = await prisma.cardLocale.count({
        where: { logicalCardId: c.logicalCardId, setId: { not: setId } },
      });
      if (otherUse === 0) continue; // 이미 단독(언그룹 완료 or 원래 전용) → skip
      if (!DRY) {
        const fresh = await prisma.logicalCard.create({
          data: {
            setGroupId: c.logicalCard?.setGroupId ?? null,
            primarySetId: setId,
            primaryNumber: c.number,
            primaryNumberInt: c.numberInt ?? null,
          },
          select: { id: true },
        });
        await prisma.cardLocale.update({ where: { id: c.id }, data: { logicalCardId: fresh.id } });
      }
      cnt++;
    }
    console.log(`${setId}: ${DRY ? "would ungroup" : "ungrouped"} ${cnt}/${cards.length}`);
    totalUngrouped += cnt;
  }
  console.log(`\n${DRY ? "[DRY] " : ""}총 언그룹: ${totalUngrouped}`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
