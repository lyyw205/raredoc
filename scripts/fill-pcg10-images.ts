/**
 * ワールドチャンピオンズパック (jp-tcg-PCG10, og-pcg10) 이미지 교정 8장 — 사용자 제공 tcgcollector JP.
 *
 * 배경: region=JP 세트인데 일부 카드 이미지가 (1) 깨진 플레이스홀더(.png, #32/47/74 포켓몬) 또는
 *   (2) 영어판 카드 이미지(.jpg, #83/85/87/88/89 트레이너)로 잘못 들어가 있음. 사용자가 올바른
 *   일본어판 이미지를 제공 → 교체/채움. 정체성·연결 불변(이미지 전용).
 *   ★검증완: 8장 [현재|신규] 나란히 시각대조 — #32 ラルトス/#47 カブトプス/#74 ビブラーバ(깨진placeholder→정상),
 *     #83 エネルギーつけかえ/#85 スーパーボール/#87 ひみつのかせき/#88 ねっこのかせき/#89 マスターボール
 *     (영어판→일본어판). 카드 정체성 전부 일치.
 *
 * ★R2 키 lang 세그먼트 = "jp" (이 팩 기존 규약; PT 계열의 "ja"와 다름).
 * 동작: 검증된 로컬 파일(tmp/pcg10/new_{n}.img) → webp large(q90)+245 small(q80)
 *   → R2 og-pcg10/jp/{size}/jp-tcg-PCG10/{N}.webp → RegionCard imageLarge/Small UPDATE.
 *   (구 .png/.jpg 객체는 고아로 남으나 무해 — DB는 새 .webp URL을 가리킴)
 *
 * dry: npx tsx scripts/fill-pcg10-images.ts
 * 적용: npx tsx scripts/fill-pcg10-images.ts --apply
 */
import "dotenv/config";
import { readFileSync, writeFileSync } from "node:fs";
import sharp from "sharp";
import { prisma } from "../src/lib/prisma";
import { r2KeyFor, uploadBuffer, r2PublicUrl, headExists } from "../src/lib/r2";
import { assertWritable, hasAllowProtectedFlag } from "./lib/protected-groups";

const APPLY = process.argv.includes("--apply");
const SET = "jp-tcg-PCG10", PACK = "og-pcg10", LANG = "jp";
const NUMS = ["32", "47", "74", "83", "85", "87", "88", "89"];

const fails: any[] = [];
async function one(n: string, stats: any) {
  try {
    const rc = await prisma.regionCard.findFirst({ where: { setId: SET, number: n, region: "JP" }, select: { id: true, name: true } });
    if (!rc) throw new Error("RegionCard 없음");
    const buf = readFileSync(`tmp/pcg10/new_${n}.img`);
    const meta = await sharp(buf).metadata();
    if (!meta.width || meta.width < 250) throw new Error(`이미지 의심 w=${meta.width}`);
    const largeKey = r2KeyFor(PACK, LANG, "large", SET, n, "webp");
    const smallKey = r2KeyFor(PACK, LANG, "small", SET, n, "webp");
    if (APPLY) {
      await uploadBuffer(largeKey, await sharp(buf).webp({ quality: 90 }).toBuffer(), "image/webp");
      await uploadBuffer(smallKey, await sharp(buf).resize({ width: 245, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer(), "image/webp");
      if (!(await headExists(largeKey)) || !(await headExists(smallKey))) throw new Error("R2 verify 실패");
      await prisma.regionCard.update({ where: { id: rc.id }, data: { imageLarge: r2PublicUrl(largeKey), imageSmall: r2PublicUrl(smallKey) } });
    }
    stats.ok++;
  } catch (e: any) { stats.fail++; fails.push({ number: n, error: String(e?.message ?? e) }); }
  finally { stats.done++; console.log(`  [${stats.done}/${stats.total}] #${n} ${fails.find((f) => f.number === n) ? "✗" : "✓"}`); }
}

async function main() {
  assertWritable([PACK], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "fill-pcg10-images" });
  console.log(`${APPLY ? "APPLY" : "DRY"} fill-pcg10-images | ${NUMS.length}장 (lang=${LANG}, 사용자 JP 이미지)`);
  let mism = 0;
  for (const n of NUMS) {
    const rc = await prisma.regionCard.findFirst({ where: { setId: SET, number: n, region: "JP" }, select: { name: true } });
    if (!rc) { console.error(`  ✗ #${n} RegionCard 없음`); mism++; }
    else console.log(`  #${n} ${rc.name} ✓존재`);
  }
  if (mism > 0) throw new Error("대상 카드 누락 — 중단");
  if (!APPLY) { console.log("적용: --apply"); return; }
  const stats = { total: NUMS.length, done: 0, ok: 0, fail: 0 };
  for (const n of NUMS) await one(n, stats);
  if (fails.length) writeFileSync("tmp/pcg10-fill-failed.json", JSON.stringify(fails, null, 2));
  console.log(`\n=== 결과 === ok=${stats.ok} fail=${stats.fail}`);
}
main().catch((e) => { console.error("FAIL:", e); process.exit(1); }).finally(() => prisma.$disconnect());
