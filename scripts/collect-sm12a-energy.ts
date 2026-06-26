/**
 * TAG TEAM GX タッグオールスターズ (jp-tcg-SM12a, og-sm12a) #227-235 기본에너지 9종 수집(미수집→생성).
 *
 * 배경: JP SM12a 가 #226 까지만 있고 기본에너지 #227-235(草炎水雷超闘悪鋼妖, TAG ALL STARS 홀로)가
 *   RegionCard 자체 미수집. tcgdex 미수록, KR(kr-sm12a 210)도 미보유 → JP 단독 신규 생성.
 * 출처: pokemon-card.com 공식 (pg=666=SM12a). cardID 37470~37478, 타입순서 草炎水雷超闘悪鋼妖 = #227-235 1:1.
 *   9장 몽타주 시각검증(워터마크 없음). ※草 파일명은 KIHONKUSANERUGI (E 생략).
 *
 * 동작(카드별): 공식 .jpg 다운 → webp large(q90)+245 small(q80) → R2 og-sm12a/ja/{size}/jp-tcg-SM12a/{n}.webp
 *   → Card(LC lc-orphan-jp-tcg-SM12a-{n}) + RegionCard(jp-tcg-SM12a-{n}) upsert. cardCount 226→235.
 *
 * dry: npx tsx scripts/collect-sm12a-energy.ts
 * 적용: npx tsx scripts/collect-sm12a-energy.ts --apply
 */
import "dotenv/config";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import sharp from "sharp";
import { prisma } from "../src/lib/prisma";
import { r2KeyFor, uploadBuffer, r2PublicUrl, headExists } from "../src/lib/r2";
import { assertWritable, hasAllowProtectedFlag } from "./lib/protected-groups";

const exec = promisify(execFile);
const APPLY = process.argv.includes("--apply");
const SET = "jp-tcg-SM12a", PACK = "og-sm12a";
const BASE = "https://www.pokemon-card.com/assets/images/card_images/large/SM12a/";

const CARDS = [
  { number: "227", name: "基本草エネルギー", file: "037470_E_KIHONKUSANERUGI.jpg" },
  { number: "228", name: "基本炎エネルギー", file: "037471_E_KIHONHONOOENERUGI.jpg" },
  { number: "229", name: "基本水エネルギー", file: "037472_E_KIHONMIZUENERUGI.jpg" },
  { number: "230", name: "基本雷エネルギー", file: "037473_E_KIHONKAMINARIENERUGI.jpg" },
  { number: "231", name: "基本超エネルギー", file: "037474_E_KIHONCHOUENERUGI.jpg" },
  { number: "232", name: "基本闘エネルギー", file: "037475_E_KIHONTOUENERUGI.jpg" },
  { number: "233", name: "基本悪エネルギー", file: "037476_E_KIHONAKUENERUGI.jpg" },
  { number: "234", name: "基本鋼エネルギー", file: "037477_E_KIHONKOUENERUGI.jpg" },
  { number: "235", name: "基本フェアリーエネルギー", file: "037478_E_KIHONFEARIENERUGI.jpg" },
];

async function dl(url: string): Promise<Buffer> {
  const { stdout } = await exec("curl", ["-sSL", "--fail", "--max-time", "30", "-A", "Mozilla/5.0", url], { maxBuffer: 20 * 1024 * 1024, encoding: "buffer" } as any);
  const b = stdout as unknown as Buffer; if (b.length < 5000) throw new Error(`small ${b.length}`); return b;
}

async function main() {
  assertWritable([PACK], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "collect-sm12a-energy" });
  console.log(`${APPLY ? "APPLY" : "DRY"} collect-sm12a-energy | ${CARDS.length}장 신규 생성 (JP 단독)`);
  let ok = 0;
  for (const c of CARDS) {
    const lcId = `lc-orphan-${SET}-${c.number}`, rcId = `${SET}-${c.number}`, numInt = parseInt(c.number, 10);
    const largeKey = r2KeyFor(PACK, "ja", "large", SET, c.number, "webp");
    const smallKey = r2KeyFor(PACK, "ja", "small", SET, c.number, "webp");
    console.log(`  #${c.number} ${c.name} → LC ${lcId} | ${largeKey}`);
    if (!APPLY) continue;
    const buf = await dl(BASE + c.file);
    await uploadBuffer(largeKey, await sharp(buf).webp({ quality: 90 }).toBuffer(), "image/webp");
    await uploadBuffer(smallKey, await sharp(buf).resize({ width: 245, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer(), "image/webp");
    if (!(await headExists(largeKey)) || !(await headExists(smallKey))) throw new Error(`#${c.number} R2 verify 실패`);
    await prisma.card.upsert({
      where: { id: lcId },
      create: { id: lcId, primarySetId: SET, primaryNumber: c.number, primaryNumberInt: numInt, supertype: "Energy", subtypes: ["Basic"], types: [], pokedexNumbers: [], rarityId: null },
      update: { supertype: "Energy", subtypes: ["Basic"], types: [] },
    });
    await prisma.regionCard.upsert({
      where: { id: rcId },
      create: { id: rcId, cardId: lcId, setId: SET, number: c.number, numberInt: numInt, name: c.name, region: "JP", language: "ja", imageLarge: r2PublicUrl(largeKey), imageSmall: r2PublicUrl(smallKey), rarityId: null },
      update: { name: c.name, imageLarge: r2PublicUrl(largeKey), imageSmall: r2PublicUrl(smallKey) },
    });
    console.log(`    ✓ ${rcId}`);
    ok++;
  }
  if (APPLY) {
    const cnt = await prisma.regionCard.count({ where: { setId: SET } });
    await prisma.set.update({ where: { id: SET }, data: { cardCount: cnt } });
    console.log(`\n생성 ${ok}/${CARDS.length} | jp-tcg-SM12a cardCount → ${cnt}`);
  }
}
main().catch((e) => { console.error("FAIL:", e); process.exit(1); }).finally(() => prisma.$disconnect());
