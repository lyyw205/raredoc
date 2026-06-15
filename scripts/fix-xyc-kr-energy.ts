/**
 * kr-xyc 기본에너지 충돌 교정 — 2장이 잘못된 번호(#1/#2)+잘못된 LC(판짱/부란다의 lc-...-001/002)에 배치돼 있음.
 * JP 구조상 기본에너지는 #24 基本悪·#25 基本フェアリー (lc-jp-tcg-XYC-024/025). KR도 그 위치로 교정:
 *   · 기본 악 에너지:   numberInt 1→24, cardId lc-jp-tcg-XYC-001 → lc-jp-tcg-XYC-024
 *   · 기본 페어리 에너지: numberInt 2→25, cardId lc-jp-tcg-XYC-002 → lc-jp-tcg-XYC-025
 * 교정후 KR 25 distinct(#1-25) = JP 일치. 가드: 현재 번호/LC/이름 확인 후만. 실행: npx tsx scripts/fix-xyc-kr-energy.ts --apply
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";

const FIXES = [
  { name: "기본 악 에너지", fromN: 1, fromLc: "lc-jp-tcg-XYC-001", toN: 24, toLc: "lc-jp-tcg-XYC-024" },
  { name: "기본 페어리 에너지", fromN: 2, fromLc: "lc-jp-tcg-XYC-002", toN: 25, toLc: "lc-jp-tcg-XYC-025" },
];

async function main() {
  const APPLY = process.argv.includes("--apply");
  console.log(`■ kr-xyc 기본에너지 충돌 교정 | ${APPLY ? "★APPLY" : "(dry-run)"}\n`);
  let ok = 0;
  for (const f of FIXES) {
    const rc = await prisma.regionCard.findFirst({ where: { setId: "kr-xyc", name: f.name, numberInt: f.fromN, cardId: f.fromLc } });
    if (!rc) { console.log(`  🔴 ${f.name} (#${f.fromN}/${f.fromLc}) 못찾음 → skip`); continue; }
    // 목적지 충돌 체크
    const clash = await prisma.regionCard.findFirst({ where: { setId: "kr-xyc", numberInt: f.toN } });
    if (clash) { console.log(`  🔴 #${f.toN} 이미 존재(${clash.name}) → skip`); continue; }
    console.log(`  ✔ ${f.name}: #${f.fromN}→#${f.toN}, ${f.fromLc}→${f.toLc}`);
    ok++;
    if (APPLY) await prisma.regionCard.update({ where: { id: rc.id }, data: { numberInt: f.toN, cardId: f.toLc } });
  }
  if (APPLY) {
    const actual = await prisma.regionCard.count({ where: { setId: "kr-xyc" } });
    const distinct = (await prisma.regionCard.findMany({ where: { setId: "kr-xyc" }, select: { numberInt: true } }));
    const uniq = new Set(distinct.map(d=>d.numberInt)).size;
    await prisma.set.update({ where: { id: "kr-xyc" }, data: { cardCount: actual } });
    console.log(`\n=== 검증 === kr-xyc rows=${actual}, distinct numbers=${uniq} (충돌해소시 25=25)`);
  } else console.log(`\n(dry-run) ${ok}장 교정예정. --apply`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
