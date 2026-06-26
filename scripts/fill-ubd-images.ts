/**
 * BREAK進化パック「オンバーンBREAK」(jp-tcg-UBD, xy-decks) #002 이미지 누락 채우기.
 *
 * 배경: jp-tcg-UBD 10장 중 #002 オンバーンBREAK(Noivern, Dragon, dex715, HP130)만 imageLarge/Small=NULL.
 *   정체성은 이미 DB에 올바르게 존재 → 순수 이미지 채움.
 *   ※ 사용자는 "SNPo #002"로 지칭했으나, 첨부 이미지(이름 オンバーンBREAK·HP130·BREAK)가 권위 →
 *      DB에서 이 카드는 jp-tcg-UBD #002 로 유일하게 확정(다른 세트에 동명 미존재).
 * 출처: 사용자 제공 tcgcollector 이미지(URL). ★지시 = 공식에 있어도 첨부 이미지 사용.
 *
 * 동작: 첨부 다운 → webp large(q90)+245 small(q80) → R2 xy-decks/ja/{size}/jp-tcg-UBD/002.webp
 *   → 기존 RegionCard imageLarge/Small UPDATE. ★이미지 전용, 정체성·연결 불변.
 *
 * dry: npx tsx scripts/fill-ubd-images.ts
 * 적용: npx tsx scripts/fill-ubd-images.ts --apply
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
const SET = "jp-tcg-UBD", PACK = "xy-decks";

const CARDS = [
  { number: "002", name: "オンバーンBREAK", img: "https://static.tcgcollector.com/content/images/e8/7b/76/e87b76d50042d87637b8f1a61f8acf6ec32358004a9bba879c73bd8893727f8c.jpg" },
];

async function dl(url: string): Promise<Buffer> {
  const { stdout } = await exec("curl", ["-sSL", "--fail", "--max-time", "30", "-A", "Mozilla/5.0", url], { maxBuffer: 20 * 1024 * 1024, encoding: "buffer" } as any);
  const b = stdout as unknown as Buffer; if (b.length < 4000) throw new Error(`small ${b.length}`); return b;
}

async function main() {
  assertWritable([PACK], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "fill-ubd-images" });
  console.log(`${APPLY ? "APPLY" : "DRY"} fill-ubd-images | ${CARDS.length}장 (BREAK 이미지 필)`);
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
    console.log(`\njp-tcg-UBD 이미지 보유: ${cov}/${total}`);
  }
}
main().catch((e) => { console.error("FAIL:", e); process.exit(1); }).finally(() => prisma.$disconnect());
