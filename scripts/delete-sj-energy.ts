/**
 * SJ (스페셜덱세트 ザシアン・ザマゼンタ vs ムゲンダイナ) #31·#32 기본에너지(Special) 삭제.
 *   대상: jp-tcg-SJ-031, jp-tcg-SJ-032, kr-sj-031, kr-sj-032 (JP+KR, 사용자 확인).
 *
 * 안전성:
 *  - LC(lc-jp-tcg-SB-031/032)는 SB(원본)·SH·SI·SLD + KR들이 공유 → 삭제 안 함. RegionCard 행만 제거.
 *  - 의존성 점검: 4개 RC 전부 Trade=0·CollectionItem=0(restrict 안전). Price=0.
 *    ExternalIdMapping kr-sj-031/032 각 1건은 onDelete:Cascade 로 자동 제거.
 *  - KR #31/#32 의 R2 이미지 객체(고아화)는 삭제. JP는 원래 이미지 NULL.
 *  - cardCount: jp-tcg-SJ 32→30, kr-sj 32→30.
 *
 * dry: npx tsx scripts/delete-sj-energy.ts
 * 적용: npx tsx scripts/delete-sj-energy.ts --apply
 */
import "dotenv/config";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { prisma } from "../src/lib/prisma";
import { getR2Client } from "../src/lib/r2";
import { assertWritable, hasAllowProtectedFlag } from "./lib/protected-groups";

const APPLY = process.argv.includes("--apply");
const RC_IDS = ["jp-tcg-SJ-031", "jp-tcg-SJ-032", "kr-sj-031", "kr-sj-032"];
const SETS = ["jp-tcg-SJ", "kr-sj"];
const KEEP_LCS = ["lc-jp-tcg-SB-031", "lc-jp-tcg-SB-032"];

function keyFromUrl(url: string | null): string | null { if (!url || !url.includes("r2.dev/")) return null; return url.split("r2.dev/")[1]; }
async function deleteKey(key: string) { try { await getR2Client().send(new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET!, Key: key })); return true; } catch { return false; } }

async function main() {
  // SJ 팩 cardPackId 로 가드 (swsh-decks, 비보호)
  const sets = await prisma.set.findMany({ where: { id: { in: SETS } }, select: { id: true, cardPackId: true, cardCount: true } });
  assertWritable(sets.map((s) => s.cardPackId), { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "delete-sj-energy" });

  const rcs = await prisma.regionCard.findMany({ where: { id: { in: RC_IDS } },
    select: { id: true, setId: true, number: true, region: true, name: true, cardId: true, imageLarge: true, imageSmall: true } });
  console.log(`${APPLY ? "APPLY" : "DRY"} delete-sj-energy | 삭제 대상 ${rcs.length}장`);
  const imgKeys: string[] = [];
  for (const r of rcs) {
    const ks = [keyFromUrl(r.imageLarge), keyFromUrl(r.imageSmall)].filter((k): k is string => !!k);
    imgKeys.push(...ks);
    console.log(`  ${r.id} | ${r.setId} #${r.number} [${r.region}] ${r.name} | lc=${r.cardId} | R2img=${ks.length}`);
  }
  if (rcs.length !== RC_IDS.length) { console.error(`✗ 대상 누락: 기대 ${RC_IDS.length}, 발견 ${rcs.length}`); process.exit(1); }
  // LC 보존 확인 (다른 RC가 여전히 참조하는지)
  for (const lc of KEEP_LCS) {
    const others = await prisma.regionCard.count({ where: { cardId: lc, id: { notIn: RC_IDS } } });
    console.log(`  보존 LC ${lc}: 삭제 후에도 ${others}개 RC가 참조 (>0 이어야 LC 정상 잔존)`);
    if (others === 0) { console.error(`✗ ${lc} 가 고아가 됨 — 중단`); process.exit(1); }
  }
  if (!APPLY) { console.log(`\n삭제 예정: RC ${RC_IDS.length} + R2객체 ${imgKeys.length} + cardCount 32→30 ×2 | LC 보존\n적용: --apply`); return; }

  // 삭제 (Price·ExternalIdMapping cascade)
  const del = await prisma.regionCard.deleteMany({ where: { id: { in: RC_IDS } } });
  console.log(`\nRegionCard 삭제: ${del.count}`);
  // R2 고아 이미지 삭제
  let r2ok = 0; for (const k of imgKeys) { if (await deleteKey(k)) r2ok++; console.log(`  R2 del: ${k}`); }
  console.log(`R2 객체 삭제: ${r2ok}/${imgKeys.length}`);
  // cardCount 갱신
  for (const sid of SETS) {
    const cnt = await prisma.regionCard.count({ where: { setId: sid } });
    await prisma.set.update({ where: { id: sid }, data: { cardCount: cnt } });
    console.log(`  ${sid} cardCount → ${cnt}`);
  }
  // LC 잔존 확인
  for (const lc of KEEP_LCS) {
    const exists = await prisma.card.findUnique({ where: { id: lc }, select: { id: true } });
    const refs = await prisma.regionCard.count({ where: { cardId: lc } });
    console.log(`  LC ${lc}: ${exists ? "존재✓" : "사라짐!"} refs=${refs}`);
  }
  console.log("\n완료.");
}
main().catch((e) => { console.error("FAIL:", e); process.exit(1); }).finally(() => prisma.$disconnect());
