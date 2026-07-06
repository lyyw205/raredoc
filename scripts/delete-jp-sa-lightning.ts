/**
 * SA 「스타터 세트 V 번개」 중복 해소 — jp-sa-lightning 삭제(사용자 확정).
 *   같은 제품이 jp-tcg-SA(25장, KR/EN 병합 앵커·기본에너지 포함) 와 jp-sa-lightning(24장, 5타입 패밀리) 으로 중복.
 *   → 앵커·더 완전한 jp-tcg-SA 보존, jp-sa-lightning 삭제. (KR kr-sa 는 jp-tcg-SA 에 병합돼 영향 없음)
 *
 * 동작: ① jp-tcg-SA.logoUrl ← 공유 시리즈 로고(jp-sa-series.png) ② 안전(Trade/Coll/Price=0) 재확인
 *   ③ jp-sa-lightning RC 24 삭제(Price·ExtId cascade) ④ 고아 LC 삭제(CardText·CardSpecies·ExtId·Card)
 *   ⑤ R2 카드이미지 삭제 ⑥ Set jp-sa-lightning 삭제. (공유 LC·공유 시리즈 로고는 보존)
 *   ※ swsh-decks = S-SP 잠금·JP → assertMappingWritable([swsh-decks],{regions:["JP"]}) → 사용자 확정하 --allow-protected.
 *
 * dry: npx tsx scripts/delete-jp-sa-lightning.ts
 * 적용: npx tsx scripts/delete-jp-sa-lightning.ts --apply --allow-protected
 */
import "dotenv/config";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { prisma } from "../src/lib/prisma";
import { getR2Client } from "../src/lib/r2";
import { assertMappingWritable, hasAllowProtectedFlag } from "./lib/protected-groups";

const APPLY = process.argv.includes("--apply");
const SET = "jp-sa-lightning";
const KEEP = "jp-tcg-SA";
const SERIES_LOGO = "https://pub-fe6e8ccccac0452a9030098e4ca54e50.r2.dev/set-assets/logo/jp-sa-series.png";

function keyFromUrl(u: string | null): string | null { if (!u || !u.includes("r2.dev/")) return null; return u.split("r2.dev/")[1]; }
async function delKey(k: string) { try { await getR2Client().send(new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET!, Key: k })); return true; } catch { return false; } }

async function main() {
  const setRow = await prisma.set.findUnique({ where: { id: SET }, select: { cardPackId: true } });
  if (!setRow) throw new Error(`${SET} Set 없음`);
  assertMappingWritable([setRow.cardPackId], { regions: ["JP"], allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "delete-jp-sa-lightning", what: "SA 번개 중복 세트 삭제" });

  const rcs = await prisma.regionCard.findMany({ where: { setId: SET }, select: { id: true, cardId: true, imageLarge: true, imageSmall: true } });
  console.log(`${APPLY ? "APPLY" : "DRY"} delete-jp-sa-lightning | RC ${rcs.length}`);

  // 안전 재확인
  let tT = 0, tC = 0;
  for (const r of rcs) { tT += await prisma.trade.count({ where: { regionCardId: r.id } }); tC += await prisma.collectionItem.count({ where: { regionCardId: r.id } }); }
  if (tT || tC) { console.error(`✗ 참조 있음 Trade=${tT} Coll=${tC} — 중단`); process.exit(1); }

  // 고아 LC 판정
  const lcs = [...new Set(rcs.map((r) => r.cardId))];
  const orphan: string[] = [];
  for (const lc of lcs) { const other = await prisma.regionCard.count({ where: { cardId: lc, setId: { not: SET } } }); if (other === 0) orphan.push(lc); }
  const imgKeys = rcs.flatMap((r) => [keyFromUrl(r.imageLarge), keyFromUrl(r.imageSmall)].filter((k): k is string => !!k));
  const keepLogo = await prisma.set.findUnique({ where: { id: KEEP }, select: { logoUrl: true } });
  console.log(`  고아 LC ${orphan.length} 삭제 / 공유 ${lcs.length - orphan.length} 보존 | R2 이미지 ${imgKeys.length} | ${KEEP}.logoUrl ${keepLogo?.logoUrl ? "있음" : "NULL"}→시리즈로고`);
  console.log(`  예정: RC ${rcs.length} + 고아LC ${orphan.length} + R2 ${imgKeys.length} + Set ${SET} 삭제`);
  if (!APPLY) { console.log("\n적용: --apply --allow-protected"); return; }

  // ① 보존 세트 로고
  await prisma.set.update({ where: { id: KEEP }, data: { logoUrl: SERIES_LOGO } });
  console.log(`  ✓ ${KEEP}.logoUrl ← 시리즈 로고`);
  // ② RC 삭제
  const del = await prisma.regionCard.deleteMany({ where: { setId: SET } });
  console.log(`  RegionCard 삭제: ${del.count}`);
  // ③ 고아 LC 삭제
  let lcDel = 0;
  for (const lc of orphan) {
    if (await prisma.regionCard.count({ where: { cardId: lc } }) > 0) { console.log(`  ⚠ ${lc} RC 잔존 — 스킵`); continue; }
    await prisma.cardText.deleteMany({ where: { cardId: lc } });
    await prisma.cardSpecies.deleteMany({ where: { cardId: lc } });
    await prisma.externalIdMapping.deleteMany({ where: { cardId: lc } });
    await prisma.card.delete({ where: { id: lc } });
    lcDel++;
  }
  console.log(`  고아 LC 삭제: ${lcDel}/${orphan.length}`);
  // ④ R2 카드이미지
  let r2ok = 0; for (const k of imgKeys) { if (await delKey(k)) r2ok++; }
  console.log(`  R2 객체 삭제: ${r2ok}/${imgKeys.length}`);
  // ⑤ Set 삭제
  await prisma.set.delete({ where: { id: SET } });
  console.log(`  Set ${SET} 삭제\n완료 — SA 번개 중복 해소(jp-tcg-SA 보존).`);
}
main().catch((e) => { console.error("FAIL:", e); process.exit(1); }).finally(() => prisma.$disconnect());
