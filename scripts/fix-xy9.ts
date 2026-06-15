/**
 * XY9(破天の怒り / 천공의 분노) JP 메타 — cardCount 동기화 + nameKo 정합.
 *  · cardCount 88(stale)→89(actual). JP 레어도 C37/U24/R8/RR11/SR8/UR1=89 트래커 완전일치.
 *  · nameKo "파천의 분노"(JP직역) → "XY BREAK 확장팩 제9탄 「천공의 분노」"(KR공식, kr-xy9 일치).
 *  date 2015-12-11 정상. KR=88(=89−UR1, clean). KR date 미확정→최종점검. 실행: npx tsx scripts/fix-xy9.ts --apply
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";

const KO = "XY BREAK 확장팩 제9탄 「천공의 분노」";

async function main() {
  const APPLY = process.argv.includes("--apply");
  const actual = await prisma.regionCard.count({ where: { setId: "jp-tcg-XY9" } });
  const s = await prisma.set.findUnique({ where: { id: "jp-tcg-XY9" }, select: { cardCount: true, nameKo: true } });
  console.log(`■ XY9 JP | cardCount ${s?.cardCount}→${actual} | nameKo "${s?.nameKo}"→"${KO}" | ${APPLY ? "★APPLY" : "(dry-run)"}`);
  if (APPLY) {
    await prisma.set.update({ where: { id: "jp-tcg-XY9" }, data: { cardCount: actual, nameKo: KO } });
    const v = await prisma.set.findUnique({ where: { id: "jp-tcg-XY9" }, select: { cardCount: true, nameKo: true, releaseDate: true } });
    console.log(`✅ cardCount=${v?.cardCount} nameKo="${v?.nameKo}" date=${v?.releaseDate?.toISOString().slice(0,10)}`);
  } else console.log("(dry-run) --apply");
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
