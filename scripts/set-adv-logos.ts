/**
 * ADV1~ADV5 본팩 로고 교체 — 사용자 제공 tcgc 로고 URL → R2 미러. (Set.logoUrl = FREE, 가드 불필요)
 * dry: npx tsx scripts/set-adv-logos.ts   적용: --apply
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
  "jp-tcg-ADV5": "https://static.tcgcollector.com/content/images/f7/1d/6c/f71d6ccafd260f79c31ce99d7ff71083bc6f5f5e211201aa6edb958fb3d711a4.webp",
  "jp-tcg-ADV4": "https://static.tcgcollector.com/content/images/6b/53/4b/6b534bfe95b53e73363a1af9e0beffda538aba6af9c33d866625721924bf963a.webp",
  "jp-tcg-ADV3": "https://static.tcgcollector.com/content/images/ca/20/fb/ca20fbeab0b459bb6adb3af8cdbddb64aede81014a47f15bc61721bd080440eb.webp",
  "jp-tcg-ADV2": "https://static.tcgcollector.com/content/images/82/61/9d/82619ddfd6f43150d47ea02e520e9e262cf142541471f60f802ecf2d22f94f50.webp",
  "jp-tcg-ADV1": "https://static.tcgcollector.com/content/images/3b/6b/94/3b6b94311e8ec09bf23c79deaa526f810388b672faf7e1e99481a2eff7f4a49b.webp",
};

async function dl(url: string): Promise<Buffer> {
  const { stdout } = await exec("curl", ["-sSL", "--fail", "--max-time", "40", "-A", "Mozilla/5.0", url], { encoding: "buffer", maxBuffer: 30 * 1024 * 1024 } as any);
  const b = stdout as unknown as Buffer; if (b.length < 300) throw new Error("small"); return b;
}
async function mirror(url: string, key: string): Promise<string> {
  const buf = await sharp(await dl(url)).webp({ quality: 92 }).toBuffer();
  await uploadBuffer(key, buf, "image/webp");
  if (!(await headExists(key))) throw new Error(`verify ${key}`);
  return r2PublicUrl(key);
}
async function main() {
  console.log(`${APPLY ? "APPLY" : "DRY"} set-adv-logos`);
  for (const [setId, url] of Object.entries(LOGOS)) {
    const set = await prisma.set.findUnique({ where: { id: setId }, select: { id: true, name: true } });
    if (!set) { console.log(`✗ ${setId} not found`); continue; }
    if (APPLY) {
      const logoUrl = await mirror(url, `set-assets/logo/${setId}.webp`);
      await prisma.set.update({ where: { id: setId }, data: { logoUrl } });
      console.log(`✓ ${setId} (${set.name}) → ${logoUrl}`);
    } else console.log(`would update ${setId} (${set.name})`);
  }
}
main().then(() => prisma.$disconnect()).catch((e) => { console.error("FAIL:", e); prisma.$disconnect(); process.exit(1); });
