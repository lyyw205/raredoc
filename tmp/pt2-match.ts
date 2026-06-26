/**
 * PT2 자동매칭: 사용자 제공 26장(tmp/pt2replace/u*.img) ↔ 공식 누락 26장(tmp/pt2-ref-missing.json).
 *   perceptual fingerprint(24x33 grayscale blur normalize) 상관계수로 26x26 비용행렬 → 탐욕 전단사.
 *   결과: tmp/pt2-automatch.json (number↔userFile, corr) + 몽타주 입력 목록.
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import sharp from "sharp";

const exec = promisify(execFile);
const W = 24, H = 33;

type Ref = { number: string; name: string; imageUrl: string; cardID: string };

async function fpFromBuffer(buf: Buffer): Promise<Float64Array> {
  const raw = await sharp(buf, { animated: false, page: 0 })
    .removeAlpha().grayscale().resize(W, H, { fit: "fill" }).blur(1.0)
    .raw().toBuffer();
  const n = W * H;
  const v = new Float64Array(n);
  for (let i = 0; i < n; i++) v[i] = raw[i];
  let mean = 0; for (let i = 0; i < n; i++) mean += v[i]; mean /= n;
  let varr = 0; for (let i = 0; i < n; i++) { const d = v[i] - mean; varr += d * d; } varr /= n;
  const std = Math.sqrt(varr) || 1;
  for (let i = 0; i < n; i++) v[i] = (v[i] - mean) / std;
  return v;
}
function corr(a: Float64Array, b: Float64Array): number {
  let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s / a.length;
}
async function dl(url: string): Promise<Buffer> {
  const { stdout } = await exec("curl", ["-sSL", "--fail", "--max-time", "40", "-A", "Mozilla/5.0", url], { maxBuffer: 20 * 1024 * 1024, encoding: "buffer" } as any);
  return stdout as unknown as Buffer;
}

async function main() {
  const refs: Ref[] = JSON.parse(readFileSync("tmp/pt2-ref-missing.json", "utf8"));
  refs.sort((a, b) => a.number.localeCompare(b.number));
  const cacheDir = "tmp/pt2-refimg";
  if (!existsSync(cacheDir)) mkdirSync(cacheDir, { recursive: true });

  // 공식 레퍼런스 fingerprint
  const refFp: { number: string; name: string; fp: Float64Array }[] = [];
  for (const r of refs) {
    const cache = `${cacheDir}/${r.number}.gif`;
    let buf: Buffer;
    if (existsSync(cache)) buf = readFileSync(cache);
    else { buf = await dl(r.imageUrl); writeFileSync(cache, buf); await new Promise((s) => setTimeout(s, 200)); }
    refFp.push({ number: r.number, name: r.name, fp: await fpFromBuffer(buf) });
    // PNG 프리뷰(몽타주용)
    await sharp(buf, { animated: false, page: 0 }).resize(220, 308, { fit: "fill" }).png().toFile(`${cacheDir}/${r.number}.png`);
  }

  // 사용자 이미지 fingerprint
  const userFp: { file: string; idx: number; fp: Float64Array }[] = [];
  for (let i = 1; i <= 26; i++) {
    const f = `tmp/pt2replace/u${String(i).padStart(2, "0")}.img`;
    const buf = readFileSync(f);
    userFp.push({ file: f, idx: i, fp: await fpFromBuffer(buf) });
    await sharp(buf).resize(220, 308, { fit: "fill" }).png().toFile(`tmp/pt2replace/u${String(i).padStart(2, "0")}.png`);
  }

  // 비용행렬 + 탐욕 전단사
  const pairs: { ri: number; ui: number; c: number }[] = [];
  for (let ri = 0; ri < refFp.length; ri++)
    for (let ui = 0; ui < userFp.length; ui++)
      pairs.push({ ri, ui, c: corr(refFp[ri].fp, userFp[ui].fp) });
  pairs.sort((a, b) => b.c - a.c);
  const usedR = new Set<number>(), usedU = new Set<number>();
  const match: any[] = [];
  for (const p of pairs) {
    if (usedR.has(p.ri) || usedU.has(p.ui)) continue;
    usedR.add(p.ri); usedU.add(p.ui);
    match.push({ number: refFp[p.ri].number, name: refFp[p.ri].name, userFile: userFp[p.ui].file, userIdx: userFp[p.ui].idx, corr: +p.c.toFixed(4) });
  }
  match.sort((a, b) => a.number.localeCompare(b.number));

  // 각 ref 의 2등 후보(모호도 점검)
  for (const m of match) {
    const ri = refFp.findIndex((r) => r.number === m.number);
    const scored = userFp.map((u) => ({ idx: u.idx, c: corr(refFp[ri].fp, u.fp) })).sort((a, b) => b.c - a.c);
    m.best = scored[0].idx; m.bestC = +scored[0].c.toFixed(4);
    m.second = scored[1].idx; m.secondC = +scored[1].c.toFixed(4);
    m.margin = +(scored[0].c - scored[1].c).toFixed(4);
  }

  writeFileSync("tmp/pt2-automatch.json", JSON.stringify(match, null, 2));
  console.log("number  user  corr   margin  (best/second)");
  for (const m of match) {
    const flag = m.corr < 0.55 ? "  ⚠LOW" : m.margin < 0.05 ? "  ⚠close" : "";
    console.log(`  #${m.number}  u${String(m.userIdx).padStart(2, "0")}  ${m.corr.toFixed(3)}  ${m.margin.toFixed(3)}   (u${m.best}/${m.bestC} u${m.second}/${m.secondC})${flag}  ${m.name}`);
  }
  const lowOrClose = match.filter((m) => m.corr < 0.55 || m.margin < 0.05);
  console.log(`\n전단사 26쌍 완료. 주의(corr<0.55 또는 margin<0.05): ${lowOrClose.length}건`);
}
main().catch((e) => { console.error("FAIL:", e); process.exit(1); });
