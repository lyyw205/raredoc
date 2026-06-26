/**
 * EN RegionCard 이미지 교정 — 범용. (SM 시대 EN 카드 다수가 imageLarge 에 pokemontcg
 *   알파벳 접미사 변형(`{N}a`/`{N}b`, 배경색 다른 프린트)이 잘못 들어가 있음. 무접미 `{N}_hires` = 레귤러.)
 *
 * 동작: EN RegionCard(set.code+numberInt) 조회 → 소스 이미지 다운 → large(원본 png)+small(245px png)
 *   → R2 재호스팅(기존 키 컨벤션 = {cardPackId}/en/{size}/{setId}/{rc.number}.png) → imageLarge/imageSmall 갱신.
 *   ※ EN RegionCard 이미지 변경 → region-aware 가드에서 자유(잠금은 JP 카드만). --allow-protected 불필요.
 *      반드시 적용 전 시각대조로 소스가 올바른 아트인지 확인할 것(이 스크립트는 확정 후 적용기).
 *
 * 소스 지정(택1):
 *   --src-pio <pioSetId> [--src-num N]   pokemontcg `{pioSetId}/{N||numberInt}_hires.png` (무접미 레귤러)
 *   --src-url <directURL>                직접 URL(예: tcgcollector). 저해상일 수 있음.
 *
 * 예) npx tsx scripts/fix-en-card-image.ts --set TEU --num 152 --src-pio sm9 [--apply]
 *     npx tsx scripts/fix-en-card-image.ts --set UNB --num 182 --src-url https://... [--apply]
 */
import "dotenv/config";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import sharp from "sharp";
import { prisma } from "../src/lib/prisma";
import { r2KeyFor, uploadBuffer, r2PublicUrl, headExists } from "../src/lib/r2";
import { assertMappingWritable, hasAllowProtectedFlag } from "./lib/protected-groups";

const exec = promisify(execFile);
const argv = process.argv.slice(2);
const APPLY = argv.includes("--apply");
const arg = (k: string) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : undefined; };

async function dl(url: string): Promise<Buffer> {
  const { stdout } = await exec("curl", ["-sSL", "--fail", "--max-time", "30", "-A", "Mozilla/5.0", url], { maxBuffer: 20 * 1024 * 1024, encoding: "buffer" } as any);
  const b = stdout as unknown as Buffer;
  if (b.length < 20000) throw new Error(`small ${b.length}`);
  return b;
}

async function main() {
  const setCode = arg("--set");
  const numInt = arg("--num") ? parseInt(arg("--num")!, 10) : NaN;
  const pio = arg("--src-pio");
  const srcUrl = arg("--src-url");
  if (!setCode || !Number.isFinite(numInt) || (!pio && !srcUrl)) {
    console.error("usage: --set <CODE> --num <int> (--src-pio <pioSetId> [--src-num N] | --src-url <URL>) [--apply]");
    process.exit(1);
  }
  const src = srcUrl ?? `https://images.pokemontcg.io/${pio}/${arg("--src-num") ?? numInt}_hires.png`;

  const rc = await prisma.regionCard.findFirst({
    where: { region: "EN", numberInt: numInt, set: { code: setCode } },
    select: { id: true, region: true, number: true, setId: true, name: true, imageLarge: true, imageSmall: true, set: { select: { cardPackId: true } } },
  });
  if (!rc) throw new Error(`RegionCard not found (EN ${setCode} #${numInt})`);

  // EN RegionCard 이미지 변경 → region-aware 가드: EN 은 자유.
  assertMappingWritable([rc.set.cardPackId], { regions: [rc.region], allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "fix-en-card-image", what: `${setCode}#${rc.number} 이미지 교체` });

  const largeKey = r2KeyFor(rc.set.cardPackId!, "en", "large", rc.setId, rc.number, "png");
  const smallKey = r2KeyFor(rc.set.cardPackId!, "en", "small", rc.setId, rc.number, "png");
  console.log(`${APPLY ? "APPLY" : "DRY"} fix-en-card-image | ${rc.id} (${rc.name})`);
  console.log(`  현재 large: ${rc.imageLarge}`);
  console.log(`  src: ${src}`);
  console.log(`  → large: ${r2PublicUrl(largeKey)}`);
  console.log(`  → small: ${r2PublicUrl(smallKey)}`);
  if (!APPLY) { console.log(`\n[dry-run] 변경 없음. --apply 로 실행 (EN 이미지 = 자유).`); return; }

  const buf = await dl(src);
  await uploadBuffer(largeKey, await sharp(buf).png().toBuffer(), "image/png");
  await uploadBuffer(smallKey, await sharp(buf).resize({ width: 245, withoutEnlargement: true }).png().toBuffer(), "image/png");
  if (!(await headExists(largeKey)) || !(await headExists(smallKey))) throw new Error("R2 verify 실패");
  await prisma.regionCard.update({ where: { id: rc.id }, data: { imageLarge: r2PublicUrl(largeKey), imageSmall: r2PublicUrl(smallKey) } });
  console.log(`\n✅ ${rc.id} imageLarge/Small 갱신 (R2 재호스팅).`);
}
main().catch((e) => { console.error("FAIL:", e); process.exit(1); }).finally(() => prisma.$disconnect());
