/**
 * めざめる伝説 (jp-tcg-neo3, og-neo3 / Neo Revelation) 이미지 전수 재수집 57장 — insane-search로 tcgcollector JP에서 직접 수집.
 *
 * 배경: NEO 팩들은 JP/EN 카드 이미지가 뒤섞여 수집됨(영어판 스캔이 JP 슬롯에 혼입). 사용자 지시 "전부 재수집".
 *   ★수집: insane-search 엔진(Phase3 실크롬 렌더)로 tcgcollector JP 세트페이지(/sets/11173/awakening-legends)
 *     57장 추출(tmp/neo3/tcg.json, 593w 고해상도). 번호조인 EN-이름↔DB종(species) 51/51 일치 +
 *     트레이너/에너지 5(무dex) + #046 カモネギ=Farfetch'd(아포스트로피 인코딩 차이뿐, 정상). 도감번호버그 없음.
 *   ★시각검증: 샘플 9장 몽타주 + #046 단건 확대 — 전부 일본판(가타카나명·일본어 기술문) 확인.
 *
 * ★R2 키 lang = "ja". 동작: 로컬(tmp/neo3/new/{NNN}.img) → webp large(q90)+245 small(q80)
 *   → R2 og-neo3/ja/{size}/jp-tcg-neo3/{NNN}.webp → RegionCard imageLarge/Small UPDATE. 이미지 전용·연결 불변.
 *   (기존 .jpg URL은 .webp 로 교체됨 — DB 필드 갱신으로 활성 전환, 구 .jpg 는 고아 잔존)
 *
 * dry: npx tsx scripts/fill-neo3-batch.ts
 * 적용: npx tsx scripts/fill-neo3-batch.ts --apply
 */
import "dotenv/config";
import { readFileSync, existsSync } from "node:fs";
import sharp from "sharp";
import { prisma } from "../src/lib/prisma";
import { r2KeyFor, uploadBuffer, r2PublicUrl, headExists } from "../src/lib/r2";
import { assertMappingWritable, hasAllowProtectedFlag } from "./lib/protected-groups";

const APPLY = process.argv.includes("--apply");
const SET = "jp-tcg-neo3", PACK = "og-neo3", LANG = "ja";
const CONC = 4;

async function main() {
  assertMappingWritable([PACK], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "fill-neo3-batch", what: `${PACK} 이미지 교체` });
  const ext: any[] = JSON.parse(readFileSync("tmp/neo3/tcg.json", "utf8"));
  const nums = ext.map((x) => x.number).sort();
  console.log(`${APPLY ? "APPLY" : "DRY"} fill-neo3-batch | ${nums.length}장 (lang=${LANG}, insane-search 수집)`);
  for (const n of nums) {
    const rc = await prisma.regionCard.findFirst({ where: { setId: SET, number: n, region: "JP" }, select: { name: true } });
    if (!rc) throw new Error(`#${n} RegionCard 없음`);
    if (!existsSync(`tmp/neo3/new/${n}.img`)) throw new Error(`#${n} 로컬 이미지 없음`);
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
        const buf = readFileSync(`tmp/neo3/new/${n}.img`);
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
