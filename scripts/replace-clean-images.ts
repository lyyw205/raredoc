/**
 * 노이즈 GIF 이미지 → tcgcollector 클린 .jpg 교체 (제네릭).
 *   매니페스트(번호→URL)와 set/pack 을 인자로 받아 동일 R2 키(.webp) 덮어쓰기.
 *   ★검증완 전제: 각 번호↔URL 가 자동매칭(corr)+나란히 시각검증으로 동일 카드 확정된 상태에서만 실행.
 *   동일 키 덮어쓰기 → imageLarge/Small URL 불변(멱등 재설정). 이미지 전용, 정체성 불변.
 *
 * dry: npx tsx scripts/replace-clean-images.ts --set=jp-tcg-PT3 --pack=og-pl3 --map=data/collect/pt3-clean-replace.json
 * 적용: 위 + --apply
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
const arg = (k: string) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const SET = arg("set")!, PACK = arg("pack")!, MAP = arg("map")!;
const CONC = 4;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
type Item = { number: string; url: string };

async function dl(url: string): Promise<Buffer> {
  const { stdout } = await exec("curl", ["-sSL", "--fail", "--max-time", "30", "-A", "Mozilla/5.0", url], { maxBuffer: 20 * 1024 * 1024, encoding: "buffer" } as any);
  const b = stdout as unknown as Buffer; if (b.length < 4000) throw new Error(`small ${b.length}`); return b;
}

const fails: any[] = [];
async function one(it: Item, stats: any) {
  try {
    const rc = await prisma.regionCard.findFirst({ where: { setId: SET, number: it.number, region: "JP" }, select: { id: true } });
    if (!rc) throw new Error("RegionCard 없음");
    const buf = await dl(it.url);
    if ((await sharp(buf).metadata()).width! < 250) throw new Error("이미지 의심");
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
  finally { stats.done++; console.log(`  [${stats.done}/${stats.total}] #${it.number} ${fails.find((f) => f.number === it.number) ? "✗" : "✓"}`); await sleep(150); }
}

async function main() {
  if (!SET || !PACK || !MAP) throw new Error("필수: --set --pack --map");
  assertWritable([PACK], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "replace-clean-images" });
  const map: Item[] = JSON.parse(readFileSync(MAP, "utf8"));
  console.log(`${APPLY ? "APPLY" : "DRY"} replace-clean-images | set=${SET} pack=${PACK} | ${map.length}장`);
  for (const it of map) {
    const rc = await prisma.regionCard.findFirst({ where: { setId: SET, number: it.number, region: "JP" }, select: { name: true } });
    if (!rc) throw new Error(`#${it.number} RegionCard 없음 — 중단`);
  }
  console.log(`  사전확인: ${map.length}장 전부 존재`);
  if (!APPLY) { console.log("적용: --apply"); return; }
  const stats = { total: map.length, done: 0, ok: 0, fail: 0 };
  let idx = 0;
  const worker = async () => { while (idx < map.length) { const i = idx++; await one(map[i], stats); } };
  await Promise.all(Array.from({ length: CONC }, worker));
  if (fails.length) writeFileSync(`tmp/${SET}-replace-failed.json`, JSON.stringify(fails, null, 2));
  console.log(`\n=== 결과 === ok=${stats.ok} fail=${stats.fail}`);
}
main().catch((e) => { console.error("FAIL:", e); process.exit(1); }).finally(() => prisma.$disconnect());
