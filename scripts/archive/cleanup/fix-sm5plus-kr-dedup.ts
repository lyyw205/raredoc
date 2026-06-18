/**
 * kr-sm5+(울트라포스 KR) 중복비대 dedup — 103행 → 65행.
 * 구조(공식 pokemoncard.co.kr + 이미지 실측 확정):
 *   · #1-56  : 진짜(메인50[/050] + SR6[#51-56]). 유지. ※#1 모부기만 lc-kr-001 오링크(진짜 JP정체성은 #57이 점유).
 *   · #57-94 : 38개 blockB 중복재등재(메인카드 재listing, 각 #1-56에 이름트윈). 삭제.
 *   · #95-103: 9개 기본에너지(SM5plus_095=기본 풀에너지 이미지 실측). 트윈없음=유니크 → ★유지.
 * 모부기 정리: #57(모부기, lc-jp-tcg-SM5+-001) 삭제 후 #1(모부기)을 lc-jp-tcg-SM5+-001로 재링크(JP공유정체성 복원), 고아 lc-kr-sm5+-001 삭제.
 * 안전: victim=#57-94 정확히 38·전부 트윈보유 / 보존 #95-103 전부 '에너지' / lc-jp LC는 미삭제(JP공유).
 * og-sm5+ 비동결. prisma FK스칼라=cardId. 실행: npx tsx scripts/fix-sm5plus-kr-dedup.ts --apply
 */
import "dotenv/config";
import { prisma } from "../../../src/lib/prisma";

const SET = "kr-sm5+";
const JP_MOBU = "lc-jp-tcg-SM5+-001";
const KR_MOBU = "lc-kr-sm5+-001";

async function main() {
  const APPLY = process.argv.includes("--apply");
  const all = await prisma.regionCard.findMany({ where: { setId: SET }, select: { id: true, numberInt: true, name: true, cardId: true } });
  const keepersMain = all.filter((r) => r.numberInt >= 1 && r.numberInt <= 56);
  const victims = all.filter((r) => r.numberInt >= 57 && r.numberInt <= 94);
  const energies = all.filter((r) => r.numberInt >= 95 && r.numberInt <= 103);
  const keeperNames = new Set(keepersMain.map((k) => k.name));

  console.log(`■ ${SET} dedup | 전체 ${all.length} = 메인 ${keepersMain.length} + 중복 ${victims.length} + 에너지 ${energies.length} | ${APPLY ? "★APPLY" : "(dry-run)"}`);

  // 안전 가드
  const noTwin = victims.filter((v) => !keeperNames.has(v.name));
  const badEnergy = energies.filter((e) => !/에너지/.test(e.name));
  const mobu1 = all.find((r) => r.numberInt === 1);
  const mobu57 = all.find((r) => r.numberInt === 57);
  if (victims.length !== 38) { console.log(`  🔴 victim ${victims.length}≠38 → 중단`); await prisma.$disconnect(); return; }
  if (energies.length !== 9) { console.log(`  🔴 에너지 ${energies.length}≠9 → 중단`); await prisma.$disconnect(); return; }
  if (noTwin.length) { console.log(`  🔴 트윈없는 victim ${noTwin.length} → 중단:`, noTwin.map(v=>`#${v.numberInt} ${v.name}`).join(", ")); await prisma.$disconnect(); return; }
  if (badEnergy.length) { console.log(`  🔴 비에너지 보존대상 → 중단:`, badEnergy.map(e=>`#${e.numberInt} ${e.name}`).join(", ")); await prisma.$disconnect(); return; }
  if (!mobu1 || mobu1.cardId !== KR_MOBU || !/모부기/.test(mobu1.name)) { console.log(`  🔴 #1 모부기(lc-kr-001) 확인실패 → 중단`); await prisma.$disconnect(); return; }
  if (!mobu57 || mobu57.cardId !== JP_MOBU || !/모부기/.test(mobu57.name)) { console.log(`  🔴 #57 모부기(lc-jp-001) 확인실패 → 중단`); await prisma.$disconnect(); return; }
  console.log(`  ✅ 안전: victim 38 전부 트윈보유 / 에너지 9 전부 기본에너지 / 모부기 #1(lc-kr)·#57(lc-jp) 확인`);
  console.log(`  보존에너지: ${energies.map(e=>e.name).join(", ")}`);
  if (!APPLY) { console.log(`\n(dry-run) 삭제 38(#57-94) + #1 재링크(lc-kr→lc-jp) → ${SET} 65행. --apply`); await prisma.$disconnect(); return; }

  // 1) victim 38행 삭제(#57-94, #57 모부기 포함 → lc-jp-001 해방)
  const del = await prisma.regionCard.deleteMany({ where: { id: { in: victims.map((v) => v.id) } } });
  console.log(`  CardLocale 삭제: ${del.count}`);
  // 2) #1 모부기 재링크 lc-kr-001 → lc-jp-001
  await prisma.regionCard.update({ where: { id: mobu1.id }, data: { cardId: JP_MOBU } });
  console.log(`  #1 모부기 재링크: ${KR_MOBU} → ${JP_MOBU}`);
  // 3) 고아 lc-kr LC 삭제(victim cardId 중 lc-kr-* + lc-kr-001), lc-jp는 미삭제
  const candidates = [...new Set([...victims.map((v) => v.cardId), KR_MOBU])].filter((x): x is string => !!x && x.startsWith("lc-kr-"));
  let lcDel = 0;
  for (const id of candidates) {
    if (await prisma.regionCard.count({ where: { cardId: id } })) continue;
    try { await prisma.card.delete({ where: { id } }); lcDel++; } catch (e) { console.log(`  ~ LC ${id} skip(${(e as Error).message.slice(0,40)})`); }
  }
  console.log(`  LogicalCard(lc-kr) 삭제: ${lcDel}`);
  const actual = await prisma.regionCard.count({ where: { setId: SET } });
  await prisma.set.update({ where: { id: SET }, data: { cardCount: actual } });
  console.log(`\n=== 검증 === ${SET} actual=${actual} cardCount=${actual}`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
