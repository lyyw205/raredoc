/**
 * PT2 시각검증 몽타주: 각 매칭쌍 [공식 ref | 사용자] 나란히 + 번호 라벨. 2시트로 분할.
 */
import { readFileSync, writeFileSync } from "node:fs";
import sharp from "sharp";

const CW = 200, CH = 280, GAP = 6, LABEL = 26;
const PAIR_W = CW * 2 + GAP;          // ref|user
const CELL_W = PAIR_W + 16;
const CELL_H = CH + LABEL + 12;
const COLS = 2;                        // 2 pairs per row

function labelSvg(txt: string, w: number) {
  return Buffer.from(`<svg width="${w}" height="${LABEL}"><rect width="100%" height="100%" fill="#111"/><text x="6" y="18" font-family="sans-serif" font-size="15" fill="#fff">${txt}</text></svg>`);
}

async function buildSheet(items: any[], outPath: string) {
  const rows = Math.ceil(items.length / COLS);
  const W = CELL_W * COLS + 12;
  const Hh = CELL_H * rows + 12;
  const base = sharp({ create: { width: W, height: Hh, channels: 3, background: "#222" } });
  const comps: sharp.OverlayOptions[] = [];
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const r = Math.floor(i / COLS), c = i % COLS;
    const x0 = 6 + c * CELL_W, y0 = 6 + r * CELL_H;
    const refImg = await sharp(`tmp/pt2-refimg/${it.number}.png`).resize(CW, CH, { fit: "fill" }).toBuffer();
    const usrImg = await sharp(it.userFile.replace(".img", ".png")).resize(CW, CH, { fit: "fill" }).toBuffer();
    comps.push({ input: labelSvg(`#${it.number} ${it.name}  corr=${it.corr}`, PAIR_W), left: x0, top: y0 });
    comps.push({ input: refImg, left: x0, top: y0 + LABEL + 4 });
    comps.push({ input: usrImg, left: x0 + CW + GAP, top: y0 + LABEL + 4 });
  }
  await base.composite(comps).png().toFile(outPath);
  console.log(`  ${outPath} (${items.length}쌍)`);
}

async function main() {
  const m: any[] = JSON.parse(readFileSync("tmp/pt2-automatch.json", "utf8"));
  m.sort((a, b) => a.number.localeCompare(b.number));
  const half = Math.ceil(m.length / 2);
  await buildSheet(m.slice(0, half), "tmp/pt2-verify-1.png");
  await buildSheet(m.slice(half), "tmp/pt2-verify-2.png");
  console.log("좌=공식(pokemon-card.com .gif 프레임0) / 우=사용자(tcgcollector 클린)");
}
main().catch((e) => { console.error("FAIL:", e); process.exit(1); });
