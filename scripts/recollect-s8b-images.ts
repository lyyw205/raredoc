/**
 * VMAX クライマックス (jp-tcg-S8b, og-s8b) 이미지 재수집 + 에너지 필.
 *
 * 배경: 기존 JP 이미지가 저해상(≈400×564, 40~70KB) 압축본이라 도감에서 노이즈가 심함(매핑 자체는 정상).
 *   #1-184 중 노이즈 심한 구간을 공식 고해상(868×1212)으로 전면 재수집. + #286-293 기본에너지(NULL) 채움.
 * 제외: #56-59 モルペコV-UNION 4분할 — 공식/Limitless 둘 다 "합쳐진 1장"만 제공해 교체 시 현재의 올바른
 *   4분할 매핑이 퇴화하므로 재수집 대상에서 제외(현재 4분할 유지).
 *
 * 출처: pokemon-card.com 공식 (pg=748=S8b). 매핑은 저블록 cardID(40153-40333) 오름차순 = 콜렉션 번호로
 *   DB #1-184 와 이름 전수 정렬 검증(V-UNION만 예외). 맵은 tmp/s8b-map.json (number→공식 large URL).
 *
 * 동작(카드별): 공식 large 다운 → webp large(q90)+245 small(q80) → R2 og-s8b/ja/{size}/jp-tcg-S8b/{n}.webp
 *   → DB imageLarge/Small 갱신 → 기존 {n}.jpg 객체 삭제(.jpg→.webp 키변경=CDN 캐시 자연 우회).
 *   ★이미지 전용: 정체성·번호·KR/EN 공유 LC 연결 전부 불변. og-s8b 동결팩이라 --allow-protected 필요.
 *
 * dry: npx tsx scripts/recollect-s8b-images.ts
 * 적용: npx tsx scripts/recollect-s8b-images.ts --apply --allow-protected
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
const SET = "jp-tcg-S8b", PACK = "og-s8b";
const MAP_PATH = process.argv.find((a) => a.startsWith("--map="))?.slice(6) ?? "tmp/s8b-map.json";
const CONC = 6, MAX_RETRY = 3, RETRY = [400, 1200, 3000];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Item = { number: string; numberInt: number; name: string; src: string; url: string; cardID?: number };

async function dl(url: string): Promise<Buffer> {
  for (let i = 0; i < MAX_RETRY; i++) {
    try { const { stdout } = await exec("curl", ["-sSL", "--fail", "--max-time", "40", "-A", "Mozilla/5.0", url], { maxBuffer: 25 * 1024 * 1024, encoding: "buffer" } as any);
      const b = stdout as unknown as Buffer; if (b.length > 5000) return b; throw new Error(`small ${b.length}`); }
    catch (e) { if (i < MAX_RETRY - 1) await sleep(RETRY[i]); else throw e; }
  }
  throw new Error("dl failed");
}
function keyFromUrl(url: string | null): string | null { if (!url || !url.includes("r2.dev/")) return null; return url.split("r2.dev/")[1]; }
async function deleteKey(key: string) { try { await getR2Client().send(new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET!, Key: key })); return true; } catch { return false; } }

const fails: any[] = [];
async function processItem(it: Item, stats: any) {
  try {
    const rc = await prisma.regionCard.findFirst({ where: { setId: SET, number: it.number, region: "JP" }, select: { id: true, name: true, imageLarge: true, imageSmall: true } });
    if (!rc) throw new Error("RegionCard 없음");
    const buf = await dl(it.url);
    const meta = await sharp(buf).metadata();
    if (!meta.width || meta.width < 300) throw new Error(`이미지 의심 w=${meta.width}`);
    const largeKey = r2KeyFor(PACK, "ja", "large", SET, it.number, "webp");
    const smallKey = r2KeyFor(PACK, "ja", "small", SET, it.number, "webp");
    if (APPLY) {
      const largeBuf = await sharp(buf).webp({ quality: 90 }).toBuffer();
      const smallBuf = await sharp(buf).resize({ width: 245, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
      await uploadBuffer(largeKey, largeBuf, "image/webp");
      await uploadBuffer(smallKey, smallBuf, "image/webp");
      if (!(await headExists(largeKey)) || !(await headExists(smallKey))) throw new Error("R2 verify 실패");
      // 옛 키(.jpg 등)가 새 키와 다르면 삭제
      const oldKeys = [keyFromUrl(rc.imageLarge), keyFromUrl(rc.imageSmall)].filter((k): k is string => !!k && k !== largeKey && k !== smallKey);
      await prisma.regionCard.update({ where: { id: rc.id }, data: { imageLarge: r2PublicUrl(largeKey), imageSmall: r2PublicUrl(smallKey) } });
      for (const k of oldKeys) await deleteKey(k);
    }
    stats.ok++;
  } catch (e: any) { stats.fail++; fails.push({ number: it.number, name: it.name, error: String(e?.message ?? e) }); }
  finally { stats.done++; if (stats.done % 25 === 0) console.log(`  [${stats.done}/${stats.total}] ok=${stats.ok} fail=${stats.fail}`); await sleep(100); }
}

async function main() {
  assertWritable([PACK], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "recollect-s8b-images" });
  const map: Item[] = JSON.parse(fs.readFileSync(MAP_PATH, "utf8"));
  const recol = map.filter((m) => m.numberInt < 200), energy = map.filter((m) => m.numberInt >= 286);
  console.log(`${APPLY ? "APPLY" : "DRY"} recollect-s8b-images | 재수집 ${recol.length} + 에너지 ${energy.length} = ${map.length} (V-UNION #56-59 제외)`);
  console.log(`출처: official=${map.filter((m) => m.src === "official").length}, limitless=${map.filter((m) => m.src === "limitless").length}`);
  if (!APPLY) { console.log("샘플:", map.slice(0, 2).map((m) => `#${m.number} ${m.name}`).join(", "), "...", `#${map[map.length - 1].number} ${map[map.length - 1].name}`); console.log("적용: --apply --allow-protected"); return; }
  const stats = { total: map.length, done: 0, ok: 0, fail: 0 };
  let idx = 0;
  const worker = async () => { while (idx < map.length) { const i = idx++; await processItem(map[i], stats); } };
  await Promise.all(Array.from({ length: CONC }, worker));
  if (fails.length) { fs.writeFileSync("tmp/s8b-recollect-failed.json", JSON.stringify(fails, null, 2)); }
  console.log(`\n=== 결과 === ok=${stats.ok} fail=${stats.fail}${fails.length ? ` (로그 tmp/s8b-recollect-failed.json)` : ""}`);
  const cov = await prisma.regionCard.count({ where: { setId: SET, region: "JP", imageLarge: { contains: ".webp" } } });
  console.log(`DB .webp 커버리지(JP 전체): ${cov}`);
}
main().catch((e) => { console.error("FAIL:", e); process.exit(1); }).finally(() => prisma.$disconnect());
