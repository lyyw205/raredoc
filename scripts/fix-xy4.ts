/**
 * XY4(ファントムゲート / 팬텀게이트) JP 메타 — cardCount + nameKo.
 *  · cardCount 95(stale)→97. date 2014-09-13 정상.
 *  · nameKo "팬텀 게이트"→"XY 확장팩 제4탄 「팬텀게이트」"(KR공식, kr-xy4 일치).
 *  ※C/U 1장차(DB C40/U30 vs 트래커 C39/U31): ★XY7처럼 트래커 C/U오류 가능성 있어 단정 안 함 → C/U배치감사 이월(공식 판정).
 *  ※KR=95(=97−UR2 무수집). KR date 미확정→최종점검. 실행: npx tsx scripts/fix-xy4.ts --apply
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";

const KO = "XY 확장팩 제4탄 「팬텀게이트」";

async function main() {
  const APPLY = process.argv.includes("--apply");
  const actual = await prisma.regionCard.count({ where: { setId: "jp-tcg-XY4" } });
  const s = await prisma.set.findUnique({ where: { id: "jp-tcg-XY4" }, select: { cardCount: true, nameKo: true } });
  console.log(`■ XY4 JP | cardCount ${s?.cardCount}→${actual} | nameKo "${s?.nameKo}"→"${KO}" | ${APPLY ? "★APPLY" : "(dry-run)"}`);
  if (APPLY) {
    await prisma.set.update({ where: { id: "jp-tcg-XY4" }, data: { cardCount: actual, nameKo: KO } });
    const v = await prisma.set.findUnique({ where: { id: "jp-tcg-XY4" }, select: { cardCount: true, nameKo: true, releaseDate: true } });
    console.log(`✅ cardCount=${v?.cardCount} nameKo="${v?.nameKo}" date=${v?.releaseDate?.toISOString().slice(0,10)}`);
  } else console.log("(dry-run) --apply");
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
