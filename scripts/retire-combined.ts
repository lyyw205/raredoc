/**
 * 오염 합본 세트 은퇴 (별개 orphan LC형). 분할 재수집·병합 완료 후 실행.
 *
 * jp-sv-base 와 달리 이 합본(jp-sv-paldea-evolved 등)의 CardLocale 은 분할 LC 와 0% 겹치는
 * 독립 orphan LC 라, 합본 CardLocale + 그 빈 LC 를 통삭제하고 분할 세트를 그룹에 배정한다.
 *
 * 가드: 합본 LC 에 컬렉션/거래/티어/덱/룰링/외부ID 참조 0 · 합본 locale 외 다른 locale 없음.
 *       primarySetId=합본 인 잔존 LC 는 분할로 재지정.
 *
 * 실행: npx tsx scripts/retire-combined.ts <combinedSetId> <splitSetId,...>          # dry
 *       npx tsx scripts/retire-combined.ts jp-sv-paldea-evolved jp-tcg-SV2P,jp-tcg-SV2D --apply
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";

const APPLY = process.argv.includes("--apply");

async function main() {
  const combinedId = process.argv[2];
  const splits = (process.argv[3] ?? "").split(",").filter(Boolean);
  if (!combinedId || !splits.length) { console.error("usage: <combinedSetId> <splitSetId,...> [--apply]"); process.exit(1); }

  const combinedSet = await prisma.set.findUnique({ where: { id: combinedId }, select: { setGroupId: true, region: true } });
  if (!combinedSet) { console.error(`세트 없음: ${combinedId}`); process.exit(1); }

  const locs = await prisma.cardLocale.findMany({ where: { setId: combinedId }, select: { id: true, logicalCardId: true } });
  const locIds = locs.map((l) => l.id);
  const lcids = [...new Set(locs.map((l) => l.logicalCardId))];

  // 합본 LC 들의 전체 locale (합본 외 다른 locale 보유? → 보유시 통삭제 불가)
  const lcLocales = await prisma.cardLocale.findMany({ where: { logicalCardId: { in: lcids } }, select: { logicalCardId: true, setId: true } });
  const extra = new Set<string>();
  for (const l of lcLocales) if (l.setId !== combinedId) extra.add(l.logicalCardId);

  // 참조 가드
  const refCount = async (m: any) => m.count({ where: { logicalCardId: { in: lcids } } }).catch(() => -1);
  const coll = await refCount(prisma.collectionItem), trade = await refCount(prisma.trade),
    tier = await refCount(prisma.tierEntry), deck = await refCount(prisma.deckCard), ruling = await refCount(prisma.ruling);
  const extId = await prisma.externalIdMapping.count({ where: { logicalCardId: { in: lcids } } }).catch(() => -1);
  const collLoc = await prisma.collectionItem.count({ where: { localeId: { in: locIds } } });
  const tradeLoc = await prisma.trade.count({ where: { localeId: { in: locIds } } });
  // primarySetId=합본 인 잔존 LC (합본 LC 외)
  const primLcs = await prisma.logicalCard.findMany({ where: { primarySetId: combinedId }, select: { id: true } });
  const tierSet = await prisma.tierEntry.count({ where: { setId: combinedId } });

  console.log(`■ 합본 은퇴 계획: ${combinedId} (그룹=${combinedSet.setGroupId ?? "null"})`);
  console.log(`  합본 CardLocale ${locIds.length} · 영향 LC ${lcids.length}`);
  console.log(`  가드 — LC 가 합본외 다른 locale 보유: ${extra.size}  ${extra.size === 0 ? "✅통삭제 가능" : "⚠️부분분리 필요"}`);
  console.log(`  가드 — LC 참조: 컬렉션 ${coll} · 거래 ${trade} · 티어 ${tier} · 덱 ${deck} · 룰링 ${ruling} · 외부ID ${extId}`);
  console.log(`  가드 — locale 참조: 컬렉션 ${collLoc} · 거래 ${tradeLoc}`);
  console.log(`  primarySetId=합본 인 LC ${primLcs.length} → ${splits[0]} 로 재지정 예정 · TierEntry(setId) ${tierSet}`);
  console.log(`  분할 ${splits.join(", ")} → 그룹 ${combinedSet.setGroupId ?? "null"} 배정 예정`);

  const guardFail = extra.size > 0 || [coll, trade, tier, deck, ruling, extId, collLoc, tradeLoc].some((n) => n !== 0);
  if (guardFail) { console.log("\n⚠️ 가드 실패 — 중단."); await prisma.$disconnect(); return; }
  if (!APPLY) { console.log("\n(dry) 이상 없음. 실제 적용: --apply"); await prisma.$disconnect(); return; }

  console.log("\n적용 중...");
  // 1) primarySetId 재지정
  let primFixed = 0;
  for (const lc of primLcs) { await prisma.logicalCard.update({ where: { id: lc.id }, data: { primarySetId: splits[0] } }); primFixed++; }
  // 2) 합본 CardLocale 삭제 (Price cascade)
  const delLoc = await prisma.cardLocale.deleteMany({ where: { setId: combinedId } });
  // 3) 빈 합본 LC 삭제
  const delLc = await prisma.logicalCard.deleteMany({ where: { id: { in: lcids } } });
  // 4) TierEntry + Set 삭제
  const delTier = await prisma.tierEntry.deleteMany({ where: { setId: combinedId } });
  await prisma.set.delete({ where: { id: combinedId } });
  // 5) 분할을 그룹에 배정
  let grouped = 0;
  if (combinedSet.setGroupId) for (const s of splits) { await prisma.set.update({ where: { id: s }, data: { setGroupId: combinedSet.setGroupId } }); grouped++; }

  console.log(`  primarySetId 재지정 ${primFixed} · CardLocale 삭제 ${delLoc.count} · LC 삭제 ${delLc.count} · TierEntry 삭제 ${delTier.count} · Set 삭제 ${combinedId} · 분할 그룹배정 ${grouped}`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
