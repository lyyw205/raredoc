/**
 * SMJ(Tag Team GX Premium Trainer Box) 교정 — DB는 id jp-tcg-SMNP·code 'SMNP'로 들어가 있음(트래커 코드=SMJ).
 *  · code 'SMNP' → 'SMJ'(트래커 일치). · releaseDate placeholder → 2018-12-07. · nameKo '랜덤30장덱'(오매칭) → 정명.
 * cardCount 35=트래커 35(유지). 전부 NULL 레어도(트래커 무). KR 트윈 없음.
 * ※ id 'jp-tcg-SMNP'는 PK라 리네임 보류(코드 필드만 교정).
 * 실행: npx tsx scripts/fix-smnp.ts --apply
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function main() {
  const APPLY = process.argv.includes("--apply");
  const id = "jp-tcg-SMNP";
  const cur = await prisma.set.findUnique({ where: { id }, select: { code: true, nameKo: true, releaseDate: true } });
  if (!cur) { console.log("없음"); await prisma.$disconnect(); return; }
  console.log(`■ SMNP→SMJ 교정 | ${APPLY ? "★APPLY" : "(dry-run)"}`);
  console.log(`  code: ${cur.code} → SMJ`);
  console.log(`  nameKo: "${cur.nameKo}" → "썬&문 프리미엄 트레이너 박스 「TAG TEAM GX」"`);
  console.log(`  releaseDate: ${cur.releaseDate?.toISOString().slice(0,10)} → 2018-12-07`);
  if (APPLY) {
    await prisma.set.update({ where: { id }, data: { code: "SMJ", nameKo: "썬&문 프리미엄 트레이너 박스 「TAG TEAM GX」", releaseDate: new Date("2018-12-07T00:00:00Z") } });
    const v = await prisma.set.findUnique({ where: { id }, select: { code: true, nameKo: true, releaseDate: true } });
    console.log(`\n=== 검증 ===\n  code=${v?.code} nameKo=${v?.nameKo} date=${v?.releaseDate?.toISOString().slice(0,10)}`);
  } else console.log("\n(dry-run) 적용: --apply");
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
