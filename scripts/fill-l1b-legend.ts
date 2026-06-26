/**
 * ソウルシルバーコレクション (jp-tcg-L1b, og-l1b) #029·#030 이미지 누락 채우기 — ルギアLEGEND 상·하.
 *   #029 ルギアLEGEND (상반부, Lugia, HP130) / #030 ルギアLEGEND (하반부, 기술)
 *
 * 배경: 정체성 이미 존재. ★LEGEND 쌍은 이름이 같아 상/하 못 가림 → 확대 시각검증:
 *   #029=상(HP130+이름배너+Lugia 상단) / #030=하(기술 アクアバースト+Lugia 하단) 확인(번호순=상→하, 사용자 순서 일치).
 * 출처: 사용자 제공 tcgcollector 이미지(URL).
 *
 * 동작: 다운 → webp large(q90)+245 small(q80) → R2 og-l1b/ja/{size}/jp-tcg-L1b/{NNN}.webp
 *   → 기존 RegionCard imageLarge/Small UPDATE. ★이미지 전용, 정체성·연결 불변.
 *
 * dry: npx tsx scripts/fill-l1b-legend.ts
 * 적용: npx tsx scripts/fill-l1b-legend.ts --apply
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
const SET = "jp-tcg-L1b", PACK = "og-l1b";

const CARDS = [
  { number: "029", name: "ルギアLEGEND", img: "https://static.tcgcollector.com/content/images/e8/59/dc/e859dc35f34db7a972c39ca6aea6bf2d19ffb338bdc78de3fdb80b051d067e48.webp" },
  { number: "030", name: "ルギアLEGEND", img: "https://static.tcgcollector.com/content/images/c1/40/e8/c140e8908a368d2fb45331f7c60fc178ecb23e4a2956a6256440f976839bcc19.webp" },
];

async function dl(url: string): Promise<Buffer> {
  const { stdout } = await exec("curl", ["-sSL", "--fail", "--max-time", "30", "-A", "Mozilla/5.0", url], { maxBuffer: 20 * 1024 * 1024, encoding: "buffer" } as any);
  const b = stdout as unknown as Buffer; if (b.length < 4000) throw new Error(`small ${b.length}`); return b;
}

async function main() {
  assertWritable([PACK], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "fill-l1b-legend" });
  console.log(`${APPLY ? "APPLY" : "DRY"} fill-l1b-legend | ${CARDS.length}장 (ルギアLEGEND 상·하)`);
  for (const c of CARDS) {
    const rc = await prisma.regionCard.findFirst({ where: { setId: SET, number: c.number, region: "JP" }, select: { id: true, name: true, imageLarge: true } });
    if (!rc) throw new Error(`#${c.number} RegionCard 없음`);
    if (rc.name !== c.name) throw new Error(`#${c.number} 이름 불일치 DB="${rc.name}" vs "${c.name}"`);
    const largeKey = r2KeyFor(PACK, "ja", "large", SET, c.number, "webp");
    const smallKey = r2KeyFor(PACK, "ja", "small", SET, c.number, "webp");
    console.log(`  #${c.number} ${c.name} (${rc.imageLarge ? "있음" : "NULL"}) → ${largeKey}`);
    if (!APPLY) continue;
    const buf = await dl(c.img);
    const meta = await sharp(buf).metadata();
    if (!meta.width || meta.width < 200) throw new Error(`#${c.number} 이미지 의심 w=${meta.width}`);
    await uploadBuffer(largeKey, await sharp(buf).webp({ quality: 90 }).toBuffer(), "image/webp");
    await uploadBuffer(smallKey, await sharp(buf).resize({ width: 245, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer(), "image/webp");
    if (!(await headExists(largeKey)) || !(await headExists(smallKey))) throw new Error(`#${c.number} R2 verify 실패`);
    await prisma.regionCard.update({ where: { id: rc.id }, data: { imageLarge: r2PublicUrl(largeKey), imageSmall: r2PublicUrl(smallKey) } });
    console.log(`    ✓ ${rc.id} 갱신`);
  }
  if (APPLY) {
    const noImg = await prisma.regionCard.count({ where: { setId: SET, imageLarge: null } });
    console.log(`\njp-tcg-L1b 잔여 이미지없음: ${noImg}`);
  }
}
main().catch((e) => { console.error("FAIL:", e); process.exit(1); }).finally(() => prisma.$disconnect());
