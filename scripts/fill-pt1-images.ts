/**
 * ギンガの覇道 (jp-tcg-PT1, og-pl1) 이미지 누락 채움 — 사용자 제공 tcgcollector 클린 .jpg/.webp.
 *
 * 배경: jp-tcg-PT1 96장 중 21장 imageLarge/Small=NULL(홀로). 공식(pokemon-card.com)은 홀로를
 *   애니 .gif 로만 서빙(정지 추출시 포일 노이즈) → PT2/3/4 와 동일하게 사용자가 tcgcollector
 *   클린 이미지 제공. 단 사용자 제공은 20장 → 1장(#038 ライボルト) 미제공(이번 제외).
 *   정체성·연결 이미 존재 → 순수 이미지 채움.
 *   ★검증완: 사용자 20장 ↔ 공식 누락 21장 fingerprint 매칭(20쌍 전단사, 남은 ref #038=미제공) +
 *     20쌍 나란히 몽타주 시각검증. パルキアG #032/#033 다른 아트 정확 분리. 꼬리 정렬 오류는
 *     이름기반 매칭으로 교정(레인보우에너지가 공식 맨끝→#093). #096 エビワラー 약corr(0.674)은
 *     고해상 직접대조로 동일카드 확정(공식 홀로 vs 클린 스캔 차이일 뿐, ジャブ/スペシャルパンチ 일치).
 *
 * 동작: 검증된 로컬 파일(tmp/pt1replace/uNN.img) → sharp webp large(q90)+245 small(q80)
 *   → R2 og-pl1/ja/{size}/jp-tcg-PT1/{NNN}.webp → 기존 RegionCard imageLarge/Small UPDATE.
 *   ★이미지 전용, 정체성·연결 불변. 재다운로드 없이 시각검증한 바이트 그대로 적재.
 *
 * dry: npx tsx scripts/fill-pt1-images.ts
 * 적용: npx tsx scripts/fill-pt1-images.ts --apply
 */
import "dotenv/config";
import { readFileSync, writeFileSync } from "node:fs";
import sharp from "sharp";
import { prisma } from "../src/lib/prisma";
import { r2KeyFor, uploadBuffer, r2PublicUrl, headExists } from "../src/lib/r2";
import { assertWritable, hasAllowProtectedFlag } from "./lib/protected-groups";

const APPLY = process.argv.includes("--apply");
const SET = "jp-tcg-PT1", PACK = "og-pl1";
const MATCH = "tmp/pt1-automatch.json";
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
  assertWritable([PACK], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "fill-pt1-images" });
  const map: M[] = JSON.parse(readFileSync(MATCH, "utf8"));
  map.sort((a, b) => a.number.localeCompare(b.number));
  console.log(`${APPLY ? "APPLY" : "DRY"} fill-pt1-images | ${map.length}장 (사용자 클린, 로컬 검증바이트) — 미제공 #038 제외`);
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
  if (fails.length) writeFileSync("tmp/pt1-fill-failed.json", JSON.stringify(fails, null, 2));
  console.log(`\n=== 결과 === ok=${stats.ok} fail=${stats.fail}`);
  const cov = await prisma.regionCard.count({ where: { setId: SET, region: "JP", imageLarge: { not: null } } });
  const total = await prisma.regionCard.count({ where: { setId: SET, region: "JP" } });
  console.log(`jp-tcg-PT1 이미지 보유: ${cov}/${total} (잔여 NULL = #038 ライボルト 1장)`);
}
main().catch((e) => { console.error("FAIL:", e); process.exit(1); }).finally(() => prisma.$disconnect());
