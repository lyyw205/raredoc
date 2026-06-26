/**
 * さいはての攻防 (jp-tcg-PCG9, og-pcg9) 영어 이미지 17장 + NULL 1장(#068) → 일본판 일괄 교체/채움.
 *
 * 배경: PCG9 전수 감사에서 영어 이미지 17장(#004/006/008/011/016/030/031/032/042/046/050/052/055/
 *   059/061/062/067)과 이미지 없음 1장(#068 スクランブルエネルギー)을 발견. 사용자가 tcgcollector
 *   일본판 18장 제공 → tmp/pcg9/new/{NNN}.img. ★검증완: 18장 몽타주 시각검증 — 전부 해당 번호의
 *   올바른 일본판 카드(이름띠 일본어, カイリュー/リザードン/ニドキング/ホロンの遺産/スクランブルエネルギー 등).
 *
 * ★R2 키 lang = "ja" (이 팩 규약). 동작: 로컬 → webp large(q90)+245 small(q80)
 *   → R2 og-pcg9/ja/{size}/jp-tcg-PCG9/{NNN}.webp → RegionCard imageLarge/Small UPDATE. 이미지 전용.
 *
 * dry: npx tsx scripts/fill-pcg9-batch.ts
 * 적용: npx tsx scripts/fill-pcg9-batch.ts --apply
 */
import "dotenv/config";
import { readFileSync, existsSync } from "node:fs";
import sharp from "sharp";
import { prisma } from "../src/lib/prisma";
import { r2KeyFor, uploadBuffer, r2PublicUrl, headExists } from "../src/lib/r2";
import { assertWritable, hasAllowProtectedFlag } from "./lib/protected-groups";

const APPLY = process.argv.includes("--apply");
const SET = "jp-tcg-PCG9", PACK = "og-pcg9", LANG = "ja";

async function main() {
  assertWritable([PACK], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "fill-pcg9-batch" });
  const map: Record<string, string> = JSON.parse(readFileSync("tmp/pcg9/newmap.json", "utf8"));
  const nums = Object.keys(map).sort();
  console.log(`${APPLY ? "APPLY" : "DRY"} fill-pcg9-batch | ${nums.length}장 (lang=${LANG})`);
  // 사전: RegionCard 존재 + 로컬 이미지 존재
  for (const n of nums) {
    const rc = await prisma.regionCard.findFirst({ where: { setId: SET, number: n, region: "JP" }, select: { name: true } });
    if (!rc) throw new Error(`#${n} RegionCard 없음`);
    if (!existsSync(`tmp/pcg9/new/${n}.img`)) throw new Error(`#${n} 로컬 이미지 없음`);
  }
  console.log(`  사전확인: ${nums.length}장 전부 존재`);
  if (!APPLY) { console.log("적용: --apply"); return; }
  let ok = 0, fail = 0;
  for (const n of nums) {
    try {
      const rc = await prisma.regionCard.findFirst({ where: { setId: SET, number: n, region: "JP" }, select: { id: true, name: true } });
      const buf = readFileSync(`tmp/pcg9/new/${n}.img`);
      const meta = await sharp(buf).metadata();
      if (!meta.width || meta.width < 250) throw new Error(`이미지 의심 w=${meta.width}`);
      const largeKey = r2KeyFor(PACK, LANG, "large", SET, n, "webp");
      const smallKey = r2KeyFor(PACK, LANG, "small", SET, n, "webp");
      await uploadBuffer(largeKey, await sharp(buf).webp({ quality: 90 }).toBuffer(), "image/webp");
      await uploadBuffer(smallKey, await sharp(buf).resize({ width: 245, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer(), "image/webp");
      if (!(await headExists(largeKey)) || !(await headExists(smallKey))) throw new Error("R2 verify 실패");
      await prisma.regionCard.update({ where: { id: rc!.id }, data: { imageLarge: r2PublicUrl(largeKey), imageSmall: r2PublicUrl(smallKey) } });
      ok++; console.log(`  [${ok + fail}/${nums.length}] #${n} ${rc!.name} ✓`);
    } catch (e: any) { fail++; console.error(`  #${n} ✗ ${e?.message ?? e}`); }
  }
  console.log(`\n=== 결과 === ok=${ok} fail=${fail}`);
  const cov = await prisma.regionCard.count({ where: { setId: SET, region: "JP", imageLarge: { not: null } } });
  const tot = await prisma.regionCard.count({ where: { setId: SET, region: "JP" } });
  console.log(`jp-tcg-PCG9 이미지 보유: ${cov}/${tot}`);
}
main().catch((e) => { console.error("FAIL:", e); process.exit(1); }).finally(() => prisma.$disconnect());
