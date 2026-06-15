/**
 * KR 시크릿 수집 — S4a 샤이니스타V #327-330 (전설 골드 UR 4장).
 * KR #1-326 수집됨, #327-330(무한다이노 V/VMAX·자시안 V·자마젠타 V) 미수집. 공식 KR DB는 #326까지만(시크릿 누락).
 * namu 메타: 4장 모두 UR. 타깃 논리카드(lc-S4a-327~330) 비어있음(충돌 없음). 이미지 null → 표시폴백.
 * 실행: npx tsx scripts/collect-kr-s4a-secrets.ts [--apply]
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "./lib/protected-groups";

const APPLY = process.argv.includes("--apply");
const UR = "cmpp4wyzt001wyjuriy5esk1h";
const CARDS = [
  { num: 327, name: "무한다이노 V" },
  { num: 328, name: "무한다이노 VMAX" },
  { num: 329, name: "자시안 V" },
  { num: 330, name: "자마젠타 V" },
];

async function main() {
  console.log(`\n=== KR S4a 샤이니스타V 시크릿 #327-330 ${APPLY ? "[APPLY]" : "[DRY-RUN]"} ===`);
  assertWritable(["og-s4a"], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "collect-kr-s4a-secrets" });
  let n = 0;
  for (const c of CARDS) {
    const lc = `lc-orphan-jp-tcg-S4a-${c.num}`;
    const id = `kr-s4a-${c.num}`;
    const exists = await prisma.card.findUnique({ where: { id: lc }, select: { id: true } });
    if (!exists) { console.error(`🛑 논리카드 없음: ${lc}`); process.exit(1); }
    const occ = await prisma.regionCard.findFirst({ where: { cardId: lc, region: "KR" }, select: { id: true } });
    if (occ) { console.error(`🛑 충돌: ${lc} 에 기존 KR 행 ${occ.id}`); process.exit(1); }
    console.log(`  ${id} UR ${c.name} → ${lc}`);
    if (APPLY) {
      await prisma.regionCard.upsert({
        where: { id },
        create: { id, language: "ko", region: "KR", number: String(c.num), numberInt: c.num, name: c.name, imageSmall: null, imageLarge: null,
          card: { connect: { id: lc } }, set: { connect: { id: "kr-s4a" } }, rarity: { connect: { id: UR } } },
        update: { name: c.name, card: { connect: { id: lc } }, rarity: { connect: { id: UR } } },
      });
      n++;
    }
  }
  if (APPLY) await prisma.set.update({ where: { id: "kr-s4a" }, data: { cardCount: 330 } });
  console.log(`=== ${APPLY ? `완료: ${n}장 + cardCount 330` : "DRY-RUN. --apply 로 실행."} ===`);
  await prisma.$disconnect();
}
main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
