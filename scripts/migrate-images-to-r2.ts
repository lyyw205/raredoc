/**
 * R2 이미지 마이그레이션 (large-canonical + 썸네일 로컬생성판)
 *
 * 외부 핫링크 large 이미지를 우리 R2 버킷으로 미러하고, 받은 large 에서 small 썸네일을 로컬 생성(sharp)해
 * 함께 올린 뒤 DB(RegionCard.imageLarge/imageSmall)를 R2 URL 로 갱신.
 *
 * 왜 large 만 받나: "large 없이 small 만" 인 카드가 전 지역 0장 → small 은 source 로서 완전 중복.
 *   소스에서 small 을 따로 받지 않고(작업 반감) large 1장만 받아 245px webp 썸네일을 파생한다.
 *
 * 정책:
 *   - large: 외부→R2 미러(원본 포맷 유지)
 *   - small: 받은 large 에서 sharp 로 width≤245 webp 썸네일 생성→R2 (소스 미페치)
 *
 * 안전장치:
 *   1. R2키 충돌: 같은 (region,setId,number) 가 2장+ 인 키(KR 47키 등)는 regionCardId 를 r2KeyFor 에 넘겨 분리.
 *   2. 동결(보호)팩 가드: 영향 cardPackId 로 assertWritable — 이미지 URL 교정이라 의도적, --allow-protected 필요.
 *   3. 기본 dry-run, --apply 명시해야 쓰기. 업로드 후 head 재확인(verify). 멱등 재실행(이미 R2면 skip).
 *
 * CLI:
 *   --language=jp|kr|en|all   (default: jp)
 *   --era=SM|S|SV|MEGA|...    (CardPack.era 정확일치, 선택)
 *   --set=<substr>            (setId 부분일치, 선택)
 *   --limit=N                 (선택)
 *   --concurrency=N           (default 6)
 *   --thumb-width=N           (default 245)
 *   --apply                   (없으면 dry-run)
 *   --allow-protected         (동결팩 포함 시 필요)
 *
 * dry-run: npx tsx scripts/migrate-images-to-r2.ts --language=jp
 * 적용:    npx tsx scripts/migrate-images-to-r2.ts --language=jp --apply --allow-protected
 */
import "dotenv/config";
import sharp from "sharp";
import { prisma } from "../src/lib/prisma";
import {
  r2KeyFor, headExists, uploadBuffer, r2PublicUrl, extFromUrl, isR2Url, contentTypeFor,
} from "../src/lib/r2";
import { assertWritable, hasAllowProtectedFlag } from "./lib/protected-groups";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import * as fs from "node:fs";
import * as path from "node:path";

const execFileP = promisify(execFile);

function getArg(name: string, fallback?: string): string | undefined {
  const p = `--${name}=`;
  const f = process.argv.find((a) => a.startsWith(p));
  return f ? f.slice(p.length) : fallback;
}
const LANG_ARG = (getArg("language", "jp") as string).toLowerCase();
const ERA_ARG = getArg("era");
const SET_ARG = getArg("set");
const LIMIT = parseInt(getArg("limit", "0") ?? "0", 10);
const CONCURRENCY = parseInt(getArg("concurrency", "6") ?? "6", 10);
const THUMB_W = parseInt(getArg("thumb-width", "245") ?? "245", 10);
const APPLY = process.argv.includes("--apply");

const MAX_RETRY = 3;
const RETRY_DELAYS = [500, 1500, 4000];
const LOG_INTERVAL = 100;
const FAIL_LOG = path.join("tmp", "r2-migration-failed.json");
const LANG_MAP: Record<string, string> = { jp: "ja", ja: "ja", kr: "ko", ko: "ko", en: "en" };

