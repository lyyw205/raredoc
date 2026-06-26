/**
 * PT1 자동매칭: 사용자 20장(tmp/pt1replace/u*.img) ↔ 공식 누락 21장(tmp/pt1-ref-missing.json).
 *   refs(21) > users(20): 탐욕 전단사로 20쌍 매칭, 남는 ref 1장 = 사용자 미제공 카드.
 *   레퍼런스 이미지는 resultAPI 썸네일(클린 .jpg). 결과 tmp/pt1-automatch.json.
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import sharp from "sharp";
const ex = promisify(execFile);
const W = 24, H = 33;
const USERS = 20;
type Ref = { number: string; name: string; imageUrl: string; thumbUrl: string; cardID: string };

async function fp(buf: Buffer): Promise<Float64Array> {
  const raw = await sharp(buf, { animated: false, page: 0 }).removeAlpha().grayscale().resize(W, H, { fit: "fill" }).blur(1.0).raw().toBuffer();
  const n = W * H, v = new Float64Array(n);
  for (let i = 0; i < n; i++) v[i] = raw[i];
  let m = 0; for (let i = 0; i < n; i++) m += v[i]; m /= n;
  let s = 0; for (let i = 0; i < n; i++) { const d = v[i] - m; s += d * d; } s = Math.sqrt(s / n) || 1;
  for (let i = 0; i < n; i++) v[i] = (v[i] - m) / s;
  return v;
}
const corr = (a: Float64Array, b: Float64Array) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s / a.length; };
async function dl(url: string): Promise<Buffer> {
  const { stdout } = await ex("curl", ["-sSL", "--fail", "--max-time", "40", "-A", "Mozilla/5.0", url], { maxBuffer: 20 * 1024 * 1024, encoding: "buffer" } as any);
  return stdout as unknown as Buffer;
}

async function main() {
  const refs: Ref[] = JSON.parse(readFileSync("tmp/pt1-ref-missing.json", "utf8"));
  refs.sort((a, b) => a.number.localeCompare(b.number));
  const dir = "tmp/pt1-refimg"; if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const refFp: { number: string; name: string; fp: Float64Array }[] = [];
  for (const r of refs) {
    const cache = `${dir}/${r.number}.img`;
    let buf: Buffer;
    if (existsSync(cache)) buf = readFileSync(cache);
    else {
      try { buf = await dl(r.thumbUrl); }
      catch { buf = await dl(r.imageUrl); } // 썸네일 없으면 large(.gif) 폴백
      writeFileSync(cache, buf); await new Promise((s) => setTimeout(s, 200));
    }
    refFp.push({ number: r.number, name: r.name, fp: await fp(buf) });
    await sharp(buf, { animated: false, page: 0 }).resize(220, 308, { fit: "fill" }).png().toFile(`${dir}/${r.number}.png`);
  }
  const userFp: { idx: number; file: string; fp: Float64Array }[] = [];
  for (let i = 1; i <= USERS; i++) {
    const f = `tmp/pt1replace/u${String(i).padStart(2, "0")}.img`;
    const buf = readFileSync(f);
    userFp.push({ idx: i, file: f, fp: await fp(buf) });
    await sharp(buf).resize(220, 308, { fit: "fill" }).png().toFile(`tmp/pt1replace/u${String(i).padStart(2, "0")}.png`);
  }
  // 탐욕 전단사 (users=20 <= refs=21)
  const pairs: { ri: number; ui: number; c: number }[] = [];
  for (let ri = 0; ri < refFp.length; ri++) for (let ui = 0; ui < userFp.length; ui++) pairs.push({ ri, ui, c: corr(refFp[ri].fp, userFp[ui].fp) });
  pairs.sort((a, b) => b.c - a.c);
  const usedR = new Set<number>(), usedU = new Set<number>(), match: any[] = [];
  for (const p of pairs) { if (usedR.has(p.ri) || usedU.has(p.ui)) continue; usedR.add(p.ri); usedU.add(p.ui); match.push({ number: refFp[p.ri].number, name: refFp[p.ri].name, userFile: userFp[p.ui].file, userIdx: userFp[p.ui].idx, corr: +p.c.toFixed(4) }); }
  const leftover = refFp.filter((_, ri) => !usedR.has(ri)).map((r) => ({ number: r.number, name: r.name }));
  // 모호도(각 매칭 ref의 2등)
  for (const m of match) {
    const ri = refFp.findIndex((r) => r.number === m.number);
    const sc = userFp.map((u) => ({ idx: u.idx, c: corr(refFp[ri].fp, u.fp) })).sort((a, b) => b.c - a.c);
    m.margin = +(sc[0].c - sc[1].c).toFixed(4); m.second = sc[1].idx; m.secondC = +sc[1].c.toFixed(4);
  }
  match.sort((a, b) => a.number.localeCompare(b.number));
  writeFileSync("tmp/pt1-automatch.json", JSON.stringify(match, null, 2));
  console.log("number  user  corr   margin  name");
  for (const m of match) {
    const flag = m.corr < 0.55 ? "  ⚠LOW" : m.margin < 0.05 ? "  ⚠close" : "";
    console.log(`  #${m.number}  u${String(m.userIdx).padStart(2, "0")}  ${m.corr.toFixed(3)}  ${m.margin.toFixed(3)}${flag}  ${m.name}`);
  }
  console.log(`\n매칭 ${match.length}쌍 | 남은 ref(사용자 미제공) ${leftover.length}: ${leftover.map((l) => `#${l.number} ${l.name}`).join(", ")}`);
  const bad = match.filter((m) => m.corr < 0.55 || m.margin < 0.05);
  console.log(`주의(corr<0.55 또는 margin<0.05): ${bad.length}건`);
  writeFileSync("tmp/pt1-leftover.json", JSON.stringify(leftover, null, 2));
}
main().catch((e) => { console.error("FAIL:", e); process.exit(1); });
