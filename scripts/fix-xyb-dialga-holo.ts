/**
 * pack-list-check 후속(사용자 승인) — XYB「ハイパーメタルチェーンデッキ」결함 교정.
 *   리스트가 정답·DB 결함 확정(駿河屋/hareruya2/cardrush/tradecard): 실제 XYB=20장
 *   (본탄18 + (キ라)ディアルガEX 홀로 #19/018 + 기본鋼エネルギー #20).
 *   우리 DB=19장(홀로 디아루가 미수집 + 기본鋼E가 #19로 오넘버링).
 *   조치(원자적):
 *     (1) 기본鋼エネルギー 를 #19→#20 으로 정리 (CardLocale/LC id·번호 일괄 020 으로 rename).
 *     (2) 홀로 ディアルガEX 를 #19 로 신규 수집 — base #4(lc-...-004) 게임필드 복제·gameCard 공유,
 *         이미지=tradecard.jp 스캔(시각검증 완료)을 R2 재호스팅, 레어도 null(덱 관례·리스트 "—").
 *     (3) Set.cardCount 19→20.
 *   FK 안전 확인됨(에너지 RC/LC 에 price/collection/trade/text/species 0). 비동결 xy-decks.
 *   실행: npx tsx scripts/fix-xyb-dialga-holo.ts [--apply]   (이미지 /tmp/dialga19.webp 필요)
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import { prisma } from "../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "./lib/protected-groups";
import { r2KeyFor, uploadBuffer, r2PublicUrl, contentTypeFor, headExists } from "../src/lib/r2";

const SET = "jp-tcg-XYB";
const ENERGY_RC = "jp-tcg-XYB-019", ENERGY_LC = "lc-jp-tcg-XYB-019";
const ENERGY_RC_NEW = "jp-tcg-XYB-020", ENERGY_LC_NEW = "lc-jp-tcg-XYB-020";
const DIALGA_RC = "jp-tcg-XYB-019", DIALGA_LC = "lc-jp-tcg-XYB-019"; // #19 자리(에너지 이동 후 빔)
const BASE_DIALGA_LC = "lc-jp-tcg-XYB-004";
const SPECIES_DIALGA = 483;
const IMG_FILE = "/tmp/dialga19.webp";

async function main() {
  const apply = process.argv.includes("--apply");
  const allow = hasAllowProtectedFlag();
  assertWritable(["xy-decks"], { allow, dryRun: !apply, tool: "fix-xyb-dialga-holo" });

  const energyLc = await prisma.card.findUnique({ where: { id: ENERGY_LC } });
  const energyRc = await prisma.regionCard.findUnique({ where: { id: ENERGY_RC } });
  const base = await prisma.card.findUnique({ where: { id: BASE_DIALGA_LC } });
  if (!energyLc || !energyRc || !base) throw new Error("필요 행 누락(energy LC/RC 또는 base #4)");
  if (energyRc.name.indexOf("エネルギー") < 0) throw new Error(`#19 가 에너지가 아님(${energyRc.name}) — 상태불일치 중단`);
  const dupe = await prisma.regionCard.findUnique({ where: { id: ENERGY_RC_NEW }, select: { id: true } });
  if (dupe) throw new Error("jp-tcg-XYB-020 이미 존재 — 중단");

  // R2 이미지 키/URL
  const key = r2KeyFor("xy-decks", "ja", "large", SET, "019", "webp");
  const r2url = r2PublicUrl(key);

  console.log(`${apply ? "[APPLY]" : "[DRY]"} XYB 결함 교정`);
  console.log(`  (1) 에너지 ${ENERGY_RC}(${energyRc.name}) → #20 (rename RC→${ENERGY_RC_NEW}, LC→${ENERGY_LC_NEW}, number 019→020)`);
  console.log(`  (2) 홀로 ディアルガEX → ${DIALGA_RC}/#19 신규(base ${BASE_DIALGA_LC} 복제·gameCard ${base.gameCardId} 공유·species ${SPECIES_DIALGA})`);
  console.log(`      이미지 R2 key=${key}`);
  console.log(`  (3) Set ${SET}.cardCount 19→20`);

  if (!apply) { console.log("\n(dry-run — --apply 로 적용)"); return; }

  // 이미지 업로드(멱등)
  if (!(await headExists(key))) {
    const buf = readFileSync(IMG_FILE);
    await uploadBuffer(key, buf, contentTypeFor("webp"));
    console.log(`   ✅ R2 업로드 ${buf.length}B → ${r2url}`);
  } else console.log(`   (R2 이미 존재 — 재사용 ${r2url})`);

  await prisma.$transaction(async (tx) => {
    // --- (1) 에너지 #19 → #20 (lc/rc id 정합 rename: 새 LC 생성 → RC 재지정 → 옛 LC 삭제) ---
    await tx.card.create({ data: {
      id: ENERGY_LC_NEW, cardPackId: energyLc.cardPackId, primarySetId: energyLc.primarySetId,
      primaryNumber: "020", primaryNumberInt: 20, pokedexNumbers: energyLc.pokedexNumbers,
      supertype: energyLc.supertype, subtypes: energyLc.subtypes, types: energyLc.types,
      hp: energyLc.hp, retreatCost: energyLc.retreatCost, weakness: energyLc.weakness, resistance: energyLc.resistance,
      regulationMark: energyLc.regulationMark, illustrator: energyLc.illustrator,
      evolvesFrom: energyLc.evolvesFrom, evolvesTo: energyLc.evolvesTo,
      abilities: energyLc.abilities ?? undefined, attacks: energyLc.attacks ?? undefined,
      legalities: energyLc.legalities ?? undefined, rules: energyLc.rules, flavorText: energyLc.flavorText,
      rarityId: energyLc.rarityId, nameKo: energyLc.nameKo, attacksKo: energyLc.attacksKo ?? undefined,
      abilitiesKo: energyLc.abilitiesKo ?? undefined, gameCardId: energyLc.gameCardId,
    } });
    await tx.regionCard.update({ where: { id: ENERGY_RC }, data: {
      id: ENERGY_RC_NEW, cardId: ENERGY_LC_NEW, number: "020", numberInt: 20,
    } });
    await tx.card.delete({ where: { id: ENERGY_LC } }); // 옛 에너지 LC(고아) 제거

    // --- (2) 홀로 ディアルガEX #19 신규(base #4 복제) ---
    await tx.card.create({ data: {
      id: DIALGA_LC, cardPackId: base.cardPackId, primarySetId: SET,
      primaryNumber: "019", primaryNumberInt: 19, pokedexNumbers: base.pokedexNumbers,
      supertype: base.supertype, subtypes: base.subtypes, types: base.types,
      hp: base.hp, retreatCost: base.retreatCost, weakness: base.weakness, resistance: base.resistance,
      regulationMark: base.regulationMark, illustrator: base.illustrator,
      evolvesFrom: base.evolvesFrom, evolvesTo: base.evolvesTo,
      abilities: base.abilities ?? undefined, attacks: base.attacks ?? undefined,
      legalities: base.legalities ?? undefined, rules: base.rules, flavorText: base.flavorText,
      rarityId: null, nameKo: base.nameKo, attacksKo: base.attacksKo ?? undefined,
      abilitiesKo: base.abilitiesKo ?? undefined, gameCardId: base.gameCardId,
    } });
    await tx.regionCard.create({ data: {
      id: DIALGA_RC, cardId: DIALGA_LC, language: "ja", region: "JP", setId: SET,
      number: "019", numberInt: 19, name: "ディアルガEX", imageSmall: r2url, imageLarge: r2url,
      rarityId: null, regulationMark: null,
    } });
    if (base.nameKo) await tx.cardText.create({ data: { cardId: DIALGA_LC, language: "ko", name: base.nameKo, source: "lc_nameko" } });
    await tx.cardSpecies.create({ data: { cardId: DIALGA_LC, speciesId: SPECIES_DIALGA } });

    // --- (3) cardCount ---
    const cnt = await tx.regionCard.count({ where: { setId: SET } });
    await tx.set.update({ where: { id: SET }, data: { cardCount: cnt } });
  });

  // 검증
  const after = await prisma.regionCard.findMany({
    where: { setId: SET, numberInt: { in: [19, 20] } },
    select: { id: true, numberInt: true, name: true, cardId: true, imageSmall: true }, orderBy: { numberInt: "asc" } });
  const cc = await prisma.set.findUnique({ where: { id: SET }, select: { cardCount: true } });
  console.log("✅ 완료");
  for (const a of after) console.log(`   #${a.numberInt} ${a.id} ${a.name} → ${a.cardId}  img=${a.imageSmall?.split("/").pop()}`);
  console.log(`   Set.cardCount=${cc?.cardCount}`);
}
main().then(() => prisma.$disconnect()).catch((e) => { console.error(e instanceof Error ? e.message : e); prisma.$disconnect(); process.exit(1); });
