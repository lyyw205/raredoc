/**
 * EN 정체성 병합(merge-en-identity) 후 정리: EN 로케일이 JP 앵커로 옮겨지며 비워진 옛 EN-only Card 제거.
 * 단, 그 LC 에 매달린 ExternalIdMapping(시세연동 등 외부ID)을 잃지 않도록 **매핑의 cardId 를
 * 로케일(regionCardId)의 현재 LC 로 재지정** 후 빈 LC 삭제. 참조(컬렉션/거래/티어/덱/룰링) 있으면 중단.
 *
 * 실행: npx tsx scripts/cleanup-merged-empty-lc.ts <groupId,groupId,...> [--apply]
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function main() {
  const APPLY = process.argv.includes("--apply");
  const groups = (process.argv[2] ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (!groups.length) { console.error("usage: <groupId,...> [--apply]"); process.exit(1); }

  const lcs = await prisma.card.findMany({ where: { cardPackId: { in: groups } }, select: { id: true, locales: { select: { id: true } } } });
  const emptyIds = lcs.filter((l) => l.locales.length === 0).map((l) => l.id);
  if (!emptyIds.length) { console.log("빈 LC 없음"); await prisma.$disconnect(); return; }

  // 빈 LC 를 가리키는 locale 기반 참조(ExternalIdMapping/CollectionItem/Trade)는 localeId(여전히 유효)의 현재 LC 로 재지정.
  //   Ruling(LC전용) 또는 localeId 로 재홈 불가한 참조가 있으면 안전하게 중단.
  const ruling = await prisma.ruling.count({ where: { cardId: { in: emptyIds } } });
  const ext = await prisma.externalIdMapping.findMany({ where: { cardId: { in: emptyIds } }, select: { id: true, regionCardId: true, cardId: true } });
  const cit = await prisma.collectionItem.findMany({ where: { cardId: { in: emptyIds } }, select: { id: true, localeId: true } });
  const trd = await prisma.trade.findMany({ where: { cardId: { in: emptyIds } }, select: { id: true, localeId: true } });
  const allLoc = [...new Set([...ext.map((m) => m.regionCardId), ...cit.map((m) => m.localeId), ...trd.map((m) => m.localeId)].filter(Boolean) as string[])];
  const locs = await prisma.regionCard.findMany({ where: { id: { in: allLoc } }, select: { id: true, cardId: true } });
  const locLc = new Map(locs.map((l) => [l.id, l.cardId]));
  const resolve = (locId: string | null | undefined): string | null => { if (!locId) return null; const cur = locLc.get(locId); return cur && !emptyIds.includes(cur) ? cur : null; };
  const citBad = cit.filter((m) => !resolve(m.localeId)), trdBad = trd.filter((m) => !resolve(m.localeId));
  console.log(`빈 LC ${emptyIds.length} | 재지정 ext ${ext.length}·coll ${cit.length}·trade ${trd.length} | LC전용참조 ruling=${ruling} | 재홈불가 coll=${citBad.length} trade=${trdBad.length}`);
  if (ruling > 0 || citBad.length + trdBad.length > 0) { console.log("⚠️ 재홈 불가 참조(LC전용/localeId없음) — 중단(수동확인)"); await prisma.$disconnect(); return; }
  if (!APPLY) { console.log("(dry) --apply"); await prisma.$disconnect(); return; }

  for (const m of ext) { const to = resolve(m.regionCardId); if (to) await prisma.externalIdMapping.update({ where: { id: m.id }, data: { cardId: to } }); }
  for (const m of cit) { const to = resolve(m.localeId); if (to) await prisma.collectionItem.update({ where: { id: m.id }, data: { cardId: to } }); }
  for (const m of trd) { const to = resolve(m.localeId); if (to) await prisma.trade.update({ where: { id: m.id }, data: { cardId: to } }); }
  const r = await prisma.card.deleteMany({ where: { id: { in: emptyIds } } }); // 잔여 매핑은 onDelete:Cascade 로 정리
  console.log(`★재지정 ext+coll+trade · 빈 LC 삭제 ${r.count}`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
