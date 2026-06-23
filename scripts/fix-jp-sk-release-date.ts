/**
 * 일회성: jp-sk("VSTAR プレミアムトレーナーボックス", code SK) 발매일 교정.
 *   DB값 2022-12-02(=VSTAR 유니버스 S12a 날짜를 잘못 상속) → 실제 2022-01-14(스타버스 S9 동시발매).
 *   출처: Bulbapedia "VSTAR Premium Trainer Box (TCG)" + limitlesstcg jp/SK 둘 다 2022-01-14.
 *   비동결(swsh-goods). 실행: npx tsx scripts/fix-jp-sk-release-date.ts --apply
 */
import "dotenv/config";
import { prisma } from "@/lib/prisma";

const APPLY = process.argv.includes("--apply");
const TARGET = "jp-sk";
const CORRECT = new Date("2022-01-14T00:00:00.000Z");

async function main() {
  const before = await prisma.set.findUnique({
    where: { id: TARGET },
    select: { id: true, name: true, nameKo: true, region: true, code: true, releaseDate: true, cardPackId: true },
  });
  if (!before) { console.error(`Set ${TARGET} 없음`); process.exit(1); }
  console.log(`대상: ${before.id} [${before.code}] ${before.name} (${before.region}, group ${before.cardPackId})`);
  console.log(`  발매일: ${before.releaseDate?.toISOString().slice(0, 10)} → ${CORRECT.toISOString().slice(0, 10)}`);

  if (!APPLY) { console.log(`\n(dry-run) --apply 로 적용.`); await prisma.$disconnect(); return; }

  await prisma.set.update({ where: { id: TARGET }, data: { releaseDate: CORRECT } });
  const after = await prisma.set.findUnique({ where: { id: TARGET }, select: { releaseDate: true } });
  console.log(`\n✅ 적용완료. 현재 발매일: ${after?.releaseDate?.toISOString().slice(0, 10)}`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
