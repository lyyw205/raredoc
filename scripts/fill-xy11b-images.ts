/**
 * 爆熱の闘士 「타오르는 투사」 (jp-tcg-XY11b, og-xy11b) #010·#020·#042 이미지 채움 + #059 신규 생성.
 *
 * 배경: jp-tcg-XY11b 58장. 이미지 NULL 3장(전부 BREAK, 정체성 존재) + 미수집 시크릿 1장(#059).
 *   [이미지 전용 채움]
 *     #010 カエンジシBREAK (Pyroar, Fire, dex668, HP160)
 *     #020 ブロスターBREAK (Clawitzer, Water, dex693, HP130)
 *     #042 ゼルネアスBREAK (Xerneas, Fairy, dex716, HP150)  ※cardId=lc-jp-tcg-SMXY-097(재록 병합) — 이미지만 RC 단위 갱신
 *   [신규 생성] #059 ボルケニオンEX (Volcanion EX) UR 시크릿 풀아트(059/054 UR, Illus.Mitsuhiro Arita)
 *     = #055 ボルケニオンEX(SR)의 시크릿판. 정체성 #055 복사(Basic/EX, Fire·Water, dex721, HP180).
 *     레어도 Ultra Rare(=자매팩 XY11a #059 UR と 동일). 자체 orphan LC.
 *     ★이미지로 확정: HP180/Fire/이름 ボルケニオンEX/번호 059/054 UR 전부 확인.
 * 출처: 사용자 제공 tcgcollector 이미지(URL). ★지시 = 공식에 있어도 첨부 이미지 사용.
 *
 * 동작: 첨부 다운 → webp large(q90)+245 small(q80) → R2 og-xy11b/ja/{size}/jp-tcg-XY11b/{n}.webp
 *   #010·#020·#042 = RegionCard imageLarge/Small UPDATE(정체성 불변)
 *   #059 = Card(LC) + RegionCard 신규 생성 → cardCount 갱신
 *
 * dry: npx tsx scripts/fill-xy11b-images.ts
 * 적용: npx tsx scripts/fill-xy11b-images.ts --apply
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
const SET = "jp-tcg-XY11b", PACK = "og-xy11b";
const UR_RARITY = "cmpp4wyzt001wyjuriy5esk1h"; // Ultra Rare (XY11a #059 동일)

// 이미지 전용 채움(기존 RC 갱신)
const FILL = [
  { number: "010", name: "カエンジシBREAK", img: "https://static.tcgcollector.com/content/images/bd/29/bc/bd29bca0a4a3a992c584b3dffdacd6d76ccd7c543a95f86c6cc0cd88605995f1.jpg" },
  { number: "020", name: "ブロスターBREAK", img: "https://static.tcgcollector.com/content/images/38/df/33/38df33bccc2741e31a0b6914fcf0786fe3135e49decfa102d650f16cb127b6e0.jpg" },
  { number: "042", name: "ゼルネアスBREAK", img: "https://static.tcgcollector.com/content/images/2a/e0/5b/2ae05bd1d1b5497f99a26cda6cffe7f37d7abbba61c19805cb5b7b86c2e42537.jpg" },
];
// 신규 생성(미수집 시크릿)
const CREATE = {
  number: "059", numInt: 59, name: "ボルケニオンEX",
  lcId: "lc-orphan-jp-tcg-XY11b-059", rcId: "jp-tcg-XY11b-059",
  supertype: "Pokémon", subtypes: ["Basic", "EX"], types: ["Fire", "Water"], dex: [721], hp: 180,
  img: "https://static.tcgcollector.com/content/images/e3/76/1a/e3761aaa973b377b3ba898b48310ecd8a63012d100b7556ad245f3bb7e6673d0.jpg",
};

async function dl(url: string): Promise<Buffer> {
  const { stdout } = await exec("curl", ["-sSL", "--fail", "--max-time", "30", "-A", "Mozilla/5.0", url], { maxBuffer: 20 * 1024 * 1024, encoding: "buffer" } as any);
  const b = stdout as unknown as Buffer; if (b.length < 4000) throw new Error(`small ${b.length}`); return b;
}
async function up(buf: Buffer, number: string) {
  const largeKey = r2KeyFor(PACK, "ja", "large", SET, number, "webp");
  const smallKey = r2KeyFor(PACK, "ja", "small", SET, number, "webp");
  await uploadBuffer(largeKey, await sharp(buf).webp({ quality: 90 }).toBuffer(), "image/webp");
  await uploadBuffer(smallKey, await sharp(buf).resize({ width: 245, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer(), "image/webp");
  if (!(await headExists(largeKey)) || !(await headExists(smallKey))) throw new Error(`#${number} R2 verify 실패`);
  return { large: r2PublicUrl(largeKey), small: r2PublicUrl(smallKey) };
}

async function main() {
  assertWritable([PACK], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "fill-xy11b-images" });
  console.log(`${APPLY ? "APPLY" : "DRY"} fill-xy11b-images | 채움 ${FILL.length} + 생성 1(#059)`);

  // pre-validate FILL names + CREATE non-collision
  for (const c of FILL) {
    const rc = await prisma.regionCard.findFirst({ where: { setId: SET, number: c.number, region: "JP" }, select: { id: true, name: true, imageLarge: true } });
    if (!rc) throw new Error(`#${c.number} RegionCard 없음`);
    if (rc.name !== c.name) throw new Error(`#${c.number} 이름 불일치: DB="${rc.name}" vs "${c.name}"`);
    console.log(`  [채움] #${c.number} ${c.name} (현재 img=${rc.imageLarge ? "있음" : "NULL"})`);
  }
  const dup = await prisma.regionCard.findUnique({ where: { id: CREATE.rcId }, select: { id: true } });
  if (dup) throw new Error(`#059 RC 이미 존재(${CREATE.rcId}) — 생성 중단`);
  console.log(`  [생성] #${CREATE.number} ${CREATE.name} (${CREATE.subtypes.join(",")}, UR) → LC ${CREATE.lcId}`);

  if (!APPLY) { console.log("\n적용: --apply"); return; }

  // FILL
  for (const c of FILL) {
    const rc = await prisma.regionCard.findFirst({ where: { setId: SET, number: c.number, region: "JP" }, select: { id: true } });
    const buf = await dl(c.img);
    if ((await sharp(buf).metadata()).width! < 300) throw new Error(`#${c.number} 이미지 의심`);
    const u = await up(buf, c.number);
    await prisma.regionCard.update({ where: { id: rc!.id }, data: { imageLarge: u.large, imageSmall: u.small } });
    console.log(`    ✓ 채움 #${c.number}`);
  }
  // CREATE #059
  {
    const buf = await dl(CREATE.img);
    if ((await sharp(buf).metadata()).width! < 300) throw new Error(`#059 이미지 의심`);
    const u = await up(buf, CREATE.number);
    await prisma.card.upsert({
      where: { id: CREATE.lcId },
      create: { id: CREATE.lcId, primarySetId: SET, primaryNumber: CREATE.number, primaryNumberInt: CREATE.numInt,
        supertype: CREATE.supertype, subtypes: CREATE.subtypes, types: CREATE.types, pokedexNumbers: CREATE.dex, hp: CREATE.hp, rarityId: UR_RARITY },
      update: { supertype: CREATE.supertype, subtypes: CREATE.subtypes, types: CREATE.types, pokedexNumbers: CREATE.dex, hp: CREATE.hp, rarityId: UR_RARITY },
    });
    await prisma.regionCard.upsert({
      where: { id: CREATE.rcId },
      create: { id: CREATE.rcId, cardId: CREATE.lcId, setId: SET, number: CREATE.number, numberInt: CREATE.numInt, name: CREATE.name,
        region: "JP", language: "ja", imageLarge: u.large, imageSmall: u.small, rarityId: UR_RARITY },
      update: { name: CREATE.name, imageLarge: u.large, imageSmall: u.small, rarityId: UR_RARITY },
    });
    console.log(`    ✓ 생성 #059 ${CREATE.rcId}`);
  }

  const cnt = await prisma.regionCard.count({ where: { setId: SET } });
  await prisma.set.update({ where: { id: SET }, data: { cardCount: cnt } });
  const cov = await prisma.regionCard.count({ where: { setId: SET, imageLarge: { not: null } } });
  console.log(`\njp-tcg-XY11b: 총 ${cnt}장, 이미지 보유 ${cov}/${cnt}`);
}
main().catch((e) => { console.error("FAIL:", e); process.exit(1); }).finally(() => prisma.$disconnect());
