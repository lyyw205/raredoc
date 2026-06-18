/**
 * Dragon Blade(リューノブレード, code BW5D, BW era, 2012-03-16) 메타 교정 — 카드연결 무관.
 *  (A) jp-tcg-BW5D cardCount 50(stale, base /050만)→55(실제 rows=트래커 55). base50+시크릿5(SR3/UR2).
 *      레어도 C24/U16/R10/SR3/UR2=55 트래커 정확일치(확인됨).
 *  (B) kr-bw5d nameKo null→"BW 확장팩 제5탄 「드래곤 블레이드」"(자기 name 미러). KR=53(JP 55−UR2).
 *  (C) KR 발매일: 현재 2012-03-16(=JP, 의심) → 리서치 확정 시 KR_DATE 채움. 트윈(kr-bw5 블라스트)도 함께.
 *  ※ 메타 전용이지만 레포 규칙대로 assertWritable 가드. BW5 비보호 통과.
 *  실행: npx tsx scripts/fix-bw5d-meta.ts [--apply] [--allow-protected]
 */
import "dotenv/config";
import { prisma } from "../../../../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "../../../lib/protected-groups";

// 리서치 wf wn8btq8bq (high conf, 양 트윈 공통): BW5 KR 발매일 = 2012-10-01
//  pokemoncard.co.kr/card/11 통합 트윈페이지 "발매일 2012-10-01" + namu 드래곤블레이드/블라스트 인포박스([KR]2012-10-01).
//  현재 kr-bw5·kr-bw5d = 2012-03-16(=JP 복붙) → 틀림. (WebSearch '10-11'은 환각, 무시)
const KR_DATE: string | null = "2012-10-01";
const KR_SETS = ["kr-bw5d", "kr-bw5"];     // 드래곤 블레이드 + 블라스트(트윈 공통 KR날짜)

async function main() {
  const APPLY = process.argv.includes("--apply");
  const allow = hasAllowProtectedFlag();
  const ids = ["jp-tcg-BW5D", "jp-tcg-BW5B", ...KR_SETS];
  const sets = await prisma.set.findMany({ where: { id: { in: ids } }, select: { id: true, cardPackId: true } });
  assertWritable(sets.map((s) => s.cardPackId), { allow, dryRun: !APPLY, tool: "fix-bw5d" });

  console.log(`■ Dragon Blade(BW5D) 메타 | ${APPLY ? "★APPLY" : "(dry-run)"}\n`);

  // (A) jp-tcg-BW5D cardCount sync
  const jpRows = await prisma.regionCard.count({ where: { setId: "jp-tcg-BW5D" } });
  const jp = await prisma.set.findUnique({ where: { id: "jp-tcg-BW5D" }, select: { cardCount: true } });
  console.log(`· (A) jp-tcg-BW5D cardCount ${jp?.cardCount} → ${jpRows}`);
  if (APPLY) await prisma.set.update({ where: { id: "jp-tcg-BW5D" }, data: { cardCount: jpRows } });

  // (B) kr-bw5d nameKo
  const kr = await prisma.set.findUnique({ where: { id: "kr-bw5d" }, select: { name: true, nameKo: true } });
  const KR_NAMEKO = kr?.name ?? "BW 확장팩 제5탄 「드래곤 블레이드」";
  console.log(`· (B) kr-bw5d nameKo ${kr?.nameKo === null ? "(null)" : `"${kr?.nameKo}"`} → "${KR_NAMEKO}"`);
  if (APPLY) await prisma.set.update({ where: { id: "kr-bw5d" }, data: { nameKo: KR_NAMEKO } });

  // (C) KR date (트윈 공통)
  console.log(`· (C) KR date → ${KR_DATE ?? "유지(리서치 대기, 현재 2012-03-16=JP 의심)"} : ${KR_SETS.join(", ")}`);
  if (APPLY && KR_DATE) for (const id of KR_SETS) await prisma.set.update({ where: { id }, data: { releaseDate: new Date(`${KR_DATE}T00:00:00Z`) } });

  if (APPLY) {
    const rows = await prisma.set.findMany({ where: { id: { in: ["jp-tcg-BW5D", "jp-tcg-BW5B", ...KR_SETS] } }, select: { id: true, cardCount: true, nameKo: true, releaseDate: true } });
    console.log("\n=== 검증 ===");
    rows.forEach((r) => console.log(`  ${r.id}: cardCount=${r.cardCount}, releaseDate=${r.releaseDate?.toISOString().slice(0,10)}, nameKo=${r.nameKo}`));
  } else console.log("\n(dry-run) 적용: --apply");
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
