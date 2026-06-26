/**
 * 덱 카드 이미지 적재 (범용) — 지정 디렉터리의 {NNN}.jpg 들을 R2 미러+webp썸네일+DB 갱신.
 * 시각검증 통과한 로컬 파일만 둔다는 전제. 기존 이미지(gif 포함) 있으면 교체.
 * 실행: npx tsx scripts/ingest-deck-images.ts --set=<setId> --pack=<cardPackId> --dir=<abs dir> [--apply]
 */
import "dotenv/config";
import { prisma } from "@/lib/prisma";
import { r2KeyFor, uploadBuffer, r2PublicUrl, headExists, contentTypeFor } from "@/lib/r2";
import { readdirSync, readFileSync } from "node:fs";
import sharp from "sharp";

const APPLY = process.argv.includes("--apply");
const arg = (k: string) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split("=")[1];
const SET = arg("set")!, PACK = arg("pack")!, DIR = arg("dir")!;
const THUMB_W = 245;

async function main() {
  if (!SET || !PACK || !DIR) { console.error("usage: --set= --pack= --dir= [--apply]"); process.exit(1); }
  const files = readdirSync(DIR).filter((f) => /^\d{3}\.(jpg|jpeg|png|webp)$/.test(f)).sort();
  console.log(`=== ${SET} 이미지 적재 ${APPLY ? "★APPLY" : "(dry-run)"} ${files.length}장 (dir=${DIR}) ===`);
  let ok = 0;
  for (const f of files) {
    const num = f.slice(0, 3);
    const ext = f.split(".").pop()!.toLowerCase();
    const rc = await prisma.regionCard.findFirst({ where: { setId: SET, number: num }, select: { id: true, name: true, imageLarge: true } });
    if (!rc) { console.log(`  ✗ #${num}: RegionCard 없음`); continue; }
    const buf = readFileSync(`${DIR}/${f}`);
    const largeKey = r2KeyFor(PACK, "ja", "large", SET, num, ext);
    const smallKey = r2KeyFor(PACK, "ja", "small", SET, num, "webp");
    const was = rc.imageLarge ? (rc.imageLarge.endsWith(".gif") ? " (gif교체)" : " (교체)") : "";
    console.log(`  #${num} ${rc.name.padEnd(14)} ${buf.length}B → ${largeKey}${was}`);
    if (APPLY) {
      await uploadBuffer(largeKey, buf, contentTypeFor(ext));
      const thumb = await sharp(buf).resize({ width: THUMB_W, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
      await uploadBuffer(smallKey, thumb, "image/webp");
      if (!(await headExists(largeKey)) || !(await headExists(smallKey))) { console.log(`     ✗ head 검증 실패`); continue; }
      await prisma.regionCard.update({ where: { id: rc.id }, data: { imageLarge: r2PublicUrl(largeKey), imageSmall: r2PublicUrl(smallKey) } });
      ok++;
    }
  }
  console.log(APPLY ? `\n✅ 적재 ${ok}/${files.length}` : `\n(dry-run — --apply 로 실행)`);
}
main().catch((e) => { console.error("FAIL:", e); process.exit(1); }).finally(() => prisma.$disconnect());
