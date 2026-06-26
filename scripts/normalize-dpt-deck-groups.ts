/**
 * DPt(플래티넘기) JP단독 덱/박스/프로모 그룹 정규화 (멱등, dry-run 우선).
 *
 * 배경: 2026-06-22 ad-hoc 수집으로 만들어진 15개 og-jp-dpt* 그룹이 미정규화 상태
 *   (era="Platinum" raw·eraKey=null·order=0·CardPackLink 0). 본탄 og-pl1~4 와 비대칭.
 *   사용자 결정(2026-06-25): 개별 그룹 유지 + 정규화 진행.
 *
 * 무엇을 하나(각 그룹):
 *   - eraKey="Pt" (canonEra("Platinum")="Pt", Era 테이블 "Pt" 존재) — 분류의 핵심 수정
 *   - era="Pt" (raw 도 본탄과 일치시킴)
 *   - order = 본탄(210~213) 뒤 214~ 순차(set.releaseDate asc, id asc)
 *   - CardPackLink 재생성: JP/ANCHOR/ONE_TO_ONE(jpSet) + EN/JP_ONLY/JP_ONLY(null)
 *     (JP단독 정본 선례 og-web1/og-vs1 패턴)
 *
 * 실행: npx tsx scripts/normalize-dpt-deck-groups.ts [--apply]
 */
import "dotenv/config";
import { prisma } from "@/lib/prisma";

const APPLY = process.argv.includes("--apply");
const ORDER_BASE = 214; // 본탄 og-pl4=213 직후

async function main() {
  // era="Platinum" 인 그룹 = 정확히 이 15개 DPt 덱 (본탄은 era="Pt")
  const groups = await prisma.cardPack.findMany({
    where: { era: "Platinum" },
    select: { id: true, era: true, eraKey: true, order: true, nameJa: true },
  });
  // 각 그룹의 단일 JP set + releaseDate
  const rows: { groupId: string; setId: string; release: Date; nameJa: string | null }[] = [];
  for (const g of groups) {
    const sets = await prisma.set.findMany({ where: { cardPackId: g.id }, select: { id: true, region: true, releaseDate: true } });
    const jp = sets.find((s) => s.region === "JP");
    if (!jp) { console.warn(`⚠ ${g.id}: JP set 없음 — skip`); continue; }
    if (sets.length > 1) console.warn(`⚠ ${g.id}: set ${sets.length}개 (JP단독 가정 위반?) — ${sets.map((s) => s.region + ":" + s.id).join(",")}`);
    rows.push({ groupId: g.id, setId: jp.id, release: jp.releaseDate, nameJa: g.nameJa });
  }
  // 정렬: releaseDate asc → groupId asc (결정적)
  rows.sort((a, b) => (a.release.getTime() - b.release.getTime()) || a.groupId.localeCompare(b.groupId));

  console.log(`=== DPt 덱 그룹 정규화 ${rows.length}개 ${APPLY ? "★APPLY" : "(dry-run)"} ===\n`);
  let i = 0;
  for (const r of rows) {
    const order = ORDER_BASE + i;
    console.log(`  ${String(order)} ${r.groupId.padEnd(18)} ← era=Pt eraKey=Pt  [JP/ANCHOR ${r.setId} + EN/JP_ONLY]  rel=${r.release.toISOString().slice(0,10)}  ${r.nameJa ?? ""}`);
    if (APPLY) {
      await prisma.cardPack.update({
        where: { id: r.groupId },
        data: { era: "Pt", eraKey: "Pt", order },
      });
      // CardPackLink 재생성 (멱등): 기존 삭제 후 2개 생성
      await prisma.cardPackLink.deleteMany({ where: { waveId: r.groupId } });
      await prisma.cardPackLink.createMany({
        data: [
          { waveId: r.groupId, region: "JP", setId: r.setId, role: "ANCHOR", relationType: "ONE_TO_ONE" },
          { waveId: r.groupId, region: "EN", setId: null, role: "JP_ONLY", relationType: "JP_ONLY" },
        ],
      });
    }
    i++;
  }

  if (APPLY) {
    // 검증 재조회
    const after = await prisma.cardPack.findMany({
      where: { id: { in: rows.map((r) => r.groupId) } },
      select: { id: true, era: true, eraKey: true, order: true, _count: { select: { packs: true } } },
      orderBy: { order: "asc" },
    });
    console.log(`\n=== 적용 후 검증 ===`);
    let bad = 0;
    for (const g of after) {
      const ok = g.era === "Pt" && g.eraKey === "Pt" && g.order >= ORDER_BASE && g._count.packs === 2;
      if (!ok) bad++;
      console.log(`  ${ok ? "✓" : "✗"} ${g.id.padEnd(18)} era=${g.era} eraKey=${g.eraKey} ord=${g.order} links=${g._count.packs}`);
    }
    console.log(bad === 0 ? `\n✅ 전 ${after.length}개 정규화 정상` : `\n❌ ${bad}개 이상`);
  }
}

main().finally(() => prisma.$disconnect());
