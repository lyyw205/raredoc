// ── P7-S1 진단: LogicalCard.setGroupId 가 물리경로(CardLocale.setId→Set.setGroupId)로 도출가능한가 ──
// setGroupId 제거 전제: 각 LC의 setGroupId 가 자기 locale 들의 Set.setGroupId 와 일치해야 함.
// 불일치 = '도둑질' 잔재(재포인트로 LC.setGroupId 가 물리와 어긋남) → 케이스 분류.
// 실행: npx tsx scripts/migration/p7-setgroup-derive-check.ts
import "dotenv/config";
import { prisma } from "../../src/lib/prisma";
const n = (x: any) => Number(x ?? 0);

async function main() {
  console.log("════ P7-S1: setGroupId 물리경로 도출가능성 ════\n");

  // 전체 LC 수 / setGroupId 보유 / locale 보유
  const totalLC = await prisma.logicalCard.count();
  const withGrp = await prisma.logicalCard.count({ where: { setGroupId: { not: null } } });
  console.log(`LC 총 ${totalLC} · setGroupId 보유 ${withGrp}`);

  // 각 LC: 자기 locale들의 Set.setGroupId 집합(distinct, null제외)
  // 분류: ①물리도출 setGroup이 정확히 1개이고 LC.setGroupId와 일치(=안전)
  //       ②물리 setGroup 0개(locale의 Set이 setGroupId null=고아세트) — LC.setGroupId만 있음
  //       ③물리 setGroup 여러개(한 LC가 여러 팩 set에 걸침) — 직교화 핵심 케이스
  //       ④LC.setGroupId ≠ 물리 단일 setGroup (불일치=도둑질 잔재)
  //       ⑤LC.setGroupId null인데 물리 setGroup 있음(역)
  const rows: any[] = await prisma.$queryRawUnsafe(`
    SELECT lc.id, lc."setGroupId" lcg,
           array_remove(array_agg(DISTINCT s."setGroupId"), NULL) phys
    FROM "LogicalCard" lc
    LEFT JOIN "CardLocale" cl ON cl."logicalCardId"=lc.id
    LEFT JOIN "Set" s ON s.id=cl."setId"
    GROUP BY lc.id, lc."setGroupId"`);

  let safe = 0, physNone = 0, physMulti = 0, mismatch = 0, lcgNullPhys = 0, bothNull = 0;
  const mmSamples: string[] = [], multiSamples: string[] = [];
  for (const r of rows) {
    const lcg = r.lcg as string | null;
    const phys = (r.phys || []) as string[];
    if (phys.length === 0) {
      if (lcg == null) bothNull++; else physNone++;
      continue;
    }
    if (phys.length > 1) {
      physMulti++;
      if (multiSamples.length < 8) multiSamples.push(`${r.id} lcg=${lcg ?? "∅"} phys=[${phys.join(",")}]`);
      continue;
    }
    // phys 단일
    if (lcg == null) { lcgNullPhys++; continue; }
    if (lcg === phys[0]) safe++;
    else { mismatch++; if (mmSamples.length < 12) mmSamples.push(`${r.id} lcg=${lcg} ≠ phys=${phys[0]}`); }
  }

  console.log(`\n── 분류 (총 ${rows.length} LC) ──`);
  console.log(`  ① 안전(물리단일=LC.setGroupId 일치): ${safe}`);
  console.log(`  ② 물리 setGroup 0(고아세트 locale, LC.setGroupId만): ${physNone}`);
  console.log(`  ③ 물리 setGroup 복수(한 LC 여러 팩 걸침): ${physMulti}`);
  console.log(`  ④ 불일치(LC.setGroupId ≠ 물리단일): ${mismatch}`);
  console.log(`  ⑤ LC.setGroupId=null 인데 물리 있음: ${lcgNullPhys}`);
  console.log(`  ⑥ 둘다 없음(locale 0 등): ${bothNull}`);
  console.log(`\n  도출안전 비율: ${safe}/${withGrp} (${((safe / withGrp) * 100).toFixed(1)}% of setGroupId보유)`);
  if (mmSamples.length) console.log("\n  ④ 불일치 표본:\n    " + mmSamples.join("\n    "));
  if (multiSamples.length) console.log("\n  ③ 복수 표본:\n    " + multiSamples.join("\n    "));

  // ②·⑤ 추가 진단: 물리 setGroup 0인 LC의 locale 세트가 어떤건지(고아세트인지 locale0인지)
  if (physNone > 0) {
    const ex: any[] = await prisma.$queryRawUnsafe(`
      SELECT lc.id, lc."setGroupId" lcg, array_agg(DISTINCT cl."setId") sets
      FROM "LogicalCard" lc JOIN "CardLocale" cl ON cl."logicalCardId"=lc.id
      LEFT JOIN "Set" s ON s.id=cl."setId"
      WHERE lc."setGroupId" IS NOT NULL
      GROUP BY lc.id, lc."setGroupId"
      HAVING count(DISTINCT s."setGroupId") FILTER (WHERE s."setGroupId" IS NOT NULL)=0
      LIMIT 6`);
    console.log("\n  ② 표본(물리 setGroup 없는 LC — locale의 Set이 setGroupId null):");
    for (const e of ex) console.log(`    ${e.id} lcg=${e.lcg} sets=[${(e.sets || []).join(",")}]`);
  }
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
