/**
 * さいはての攻防 (jp-tcg-PCG9, og-pcg9) 일부 카드 이미지 영어→일본어 교체.
 *
 * 배경: PCG9는 이름은 일본어 정상(0% 영어)인데 일부 카드(#064 古い棒/#066 強さの魅力 트레이너)
 *   이미지가 영어판으로 들어가 있었음. 사용자가 tcgcollector 일본판 이미지 제공 → 교체.
 *   ★검증완: [현재 영어 | 신규 일본어] 나란히 대조 — 같은 카드(Old Rod=古い棒, Strength Charm=強さの魅力).
 *
 * ★R2 키 lang 세그먼트 = "ja" (이 팩 기존 규약; PCG10의 "jp"와 다름).
 * 동작: 검증된 로컬 파일 → webp large(q90)+245 small(q80) → R2 og-pcg9/ja/{size}/jp-tcg-PCG9/{NNN}.webp
 *   → RegionCard imageLarge/Small UPDATE. 이미지 전용, 정체성·연결 불변.
 *
 * dry: npx tsx scripts/fix-pcg9-images.ts
 * 적용: npx tsx scripts/fix-pcg9-images.ts --apply
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import sharp from "sharp";
import { prisma } from "../src/lib/prisma";
import { r2KeyFor, uploadBuffer, r2PublicUrl, headExists } from "../src/lib/r2";
import { assertWritable, hasAllowProtectedFlag } from "./lib/protected-groups";

const APPLY = process.argv.includes("--apply");
const SET = "jp-tcg-PCG9", PACK = "og-pcg9", LANG = "ja";
const NUMS = ["064", "066"];

async function main() {
  assertWritable([PACK], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "fix-pcg9-images" });
  console.log(`${APPLY ? "APPLY" : "DRY"} fix-pcg9-images | ${NUMS.length}장 (lang=${LANG})`);
  for (const n of NUMS) {
    const rc = await prisma.regionCard.findFirst({ where: { setId: SET, number: n, region: "JP" }, select: { id: true, name: true } });
    if (!rc) throw new Error(`#${n} RegionCard 없음`);
    const buf = readFileSync(`tmp/pcg9/new_${n}.img`);
    const meta = await sharp(buf).metadata();
    if (!meta.width || meta.width < 250) throw new Error(`#${n} 이미지 의심 w=${meta.width}`);
    console.log(`  #${n} ${rc.name} ✓`);
    if (APPLY) {
      const largeKey = r2KeyFor(PACK, LANG, "large", SET, n, "webp");
      const smallKey = r2KeyFor(PACK, LANG, "small", SET, n, "webp");
      await uploadBuffer(largeKey, await sharp(buf).webp({ quality: 90 }).toBuffer(), "image/webp");
      await uploadBuffer(smallKey, await sharp(buf).resize({ width: 245, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer(), "image/webp");
      if (!(await headExists(largeKey)) || !(await headExists(smallKey))) throw new Error("R2 verify 실패");
      await prisma.regionCard.update({ where: { id: rc.id }, data: { imageLarge: r2PublicUrl(largeKey), imageSmall: r2PublicUrl(smallKey) } });
      console.log(`  #${n} ✓ 적용`);
    }
  }
  if (!APPLY) console.log("적용: --apply");
  else console.log("완료");
}
main().catch((e) => { console.error("FAIL:", e); process.exit(1); }).finally(() => prisma.$disconnect());
