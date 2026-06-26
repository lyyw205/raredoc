/**
 * DPt4-Sgf(アルセウスLV.X 草＆炎) 덱 카드 이미지 적재 — 시각검증 통과한 9장(로컬 파일)을 R2 미러+썸네일+DB 갱신.
 * gif 3장(#5/#8/#11) 교체 + 트레이너 6장(#12~17) 신규.
 * 실행: npx tsx scripts/ingest-dpt4sgf-images.ts [--apply]
 */
import "dotenv/config";
import { prisma } from "@/lib/prisma";
import { r2KeyFor, uploadBuffer, r2PublicUrl, headExists, contentTypeFor } from "@/lib/r2";
import { readFileSync } from "node:fs";
import sharp from "sharp";

const APPLY = process.argv.includes("--apply");
const DIR = "/tmp/claude-1000/-home-lyyw205-repos-raredoc/351871d5-fe23-4a04-b450-81a162627087/scratchpad/dpt4sgf";
const SET = "jp-tcg-DPt4-Sgf";
const PACK = "og-jp-dpt4sgf";
const NUMS = ["005", "008", "011", "012", "013", "014", "015", "016", "017"];
const THUMB_W = 245;

async function main() {
  console.log(`=== DPt4-Sgf 이미지 적재 ${APPLY ? "★APPLY" : "(dry-run)"} ${NUMS.length}장 ===`);
  let ok = 0;
  for (const num of NUMS) {
    const rc = await prisma.regionCard.findFirst({ where: { setId: SET, number: num }, select: { id: true, name: true, imageLarge: true } });
    if (!rc) { console.log(`  ✗ #${num}: RegionCard 없음`); continue; }
    const buf = readFileSync(`${DIR}/${num}.jpg`);
    const largeKey = r2KeyFor(PACK, "ja", "large", SET, num, "jpg");
    const smallKey = r2KeyFor(PACK, "ja", "small", SET, num, "webp");
    const wasGif = (rc.imageLarge ?? "").endsWith(".gif");
    console.log(`  #${num} ${rc.name.padEnd(14)} ${buf.length}B → ${largeKey}${wasGif ? "  (gif 교체)" : ""}`);
    if (APPLY) {
      await uploadBuffer(largeKey, buf, contentTypeFor("jpg"));
      const thumb = await sharp(buf).resize({ width: THUMB_W, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
      await uploadBuffer(smallKey, thumb, "image/webp");
      if (!(await headExists(largeKey)) || !(await headExists(smallKey))) { console.log(`     ✗ head 검증 실패`); continue; }
      await prisma.regionCard.update({ where: { id: rc.id }, data: { imageLarge: r2PublicUrl(largeKey), imageSmall: r2PublicUrl(smallKey) } });
      ok++;
    }
  }
  console.log(APPLY ? `\n✅ 적재 ${ok}/${NUMS.length}` : `\n(dry-run — --apply 로 실행)`);
}
main().catch((e) => { console.error("FAIL:", e); process.exit(1); }).finally(() => prisma.$disconnect());
