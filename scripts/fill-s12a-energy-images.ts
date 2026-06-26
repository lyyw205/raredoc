/**
 * VSTAR ユニバース (jp-tcg-S12a) #251-258 기본 에너지 8종 이미지 누락 채우기.
 *
 * 배경: 이 8장(基本草~鋼エネルギー, Super Rare 풀아트 홀로)은 RegionCard·Card 가 이미 DB에 존재하나
 *   imageLarge/imageSmall 가 NULL 이었음. tcgdex(254장)·Limitless 둘 다 이 특수 기본에너지를 빠뜨려서
 *   수집 당시 이미지가 안 붙었던 것. KR(kr-s12a) 동일번호는 이미지 보유.
 * 출처: pokemon-card.com 공식 (pg=869=S12a). cardID 42944~42951, 이름·타입순서가 DB #251-258 과 1:1.
 *   이미지 8장 몽타주로 시각검증 완료(워터마크 없음).
 *
 * 동작: 공식 .jpg 다운 → webp large(q90)+245 small(q80) → R2(og-s12a/ja/{size}/jp-tcg-S12a/{num}.webp)
 *   → 기존 RegionCard(setId=jp-tcg-S12a, number, region=JP)의 imageLarge/imageSmall 만 UPDATE.
 *   ★Card/RegionCard 정체성·KR 공유 LC 연결은 불변(이미지 필 전용).
 *
 * dry: npx tsx scripts/fill-s12a-energy-images.ts
 * 적용: npx tsx scripts/fill-s12a-energy-images.ts --apply
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
const SET = "jp-tcg-S12a", PACK = "og-s12a";
const BASE = "https://www.pokemon-card.com/assets/images/card_images/large/S12a/";

const CARDS = [
  { number: "251", name: "基本草エネルギー", file: "042944_E_KIHONKUSAENERUGI.jpg" },
  { number: "252", name: "基本炎エネルギー", file: "042945_E_KIHONHONOOENERUGI.jpg" },
  { number: "253", name: "基本水エネルギー", file: "042946_E_KIHONMIZUENERUGI.jpg" },
  { number: "254", name: "基本雷エネルギー", file: "042947_E_KIHONKAMINARIENERUGI.jpg" },
  { number: "255", name: "基本超エネルギー", file: "042948_E_KIHONCHIXYOUENERUGI.jpg" },
  { number: "256", name: "基本闘エネルギー", file: "042949_E_KIHONTOUENERUGI.jpg" },
  { number: "257", name: "基本悪エネルギー", file: "042950_E_KIHONAKUENERUGI.jpg" },
  { number: "258", name: "基本鋼エネルギー", file: "042951_E_KIHONHAGANEENERUGI.jpg" },
];

async function dl(url: string): Promise<Buffer> {
  const { stdout } = await exec("curl", ["-sSL", "--fail", "--max-time", "30", "-A", "Mozilla/5.0", url], { maxBuffer: 20 * 1024 * 1024, encoding: "buffer" } as any);
  const b = stdout as unknown as Buffer; if (b.length < 5000) throw new Error(`small ${b.length}`); return b;
}

async function main() {
  assertWritable([PACK], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "fill-s12a-energy-images" });
  console.log(`${APPLY ? "APPLY" : "DRY"} fill-s12a-energy-images | ${CARDS.length}장 (이미지 필 전용)`);
  let ok = 0;
  for (const c of CARDS) {
    // 대상 RegionCard 존재·현재 이미지 상태 확인
    const rc = await prisma.regionCard.findFirst({ where: { setId: SET, number: c.number, region: "JP" }, select: { id: true, name: true, imageLarge: true } });
    if (!rc) { console.log(`  #${c.number} ✗ RegionCard 없음 — 스킵`); continue; }
    const largeKey = r2KeyFor(PACK, "ja", "large", SET, c.number, "webp");
    const smallKey = r2KeyFor(PACK, "ja", "small", SET, c.number, "webp");
    console.log(`  #${c.number} ${rc.name} | 현재large=${rc.imageLarge ?? "NULL"} → ${largeKey}`);
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
