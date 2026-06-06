/**
 * setGroup 의 빈 LogicalCard(locale 0개) 정리 — 병합 후 남은 고아 LC.
 * 참조(CollectionItem/Trade/DeckCard/TierEntry/Ruling/ExternalIdMapping) 0 인 것만 삭제.
 * 실행: npx tsx scripts/cleanup-empty-lc.ts <setGroupId> [--apply]
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
async function main() {
  const gid = process.argv[2], APPLY = process.argv.includes("--apply");
  if (!gid) { console.error("usage: <setGroupId> [--apply]"); process.exit(1); }
  const lcs = await prisma.logicalCard.findMany({ where: { setGroupId: gid }, select: { id: true,
    _count: { select: { locales: true, collectionItems: true, trades: true, deckCards: true, tierEntries: true, rulings: true, externalIds: true } } } });
  const empty = lcs.filter((l) => l._count.locales === 0);
  const safe: string[] = [], unsafe: string[] = [];
  for (const l of empty) {
    const refs = l._count.collectionItems + l._count.trades + l._count.deckCards + l._count.tierEntries + l._count.rulings + l._count.externalIds;
    if (refs === 0) safe.push(l.id); else unsafe.push(`${l.id}(${refs})`);
  }
  console.log(`${gid} LC ${lcs.length} · 빈 LC ${empty.length} · 삭제안전 ${safe.length} · 참조보류 ${unsafe.length}${unsafe.length ? " " + unsafe.slice(0, 10).join(",") : ""} ${APPLY ? "★APPLY" : "(dry)"}`);
  if (APPLY && safe.length) { const r = await prisma.logicalCard.deleteMany({ where: { id: { in: safe } } }); console.log(`★삭제 ${r.count}`); }
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
