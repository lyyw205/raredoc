/**
 * 時の果ての絆 (jp-tcg-PT2, og-pl2) 이미지 누락 26장 채움 — 사용자 제공 tcgcollector 클린 .jpg/.webp.
 *
 * 배경: jp-tcg-PT2 90장 중 26장 imageLarge/Small=NULL(홀로). 공식(pokemon-card.com)은 홀로를
 *   6프레임 애니 .gif 로만 서빙(정지 추출시 포일 반짝 노이즈) → PT4/PT3 와 동일하게 사용자가
 *   tcgcollector 클린 이미지를 제공. 정체성·연결 이미 존재 → 순수 이미지 채움.
 *   ★검증완: 사용자 26장 ↔ 공식 누락 26장 fingerprint 자동매칭(corr 0.897~0.978, margin 전부>0.05,
 *     완전 전단사) + 26쌍 나란히 몽타주 시각검증. 동명쌍(フローゼルGL #019/#020·レントラーGL
 *     #029/#030·フライゴン #072/#073·ロトム 5형제·ピカチュウ 3종) 정확 분리.
 *
 * 동작: 검증된 로컬 파일(tmp/pt2replace/uNN.img) → sharp webp large(q90)+245 small(q80)
 *   → R2 og-pl2/ja/{size}/jp-tcg-PT2/{NNN}.webp → 기존 RegionCard imageLarge/Small UPDATE.
 *   ★이미지 전용, 정체성·연결 불변. 재다운로드 없이 시각검증한 바이트 그대로 적재.
 *
 * dry: npx tsx scripts/fill-pt2-images.ts
 * 적용: npx tsx scripts/fill-pt2-images.ts --apply
 */
import "dotenv/config";
import { readFileSync, writeFileSync } from "node:fs";
import sharp from "sharp";
import { prisma } from "../src/lib/prisma";
import { r2KeyFor, uploadBuffer, r2PublicUrl, headExists } from "../src/lib/r2";
import { assertWritable, hasAllowProtectedFlag } from "./lib/protected-groups";

const APPLY = process.argv.includes("--apply");
const SET = "jp-tcg-PT2", PACK = "og-pl2";
const MATCH = "tmp/pt2-automatch.json";
type M = { number: string; name: string; userFile: string; corr: number };

const fails: any[] = [];
async function one(it: M, stats: any) {
  try {
    const rc = await prisma.regionCard.findFirst({ where: { setId: SET, number: it.number, region: "JP" }, select: { id: true, name: true } });
    if (!rc) throw new Error("RegionCard 없음");
    if (rc.name !== it.name) throw new Error(`이름 불일치 DB="${rc.name}" man="${it.name}"`);
    const buf = readFileSync(it.userFile);
    const meta = await sharp(buf).metadata();
    if (!meta.width || meta.width < 250) throw new Error(`이미지 의심 w=${meta.width}`);
    const largeKey = r2KeyFor(PACK, "ja", "large", SET, it.number, "webp");
    const smallKey = r2KeyFor(PACK, "ja", "small", SET, it.number, "webp");
    if (APPLY) {
      await uploadBuffer(largeKey, await sharp(buf).webp({ quality: 90 }).toBuffer(), "image/webp");
      await uploadBuffer(smallKey, await sharp(buf).resize({ width: 245, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer(), "image/webp");
      if (!(await headExists(largeKey)) || !(await headExists(smallKey))) throw new Error("R2 verify 실패");
      await prisma.regionCard.update({ where: { id: rc.id }, data: { imageLarge: r2PublicUrl(largeKey), imageSmall: r2PublicUrl(smallKey) } });
    }
    stats.ok++;
  } catch (e: any) { stats.fail++; fails.push({ number: it.number, error: String(e?.message ?? e) }); }
  finally { stats.done++; console.log(`  [${stats.done}/${stats.total}] #${it.number} ${fails.find((f) => f.number === it.number) ? "✗" : "✓"}`); }
}

async function main() {
  assertWritable([PACK], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "fill-pt2-images" });
  const map: M[] = JSON.parse(readFileSync(MATCH, "utf8"));
  map.sort((a, b) => a.number.localeCompare(b.number));
  console.log(`${APPLY ? "APPLY" : "DRY"} fill-pt2-images | ${map.length}장 (사용자 클린, 로컬 검증바이트)`);
  let mism = 0;
  for (const it of map) {
    const rc = await prisma.regionCard.findFirst({ where: { setId: SET, number: it.number, region: "JP" }, select: { name: true, imageLarge: true } });
    if (!rc) { console.error(`  ✗ #${it.number} RegionCard 없음`); mism++; }
    else if (rc.name !== it.name) { console.error(`  ✗ #${it.number} 이름 불일치 DB="${rc.name}" man="${it.name}"`); mism++; }
    else if (rc.imageLarge) console.warn(`  ⚠ #${it.number} 이미 imageLarge 존재(덮어씀)`);
  }
  console.log(`  사전 이름검증: 불일치 ${mism}/${map.length}`);
  if (mism > 0) throw new Error("이름 불일치 — 중단");
  if (!APPLY) { console.log("적용: --apply"); return; }
  const stats = { total: map.length, done: 0, ok: 0, fail: 0 };
  for (const it of map) await one(it, stats);
  if (fails.length) writeFileSync("tmp/pt2-fill-failed.json", JSON.stringify(fails, null, 2));
  console.log(`\n=== 결과 === ok=${stats.ok} fail=${stats.fail}`);
  const cov = await prisma.regionCard.count({ where: { setId: SET, region: "JP", imageLarge: { not: null } } });
  const total = await prisma.regionCard.count({ where: { setId: SET, region: "JP" } });
  console.log(`jp-tcg-PT2 이미지 보유: ${cov}/${total}`);
}
main().catch((e) => { console.error("FAIL:", e); process.exit(1); }).finally(() => prisma.$disconnect());
