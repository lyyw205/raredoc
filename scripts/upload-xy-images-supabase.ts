/**
 * XY era JP/KR 카드 이미지를 tcgplayer-cdn (400w) 에서 다운로드 → Supabase 업로드.
 * → DB imageSmall/imageLarge URL 갱신.
 *
 * 대상: jp-tcg-XY* 및 jp-tcg-CP* 및 kr-xy* 및 kr-cp* 세트 중 tcgplayer URL 보유 카드.
 *
 * Run: npx tsx scripts/upload-xy-images-supabase.ts [--set=jp-tcg-XY1a]
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile, unlink, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
const execFileP = promisify(execFile);

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BUCKET = "card-images";

// All JP XY + CP + KR XY/CP set IDs
const ALL_SETS = [
  // JP XY
  "jp-tcg-XY1a", "jp-tcg-XY1b", "jp-tcg-XY2", "jp-tcg-XY3", "jp-tcg-XY4",
  "jp-tcg-XY5a", "jp-tcg-XY6", "jp-tcg-XY7", "jp-tcg-XY8a", "jp-tcg-XY8b",
  "jp-tcg-XY9", "jp-tcg-XY10", "jp-tcg-XY11a",
  // JP CP
  "jp-tcg-CP1", "jp-tcg-CP2", "jp-tcg-CP3", "jp-tcg-CP4", "jp-tcg-CP5", "jp-tcg-CP6",
  // KR XY (those with kr- prefix that exist)
  "kr-xy1", "kr-xy2", "kr-xy3", "kr-xy4", "kr-xy5",
  "kr-xy7", "kr-xy8", "kr-xy9", "kr-xy10", "kr-xy11",
  "kr-cp1", "kr-cp2", "kr-cp3", "kr-cp4", "kr-cp5",
];

async function downloadToFile(url: string, dest: string): Promise<boolean> {
  try {
    await execFileP("curl", ["-sSL", "--max-time", "20", "-A", "Mozilla/5.0", "-o", dest, url], { maxBuffer: 16 * 1024 * 1024 });
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
      "--max-time", "60", url,
    ], { maxBuffer: 16 * 1024 * 1024 });
    if (stdout.includes("Key")) return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${remotePath}`;
    return null;
  } catch { return null; }
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

function bigVariant(smallUrl: string): string {
  return smallUrl.replace(/_200w\.jpg$/i, "_400w.jpg").replace(/_200w\.png$/i, "_400w.png");
}

async function processSet(setId: string, tmpRoot: string): Promise<{ ok: number; fail: number; skip: number }> {
  const cards = await prisma.regionCard.findMany({
    where: { setId, imageSmall: { contains: "tcgplayer" } },
    select: { id: true, imageSmall: true, name: true },
    orderBy: { id: "asc" },
  });
  console.log(`\n─── ${setId}: ${cards.length} tcgplayer 카드 ───`);
  if (cards.length === 0) return { ok: 0, fail: 0, skip: 0 };

  let ok = 0, fail = 0, skip = 0;

  for (const c of cards) {
    const srcUrl = bigVariant(c.imageSmall!);
    const ext = srcUrl.toLowerCase().endsWith(".png") ? "png" : "jpg";
    const remote = `${c.id}.${ext}`;
    const local = join(tmpRoot, remote);
    const ct = ext === "png" ? "image/png" : "image/jpeg";

    const dlOk = await downloadToFile(srcUrl, local);
    if (!dlOk) {
      console.log(`  [${c.id}] ${c.name.slice(0, 15).padEnd(15)} ✗ dl`);
      fail++;
      continue;
    }

    const publicUrl = await uploadToSupabase(local, remote, ct);
    if (!publicUrl) {
      console.log(`  [${c.id}] ${c.name.slice(0, 15).padEnd(15)} ✗ up`);
      fail++;
      await unlink(local).catch(() => {});
      continue;
    }

    await prisma.regionCard.update({
      where: { id: c.id },
      data: { imageSmall: publicUrl, imageLarge: publicUrl },
    });
    await unlink(local).catch(() => {});
    ok++;
    if (ok % 50 === 0) console.log(`  ... ${ok} OK`);
    await sleep(50);
  }

  return { ok, fail, skip };
}

async function main() {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 환경변수 필요");
    process.exit(1);
  }

  const arg = process.argv.find(a => a.startsWith("--set="));
  const setsToRun = arg ? [arg.slice("--set=".length)] : ALL_SETS;

  const tmpRoot = join(tmpdir(), `raredoc-xy-${Date.now()}`);
  await mkdir(tmpRoot, { recursive: true });

  let totalOk = 0, totalFail = 0;

  for (const setId of setsToRun) {
    // Check set exists
    const set = await prisma.set.findUnique({ where: { id: setId }, select: { id: true } });
    if (!set) { console.log(`⚠ ${setId} DB에 없음 — skip`); continue; }

    const r = await processSet(setId, tmpRoot);
    totalOk += r.ok;
    totalFail += r.fail;
    console.log(`  → ok=${r.ok}, fail=${r.fail}`);
  }

  console.log(`\n══════ 결과 ══════  OK ${totalOk}, fail ${totalFail}`);
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
