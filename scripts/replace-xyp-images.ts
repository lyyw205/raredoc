/**
 * XY-P 프로모 (jp-tcg-XYP, og-kr-xy-promo) #181·#267 이미지 교체.
 *   #181 レントラーBREAK (Luxray, Lightning, dex405, HP170) — 기존 large=.gif
 *   #267 ウインディBREAK (Arcanine, Fire, dex59, HP160) — 기존 large=.png
 * 사용자 제공 tcgcollector 이미지로 교체(기존 .gif/.png → 풀카드 webp). 정체성 불변, 이미지만 교체.
 *   ★검증완: 신규 이미지가 같은 카드(레ントラー/ウインディ BREAK, HP·타입·일본어명 일치) — 현재 vs 신규 비교 몽타주 + 확대 시각검증.
 *
 * 동작: 신규 다운 → webp large(q90)+245 small(q80) → R2 og-kr-xy-promo/ja/{size}/jp-tcg-XYP/{n}.webp
 *   → RegionCard imageLarge/Small UPDATE → 기존 구 large(.gif/.png) R2 객체 삭제(고아 정리).
 *
 * dry: npx tsx scripts/replace-xyp-images.ts
 * 적용: npx tsx scripts/replace-xyp-images.ts --apply
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
const SET = "jp-tcg-XYP", PACK = "og-kr-xy-promo";

const CARDS = [
  { number: "181", name: "レントラーBREAK", oldLargeExt: "gif", img: "https://static.tcgcollector.com/content/images/47/7b/71/477b71e5212af571a9c84a3be0ac6398c4dcc50314aab725aab3c3583afa7685.jpg" },
  { number: "267", name: "ウインディBREAK", oldLargeExt: "png", img: "https://static.tcgcollector.com/content/images/4b/ee/60/4bee60efd2919f41bd1daa3fdb5e2c329e5d04c393c7b7199f1f4d66f0da3030.jpg" },
];

async function dl(url: string): Promise<Buffer> {
  const { stdout } = await exec("curl", ["-sSL", "--fail", "--max-time", "30", "-A", "Mozilla/5.0", url], { maxBuffer: 20 * 1024 * 1024, encoding: "buffer" } as any);
  const b = stdout as unknown as Buffer; if (b.length < 4000) throw new Error(`small ${b.length}`); return b;
}

async function main() {
  assertWritable([PACK], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "replace-xyp-images" });
  console.log(`${APPLY ? "APPLY" : "DRY"} replace-xyp-images | ${CARDS.length}장 교체`);
  for (const c of CARDS) {
    const rc = await prisma.regionCard.findFirst({ where: { setId: SET, number: c.number, region: "JP" }, select: { id: true, name: true, imageLarge: true } });
    if (!rc) throw new Error(`#${c.number} RegionCard 없음`);
    if (rc.name !== c.name) throw new Error(`#${c.number} 이름 불일치 DB="${rc.name}" vs "${c.name}"`);
    const newLargeKey = r2KeyFor(PACK, "ja", "large", SET, c.number, "webp");
    const smallKey = r2KeyFor(PACK, "ja", "small", SET, c.number, "webp");
    const oldLargeKey = r2KeyFor(PACK, "ja", "large", SET, c.number, c.oldLargeExt);
    console.log(`  #${c.number} ${c.name} | 구 large=${c.oldLargeExt} → 신 ${newLargeKey}`);
    if (!APPLY) continue;
    const buf = await dl(c.img);
    const meta = await sharp(buf).metadata();
    if (!meta.width || meta.width < 300) throw new Error(`#${c.number} 이미지 의심 w=${meta.width}`);
    await uploadBuffer(newLargeKey, await sharp(buf).webp({ quality: 90 }).toBuffer(), "image/webp");
    await uploadBuffer(smallKey, await sharp(buf).resize({ width: 245, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer(), "image/webp");
    if (!(await headExists(newLargeKey)) || !(await headExists(smallKey))) throw new Error(`#${c.number} R2 verify 실패`);
    await prisma.regionCard.update({ where: { id: rc.id }, data: { imageLarge: r2PublicUrl(newLargeKey), imageSmall: r2PublicUrl(smallKey) } });
    console.log(`    ✓ DB 갱신 → ${r2PublicUrl(newLargeKey)}`);
    // 구 large(.gif/.png) 고아 삭제
    try {
      await getR2Client().send(new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET!, Key: oldLargeKey }));
      console.log(`    ✓ 구 객체 삭제 ${oldLargeKey}`);
    } catch (e: any) { console.warn(`    ⚠ 구 객체 삭제 실패(무시 가능) ${oldLargeKey}: ${e?.message ?? e}`); }
  }
  if (APPLY) console.log("\n완료");
}
main().catch((e) => { console.error("FAIL:", e); process.exit(1); }).finally(() => prisma.$disconnect());
