/**
 * Unbroken Bonds (en-tcg-sm10 / UNB, EN) #182 Pokégear 3.0 이미지 교정. setGroup og-sm10.
 *
 * 문제: imageLarge 가 pokemontcg `sm10/182b_hires`(보라 배경 변형)를 가리킴 — 레귤러 아트 아님.
 *   고해상 풀카드 시각대조: pokemontcg `182_hires`(무접미)=초록/청록 배경 = 사용자 제공 tcgc 와 동일(고해상).
 *   (182a=핑크 변형은 별개.) ※ 공유 LC(lc-jp-tcg-SMM-019, JP/KR Pokégear 와 병합)지만 EN RegionCard 만 변경.
 * 조치: large+small 모두 `182_hires`(734x1024)에서 재생성 → R2 재호스팅 → imageLarge/imageSmall 갱신.
 *   ※ EN RegionCard 이미지 변경 → region-aware 가드에서 자유(잠금은 JP 카드만). --allow-protected 불필요.
 *
 * dry: npx tsx scripts/fix-unb-182.ts
 * 적용: npx tsx scripts/fix-unb-182.ts --apply
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
const SET_CODE = "UNB", NUM_INT = 182;
const SRC = "https://images.pokemontcg.io/sm10/182_hires.png"; // 무접미 = 레귤러(초록 배경)

async function dl(url: string): Promise<Buffer> {
  const { stdout } = await exec("curl", ["-sSL", "--fail", "--max-time", "30", "-A", "Mozilla/5.0", url], { maxBuffer: 20 * 1024 * 1024, encoding: "buffer" } as any);
  const b = stdout as unknown as Buffer;
  if (b.length < 20000) throw new Error(`small ${b.length}`);
  return b;
}

async function main() {
  const rc = await prisma.regionCard.findFirst({
    where: { region: "EN", numberInt: NUM_INT, set: { code: SET_CODE } },
    select: { id: true, region: true, number: true, setId: true, name: true, imageLarge: true, imageSmall: true, set: { select: { cardPackId: true } } },
  });
  if (!rc) throw new Error(`RegionCard not found (EN ${SET_CODE} #${NUM_INT})`);

  // EN RegionCard 이미지 변경 → region-aware 가드: EN 은 자유.
  assertMappingWritable([rc.set.cardPackId], { regions: [rc.region], allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "fix-unb-182", what: `#${rc.number} large→레귤러(182_hires)` });

  const largeKey = r2KeyFor(rc.set.cardPackId!, "en", "large", rc.setId, rc.number, "png");
  const smallKey = r2KeyFor(rc.set.cardPackId!, "en", "small", rc.setId, rc.number, "png");
  console.log(`${APPLY ? "APPLY" : "DRY"} fix-unb-182 | ${rc.id} (${rc.name})`);
  console.log(`  현재 large: ${rc.imageLarge}`);
  console.log(`  → large: ${r2PublicUrl(largeKey)}  (src ${SRC})`);
  console.log(`  → small: ${r2PublicUrl(smallKey)}`);
  if (!APPLY) { console.log(`\n[dry-run] 변경 없음. --apply 로 실행 (EN 이미지 = 자유).`); return; }

  const buf = await dl(SRC);
  await uploadBuffer(largeKey, await sharp(buf).png().toBuffer(), "image/png");
  await uploadBuffer(smallKey, await sharp(buf).resize({ width: 245, withoutEnlargement: true }).png().toBuffer(), "image/png");
  if (!(await headExists(largeKey)) || !(await headExists(smallKey))) throw new Error("R2 verify 실패");
  await prisma.regionCard.update({ where: { id: rc.id }, data: { imageLarge: r2PublicUrl(largeKey), imageSmall: r2PublicUrl(smallKey) } });
  console.log(`\n✅ ${rc.id} imageLarge/Small → 레귤러 #182 (R2 재호스팅).`);
}
main().catch((e) => { console.error("FAIL:", e); process.exit(1); }).finally(() => prisma.$disconnect());
