/**
 * 두 LogicalCard 병합 — 소스 LC 의 지역판/모든 의존을 타깃 LC 로 이전 후 소스 삭제. ★비가역.
 *   검증된 "같은 카드"(교차지역 누락 등)를 1건씩 병합. /test 검토로 확정된 것만.
 *   동결팩(PROTECTED_GROUPS) 영향 시 --allow-protected 필수 (EN/KR 매칭 변경 = 동결 핵심 보호대상).
 *   이전 대상: RegionCard · CardText(언어충돌은 타깃권위로 삭제) · CardSpecies(중복은 cascade) ·
 *             ExternalIdMapping(sourceId+externalId 충돌 회피) · CollectionItem · Trade · Ruling · DeckRecipeCard.
 *
 * 실행: npx tsx scripts/merge-logical-cards.ts <srcLC> <tgtLC> [--apply] [--allow-protected]
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { assertMappingWritable } from "./lib/protected-groups";

const APPLY = process.argv.includes("--apply");
const ALLOW = process.argv.includes("--allow-protected");
const [SRC, TGT] = process.argv.slice(2).filter((a) => !a.startsWith("--"));

const sel = {
  id: true, gameCardId: true, illustrator: true,
  locales: { select: { id: true, region: true, set: { select: { cardPackId: true } } } },
  texts: { select: { id: true, language: true } },
  speciesLinks: { select: { speciesId: true } },
} as const;

async function main() {
  if (!SRC || !TGT || SRC === TGT) { console.error("usage: <srcLC> <tgtLC> [--apply] [--allow-protected]"); process.exit(1); }
  const src = await prisma.card.findUnique({ where: { id: SRC }, select: sel });
  const tgt = await prisma.card.findUnique({ where: { id: TGT }, select: sel });
  if (!src) throw new Error(`소스 LC 없음: ${SRC}`);
  if (!tgt) throw new Error(`타깃 LC 없음: ${TGT}`);

  console.log(`\n병합 ${SRC} → ${TGT} ${APPLY ? "★APPLY(비가역)" : "(dry-run)"}`);
  console.log(`  gameCard: src=${src.gameCardId} · tgt=${tgt.gameCardId} ${src.gameCardId === tgt.gameCardId ? "동일✓" : "⚠ 다름"}`);
  console.log(`  소스 locale [${src.locales.map((l) => l.region)}] → 타깃 [${tgt.locales.map((l) => l.region)}]`);

  // 매핑 잠금 — LC 병합은 region카드↔논리카드 재연결(정체성 매핑 변경). 영향 팩이 잠금 시대면 --allow-protected 필요.
  const packs = [...new Set([...src.locales, ...tgt.locales].map((l) => l.set.cardPackId).filter(Boolean) as string[])];
  assertMappingWritable(packs, { allow: ALLOW, dryRun: !APPLY, tool: "merge-logical-cards", what: `LC 병합 ${SRC} → ${TGT}` });
  if (src.gameCardId !== tgt.gameCardId) console.log(`  ⚠ gameCard 다름 — 정말 같은 카드인지 재확인 권장(병합은 진행).`);

  const tgtLangs = new Set(tgt.texts.map((t) => t.language));
  const tgtSp = new Set(tgt.speciesLinks.map((s) => s.speciesId));
  console.log(`  CardText 이동 ${src.texts.filter((t) => !tgtLangs.has(t.language)).length} · 충돌삭제 ${src.texts.filter((t) => tgtLangs.has(t.language)).length}`);
  console.log(`  CardSpecies 이동 ${src.speciesLinks.filter((s) => !tgtSp.has(s.speciesId)).length} · 중복 ${src.speciesLinks.filter((s) => tgtSp.has(s.speciesId)).length}(cascade)`);

  if (!APPLY) { console.log("\n[dry-run] 변경 없음. --apply 로 적용."); await prisma.$disconnect(); return; }

  await prisma.$transaction(async (tx) => {
    await tx.regionCard.updateMany({ where: { cardId: SRC }, data: { cardId: TGT } });
    for (const t of src.texts) {
      if (tgtLangs.has(t.language)) await tx.cardText.delete({ where: { id: t.id } });
      else await tx.cardText.update({ where: { id: t.id }, data: { cardId: TGT } });
    }
    for (const s of src.speciesLinks) {
      if (!tgtSp.has(s.speciesId)) await tx.cardSpecies.update({ where: { cardId_speciesId: { cardId: SRC, speciesId: s.speciesId } }, data: { cardId: TGT } });
    }
    const exts = await tx.externalIdMapping.findMany({ where: { cardId: SRC }, select: { id: true, sourceId: true, externalId: true } });
    for (const e of exts) {
      const clash = await tx.externalIdMapping.findFirst({ where: { sourceId: e.sourceId, externalId: e.externalId, NOT: { id: e.id } } });
      if (clash) await tx.externalIdMapping.delete({ where: { id: e.id } });
      else await tx.externalIdMapping.update({ where: { id: e.id }, data: { cardId: TGT } });
    }
    await tx.collectionItem.updateMany({ where: { cardId: SRC }, data: { cardId: TGT } });
    await tx.trade.updateMany({ where: { cardId: SRC }, data: { cardId: TGT } });
    await tx.ruling.updateMany({ where: { cardId: SRC }, data: { cardId: TGT } });
    await tx.deckRecipeCard.updateMany({ where: { cardId: SRC }, data: { cardId: TGT } });
    await tx.card.delete({ where: { id: SRC } });
  });

  const after = await prisma.card.findUnique({ where: { id: TGT }, select: { locales: { select: { region: true } } } });
  console.log(`\n✅ 병합 완료. 타깃 ${TGT} locale: [${after?.locales.map((l) => l.region)}]`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
