/**
 * PCG1~PCG9 본팩 로고 교체 — 사용자 제공 tcgc 로고 URL → R2 미러. (Set.logoUrl = FREE, 가드 불필요)
 * dry: npx tsx scripts/set-pcg-logos.ts   적용: --apply
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
  "jp-tcg-PCG9": "https://static.tcgcollector.com/content/images/b7/ac/dd/b7acddb1fe5f11ae9ccf982a6e7d54dcc70bb2ba11ff78245af3aa6f1657eb95.webp",
  "jp-tcg-PCG8": "https://static.tcgcollector.com/content/images/fc/32/0d/fc320dba7101c542143989a4b9d5c3e7dd06d55fb0e1dc711c4607569202e417.webp",
  "jp-tcg-PCG7": "https://static.tcgcollector.com/content/images/32/a5/e8/32a5e8a525fd28b7f37c3b8a10664d26b09d533e6d3aaeab17675a604915bfca.webp",
  "jp-tcg-PCG6": "https://static.tcgcollector.com/content/images/0b/35/25/0b352541977aeb14b3ab35324f640c94910e23da7df61636342231891bfb4977.webp",
  "jp-tcg-PCG5": "https://static.tcgcollector.com/content/images/31/fa/ac/31faac38364b57849879a836c0fede64ec07b8b3e511e0353f7c92f38278e876.webp",
  "jp-tcg-PCG4": "https://static.tcgcollector.com/content/images/09/96/f7/0996f7ccb421eef097f6ac3e2de933683de40cbe4fd4d7566cf1f9514e9dd873.webp",
  "jp-tcg-PCG3": "https://static.tcgcollector.com/content/images/27/44/18/274418ea525559b1490e3c7732d454c713e8b3820b8b64cae86cd4a54a5f7349.webp",
  "jp-tcg-PCG2": "https://static.tcgcollector.com/content/images/93/29/fb/9329fbad7b1ba4984c7b5f881e012dbf878a49c751e45272076941bdbc08b927.webp",
  "jp-tcg-PCG1": "https://static.tcgcollector.com/content/images/97/b1/31/97b1316ab116eb783f15f9f9233923c2fae23b9f9c67648f1abfe766031a5014.webp",
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
  console.log(`${APPLY ? "APPLY" : "DRY"} set-pcg-logos`);
  for (const [setId, url] of Object.entries(LOGOS)) {
    const set = await prisma.set.findUnique({ where: { id: setId }, select: { id: true, name: true } });
    if (!set) { console.log(`✗ ${setId} not found`); continue; }
    if (APPLY) {
      const logoUrl = await mirror(url, `set-assets/logo/${setId}.webp`);
      await prisma.set.update({ where: { id: setId }, data: { logoUrl } });
      console.log(`✓ ${setId} (${set.name}) → ${logoUrl}`);
    } else {
      console.log(`would update ${setId} (${set.name})`);
    }
  }
}
main().then(() => prisma.$disconnect()).catch((e) => { console.error("FAIL:", e); prisma.$disconnect(); process.exit(1); });
