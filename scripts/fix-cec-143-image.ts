/**
 * Cosmic Eclipse #143 "Togepi & Cleffa & Igglybuff-GX" 이미지 교정 (EN, og-sm12 잠금 시대).
 *
 * 문제: RegionCard(en-tcg-sm12-143).imageLarge 가 pokemontcg `sm12/143a_hires.png` =
 *   #143a 알터네이트("Rare Ultra", artist 0313, 화려한 낮 구도)를 가리킴. 레귤러 #143
 *   (Mitsuhiro Arita, 차분한 구도)이 아님. small 은 이미 레귤러 구도(올바름).
 *   → 고해상 풀카드 시각대조로 확정: pokemontcg `143_hires` = 레귤러 = 사용자 제공 tcgc 와 동일 아트(고해상).
 * 조치: large+small 모두 `143_hires`(734x1024)에서 재생성 → R2 재호스팅 → imageLarge/imageSmall 갱신.
 *   ※ EN RegionCard 이미지 변경 → region-aware 가드에서 자유(잠금은 JP 카드만). --allow-protected 불필요.
 *
 * dry: npx tsx scripts/fix-cec-143-image.ts
 * 적용: npx tsx scripts/fix-cec-143-image.ts --apply
 */
import "dotenv/config";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import sharp from "sharp";
import { prisma } from "../src/lib/prisma";
import { r2KeyFor, uploadBuffer, r2PublicUrl, headExists } from "../src/lib/r2";
import { assertMappingWritable, hasAllowProtectedFlag } from "./lib/protected-groups";

const exec = promisify(execFile);
const APPLY = process.argv.includes("--apply");
const PACK = "og-sm12";
const SRC = "https://images.pokemontcg.io/sm12/143_hires.png"; // 레귤러 #143 (Arita), 고해상

async function dl(url: string): Promise<Buffer> {
  const { stdout } = await exec("curl", ["-sSL", "--fail", "--max-time", "30", "-A", "Mozilla/5.0", url], { maxBuffer: 20 * 1024 * 1024, encoding: "buffer" } as any);
  const b = stdout as unknown as Buffer;
  if (b.length < 20000) throw new Error(`small ${b.length}`);
  return b;
}

async function main() {
  const rc = await prisma.regionCard.findFirst({
    where: { region: "EN", number: "143", set: { cardPackId: PACK, code: "CEC" } },
    select: { id: true, region: true, setId: true, number: true, name: true, imageLarge: true, imageSmall: true, cardId: true },
  });
  if (!rc) throw new Error("RegionCard not found (EN CEC #143)");

  // EN RegionCard 이미지 변경 → region-aware 가드: EN/KR 은 자유(잠금은 JP 카드만).
  assertMappingWritable([PACK], { regions: [rc.region], allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "fix-cec-143-image", what: "#143 large→레귤러 아트(143_hires)" });
  console.log(`${APPLY ? "APPLY" : "DRY"} fix-cec-143-image | target ${rc.id} (${rc.name})`);
  console.log(`  현재 large: ${rc.imageLarge}`);
  console.log(`  현재 small: ${rc.imageSmall}`);

  const largeKey = r2KeyFor(PACK, "en", "large", rc.setId, rc.number, "png"); // og-sm12/en/large/en-tcg-sm12/143.png
  const smallKey = r2KeyFor(PACK, "en", "small", rc.setId, rc.number, "png"); // og-sm12/en/small/en-tcg-sm12/143.png
  console.log(`  → large: ${r2PublicUrl(largeKey)}`);
  console.log(`  → small: ${r2PublicUrl(smallKey)}  (src ${SRC})`);

  if (!APPLY) { console.log(`\n[dry-run] 변경 없음. --apply 로 실행 (EN 이미지 = 자유).`); return; }

  const buf = await dl(SRC);
  await uploadBuffer(largeKey, await sharp(buf).png().toBuffer(), "image/png");
  await uploadBuffer(smallKey, await sharp(buf).resize({ width: 245, withoutEnlargement: true }).png().toBuffer(), "image/png");
  if (!(await headExists(largeKey)) || !(await headExists(smallKey))) throw new Error("R2 verify 실패");

  await prisma.regionCard.update({
    where: { id: rc.id },
    data: { imageLarge: r2PublicUrl(largeKey), imageSmall: r2PublicUrl(smallKey) },
  });
  console.log(`\n✅ ${rc.id} imageLarge/Small → 레귤러 #143 (R2 재호스팅).`);
}
main().catch((e) => { console.error("FAIL:", e); process.exit(1); }).finally(() => prisma.$disconnect());
