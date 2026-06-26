/**
 * tcgdex 워터마크 이미지를 Limitless 클린본으로 교체 (범용판).
 *
 * 배경: 일부 신상 JP 세트(SV8a 테라스타르페스타, SV2a 151 등) 이미지 출처가 tcgdex 였고,
 *   tcgdex 본에 워터마크 엠블럼이 박혀있음(현재 R2 ↔ tcgdex md5 동일로 확인). Limitless 는 클린.
 *
 * 동작(카드별): Limitless 상세 LG 다운로드 → webp large(q90)+245 small(q80)
 *   → ★버전키(`{num}_vN.webp`)로 업로드(캐시 우회) → DB imageLarge/Small 갱신 → 기존 객체 삭제.
 *
 * 보호(동결)팩이면 --allow-protected 필요. 이미지 URL 교정이라 EN/KR 매칭 불변.
 *
 * 예) 151:  npx tsx scripts/fix-watermark-limitless.ts --set=jp-sv-151 --pack=sv-151 --code=SV2a --apply --allow-protected
 *     dry:  npx tsx scripts/fix-watermark-limitless.ts --set=jp-sv-151 --pack=sv-151 --code=SV2a
 */
import "dotenv/config";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import * as fs from "node:fs";
import sharp from "sharp";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { prisma } from "../src/lib/prisma";
import { getR2Client, uploadBuffer, r2PublicUrl, headExists } from "../src/lib/r2";
import { assertWritable, hasAllowProtectedFlag } from "./lib/protected-groups";

const exec = promisify(execFile);
function arg(name: string, def?: string): string | undefined { const p = `--${name}=`; const f = process.argv.find((a) => a.startsWith(p)); return f ? f.slice(p.length) : def; }
const APPLY = process.argv.includes("--apply");
const SET = arg("set")!, PACK = arg("pack")!, LCODE = arg("code")!, VER = arg("ver", "v2")!;
if (!SET || !PACK || !LCODE) { console.error("필수: --set --pack --code"); process.exit(1); }
const CONC = 4, MAX_RETRY = 3, RETRY = [400, 1200, 3000];
const FAILLOG = `tmp/wm-${SET}-failed.json`;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function curlText(url: string): Promise<string> { try { const { stdout } = await exec("curl", ["-sSL", "--max-time", "25", "-A", "Mozilla/5.0", url], { maxBuffer: 16 * 1024 * 1024 }); return stdout; } catch { return ""; } }
async function curlBuf(url: string): Promise<Buffer> {
  for (let i = 0; i < MAX_RETRY; i++) {
    try { const { stdout } = await exec("curl", ["-sSL", "--fail", "--max-time", "30", "-A", "Mozilla/5.0", url], { maxBuffer: 20 * 1024 * 1024, encoding: "buffer" } as any); const b = stdout as unknown as Buffer; if (b.length > 3000) return b; throw new Error(`small ${b.length}`); }
    catch (e) { if (i < MAX_RETRY - 1) await sleep(RETRY[i]); else throw e; }
  }
  throw new Error("dl failed");
}
function extractLG(html: string, n: number): string | null {
  const lg = html.match(new RegExp(`https://[^"' ]*${LCODE}_${n}_[A-Za-z0-9]+(?:_JP)?_LG\\.(?:png|jpg|webp)`));
  if (lg) return lg[0];
  const sm = html.match(new RegExp(`https://[^"' ]*${LCODE}_${n}_[A-Za-z0-9]+(?:_JP)?_SM\\.(?:png|jpg|webp)`));
  return sm ? sm[0].replace("_SM.", "_LG.") : null;
}
const fails: any[] = [];
async function deleteKey(key: string) { await getR2Client().send(new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET!, Key: key })); }

