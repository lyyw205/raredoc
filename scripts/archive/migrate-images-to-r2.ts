/**
 * Phase 3: R2 이미지 마이그레이션
 *
 * 다운로드 대상:
 *   - EN: small only (large는 pokemontcg.io hotlink 유지)
 *   - JP/KR: small + large
 *
 * CLI options:
 *   --language=en|jp|kr|all   (default: all)
 *   --size=small|large|all    (default: all)
 *   --era=SM|S|SV|MEGA|all    (default: all)
 *   --limit=N                 (default: unlimited)
 *   --dry-run                 (no download/upload/DB update)
 *
 * Run: npx tsx scripts/migrate-images-to-r2.ts --language=en --size=small
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import {
  r2KeyFor,
  headExists,
  uploadBuffer,
  r2PublicUrl,
  extFromUrl,
  isR2Url,
  contentTypeFor,
} from "../src/lib/r2";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import * as fs from "node:fs";
import * as path from "node:path";

const execFileP = promisify(execFile);

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------
function getArg(name: string, fallback?: string): string | undefined {
  const prefix = `--${name}=`;
  const found = process.argv.find((a) => a.startsWith(prefix));
  return found ? found.slice(prefix.length) : fallback;
}

const LANG_ARG = getArg("language", "all") as string;
const SIZE_ARG = getArg("size", "all") as string;
const ERA_ARG = getArg("era", "all") as string;
const LIMIT = parseInt(getArg("limit", "0") ?? "0", 10);
const DRY_RUN = process.argv.includes("--dry-run");

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const CONCURRENCY = 8;
const MAX_RETRY = 3;
const RETRY_DELAYS = [500, 1500, 4000]; // ms
const LOG_INTERVAL = 100;
const FAILED_LOG_DIR = "docs";
const TODAY = new Date().toISOString().slice(0, 10).replace(/-/g, "");
const FAILED_LOG_PATH = path.join(FAILED_LOG_DIR, `r2-migration-failed-${TODAY}.json`);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface CardRow {
  id: string;
  language: string;
  setId: string;
  number: string;
  cardPackId: string | null;
  imageSmall: string | null;
  imageLarge: string | null;
}

interface FailEntry {
  regionCardId: string;
  size: "small" | "large";
  originalUrl: string;
  error: string;
}

// ---------------------------------------------------------------------------
// Download via curl (WSL network workaround)
// ---------------------------------------------------------------------------
async function downloadWithCurl(url: string): Promise<Buffer> {
  const tmpPath = `/tmp/r2_dl_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  try {
    await execFileP("curl", [
      "-L",
      "--silent",
      "--fail",
      "--max-time", "30",
      "--retry", "0", // we handle retries ourselves
      "-o", tmpPath,
      url,
    ]);
    const buf = fs.readFileSync(tmpPath);
    return buf;
  } finally {
    try { fs.unlinkSync(tmpPath); } catch { /* ignore */ }
  }
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function downloadWithRetry(url: string): Promise<Buffer> {
  let lastErr: Error | null = null;
  for (let attempt = 0; attempt < MAX_RETRY; attempt++) {
    try {
      return await downloadWithCurl(url);
    } catch (err) {
      lastErr = err as Error;
      if (attempt < MAX_RETRY - 1) {
        await sleep(RETRY_DELAYS[attempt]);
      }
    }
  }
  throw lastErr ?? new Error("download failed");
}

// ---------------------------------------------------------------------------
// Build query filters
// ---------------------------------------------------------------------------
function buildLanguageFilter(): string[] {
  if (LANG_ARG === "all") return ["en", "ja", "ko"];
  const map: Record<string, string> = { en: "en", jp: "ja", kr: "ko", ja: "ja", ko: "ko" };
  const mapped = map[LANG_ARG.toLowerCase()];
  if (!mapped) throw new Error(`Unknown language: ${LANG_ARG}`);
  return [mapped];
}

