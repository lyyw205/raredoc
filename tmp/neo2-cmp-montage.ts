import { readFileSync, existsSync } from "node:fs";
import sharp from "sharp";

const NUMS = ["021", "022", "023", "024", "025", "026", "027", "028", "029", "030", "031"];
const CW = 150, CH = 210, PAD = 4, LH = 16;

async function cell(path: string): Promise<Buffer> {
  if (existsSync(path)) return sharp(readFileSync(path)).resize(CW, CH, { fit: "fill" }).png().toBuffer();
  return sharp({ create: { width: CW, height: CH, channels: 3, background: { r: 80, g: 20, b: 20 } } }).png().toBuffer();
}

async function main() {
  const cols = NUMS.length;
  const W = cols * CW + (cols + 1) * PAD;
  const H = LH + 2 * (CH + LH) + 3 * PAD;
  const comp: { input: Buffer; left: number; top: number }[] = [];
  for (let i = 0; i < cols; i++) {
    const n = NUMS[i];
    const left = PAD + i * (CW + PAD);
    const db = await cell(`tmp/neo2/cmp/db_${n}.img`);
    const tcg = await cell(`tmp/neo2/cmp/tcg_${n}.img`);
    comp.push({ input: db, left, top: LH + PAD });
    comp.push({ input: tcg, left, top: LH + PAD + CH + LH + PAD });
  }
  await sharp({ create: { width: W, height: H, channels: 3, background: { r: 25, g: 25, b: 30 } } })
    .composite(comp).png().toFile("tmp/neo2-cmp.png");
  console.log("wrote tmp/neo2-cmp.png", W, "x", H, "| top=DB current, bottom=tcgcollector | cols=", NUMS.join(" "));
}
main().catch((e) => { console.error(e); process.exit(1); });
