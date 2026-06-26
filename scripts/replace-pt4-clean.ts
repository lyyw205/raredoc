/**
 * アルセウス光臨 (jp-tcg-PT4, og-pl4) 홀로 카드 이미지를 공식 GIF(노이즈) → tcgcollector 클린 일본판으로 교체.
 *
 * 배경: 오늘 PT4 24장을 공식 .gif(6프레임 애니 홀로)에서 1프레임 추출해 채웠더니 포일 반짝임이
 *   정지 노이즈처럼 보임. 공식은 홀로를 GIF 전용 제공(클린 .jpg 없음), tcgdex는 Platinum 미보유.
 *   → 사용자 제공 tcgcollector 클린 .jpg 로 교체. data/collect/pt4-clean-replace.json (번호→URL).
 *   ★검증완: 사용자 23장 각각을 공식 레퍼런스와 자동 매칭(corr 0.81~0.99, 1:1 bijection) + 23쌍
 *     나란히 시각검증(6 アルセウス 타입·동명쌍 モジャンボ/ボーマンダ 정확). 미제공 = #069 タツベイ(이번 제외).
 *
 * 동작: 클린 다운 → webp large(q90)+245 small(q80) → R2 og-pl4/ja/{size}/jp-tcg-PT4/{NNN}.webp
 *   ★동일 키 덮어쓰기(URL 불변) → DB imageLarge/Small 변경 불필요(멱등 재설정만). 이미지 전용.
 *
 * dry: npx tsx scripts/replace-pt4-clean.ts
 * 적용: npx tsx scripts/replace-pt4-clean.ts --apply
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
const MAP = "data/collect/pt4-clean-replace.json";
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
    const rc = await prisma.regionCard.findFirst({ where: { setId: SET, number: it.number, region: "JP" }, select: { id: true, name: true } });
    if (!rc) throw new Error("RegionCard 없음");
    const buf = await dl(it.url);
    const meta = await sharp(buf).metadata();
    if (!meta.width || meta.width < 250) throw new Error(`이미지 의심 w=${meta.width}`);
    const largeKey = r2KeyFor(PACK, "ja", "large", SET, it.number, "webp");
    const smallKey = r2KeyFor(PACK, "ja", "small", SET, it.number, "webp");
    if (APPLY) {
      await uploadBuffer(largeKey, await sharp(buf).webp({ quality: 90 }).toBuffer(), "image/webp");
      await uploadBuffer(smallKey, await sharp(buf).resize({ width: 245, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer(), "image/webp");
      if (!(await headExists(largeKey)) || !(await headExists(smallKey))) throw new Error("R2 verify 실패");
      // 키 동일 → URL 불변. imageLarge/Small 멱등 재설정(updatedAt 갱신)
      await prisma.regionCard.update({ where: { id: rc.id }, data: { imageLarge: r2PublicUrl(largeKey), imageSmall: r2PublicUrl(smallKey) } });
    }
    stats.ok++;
  } catch (e: any) { stats.fail++; fails.push({ number: it.number, error: String(e?.message ?? e) }); }
  finally { stats.done++; console.log(`  [${stats.done}/${stats.total}] #${it.number} ${fails.find((f) => f.number === it.number) ? "✗" : "✓"}`); await sleep(150); }
}

async function main() {
  assertWritable([PACK], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "replace-pt4-clean" });
  const map: Item[] = JSON.parse(readFileSync(MAP, "utf8"));
  console.log(`${APPLY ? "APPLY" : "DRY"} replace-pt4-clean | ${map.length}장 (클린 교체, 동일키 덮어쓰기)`);
  // 사전: 모든 번호가 PT4에 존재 확인
  for (const it of map) {
    const rc = await prisma.regionCard.findFirst({ where: { setId: SET, number: it.number, region: "JP" }, select: { name: true } });
    if (!rc) throw new Error(`#${it.number} RegionCard 없음 — 중단`);
  }
  console.log(`  사전확인: ${map.length}장 전부 존재. (미포함=#069 タツベイ)`);
  if (!APPLY) { console.log("적용: --apply"); return; }
  const stats = { total: map.length, done: 0, ok: 0, fail: 0 };
  let idx = 0;
  const worker = async () => { while (idx < map.length) { const i = idx++; await one(map[i], stats); } };
  await Promise.all(Array.from({ length: CONC }, worker));
  if (fails.length) writeFileSync("tmp/pt4-replace-failed.json", JSON.stringify(fails, null, 2));
  console.log(`\n=== 결과 === ok=${stats.ok} fail=${stats.fail}`);
}
main().catch((e) => { console.error("FAIL:", e); process.exit(1); }).finally(() => prisma.$disconnect());
