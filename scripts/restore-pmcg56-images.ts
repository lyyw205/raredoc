/**
 * PMCG5/6 카드 이미지 복구. ExternalIdMapping(bulbapedia) URL 들로부터
 * 다시 이미지 다운로드 → Supabase 재업로드 → DB imageSmall/imageLarge 갱신.
 *
 * 매핑 정확성은 보장하지 않음 (이전 fix 의 결과 그대로 사용).
 * Trainer 카드의 부정확한 매핑은 followup-plans.md 에 별도 항목으로 추적.
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
const USER_AGENT = "raredoc-image-restore/0.1 (https://raredoc.local)";

const UI_BLOCKLIST = [
  /Project_/i, /Portal_/i, /_logo\.|_icon\.|_symbol\./i,
  /^Grass-attack/i, /^Fire-attack/i, /^Water-attack/i, /^Lightning-attack/i,
  /^Psychic-attack/i, /^Fighting-attack/i, /^Colorless-attack/i, /^Darkness-attack/i,
  /^Metal-attack/i, /^Fairy-attack/i, /^Dragon-attack/i,
  /^Rarity_/i, /^Bulbapedia/i, /Best_?Photo/i, /Contest/i, /Ad\.jpg$/i,
];

function isUiAsset(filename: string): boolean {
  return UI_BLOCKLIST.some((re) => re.test(filename));
}

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const { stdout } = await execFileP(
      "curl",
      ["-sSL", "--max-time", "20", "-A", USER_AGENT, url],
      { maxBuffer: 16 * 1024 * 1024 }
    );
    return stdout || null;
  } catch { return null; }
}

function extractCardImage(html: string): string | null {
  const re =
    /archives\.bulbagarden\.net\/media\/upload\/(?:thumb\/)?([a-f0-9])\/([a-f0-9]{2})\/([A-Z][^"\/<>\s]+?\.(?:jpg|png|webp))/g;
  const seen = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const [, x, xx, filename] = m;
    if (seen.has(filename)) continue;
    seen.add(filename);
    if (isUiAsset(filename)) continue;
    return `https://archives.bulbagarden.net/media/upload/${x}/${xx}/${filename}`;
  }
  return null;
}

async function downloadFile(url: string, dest: string): Promise<boolean> {
  try {
    await execFileP("curl", ["-sSL", "--max-time", "30", "-o", dest, url], { maxBuffer: 16 * 1024 * 1024 });
    const buf = await readFile(dest);
    return buf.length > 1024;
  } catch { return false; }
}

async function uploadToSupabase(localPath: string, remotePath: string, contentType: string): Promise<string | null> {
  const url = `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${remotePath}`;
  try {
    const { stdout } = await execFileP(
      "curl",
      [
        "-sS", "-X", "POST",
        "-H", `Authorization: Bearer ${SERVICE_KEY}`,
        "-H", `apikey: ${SERVICE_KEY}`,
        "-H", `Content-Type: ${contentType}`,
        "-H", "x-upsert: true",
        "--data-binary", `@${localPath}`,
        "--max-time", "60",
        url,
      ],
      { maxBuffer: 16 * 1024 * 1024 }
    );
    if (stdout.includes("Key")) {
      return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${remotePath}`;
    }
    return null;
  } catch { return null; }
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const src = await prisma.externalSource.findUniqueOrThrow({ where: { code: "bulbapedia" } });
  const mappings = await prisma.externalIdMapping.findMany({
    where: {
      sourceId: src.id,
      OR: [
        { cardLocaleId: { startsWith: "jp-tcg-PMCG5-" } },
        { cardLocaleId: { startsWith: "jp-tcg-PMCG6-" } },
      ],
    },
    select: { cardLocaleId: true, url: true },
  });
  console.log(`대상 ${mappings.length} 매핑\n`);

  const tmpRoot = join(tmpdir(), `raredoc-restore-${Date.now()}`);
  await mkdir(tmpRoot, { recursive: true });

  let ok = 0, fail = 0, noPage = 0, noImg = 0, noDl = 0, noUp = 0;
  for (const m of mappings) {
    if (!m.cardLocaleId || !m.url) { fail++; continue; }
    const html = await fetchHtml(m.url);
    await sleep(500);
    if (!html) { noPage++; fail++; console.log(`  [${m.cardLocaleId}] ✗ page fetch fail`); continue; }
    const imgUrl = extractCardImage(html);
    if (!imgUrl) { noImg++; fail++; console.log(`  [${m.cardLocaleId}] ✗ image not on page`); continue; }
    const ext = imgUrl.toLowerCase().endsWith(".png") ? "png" : "jpg";
    const remotePath = `${m.cardLocaleId}.${ext}`;
    const localPath = join(tmpRoot, remotePath);
    const ct = ext === "png" ? "image/png" : "image/jpeg";

    const dlOk = await downloadFile(imgUrl, localPath);
    if (!dlOk) { noDl++; fail++; console.log(`  [${m.cardLocaleId}] ✗ download fail`); continue; }
    const publicUrl = await uploadToSupabase(localPath, remotePath, ct);
    if (!publicUrl) { noUp++; fail++; console.log(`  [${m.cardLocaleId}] ✗ upload fail`); await unlink(localPath).catch(()=>{}); continue; }
    await prisma.cardLocale.update({
      where: { id: m.cardLocaleId },
      data: { imageSmall: publicUrl, imageLarge: publicUrl },
    });
    await unlink(localPath).catch(()=>{});
    ok++;
    if (ok % 30 === 0) console.log(`  ... ${ok} 복구`);
  }

  console.log(`\n── 결과 ──`);
  console.log(`  복구 성공: ${ok}`);
  console.log(`  실패: ${fail}   (page=${noPage}, img=${noImg}, dl=${noDl}, up=${noUp})`);
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