interface Row {
  id: string; language: string; region: string; setId: string; number: string;
  cardPackId: string | null; imageLarge: string;
}
interface Fail { regionCardId: string; url: string; error: string }

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
// extFromUrl 가 확장자 없는 URL 에서 경로조각을 반환할 수 있어 sane 한 확장자만 채택(아니면 jpg).
function safeExt(url: string): string {
  const e = (extFromUrl(url) || "").toLowerCase();
  return /^[a-z0-9]{2,5}$/.test(e) ? e : "jpg";
}

async function curlBuf(url: string): Promise<Buffer> {
  const tmp = `/tmp/r2dl_${process.pid}_${Math.random().toString(36).slice(2)}`;
  try {
    await execFileP("curl", ["-L", "--silent", "--fail", "--max-time", "30", "-A", "Mozilla/5.0", "-o", tmp, url]);
    return fs.readFileSync(tmp);
  } finally { try { fs.unlinkSync(tmp); } catch { /* */ } }
}
async function curlRetry(url: string): Promise<Buffer> {
  let last: Error | null = null;
  for (let i = 0; i < MAX_RETRY; i++) {
    try { const b = await curlBuf(url); if (b.length < 500) throw new Error(`too small ${b.length}b`); return b; }
    catch (e) { last = e as Error; if (i < MAX_RETRY - 1) await sleep(RETRY_DELAYS[i]); }
  }
  throw last ?? new Error("download failed");
}
async function pool<T>(items: T[], n: number, fn: (it: T, i: number) => Promise<void>) {
  let idx = 0;
  const worker = async () => { while (idx < items.length) { const i = idx++; await fn(items[i], i); } };
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, worker));
}

const failed: Fail[] = [];
function flushFailed() {
  if (!failed.length) return;
  if (!fs.existsSync("tmp")) fs.mkdirSync("tmp", { recursive: true });
  let prev: Fail[] = [];
  if (fs.existsSync(FAIL_LOG)) { try { prev = JSON.parse(fs.readFileSync(FAIL_LOG, "utf8")); } catch { /* */ } }
  fs.writeFileSync(FAIL_LOG, JSON.stringify([...prev, ...failed], null, 2));
}

