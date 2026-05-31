/**
 * E1~5 + VS1 + web1 이미지를 tcgplayer-cdn (400w) 에서 다운로드 → Supabase 업로드
 * → DB imageSmall/imageLarge URL 갱신.
 *
 * 현재 DB 는 tcgplayer 의 200w (작은 썸네일) URL 가짐. 다운로드 시 _400w 로 변환.
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

const SETS = ["E1","E2","E3","E4","E5","VS1","web1"];

async function downloadToFile(url: string, dest: string): Promise<boolean> {
  try {
    await execFileP("curl", ["-sSL","--max-time","20","-A","Mozilla/5.0","-o",dest,url], { maxBuffer: 16*1024*1024 });
    const buf = await readFile(dest);
    return buf.length > 1024;
  } catch { return false; }
}

async function uploadToSupabase(localPath: string, remotePath: string, contentType: string): Promise<string | null> {
  const url = `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${remotePath}`;
  try {
    const { stdout } = await execFileP("curl", [
      "-sS","-X","POST",
      "-H",`Authorization: Bearer ${SERVICE_KEY}`,
      "-H",`apikey: ${SERVICE_KEY}`,
      "-H",`Content-Type: ${contentType}`,
      "-H","x-upsert: true",
      "--data-binary",`@${localPath}`,
      "--max-time","60", url,
    ], { maxBuffer: 16*1024*1024 });
    if (stdout.includes("Key")) return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${remotePath}`;
    return null;
  } catch { return null; }
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

function bigVariant(smallUrl: string): string {
  // 200w → 400w 변환
  return smallUrl.replace(/_200w\.jpg$/i, "_400w.jpg").replace(/_200w\.png$/i, "_400w.png");
}

async function main() {
  const tmpRoot = join(tmpdir(), `raredoc-ecard-${Date.now()}`);
  await mkdir(tmpRoot, { recursive: true });
  let ok=0, fail=0;

  for (const set of SETS) {
    const cards = await prisma.cardLocale.findMany({
      where: { setId: `jp-tcg-${set}`, imageSmall: { contains: "tcgplayer" } },
      select: { id: true, imageSmall: true, name: true },
      orderBy: { id: "asc" },
    });
    console.log(`\n─── ${set}: ${cards.length}장 ───`);
    for (const c of cards) {
      const srcUrl = bigVariant(c.imageSmall!);
      const ext = srcUrl.toLowerCase().endsWith(".png") ? "png" : "jpg";
      const remote = `${c.id}.${ext}`;
      const local = join(tmpRoot, remote);
      const ct = ext === "png" ? "image/png" : "image/jpeg";

      const dlOk = await downloadToFile(srcUrl, local);
      if (!dlOk) { console.log(`  [${c.id}] ${c.name.slice(0,15).padEnd(15)} ✗ dl`); fail++; continue; }
      const publicUrl = await uploadToSupabase(local, remote, ct);
      if (!publicUrl) { console.log(`  [${c.id}] ${c.name.slice(0,15).padEnd(15)} ✗ up`); fail++; await unlink(local).catch(()=>{}); continue; }
      await prisma.cardLocale.update({ where: { id: c.id }, data: { imageSmall: publicUrl, imageLarge: publicUrl } });
      await unlink(local).catch(()=>{});
      ok++;
      if (ok % 50 === 0) console.log(`  ... ${ok} OK`);
      await sleep(50);
    }
  }
  console.log(`\n══════ 결과 ══════  OK ${ok}, fail ${fail}`);
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
