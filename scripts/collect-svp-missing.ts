/**
 * jp-svp (プロモカード SV-P) 누락 3장 수집:
 *   #147 マツバの確信(Supporter) — 공식 pokemon-card.com (cid 45793)
 *   #154 ネモ(Supporter, シールド戦) — 공식 pokemon-card.com (cid 45644)
 *   #291 ピカチュウ(げきとうスパーク, 雷, dex25, hp70) — tcgcollector (사용자 제공 URL; 공식 미등재 신상)
 * Limitless(우리 수집소스)가 #147·154를 빠뜨렸고 #291은 최신이라 누락됐던 것. 실존 확인·이미지 시각검증 완료.
 *
 * 이미지: 원본 다운로드 → webp large(q90)+245 small(q80) → R2(og-kr-sv-promo/ja/{size}/jp-svp/{num}.webp).
 *
 * dry: npx tsx scripts/collect-svp-missing.ts
 * 적용: npx tsx scripts/collect-svp-missing.ts --apply
 */
import "dotenv/config";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import sharp from "sharp";
import { prisma } from "../src/lib/prisma";
import { r2KeyFor, uploadBuffer, r2PublicUrl } from "../src/lib/r2";
import { assertWritable, hasAllowProtectedFlag } from "./lib/protected-groups";

const exec = promisify(execFile);
const APPLY = process.argv.includes("--apply");
const SET = "jp-svp", PACK = "og-kr-sv-promo";
const PROMO_RARITY = "cmpp4wyvw001hyjurzznnvic7"; // Rarity code=Promo

const CARDS = [
  { number: "147", name: "マツバの確信", supertype: "Trainer", subtypes: ["Supporter"], types: [] as string[], dex: null as number | null, hp: null as number | null,
    img: "https://www.pokemon-card.com/assets/images/card_images/large/SV-P/045793_T_MATSUBANOKAKUSHIN.jpg" },
  { number: "154", name: "ネモ", supertype: "Trainer", subtypes: ["Supporter"], types: [], dex: null, hp: null,
    img: "https://www.pokemon-card.com/assets/images/card_images/large/SV-P/045644_T_NEMO.jpg" },
  { number: "291", name: "ピカチュウ", supertype: "Pokémon", subtypes: ["Basic"], types: ["Lightning"], dex: 25, hp: 70,
    img: "https://static.tcgcollector.com/content/images/7a/41/0c/7a410cfd45ec84277a6df56b949ed469e915beb4bb1fac05a5e1e715f3d53bae.webp" },
];

async function dl(url: string): Promise<Buffer> {
  const { stdout } = await exec("curl", ["-sSL", "--fail", "--max-time", "30", "-A", "Mozilla/5.0", url], { maxBuffer: 20 * 1024 * 1024, encoding: "buffer" } as any);
  const b = stdout as unknown as Buffer; if (b.length < 3000) throw new Error(`small ${b.length}`); return b;
}

async function main() {
  assertWritable([PACK], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "collect-svp-missing" });
  console.log(`${APPLY ? "APPLY" : "DRY"} collect-svp-missing | ${CARDS.length}장`);
  for (const c of CARDS) {
    const rcId = `${SET}-${c.number}`, lcId = `lc-${SET}-${c.number}`, numInt = parseInt(c.number, 10);
    const largeKey = r2KeyFor(PACK, "ja", "large", SET, c.number, "webp");
    const smallKey = r2KeyFor(PACK, "ja", "small", SET, c.number, "webp");
    console.log(`  #${c.number} ${c.name} (${c.supertype}/${c.subtypes.join(",")}) dex=${c.dex ?? "-"} → ${largeKey}`);
    if (!APPLY) continue;
    const buf = await dl(c.img);
    const largeBuf = await sharp(buf).webp({ quality: 90 }).toBuffer();
    const smallBuf = await sharp(buf).resize({ width: 245, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
    await uploadBuffer(largeKey, largeBuf, "image/webp");
    await uploadBuffer(smallKey, smallBuf, "image/webp");
    await prisma.card.upsert({
      where: { id: lcId },
      create: { id: lcId, primarySetId: SET, primaryNumber: c.number, primaryNumberInt: numInt, supertype: c.supertype, subtypes: c.subtypes, types: c.types, pokedexNumbers: c.dex ? [c.dex] : [], hp: c.hp, rarityId: PROMO_RARITY },
      update: { supertype: c.supertype, subtypes: c.subtypes, types: c.types, pokedexNumbers: c.dex ? [c.dex] : [], hp: c.hp, rarityId: PROMO_RARITY },
    });
    await prisma.regionCard.upsert({
      where: { id: rcId },
      create: { id: rcId, cardId: lcId, language: "ja", region: "JP", setId: SET, number: c.number, numberInt: numInt, name: c.name, imageLarge: r2PublicUrl(largeKey), imageSmall: r2PublicUrl(smallKey), rarityId: PROMO_RARITY },
      update: { name: c.name, imageLarge: r2PublicUrl(largeKey), imageSmall: r2PublicUrl(smallKey), rarityId: PROMO_RARITY },
    });
    console.log(`    upserted ${rcId}`);
  }
  if (APPLY) {
    const cnt = await prisma.regionCard.count({ where: { setId: SET } });
    await prisma.set.update({ where: { id: SET }, data: { cardCount: cnt } });
    console.log(`\njp-svp cardCount → ${cnt}`);
  }
}
main().catch((e) => { console.error("FAIL:", e); process.exit(1); }).finally(() => prisma.$disconnect());
