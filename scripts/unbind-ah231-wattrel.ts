/**
 * en-binding-check 후속 — 오연결 1건 떼어내기(unbind).
 *   EN "Iono's Wattrel" #231 IR(en-tcg-me2pt5-231)이 스타트덱100 일반 카드(lc-jp-tcg-MC-278)에
 *   잘못 붙어 있음. IR(특별일러)은 스타트덱100(AR 없음) 출처일 수 없음 → 정답은 dream-ex AR(미수집).
 *   조치: EN 카드를 옛 LC에서 떼어 EN전용 orphan LC(lc-orphan-en-tcg-me2pt5-231)로 repoint.
 *   옛 LC(lc-jp-tcg-MC-278)는 JP+KR 유지(동결 매칭 불훼손). 영향 동결그룹 → --allow-protected.
 *
 * 실행: npx tsx scripts/unbind-ah231-wattrel.ts [--apply] [--allow-protected]
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "./lib/protected-groups";

const EN_RC = "en-tcg-me2pt5-231";
const OLD_LC = "lc-jp-tcg-MC-278";
const NEW_LC = "lc-orphan-en-tcg-me2pt5-231";

async function main() {
  const apply = process.argv.includes("--apply");
  const allow = hasAllowProtectedFlag();

  const rc = await prisma.regionCard.findUnique({
    where: { id: EN_RC },
    select: { id: true, region: true, name: true, number: true, numberInt: true, cardId: true,
      set: { select: { id: true, cardPackId: true } } },
  });
  if (!rc) throw new Error(`EN RegionCard 없음: ${EN_RC}`);
  if (rc.region !== "EN") throw new Error(`region=EN 아님: ${rc.region}`);
  if (rc.cardId !== OLD_LC) throw new Error(`현재 cardId(${rc.cardId})가 기대(${OLD_LC})와 다름 — 이미 변경됐거나 상태 불일치. 중단.`);

  const oldCard = await prisma.card.findUnique({ where: { id: OLD_LC } });
  if (!oldCard) throw new Error(`옛 LC 없음: ${OLD_LC}`);
  const oldLocales = await prisma.regionCard.findMany({ where: { cardId: OLD_LC }, select: { region: true, set: { select: { cardPackId: true } } } });
  const oldRegions = oldLocales.map((l) => l.region);
  if (!oldRegions.includes("JP") || !oldRegions.includes("KR"))
    throw new Error(`옛 LC가 JP+KR 공유앵커가 아님(${oldRegions.join("/")}) — 떼기 안전성 미확보. 중단.`);

  const exists = await prisma.card.findUnique({ where: { id: NEW_LC }, select: { id: true } });
  const affected = [...oldLocales.map((l) => l.set?.cardPackId ?? null), rc.set?.cardPackId ?? null];

  console.log(`${apply ? "[APPLY]" : "[DRY]"} unbind ${EN_RC} (EN#${rc.number} ${rc.name})`);
  console.log(`  옛 LC ${OLD_LC} 로케일: ${oldRegions.join("+")} → EN 제거 후 ${oldRegions.filter((r) => r !== "EN").join("+")} 유지`);
  console.log(`  새 orphan LC: ${NEW_LC} (${exists ? "이미 존재 — 재사용" : "신규 생성, dream-ex 그룹"})`);
  console.log(`  영향 cardPack: ${affected.filter(Boolean).join(", ")}`);
  assertWritable(affected, { allow, dryRun: !apply, tool: "unbind-ah231-wattrel" });

  if (!apply) { console.log("\n(dry-run — --apply --allow-protected 로 적용)"); return; }

  await prisma.$transaction(async (tx) => {
    if (!exists) {
      // 옛 LC 게임메타 복제 → EN전용 orphan LC. id/primarySet/cardPack 만 EN 카드 기준으로 교체.
      await tx.card.create({ data: {
        id: NEW_LC,
        primarySetId: rc.set?.id ?? null,
        primaryNumber: rc.number,
        primaryNumberInt: rc.numberInt,
        pokedexNumbers: oldCard.pokedexNumbers,
        supertype: oldCard.supertype, subtypes: oldCard.subtypes, types: oldCard.types,
        hp: oldCard.hp, retreatCost: oldCard.retreatCost, weakness: oldCard.weakness, resistance: oldCard.resistance,
        regulationMark: oldCard.regulationMark, illustrator: oldCard.illustrator,
        evolvesFrom: oldCard.evolvesFrom, evolvesTo: oldCard.evolvesTo,
        abilities: oldCard.abilities ?? undefined, attacks: oldCard.attacks ?? undefined,
        legalities: oldCard.legalities ?? undefined, rules: oldCard.rules,
        flavorText: oldCard.flavorText, rarityId: oldCard.rarityId,
        nameKo: oldCard.nameKo, gameCardId: oldCard.gameCardId,
      } });
    }
    await tx.regionCard.update({ where: { id: EN_RC }, data: { cardId: NEW_LC } });
  });

  // 검증
  const after = await prisma.regionCard.findUnique({ where: { id: EN_RC }, select: { cardId: true } });
  const oldRemain = await prisma.regionCard.findMany({ where: { cardId: OLD_LC }, select: { region: true } });
  console.log(`\n✅ 완료 — ${EN_RC}.cardId = ${after?.cardId}`);
  console.log(`   옛 LC ${OLD_LC} 잔여 로케일: ${oldRemain.map((l) => l.region).sort().join("+")} (JP+KR 보존 확인)`);
}

main().then(() => prisma.$disconnect()).catch((e) => { console.error(e instanceof Error ? e.message : e); prisma.$disconnect(); process.exit(1); });
