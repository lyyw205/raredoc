/**
 * JP 프로모 세트 로고 백필 — tcgcollector(Wayback 2024-08 아카이브)에서 추출한 프로모 시리즈 로고를 R2 미러링.
 *
 * 배경(리서치 확정): logoUrl=null 인 JP 세트 52개를 조사한 결과, 이미 pokellector/bulbapedia/ptcg-assets
 *   백필을 거친 잔여라 그 소스엔 로고가 없고, 구시대 JP 본팩·덱 로고는 tcgcollector 도 default 플레이스홀더만 보유.
 *   유일하게 실로고가 있는 건 '프로모 시리즈'(BW-P/DP-P/DPt-P/L-P/SM-P). live tcgc 는 Cloudflare 차단이라
 *   Wayback 아카이브(www.tcgcollector.com/expansions/jp @20240802)에서 static CDN URL 을 추출해 사용.
 *   각 후보는 로고+해당세트 샘플카드 몽타주로 시각 검증 완료(프로모 텍스트 일치).
 *
 * 저장: static CDN(content/images) 직다운(폴백 Wayback) → sharp webp(q92) → R2 set-assets/logo/{setId}.webp → Set.logoUrl.
 *   Set.logoUrl = FREE 필드(매핑가드 불필요).
 *
 * dry: npx tsx scripts/set-jp-promo-logos.ts
 * 적용: npx tsx scripts/set-jp-promo-logos.ts --apply
 */
import "dotenv/config";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import sharp from "sharp";
import { prisma } from "../src/lib/prisma";
import { uploadBuffer, r2PublicUrl, headExists } from "../src/lib/r2";

const exec = promisify(execFile);
const APPLY = process.argv.includes("--apply");

// setId → tcgcollector static CDN logo URL(doubled-content 형태; 다운로드 시 collapse). 검증 완료된 프로모 5종.
const WB = "https://web.archive.org/web/20240802042755id_/";
const LOGOS: { setId: string; label: string; url: string }[] = [
  { setId: "jp-bwp",      label: "BW-P 프로모",  url: "https://static.tcgcollector.com/content/content/images/22/e3/01/22e3016d3f4ee611ae2fd77538c3f8381a7b1b03d8105c4f73a238be1930968a.png" },
  { setId: "jp-tcg-DPP",  label: "DP-P 프로모",  url: "https://static.tcgcollector.com/content/content/images/d5/a0/70/d5a0703f35bfa4b62e458944f1b139624a653df33a8e8e02c98bf2c1b0f37fc5.png" },
  { setId: "jp-tcg-DPtP", label: "DPt-P 프로모", url: "https://static.tcgcollector.com/content/content/images/ee/af/26/eeaf265e9537530e955ed4d556e9a049d11d6f828d438ff19e47412981079fd7.png" },
  { setId: "jp-tcg-L-P",  label: "L-P(LEGEND) 프로모", url: "https://static.tcgcollector.com/content/content/images/86/c4/2c/86c42cc5708490a9bbdf1a03b8615ccf10f944aef28464c39969bfec60df3600.png" },
  { setId: "jp-smp",      label: "SM-P 프로모",  url: "https://static.tcgcollector.com/content/content/images/ec/4c/1f/ec4c1f802cb0ab3b660143151771fbdfec0c48b474e2310d168397b31b570f16.png" },
];

async function tryDl(url: string): Promise<Buffer | null> {
  try {
    const { stdout } = await exec("curl", ["-sSL", "--fail", "--max-time", "40", "-A", "Mozilla/5.0", url], { maxBuffer: 20 * 1024 * 1024, encoding: "buffer" } as any);
    const b = stdout as unknown as Buffer; return b.length > 400 ? b : null;
  } catch { return null; }
}
async function dl(doubledUrl: string): Promise<Buffer> {
  const collapsed = doubledUrl.replace("content/content/", "content/");
  let b = await tryDl(collapsed);                       // 1) 직다운(collapsed)
  if (!b) b = await tryDl(WB + doubledUrl);             // 2) Wayback(doubled 원본)
  if (!b) b = await tryDl(WB + collapsed);              // 3) Wayback(collapsed)
  if (!b) throw new Error(`download failed: ${doubledUrl}`);
  return b;
}

async function main() {
  console.log(`${APPLY ? "APPLY" : "DRY"} set-jp-promo-logos | ${LOGOS.length}`);
  const ids = LOGOS.map((l) => l.setId);
  const found = await prisma.set.findMany({ where: { id: { in: ids } }, select: { id: true, logoUrl: true } });
  const fmap = new Map(found.map((s) => [s.id, s.logoUrl]));
  const missing = ids.filter((id) => !fmap.has(id));
  if (missing.length) { console.error(`✗ 없는 세트: ${missing.join(", ")}`); process.exit(1); }

  let ok = 0;
  for (const L of LOGOS) {
    const buf = await dl(L.url);
    const meta = await sharp(buf).metadata();
    console.log(`  ${L.setId.padEnd(14)} (${L.label}) 현재=${fmap.get(L.setId) ? "있음" : "NULL"}  src=${meta.width}x${meta.height}`);
    if (!meta.width || meta.width < 60) throw new Error(`${L.setId} 로고 의심 w=${meta.width}`);
    if (!APPLY) continue;
    const key = `set-assets/logo/${L.setId}.webp`;
    const webp = await sharp(buf).webp({ quality: 92 }).toBuffer();
    await uploadBuffer(key, webp, "image/webp");
    if (!(await headExists(key))) throw new Error(`${L.setId} R2 verify 실패`);
    await prisma.set.update({ where: { id: L.setId }, data: { logoUrl: r2PublicUrl(key) } });
    console.log(`    ✓ logoUrl 설정`);
    ok++;
  }
  if (!APPLY) console.log("\n[dry-run] --apply 로 실행."); else console.log(`\n완료 ${ok}/${LOGOS.length}`);
}
main().catch((e) => { console.error("FAIL:", e); process.exit(1); }).finally(() => prisma.$disconnect());
