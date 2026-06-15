/**
 * XY3(ライジングフィスト / 라이징피스트) JP 메타 — ★date 오류 교정 + cardCount + nameKo.
 *  · releaseDate ★2014-09-13(XY4 날짜 오입력)→2014-06-14(트래커).
 *  · cardCount 103(stale)→105. nameKo "라이징 피스트"→"XY 확장팩 제3탄 「라이징피스트」".
 *  ※C/U 2장차(DB C48/U31 vs 트래커 C46/U33): XY7처럼 트래커 오류 가능성 → C/U배치감사 이월.
 *  ※KR=103(=105−UR2). KR date 미확정→최종점검. 실행: npx tsx scripts/fix-xy3.ts --apply
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";

const KO = "XY 확장팩 제3탄 「라이징피스트」";

async function main() {
  const APPLY = process.argv.includes("--apply");
  const actual = await prisma.regionCard.count({ where: { setId: "jp-tcg-XY3" } });
  const s = await prisma.set.findUnique({ where: { id: "jp-tcg-XY3" }, select: { cardCount: true, nameKo: true, releaseDate: true } });
  console.log(`■ XY3 JP | date ${s?.releaseDate?.toISOString().slice(0,10)}→2014-06-14 | cardCount ${s?.cardCount}→${actual} | nameKo "${s?.nameKo}"→"${KO}" | ${APPLY ? "★APPLY" : "(dry-run)"}`);
  if (APPLY) {
    await prisma.set.update({ where: { id: "jp-tcg-XY3" }, data: { releaseDate: new Date("2014-06-14T00:00:00Z"), cardCount: actual, nameKo: KO } });
    const v = await prisma.set.findUnique({ where: { id: "jp-tcg-XY3" }, select: { cardCount: true, nameKo: true, releaseDate: true } });
    console.log(`✅ date=${v?.releaseDate?.toISOString().slice(0,10)} cardCount=${v?.cardCount} nameKo="${v?.nameKo}"`);
  } else console.log("(dry-run) --apply");
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
