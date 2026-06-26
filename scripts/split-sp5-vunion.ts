/**
 * SP5 (スペシャルカードセット V-UNION, jp-tcg-SP5) V-UNION 4분할 재수집.
 *
 * 배경: ゲッコウガ/ミュウツー/ザシアン V-UNION 이 각각 "합본 1장"(#1/#5/#9)으로만 수집됨.
 *   올바른 모델(예: S8b モルペコ #56-59)은 4분할 각각 별도 카드. JP 를 13장으로 분할.
 *   KR(kr-sp5)은 기존 모델대로 V-UNION당 1장 유지(이미 #1/#5/#9 가 첫분할 LC 가리킴) → 미변경.
 *
 * 출처: Limitless JP SP5 #1-12 (분할 개별본, md5 상이 확인). 합본 공식/Limitless 는 1장뿐이라 미사용.
 *
 * 동작:
 *  - 분할1(#1/#5/#9): 기존 RC 이미지 합본→분할1(Limitless)로 교체, 기존 .jpg 삭제. LC 유지.
 *  - 분할2~4(#2,3,4 / #6,7,8 / #10,11,12): 신규 LC(부모 메타 복제) + RC 생성, Limitless 분할 이미지.
 *  - #13 バーネット博士: 미변경.
 *  - cardCount jp-tcg-SP5 4→13.
 *
 * dry: npx tsx scripts/split-sp5-vunion.ts
 * 적용: npx tsx scripts/split-sp5-vunion.ts --apply
 */
import "dotenv/config";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import sharp from "sharp";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { prisma } from "../src/lib/prisma";
import { r2KeyFor, uploadBuffer, r2PublicUrl, headExists, getR2Client } from "../src/lib/r2";
import { assertWritable, hasAllowProtectedFlag } from "./lib/protected-groups";

const exec = promisify(execFile);
const APPLY = process.argv.includes("--apply");
const SET = "jp-tcg-SP5", PACK = "swsh-goods";
const LIM = (n: number) => `https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/tpc/SP5/SP5_${n}_R_JP_LG.png`;
const pad3 = (n: number) => String(n).padStart(3, "0");

// V-UNION 그룹: 첫번호, 이름, 부모 LC 메타(복제용)
const GROUPS = [
  { first: 1, name: "ゲッコウガV-UNION", types: ["Water"], hp: 300, dex: [658] },
  { first: 5, name: "ミュウツーV-UNION", types: ["Psychic"], hp: 310, dex: [150] },
  { first: 9, name: "ザシアンV-UNION", types: ["Metal"], hp: 320, dex: [888] },
];

async function dl(url: string): Promise<Buffer> {
  const { stdout } = await exec("curl", ["-sSL", "--fail", "--max-time", "40", "-A", "Mozilla/5.0", url], { maxBuffer: 25 * 1024 * 1024, encoding: "buffer" } as any);
  const b = stdout as unknown as Buffer; if (b.length < 5000) throw new Error(`small ${b.length}`); return b;
}
function keyFromUrl(url: string | null): string | null { if (!url || !url.includes("r2.dev/")) return null; return url.split("r2.dev/")[1]; }
async function deleteKey(key: string) { try { await getR2Client().send(new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET!, Key: key })); return true; } catch { return false; } }

async function uploadQuarter(n: number): Promise<{ large: string; small: string }> {
  const buf = await dl(LIM(n));
  const meta = await sharp(buf).metadata();
  if (!meta.width || meta.width < 300) throw new Error(`#${n} 이미지 의심 w=${meta.width}`);
  const largeKey = r2KeyFor(PACK, "ja", "large", SET, pad3(n), "webp");
  const smallKey = r2KeyFor(PACK, "ja", "small", SET, pad3(n), "webp");
  const largeBuf = await sharp(buf).webp({ quality: 90 }).toBuffer();
  const smallBuf = await sharp(buf).resize({ width: 245, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
  await uploadBuffer(largeKey, largeBuf, "image/webp");
  await uploadBuffer(smallKey, smallBuf, "image/webp");
  if (!(await headExists(largeKey)) || !(await headExists(smallKey))) throw new Error(`#${n} R2 verify 실패`);
  return { large: r2PublicUrl(largeKey), small: r2PublicUrl(smallKey) };
}

async function main() {
  assertWritable([PACK], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "split-sp5-vunion" });
  console.log(`${APPLY ? "APPLY" : "DRY"} split-sp5-vunion | 3 V-UNION × 4분할 = 12 + 박사 1 = 13 (KR 미변경)`);
  let created = 0, updated = 0;
  for (const g of GROUPS) {
    for (let q = 0; q < 4; q++) {
      const n = g.first + q;
      const num = pad3(n), lcId = `lc-${SET}-${num}`, rcId = `${SET}-${num}`;
      const isFirst = q === 0;
      console.log(`  #${num} ${g.name} ${isFirst ? "[분할1=기존 이미지 교체]" : "[신규 분할]"} → ${LIM(n).split("/").pop()}`);
      if (!APPLY) continue;
      const img = await uploadQuarter(n);
      if (isFirst) {
        const rc = await prisma.regionCard.findUnique({ where: { id: rcId }, select: { imageLarge: true, imageSmall: true } });
        const oldKeys = [keyFromUrl(rc?.imageLarge ?? null), keyFromUrl(rc?.imageSmall ?? null)].filter((k): k is string => !!k && !k.endsWith(`${num}.webp`));
        await prisma.regionCard.update({ where: { id: rcId }, data: { imageLarge: img.large, imageSmall: img.small } });
        for (const k of oldKeys) await deleteKey(k);
        updated++;
      } else {
        await prisma.card.upsert({
          where: { id: lcId },
          create: { id: lcId, primarySetId: SET, primaryNumber: num, primaryNumberInt: n, supertype: "Pokémon", subtypes: [], types: g.types, pokedexNumbers: g.dex, hp: g.hp, rarityId: null },
          update: { supertype: "Pokémon", subtypes: [], types: g.types, pokedexNumbers: g.dex, hp: g.hp },
        });
        await prisma.regionCard.upsert({
          where: { id: rcId },
          create: { id: rcId, cardId: lcId, setId: SET, number: num, numberInt: n, name: g.name, region: "JP", language: "ja", imageLarge: img.large, imageSmall: img.small, rarityId: null },
          update: { cardId: lcId, name: g.name, imageLarge: img.large, imageSmall: img.small },
        });
        created++;
      }
    }
  }
  if (APPLY) {
    const cnt = await prisma.regionCard.count({ where: { setId: SET } });
    await prisma.set.update({ where: { id: SET }, data: { cardCount: cnt } });
    console.log(`\n생성 ${created} · 교체 ${updated} | jp-tcg-SP5 cardCount → ${cnt}`);
  }
}
main().catch((e) => { console.error("FAIL:", e); process.exit(1); }).finally(() => prisma.$disconnect());
