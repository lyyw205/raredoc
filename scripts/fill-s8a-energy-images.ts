/**
 * 25th アニバーサリーコレクション (jp-tcg-S8a, og-s8a) #31-38 기본에너지 8종 이미지 누락 채우기.
 *
 * 배경: JP RegionCard #31-38(基本草~鋼エネルギー) imageLarge/Small=NULL. KR(kr-s8a) 동일번호는 보유.
 *   tcgdex/Limitless 가 기본에너지를 빠뜨려 수집 당시 누락됐던 것.
 * 출처: pokemon-card.com 공식 (pg=746=S8a). cardID 40091~40098, 이름·타입순서가 DB #31-38 과 1:1.
 *   몽타주 시각검증 완료(표준 기본에너지, 워터마크 없음).
 *
 * 동작: 공식 .jpg 다운 → webp large(q90)+245 small(q80) → R2 og-s8a/ja/{size}/jp-tcg-S8a/{num}.webp
 *   → 기존 RegionCard(setId=jp-tcg-S8a, number, region=JP) imageLarge/Small 만 UPDATE.
 *   ★이미지 전용: 정체성·번호·공유 LC 연결 불변.
 *
 * dry: npx tsx scripts/fill-s8a-energy-images.ts
 * 적용: npx tsx scripts/fill-s8a-energy-images.ts --apply
 */
import "dotenv/config";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import sharp from "sharp";
import { prisma } from "../src/lib/prisma";
import { r2KeyFor, uploadBuffer, r2PublicUrl, headExists } from "../src/lib/r2";
import { assertWritable, hasAllowProtectedFlag } from "./lib/protected-groups";

const exec = promisify(execFile);
const APPLY = process.argv.includes("--apply");
const SET = "jp-tcg-S8a", PACK = "og-s8a";
const BASE = "https://www.pokemon-card.com/assets/images/card_images/large/S8a/";

const CARDS = [
  { number: "31", name: "基本草エネルギー", file: "040091_E_KIHONKUSAENERUGI.jpg" },
  { number: "32", name: "基本炎エネルギー", file: "040092_E_KIHONHONOOENERUGI.jpg" },
  { number: "33", name: "基本水エネルギー", file: "040093_E_KIHONMIZUENERUGI.jpg" },
  { number: "34", name: "基本雷エネルギー", file: "040094_E_KIHONKAMINARIENERUGI.jpg" },
  { number: "35", name: "基本超エネルギー", file: "040095_E_KIHONCHIXYOUENERUGI.jpg" },
  { number: "36", name: "基本闘エネルギー", file: "040096_E_KIHONTOUENERUGI.jpg" },
  { number: "37", name: "基本悪エネルギー", file: "040097_E_KIHONAKUENERUGI.jpg" },
  { number: "38", name: "基本鋼エネルギー", file: "040098_E_KIHONHAGANEENERUGI.jpg" },
];

async function dl(url: string): Promise<Buffer> {
  const { stdout } = await exec("curl", ["-sSL", "--fail", "--max-time", "30", "-A", "Mozilla/5.0", url], { maxBuffer: 20 * 1024 * 1024, encoding: "buffer" } as any);
  const b = stdout as unknown as Buffer; if (b.length < 5000) throw new Error(`small ${b.length}`); return b;
}

async function main() {
  assertWritable([PACK], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "fill-s8a-energy-images" });
  console.log(`${APPLY ? "APPLY" : "DRY"} fill-s8a-energy-images | ${CARDS.length}장 (이미지 필 전용)`);
  let ok = 0;
  for (const c of CARDS) {
    const rc = await prisma.regionCard.findFirst({ where: { setId: SET, number: c.number, region: "JP" }, select: { id: true, name: true, imageLarge: true } });
    if (!rc) { console.log(`  #${c.number} ✗ RegionCard 없음 — 스킵`); continue; }
    const largeKey = r2KeyFor(PACK, "ja", "large", SET, c.number, "webp");
    const smallKey = r2KeyFor(PACK, "ja", "small", SET, c.number, "webp");
    console.log(`  #${c.number} ${rc.name} | 현재=${rc.imageLarge ?? "NULL"} → ${largeKey}`);
    if (!APPLY) continue;
    const buf = await dl(BASE + c.file);
    const largeBuf = await sharp(buf).webp({ quality: 90 }).toBuffer();
    const smallBuf = await sharp(buf).resize({ width: 245, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
    await uploadBuffer(largeKey, largeBuf, "image/webp");
    await uploadBuffer(smallKey, smallBuf, "image/webp");
    if (!(await headExists(largeKey)) || !(await headExists(smallKey))) throw new Error(`#${c.number} R2 verify 실패`);
    await prisma.regionCard.update({ where: { id: rc.id }, data: { imageLarge: r2PublicUrl(largeKey), imageSmall: r2PublicUrl(smallKey) } });
    console.log(`    ✓ updated ${rc.id}`);
    ok++;
  }
  if (APPLY) console.log(`\n완료: ${ok}/${CARDS.length} 이미지 채움`);
}
main().catch((e) => { console.error("FAIL:", e); process.exit(1); }).finally(() => prisma.$disconnect());
