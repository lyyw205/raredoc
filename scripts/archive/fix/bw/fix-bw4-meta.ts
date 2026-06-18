/**
 * BW4 = ダークラッシュ (Dark Rush, code BW4, BW era, 2011-12-16) 메타 교정 — 카드연결 무관.
 *  (A) jp-tcg-bw4 cardCount 69(stale, base /069만)→76(실제 rows=트래커 76). base69+시크릿7(SR4/UR3).
 *  (B) jp-tcg-bw4 nameKo "다음 운명"(=EN Next Destinies명 오염!)→ "BW 확장팩 제4탄 「다크러시」"(kr-bgr 미러).
 *  (C) kr-bgr(=KR Dark Rush, id/code 'BGR' 버그) date 1970→리서치 확정 시.
 *  ※레어도 C/U 1장 충돌(DB C34/U22 vs 트래커 C33/U23)은 별도 워크플로(wqumfcndo)로 판정 후 적용.
 *  ※kr-bgr id="kr-bgr"·code="BGR"(하프덱 kr-gbd/kr-sbd와 동일 BGR 버그군) — 식별자라 추측 수정 안 함, 플래그.
 *  실행: npx tsx scripts/fix-bw4-meta.ts [--apply] [--allow-protected]
 */
import "dotenv/config";
import { prisma } from "../../../../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "../../../lib/protected-groups";

const JP_NAMEKO = "BW 확장팩 제4탄 「다크러시」"; // kr-bgr name 미러(EN "다음 운명" 오염 제거)
// 리서치 wf wvtsodw06 (high conf): kr-bgr(KR 다크러시) 발매일 = 2012-05-01
//  namu.wiki/다크러시 인포박스 [KR]2012-05-01([JP]2011-12-16·팩번호BW4·기본69/전체76 일치) + pokemoncard.co.kr 제품명 확인.
const KR_DATE: string | null = "2012-05-01";

async function main() {
  const APPLY = process.argv.includes("--apply");
  const allow = hasAllowProtectedFlag();
  const sets = await prisma.set.findMany({ where: { id: { in: ["jp-tcg-bw4", "kr-bgr"] } }, select: { id: true, cardPackId: true } });
  assertWritable(sets.map((s) => s.cardPackId), { allow, dryRun: !APPLY, tool: "fix-bw4" });

  console.log(`■ BW4(Dark Rush) 메타 | ${APPLY ? "★APPLY" : "(dry-run)"}\n`);

  const jpRows = await prisma.regionCard.count({ where: { setId: "jp-tcg-bw4" } });
  const jp = await prisma.set.findUnique({ where: { id: "jp-tcg-bw4" }, select: { cardCount: true, nameKo: true } });
  console.log(`· (A) jp-tcg-bw4 cardCount ${jp?.cardCount} → ${jpRows}`);
  console.log(`· (B) jp-tcg-bw4 nameKo "${jp?.nameKo}" → "${JP_NAMEKO}"`);
  if (APPLY) await prisma.set.update({ where: { id: "jp-tcg-bw4" }, data: { cardCount: jpRows, nameKo: JP_NAMEKO } });

  console.log(`· (C) kr-bgr date: ${KR_DATE ? `→ ${KR_DATE}` : "유지(리서치 대기)"}`);
  if (APPLY && KR_DATE) await prisma.set.update({ where: { id: "kr-bgr" }, data: { releaseDate: new Date(`${KR_DATE}T00:00:00Z`) } });

  if (APPLY) {
    const rows = await prisma.set.findMany({ where: { id: { in: ["jp-tcg-bw4", "kr-bgr"] } }, select: { id: true, cardCount: true, nameKo: true, releaseDate: true } });
    console.log("\n=== 검증 ===");
    rows.forEach((r) => console.log(`  ${r.id}: cardCount=${r.cardCount}, releaseDate=${r.releaseDate?.toISOString().slice(0,10)}, nameKo=${r.nameKo}`));
  } else console.log("\n(dry-run) 적용: --apply");
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
