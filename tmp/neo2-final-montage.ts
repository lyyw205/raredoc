import { readFileSync, existsSync } from "node:fs";
import sharp from "sharp";

const NUMS = ["023", "024", "025", "026", "027", "028", "029", "030", "031"];
const CW = 180, CH = 252, PAD = 5;

async function cell(path: string): Promise<Buffer> {
  if (existsSync(path)) return sharp(readFileSync(path)).resize(CW, CH, { fit: "fill" }).png().toBuffer();
  return sharp({ create: { width: CW, height: CH, channels: 3, background: { r: 80, g: 20, b: 20 } } }).png().toBuffer();
}

async function main() {
  const cols = NUMS.length;
  const W = cols * CW + (cols + 1) * PAD;
  const H = 2 * CH + 3 * PAD;
  const comp: { input: Buffer; left: number; top: number }[] = [];
  for (let i = 0; i < cols; i++) {
    const n = NUMS[i];
    const left = PAD + i * (CW + PAD);
    comp.push({ input: await cell(`tmp/neo2/final_jp_${n}.img`), left, top: PAD });
    comp.push({ input: await cell(`tmp/neo2/final_en_${n}.img`), left, top: PAD + CH + PAD });
  }
  await sharp({ create: { width: W, height: H, channels: 3, background: { r: 25, g: 25, b: 30 } } })
    .composite(comp).png().toFile("tmp/neo2-final.png");
  console.log("wrote tmp/neo2-final.png", W, "x", H, "| TOP=live JP, BOTTOM=bound EN | cols:", NUMS.join(" "));
}
main().catch((e) => { console.error(e); process.exit(1); });
