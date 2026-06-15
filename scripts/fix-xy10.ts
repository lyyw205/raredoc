/**
 * XY10(めざめる超王 / 초능력의 제왕) JP 메타 — cardCount 동기화 + nameKo 정합.
 *  · cardCount 87(stale)→88(actual). JP 레어도 C36/U23/R7/RR12/SR9/UR1=88 트래커 완전일치.
 *  · nameKo "각성하는 초왕"(JP명 직역) → "XY BREAK 확장팩 제10탄 「초능력의 제왕」"(KR공식명, kr-xy10 일치).
 *  date 2016-03-18 정상. KR=87(=88−UR1, clean). KR date 미확정→최종점검. 실행: npx tsx scripts/fix-xy10.ts --apply
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";

const KO = "XY BREAK 확장팩 제10탄 「초능력의 제왕」";

async function main() {
  const APPLY = process.argv.includes("--apply");
  const actual = await prisma.regionCard.count({ where: { setId: "jp-tcg-XY10" } });
  const s = await prisma.set.findUnique({ where: { id: "jp-tcg-XY10" }, select: { cardCount: true, nameKo: true } });
  console.log(`■ XY10 JP | cardCount ${s?.cardCount}→${actual} | nameKo "${s?.nameKo}"→"${KO}" | ${APPLY ? "★APPLY" : "(dry-run)"}`);
  if (APPLY) {
    await prisma.set.update({ where: { id: "jp-tcg-XY10" }, data: { cardCount: actual, nameKo: KO } });
    const v = await prisma.set.findUnique({ where: { id: "jp-tcg-XY10" }, select: { cardCount: true, nameKo: true, releaseDate: true } });
    console.log(`✅ cardCount=${v?.cardCount} nameKo="${v?.nameKo}" date=${v?.releaseDate?.toISOString().slice(0,10)}`);
  } else console.log("(dry-run) --apply");
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