// ---------------------------------------------------------------------------
// Fetch target cards from DB
// ---------------------------------------------------------------------------
async function fetchTargets(languages: string[], sizes: ("small" | "large")[]): Promise<CardRow[]> {
  // Build era filter
  let eraFilter = "";
  if (ERA_ARG !== "all") {
    const eraMap: Record<string, string> = {
      SM: "SM",
      S: "S (소드·실드)",
      SV: "SV",
      MEGA: "MEGA",
    };
    const era = eraMap[ERA_ARG.toUpperCase()] ?? ERA_ARG;
    eraFilter = `AND sg.era = '${era.replace(/'/g, "''")}'`;
  }

  const langList = languages.map((l) => `'${l}'`).join(", ");

  // We need to find cards where at least one of the requested sizes
  // has a non-null URL that isn't already R2
  const r2Base = (process.env.R2_PUBLIC_BASE_URL ?? "").replace(/'/g, "''");

  const sql = `
    SELECT
      cl.id,
      cl.language,
      cl."setId",
      cl.number,
      s."setGroupId",
      cl."imageSmall",
      cl."imageLarge"
    FROM "CardLocale" cl
    JOIN "Set" s ON s.id = cl."setId"
    LEFT JOIN "SetGroup" sg ON sg.id = s."setGroupId"
    WHERE
      cl.language IN (${langList})
      ${eraFilter}
      AND (
        ${sizes.includes("small") ? `(cl."imageSmall" IS NOT NULL AND cl."imageSmall" NOT LIKE '${r2Base}%')` : "FALSE"}
        ${sizes.includes("large") ? `OR (cl."imageLarge" IS NOT NULL AND cl."imageLarge" NOT LIKE '${r2Base}%')` : ""}
      )
    ORDER BY cl.language, cl."setId", cl.number
    ${LIMIT > 0 ? `LIMIT ${LIMIT}` : ""}
  `;

  return prisma.$queryRawUnsafe<CardRow[]>(sql);
}

// ---------------------------------------------------------------------------
// Concurrency pool
// ---------------------------------------------------------------------------
async function runWithConcurrency<T>(
  items: T[],
  concurrency: number,
  fn: (item: T, idx: number) => Promise<void>
): Promise<void> {
  let idx = 0;
  async function worker() {
    while (idx < items.length) {
      const i = idx++;
      await fn(items[i], i);
    }
  }
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, worker);
  await Promise.all(workers);
}

// ---------------------------------------------------------------------------
// Persist failed log
// ---------------------------------------------------------------------------
let failedEntries: FailEntry[] = [];

function appendFailed(entry: FailEntry) {
  failedEntries.push(entry);
}

function flushFailed() {
  if (failedEntries.length === 0) return;
  if (!fs.existsSync(FAILED_LOG_DIR)) fs.mkdirSync(FAILED_LOG_DIR, { recursive: true });
  let existing: FailEntry[] = [];
  if (fs.existsSync(FAILED_LOG_PATH)) {
    try { existing = JSON.parse(fs.readFileSync(FAILED_LOG_PATH, "utf-8")); } catch { /* ignore */ }
  }
  fs.writeFileSync(FAILED_LOG_PATH, JSON.stringify([...existing, ...failedEntries], null, 2));
  failedEntries = [];
}

