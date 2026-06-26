/**
 * NEO4 이미지 체크: 각 DB 카드 이미지 vs tcgcollector JP 이미지(권위) 영역분할 지문대조.
 *   같은 카드면 일러(art) corr 높음. DB가 영어이미지면 일러는 같아도 텍스트(banner+attack) corr 낮음(언어 다름).
 *   판정: art<0.55=WRONG(다른카드) / art정상 & text낮음=EN_IMG(영어이미지 혼입) / 그외=OK(올바른 일본판).
 *   읽기 전용 — DB 변경 없음. 결과 tmp/neo4/imgcheck.json.
 */
import "dotenv/config";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import sharp from "sharp";
import { prisma } from "../src/lib/prisma";

const ex = promisify(execFile);
const CW = 357, CH = 500;
const BANNER = { x0: 0.05, y0: 0.04, x1: 0.95, y1: 0.155 };
const ART = { x0: 0.08, y0: 0.17, x1: 0.92, y1: 0.50 };
const TEXT = { x0: 0.06, y0: 0.55, x1: 0.94, y1: 0.92 }; // 기술/룰 텍스트 박스
const dir = "tmp/neo4/cache"; mkdirSync(dir, { recursive: true });

async function dl(url: string, cache: string): Promise<Buffer | null> {
  if (existsSync(cache)) { const b = readFileSync(cache); if (b.length > 2000) return b; }
  try { const { stdout } = await ex("curl", ["-sSL", "--fail", "--max-time", "30", "-A", "Mozilla/5.0", url], { maxBuffer: 25 * 1024 * 1024, encoding: "buffer" } as any);
    const b = stdout as unknown as Buffer; if (b.length < 2000) return null; writeFileSync(cache, b); return b; } catch { return null; }
}
async function fp(base: Buffer, fr: any, gw: number, gh: number): Promise<Float64Array | null> {
  try { const left = Math.round(fr.x0 * CW), top = Math.round(fr.y0 * CH), w = Math.round((fr.x1 - fr.x0) * CW), h = Math.round((fr.y1 - fr.y0) * CH);
    const raw = await sharp(base).extract({ left, top, width: w, height: h }).removeAlpha().grayscale().resize(gw, gh, { fit: "fill" }).blur(0.8).raw().toBuffer();
    const n = gw * gh, v = new Float64Array(n); for (let i = 0; i < n; i++) v[i] = raw[i];
    let m = 0; for (let i = 0; i < n; i++) m += v[i]; m /= n; let s = 0; for (let i = 0; i < n; i++) { const d = v[i] - m; s += d * d; } s = Math.sqrt(s / n) || 1;
    for (let i = 0; i < n; i++) v[i] = (v[i] - m) / s; return v; } catch { return null; }
}
const corr = (a: Float64Array, b: Float64Array) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s / a.length; };

async function main() {
  const tcg: any[] = JSON.parse(readFileSync("tmp/neo4/tcg.json", "utf8"));
  const byNum = new Map(tcg.map((x) => [x.number, x]));
  const db = await prisma.regionCard.findMany({ where: { setId: "jp-tcg-neo4", region: "JP" }, select: { number: true, name: true, imageLarge: true }, orderBy: { numberInt: "asc" } });
  const out: any[] = [];
  for (const r of db) {
    const rec: any = { number: r.number, name: r.name, klass: "?", art: null, banner: null, text: null };
    const t = byNum.get(r.number);
    if (!r.imageLarge) rec.klass = "DB_NULL";
    else if (!t) rec.klass = "NO_TCG_MATCH";
    else {
      const a = await dl(r.imageLarge, `${dir}/db_${r.number}.img`);
      const b = await dl(t.image, `${dir}/tcg_${r.number}.img`);
      if (!a || !b) rec.klass = "DL_FAIL";
      else {
        const ab = await sharp(a, { page: 0 }).resize(CW, CH, { fit: "fill" }).toBuffer();
        const bb = await sharp(b, { page: 0 }).resize(CW, CH, { fit: "fill" }).toBuffer();
        const aArt = await fp(ab, ART, 36, 22), bArt = await fp(bb, ART, 36, 22);
        const aBan = await fp(ab, BANNER, 44, 10), bBan = await fp(bb, BANNER, 44, 10);
        const aTxt = await fp(ab, TEXT, 44, 30), bTxt = await fp(bb, TEXT, 44, 30);
        if (aArt && bArt && aBan && bBan && aTxt && bTxt) {
          rec.art = +corr(aArt, bArt).toFixed(3); rec.banner = +corr(aBan, bBan).toFixed(3); rec.text = +corr(aTxt, bTxt).toFixed(3);
          const textAvg = (rec.banner + rec.text) / 2;
          rec.klass = rec.art < 0.55 ? "WRONG" : textAvg < 0.62 ? "EN_IMG" : textAvg < 0.74 ? "UNCERTAIN" : "OK";
        } else rec.klass = "FP_FAIL";
      }
    }
    out.push(rec);
  }
  writeFileSync("tmp/neo4/imgcheck.json", JSON.stringify(out, null, 1));
  const by: Record<string, number> = {}; for (const r of out) by[r.klass] = (by[r.klass] || 0) + 1;
  console.log("=== NEO4 이미지 체크 ===", JSON.stringify(by));
  for (const r of out.filter((r) => /EN_IMG|WRONG|UNCERTAIN|NULL|FAIL|NO_TCG/.test(r.klass)))
    console.log(`  #${r.number} ${r.name} [${r.klass}] art=${r.art} ban=${r.banner} txt=${r.text}`);
}
main().catch((e) => { console.error("FAIL:", e); process.exit(1); }).finally(() => prisma.$disconnect());
