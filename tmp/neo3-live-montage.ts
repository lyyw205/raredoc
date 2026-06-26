import { readFileSync } from "node:fs";
import sharp from "sharp";

const SAMPLE = ["001", "015", "025", "035", "045", "057"];
const CW = 300, CH = 420, COLS = 3, PAD = 8;

async function main() {
  const cells: { input: Buffer; left: number; top: number }[] = [];
  const rows = Math.ceil(SAMPLE.length / COLS);
  const W = COLS * CW + (COLS + 1) * PAD;
  const H = rows * CH + (rows + 1) * PAD;
  for (let i = 0; i < SAMPLE.length; i++) {
    const n = SAMPLE[i];
    const col = i % COLS, row = Math.floor(i / COLS);
    const left = PAD + col * (CW + PAD);
    const top = PAD + row * (CH + PAD);
    const img = await sharp(readFileSync(`tmp/neo3/live_${n}.img`)).resize(CW, CH, { fit: "fill" }).png().toBuffer();
    cells.push({ input: img, left, top });
  }
  await sharp({ create: { width: W, height: H, channels: 3, background: { r: 30, g: 30, b: 40 } } })
    .composite(cells).png().toFile("tmp/neo3-live-montage.png");
  console.log("wrote tmp/neo3-live-montage.png", W, "x", H);
}
main().catch((e) => { console.error(e); process.exit(1); });
