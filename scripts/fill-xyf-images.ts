/**
 * BREAKコンボデッキ60「ゴルダックBREAK+パルキアEX」(jp-tcg-XYF, xy-decks) #003 이미지 누락 채우기.
 *
 * 배경: jp-tcg-XYF 17장 중 #003 ゴルダックBREAK(Golduck, Water, dex55, HP140)만 imageLarge/Small=NULL.
 *   정체성은 이미 DB에 올바르게 존재 → 순수 이미지 채움.
 * 출처: 사용자 제공 tcgcollector 이미지(URL). ★지시 = 공식에 있어도 첨부 이미지 사용.
 *   시각검증 완료: 골드 BREAK·Water·HP140·이름 ゴルダックBREAK 일치.
 *
 * 동작: 첨부 다운 → webp large(q90)+245 small(q80) → R2 xy-decks/ja/{size}/jp-tcg-XYF/003.webp
 *   → 기존 RegionCard imageLarge/Small UPDATE. ★이미지 전용, 정체성·연결 불변.
 *
 * dry: npx tsx scripts/fill-xyf-images.ts
 * 적용: npx tsx scripts/fill-xyf-images.ts --apply
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
const SET = "jp-tcg-XYF", PACK = "xy-decks";

const CARDS = [
  { number: "003", name: "ゴルダックBREAK", img: "https://static.tcgcollector.com/content/images/95/13/5e/95135ecb0b1119ba011ad0bf4c16594d5d480647d1580bc53596a1ffc5e6f777.jpg" },
];

async function dl(url: string): Promise<Buffer> {
  const { stdout } = await exec("curl", ["-sSL", "--fail", "--max-time", "30", "-A", "Mozilla/5.0", url], { maxBuffer: 20 * 1024 * 1024, encoding: "buffer" } as any);
  const b = stdout as unknown as Buffer; if (b.length < 4000) throw new Error(`small ${b.length}`); return b;
}

async function main() {
  assertWritable([PACK], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "fill-xyf-images" });
  console.log(`${APPLY ? "APPLY" : "DRY"} fill-xyf-images | ${CARDS.length}장 (BREAK 이미지 필)`);
  for (const c of CARDS) {
    const rc = await prisma.regionCard.findFirst({ where: { setId: SET, number: c.number, region: "JP" }, select: { id: true, name: true, imageLarge: true } });
    if (!rc) throw new Error(`#${c.number} RegionCard 없음`);
    if (rc.name !== c.name) throw new Error(`#${c.number} 이름 불일치: DB="${rc.name}" vs "${c.name}"`);
    const largeKey = r2KeyFor(PACK, "ja", "large", SET, c.number, "webp");
    const smallKey = r2KeyFor(PACK, "ja", "small", SET, c.number, "webp");
    console.log(`  #${c.number} ${c.name} (현재 img=${rc.imageLarge ? "있음" : "NULL"}) → ${largeKey}`);
    if (!APPLY) continue;
    const buf = await dl(c.img);
    const meta = await sharp(buf).metadata();
    if (!meta.width || meta.width < 300) throw new Error(`#${c.number} 이미지 의심 w=${meta.width}`);
    await uploadBuffer(largeKey, await sharp(buf).webp({ quality: 90 }).toBuffer(), "image/webp");
    await uploadBuffer(smallKey, await sharp(buf).resize({ width: 245, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer(), "image/webp");
    if (!(await headExists(largeKey)) || !(await headExists(smallKey))) throw new Error(`#${c.number} R2 verify 실패`);
    await prisma.regionCard.update({ where: { id: rc.id }, data: { imageLarge: r2PublicUrl(largeKey), imageSmall: r2PublicUrl(smallKey) } });
    console.log(`    ✓ ${rc.id} 업데이트`);
  }
  if (APPLY) {
    const cov = await prisma.regionCard.count({ where: { setId: SET, imageLarge: { not: null } } });
    const total = await prisma.regionCard.count({ where: { setId: SET } });
    console.log(`\njp-tcg-XYF 이미지 보유: ${cov}/${total}`);
  }
}
main().catch((e) => { console.error("FAIL:", e); process.exit(1); }).finally(() => prisma.$disconnect());
