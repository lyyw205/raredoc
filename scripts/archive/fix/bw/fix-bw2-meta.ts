/**
 * BW2 = レッドコレクション (Red Collection, code BW2, BW era, 2011-07-15) 메타 교정 — 카드연결 무관.
 *  (A) jp-tcg-bw2 cardCount 66(stale, base /066만)→72(실제 rows=트래커 72). base66+시크릿6(SR5/UR1). 레어도 C30/U27/R9/SR5/UR1 트래커 정확일치.
 *  (B) jp-tcg-bw2 nameKo "떠오르는 힘"(=EN BW2 Emerging Powers명 오염)→ "BW 확장팩 제2탄 「레드 컬렉션」"(kr-bw2 미러).
 *  (C) kr-bw2 date 1970→리서치 확정 시. KR=71(JP 72−UR골드1), nameKo·code(BW2) 정상.
 *  실행: npx tsx scripts/fix-bw2-meta.ts [--apply] [--allow-protected]
 */
import "dotenv/config";
import { prisma } from "../../../../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "../../../lib/protected-groups";

const JP_NAMEKO = "BW 확장팩 제2탄 「레드 컬렉션」"; // kr-bw2 미러(EN "떠오르는 힘" 오염 제거)
// 리서치 wf wj9u05mwp (medium conf): kr-bw2 KR 발매일 = 2011-11-01 (공식 pokemoncard.co.kr/card/15 "발매일 2011-11-01" 채택).
//  ⚠ 일자 불일치: namu 인포박스는 2011-11-24. 둘 다 2011년 11월. 공식 최상위라 11-01 적용하되 11-24는 플래그(최종 KR날짜 패스에서 재확인).
const KR_DATE: string | null = "2011-11-01";

async function main() {
  const APPLY = process.argv.includes("--apply");
  const allow = hasAllowProtectedFlag();
  const sets = await prisma.set.findMany({ where: { id: { in: ["jp-tcg-bw2", "kr-bw2"] } }, select: { id: true, cardPackId: true } });
  assertWritable(sets.map((s) => s.cardPackId), { allow, dryRun: !APPLY, tool: "fix-bw2" });

  console.log(`■ BW2(Red Collection) 메타 | ${APPLY ? "★APPLY" : "(dry-run)"}\n`);

  const jpRows = await prisma.regionCard.count({ where: { setId: "jp-tcg-bw2" } });
  const jp = await prisma.set.findUnique({ where: { id: "jp-tcg-bw2" }, select: { cardCount: true, nameKo: true } });
  console.log(`· (A) jp-tcg-bw2 cardCount ${jp?.cardCount} → ${jpRows}`);
  console.log(`· (B) jp-tcg-bw2 nameKo "${jp?.nameKo}" → "${JP_NAMEKO}"`);
  if (APPLY) await prisma.set.update({ where: { id: "jp-tcg-bw2" }, data: { cardCount: jpRows, nameKo: JP_NAMEKO } });

  console.log(`· (C) kr-bw2 date: ${KR_DATE ? `→ ${KR_DATE}` : "유지(리서치 대기)"}`);
  if (APPLY && KR_DATE) await prisma.set.update({ where: { id: "kr-bw2" }, data: { releaseDate: new Date(`${KR_DATE}T00:00:00Z`) } });

  if (APPLY) {
    const rows = await prisma.set.findMany({ where: { id: { in: ["jp-tcg-bw2", "kr-bw2"] } }, select: { id: true, cardCount: true, nameKo: true, releaseDate: true } });
    console.log("\n=== 검증 ===");
    rows.forEach((r) => console.log(`  ${r.id}: cardCount=${r.cardCount}, releaseDate=${r.releaseDate?.toISOString().slice(0,10)}, nameKo=${r.nameKo}`));
  } else console.log("\n(dry-run) 적용: --apply");
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
