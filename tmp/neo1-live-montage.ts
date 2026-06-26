import { readFileSync } from "node:fs";
import sharp from "sharp";

const SAMPLE = ["009", "029", "052", "065", "080", "091", "094", "095", "096"];
const CW = 250, CH = 350, COLS = 3, PAD = 6;

async function main() {
  const cells: { input: Buffer; left: number; top: number }[] = [];
  const rows = Math.ceil(SAMPLE.length / COLS);
  const W = COLS * CW + (COLS + 1) * PAD;
  const H = rows * CH + (rows + 1) * PAD;
  for (let i = 0; i < SAMPLE.length; i++) {
    const n = SAMPLE[i];
    const col = i % COLS, row = Math.floor(i / COLS);
    const img = await sharp(readFileSync(`tmp/neo1/live_${n}.img`)).resize(CW, CH, { fit: "fill" }).png().toBuffer();
    cells.push({ input: img, left: PAD + col * (CW + PAD), top: PAD + row * (CH + PAD) });
  }
  await sharp({ create: { width: W, height: H, channels: 3, background: { r: 30, g: 30, b: 40 } } })
    .composite(cells).png().toFile("tmp/neo1-live.png");
  console.log("wrote tmp/neo1-live.png", W, "x", H);
}
main().catch((e) => { console.error(e); process.exit(1); });
