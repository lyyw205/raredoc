/**
 * XY5a 타이달스톰 메타 — cardCount + nameKo.
 *  · jp-tcg-XY5a cardCount 78(stale)→80. JP 레어도 C32/U23/R9/RR6/SR8/UR2=80 트래커 완전일치. date 2014-12-13·code XY5a 정상.
 *  · nameKo "타이달 스톰"→"XY 확장팩 제5탄 「타이달 스톰」"(KR공식형).
 *  ★KR kr-xy5a 미존재=KR 타이달스톰 미수집(최종점검). 실행: npx tsx scripts/fix-xy5a-tidal.ts --apply
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";

const KO = "XY 확장팩 제5탄 「타이달 스톰」";

async function main() {
  const APPLY = process.argv.includes("--apply");
  const actual = await prisma.regionCard.count({ where: { setId: "jp-tcg-XY5a" } });
  const s = await prisma.set.findUnique({ where: { id: "jp-tcg-XY5a" }, select: { cardCount: true, nameKo: true } });
  console.log(`■ XY5a Tidal JP | cardCount ${s?.cardCount}→${actual} | nameKo "${s?.nameKo}"→"${KO}" | ${APPLY ? "★APPLY" : "(dry-run)"}`);
  if (APPLY) {
    await prisma.set.update({ where: { id: "jp-tcg-XY5a" }, data: { cardCount: actual, nameKo: KO } });
    const v = await prisma.set.findUnique({ where: { id: "jp-tcg-XY5a" }, select: { cardCount: true, nameKo: true, releaseDate: true } });
    console.log(`✅ cardCount=${v?.cardCount} nameKo="${v?.nameKo}" date=${v?.releaseDate?.toISOString().slice(0,10)}`);
  } else console.log("(dry-run) --apply");
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
