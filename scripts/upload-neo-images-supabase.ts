/**
 * NEO1~4 이미지를 Bulbapedia 에서 다운로드 → Supabase Storage 업로드
 * → DB imageSmall/imageLarge URL 갱신.
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

const SETS = ["neo1","neo2","neo3","neo4"];

async function downloadToFile(url: string, dest: string): Promise<boolean> {
  try {
    await execFileP("curl", ["-sSL","--max-time","30","-o",dest,url], { maxBuffer: 16*1024*1024 });
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

async function main() {
  const tmpRoot = join(tmpdir(), `raredoc-neo-${Date.now()}`);
  await mkdir(tmpRoot, { recursive: true });
  let ok=0, fail=0, skip=0;

  for (const set of SETS) {
    const cards = await prisma.cardLocale.findMany({
      where: { id: { startsWith: `jp-tcg-${set}-` }, imageSmall: { startsWith: "https://archives.bulbagarden.net/" } },
      select: { id: true, imageSmall: true, name: true },
      orderBy: { id: "asc" },
    });
    console.log(`\n─── ${set}: ${cards.length}장 ───`);
    for (const c of cards) {
      const ext = c.imageSmall!.toLowerCase().endsWith(".png") ? "png" : "jpg";
      const remote = `${c.id}.${ext}`;
      const local = join(tmpRoot, remote);
      const ct = ext === "png" ? "image/png" : "image/jpeg";

      const dlOk = await downloadToFile(c.imageSmall!, local);
      if (!dlOk) { console.log(`  [${c.id}] ${c.name.slice(0,15).padEnd(15)} ✗ dl`); fail++; continue; }
      const publicUrl = await uploadToSupabase(local, remote, ct);
      if (!publicUrl) { console.log(`  [${c.id}] ${c.name.slice(0,15).padEnd(15)} ✗ up`); fail++; await unlink(local).catch(()=>{}); continue; }
      await prisma.cardLocale.update({ where: { id: c.id }, data: { imageSmall: publicUrl, imageLarge: publicUrl } });
      await unlink(local).catch(()=>{});
      ok++;
      if (ok % 30 === 0) console.log(`  ... ${ok} OK`);
      await sleep(50);
    }
  }
  console.log(`\n══════ 결과 ══════  OK ${ok}, skip ${skip}, fail ${fail}`);
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
