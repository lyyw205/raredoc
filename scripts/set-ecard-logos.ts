/**
 * e-Card(ポケモンカードe) E1~E5 본팩 로고 교체 — 사용자 제공 tcgc URL → R2. (Set.logoUrl FREE, 가드 불필요)
 * dry: npx tsx scripts/set-ecard-logos.ts   적용: --apply
 */
import "dotenv/config";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import sharp from "sharp";
import { prisma } from "../src/lib/prisma";
import { uploadBuffer, r2PublicUrl, headExists } from "../src/lib/r2";
const exec = promisify(execFile);
const APPLY = process.argv.includes("--apply");
const LOGOS: Record<string, string> = {
  "jp-tcg-E5": "https://static.tcgcollector.com/content/images/8d/79/df/8d79dfedd45d478eabcca37569b64c69f22166162900ff22eaab37290e5c0fc6.webp",
  "jp-tcg-E4": "https://static.tcgcollector.com/content/images/d2/05/2a/d2052ab552423e25be0c4d6cd9cb5148d203ee1e634c34c3c8d1099a837d891b.webp",
  "jp-tcg-E3": "https://static.tcgcollector.com/content/images/d8/32/c0/d832c062d79407021c32409c057440dc8df6a064764bde2638416022d9439fa8.webp",
  "jp-tcg-E2": "https://static.tcgcollector.com/content/images/73/00/a4/7300a4d15a7b0a4380371f416fa9d7617b3f1fd2c4ab7521907062d9f270e833.webp",
  "jp-tcg-E1": "https://static.tcgcollector.com/content/images/fc/24/2c/fc242c717a7942b68108d32f274ddc347a9647e56c5812d64e5a25c8f5bafe96.webp",
};
async function dl(url: string): Promise<Buffer> { const { stdout } = await exec("curl", ["-sSL", "--fail", "--max-time", "40", "-A", "Mozilla/5.0", url], { encoding: "buffer", maxBuffer: 30 * 1024 * 1024 } as any); const b = stdout as unknown as Buffer; if (b.length < 300) throw new Error("small"); return b; }
async function mirror(url: string, key: string): Promise<string> { const buf = await sharp(await dl(url)).webp({ quality: 92 }).toBuffer(); await uploadBuffer(key, buf, "image/webp"); if (!(await headExists(key))) throw new Error(`verify ${key}`); return r2PublicUrl(key); }
async function main() {
  console.log(`${APPLY ? "APPLY" : "DRY"} set-ecard-logos`);
  for (const [setId, url] of Object.entries(LOGOS)) {
    const set = await prisma.set.findUnique({ where: { id: setId }, select: { id: true, name: true } });
    if (!set) { console.log(`✗ ${setId} not found`); continue; }
    if (APPLY) { const logoUrl = await mirror(url, `set-assets/logo/${setId}.webp`); await prisma.set.update({ where: { id: setId }, data: { logoUrl } }); console.log(`✓ ${setId} (${set.name}) → ${logoUrl}`); }
    else console.log(`would update ${setId} (${set.name})`);
  }
}
main().then(() => prisma.$disconnect()).catch((e) => { console.error("FAIL:", e); prisma.$disconnect(); process.exit(1); });
