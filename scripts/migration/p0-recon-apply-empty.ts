// ── P0 빈-LC reconciliation 적용 — ref 재포인트 후 껍데기 삭제 ─────────────────
// recon-empty-mapping.json(검증통과 4,820)을 읽어 각 빈-LC의 ref를 타깃 LC로 옮기고 빈-LC 삭제.
//  이동: DeckRecipeCard·CollectionItem·Trade·Ruling·ExternalIdMapping = logicalCardId UPDATE
//        CardText = 타깃이 같은 언어 없을 때만 이동(unique(lcId,lang)), 충돌분은 잔류→cascade 삭제
//  삭제: 매핑된 빈-LC만(격리 19 제외). cascade로 잔여 CardText/ExternalId/Species 정리.
//  스냅샷: 삭제 LC 전체행 + 이동 ref old값 → .migration-snapshots/recon-empty-apply.json
// 기본 dry-run. 적용 --apply. 실행: npx tsx scripts/migration/p0-recon-apply-empty.ts [--apply]
import "dotenv/config";
import fs from "fs";
import { prisma } from "../../src/lib/prisma";

const APPLY = process.argv.includes("--apply");
const MAP = ".migration-snapshots/recon-empty-mapping.json";
const SNAP = ".migration-snapshots/recon-empty-apply.json";
const esc = (s: string) => String(s).replace(/'/g, "''");

async function main() {
  const { map } = JSON.parse(fs.readFileSync(MAP, "utf8")) as { map: Record<string, string> };
  const pairs = Object.entries(map); // [emptyId, targetId]
  const emptyIds = pairs.map(([e]) => e);
  console.log(`【빈-LC reconciliation】${APPLY ? " ★APPLY" : " (dry-run)"}`);
  console.log(`  매핑 빈-LC ${pairs.length}개 → 타깃 ${new Set(pairs.map(([, t]) => t)).size}개`);

  // 안전가드: 타깃이 빈-LC 집합과 겹치면 중단(체인 삭제 방지)
  const emptySet = new Set(emptyIds);
  const badTarget = pairs.filter(([, t]) => emptySet.has(t));
  if (badTarget.length) { console.log(`  ⛔ 타깃이 매핑소스와 겹침 ${badTarget.length} → 중단`); console.log("   " + badTarget.slice(0, 5).map(([e, t]) => `${e}→${t}`).join(" · ")); await prisma.$disconnect(); return; }

  // 현재 ref 분포(이동 대상 규모)
  const refTables = ["DeckRecipeCard", "CollectionItem", "Trade", "Ruling", "ExternalIdMapping", "CardText"];
  console.log("  이동 대상 ref(빈-LC에 매달림):");
  const refCounts: Record<string, number> = {};
  for (const t of refTables) {
    const r: any[] = await prisma.$queryRawUnsafe(`SELECT count(*)::int c FROM "${t}" WHERE "logicalCardId" = ANY(ARRAY[${emptyIds.map((x) => `'${esc(x)}'`).join(",")}])`);
    refCounts[t] = Number(r[0]?.c ?? 0); console.log(`    ${t}: ${refCounts[t]}`);
  }
  // CardText 충돌(타깃이 이미 같은 언어 보유) 추정
  const ctConflict: any[] = await prisma.$queryRawUnsafe(
    `SELECT count(*)::int c FROM "CardText" ct JOIN (VALUES ${pairs.map(([e, t]) => `('${esc(e)}','${esc(t)}')`).join(",")}) m(empty,target) ON ct."logicalCardId"=m.empty
     WHERE EXISTS (SELECT 1 FROM "CardText" o WHERE o."logicalCardId"=m.target AND o.language=ct.language)`);
  console.log(`    └ CardText 충돌(잔류→cascade): ${Number(ctConflict[0]?.c ?? 0)} · 이동가능 ${refCounts.CardText - Number(ctConflict[0]?.c ?? 0)}`);

  if (!APPLY) {
    const emptyNow = await prisma.logicalCard.count({ where: { locales: { none: {} } } });
    console.log(`\n  현재 빈-LC 총 ${emptyNow} → 삭제 후 예상 ${emptyNow - pairs.length}(격리 ${emptyNow - pairs.length} 잔존)`);
    console.log("  (dry-run — 변경 0. --apply 로 적용)");
    await prisma.$disconnect(); return;
  }

  // ── 스냅샷 ──
  if (!fs.existsSync(".migration-snapshots")) fs.mkdirSync(".migration-snapshots", { recursive: true });
  const snap: any = { ts: new Date().toISOString?.() ?? "", refMoves: {}, deletedLCs: [], cascade: {} };
  for (const t of refTables) {
    const model = (prisma as any)[t[0].toLowerCase() + t.slice(1)];
    snap.refMoves[t] = await model.findMany({ where: { logicalCardId: { in: emptyIds } }, select: { id: true, logicalCardId: true } });
  }
  snap.deletedLCs = await prisma.logicalCard.findMany({ where: { id: { in: emptyIds } } });
  snap.cascade.CardText = await prisma.cardText.findMany({ where: { logicalCardId: { in: emptyIds } } });
  snap.cascade.ExternalIdMapping = await prisma.externalIdMapping.findMany({ where: { logicalCardId: { in: emptyIds } } });
  snap.cascade.LogicalCardSpecies = await prisma.logicalCardSpecies.findMany({ where: { logicalCardId: { in: emptyIds } } });
  fs.writeFileSync(SNAP, JSON.stringify(snap));
  console.log(`\n  💾 스냅샷 ${SNAP} (삭제LC ${snap.deletedLCs.length})`);

  // ── ref 이동 (VALUES join 배치) ──
  const valuesOf = (chunk: [string, string][]) => chunk.map(([e, t]) => `('${esc(e)}','${esc(t)}')`).join(",");
  async function moveSimple(table: string) {
    let moved = 0;
    for (let i = 0; i < pairs.length; i += 1000) {
      const chunk = pairs.slice(i, i + 1000);
      moved += await prisma.$executeRawUnsafe(
        `UPDATE "${table}" x SET "logicalCardId"=m.target FROM (VALUES ${valuesOf(chunk)}) AS m(empty,target) WHERE x."logicalCardId"=m.empty`);
    }
    return moved;
  }
  const movedDRC = await moveSimple("DeckRecipeCard");
  const movedCI = await moveSimple("CollectionItem");
  const movedTR = await moveSimple("Trade");
  const movedRU = await moveSimple("Ruling");
  const movedEX = await moveSimple("ExternalIdMapping");
  // CardText: 충돌 안 나는 것만 이동
  let movedCT = 0;
  for (let i = 0; i < pairs.length; i += 1000) {
    const chunk = pairs.slice(i, i + 1000);
    movedCT += await prisma.$executeRawUnsafe(
      `UPDATE "CardText" ct SET "logicalCardId"=m.target FROM (VALUES ${valuesOf(chunk)}) AS m(empty,target)
       WHERE ct."logicalCardId"=m.empty AND NOT EXISTS (SELECT 1 FROM "CardText" o WHERE o."logicalCardId"=m.target AND o.language=ct.language)`);
  }
  console.log(`  이동 — DeckRecipeCard ${movedDRC} · CollectionItem ${movedCI} · Trade ${movedTR} · Ruling ${movedRU} · ExternalId ${movedEX} · CardText ${movedCT}`);

  // ── 빈-LC 삭제(cascade) ──
  const del = await prisma.logicalCard.deleteMany({ where: { id: { in: emptyIds } } });
  console.log(`  삭제 — 빈-LC ${del.count}`);

  // ── 검증 ──
  const emptyNow = await prisma.logicalCard.count({ where: { locales: { none: {} } } });
  let dangling = 0;
  for (const t of ["DeckRecipeCard", "CollectionItem", "Trade", "Ruling", "ExternalIdMapping", "CardText"]) {
    const r: any[] = await prisma.$queryRawUnsafe(`SELECT count(*)::int c FROM "${t}" WHERE "logicalCardId" = ANY(ARRAY[${emptyIds.map((x) => `'${esc(x)}'`).join(",")}])`);
    dangling += Number(r[0]?.c ?? 0);
  }
  console.log(`\n  ✅ 빈-LC 잔존 ${emptyNow}(격리 예상) · 삭제LC로의 잔여참조 ${dangling}(0이어야 정상)`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
