/**
 * L1a, L1b, L2, LL, L3 JP 카드 이미지를 Bulbapedia 에서 다운로드하여 Supabase 업로드.
 * tcgplayer-cdn 403 → Bulbapedia archives 에서 직접 취득.
 *
 * Run: npx tsx scripts/upload-l-images-supabase.ts [--set=L1a]
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile, unlink, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
const execFileP = promisify(execFile);

const WIKI_BASE = "https://bulbapedia.bulbagarden.net";
const ARCH_BASE = "https://archives.bulbagarden.net";
const USER_AGENT = "raredoc-sync/0.1 (https://raredoc.local; non-commercial research)";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BUCKET = "card-images";

// Map DB setId to Bulbapedia page + section anchor
const SET_MAP = [
  { setId: "L1a", page: "HeartGold_%26_SoulSilver_(TCG)", sectionId: "HeartGold_Collection", expectCount: 71 },
  { setId: "L1b", page: "HeartGold_%26_SoulSilver_(TCG)", sectionId: "SoulSilver_Collection", expectCount: 71 },
  { setId: "L2",  page: "Undaunted_(TCG)",                sectionId: "Reviving_Legends",      expectCount: 19 },
  { setId: "LL",  page: "Call_of_Legends_(TCG)",          sectionId: "Call_of_Legends",       expectCount: 40 },
  { setId: "L3",  page: "Triumphant_(TCG)",               sectionId: "Clash_at_the_Summit",   expectCount: 81 },
];

const UI_BLOCKLIST = [
  /Project_/i, /Portal_/i, /_logo\.|_icon\.|_symbol\./i,
  /^Grass-attack/i, /^Fire-attack/i, /^Water-attack/i, /^Lightning-attack/i,
  /^Psychic-attack/i, /^Fighting-attack/i, /^Colorless-attack/i, /^Darkness-attack/i,
  /^Metal-attack/i, /^Fairy-attack/i, /^Dragon-attack/i,
  /^Rarity_/i, /^Bulbapedia/i, /Best_?Photo/i, /Contest/i, /Ad\.jpg$/i,
  /SetSymbol/i,
];

function isUiAsset(filename: string): boolean {
  return UI_BLOCKLIST.some(re => re.test(filename));
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const { stdout } = await execFileP("curl", ["-sSL", "--max-time", "20", "-A", USER_AGENT, url], { maxBuffer: 16 * 1024 * 1024 });
    return stdout || null;
  } catch { return null; }
}

async function downloadToFile(url: string, dest: string): Promise<boolean> {
  try {
    await execFileP("curl", ["-sSL", "--max-time", "30", "-A", "Mozilla/5.0", "-o", dest, url], { maxBuffer: 16 * 1024 * 1024 });
    const buf = await readFile(dest);
    return buf.length > 1024;
  } catch { return false; }
}

async function uploadToSupabase(localPath: string, remotePath: string, contentType: string): Promise<string | null> {
  const url = `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${remotePath}`;
  try {
    const { stdout } = await execFileP("curl", [
      "-sS", "-X", "POST",
      "-H", `Authorization: Bearer ${SERVICE_KEY}`,
      "-H", `apikey: ${SERVICE_KEY}`,
      "-H", `Content-Type: ${contentType}`,
      "-H", "x-upsert: true",
      "--data-binary", `@${localPath}`,
      "--max-time", "60",
      url,
    ], { maxBuffer: 16 * 1024 * 1024 });
    if (stdout.includes("Key")) {
      return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${remotePath}`;
    }
    return null;
  } catch { return null; }
}

function extractCardImage(html: string): string | null {
  const re = /archives\.bulbagarden\.net\/media\/upload\/(?:thumb\/)?([a-f0-9])\/([a-f0-9]{2})\/([A-Z][^"/<>\s]+?\.(?:jpg|png|webp))/g;
  const seen = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const [, x, xx, filename] = m;
    if (seen.has(filename)) continue;
    seen.add(filename);
    if (isUiAsset(filename)) continue;
    return `${ARCH_BASE}/media/upload/${x}/${xx}/${filename}`;
  }
  return null;
}

type CardRow = { number: string; slug: string; suffix: string };

function parseCardRows(chunk: string): CardRow[] {
  const rows: CardRow[] = [];
  const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/g;
  let m: RegExpExecArray | null;
  while ((m = rowRe.exec(chunk)) !== null) {
    const row = m[1];
    const numMatch = row.match(/>\s*(\d{1,3})\/\d+\s*</);
    if (!numMatch) continue;
    const number = numMatch[1].padStart(3, "0");
    const linkMatch = row.match(/\/wiki\/([^"'\s]+)_\(([^)]+)\)/);
    if (!linkMatch) continue;
    const slug = linkMatch[1];
    const suffix = linkMatch[2];
    if (slug.includes("Energy") || slug === "Rarity") continue;
    rows.push({ number, slug, suffix });
  }
  return rows;
}

async function processSet(setDef: typeof SET_MAP[number], tmpRoot: string) {
  console.log(`\n─── jp-tcg-${setDef.setId}  page=${setDef.page}  section="${setDef.sectionId}" ───`);

  const pageUrl = `${WIKI_BASE}/wiki/${setDef.page}`;
  const html = await fetchHtml(pageUrl);
  if (!html) { console.log("  ✗ page fetch failed"); return { uploaded: 0, skipped: 0, fail: 0 }; }

  const startIdx = html.indexOf(`id="${setDef.sectionId}"`);
  if (startIdx === -1) { console.log(`  ✗ section anchor "${setDef.sectionId}" not found`); return { uploaded: 0, skipped: 0, fail: 0 }; }

  const rest = html.slice(startIdx);
  const nextSection = rest.slice(1).search(/<h[23][^>]*id=/i);
  const chunk = nextSection > 0 ? rest.slice(0, nextSection + 1) : rest.slice(0, 300000);

  const cardRows = parseCardRows(chunk);
  console.log(`  parsed ${cardRows.length} rows (expected ~${setDef.expectCount})`);

  let uploaded = 0, skipped = 0, fail = 0;

  for (const card of cardRows) {
    // DB stores numbers unpadded ("1", "2"…); Bulbapedia gives zero-padded ("001").
    const numUnpadded = String(parseInt(card.number, 10));
    const locale = await prisma.cardLocale.findFirst({
      where: { setId: `jp-tcg-${setDef.setId}`, number: numUnpadded },
      select: { id: true, imageSmall: true, logicalCardId: true },
    });
    if (!locale) { fail++; continue; }

    // Skip if already has non-tcgplayer URL
    if (locale.imageSmall && !locale.imageSmall.includes("tcgplayer")) {
      skipped++;
      continue;
    }

    // Fetch card page for image
    const cardUrl = `${WIKI_BASE}/wiki/${card.slug}_(${card.suffix})`;
    const cardHtml = await fetchHtml(cardUrl);
    await sleep(700);
    if (!cardHtml) { fail++; console.log(`  [${card.number}] fetch fail`); continue; }

    const imgUrl = extractCardImage(cardHtml);
    if (!imgUrl) { fail++; console.log(`  [${card.number}] no image found`); continue; }

    // Download + upload
    const ext = imgUrl.split(".").pop() ?? "jpg";
    const tmpPath = join(tmpRoot, `l-card-${setDef.setId}-${card.number}.${ext}`);
    const ok = await downloadToFile(imgUrl, tmpPath);
    if (!ok) { fail++; console.log(`  [${card.number}] download fail`); continue; }

    const remotePath = `jp/${setDef.setId.toLowerCase()}/${card.number}.${ext}`;
    const publicUrl = await uploadToSupabase(tmpPath, remotePath, `image/${ext === "jpg" ? "jpeg" : ext}`);
    await unlink(tmpPath).catch(() => {});

    if (!publicUrl) { fail++; console.log(`  [${card.number}] upload fail`); continue; }

    await prisma.cardLocale.update({
      where: { id: locale.id },
      data: { imageSmall: publicUrl, imageLarge: publicUrl },
    });
    uploaded++;
    console.log(`  [${card.number}] ✓ ${remotePath}`);
  }

  console.log(`  uploaded=${uploaded} skipped=${skipped} fail=${fail}`);
  return { uploaded, skipped, fail };
}

async function main() {
  const arg = process.argv.find(a => a.startsWith("--set="));
  const setsToRun = arg
    ? SET_MAP.filter(s => s.setId.toLowerCase() === arg.slice("--set=".length).toLowerCase())
    : SET_MAP;

  const tmpRoot = join(tmpdir(), "raredoc-l-images");
  await mkdir(tmpRoot, { recursive: true });

  let totals = { uploaded: 0, skipped: 0, fail: 0 };
  for (const setDef of setsToRun) {
    const r = await processSet(setDef, tmpRoot);
    totals.uploaded += r.uploaded;
    totals.skipped += r.skipped;
    totals.fail += r.fail;
  }

  console.log(`\n══════ 결과 ══════`);
  console.log(`  uploaded: ${totals.uploaded}`);
  console.log(`  skipped:  ${totals.skipped}`);
  console.log(`  fail:     ${totals.fail}`);

  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
