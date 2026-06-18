/**
 * BW1 = ブラックコレクション/ホワイトコレクション (Black/White Collection, code BW1, BW era, 2010-12-17) 메타 — 카드연결 무관.
 *  (A) jp-tcg-BW1B·jp-tcg-BW1W cardCount 53(stale, base /053만)→56(실제 rows=트래커 56). base53+시크릿3(SR2/UR1). 레어도 C24/U22/R7/SR2/UR1 트래커 정확일치(BW1B 확인).
 *  (B) KR 발매일: kr-bw1b=2010-12-17(=JP 의심)·kr-bw1=1970(placeholder) → BW1 트윈 리서치 확정 시. KR=55(JP 56−UR골드1). nameKo·code(BW1) 정상.
 *  실행: npx tsx scripts/fix-bw1-meta.ts [--apply] [--allow-protected]
 */
import "dotenv/config";
import { prisma } from "../../../../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "../../../lib/protected-groups";

// 리서치 wf wtq8ivhra (high conf, 양 트윈 공통): BW1 KR 발매일 = 2011-06-01
//  pokemoncard.co.kr/card/16 통합 "발매일 2011-06-01" + namu 블랙/화이트 인포박스 [KR]2011-06-01 (두 출처 일치=placeholder 아님).
//  DB kr-bw1b=2010-12-17(JP복붙)·kr-bw1=1970(placeholder) 둘 다 교정.
const KR_DATE: string | null = "2011-06-01";
const KR_SETS = ["kr-bw1b", "kr-bw1"];      // 블랙 + 화이트(트윈 공통 KR날짜)

async function main() {
  const APPLY = process.argv.includes("--apply");
  const allow = hasAllowProtectedFlag();
  const ids = ["jp-tcg-BW1B", "jp-tcg-BW1W", ...KR_SETS];
  const sets = await prisma.set.findMany({ where: { id: { in: ids } }, select: { id: true, cardPackId: true } });
  assertWritable(sets.map((s) => s.cardPackId), { allow, dryRun: !APPLY, tool: "fix-bw1" });

  console.log(`■ BW1(Black/White Collection) 메타 | ${APPLY ? "★APPLY" : "(dry-run)"}\n`);

  for (const id of ["jp-tcg-BW1B", "jp-tcg-BW1W"]) {
    const n = await prisma.regionCard.count({ where: { setId: id } });
    const s = await prisma.set.findUnique({ where: { id }, select: { cardCount: true } });
    console.log(`· (A) ${id} cardCount ${s?.cardCount} → ${n}`);
    if (APPLY) await prisma.set.update({ where: { id }, data: { cardCount: n } });
  }

  console.log(`· (B) KR date → ${KR_DATE ?? "유지(리서치 대기)"} : ${KR_SETS.join(", ")}`);
  if (APPLY && KR_DATE) for (const id of KR_SETS) await prisma.set.update({ where: { id }, data: { releaseDate: new Date(`${KR_DATE}T00:00:00Z`) } });

  if (APPLY) {
    const rows = await prisma.set.findMany({ where: { id: { in: ids } }, select: { id: true, cardCount: true, releaseDate: true } });
    console.log("\n=== 검증 ===");
    rows.forEach((r) => console.log(`  ${r.id}: cardCount=${r.cardCount}, releaseDate=${r.releaseDate?.toISOString().slice(0,10)}`));
  } else console.log("\n(dry-run) 적용: --apply");
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
