/**
 * ワールドチャンピオンズパック (jp-tcg-PCG10, og-pcg10) 전면 이미지 재수집 — 영어 EX Power Keepers → 일본어 WCP.
 *
 * 배경: 이 세트는 region=JP인데 102장 전부 영어 EX Power Keepers(ex16) 스캔으로 오수집됨(이름·이미지 영어).
 *   진짜 ワールドチャンピオンズパック은 일본어 카드. 사용자가 tcgcollector 세트 페이지(11271) HTML 제공 →
 *   108장(영어이름+WCP번호 NNN/108 + 일본어 카드 이미지) 추출(tmp/pcg10/wcp-extracted.json).
 *   ★우리 DB 번호 == WCP 번호 검증완(영어이름 조인 102/102 일치; 9건은 ☆/아포스트로피/"2" 표기차뿐).
 *   ★16샘플 [영어|일본어] 시각검증 — 같은 카드의 일본어판 확정(タネボー/リザードン/ダイゴのアドバイス 등).
 *
 * 동작: 다운된 tcgcollector JP 이미지(tmp/pcg10/jp/{N}.img, 320w) → webp large(q90)+245 small(q80)
 *   → R2 og-pcg10/jp/{size}/jp-tcg-PCG10/{N}.webp → RegionCard imageLarge/Small UPDATE.
 *   ★이미지 전용(이 패스). 이름(영어→일본어)·기본에너지 6장 추가는 별도 단계. EN ex16 연결 불변.
 *   대상: 우리 DB 보유 102장(번호 1~102). 기본에너지 #103~108 은 미보유라 제외.
 *
 * dry: npx tsx scripts/recollect-pcg10-jp-images.ts
 * 적용: npx tsx scripts/recollect-pcg10-jp-images.ts --apply
 */
import "dotenv/config";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import sharp from "sharp";
import { prisma } from "../src/lib/prisma";
import { r2KeyFor, uploadBuffer, r2PublicUrl, headExists } from "../src/lib/r2";
import { assertWritable, hasAllowProtectedFlag } from "./lib/protected-groups";

const APPLY = process.argv.includes("--apply");
const SET = "jp-tcg-PCG10", PACK = "og-pcg10", LANG = "jp";
const CONC = 4;
const fails: any[] = [];

async function one(n: string, stats: any) {
  try {
    const rc = await prisma.regionCard.findFirst({ where: { setId: SET, number: n, region: "JP" }, select: { id: true } });
    if (!rc) throw new Error("RegionCard 없음");
    const f = `tmp/pcg10/jp/${n}.img`;
    if (!existsSync(f)) throw new Error("로컬 이미지 없음");
    const buf = readFileSync(f);
    const meta = await sharp(buf).metadata();
    if (!meta.width || meta.width < 250) throw new Error(`이미지 의심 w=${meta.width}`);
    const largeKey = r2KeyFor(PACK, LANG, "large", SET, n, "webp");
    const smallKey = r2KeyFor(PACK, LANG, "small", SET, n, "webp");
    if (APPLY) {
      await uploadBuffer(largeKey, await sharp(buf).webp({ quality: 90 }).toBuffer(), "image/webp");
      await uploadBuffer(smallKey, await sharp(buf).resize({ width: 245, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer(), "image/webp");
      if (!(await headExists(largeKey)) || !(await headExists(smallKey))) throw new Error("R2 verify 실패");
      await prisma.regionCard.update({ where: { id: rc.id }, data: { imageLarge: r2PublicUrl(largeKey), imageSmall: r2PublicUrl(smallKey) } });
    }
    stats.ok++;
  } catch (e: any) { stats.fail++; fails.push({ number: n, error: String(e?.message ?? e) }); }
  finally { stats.done++; if (stats.done % 20 === 0 || stats.done === stats.total) console.log(`  [${stats.done}/${stats.total}] ok=${stats.ok} fail=${stats.fail}`); }
}

async function main() {
  assertWritable([PACK], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "recollect-pcg10-jp-images" });
  // 대상 = 우리 DB 보유 102장 (번호 1~102)
  const db = await prisma.regionCard.findMany({ where: { setId: SET, region: "JP" }, select: { number: true }, orderBy: { number: "asc" } });
  const nums = db.map((r) => r.number);
  console.log(`${APPLY ? "APPLY" : "DRY"} recollect-pcg10-jp-images | 대상 ${nums.length}장 (lang=${LANG})`);
  // 사전: 로컬 이미지 전수 존재
  const missing = nums.filter((n) => !existsSync(`tmp/pcg10/jp/${n}.img`));
  if (missing.length) throw new Error(`로컬 이미지 누락: ${missing.join(",")}`);
  console.log(`  로컬 이미지 전수 확인: ${nums.length}장`);
  if (!APPLY) { console.log("적용: --apply"); return; }
  const stats = { total: nums.length, done: 0, ok: 0, fail: 0 };
  let idx = 0;
  const worker = async () => { while (idx < nums.length) { const i = idx++; await one(nums[i], stats); } };
  await Promise.all(Array.from({ length: CONC }, worker));
  if (fails.length) writeFileSync("tmp/pcg10-recollect-failed.json", JSON.stringify(fails, null, 2));
  console.log(`\n=== 결과 === ok=${stats.ok} fail=${stats.fail}`);
}
main().catch((e) => { console.error("FAIL:", e); process.exit(1); }).finally(() => prisma.$disconnect());
