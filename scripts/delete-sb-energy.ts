/**
 * SB (プレミアムトレーナーボックス ソード＆シールド) #25-33 특수에너지 9종 삭제 — JP+KR(사용자 확인).
 *   대상 RC: jp-tcg-SB-025..033, kr-sb-025..033 (18장).
 *
 * LC 처리 (SB가 대부분 LC의 primary 라 신중):
 *   - 공유 LC(다른 세트에 RC 있음) → SB RC만 삭제, LC 보존. primary=SB 이던 것은 생존 JP세트로 재지정.
 *     · #25 SB-025, #26 SB-026, #27 SB-027, #29 SB-029, #30 SB-030, #31 SB-031 (primary=SB → 재지정)
 *     · #28 lc-SA-025 (primary=SA, 생존 → 재지정 불필요)
 *   - SB단독 LC(#32 SB-032, #33 SB-033; 총RC=SB+kr-sb뿐) → 고아화 → CardText·ExternalIdMapping·Card 삭제.
 *     (CardSpecies=0 이라 종뷰 영향 없음. GameCard 는 공유가능성 있어 보존.)
 *
 * 안전: 18 RC 모두 Trade=0·CollectionItem=0. Price=0. KR #25-33 R2 이미지 삭제. cardCount 33→24 ×2.
 *
 * dry: npx tsx scripts/delete-sb-energy.ts
 * 적용: npx tsx scripts/delete-sb-energy.ts --apply
 */
import "dotenv/config";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { prisma } from "../src/lib/prisma";
import { getR2Client } from "../src/lib/r2";
import { assertWritable, hasAllowProtectedFlag } from "./lib/protected-groups";

const APPLY = process.argv.includes("--apply");
const NUMS = [25, 26, 27, 28, 29, 30, 31, 32, 33];
const pad3 = (n: number) => String(n).padStart(3, "0");
const RC_IDS = NUMS.flatMap((n) => [`jp-tcg-SB-${pad3(n)}`, `kr-sb-${pad3(n)}`]);
const SETS = ["jp-tcg-SB", "kr-sb"];
const SB_ONLY_LCS = ["lc-jp-tcg-SB-032", "lc-jp-tcg-SB-033"]; // 고아화 → Card 삭제

function keyFromUrl(u: string | null): string | null { if (!u || !u.includes("r2.dev/")) return null; return u.split("r2.dev/")[1]; }
async function deleteKey(k: string) { try { await getR2Client().send(new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET!, Key: k })); return true; } catch { return false; } }

async function main() {
  const sets = await prisma.set.findMany({ where: { id: { in: SETS } }, select: { id: true, cardPackId: true } });
  assertWritable(sets.map((s) => s.cardPackId), { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "delete-sb-energy" });

  const rcs = await prisma.regionCard.findMany({ where: { id: { in: RC_IDS } }, select: { id: true, setId: true, number: true, region: true, name: true, cardId: true, imageLarge: true, imageSmall: true } });
  console.log(`${APPLY ? "APPLY" : "DRY"} delete-sb-energy | 삭제 RC ${rcs.length}/${RC_IDS.length}`);
  const imgKeys: string[] = [];
  const lcs = [...new Set(rcs.map((r) => r.cardId))];
  for (const r of rcs) imgKeys.push(...[keyFromUrl(r.imageLarge), keyFromUrl(r.imageSmall)].filter((k): k is string => !!k));
  console.log(`  R2 이미지 ${imgKeys.length} | 관련 LC ${lcs.length}`);

  // 재지정 계획: SB-primary 이면서 공유(다른 세트 JP RC 있음) LC
  const repoint: { lc: string; toSet: string; toNum: string; toInt: number | null }[] = [];
  for (const lc of lcs) {
    if (SB_ONLY_LCS.includes(lc)) continue;
    const card = await prisma.card.findUnique({ where: { id: lc }, select: { primarySetId: true } });
    if (card?.primarySetId !== "jp-tcg-SB") continue; // primary 가 SB 가 아니면 재지정 불필요
    // 생존 JP RC (삭제대상 제외, region JP) — 가장 이른 발매 세트
    const surv = await prisma.regionCard.findMany({ where: { cardId: lc, region: "JP", id: { notIn: RC_IDS } }, select: { setId: true, number: true, numberInt: true, set: { select: { releaseDate: true } } } });
    surv.sort((a, b) => (a.set?.releaseDate?.getTime() ?? 9e15) - (b.set?.releaseDate?.getTime() ?? 9e15) || a.setId.localeCompare(b.setId));
    if (surv.length) repoint.push({ lc, toSet: surv[0].setId, toNum: surv[0].number, toInt: surv[0].numberInt });
    else console.log(`  ⚠ ${lc}: SB-primary 인데 생존 JP RC 없음 (KR/EN 으로 재지정 검토)`);
  }
  console.log("\n재지정(SB-primary 공유 LC → 생존 JP세트):");
  for (const r of repoint) console.log(`  ${r.lc} → primary ${r.toSet} #${r.toNum}`);
  console.log("SB단독 LC 삭제대상:", SB_ONLY_LCS.join(", "));

  if (rcs.length !== RC_IDS.length) { console.error(`✗ 대상 누락 ${rcs.length}/${RC_IDS.length}`); process.exit(1); }
  if (!APPLY) { console.log(`\n예정: RC ${rcs.length} 삭제 + 재지정 ${repoint.length} + SB단독LC ${SB_ONLY_LCS.length} 삭제 + R2 ${imgKeys.length} + cardCount 33→24 ×2\n적용: --apply`); return; }

  // 1) RegionCard 삭제 (Price·ExternalIdMapping(locale) cascade)
  const del = await prisma.regionCard.deleteMany({ where: { id: { in: RC_IDS } } });
  console.log(`\nRegionCard 삭제: ${del.count}`);
  // 2) 공유 LC primary 재지정
  for (const r of repoint) { await prisma.card.update({ where: { id: r.lc }, data: { primarySetId: r.toSet, primaryNumber: r.toNum, primaryNumberInt: r.toInt } }); console.log(`  재지정 ${r.lc} → ${r.toSet} #${r.toNum}`); }
  // 3) SB단독 LC 삭제 (고아 확인 후 CardText·ExternalIdMapping(card)·Card)
  for (const lc of SB_ONLY_LCS) {
    const remain = await prisma.regionCard.count({ where: { cardId: lc } });
    if (remain > 0) { console.log(`  ⚠ ${lc}: RC ${remain} 잔존 — LC 삭제 스킵`); continue; }
    await prisma.cardText.deleteMany({ where: { cardId: lc } });
    await prisma.externalIdMapping.deleteMany({ where: { cardId: lc } });
    await prisma.card.delete({ where: { id: lc } });
    console.log(`  SB단독 LC 삭제: ${lc} (CardText·ExternalIdMapping 정리 후)`);
  }
  // 4) R2 이미지 삭제
  let r2ok = 0; for (const k of imgKeys) { if (await deleteKey(k)) r2ok++; }
  console.log(`R2 객체 삭제: ${r2ok}/${imgKeys.length}`);
  // 5) cardCount
  for (const sid of SETS) { const cnt = await prisma.regionCard.count({ where: { setId: sid } }); await prisma.set.update({ where: { id: sid }, data: { cardCount: cnt } }); console.log(`  ${sid} cardCount → ${cnt}`); }
  console.log("\n완료.");
}
main().catch((e) => { console.error("FAIL:", e); process.exit(1); }).finally(() => prisma.$disconnect());
