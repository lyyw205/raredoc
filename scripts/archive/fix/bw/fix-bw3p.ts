/**
 * BW3 Psycho Drive = サイコドライブ (code BW3P, BW era, 2011-09-16) 교정 — BW3H와 동일 패턴.
 *  (A) jp-tcg-BW3P cardCount 52(stale)→57(=트래커). 레어도 C24/U18/R10/SR3/UR2 트래커 정확일치.
 *  (B) kr-bw3p SR 백필 — #53 쉐이미 EX·#55 뮤츠 EX (null→SR; #54 가이오가 EX 이미 SR). KR=55(JP 57−UR골드2).
 *  (C) kr-bw3p KR date(2011-09-16=JP, 의심) → BW3 트윈 리서치 확정 시. nameKo 정상. ⚠ code="BGR"(버그) 플래그.
 *  실행: npx tsx scripts/fix-bw3p.ts [--apply] [--allow-protected]
 */
import "dotenv/config";
import { prisma } from "../../../../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "../../../lib/protected-groups";

// 리서치 wf wplfdkv1b (high conf): BW3 KR 발매일 = 2012-03-08 (트윈 공통, pokemoncard.co.kr/card/14 통합 + namu).
const KR_DATE: string | null = "2012-03-08";
const KR_SR_BACKFILL = [53, 55]; // kr-bw3p null→SR (쉐이미 EX·뮤츠 EX)

async function main() {
  const APPLY = process.argv.includes("--apply");
  const allow = hasAllowProtectedFlag();
  const sets = await prisma.set.findMany({ where: { id: { in: ["jp-tcg-BW3P", "kr-bw3p"] } }, select: { id: true, cardPackId: true } });
  assertWritable(sets.map((s) => s.cardPackId), { allow, dryRun: !APPLY, tool: "fix-bw3p" });
  const srId = (await prisma.rarity.findFirst({ where: { code: "Super Rare" } }))?.id;
  if (!srId) throw new Error("Super Rare rarity 없음");

  console.log(`■ BW3 Psycho Drive(BW3P) 교정 | ${APPLY ? "★APPLY" : "(dry-run)"}\n`);

  const jpRows = await prisma.regionCard.count({ where: { setId: "jp-tcg-BW3P" } });
  const jp = await prisma.set.findUnique({ where: { id: "jp-tcg-BW3P" }, select: { cardCount: true } });
  console.log(`· (A) jp-tcg-BW3P cardCount ${jp?.cardCount} → ${jpRows}`);
  if (APPLY) await prisma.set.update({ where: { id: "jp-tcg-BW3P" }, data: { cardCount: jpRows } });

  console.log("· (B) kr-bw3p SR 백필");
  for (const n of KR_SR_BACKFILL) {
    const rc = await prisma.regionCard.findFirst({ where: { setId: "kr-bw3p", numberInt: n } });
    if (!rc) { console.log(`  🔴 #${n} 없음 → skip`); continue; }
    if (rc.rarityId !== null) { console.log(`  = #${n} ${rc.name}: 이미 레어도 있음 → skip(안전)`); continue; }
    console.log(`  ✔ #${n} ${rc.name}: null → Super Rare`);
    if (APPLY) await prisma.regionCard.update({ where: { id: rc.id }, data: { rarityId: srId } });
  }

  console.log(`· (C) kr-bw3p date: ${KR_DATE ? `→ ${KR_DATE}` : "유지(리서치 대기, 2011-09-16=JP 의심)"}`);
  if (APPLY && KR_DATE) await prisma.set.update({ where: { id: "kr-bw3p" }, data: { releaseDate: new Date(`${KR_DATE}T00:00:00Z`) } });

  if (APPLY) {
    const dist = await prisma.regionCard.groupBy({ by: ["rarityId"], where: { setId: "kr-bw3p" }, _count: true });
    const rmap = Object.fromEntries((await prisma.rarity.findMany()).map((r) => [r.id, r.code]));
    console.log("  kr-bw3p 분포:", dist.map((d)=>`${d.rarityId?rmap[d.rarityId]:"null"}=${d._count}`).join(" "));
  } else console.log("\n(dry-run) 적용: --apply");
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
