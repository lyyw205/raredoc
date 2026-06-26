/**
 * PT1 시각검증 몽타주: 매칭쌍 [공식 ref | 사용자] + 번호 라벨. 2시트. 마지막에 미제공 #038 ref 단독.
 */
import { readFileSync } from "node:fs";
import sharp from "sharp";
const CW = 200, CH = 280, GAP = 6, LABEL = 26;
const PAIR_W = CW * 2 + GAP, CELL_W = PAIR_W + 16, CELL_H = CH + LABEL + 12, COLS = 2;
function lbl(t: string, w: number) { return Buffer.from(`<svg width="${w}" height="${LABEL}"><rect width="100%" height="100%" fill="#111"/><text x="6" y="18" font-family="sans-serif" font-size="14" fill="#fff">${t}</text></svg>`); }

async function sheet(items: any[], out: string, opts: { leftoverNumber?: string; leftoverName?: string } = {}) {
  const extra = opts.leftoverNumber ? 1 : 0;
  const rows = Math.ceil((items.length + extra) / COLS);
  const W = CELL_W * COLS + 12, Hh = CELL_H * rows + 12;
  const comps: sharp.OverlayOptions[] = [];
  for (let i = 0; i < items.length; i++) {
    const it = items[i], r = Math.floor(i / COLS), c = i % COLS;
    const x0 = 6 + c * CELL_W, y0 = 6 + r * CELL_H;
    const refImg = await sharp(`tmp/pt1-refimg/${it.number}.png`).resize(CW, CH, { fit: "fill" }).toBuffer();
    const usrImg = await sharp(it.userFile.replace(".img", ".png")).resize(CW, CH, { fit: "fill" }).toBuffer();
    comps.push({ input: lbl(`#${it.number} ${it.name}  c=${it.corr} m=${it.margin}`, PAIR_W), left: x0, top: y0 });
    comps.push({ input: refImg, left: x0, top: y0 + LABEL + 4 });
    comps.push({ input: usrImg, left: x0 + CW + GAP, top: y0 + LABEL + 4 });
  }
  if (opts.leftoverNumber) {
    const i = items.length, r = Math.floor(i / COLS), c = i % COLS;
    const x0 = 6 + c * CELL_W, y0 = 6 + r * CELL_H;
    const refImg = await sharp(`tmp/pt1-refimg/${opts.leftoverNumber}.png`).resize(CW, CH, { fit: "fill" }).toBuffer();
    const blank = Buffer.from(`<svg width="${CW}" height="${CH}"><rect width="100%" height="100%" fill="#400"/><text x="12" y="${CH / 2}" font-family="sans-serif" font-size="16" fill="#fff">미제공</text></svg>`);
    comps.push({ input: lbl(`#${opts.leftoverNumber} ${opts.leftoverName} (사용자 미제공·공식만)`, PAIR_W), left: x0, top: y0 });
    comps.push({ input: refImg, left: x0, top: y0 + LABEL + 4 });
    comps.push({ input: await sharp(blank).png().toBuffer(), left: x0 + CW + GAP, top: y0 + LABEL + 4 });
  }
  await sharp({ create: { width: W, height: Hh, channels: 3, background: "#222" } }).composite(comps).png().toFile(out);
  console.log(`  ${out} (${items.length}쌍${extra ? " +미제공1" : ""})`);
}

async function main() {
  const m: any[] = JSON.parse(readFileSync("tmp/pt1-automatch.json", "utf8"));
  const lo: any[] = JSON.parse(readFileSync("tmp/pt1-leftover.json", "utf8"));
  m.sort((a, b) => a.number.localeCompare(b.number));
  const half = Math.ceil(m.length / 2);
  await sheet(m.slice(0, half), "tmp/pt1-verify-1.png");
  await sheet(m.slice(half), "tmp/pt1-verify-2.png", { leftoverNumber: lo[0]?.number, leftoverName: lo[0]?.name });
  console.log("좌=공식(pokemon-card.com pg105 썸네일) / 우=사용자(tcgcollector)");
}
main().catch((e) => { console.error("FAIL:", e); process.exit(1); });
