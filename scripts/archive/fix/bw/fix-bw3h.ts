/**
 * BW3 Hail Blizzard = ヘイルブリザード (code BW3H, BW era, 2011-09-16) 교정.
 *  (A) jp-tcg-BW3H cardCount 52(stale, base /052만)→57(실제 rows=트래커 57). base52+시크릿5(SR3/UR2). 레어도 C24/U18/R10/SR3/UR2 트래커 정확일치.
 *  (B) kr-bw3h 레어도 백필 — SR 3장 중 2장이 null: #53 큐레무 EX·#55 레지기가스 EX → Super Rare (#54 그란돈 EX는 이미 SR). KR=55(JP 57−UR골드2).
 *  (C) kr-bw3h KR date(2011-09-16=JP, 의심) → BW3 트윈 리서치 확정 시. nameKo 정상. ⚠ code="BGR"(버그) 플래그.
 *  ※ 레어도/메타 변경 → assertWritable. BW3 비보호 통과.
 *  실행: npx tsx scripts/fix-bw3h.ts [--apply] [--allow-protected]
 */
import "dotenv/config";
import { prisma } from "../../../../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "../../../lib/protected-groups";

// 리서치 wf wplfdkv1b (high conf): BW3 KR 발매일 = 2012-03-08 (트윈 공통)
//  pokemoncard.co.kr/card/14 통합 "발매일 2012-03-08" + namu 헤일블리자드/사이코드라이브 인포박스 [KR]2012-03-08. (DB 2011-09-16=JP 복붙)
const KR_DATE: string | null = "2012-03-08";
const KR_SR_BACKFILL = [53, 55]; // kr-bw3h null→SR (큐레무 EX·레지기가스 EX)

async function main() {
  const APPLY = process.argv.includes("--apply");
  const allow = hasAllowProtectedFlag();
  const sets = await prisma.set.findMany({ where: { id: { in: ["jp-tcg-BW3H", "kr-bw3h"] } }, select: { id: true, cardPackId: true } });
  assertWritable(sets.map((s) => s.cardPackId), { allow, dryRun: !APPLY, tool: "fix-bw3h" });
  const srId = (await prisma.rarity.findFirst({ where: { code: "Super Rare" } }))?.id;
  if (!srId) throw new Error("Super Rare rarity 없음");

  console.log(`■ BW3 Hail Blizzard(BW3H) 교정 | ${APPLY ? "★APPLY" : "(dry-run)"}\n`);

  // (A) jp cardCount
  const jpRows = await prisma.regionCard.count({ where: { setId: "jp-tcg-BW3H" } });
  const jp = await prisma.set.findUnique({ where: { id: "jp-tcg-BW3H" }, select: { cardCount: true } });
  console.log(`· (A) jp-tcg-BW3H cardCount ${jp?.cardCount} → ${jpRows}`);
  if (APPLY) await prisma.set.update({ where: { id: "jp-tcg-BW3H" }, data: { cardCount: jpRows } });

  // (B) kr SR backfill (from-null guard)
  console.log("· (B) kr-bw3h SR 백필");
  for (const n of KR_SR_BACKFILL) {
    const rc = await prisma.regionCard.findFirst({ where: { setId: "kr-bw3h", numberInt: n } });
    if (!rc) { console.log(`  🔴 #${n} 없음 → skip`); continue; }
    if (rc.rarityId !== null) { console.log(`  = #${n} ${rc.name}: 이미 레어도 있음(${rc.rarityId}) → skip(안전)`); continue; }
    console.log(`  ✔ #${n} ${rc.name}: null → Super Rare`);
    if (APPLY) await prisma.regionCard.update({ where: { id: rc.id }, data: { rarityId: srId } });
  }

  // (C) KR date
  console.log(`· (C) kr-bw3h date: ${KR_DATE ? `→ ${KR_DATE}` : "유지(리서치 대기, 2011-09-16=JP 의심)"}`);
  if (APPLY && KR_DATE) await prisma.set.update({ where: { id: "kr-bw3h" }, data: { releaseDate: new Date(`${KR_DATE}T00:00:00Z`) } });

  if (APPLY) {
    const dist = await prisma.regionCard.groupBy({ by: ["rarityId"], where: { setId: "kr-bw3h" }, _count: true });
    const rmap = Object.fromEntries((await prisma.rarity.findMany()).map((r) => [r.id, r.code]));
    console.log("  kr-bw3h 분포:", dist.map((d)=>`${d.rarityId?rmap[d.rarityId]:"null"}=${d._count}`).join(" "));
  } else console.log("\n(dry-run) 적용: --apply");
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
