/**
 * めざめる超王 「초능력의 제왕」 (jp-tcg-XY10, og-xy10) #012·#017·#049·#059 이미지 누락 채우기.
 *
 * 배경: jp-tcg-XY10 88장 중 4장(전부 BREAK 카드)만 imageLarge/Small=NULL. 정체성
 *   (이름·타입·dex·HP·레어도)은 이미 DB에 올바르게 존재 → 순수 이미지 채움.
 *     #012 マフォクシーBREAK (Delphox, Fire, dex655, HP180)
 *     #017 オムスターBREAK (Omastar, Water, dex139, HP140)
 *     #049 ドータクンBREAK (Bronzong, Metal, dex437, HP130) ※cardId=lc-jp-tcg-SMXY-083(재록 병합) — 이미지만 RC 갱신
 *     #059 ルギアBREAK (Lugia, Colorless, dex249, HP150)
 * 출처: 사용자 제공 tcgcollector 이미지(URL). ★지시 = 공식에 있어도 첨부 이미지 사용.
 *   4장 몽타주 시각검증 완료: HP/타입/일본어 명칭 전부 DB 정체성과 일치, 뒤섞임 없음.
 *
 * 동작: 첨부 다운 → webp large(q90)+245 small(q80) → R2 og-xy10/ja/{size}/jp-tcg-XY10/{n}.webp
 *   → 기존 RegionCard imageLarge/Small UPDATE. ★이미지 전용, 정체성·연결 불변.
 *
 * dry: npx tsx scripts/fill-xy10-images.ts
 * 적용: npx tsx scripts/fill-xy10-images.ts --apply
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
const SET = "jp-tcg-XY10", PACK = "og-xy10";

const CARDS = [
  { number: "012", name: "マフォクシーBREAK", img: "https://static.tcgcollector.com/content/images/bf/c8/96/bfc8965ef169847c40eb4428c9785eebed3baa1406bb0cb5bbf5bb1d57a69719.jpg" },
  { number: "017", name: "オムスターBREAK", img: "https://static.tcgcollector.com/content/images/3c/3e/10/3c3e10c5ecf08ab541485b4a788e901ef7160486445d0e6a19d906510698f143.jpg" },
  { number: "049", name: "ドータクンBREAK", img: "https://static.tcgcollector.com/content/images/54/b0/38/54b038a2d23270f0a392690493e2d21f467e5b557505b1426d8419dc26d12d7e.jpg" },
  { number: "059", name: "ルギアBREAK", img: "https://static.tcgcollector.com/content/images/b0/5e/12/b05e12601460bb126aaee1784621d328f06c4383a7b7d36e44be82c19b541781.jpg" },
];

async function dl(url: string): Promise<Buffer> {
  const { stdout } = await exec("curl", ["-sSL", "--fail", "--max-time", "30", "-A", "Mozilla/5.0", url], { maxBuffer: 20 * 1024 * 1024, encoding: "buffer" } as any);
  const b = stdout as unknown as Buffer; if (b.length < 4000) throw new Error(`small ${b.length}`); return b;
}

async function main() {
  assertWritable([PACK], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "fill-xy10-images" });
  console.log(`${APPLY ? "APPLY" : "DRY"} fill-xy10-images | ${CARDS.length}장 (BREAK 이미지 필)`);
  for (const c of CARDS) {
    const rc = await prisma.regionCard.findFirst({ where: { setId: SET, number: c.number, region: "JP" }, select: { id: true, name: true, imageLarge: true } });
    if (!rc) throw new Error(`#${c.number} RegionCard 없음`);
    if (rc.name !== c.name) throw new Error(`#${c.number} 이름 불일치: DB="${rc.name}" vs "${c.name}"`);
    const largeKey = r2KeyFor(PACK, "ja", "large", SET, c.number, "webp");
    const smallKey = r2KeyFor(PACK, "ja", "small", SET, c.number, "webp");
    console.log(`  #${c.number} ${c.name} (현재 img=${rc.imageLarge ? "있음" : "NULL"}) → ${largeKey}`);
    if (!APPLY) continue;
    const buf = await dl(c.img);
    const meta = await sharp(buf).metadata();
    if (!meta.width || meta.width < 300) throw new Error(`#${c.number} 이미지 의심 w=${meta.width}`);
    await uploadBuffer(largeKey, await sharp(buf).webp({ quality: 90 }).toBuffer(), "image/webp");
    await uploadBuffer(smallKey, await sharp(buf).resize({ width: 245, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer(), "image/webp");
    if (!(await headExists(largeKey)) || !(await headExists(smallKey))) throw new Error(`#${c.number} R2 verify 실패`);
    await prisma.regionCard.update({ where: { id: rc.id }, data: { imageLarge: r2PublicUrl(largeKey), imageSmall: r2PublicUrl(smallKey) } });
    console.log(`    ✓ ${rc.id} 업데이트`);
  }
  if (APPLY) {
    const cov = await prisma.regionCard.count({ where: { setId: SET, imageLarge: { not: null } } });
    const total = await prisma.regionCard.count({ where: { setId: SET } });
    console.log(`\njp-tcg-XY10 이미지 보유: ${cov}/${total}`);
  }
}
main().catch((e) => { console.error("FAIL:", e); process.exit(1); }).finally(() => prisma.$disconnect());