async function main() {
  if (!LANG_MAP[LANG_ARG]) throw new Error(`unknown --language=${LANG_ARG}`);
  const language = LANG_MAP[LANG_ARG];
  const r2Base = process.env.R2_PUBLIC_BASE_URL ?? "";
  if (!r2Base) throw new Error("R2_PUBLIC_BASE_URL 미설정");

  console.log(`${APPLY ? "APPLY" : "DRY-RUN"} migrate-images-to-r2  lang=${language} era=${ERA_ARG ?? "-"} set=${SET_ARG ?? "-"} limit=${LIMIT || "∞"} conc=${CONCURRENCY} thumbW=${THUMB_W}`);

  // 대상: 해당 언어 + 외부(비-R2) large 보유. (small 은 large 에서 파생하므로 large 기준만 본다)
  const rows: Row[] = (await prisma.regionCard.findMany({
    where: {
      language,
      ...(SET_ARG ? { setId: { contains: SET_ARG } } : {}),
      ...(ERA_ARG ? { set: { cardPack: { era: ERA_ARG } } } : {}),
      imageLarge: { not: null },
      NOT: { imageLarge: { startsWith: r2Base } },
    },
    select: {
      id: true, language: true, region: true, setId: true, number: true,
      imageLarge: true, set: { select: { cardPackId: true } },
    },
    orderBy: [{ setId: "asc" }, { numberInt: "asc" }],
    ...(LIMIT > 0 ? { take: LIMIT } : {}),
  })).map((r) => ({
    id: r.id, language: r.language, region: r.region, setId: r.setId, number: r.number,
    cardPackId: r.set.cardPackId, imageLarge: r.imageLarge as string,
  }));
  console.log(`  대상 카드(외부 large 보유): ${rows.length}`);
  if (!rows.length) { console.log("할 일 없음."); return; }

  // ── R2키 충돌집합: 같은 (region,setId,number) 가 2장+ → 그 키들엔 regionCardId 분리 ──
  const collideKey = new Set<string>();
  {
    const grp = await prisma.$queryRaw<{ region: string; setId: string; number: string }[]>`
      SELECT "region","setId","number" FROM "CardLocale"
      GROUP BY "region","setId","number" HAVING COUNT(*) > 1`;
    for (const g of grp) collideKey.add(`${g.region}|${g.setId}|${g.number}`);
  }
  const needsDisambig = (r: Row) => collideKey.has(`${r.region}|${r.setId}|${r.number}`);
  const disambigCount = rows.filter(needsDisambig).length;

  // ── 동결팩 가드 ──
  const affected = [...new Set(rows.map((r) => r.cardPackId).filter(Boolean) as string[])];
  assertWritable(affected, { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "migrate-images-to-r2" });
  console.log(`  충돌분리(regionCardId) 적용 카드: ${disambigCount}`);

  const stats = { downloaded: 0, resumed: 0, fail: 0, bytes: 0 };
  let done = 0;

  await pool(rows, CONCURRENCY, async (row) => {
    if (!APPLY) { done++; return; } // dry-run: 범위만 집계, 네트워크/쓰기 없음
    try {
      const src = row.imageLarge;
      const ext = safeExt(src);
      const pack = row.cardPackId ?? row.setId;
      const dis = needsDisambig(row) ? row.id : undefined;
      const largeKey = r2KeyFor(pack, row.language, "large", row.setId, row.number, ext, dis);
      const smallKey = r2KeyFor(pack, row.language, "small", row.setId, row.number, "webp", dis);

      const haveLarge = await headExists(largeKey);
      const haveSmall = await headExists(smallKey);
      if (!haveLarge || !haveSmall) {
        const buf = await curlRetry(src);
        stats.bytes += buf.length;
        if (!haveLarge) await uploadBuffer(largeKey, buf, contentTypeFor(ext));
        if (!haveSmall) {
          const thumb = await sharp(buf).resize({ width: THUMB_W, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
          await uploadBuffer(smallKey, thumb, "image/webp");
        }
        if (!(await headExists(largeKey)) || !(await headExists(smallKey))) throw new Error("verify: head 실패");
        stats.downloaded++;
      } else {
        stats.resumed++; // 두 객체 이미 R2 존재 → DB만 정렬
      }
      await prisma.regionCard.update({
        where: { id: row.id },
        data: { imageLarge: r2PublicUrl(largeKey), imageSmall: r2PublicUrl(smallKey) },
      });
    } catch (e) {
      stats.fail++;
      failed.push({ regionCardId: row.id, url: row.imageLarge, error: String(e) });
    } finally {
      done++;
      if (done % LOG_INTERVAL === 0)
        console.log(`  [${done}/${rows.length}] dl=${stats.downloaded} resume=${stats.resumed} fail=${stats.fail} ${(stats.bytes / 1048576).toFixed(1)}MB`);
    }
  });

  flushFailed();
  console.log(`\n=== 결과 ===`);
  if (!APPLY) {
    console.log(`  [DRY-RUN] 마이그레이션 대상 ${rows.length}장 (각 large 다운로드 + small 썸네일 파생, 총 R2 객체 ${rows.length * 2}개)`);
    console.log(`  적용: npx tsx scripts/migrate-images-to-r2.ts --language=${LANG_ARG}${SET_ARG ? ` --set=${SET_ARG}` : ""} --apply --allow-protected`);
  } else {
    console.log(`  카드 ${rows.length} | 신규=${stats.downloaded} 재개스킵=${stats.resumed} 실패=${stats.fail}`);
    console.log(`  다운로드 ${(stats.bytes / 1048576).toFixed(1)}MB (${(stats.bytes / 1073741824).toFixed(3)}GB)`);
    if (stats.fail) console.log(`  실패 로그: ${FAIL_LOG} (재실행하면 멱등 재시도)`);
  }
}
main().catch((e) => { console.error("FAIL:", e); process.exit(1); }).finally(() => prisma.$disconnect());
