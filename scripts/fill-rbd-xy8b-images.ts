/**
 * 라이츄 BREAK 진화팩 + 붉은 섬광 이미지 누락 채우기.
 *   [RBD] BREAK進化パック「ライチュウBREAK」(jp-tcg-RBD, xy-decks)
 *     #003 ライチュウBREAK (Raichu, Lightning, dex26, HP130)
 *   [XY8b] 赤い閃光 「붉은 섬광」 (jp-tcg-XY8b, og-xy8b)
 *     #006 ブリガロンBREAK (Chesnaught, Grass, dex652, HP190) ※cardId=lc-jp-tcg-CP4-015(재록 병합)
 *     #036 ガラガラBREAK (Marowak, Fighting, dex105, HP140)
 *
 * 배경: 셋 다 정체성은 이미 DB에 올바르게 존재 → 순수 이미지 채움.
 * 출처: 사용자 제공 tcgcollector 이미지(URL). ★지시 = 공식에 있어도 첨부 이미지 사용.
 *   3장 몽타주 시각검증 완료: HP/타입/일본어 명칭 전부 DB 정체성과 일치, 뒤섞임 없음.
 *
 * 동작: 첨부 다운 → webp large(q90)+245 small(q80) → R2 {pack}/ja/{size}/{setId}/{n}.webp
 *   → 기존 RegionCard imageLarge/Small UPDATE. ★이미지 전용, 정체성·연결 불변.
 *
 * dry: npx tsx scripts/fill-rbd-xy8b-images.ts
 * 적용: npx tsx scripts/fill-rbd-xy8b-images.ts --apply
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

type Item = { setId: string; pack: string; number: string; name: string; img: string };
const CARDS: Item[] = [
  { setId: "jp-tcg-RBD", pack: "xy-decks", number: "003", name: "ライチュウBREAK", img: "https://static.tcgcollector.com/content/images/c8/61/ff/c861ff544566172a8d66757b2585f62cc7e3be1e6f6e8eae249e10381f5aafc1.jpg" },
  { setId: "jp-tcg-XY8b", pack: "og-xy8b", number: "006", name: "ブリガロンBREAK", img: "https://static.tcgcollector.com/content/images/59/b8/f4/59b8f4f509f7f8518c50890c1ad03061bc180f9045041731068fbfcebb609d07.jpg" },
  { setId: "jp-tcg-XY8b", pack: "og-xy8b", number: "036", name: "ガラガラBREAK", img: "https://static.tcgcollector.com/content/images/b3/d5/62/b3d562cde1cb6d6045d089b3f2a62408b361af2660eb4473ff3b373d601f71b7.jpg" },
];

async function dl(url: string): Promise<Buffer> {
  const { stdout } = await exec("curl", ["-sSL", "--fail", "--max-time", "30", "-A", "Mozilla/5.0", url], { maxBuffer: 20 * 1024 * 1024, encoding: "buffer" } as any);
  const b = stdout as unknown as Buffer; if (b.length < 4000) throw new Error(`small ${b.length}`); return b;
}

async function main() {
  const packs = [...new Set(CARDS.map((c) => c.pack))];
  assertWritable(packs, { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "fill-rbd-xy8b-images" });
  console.log(`${APPLY ? "APPLY" : "DRY"} fill-rbd-xy8b-images | ${CARDS.length}장 (BREAK 이미지 필)`);
  for (const c of CARDS) {
    const rc = await prisma.regionCard.findFirst({ where: { setId: c.setId, number: c.number, region: "JP" }, select: { id: true, name: true, imageLarge: true } });
    if (!rc) throw new Error(`${c.setId} #${c.number} RegionCard 없음`);
    if (rc.name !== c.name) throw new Error(`${c.setId} #${c.number} 이름 불일치: DB="${rc.name}" vs "${c.name}"`);
    const largeKey = r2KeyFor(c.pack, "ja", "large", c.setId, c.number, "webp");
    const smallKey = r2KeyFor(c.pack, "ja", "small", c.setId, c.number, "webp");
    console.log(`  [${c.setId}] #${c.number} ${c.name} (현재 img=${rc.imageLarge ? "있음" : "NULL"}) → ${largeKey}`);
    if (!APPLY) continue;
    const buf = await dl(c.img);
    const meta = await sharp(buf).metadata();
    if (!meta.width || meta.width < 300) throw new Error(`${c.setId} #${c.number} 이미지 의심 w=${meta.width}`);
    await uploadBuffer(largeKey, await sharp(buf).webp({ quality: 90 }).toBuffer(), "image/webp");
    await uploadBuffer(smallKey, await sharp(buf).resize({ width: 245, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer(), "image/webp");
    if (!(await headExists(largeKey)) || !(await headExists(smallKey))) throw new Error(`${c.setId} #${c.number} R2 verify 실패`);
    await prisma.regionCard.update({ where: { id: rc.id }, data: { imageLarge: r2PublicUrl(largeKey), imageSmall: r2PublicUrl(smallKey) } });
    console.log(`    ✓ ${rc.id} 업데이트`);
  }
  if (APPLY) {
    for (const setId of [...new Set(CARDS.map((c) => c.setId))]) {
      const cov = await prisma.regionCard.count({ where: { setId, imageLarge: { not: null } } });
      const total = await prisma.regionCard.count({ where: { setId } });
      console.log(`${setId} 이미지 보유: ${cov}/${total}`);
    }
  }
}
main().catch((e) => { console.error("FAIL:", e); process.exit(1); }).finally(() => prisma.$disconnect());
