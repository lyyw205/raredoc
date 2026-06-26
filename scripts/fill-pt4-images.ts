/**
 * アルセウス光臨 (jp-tcg-PT4, og-pl4) 이미지 누락 24장 재수집.
 *
 * 배경: jp-tcg-PT4 90장 중 24장 imageLarge/Small=NULL(흩어진 번호). 정체성 이미 존재 → 순수 이미지 채움.
 *   ★누락 24장은 공식이 .gif 로 서빙(기존 66장은 .jpg) — 원수집이 .jpg 만 가져와서 빠진 것.
 * 출처: pokemon-card.com 공식 (pg=120 = DPt4-B 디렉토리). 매니페스트 data/collect/jp-pt4-images.json.
 *   pg-scan → ★기본에너지 8장(cardID<1000) 필터 후 본탄 90장 cardID 정렬 매핑(연속, 갭 0).
 *   ★검증완: 파일명 ROMAJI가 DB명과 전수 일치(.gif 24장 포함) + 24장 몽타주 시각검증
 *   (6 アルセウス 타입 Water/Fighting/Darkness/Metal/Colorless/LV.X DB와 일치, 중복 モジャンボ/ボーマンダ 정상).
 *
 * 동작: 공식 .gif 다운 → sharp webp large(q90)+245 small(q80) → R2 og-pl4/ja/{size}/jp-tcg-PT4/{NNN}.webp
 *   → 기존 RegionCard imageLarge/Small UPDATE. ★이미지 전용, 정체성·연결 불변. (봇차단 회피 CONC=3+딜레이)
 *
 * dry: npx tsx scripts/fill-pt4-images.ts
 * 적용: npx tsx scripts/fill-pt4-images.ts --apply
 */
import "dotenv/config";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFileSync, writeFileSync } from "node:fs";
import sharp from "sharp";
import { prisma } from "../src/lib/prisma";
import { r2KeyFor, uploadBuffer, r2PublicUrl, headExists } from "../src/lib/r2";
import { assertWritable, hasAllowProtectedFlag } from "./lib/protected-groups";

const exec = promisify(execFile);
const APPLY = process.argv.includes("--apply");
const SET = "jp-tcg-PT4", PACK = "og-pl4";
const MAN = "data/collect/jp-pt4-images.json";
const CONC = 3, MAX_RETRY = 3, RETRY = [500, 1500, 3500];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
type Item = { number: string; name: string; imageUrl: string; cardID: string };

async function dl(url: string): Promise<Buffer> {
  for (let i = 0; i < MAX_RETRY; i++) {
    try {
      const { stdout } = await exec("curl", ["-sSL", "--fail", "--max-time", "40", "-A", "Mozilla/5.0", url], { maxBuffer: 20 * 1024 * 1024, encoding: "buffer" } as any);
      const b = stdout as unknown as Buffer; if (b.length > 2000) return b; throw new Error(`small ${b.length}`);
    } catch (e) { if (i < MAX_RETRY - 1) await sleep(RETRY[i]); else throw e; }
  }
  throw new Error("dl failed");
}

const fails: any[] = [];
async function processItem(it: Item, stats: any) {
  try {
    const rc = await prisma.regionCard.findFirst({ where: { setId: SET, number: it.number, region: "JP" }, select: { id: true, name: true } });
    if (!rc) throw new Error("RegionCard 없음");
    if (rc.name !== it.name) throw new Error(`이름 불일치 DB="${rc.name}" man="${it.name}"`);
    const buf = await dl(it.imageUrl);
    const meta = await sharp(buf).metadata();
    if (!meta.width || meta.width < 120) throw new Error(`이미지 의심 w=${meta.width}`);
    const largeKey = r2KeyFor(PACK, "ja", "large", SET, it.number, "webp");
    const smallKey = r2KeyFor(PACK, "ja", "small", SET, it.number, "webp");
    if (APPLY) {
      await uploadBuffer(largeKey, await sharp(buf).webp({ quality: 90 }).toBuffer(), "image/webp");
      await uploadBuffer(smallKey, await sharp(buf).resize({ width: 245, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer(), "image/webp");
      if (!(await headExists(largeKey)) || !(await headExists(smallKey))) throw new Error("R2 verify 실패");
      await prisma.regionCard.update({ where: { id: rc.id }, data: { imageLarge: r2PublicUrl(largeKey), imageSmall: r2PublicUrl(smallKey) } });
    }
    stats.ok++;
  } catch (e: any) { stats.fail++; fails.push({ number: it.number, name: it.name, error: String(e?.message ?? e) }); }
  finally { stats.done++; if (stats.done % 8 === 0 || stats.done === stats.total) console.log(`  [${stats.done}/${stats.total}] ok=${stats.ok} fail=${stats.fail}`); await sleep(200); }
}

async function main() {
  assertWritable([PACK], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "fill-pt4-images" });
  const man: Item[] = JSON.parse(readFileSync(MAN, "utf8"));
  console.log(`${APPLY ? "APPLY" : "DRY"} fill-pt4-images | ${man.length}장 (공식 pg120 DPt4-B, .gif)`);
  let nameMism = 0;
  for (const it of man) {
    const rc = await prisma.regionCard.findFirst({ where: { setId: SET, number: it.number, region: "JP" }, select: { name: true } });
    if (!rc) { console.error(`  ✗ #${it.number} RegionCard 없음`); nameMism++; }
    else if (rc.name !== it.name) { console.error(`  ✗ #${it.number} 이름 불일치 DB="${rc.name}" man="${it.name}"`); nameMism++; }
  }
  console.log(`  사전 이름검증: 불일치 ${nameMism}/${man.length}`);
  if (nameMism > 0) throw new Error("이름 불일치 존재 — 적용 중단");
  if (!APPLY) { console.log("적용: --apply"); return; }

  const stats = { total: man.length, done: 0, ok: 0, fail: 0 };
  let idx = 0;
  const worker = async () => { while (idx < man.length) { const i = idx++; await processItem(man[i], stats); } };
  await Promise.all(Array.from({ length: CONC }, worker));
  if (fails.length) writeFileSync("tmp/pt4-fill-failed.json", JSON.stringify(fails, null, 2));
  console.log(`\n=== 결과 === ok=${stats.ok} fail=${stats.fail}${fails.length ? " (로그 tmp/pt4-fill-failed.json)" : ""}`);
  const cov = await prisma.regionCard.count({ where: { setId: SET, imageLarge: { not: null } } });
  const total = await prisma.regionCard.count({ where: { setId: SET } });
  console.log(`jp-tcg-PT4 이미지 보유: ${cov}/${total}`);
}
main().catch((e) => { console.error("FAIL:", e); process.exit(1); }).finally(() => prisma.$disconnect());
