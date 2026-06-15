/**
 * S8a(25주년 기념 컬렉션) 기본에너지 희귀도 교정 — 기본에너지는 레어도 없음.
 * 버그: #31-35 기본에너지가 Triple Rare/Super Rare/Ultra Rare 로 오배정(기본E는 카테고리상 무레어도).
 *   근거: 기본에너지 = 레어도 없음(보편규칙) + 트래커 13히트(RR5·RRR6·SR1·UR1)에 에너지 미포함 + 형제 #36-38 이미 null.
 * 교정 후 RRR9→6·SR2→1·UR2→1 = 트래커 정확 일치. JP/KR 동일 스크램블(정렬됨). og-s8a 비동결.
 * 실행: npx tsx scripts/fix-s8a-rarity.ts --apply
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";

const SET_IDS = ["jp-tcg-S8a", "kr-s8a"];

async function main() {
  const APPLY = process.argv.includes("--apply");
  console.log(`■ S8a 기본에너지 희귀도 → null | ${APPLY ? "★APPLY" : "(dry-run)"}\n`);
  let changed = 0;
  for (const setId of SET_IDS) {
    const rows = await prisma.regionCard.findMany({ where: { setId, numberInt: { gte: 31, lte: 38 } }, include: { rarity: true }, orderBy: { numberInt: "asc" } });
    for (const rc of rows) {
      if (!/基本|기본/.test(rc.name)) { console.log(`  ⚠️ ${setId} #${rc.numberInt} ${rc.name}: 기본에너지 아님 → skip`); continue; }
      if (rc.rarityId == null) continue;
      console.log(`  ${setId} #${rc.numberInt} ${rc.name}: ${rc.rarity?.code} → (null)`);
      changed++;
      if (APPLY) await prisma.regionCard.update({ where: { id: rc.id }, data: { rarityId: null } });
    }
  }
  console.log(`\n${APPLY ? `✅ ${changed}장 교정` : `(dry-run) 변경예정 ${changed}장`}`);
  if (APPLY) {
    const dist = await prisma.regionCard.groupBy({ by: ["rarityId"], where: { setId: "jp-tcg-S8a" }, _count: true });
    const rar = await prisma.rarity.findMany({ where: { id: { in: dist.map((d) => d.rarityId).filter(Boolean) as string[] } } });
    const nm = (id: string | null) => rar.find((r) => r.id === id)?.code ?? "(null)";
    console.log("=== jp-tcg-S8a 교정 후 분포 ===");
    for (const d of dist.sort((a, b) => (b._count as number) - (a._count as number))) console.log(`  ${nm(d.rarityId)}: ${d._count}`);
  }
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