// ---------------------------------------------------------------------------
// Process a single (card, size) pair
// ---------------------------------------------------------------------------
async function processOne(
  card: CardRow,
  size: "small" | "large",
  stats: { tried: number; succeeded: number; skipped: number; failed: number; bytes: number }
): Promise<void> {
  // EN: skip large (hotlink preserved)
  if (card.language === "en" && size === "large") return;

  const originalUrl = size === "small" ? card.imageSmall : card.imageLarge;
  if (!originalUrl) return;
  if (isR2Url(originalUrl)) {
    // Already R2 — just make sure DB is correct (it should be)
    stats.skipped++;
    return;
  }

  stats.tried++;

  const cardPackId = card.cardPackId ?? card.setId; // fallback if no group
  const ext = extFromUrl(originalUrl);
  const key = r2KeyFor(cardPackId, card.language, size, card.setId, card.number, ext);

  try {
    // Check R2 existence
    const exists = await headExists(key);

    if (!exists) {
      if (DRY_RUN) {
        // dry-run: just pretend success
        stats.succeeded++;
        stats.bytes += 50_000; // rough estimate
        return;
      }
      // Download
      const buf = await downloadWithRetry(originalUrl);
      stats.bytes += buf.length;
      // Upload
      await uploadBuffer(key, buf, contentTypeFor(ext));
    }

    // DB update
    const publicUrl = r2PublicUrl(key);
    if (!DRY_RUN) {
      await prisma.regionCard.update({
        where: { id: card.id },
        data: size === "small" ? { imageSmall: publicUrl } : { imageLarge: publicUrl },
      });
    }
    stats.succeeded++;
  } catch (err) {
    stats.failed++;
    appendFailed({
      regionCardId: card.id,
      size,
      originalUrl,
      error: String(err),
    });
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const languages = buildLanguageFilter();
  const sizes: ("small" | "large")[] = SIZE_ARG === "all"
    ? ["small", "large"]
    : [SIZE_ARG as "small" | "large"];

  // EN never downloads large
  const effectiveSizes = languages.includes("en") && !languages.some((l) => l !== "en")
    ? sizes.filter((s) => s !== "large")
    : sizes;

  console.log(`migrate-images-to-r2 START${DRY_RUN ? " [DRY RUN]" : ""}`);
  console.log(`  language: ${languages.join(", ")}  size: ${sizes.join(", ")}  era: ${ERA_ARG}  limit: ${LIMIT || "unlimited"}  concurrency: ${CONCURRENCY}`);

  const cards = await fetchTargets(languages, sizes);
  console.log(`  Target cards: ${cards.length}`);

  if (cards.length === 0) {
    console.log("Nothing to do.");
    return;
  }

  // Build work items: (card, size) pairs
  type WorkItem = { card: CardRow; size: "small" | "large" };
  const workItems: WorkItem[] = [];
  for (const card of cards) {
    for (const size of sizes) {
      if (card.language === "en" && size === "large") continue; // EN large: skip
      const url = size === "small" ? card.imageSmall : card.imageLarge;
      if (!url || isR2Url(url)) continue;
      workItems.push({ card, size });
    }
  }
  console.log(`  Work items: ${workItems.length}`);

  const stats = { tried: 0, succeeded: 0, skipped: 0, failed: 0, bytes: 0 };
  let processed = 0;

  await runWithConcurrency(workItems, CONCURRENCY, async ({ card, size }) => {
    await processOne(card, size, stats);
    processed++;
    if (processed % LOG_INTERVAL === 0) {
      const pct = ((processed / workItems.length) * 100).toFixed(1);
      const mb = (stats.bytes / 1_048_576).toFixed(1);
      console.log(`  [${processed}/${workItems.length}] ${pct}% | ok=${stats.succeeded} skip=${stats.skipped} fail=${stats.failed} ${mb}MB`);
    }
  });

  flushFailed();

  const totalMb = (stats.bytes / 1_048_576).toFixed(2);
  const totalGb = (stats.bytes / 1_073_741_824).toFixed(3);
  console.log(`\nFINAL STATS:`);
  console.log(`  Work items   : ${workItems.length}`);
  console.log(`  Succeeded    : ${stats.succeeded}`);
  console.log(`  Skipped(R2)  : ${stats.skipped}`);
  console.log(`  Failed       : ${stats.failed}`);
  console.log(`  Total bytes  : ${stats.bytes} (${totalMb} MB / ${totalGb} GB)`);
  if (stats.failed > 0) {
    console.log(`  Failed log   : ${FAILED_LOG_PATH}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
