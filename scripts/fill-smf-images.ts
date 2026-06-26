/**
 * プレミアムトレーナーボックス US&UM (jp-smf, sm-decks) #13-20 이미지 누락 채우기.
 *
 * 배경: jp-smf #1-12 이미지 보유, #13-20(8장, 트레이너/스타디움+에너지) imageLarge/Small=NULL.
 *   박스에 번들된 XY 재록판이라 공식 이미지가 XY/ 디렉토리. (SMG #13-41 과 동일 패턴)
 * 출처: pokemon-card.com 공식 (pg=526=SMF). 이름 매핑 8/8(문제 없음). 8장 몽타주 시각검증 완료.
 *   맵 tmp/smf-map.json (number→공식 URL, 경로 정규화).
 *
 * 동작: 공식 다운 → webp large(q90)+245 small(q80) → R2 sm-decks/ja/{size}/jp-smf/{n}.webp
 *   → 기존 RegionCard imageLarge/Small UPDATE. ★이미지 전용, 정체성·연결 불변.
 *
 * dry: npx tsx scripts/fill-smf-images.ts
 * 적용: npx tsx scripts/fill-smf-images.ts --apply --allow-protected   (sm-decks 동결)
 */
import "dotenv/config";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import * as fs from "node:fs";
import sharp from "sharp";
import { prisma } from "../src/lib/prisma";
import { r2KeyFor, uploadBuffer, r2PublicUrl, headExists } from "../src/lib/r2";
import { assertWritable, hasAllowProtectedFlag } from "./lib/protected-groups";

const exec = promisify(execFile);
const APPLY = process.argv.includes("--apply");
const SET = "jp-smf", PACK = "sm-decks";
const MAP_PATH = "tmp/smf-map.json";
const CONC = 4, MAX_RETRY = 3, RETRY = [500, 1500, 3500];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
type Item = { number: string; numberInt: number; name: string; url: string };

async function dl(url: string): Promise<Buffer> {
  for (let i = 0; i < MAX_RETRY; i++) {
    try { const { stdout } = await exec("curl", ["-sSL", "--fail", "--max-time", "40", "-A", "Mozilla/5.0", url], { maxBuffer: 20 * 1024 * 1024, encoding: "buffer" } as any);
      const b = stdout as unknown as Buffer; if (b.length > 4000) return b; throw new Error(`small ${b.length}`); }
    catch (e) { if (i < MAX_RETRY - 1) await sleep(RETRY[i]); else throw e; }
  }
  throw new Error("dl failed");
}

const fails: any[] = [];
async function processItem(it: Item, stats: any) {
  try {
    const rc = await prisma.regionCard.findFirst({ where: { setId: SET, number: it.number, region: "JP" }, select: { id: true } });
    if (!rc) throw new Error("RegionCard 없음");
    const buf = await dl(it.url);
    const meta = await sharp(buf).metadata();
    if (!meta.width || meta.width < 300) throw new Error(`이미지 의심 w=${meta.width}`);
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
  finally { stats.done++; console.log(`  [${stats.done}/${stats.total}] #${it.number} ${it.name} ${fails.find((f) => f.number === it.number) ? "✗" : "✓"}`); await sleep(150); }
}

async function main() {
  assertWritable([PACK], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "fill-smf-images" });
  const map: Item[] = JSON.parse(fs.readFileSync(MAP_PATH, "utf8"));
  console.log(`${APPLY ? "APPLY" : "DRY"} fill-smf-images | ${map.length}장 (#13-20 이미지 필)`);
  if (!APPLY) { console.log("적용: --apply --allow-protected"); return; }
  const stats = { total: map.length, done: 0, ok: 0, fail: 0 };
  let idx = 0;
  const worker = async () => { while (idx < map.length) { const i = idx++; await processItem(map[i], stats); } };
  await Promise.all(Array.from({ length: CONC }, worker));
  if (fails.length) fs.writeFileSync("tmp/smf-fill-failed.json", JSON.stringify(fails, null, 2));
  console.log(`\n=== 결과 === ok=${stats.ok} fail=${stats.fail}`);
  const cov = await prisma.regionCard.count({ where: { setId: SET, numberInt: { gte: 13, lte: 20 }, imageLarge: { not: null } } });
  console.log(`DB #13-20 이미지 보유: ${cov}/8`);
}
main().catch((e) => { console.error("FAIL:", e); process.exit(1); }).finally(() => prisma.$disconnect());
