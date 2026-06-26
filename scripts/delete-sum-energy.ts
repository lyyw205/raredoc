/**
 * Sun & Moon 본탄 (en-tcg-sm1 / SUM, EN) #164~#172 기본에너지 9종 삭제 — 사용자 요청.
 *
 * 배경: 기본에너지는 전용 에너지 세트(예: SVE)로 관리하는 모델. 본탄 SUM 끝에 덧붙은
 *   기본에너지 9종(#164 Grass ~ #172 Fairy)은 정리 대상(기본에너지 삭제 캠페인: delete-sb/sek/sj-energy 동렬).
 *   ※ #162 Psychic·#163 Metal 은 범위 밖(유지). pokemontcg sm1 은 173장으로 이들을 포함하나 본 DB 정책상 제거.
 *
 * 대상: RegionCard en-tcg-sm1-164..172 (EN 9장). 모두 EN orphan(LC당 RC 1개=공유 없음) → LC 동반 삭제.
 * 안전(검증완): 9 RC 모두 Trade=0·CollectionItem=0·Price=0. large=외부 pokemontcg(R2 무관),
 *   small=R2(og-sm1s/en/small/en-tcg-sm1/{n}.png) → R2 삭제. EN 전용 → 매핑가드 자유.
 *
 * 동작: ① RC 9장 삭제(Price·ExternalIdMapping(locale) cascade) ② 고아 LC 삭제(CardText·CardSpecies·
 *   ExternalIdMapping(card)·Card) ③ R2 small 9개 삭제 ④ Set.cardCount 갱신.
 *
 * dry: npx tsx scripts/delete-sum-energy.ts
 * 적용: npx tsx scripts/delete-sum-energy.ts --apply
 */
import "dotenv/config";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { prisma } from "../src/lib/prisma";
import { getR2Client } from "../src/lib/r2";
import { assertMappingWritable, hasAllowProtectedFlag } from "./lib/protected-groups";

const APPLY = process.argv.includes("--apply");
const SET = "en-tcg-sm1";
const NUMS = Array.from({ length: 9 }, (_, i) => 164 + i); // 164..172
const RC_IDS = NUMS.map((n) => `${SET}-${n}`);

function keyFromUrl(u: string | null): string | null { if (!u || !u.includes("r2.dev/")) return null; return u.split("r2.dev/")[1]; }
async function deleteKey(k: string) { try { await getR2Client().send(new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET!, Key: k })); return true; } catch { return false; } }

async function main() {
  const setRow = await prisma.set.findUnique({ where: { id: SET }, select: { cardPackId: true } });
  // EN RegionCard 삭제(정체성 매핑 제거) → region-aware 가드: EN 은 자유.
  assertMappingWritable([setRow?.cardPackId], { regions: ["EN"], allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "delete-sum-energy", what: "SUM #164~172 기본에너지 삭제" });

  const rcs = await prisma.regionCard.findMany({ where: { id: { in: RC_IDS } }, select: { id: true, number: true, name: true, region: true, cardId: true, imageLarge: true, imageSmall: true } });
  console.log(`${APPLY ? "APPLY" : "DRY"} delete-sum-energy | 삭제 RC ${rcs.length}/${RC_IDS.length}`);
  if (rcs.length !== RC_IDS.length) { console.error(`✗ 대상 누락 ${rcs.length}/${RC_IDS.length} — 중단`); process.exit(1); }

  // 안전: Trade/CollectionItem/Price = 0 재확인 (런타임 가드)
  let unsafe = 0;
  const imgKeys: string[] = [];
  const lcsToDelete: string[] = [];
  for (const r of rcs) {
    const [trade, coll] = await Promise.all([
      prisma.trade.count({ where: { regionCardId: r.id } }),
      prisma.collectionItem.count({ where: { regionCardId: r.id } }),
    ]);
    if (trade || coll) { console.error(`  ⚠ ${r.id}: trade=${trade} coll=${coll} — 참조 있음, 삭제 불가`); unsafe++; }
    const share = await prisma.regionCard.count({ where: { cardId: r.cardId } });
    if (share === 1) lcsToDelete.push(r.cardId); // 이 RC뿐 → LC 고아
    else console.log(`  ℹ ${r.id}: LC ${r.cardId} 공유=${share} → LC 보존(RC만 삭제)`);
    for (const k of [keyFromUrl(r.imageSmall), keyFromUrl(r.imageLarge)]) if (k) imgKeys.push(k);
    console.log(`  ${r.id} #${r.number} ${r.name} → LC ${r.cardId} (고아=${share === 1})`);
  }
  if (unsafe) { console.error(`✗ 참조 있는 RC ${unsafe}장 — 중단`); process.exit(1); }
  console.log(`\n예정: RC ${rcs.length} 삭제 + 고아 LC ${lcsToDelete.length} 삭제 + R2 ${imgKeys.length} 삭제 + cardCount 갱신`);
  if (!APPLY) { console.log("적용: --apply"); return; }

  // ① RC 삭제 (Price·ExternalIdMapping(locale) cascade)
  const del = await prisma.regionCard.deleteMany({ where: { id: { in: RC_IDS } } });
  console.log(`\nRegionCard 삭제: ${del.count}`);
  // ② 고아 LC 삭제
  let lcDel = 0;
  for (const lc of lcsToDelete) {
    const remain = await prisma.regionCard.count({ where: { cardId: lc } });
    if (remain > 0) { console.log(`  ⚠ ${lc}: RC ${remain} 잔존 — LC 삭제 스킵`); continue; }
    await prisma.cardText.deleteMany({ where: { cardId: lc } });
    await prisma.cardSpecies.deleteMany({ where: { cardId: lc } });
    await prisma.externalIdMapping.deleteMany({ where: { cardId: lc } });
    await prisma.card.delete({ where: { id: lc } });
    lcDel++;
  }
  console.log(`고아 LC 삭제: ${lcDel}/${lcsToDelete.length}`);
  // ③ R2 small 삭제
  let r2ok = 0; for (const k of imgKeys) { if (await deleteKey(k)) r2ok++; }
  console.log(`R2 객체 삭제: ${r2ok}/${imgKeys.length}`);
  // ④ cardCount
  const cnt = await prisma.regionCard.count({ where: { setId: SET } });
  await prisma.set.update({ where: { id: SET }, data: { cardCount: cnt } });
  console.log(`${SET} cardCount → ${cnt}\n완료.`);
}
main().catch((e) => { console.error("FAIL:", e); process.exit(1); }).finally(() => prisma.$disconnect());
