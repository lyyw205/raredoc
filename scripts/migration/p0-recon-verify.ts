// ── P0 reconciliation 종합 검증 (읽기전용) ───────────────────────────────────
// 두 reconciliation 적용 후 무결성 불변식 점검.
// 실행: npx tsx scripts/migration/p0-recon-verify.ts
import "dotenv/config";
import { prisma } from "../../src/lib/prisma";
const c = async (sql: string) => Number(((await prisma.$queryRawUnsafe(sql)) as any[])[0]?.c ?? 0);
// 드롭된 테이블 참조 시 throw 방지(ArtCard 는 2026-06-11 폐기). 추가형 Slice3 재도입 시 자동 재점검.
const tableExists = async (t: string) =>
  Boolean(((await prisma.$queryRawUnsafe(`SELECT (to_regclass('"${t}"') IS NOT NULL) c`)) as any[])[0]?.c);

async function main() {
  console.log("════ reconciliation 종합 검증 ════\n");

  // 1) dangling cardId (존재하지 않는 LC를 가리키면 안 됨)
  console.log("[1] dangling cardId 참조 (LC 부재):");
  let d1 = 0;
  for (const t of ["DeckRecipeCard", "CollectionItem", "Trade", "Ruling", "CardText", "ExternalIdMapping", "TierEntry", "DeckCard"]) {
    if (!(await tableExists(t))) { console.log(`   ${t}: (테이블 없음·skip)`); continue; }
    const n = await c(`SELECT count(*)::int c FROM "${t}" x WHERE x."logicalCardId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "LogicalCard" l WHERE l.id=x."logicalCardId")`);
    d1 += n; console.log(`   ${t}: ${n}${n ? " 🔴" : ""}`);
  }
  // 2) dangling locale 참조
  console.log("[2] dangling locale 참조 (RegionCard 부재):");
  let d2 = 0;
  for (const [t, col] of [["Price", "cardLocaleId"], ["Trade", "localeId"], ["CollectionItem", "localeId"], ["ExternalIdMapping", "cardLocaleId"]] as [string, string][]) {
    const n = await c(`SELECT count(*)::int c FROM "${t}" x WHERE x."${col}" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "CardLocale" l WHERE l.id=x."${col}")`);
    d2 += n; console.log(`   ${t}.${col}: ${n}${n ? " 🔴" : ""}`);
  }
  // 3) 빈-LC 잔존 + 패밀리
  const empties = await prisma.card.findMany({ where: { locales: { none: {} } }, select: { id: true } });
  const fam = new Map<string, number>();
  for (const e of empties) { const k = e.id.replace(/[0-9].*$/, ""); fam.set(k, (fam.get(k) || 0) + 1); }
  console.log(`[3] 빈-LC 잔존: ${empties.length} (${[...fam].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}=${v}`).join(" · ")})`);

  // 4) 고아 gameCard/artCard (멤버 LC 0). ArtCard 는 드롭 가능성 있어 존재 가드.
  const hasArtCard = await tableExists("ArtCard");
  const orphanGC = await c(`SELECT count(*)::int c FROM "GameCard" g WHERE NOT EXISTS (SELECT 1 FROM "LogicalCard" l WHERE l."gameCardId"=g.id)`);
  const orphanAC = hasArtCard ? await c(`SELECT count(*)::int c FROM "ArtCard" a WHERE NOT EXISTS (SELECT 1 FROM "LogicalCard" l WHERE l."artCardId"=a.id)`) : 0;
  console.log(`[4] 고아 GameCard ${orphanGC}${orphanGC ? " 🔴" : ""} · 고아 ArtCard ${hasArtCard ? `${orphanAC}${orphanAC ? " 🔴" : ""}` : "(ArtCard 드롭됨·skip)"}`);

  // 5) 스테일 트윈 잔존(격리)
  const staleW = `s."setGroupId" IS NULL AND EXISTS (SELECT 1 FROM "Set" t WHERE t.id='en-tcg-'||s.id AND t."setGroupId" IS NOT NULL)`;
  const bareRemain = await c(`SELECT count(*)::int c FROM "Set" s WHERE ${staleW}`);
  const bareLoc = await c(`SELECT count(*)::int c FROM "CardLocale" cl JOIN "Set" s ON s.id=cl."setId" WHERE ${staleW}`);
  const barePrice = await c(`SELECT count(*)::int c FROM "Price" p JOIN "CardLocale" cl ON cl.id=p."cardLocaleId" JOIN "Set" s ON s.id=cl."setId" WHERE ${staleW}`);
  console.log(`[5] 스테일 트윈 잔존(격리): 세트 ${bareRemain} · locale ${bareLoc} · 보존 Price ${barePrice}`);

  // 6) 총계
  const lc = await c(`SELECT count(*)::int c FROM "LogicalCard"`);
  const cl = await c(`SELECT count(*)::int c FROM "CardLocale"`);
  const pr = await c(`SELECT count(*)::int c FROM "Price"`);
  const gc = await c(`SELECT count(*)::int c FROM "GameCard"`);
  const ac = hasArtCard ? await c(`SELECT count(*)::int c FROM "ArtCard"`) : 0;
  console.log(`[6] 총계 — LC ${lc} · RegionCard ${cl} · Price ${pr} · GameCard ${gc} · ArtCard ${hasArtCard ? ac : "(드롭됨)"}`);

  console.log(`\n${d1 + orphanGC + orphanAC + d2 === 0 ? "✅ 무결성 통과 (dangling/고아 0)" : "🔴 무결성 위반 발견"}`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
