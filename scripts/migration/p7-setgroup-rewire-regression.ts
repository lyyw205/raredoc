// ── P7-S1 회귀 게이트: 앵커 SQL(lcIdsInPack) ≡ 현 cardPackId 컬럼 (전 그룹 diff=0) ───
// 컬럼 드롭 전 안전 증명. 앵커규칙(JP>KR>EN) DISTINCT ON 으로 도출한 그룹별 LC집합이
// 현 LogicalCard.cardPackId 와 모든 그룹에서 동일한지 검증.
// 실행: npx tsx scripts/migration/p7-setgroup-rewire-regression.ts
import "dotenv/config";
import { prisma } from "../../src/lib/prisma";

// 앵커 도출 그룹: 각 LC의 JP>KR>EN locale 의 Set.cardPackId
const ANCHOR_GROUP_SQL = `
  SELECT DISTINCT ON (cl."logicalCardId") cl."logicalCardId" lc, s."setGroupId" grp
  FROM "CardLocale" cl JOIN "Set" s ON s.id = cl."setId"
  WHERE s."setGroupId" IS NOT NULL
  ORDER BY cl."logicalCardId",
    CASE cl.region WHEN 'JP' THEN 0 WHEN 'KR' THEN 1 WHEN 'EN' THEN 2 ELSE 3 END`;

async function main() {
  console.log("════ P7-S1 회귀 게이트: 앵커 SQL ≡ cardPackId ════\n");

  // 신: 앵커 도출 (lc → grp)
  const anchorRows: any[] = await prisma.$queryRawUnsafe(ANCHOR_GROUP_SQL);
  const anchorOf = new Map<string, string>();
  for (const r of anchorRows) anchorOf.set(r.lc, r.grp);

  // 구: 현 컬럼 (lc → cardPackId)
  const cur = await prisma.logicalCard.findMany({ where: { cardPackId: { not: null } }, select: { id: true, cardPackId: true } });

  // 그룹별 집합 비교
  const oldByGrp = new Map<string, Set<string>>();
  for (const c of cur) { const g = c.cardPackId!; (oldByGrp.get(g) ?? oldByGrp.set(g, new Set()).get(g)!).add(c.id); }
  const newByGrp = new Map<string, Set<string>>();
  for (const [lc, g] of anchorOf) { (newByGrp.get(g) ?? newByGrp.set(g, new Set()).get(g)!).add(lc); }

  const allGroups = new Set([...oldByGrp.keys(), ...newByGrp.keys()]);
  let diffGroups = 0, onlyOld = 0, onlyNew = 0;
  const samples: string[] = [];
  for (const g of allGroups) {
    const o = oldByGrp.get(g) ?? new Set();
    const n = newByGrp.get(g) ?? new Set();
    let dOld = 0, dNew = 0;
    for (const x of o) if (!n.has(x)) dOld++;
    for (const x of n) if (!o.has(x)) dNew++;
    if (dOld || dNew) {
      diffGroups++; onlyOld += dOld; onlyNew += dNew;
      if (samples.length < 12) samples.push(`${g}: 구−신 ${dOld} · 신−구 ${dNew} (구 ${o.size}/신 ${n.size})`);
    }
  }

  console.log(`그룹 수: 구 ${oldByGrp.size} · 신 ${newByGrp.size} · 합 ${allGroups.size}`);
  console.log(`LC 수: 구 ${cur.length} · 신(앵커) ${anchorOf.size}`);
  console.log(`\n  차이 그룹 ${diffGroups} · 구에만 ${onlyOld} · 신에만 ${onlyNew}`);
  if (samples.length) console.log("  차이 표본:\n    " + samples.join("\n    "));
  console.log(`\n${diffGroups === 0 ? "✅ diff=0 — 앵커 SQL 이 cardPackId 와 완전 동치. 재배선·드롭 안전." : "🔴 diff 발견 — 재배선 보류"}`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
