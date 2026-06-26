/**
 * サン&ムーン プロモカード (jp-smp, og-smp) 갭 #400·#401 수집(미수집→생성).
 *   #400 ピカチュウ (Pokémon, 雷, HP60) — 영화/이벤트 프로모
 *   #401 アローラの仲間たち (Trainer/Supporter, 풀아트)
 * 배경: jp-smp 는 #1-407(갭 400·401). SM-P 프로모는 Limitless·tcgdex 미수록 + pokemon-card.com pg 미노출
 *   → tcgcollector 가 실질 출처(사용자 제공 URL). 이미지로 #400 ピカチュウ·#401 アローラの仲間たち 확인.
 *
 * 동작: 제공 이미지 다운 → webp large/small → R2 og-smp/ja/{size}/jp-smp/{n}.webp → Card+RegionCard 생성.
 *   cardCount 갱신.
 *
 * dry: npx tsx scripts/collect-smp-400401.ts
 * 적용: npx tsx scripts/collect-smp-400401.ts --apply
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
const SET = "jp-smp", PACK = "og-smp";

const CARDS = [
  { number: "400", name: "ピカチュウ", supertype: "Pokémon", subtypes: [] as string[], types: ["Lightning"], dex: [25], hp: 60,
    img: "https://static.tcgcollector.com/content/images/a4/74/d1/a474d11da38dfc92cdb8f04f39f24c59713b9d1ed550ba0cb117c39bc70df1ce.jpg" },
  { number: "401", name: "アローラの仲間たち", supertype: "Trainer", subtypes: ["Supporter"], types: [] as string[], dex: [] as number[], hp: null as number | null,
    img: "https://static.tcgcollector.com/content/images/34/07/60/3407603c6021fcf380acdbf7ed766f9faf9e1ad0a27df95e874c1ff9958fbb9b.jpg" },
];

async function dl(url: string): Promise<Buffer> {
  const { stdout } = await exec("curl", ["-sSL", "--fail", "--max-time", "30", "-A", "Mozilla/5.0", url], { maxBuffer: 20 * 1024 * 1024, encoding: "buffer" } as any);
  const b = stdout as unknown as Buffer; if (b.length < 3000) throw new Error(`small ${b.length}`); return b;
}

async function main() {
  assertWritable([PACK], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "collect-smp-400401" });
  console.log(`${APPLY ? "APPLY" : "DRY"} collect-smp-400401 | ${CARDS.length}장 (갭 채움)`);
  for (const c of CARDS) {
    const lcId = `${SET}-${c.number}`, rcId = `${SET}-${c.number}`, numInt = parseInt(c.number, 10);
    const largeKey = r2KeyFor(PACK, "ja", "large", SET, c.number, "webp");
    const smallKey = r2KeyFor(PACK, "ja", "small", SET, c.number, "webp");
    console.log(`  #${c.number} ${c.name} (${c.supertype}/${c.subtypes.join(",")}) → ${largeKey}`);
    if (!APPLY) continue;
    const buf = await dl(c.img);
    const meta = await sharp(buf).metadata(); console.log(`    원본 ${meta.width}x${meta.height}`);
    await uploadBuffer(largeKey, await sharp(buf).webp({ quality: 90 }).toBuffer(), "image/webp");
    await uploadBuffer(smallKey, await sharp(buf).resize({ width: 245, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer(), "image/webp");
    if (!(await headExists(largeKey)) || !(await headExists(smallKey))) throw new Error(`#${c.number} R2 verify 실패`);
    await prisma.card.upsert({
      where: { id: lcId },
      create: { id: lcId, primarySetId: SET, primaryNumber: c.number, primaryNumberInt: numInt, supertype: c.supertype, subtypes: c.subtypes, types: c.types, pokedexNumbers: c.dex, hp: c.hp, rarityId: null },
      update: { supertype: c.supertype, subtypes: c.subtypes, types: c.types, pokedexNumbers: c.dex, hp: c.hp },
    });
    await prisma.regionCard.upsert({
      where: { id: rcId },
      create: { id: rcId, cardId: lcId, setId: SET, number: c.number, numberInt: numInt, name: c.name, region: "JP", language: "ja", imageLarge: r2PublicUrl(largeKey), imageSmall: r2PublicUrl(smallKey), rarityId: null },
      update: { name: c.name, imageLarge: r2PublicUrl(largeKey), imageSmall: r2PublicUrl(smallKey) },
    });
    console.log(`    ✓ ${rcId}`);
  }
  if (APPLY) {
    const cnt = await prisma.regionCard.count({ where: { setId: SET } });
    await prisma.set.update({ where: { id: SET }, data: { cardCount: cnt } });
    console.log(`\njp-smp cardCount → ${cnt}`);
  }
}
main().catch((e) => { console.error("FAIL:", e); process.exit(1); }).finally(() => prisma.$disconnect());
