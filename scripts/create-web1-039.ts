/**
 * ポケモンカード★web (jp-tcg-web1, og-web1) 누락 카드 #039 ロケット団のニャース 생성.
 *
 * 배경: web1 48장 중 #039만 DB에 없음(누락). 사용자가 tcgcollector 일본판 이미지 제공.
 *   카드 식별(이미지 판독): ロケット団のニャース / Pokémon·Basic·Colorless·HP40 / Meowth(dex52) /
 *   기술 だいぎゃくてん(무색1, 10×, 코인플립) / 일러 Kunihiko Yuyama / 039/048 ★(Rare) / 1st Ed.
 *   ※약점(빨강)·저항(보라 Psychic) 색만 보여 단정 어려워 null(이미지에 표시됨).
 *   구조는 인접 #038 카이리유와 동형(JP단독 orphan): Card(lc-orphan-...-039)+RegionCard(...-039)+CardSpecies(52).
 *
 * 동작: 이미지 webp large(q90)+245 small(q80) → R2 og-web1/ja/{size}/jp-tcg-web1/039.webp
 *   → Card 생성 → RegionCard 생성 → CardSpecies(52) 연결.
 *
 * dry: npx tsx scripts/create-web1-039.ts
 * 적용: npx tsx scripts/create-web1-039.ts --apply
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import sharp from "sharp";
import { prisma } from "../src/lib/prisma";
import { r2KeyFor, uploadBuffer, r2PublicUrl, headExists } from "../src/lib/r2";
import { assertWritable, hasAllowProtectedFlag } from "./lib/protected-groups";

const APPLY = process.argv.includes("--apply");
const SET = "jp-tcg-web1", PACK = "og-web1", LANG = "ja", N = "039";
const LCID = "lc-orphan-jp-tcg-web1-039", RCID = "jp-tcg-web1-039";
const RARITY_RARE = "cmpp4wyhz0002yjurosb4gabx"; // web1 'R'

async function main() {
  assertWritable([PACK], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "create-web1-039" });
  // 사전: 중복/종 확인
  if (await prisma.regionCard.findFirst({ where: { setId: SET, number: N, region: "JP" } })) throw new Error("#039 이미 존재 — 중단");
  if (await prisma.card.findUnique({ where: { id: LCID } })) throw new Error("Card 이미 존재 — 중단");
  if (!(await prisma.species.findUnique({ where: { id: 52 } }))) throw new Error("Species 52 없음");

  const buf = readFileSync("tmp/web1/new_039.img");
  const meta = await sharp(buf).metadata();
  console.log(`이미지 ${meta.format} ${meta.width}x${meta.height}`);
  const largeKey = r2KeyFor(PACK, LANG, "large", SET, N, "webp");
  const smallKey = r2KeyFor(PACK, LANG, "small", SET, N, "webp");

  const cardData = {
    id: LCID,
    primarySetId: SET, primaryNumber: N, primaryNumberInt: 39,
    pokedexNumbers: [52],
    supertype: "Pokémon", subtypes: ["Basic"], types: ["Colorless"], hp: 40,
    retreatCost: 1, weakness: null, resistance: null,
    illustrator: "Kunihiko Yuyama",
    attacks: [{ cost: ["Colorless"], name: "だいぎゃくてん", damage: "10×", effect: "コインを規정 수만큼 던져, 「おもて」가 나온 수 ×10 데미지." }] as any,
    legalities: { expanded: false, standard: false } as any,
    rarityId: RARITY_RARE,
    nameKo: "로켓단의 나옹",
  };
  const rcData = {
    id: RCID, cardId: LCID, language: "ja", region: "JP",
    setId: SET, number: N, numberInt: 39, name: "ロケット団のニャース",
    imageSmall: r2PublicUrl(smallKey), imageLarge: r2PublicUrl(largeKey),
    rarityId: RARITY_RARE, legalities: { expanded: false, standard: false } as any,
  };

  console.log("=== 생성 예정 ===");
  console.log("Card:", JSON.stringify({ ...cardData, attacks: "[..]" }));
  console.log("RegionCard:", JSON.stringify(rcData));
  console.log("CardSpecies:", JSON.stringify({ cardId: LCID, speciesId: 52 }));
  if (!APPLY) { console.log("\n적용: --apply"); return; }

  await uploadBuffer(largeKey, await sharp(buf).webp({ quality: 90 }).toBuffer(), "image/webp");
  await uploadBuffer(smallKey, await sharp(buf).resize({ width: 245, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer(), "image/webp");
  if (!(await headExists(largeKey)) || !(await headExists(smallKey))) throw new Error("R2 verify 실패");
  console.log("R2 적재 완료");

  await prisma.card.create({ data: cardData as any });
  await prisma.regionCard.create({ data: rcData as any });
  await prisma.cardSpecies.create({ data: { cardId: LCID, speciesId: 52 } });
  console.log("Card·RegionCard·CardSpecies 생성 완료");

  // 검증
  const total = await prisma.regionCard.count({ where: { setId: SET, region: "JP" } });
  console.log(`web1 JP 카드 수: ${total} (48 기대)`);
}
main().catch((e) => { console.error("FAIL:", e); process.exit(1); }).finally(() => prisma.$disconnect());
