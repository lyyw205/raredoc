/**
 * 金、銀、新世界へ (jp-tcg-neo1, og-neo1 / Neo Genesis) 이미지 전수 재수집 96장 — insane-search로 tcgcollector JP에서 수집.
 *
 * 배경: NEO 팩 EN/JP 이미지 혼입. tcgcollector "Gold, Silver, to a New World..."(/sets/11290) = 정본 JP 세트.
 *   ★번호조인 검증 통과(species-match 72 / trainer·energy 24 / 스크램블 0) → 단순 번호별 이미지 교체로 충분(NEO2 같은 untangle 불필요).
 *
 * ★R2 키 lang = "ja". 동작: 로컬(tmp/neo1/new/{NNN}.img) → webp large(q90)+245 small(q80)
 *   → R2 og-neo1/ja/{size}/jp-tcg-neo1/{NNN}.webp → RegionCard imageLarge/Small UPDATE. 이미지 전용·연결 불변.
 *
 * dry: npx tsx scripts/fill-neo1-batch.ts
 * 적용: npx tsx scripts/fill-neo1-batch.ts --apply
 */
import "dotenv/config";
import { readFileSync, existsSync } from "node:fs";
import sharp from "sharp";
import { prisma } from "../src/lib/prisma";
import { r2KeyFor, uploadBuffer, r2PublicUrl, headExists } from "../src/lib/r2";
import { assertMappingWritable, hasAllowProtectedFlag } from "./lib/protected-groups";

const APPLY = process.argv.includes("--apply");
const SET = "jp-tcg-neo1", PACK = "og-neo1", LANG = "ja";
const CONC = 4;

async function main() {
  assertMappingWritable([PACK], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "fill-neo1-batch", what: `${PACK} 이미지 교체` });
  const ext: any[] = JSON.parse(readFileSync("tmp/neo1/tcg.json", "utf8"));
  const nums = ext.map((x) => x.number).sort();
  console.log(`${APPLY ? "APPLY" : "DRY"} fill-neo1-batch | ${nums.length}장 (lang=${LANG}, insane-search 수집)`);
  for (const n of nums) {
    const rc = await prisma.regionCard.findFirst({ where: { setId: SET, number: n, region: "JP" }, select: { name: true } });
    if (!rc) throw new Error(`#${n} RegionCard 없음`);
    if (!existsSync(`tmp/neo1/new/${n}.img`)) throw new Error(`#${n} 로컬 이미지 없음`);
  }
  console.log(`  사전확인: ${nums.length}장 전부 존재`);
  if (!APPLY) { console.log("적용: --apply"); return; }
  const fails: any[] = [];
  const stats = { done: 0, ok: 0, fail: 0, total: nums.length };
  let idx = 0;
  const worker = async () => {
    while (idx < nums.length) {
      const n = nums[idx++];
      try {
        const rc = await prisma.regionCard.findFirst({ where: { setId: SET, number: n, region: "JP" }, select: { id: true } });
        const buf = readFileSync(`tmp/neo1/new/${n}.img`);
        const meta = await sharp(buf).metadata();
        if (!meta.width || meta.width < 250) throw new Error(`이미지 의심 w=${meta.width}`);
        const lk = r2KeyFor(PACK, LANG, "large", SET, n, "webp"), sk = r2KeyFor(PACK, LANG, "small", SET, n, "webp");
        await uploadBuffer(lk, await sharp(buf).webp({ quality: 90 }).toBuffer(), "image/webp");
        await uploadBuffer(sk, await sharp(buf).resize({ width: 245, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer(), "image/webp");
        if (!(await headExists(lk)) || !(await headExists(sk))) throw new Error("R2 verify 실패");
        await prisma.regionCard.update({ where: { id: rc!.id }, data: { imageLarge: r2PublicUrl(lk), imageSmall: r2PublicUrl(sk) } });
        stats.ok++;
      } catch (e: any) { stats.fail++; fails.push({ number: n, error: String(e?.message ?? e) }); }
      finally { stats.done++; if (stats.done % 20 === 0 || stats.done === stats.total) console.log(`  [${stats.done}/${stats.total}] ok=${stats.ok} fail=${stats.fail}`); }
    }
  };
  await Promise.all(Array.from({ length: CONC }, worker));
  console.log(`\n=== 결과 === ok=${stats.ok} fail=${stats.fail}`);
  if (fails.length) console.log("실패:", JSON.stringify(fails));
}
main().catch((e) => { console.error("FAIL:", e); process.exit(1); }).finally(() => prisma.$disconnect());
