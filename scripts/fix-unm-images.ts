/**
 * Unified Minds (en-tcg-sm11 / UNM, EN) #079·#191 이미지 교정. setGroup og-sm11a(리믹스바우트).
 *
 * 문제: imageLarge 가 pokemontcg `{N}a_hires`(변형 프린트)를 가리킴 — 레귤러 #N 아트 아님.
 *   · #079 Jirachi-GX: 79a=파란 배경 변형 → 레귤러 79=보라/우주 배경
 *   · #191 Cherish Ball: 191a=책상+리그 스탬프 → 레귤러 191=파란 추상 배경
 *   고해상 풀카드 시각대조로 확정: pokemontcg `{N}_hires`(무접미) = 사용자 제공 tcgc 와 동일 아트(고해상).
 * 조치: large+small 모두 `{N}_hires`(734x1024)에서 재생성 → R2 재호스팅 → imageLarge/imageSmall 갱신.
 *   ※ EN RegionCard 이미지 변경 → region-aware 가드에서 자유(잠금은 JP 카드만). --allow-protected 불필요.
 *
 * dry: npx tsx scripts/fix-unm-images.ts
 * 적용: npx tsx scripts/fix-unm-images.ts --apply
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
const SET_CODE = "UNM";
const NUMS = [79, 191]; // numberInt

async function dl(url: string): Promise<Buffer> {
  const { stdout } = await exec("curl", ["-sSL", "--fail", "--max-time", "30", "-A", "Mozilla/5.0", url], { maxBuffer: 20 * 1024 * 1024, encoding: "buffer" } as any);
  const b = stdout as unknown as Buffer;
  if (b.length < 20000) throw new Error(`small ${b.length}`);
  return b;
}

async function main() {
  console.log(`${APPLY ? "APPLY" : "DRY"} fix-unm-images | ${NUMS.length}장 (UNM #${NUMS.join(", #")})`);
  for (const numInt of NUMS) {
    const rc = await prisma.regionCard.findFirst({
      where: { region: "EN", numberInt: numInt, set: { code: SET_CODE } },
      select: { id: true, region: true, number: true, setId: true, name: true, imageLarge: true, imageSmall: true, set: { select: { cardPackId: true } } },
    });
    if (!rc) throw new Error(`RegionCard not found (EN ${SET_CODE} #${numInt})`);

    // EN RegionCard 이미지 변경 → region-aware 가드: EN 은 자유.
    assertMappingWritable([rc.set.cardPackId], { regions: [rc.region], allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "fix-unm-images", what: `#${rc.number} large→레귤러(${numInt}_hires)` });

    const src = `https://images.pokemontcg.io/sm11/${numInt}_hires.png`; // 무접미 = 레귤러
    const largeKey = r2KeyFor(rc.set.cardPackId!, "en", "large", rc.setId, rc.number, "png");
    const smallKey = r2KeyFor(rc.set.cardPackId!, "en", "small", rc.setId, rc.number, "png");
    console.log(`  #${rc.number} ${rc.name}`);
    console.log(`    현재 large: ${rc.imageLarge}`);
    console.log(`    → large: ${r2PublicUrl(largeKey)}  (src ${src})`);
    console.log(`    → small: ${r2PublicUrl(smallKey)}`);
    if (!APPLY) continue;

    const buf = await dl(src);
    await uploadBuffer(largeKey, await sharp(buf).png().toBuffer(), "image/png");
    await uploadBuffer(smallKey, await sharp(buf).resize({ width: 245, withoutEnlargement: true }).png().toBuffer(), "image/png");
    if (!(await headExists(largeKey)) || !(await headExists(smallKey))) throw new Error(`#${rc.number} R2 verify 실패`);
    await prisma.regionCard.update({ where: { id: rc.id }, data: { imageLarge: r2PublicUrl(largeKey), imageSmall: r2PublicUrl(smallKey) } });
    console.log(`    ✓ ${rc.id} 갱신`);
  }
  if (!APPLY) console.log(`\n[dry-run] 변경 없음. --apply 로 실행 (EN 이미지 = 자유).`);
}
main().catch((e) => { console.error("FAIL:", e); process.exit(1); }).finally(() => prisma.$disconnect());
