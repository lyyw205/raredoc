import { readFileSync, existsSync } from "node:fs";
import sharp from "sharp";

// focus on the 3 mismatch pairs
const NUMS = ["023", "024", "028", "029", "030", "031"];
const CW = 280, CH = 392, PAD = 6;

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
    comp.push({ input: await cell(`tmp/neo2/cmp/db_${n}.img`), left, top: PAD });
    comp.push({ input: await cell(`tmp/neo2/cmp/tcg_${n}.img`), left, top: PAD + CH + PAD });
  }
  await sharp({ create: { width: W, height: H, channels: 3, background: { r: 25, g: 25, b: 30 } } })
    .composite(comp).png().toFile("tmp/neo2-zoom.png");
  console.log("wrote tmp/neo2-zoom.png", W, "x", H, "| TOP=DB current, BOTTOM=tcg | cols:", NUMS.join(" "));
}
main().catch((e) => { console.error(e); process.exit(1); });