async function processCard(row: { id: string; number: string; name: string }, stats: any) {
  const n = parseInt(row.number, 10);
  try {
    const html = await curlText(`https://limitlesstcg.com/cards/jp/${LCODE}/${n}`);
    if (!html.includes(LCODE)) throw new Error("detail empty");
    const url = extractLG(html, n);
    if (!url) throw new Error("LG 추출 실패");
    const buf = await curlBuf(url);
    const meta = await sharp(buf).metadata();
    if (!meta.width || meta.width < 300) throw new Error(`이미지 의심 w=${meta.width}`);
    const largeBuf = await sharp(buf).webp({ quality: 90 }).toBuffer();
    const smallBuf = await sharp(buf).resize({ width: 245, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
    const newLargeKey = `${PACK}/ja/large/${SET}/${row.number}_${VER}.webp`;
    const newSmallKey = `${PACK}/ja/small/${SET}/${row.number}_${VER}.webp`;
    const oldLargeKey = `${PACK}/ja/large/${SET}/${row.number}.webp`;
    const oldSmallKey = `${PACK}/ja/small/${SET}/${row.number}.webp`;
    if (APPLY) {
      await uploadBuffer(newLargeKey, largeBuf, "image/webp");
      await uploadBuffer(newSmallKey, smallBuf, "image/webp");
      if (!(await headExists(newLargeKey)) || !(await headExists(newSmallKey))) throw new Error("verify 실패");
      await prisma.regionCard.updateMany({ where: { setId: SET, number: row.number, region: "JP" }, data: { imageLarge: r2PublicUrl(newLargeKey), imageSmall: r2PublicUrl(newSmallKey) } });
      for (const k of [oldLargeKey, oldSmallKey]) { try { await deleteKey(k); } catch { /* */ } }
    }
    stats.ok++;
  } catch (e: any) { stats.fail++; fails.push({ number: row.number, name: row.name, error: String(e?.message ?? e) }); }
  finally { stats.done++; if (stats.done % 20 === 0) console.log(`  [${stats.done}/${stats.total}] ok=${stats.ok} fail=${stats.fail}`); await sleep(120); }
}

async function main() {
  assertWritable([PACK], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "fix-watermark-limitless" });
  const rows = await prisma.regionCard.findMany({ where: { setId: SET, region: "JP" }, select: { id: true, number: true, name: true }, orderBy: { numberInt: "asc" } });
  console.log(`${APPLY ? "APPLY" : "DRY-RUN"} fix-watermark-limitless | set=${SET} pack=${PACK} code=${LCODE} | ${rows.length}장 → _${VER} 발행+기존삭제`);
  if (!APPLY) { console.log("샘플 3장 LG 추출:"); for (const r of rows.slice(0, 3)) { const h = await curlText(`https://limitlesstcg.com/cards/jp/${LCODE}/${parseInt(r.number)}`); console.log(`  #${r.number} ${r.name} → ${extractLG(h, parseInt(r.number)) ?? "추출실패"}`); } console.log("\n적용: --apply --allow-protected"); return; }
  const stats = { total: rows.length, done: 0, ok: 0, fail: 0 };
  let idx = 0;
  const worker = async () => { while (idx < rows.length) { const i = idx++; await processCard(rows[i], stats); } };
  await Promise.all(Array.from({ length: CONC }, worker));
  if (fails.length) { if (!fs.existsSync("tmp")) fs.mkdirSync("tmp"); fs.writeFileSync(FAILLOG, JSON.stringify(fails, null, 2)); }
  console.log(`\n=== 결과 ===  ok=${stats.ok} fail=${stats.fail}${fails.length ? ` (로그 ${FAILLOG})` : ""}`);
  const cov = await prisma.regionCard.count({ where: { setId: SET, region: "JP", imageLarge: { contains: `_${VER}.webp` } } });
  console.log(`DB _${VER} 커버리지: ${cov}/${rows.length}`);
}
main().catch((e) => { console.error("FAIL:", e); process.exit(1); }).finally(() => prisma.$disconnect());
