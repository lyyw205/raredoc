/**
 * ロケット団の逆襲 (jp-tcg-PCG3, og-pcg3) 이미지 전수 교정 85장 — insane-search로 tcgcollector에서 직접 수집.
 *
 * 배경: 스캐너(scan-en-images) 결과 PCG3는 스크램블 20·영어이미지 46·정상 19. #001-020은 엉뚱한 카드,
 *   #021-084 상당수는 영어 텍스트. 이름·EN ex7 연결은 정상이라 이미지만 교체.
 *   ★수집: insane-search 엔진(Phase3 실크롬 렌더)로 tcgcollector JP 세트페이지(/sets/11179) 85장 추출
 *     (tmp/pcg3/wcp-extracted.json, 이미지URL 320w).
 *   ★검증완: 번호조인 EN-이름 84/85 + #071(Rocket's Celebi=セレビィ) 시각확정 = 85/85. 신규 85장 [DB명]
 *     라벨 몽타주 2시트 전수 시각검증 — 스크램블(#001 アーボ·#008 ポポッコ·#010 ヤンヤンマ·#020 アチャモ 등)
 *     올바른 카드로 교정·전부 일본판 확인.
 *
 * ★R2 키 lang = "ja". 동작: 로컬 → webp large(q90)+245 small(q80)
 *   → R2 og-pcg3/ja/{size}/jp-tcg-PCG3/{NNN}.webp → RegionCard imageLarge/Small UPDATE. 이미지 전용·연결 불변.
 *
 * dry: npx tsx scripts/fill-pcg3-batch.ts
 * 적용: npx tsx scripts/fill-pcg3-batch.ts --apply
 */
import "dotenv/config";
import { readFileSync, existsSync } from "node:fs";
import sharp from "sharp";
import { prisma } from "../src/lib/prisma";
import { r2KeyFor, uploadBuffer, r2PublicUrl, headExists } from "../src/lib/r2";
import { assertWritable, hasAllowProtectedFlag } from "./lib/protected-groups";

const APPLY = process.argv.includes("--apply");
const SET = "jp-tcg-PCG3", PACK = "og-pcg3", LANG = "ja";
const CONC = 4;

async function main() {
  assertWritable([PACK], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "fill-pcg3-batch" });
  const ext: any[] = JSON.parse(readFileSync("tmp/pcg3/wcp-extracted.json", "utf8"));
  const nums = ext.map((x) => x.number).sort();
  console.log(`${APPLY ? "APPLY" : "DRY"} fill-pcg3-batch | ${nums.length}장 (lang=${LANG}, insane-search 수집)`);
  for (const n of nums) {
    const rc = await prisma.regionCard.findFirst({ where: { setId: SET, number: n, region: "JP" }, select: { name: true } });
    if (!rc) throw new Error(`#${n} RegionCard 없음`);
    if (!existsSync(`tmp/pcg3/new/${n}.img`)) throw new Error(`#${n} 로컬 이미지 없음`);
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
        const buf = readFileSync(`tmp/pcg3/new/${n}.img`);
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
