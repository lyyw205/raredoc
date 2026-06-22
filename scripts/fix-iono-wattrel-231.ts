/**
 * en-binding 후속(사용자 승인) — EN Ascended Heroes #231 「Iono's Wattrel」 일러스트레어 정체성 교정.
 *
 *   문제: EN me2pt5-231(IR, mingo 풀아트)가 고아 LC `lc-orphan-en-tcg-me2pt5-231`(gameCardId
 *         gc_28754…) 에 매달려 스타트덱100 MC-278(같은 gameCard) 의 영문판처럼 묶여 보였다.
 *   진실(3출처+이미지 픽셀일치 확정): #231 의 진짜 일본판은 SV-P #232(`jp-svp-232`, mingo 풀아트).
 *         MC-278 은 일반 일러(Akira Komayama) 리프린트라 그림 자체가 다름 → 오연결.
 *   조치(원자적):
 *     (1) jp-svp-232 메타 백필(고아 LC 에서 복제: subtypes/types/hp/dex/retreat/weak/resist)
 *         + 일러스트레이터 'mingo' 로 교정(고아 LC 의 'Akira Komayama' 는 일반 일러 오기) + nameKo.
 *     (2) EN RegionCard en-tcg-me2pt5-231 → cardId=jp-svp-232 로 repoint(진짜 짝과 같은 LC).
 *     (3) 종(940)·CardText(ko) jp-svp-232 에 생성.
 *     (4) 빈 고아 LC 삭제 → EN #231 이 gc_28754(스타트덱100) 에서 완전 이탈.
 *   gameCardId 는 null 유지(보수적 — 덱레시피서 일반 인쇄본과 새로 합쳐지지 않게).
 *   동결 영향: mega-dream-ex(고아 LC 삭제) + mega-start-deck-100(gc_28754 에서 EN 이탈) → --allow-protected.
 *   실행: npx tsx scripts/fix-iono-wattrel-231.ts [--apply] [--allow-protected]
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "./lib/protected-groups";

const ORPHAN_LC = "lc-orphan-en-tcg-me2pt5-231";
const EN_RC = "en-tcg-me2pt5-231";
const TARGET_LC = "jp-svp-232";
const NAME_KO = "모야모의 찌리비";
const ILLUS = "mingo";
const DEX = 940;
const AFFECTED = ["mega-dream-ex", "mega-start-deck-100", "og-kr-sv-promo"];

async function main() {
  const apply = process.argv.includes("--apply");
  const allow = hasAllowProtectedFlag();
  assertWritable(AFFECTED, { allow, dryRun: !apply, tool: "fix-iono-wattrel-231" });

  const orphan = await prisma.card.findUnique({ where: { id: ORPHAN_LC } });
  const target = await prisma.card.findUnique({ where: { id: TARGET_LC } });
  const enRc = await prisma.regionCard.findUnique({ where: { id: EN_RC }, select: { id: true, region: true, cardId: true, name: true, number: true } });
  if (!orphan) throw new Error(`고아 LC 없음: ${ORPHAN_LC}`);
  if (!target) throw new Error(`타깃 LC 없음: ${TARGET_LC}`);
  if (!enRc) throw new Error(`EN RegionCard 없음: ${EN_RC}`);
  if (enRc.region !== "EN") throw new Error(`EN_RC region 불일치: ${enRc.region}`);
  if (enRc.cardId !== ORPHAN_LC) throw new Error(`EN_RC 가 고아 LC 에 없음(현재 ${enRc.cardId}) — 상태 불일치 중단`);

  // 타깃에 JP 있고 EN 없어야(오매칭 방지)
  const tLoc = await prisma.regionCard.findMany({ where: { cardId: TARGET_LC }, select: { region: true, number: true } });
  const tReg = [...new Set(tLoc.map((l) => l.region))];
  if (!tReg.includes("JP")) throw new Error(`타깃에 JP 로케일 없음(${tReg.join("/") || "없음"})`);
  if (tReg.includes("EN")) throw new Error(`타깃이 이미 EN 보유 — 오매칭 의심 중단`);
  // 고아 LC 는 EN #231 단독이어야
  const oLoc = await prisma.regionCard.findMany({ where: { cardId: ORPHAN_LC }, select: { id: true, region: true } });
  if (oLoc.length !== 1 || oLoc[0].id !== EN_RC) throw new Error(`고아 LC 로케일이 EN #231 단독이 아님: ${JSON.stringify(oLoc)}`);

  console.log(`${apply ? "[APPLY]" : "[DRY]"} EN #231 IR → jp-svp-232 정체성 교정`);
  console.log(`  타깃 jp-svp-232 locales(현재): ${tReg.join("/")} (#${tLoc.map((l) => l.number).join(",")})`);
  console.log(`  (1) jp-svp-232 메타 백필: subtypes=${JSON.stringify(orphan.subtypes)} types=${JSON.stringify(orphan.types)} hp=${orphan.hp} dex=[${DEX}] retreat=${orphan.retreatCost} illus='${ILLUS}'(교정) nameKo='${NAME_KO}'`);
  console.log(`  (2) repoint ${EN_RC}(EN#${enRc.number} ${enRc.name}) → ${TARGET_LC}`);
  console.log(`  (3) 종 ${DEX} + CardText(ko) 생성`);
  console.log(`  (4) 빈 고아 LC ${ORPHAN_LC} 삭제 (gc_28754 이탈)`);

  if (!apply) { console.log("\n(dry-run — --apply [--allow-protected] 로 적용)"); return; }

  await prisma.$transaction(async (tx) => {
    // (1) 메타 백필 — 고아 LC 에서 복제 + 일러 교정
    await tx.card.update({
      where: { id: TARGET_LC },
      data: {
        subtypes: orphan.subtypes, types: orphan.types, hp: orphan.hp,
        pokedexNumbers: [DEX], retreatCost: orphan.retreatCost,
        weakness: orphan.weakness ?? undefined, resistance: orphan.resistance ?? undefined,
        illustrator: ILLUS, nameKo: NAME_KO,
      },
    });
    // (3) 종 + 텍스트 (멱등)
    const hasSp = await tx.cardSpecies.findFirst({ where: { cardId: TARGET_LC, speciesId: DEX }, select: { speciesId: true } });
    if (!hasSp) await tx.cardSpecies.create({ data: { cardId: TARGET_LC, speciesId: DEX } });
    await tx.cardText.upsert({
      where: { cardId_language: { cardId: TARGET_LC, language: "ko" } },
      create: { cardId: TARGET_LC, language: "ko", name: NAME_KO, source: "lc_nameko" },
      update: { name: NAME_KO },
    });
    // (2) repoint
    await tx.regionCard.update({ where: { id: EN_RC }, data: { cardId: TARGET_LC } });
    // (4) 빈 고아 LC 삭제
    const remain = await tx.regionCard.count({ where: { cardId: ORPHAN_LC } });
    if (remain !== 0) throw new Error(`고아 LC 가 아직 비지 않음(${remain}) — 롤백`);
    await tx.card.delete({ where: { id: ORPHAN_LC } });
  });

  // 검증
  const after = await prisma.regionCard.findMany({
    where: { cardId: TARGET_LC },
    select: { id: true, region: true, number: true, name: true }, orderBy: { region: "asc" } });
  const orphanGone = await prisma.card.findUnique({ where: { id: ORPHAN_LC }, select: { id: true } });
  const tg = await prisma.card.findUnique({ where: { id: TARGET_LC }, select: { gameCardId: true, illustrator: true, nameKo: true, types: true, hp: true, pokedexNumbers: true } });
  console.log("\n✅ 완료");
  for (const a of after) console.log(`   ${a.region} #${a.number} ${a.name} (${a.id})`);
  console.log(`   jp-svp-232: illus=${tg?.illustrator} nameKo=${tg?.nameKo} types=${JSON.stringify(tg?.types)} hp=${tg?.hp} dex=${JSON.stringify(tg?.pokedexNumbers)} gameCardId=${tg?.gameCardId ?? "null(유지)"}`);
  console.log(`   고아 LC 삭제됨? ${orphanGone ? "❌ 아직 존재" : "✅ 삭제"}`);
}

main().then(() => prisma.$disconnect()).catch((e) => { console.error(e instanceof Error ? e.message : e); prisma.$disconnect(); process.exit(1); });
