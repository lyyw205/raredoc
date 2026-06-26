/**
 * はじめてセット＋ (jp-hs-plus, bw-decks) #8 エンブオー 이미지 누락 채우기.
 *
 * 배경: jp-hs-plus 34장 중 #8 エンブオー(Emboar, Fire, dex500)만 imageLarge/Small=NULL. 정체성 이미 존재.
 * 출처: ★사용자 지시 "직접서치먼저" → pokemon-card.com 공식에서 발견:
 *   large/HSp/027067_P_ENBUO.jpg (HSp = はじめてセット＋ 디렉토리, 첨부 이미지와 동일 카드 확인:
 *   에ンブオー HP150·ヒートスタンプ/フレアドライブ·Fire 일치). 공식이 직접 검색됐으므로 공식 사용
 *   (첨부는 fallback이었음). 공식 162×226 = 이 세트 형제 카드와 동일 해상도(세트 일관).
 *
 * 동작: 공식 다운 → large=.jpg 원본 그대로 + small=.webp(245 withoutEnlargement)
 *   → R2 bw-decks/ja/{large/8.jpg, small/8.webp}/jp-hs-plus → RegionCard UPDATE. (형제와 동일 형식)
 *   ★이미지 전용, 정체성·연결 불변.
 *
 * dry: npx tsx scripts/fill-hsplus-008.ts
 * 적용: npx tsx scripts/fill-hsplus-008.ts --apply
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
const SET = "jp-hs-plus", PACK = "bw-decks", NUMBER = "8", NAME = "エンブオー";
const IMG = "https://www.pokemon-card.com/assets/images/card_images/large/HSp/027067_P_ENBUO.jpg";

async function dl(url: string): Promise<Buffer> {
  const { stdout } = await exec("curl", ["-sSL", "--fail", "--max-time", "30", "-A", "Mozilla/5.0", url], { maxBuffer: 20 * 1024 * 1024, encoding: "buffer" } as any);
  const b = stdout as unknown as Buffer; if (b.length < 3000) throw new Error(`small ${b.length}`); return b;
}

async function main() {
  assertWritable([PACK], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "fill-hsplus-008" });
  const rc = await prisma.regionCard.findFirst({ where: { setId: SET, number: NUMBER, region: "JP" }, select: { id: true, name: true, imageLarge: true } });
  if (!rc) throw new Error(`#${NUMBER} RegionCard 없음`);
  if (rc.name !== NAME) throw new Error(`이름 불일치 DB="${rc.name}" vs "${NAME}"`);
  const largeKey = r2KeyFor(PACK, "ja", "large", SET, NUMBER, "jpg");
  const smallKey = r2KeyFor(PACK, "ja", "small", SET, NUMBER, "webp");
  console.log(`${APPLY ? "APPLY" : "DRY"} fill-hsplus-008 | #${NUMBER} ${NAME} (현재 ${rc.imageLarge ? "있음" : "NULL"}) → ${largeKey}`);
  if (!APPLY) { console.log("적용: --apply"); return; }
  const buf = await dl(IMG);
  const meta = await sharp(buf).metadata();
  console.log(`  공식 원본 ${meta.width}x${meta.height} ${buf.length}B`);
  if (!meta.width || meta.width < 120) throw new Error(`이미지 의심 w=${meta.width}`);
  await uploadBuffer(largeKey, buf, "image/jpeg"); // 형제와 동일하게 large=.jpg 원본
  await uploadBuffer(smallKey, await sharp(buf).resize({ width: 245, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer(), "image/webp");
  if (!(await headExists(largeKey)) || !(await headExists(smallKey))) throw new Error("R2 verify 실패");
  await prisma.regionCard.update({ where: { id: rc.id }, data: { imageLarge: r2PublicUrl(largeKey), imageSmall: r2PublicUrl(smallKey) } });
  console.log(`  ✓ ${rc.id} 갱신 → ${r2PublicUrl(largeKey)}`);
  const noImg = await prisma.regionCard.count({ where: { setId: SET, imageLarge: null } });
  console.log(`  jp-hs-plus 잔여 이미지없음: ${noImg}`);
}
main().catch((e) => { console.error("FAIL:", e); process.exit(1); }).finally(() => prisma.$disconnect());
