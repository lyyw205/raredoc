/**
 * 구세대 JP 세트의 영어이미지·스크램블·영어이름 자동 스캔.
 *
 * 원리: 각 JP 카드(RegionCard region=JP)를 cardId로 연결된 EN 카드 이미지(권위, images.pokemontcg.io 등)와
 *   영역분할 지문대조 — ① 이름띠 영역 corr ② 일러(아트) 영역 corr.
 *     · artCorr 낮음(<ART_LOW)        → SCRAMBLE (엉뚱한 카드가 들어옴)
 *     · artCorr 정상 & bannerCorr 높음(>BAN_HI) → ENGLISH_IMG (그 EN 스캔이 JP슬롯에 들어옴)
 *     · 그 외                          → OK (올바른 일본판: 같은 그림, 다른 글자)
 *   + 이름 정규식으로 영어이름(ENGLISH_NAME) 별도 플래그. EN 연결/이미지 없으면 NO_REF(눈검증 필요).
 *
 * 사용:
 *   npx tsx scripts/scan-en-images.ts --sets jp-tcg-PCG3
 *   npx tsx scripts/scan-en-images.ts --sets jp-tcg-ADV1,jp-tcg-ADV2,...   (쉼표구분)
 *   결과: tmp/scan/{setId}.json + 콘솔 요약. (읽기 전용, DB 변경 없음)
 */
import "dotenv/config";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import sharp from "sharp";
import { prisma } from "../src/lib/prisma";

const ex = promisify(execFile);
const arg = (k: string) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3)
  ?? (process.argv.includes(`--${k}`) ? process.argv[process.argv.indexOf(`--${k}`) + 1] : undefined);

// 임계 (PCG3 보정): art<LOW=스크램블 / LOW~UNC=불확실(눈검증) / art>=UNC & ban>BAN_HI=영어이미지 / 그외=OK
const ART_LOW = Number(arg("artLow") ?? 0.45);
const ART_UNC = Number(arg("artUnc") ?? 0.65);
const BAN_HI = Number(arg("banHi") ?? 0.80);

const CW = 357, CH = 500;
const BANNER = { x0: 0.06, y0: 0.040, x1: 0.94, y1: 0.150 };
const ART = { x0: 0.08, y0: 0.160, x1: 0.92, y1: 0.520 };
const hasJP = (s: string) => /[぀-ヿ一-鿿]/.test(s);

async function dl(url: string, cache: string): Promise<Buffer | null> {
  if (existsSync(cache)) { const b = readFileSync(cache); if (b.length > 2000) return b; }
  try {
    const { stdout } = await ex("curl", ["-sSL", "--fail", "--max-time", "30", "-A", "Mozilla/5.0", url], { maxBuffer: 30 * 1024 * 1024, encoding: "buffer" } as any);
    const b = stdout as unknown as Buffer; if (b.length < 2000) return null; writeFileSync(cache, b); return b;
  } catch { return null; }
}
async function regionFp(base: Buffer, fr: any, gw: number, gh: number): Promise<Float64Array | null> {
  try {
    const left = Math.round(fr.x0 * CW), top = Math.round(fr.y0 * CH), w = Math.round((fr.x1 - fr.x0) * CW), h = Math.round((fr.y1 - fr.y0) * CH);
    const raw = await sharp(base).extract({ left, top, width: w, height: h }).removeAlpha().grayscale().resize(gw, gh, { fit: "fill" }).blur(1).raw().toBuffer();
    const n = gw * gh, v = new Float64Array(n);
    for (let i = 0; i < n; i++) v[i] = raw[i];
    let m = 0; for (let i = 0; i < n; i++) m += v[i]; m /= n;
    let s = 0; for (let i = 0; i < n; i++) { const d = v[i] - m; s += d * d; } s = Math.sqrt(s / n) || 1;
    for (let i = 0; i < n; i++) v[i] = (v[i] - m) / s;
    return v;
  } catch { return null; }
}
const corr = (a: Float64Array, b: Float64Array) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s / a.length; };

