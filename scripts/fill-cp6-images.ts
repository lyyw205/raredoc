/**
 * 拡張パック 20th Anniversary (jp-tcg-CP6, og-cp6) #016·#030·#044·#058 이미지 누락 채우기.
 *
 * 배경: jp-tcg-CP6 103장 중 4장(전부 BREAK 카드)만 imageLarge/Small=NULL. 카드 정체성
 *   (이름·타입·dex·HP·레어도)은 이미 DB에 올바르게 존재 → 순수 이미지 채움.
 *     #016 キュウコンBREAK (Ninetales, Fire, dex38, HP140)
 *     #030 スターミーBREAK (Starmie, Water, dex121, HP130)
 *     #044 ニドキングBREAK (Nidoking, Psychic, dex34, HP180)
 *     #058 カイリキーBREAK (Machamp, Fighting, dex68, HP190)
 * 출처: 사용자 제공 tcgcollector 이미지(URL). ★사용자 지시 = 공식 사이트에 이미지가 있어도
 *   첨부 이미지를 사용. (공식 pokemon-card.com pg=CP6 에도 존재 확인됨 → 정보 가용성만 확인)
 *   4장 2×2 몽타주 시각검증 완료: HP/타입/일본어 명칭 전부 DB 정체성과 일치, 뒤섞임 없음.
 *
 * 동작: 첨부 다운 → webp large(q90)+245 small(q80) → R2 og-cp6/ja/{size}/jp-tcg-CP6/{n}.webp
 *   → 기존 RegionCard imageLarge/Small UPDATE. ★이미지 전용, 정체성·연결 불변.
 *
 * dry: npx tsx scripts/fill-cp6-images.ts
 * 적용: npx tsx scripts/fill-cp6-images.ts --apply
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
const SET = "jp-tcg-CP6", PACK = "og-cp6";

const CARDS = [
  { number: "016", name: "キュウコンBREAK", img: "https://static.tcgcollector.com/content/images/39/5f/19/395f193ac7d3e460cce0b95e1190ce31734f783f1c49a7819d7e31e295cf2276.jpg" },
  { number: "030", name: "スターミーBREAK", img: "https://static.tcgcollector.com/content/images/c3/0b/01/c30b01bbe42d357d00d77851006182eb7d6871ff096f5ca214e492a481f307b2.jpg" },
  { number: "044", name: "ニドキングBREAK", img: "https://static.tcgcollector.com/content/images/b8/d0/b4/b8d0b4e88b6ed89e9e5713a6e7e873f5100e64b59a6a15d63a084bdd06fd1d6a.jpg" },
  { number: "058", name: "カイリキーBREAK", img: "https://static.tcgcollector.com/content/images/21/d8/b8/21d8b85eaefc614f09473064e2026a11784c16e2d5781161f9c8fc9d2e25dfbe.jpg" },
];

async function dl(url: string): Promise<Buffer> {
  const { stdout } = await exec("curl", ["-sSL", "--fail", "--max-time", "30", "-A", "Mozilla/5.0", url], { maxBuffer: 20 * 1024 * 1024, encoding: "buffer" } as any);
  const b = stdout as unknown as Buffer; if (b.length < 4000) throw new Error(`small ${b.length}`); return b;
}

async function main() {
  assertWritable([PACK], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "fill-cp6-images" });
  console.log(`${APPLY ? "APPLY" : "DRY"} fill-cp6-images | ${CARDS.length}장 (BREAK 이미지 필)`);
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
    console.log(`\njp-tcg-CP6 이미지 보유: ${cov}/${total}`);
  }
}
main().catch((e) => { console.error("FAIL:", e); process.exit(1); }).finally(() => prisma.$disconnect());
