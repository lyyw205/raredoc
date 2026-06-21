/**
 * en-tcg-mep (Mega Evolution Black Star Promos) rarity 백필 — 전 60장 rarity=null → "Promo".
 *   Black Star Promos 관례: svp(218)·swshp(304) 전량 Promo. 동일 Rarity 행(cmpp4wyvw001hyjurzznnvic7) 사용.
 *   비동결 세트(cardPackId=null).
 *
 * 실행: npx tsx scripts/fix-mep-rarity.ts            (dry-run)
 *       npx tsx scripts/fix-mep-rarity.ts --apply
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { assertWritable } from "./lib/protected-groups";

const SET = "en-tcg-mep";
const PROMO_RARITY_ID = "cmpp4wyvw001hyjurzznnvic7"; // EN "Promo" (svp/swshp 공용)

async function main() {
  const apply = process.argv.includes("--apply");
  const set = await prisma.set.findUnique({ where: { id: SET }, select: { cardPackId: true } });
  assertWritable([set?.cardPackId], { dryRun: !apply, tool: "fix-mep-rarity" });

  // 안전장치: Promo Rarity 행 존재 확인
  const promo = await prisma.rarity.findUnique({ where: { id: PROMO_RARITY_ID }, select: { id: true, code: true } });
  if (!promo || promo.code !== "Promo") { console.error(`🛑 Promo Rarity 행 확인 실패: ${JSON.stringify(promo)}`); process.exit(1); }

  const before = await prisma.regionCard.count({ where: { setId: SET } });
  const nullRar = await prisma.regionCard.count({ where: { setId: SET, rarityId: null } });
  console.log(`${apply ? "[APPLY]" : "[DRY]"} ${SET}: ${before}장 중 rarity null ${nullRar}장 → "Promo"(${PROMO_RARITY_ID})`);

  if (!apply) { console.log("(dry-run — --apply 로 적용)"); return; }
  const res = await prisma.regionCard.updateMany({ where: { setId: SET, rarityId: null }, data: { rarityId: PROMO_RARITY_ID } });
  console.log(`✅ 완료 — ${res.count}장 rarity=Promo`);
}

main().then(() => prisma.$disconnect()).catch((e) => { console.error(e); prisma.$disconnect(); process.exit(1); });
