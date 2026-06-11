// ── P0 빈-LC 청소 (로케일 0개 유령 LogicalCard) ───────────────────────────────
// task #78 이후 SV작업서 재발한 lc-orphan-* 류. FK 참조 0 확인 후에만 삭제.
// 기본 dry-run. 적용 --apply. 실행: npx tsx scripts/migration/p0-emptylc-purge.ts [--apply]
import "dotenv/config";
import fs from "fs";
import { prisma } from "../../src/lib/prisma";

const APPLY = process.argv.includes("--apply");
const SNAP = ".migration-snapshots/p0-emptylc-purge.json";

async function main() {
  const empties = await prisma.logicalCard.findMany({
    where: { locales: { none: {} } },
    select: { id: true, supertype: true, regulationMark: true, pokedexNumbers: true, cardPackId: true },
  });
  console.log(`【빈-LC 청소】${APPLY ? " ★APPLY" : " (dry-run)"}`);
  console.log(`  로케일 0개 LC: ${empties.length}`);
  // 출처 패턴 분포
  const pref = new Map<string, number>();
  for (const e of empties) { const p = e.id.replace(/[0-9].*$/, "").slice(0, 18); pref.set(p, (pref.get(p) || 0) + 1); }
  console.log("  id 접두 분포:", [...pref].map(([k, v]) => `${k}=${v}`).join(" · "));

  if (!empties.length) { console.log("  → 없음. 종료."); await prisma.$disconnect(); return; }

  const ids = empties.map((e) => e.id);
  // FK 참조 점검 (logicalCardId 가진 전 모델)
  const refModels: [string, any][] = [
    ["CollectionItem", prisma.collectionItem], ["Trade", prisma.trade], ["TierEntry", prisma.tierEntry],
    ["DeckCard", prisma.deckCard], ["DeckRecipeCard", prisma.deckRecipeCard], ["Ruling", prisma.ruling],
    ["CardText", prisma.cardText], ["ExternalIdMapping", prisma.externalIdMapping],
  ];
  let totalRefs = 0;
  console.log("  FK 참조 점검:");
  for (const [name, model] of refModels) {
    try { const c = await model.count({ where: { logicalCardId: { in: ids } } }); totalRefs += c; console.log(`    ${name}: ${c}`); }
    catch (e: any) { console.log(`    ${name}: (스킵 ${e.message?.split("\n")[0]})`); }
  }
  console.log(`  ─ 총 참조: ${totalRefs} (0이어야 안전 삭제 가능)`);

  // 스냅샷
  if (!fs.existsSync(".migration-snapshots")) fs.mkdirSync(".migration-snapshots", { recursive: true });
  fs.writeFileSync(SNAP, JSON.stringify(empties));
  console.log(`  스냅샷: ${SNAP} (${empties.length}행)`);

  if (!APPLY) { console.log("\n  (dry-run — 삭제 0. --apply 로 적용)"); await prisma.$disconnect(); return; }
  if (totalRefs > 0) { console.log("\n  ⛔ 참조 존재 → 삭제 중단. 재포인트 선행 필요."); await prisma.$disconnect(); return; }

  const del = await prisma.logicalCard.deleteMany({ where: { id: { in: ids } } });
  const remain = await prisma.logicalCard.count({ where: { locales: { none: {} } } });
  console.log(`\n  ✅ 삭제 ${del.count} · 빈-LC 잔존 ${remain} (0이어야 정상)`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
