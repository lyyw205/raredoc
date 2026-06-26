/**
 * SEK (スターターセットVMAX カメックス) #21 기본물에너지(Special) 삭제 — JP+KR(사용자 확인).
 *   대상: jp-tcg-SEK-021, kr-seb-021 (kr-seb=SEK의 KR 짝 「거북왕」, 코드 SE).
 *
 * 안전성:
 *  - LC(lc-jp-tcg-SB-027)는 SB(원본)·SH + KR들이 공유 → 삭제 안 함. RegionCard 행만 제거.
 *  - 의존성: 두 RC 모두 Trade=0·CollectionItem=0(restrict 안전). Price=0. ExternalIdMapping(kr 1건)은 Cascade.
 *  - KR #21 R2 이미지 객체 삭제. JP는 이미지 NULL.
 *  - cardCount: jp-tcg-SEK 21→20, kr-seb 21→20.
 *
 * dry: npx tsx scripts/delete-sek-energy.ts
 * 적용: npx tsx scripts/delete-sek-energy.ts --apply
 */
import "dotenv/config";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { prisma } from "../src/lib/prisma";
import { getR2Client } from "../src/lib/r2";
import { assertWritable, hasAllowProtectedFlag } from "./lib/protected-groups";

const APPLY = process.argv.includes("--apply");
const RC_IDS = ["jp-tcg-SEK-021", "kr-seb-021"];
const SETS = ["jp-tcg-SEK", "kr-seb"];
const KEEP_LC = "lc-jp-tcg-SB-027";

function keyFromUrl(u: string | null): string | null { if (!u || !u.includes("r2.dev/")) return null; return u.split("r2.dev/")[1]; }
async function deleteKey(k: string) { try { await getR2Client().send(new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET!, Key: k })); return true; } catch { return false; } }

async function main() {
  const sets = await prisma.set.findMany({ where: { id: { in: SETS } }, select: { id: true, cardPackId: true } });
  assertWritable(sets.map((s) => s.cardPackId), { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "delete-sek-energy" });

  const rcs = await prisma.regionCard.findMany({ where: { id: { in: RC_IDS } }, select: { id: true, setId: true, number: true, region: true, name: true, cardId: true, imageLarge: true, imageSmall: true } });
  console.log(`${APPLY ? "APPLY" : "DRY"} delete-sek-energy | 대상 ${rcs.length}장`);
  const imgKeys: string[] = [];
  for (const r of rcs) {
    const ks = [keyFromUrl(r.imageLarge), keyFromUrl(r.imageSmall)].filter((k): k is string => !!k);
    imgKeys.push(...ks);
    console.log(`  ${r.id} | ${r.setId} #${r.number} [${r.region}] ${r.name} | lc=${r.cardId} | R2img=${ks.length}`);
  }
  if (rcs.length !== RC_IDS.length) { console.error(`✗ 대상 누락: 기대 ${RC_IDS.length}, 발견 ${rcs.length}`); process.exit(1); }
  const others = await prisma.regionCard.count({ where: { cardId: KEEP_LC, id: { notIn: RC_IDS } } });
  console.log(`  보존 LC ${KEEP_LC}: 삭제 후 ${others}개 RC 참조 (>0 이어야 정상)`);
  if (others === 0) { console.error("✗ LC 고아화 — 중단"); process.exit(1); }
  if (!APPLY) { console.log(`\n삭제 예정: RC ${RC_IDS.length} + R2 ${imgKeys.length} + cardCount 21→20 ×2 | LC 보존\n적용: --apply`); return; }

  const del = await prisma.regionCard.deleteMany({ where: { id: { in: RC_IDS } } });
  console.log(`\nRegionCard 삭제: ${del.count}`);
  let r2ok = 0; for (const k of imgKeys) { if (await deleteKey(k)) r2ok++; console.log(`  R2 del: ${k}`); }
  console.log(`R2 객체 삭제: ${r2ok}/${imgKeys.length}`);
  for (const sid of SETS) { const cnt = await prisma.regionCard.count({ where: { setId: sid } }); await prisma.set.update({ where: { id: sid }, data: { cardCount: cnt } }); console.log(`  ${sid} cardCount → ${cnt}`); }
  const exists = await prisma.card.findUnique({ where: { id: KEEP_LC }, select: { id: true } });
  const refs = await prisma.regionCard.count({ where: { cardId: KEEP_LC } });
  console.log(`  LC ${KEEP_LC}: ${exists ? "존재✓" : "사라짐!"} refs=${refs}`);
  console.log("\n완료.");
}
main().catch((e) => { console.error("FAIL:", e); process.exit(1); }).finally(() => prisma.$disconnect());
