import { readFileSync } from "node:fs";
import sharp from "sharp";

// sample spread across the set to confirm Japanese images
const SAMPLE = ["001", "010", "020", "030", "040", "046", "050", "055", "057"];
const CW = 240, CH = 336, COLS = 3, PAD = 8, LH = 20;

async function main() {
  const cells: { input: Buffer; left: number; top: number }[] = [];
  const rows = Math.ceil(SAMPLE.length / COLS);
  const W = COLS * CW + (COLS + 1) * PAD;
  const H = rows * (CH + LH) + (rows + 1) * PAD;
  for (let i = 0; i < SAMPLE.length; i++) {
    const n = SAMPLE[i];
    const col = i % COLS, row = Math.floor(i / COLS);
    const left = PAD + col * (CW + PAD);
    const top = PAD + row * (CH + LH + PAD);
    const img = await sharp(readFileSync(`tmp/neo3/new/${n}.img`)).resize(CW, CH, { fit: "fill" }).png().toBuffer();
    cells.push({ input: img, left, top });
    const label = await sharp({ text: { text: `#${n}`, font: "sans", fontfile: undefined as any, width: CW, height: LH, rgba: true } as any })
      .png().toBuffer().catch(() => null as any);
    if (label) cells.push({ input: label, left, top: top + CH });
  }
  await sharp({ create: { width: W, height: H, channels: 3, background: { r: 30, g: 30, b: 40 } } })
    .composite(cells).png().toFile("tmp/neo3-montage.png");
  console.log("wrote tmp/neo3-montage.png", W, "x", H);
}
main().catch((e) => { console.error(e); process.exit(1); });
