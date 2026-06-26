/**
 * シャイニースターV (jp-tcg-S4a, og-s4a) #1-199 일러스트 노이즈 재수집.
 *
 * 배경: 기존 JP 이미지가 저해상(400×562, ≈46KB) 압축본이라 #1-199 일러에 노이즈. 매핑은 정상.
 *   공식 고해상(868×1212)으로 #1-199 전면 재수집. #200+ 시크릿은 대상 아님.
 * 출처: pokemon-card.com 공식 (pg=723=S4a). 저블록 cardID(38646~) 오름차순 = 콜렉션 번호로
 *   DB #1-199 와 이름 전수 정렬 검증(불일치 0, 동명 5쌍 위치정렬 해소). 맵 tmp/s4a-map.json.
 *
 * 동작(카드별): 공식 large 다운 → webp large(q90)+245 small(q80) → R2 og-s4a/ja/{size}/jp-tcg-S4a/{n}.webp
 *   → DB imageLarge/Small 갱신 → 기존 {n}.jpg 삭제(.jpg→.webp 키변경=CDN 캐시 우회).
 *   ★이미지 전용: 정체성·번호·연결 불변.
 *
 * dry: npx tsx scripts/recollect-s4a-images.ts
 * 적용: npx tsx scripts/recollect-s4a-images.ts --apply
 */
import "dotenv/config";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import * as fs from "node:fs";
import sharp from "sharp";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { prisma } from "../src/lib/prisma";
import { r2KeyFor, uploadBuffer, r2PublicUrl, headExists, getR2Client } from "../src/lib/r2";
import { assertWritable, hasAllowProtectedFlag } from "./lib/protected-groups";

const exec = promisify(execFile);
const APPLY = process.argv.includes("--apply");
const SET = "jp-tcg-S4a", PACK = "og-s4a";
const MAP_PATH = process.argv.find((a) => a.startsWith("--map="))?.slice(6) ?? "tmp/s4a-map.json";
const CONC = 6, MAX_RETRY = 3, RETRY = [400, 1200, 3000];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
type Item = { number: string; numberInt: number; name: string; url: string; cardID?: number };

async function dl(url: string): Promise<Buffer> {
  for (let i = 0; i < MAX_RETRY; i++) {
    try { const { stdout } = await exec("curl", ["-sSL", "--fail", "--max-time", "40", "-A", "Mozilla/5.0", url], { maxBuffer: 25 * 1024 * 1024, encoding: "buffer" } as any);
      const b = stdout as unknown as Buffer; if (b.length > 5000) return b; throw new Error(`small ${b.length}`); }
    catch (e) { if (i < MAX_RETRY - 1) await sleep(RETRY[i]); else throw e; }
  }
  throw new Error("dl failed");
}
function keyFromUrl(u: string | null): string | null { if (!u || !u.includes("r2.dev/")) return null; return u.split("r2.dev/")[1]; }
async function deleteKey(k: string) { try { await getR2Client().send(new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET!, Key: k })); return true; } catch { return false; } }

const fails: any[] = [];
async function processItem(it: Item, stats: any) {
  try {
    const rc = await prisma.regionCard.findFirst({ where: { setId: SET, number: it.number, region: "JP" }, select: { id: true, imageLarge: true, imageSmall: true } });
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
      const oldKeys = [keyFromUrl(rc.imageLarge), keyFromUrl(rc.imageSmall)].filter((k): k is string => !!k && k !== largeKey && k !== smallKey);
      await prisma.regionCard.update({ where: { id: rc.id }, data: { imageLarge: r2PublicUrl(largeKey), imageSmall: r2PublicUrl(smallKey) } });
      for (const k of oldKeys) await deleteKey(k);
    }
    stats.ok++;
  } catch (e: any) { stats.fail++; fails.push({ number: it.number, name: it.name, error: String(e?.message ?? e) }); }
  finally { stats.done++; if (stats.done % 25 === 0) console.log(`  [${stats.done}/${stats.total}] ok=${stats.ok} fail=${stats.fail}`); await sleep(100); }
}

async function main() {
  assertWritable([PACK], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "recollect-s4a-images" });
  const map: Item[] = JSON.parse(fs.readFileSync(MAP_PATH, "utf8"));
  console.log(`${APPLY ? "APPLY" : "DRY"} recollect-s4a-images | ${map.length}장 (#1-199 노이즈 재수집)`);
  if (!APPLY) { console.log("샘플:", map.slice(0, 2).map((m) => `#${m.number} ${m.name}`).join(", "), "...", `#${map[map.length - 1].number} ${map[map.length - 1].name}`); console.log("적용: --apply"); return; }
  const stats = { total: map.length, done: 0, ok: 0, fail: 0 };
  let idx = 0;
  const worker = async () => { while (idx < map.length) { const i = idx++; await processItem(map[i], stats); } };
  await Promise.all(Array.from({ length: CONC }, worker));
  if (fails.length) fs.writeFileSync("tmp/s4a-recollect-failed.json", JSON.stringify(fails, null, 2));
  console.log(`\n=== 결과 === ok=${stats.ok} fail=${stats.fail}${fails.length ? " (로그 tmp/s4a-recollect-failed.json)" : ""}`);
  const cov = await prisma.regionCard.count({ where: { setId: SET, region: "JP", numberInt: { gte: 1, lte: 199 }, imageLarge: { contains: ".webp" } } });
  console.log(`DB #1-199 .webp 커버리지: ${cov}/199`);
}
main().catch((e) => { console.error("FAIL:", e); process.exit(1); }).finally(() => prisma.$disconnect());