async function scanSet(setId: string) {
  const dir = `tmp/scan/cache/${setId.replace(/[^a-z0-9]/gi, "_")}`;
  mkdirSync(dir, { recursive: true });
  const cards = await prisma.regionCard.findMany({ where: { setId, region: "JP" }, select: { number: true, name: true, imageLarge: true, cardId: true }, orderBy: { number: "asc" } });
  const out: any[] = [];
  let done = 0;
  for (const c of cards) {
    const rec: any = { number: c.number, name: c.name, nameEnglish: !hasJP(c.name), klass: "?", bannerCorr: null, artCorr: null, enRef: null };
    const en = await prisma.regionCard.findFirst({ where: { cardId: c.cardId, region: "EN" }, select: { setId: true, number: true, imageLarge: true } });
    if (!c.imageLarge) rec.klass = "NO_JP_IMG";
    else if (!en?.imageLarge) rec.klass = rec.nameEnglish ? "ENGLISH_NAME(NO_REF)" : "NO_REF";
    else {
      rec.enRef = `${en.setId}#${en.number}`;
      const jpB = await dl(c.imageLarge, `${dir}/jp_${c.number}.img`);
      const enB = await dl(en.imageLarge, `${dir}/en_${c.number}.img`);
      if (!jpB || !enB) rec.klass = "DL_FAIL";
      else {
        const jpBase = await sharp(jpB, { page: 0 }).resize(CW, CH, { fit: "fill" }).toBuffer();
        const enBase = await sharp(enB, { page: 0 }).resize(CW, CH, { fit: "fill" }).toBuffer();
        const jb = await regionFp(jpBase, BANNER, 40, 10), eb = await regionFp(enBase, BANNER, 40, 10);
        const ja = await regionFp(jpBase, ART, 36, 20), ea = await regionFp(enBase, ART, 36, 20);
        if (jb && eb && ja && ea) {
          rec.bannerCorr = +corr(jb, eb).toFixed(3);
          rec.artCorr = +corr(ja, ea).toFixed(3);
          rec.klass = rec.artCorr < ART_LOW ? "SCRAMBLE" : rec.artCorr < ART_UNC ? "UNCERTAIN" : rec.bannerCorr > BAN_HI ? "ENGLISH_IMG" : "OK";
        } else rec.klass = "FP_FAIL";
      }
    }
    if (rec.nameEnglish && !rec.klass.includes("ENGLISH_NAME")) rec.klass += "+ENNAME";
    out.push(rec);
    if (++done % 20 === 0) console.log(`  ...${done}/${cards.length}`);
  }
  mkdirSync("tmp/scan", { recursive: true });
  writeFileSync(`tmp/scan/${setId.replace(/[^a-z0-9]/gi, "_")}.json`, JSON.stringify(out, null, 1));
  const by: Record<string, number> = {};
  for (const r of out) { const k = r.klass.replace("+ENNAME", ""); by[k] = (by[k] || 0) + 1; }
  console.log(`\n=== ${setId} (${out.length}장) ===`, JSON.stringify(by));
  const flagged = out.filter((r) => /SCRAMBLE|UNCERTAIN|ENGLISH_IMG|ENGLISH_NAME|NO_REF|DL_FAIL|FP_FAIL/.test(r.klass));
  for (const r of flagged) console.log(`  #${r.number} ${r.name} [${r.klass}] ban=${r.bannerCorr} art=${r.artCorr} ${r.enRef ?? ""}`);
  return out;
}

async function main() {
  const sets = (arg("sets") ?? "jp-tcg-PCG3").split(",").map((s) => s.trim()).filter(Boolean);
  console.log(`scan-en-images | sets=${sets.length} | ART_LOW=${ART_LOW} BAN_HI=${BAN_HI}`);
  for (const s of sets) await scanSet(s);
}
main().catch((e) => { console.error("FAIL:", e); process.exit(1); }).finally(() => prisma.$disconnect());
