/**
 * jp-tcg-M-P(JP MEGA 프로모) releaseDate 교정 — 수집 시 1970-01-01 placeholder 로 적재된 것을
 * JP MEGA era 시작(2025-08-01, M1S/M1L 과 동일 앵커)으로 정정. M-P 는 상시 프로모셋이라 단일
 * 공식발매일이 없어 era 앵커 사용(사용자 확정).
 *
 * ★ releaseDate(메타) 1개 컬럼만 변경. 연결 FK 무변경 → 동결 위반 아님(규약상 assertWritable 호출).
 * Run: npx tsx scripts/fix-jp-m-p-date.ts                 # dry-run
 *      npx tsx scripts/fix-jp-m-p-date.ts --apply --allow-protected
 */
import "dotenv/config";
import { prisma } from "../../../../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "../../../lib/protected-groups";

const APPLY = process.argv.includes("--apply");
const ALLOW = hasAllowProtectedFlag();
const TARGET_ID = "jp-tcg-M-P";
const NEW_DATE = new Date("2025-08-01T00:00:00Z");

async function main() {
  const set = await prisma.set.findUnique({
    where: { id: TARGET_ID },
    select: { id: true, nameKo: true, releaseDate: true, cardPackId: true },
  });
  if (!set) { console.error(`🛑 ${TARGET_ID} 없음`); process.exit(1); }

  assertWritable([set.cardPackId], { allow: ALLOW, dryRun: !APPLY, tool: "fix-jp-m-p-date" });

  console.log(`${APPLY ? "✅ APPLY" : "🔍 DRY-RUN"} ${set.id} (${set.nameKo})`);
  console.log(`   releaseDate: ${set.releaseDate?.toISOString().slice(0, 10)} → ${NEW_DATE.toISOString().slice(0, 10)}`);

  if (APPLY) {
    await prisma.set.update({ where: { id: TARGET_ID }, data: { releaseDate: NEW_DATE } });
    console.log("   적용 완료.");
  } else {
    console.log("   적용하려면: npx tsx scripts/fix-jp-m-p-date.ts --apply --allow-protected");
  }
}

main()
  .catch((e) => { console.error("FAIL:", e?.message ?? e); process.exit(1); })
  .finally(() => prisma.$disconnect());
