/**
 * バトルテーマデッキ ビクティニ (jp-btv, bw-decks) 중복 엔트리 #6a·#11a 삭제.
 *   #6a エモンガ — #6 エモンガ(dex587)의 중복 엔트리(같은 카드, 다른 스캔)
 *   #11a デスカーン — #11 デスカーン(dex563)의 중복 엔트리
 *   ★검증: 이미지 비교로 #6/#6a, #11/#11a 가 같은 카드 확인. LC(jp-btv-6a/11a)는 BTV 전용 고아
 *     (참조 RegionCard 1개=자기자신, cardText/externalIdMapping 0, collectionItem 0). KR BTV 세트 없음(JP 전용).
 *
 * 동작: RegionCard 삭제 + LC(Card) 삭제(cardText/ext 정리) + R2 large(.png)/small(.webp) 삭제
 *   + Set jp-btv cardCount 23→21.
 *
 * dry: npx tsx scripts/delete-btv-dupes.ts
 * 적용: npx tsx scripts/delete-btv-dupes.ts --apply
 */
import "dotenv/config";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { prisma } from "../src/lib/prisma";
import { r2KeyFor, getR2Client } from "../src/lib/r2";
import { assertWritable, hasAllowProtectedFlag } from "./lib/protected-groups";

const APPLY = process.argv.includes("--apply");
const SET = "jp-btv", PACK = "bw-decks";
const TARGETS = ["6a", "11a"]; // number (= rc id suffix = lc id suffix)

async function delR2(key: string) {
  try { await getR2Client().send(new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET!, Key: key })); console.log(`    ✓ R2 삭제 ${key}`); }
  catch (e: any) { console.warn(`    ⚠ R2 삭제 실패(무시) ${key}: ${e?.message ?? e}`); }
}

async function main() {
  assertWritable([PACK], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "delete-btv-dupes" });
  console.log(`${APPLY ? "APPLY" : "DRY"} delete-btv-dupes | ${TARGETS.length}장 삭제`);

  // 사전 안전검증
  for (const n of TARGETS) {
    const rcId = `${SET}-${n}`, lcId = `${SET}-${n}`;
    const rc = await prisma.regionCard.findUnique({ where: { id: rcId }, select: { id: true, name: true, cardId: true } });
    if (!rc) throw new Error(`${rcId} 없음`);
    if (rc.cardId !== lcId) throw new Error(`${rcId} cardId=${rc.cardId} ≠ 예상 ${lcId} — 중단(공유 LC 위험)`);
    const otherRefs = await prisma.regionCard.count({ where: { cardId: lcId, NOT: { id: rcId } } });
    const ci = await prisma.collectionItem.count({ where: { regionCardId: rcId } });
    if (otherRefs > 0) throw new Error(`LC ${lcId} 가 다른 RegionCard ${otherRefs}개에서도 참조됨 — 중단`);
    if (ci > 0) throw new Error(`${rcId} collectionItem ${ci}개 — 중단`);
    console.log(`  삭제대상 #${n} ${rc.name} (rc=${rcId}, lc=${lcId}, 공유0, collItem0)`);
  }
  if (!APPLY) { console.log("\n적용: --apply"); return; }

  for (const n of TARGETS) {
    const rcId = `${SET}-${n}`, lcId = `${SET}-${n}`;
    await delR2(r2KeyFor(PACK, "ja", "large", SET, n, "png"));
    await delR2(r2KeyFor(PACK, "ja", "small", SET, n, "webp"));
    await prisma.regionCard.delete({ where: { id: rcId } });
    await prisma.cardText.deleteMany({ where: { cardId: lcId } });
    await prisma.externalIdMapping.deleteMany({ where: { cardId: lcId } });
    await prisma.card.delete({ where: { id: lcId } });
    console.log(`  ✓ #${n} RegionCard+LC 삭제`);
  }
  const cnt = await prisma.regionCard.count({ where: { setId: SET } });
  await prisma.set.update({ where: { id: SET }, data: { cardCount: cnt } });
  console.log(`\njp-btv cardCount → ${cnt}`);
}
main().catch((e) => { console.error("FAIL:", e); process.exit(1); }).finally(() => prisma.$disconnect());
