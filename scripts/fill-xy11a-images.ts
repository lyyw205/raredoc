/**
 * 冷酷の反逆者 「냉혹한 반역자」 (jp-tcg-XY11a, og-xy11a) #008·#034·#043 이미지 누락 채우기.
 *
 * 배경: jp-tcg-XY11a 59장 중 3장(전부 BREAK 카드)만 imageLarge/Small=NULL. 정체성
 *   (이름·타입·dex·HP·레어도)은 이미 DB에 올바르게 존재 → 순수 이미지 채움.
 *     #008 メガヤンマBREAK (Yanmega, Grass, dex469, HP140)
 *     #034 イベルタルBREAK (Yveltal, Darkness, dex717, HP150)
 *     #043 サザンドラBREAK (Hydreigon, Dragon, dex635, HP190)
 * 출처: 사용자 제공 tcgcollector 이미지(URL). ★지시 = 공식에 있어도 첨부 이미지 사용.
 *   3장 몽타주 시각검증 완료: HP/타입/일본어 명칭 전부 DB 정체성과 일치, 뒤섞임 없음.
 *
 * 동작: 첨부 다운 → webp large(q90)+245 small(q80) → R2 og-xy11a/ja/{size}/jp-tcg-XY11a/{n}.webp
 *   → 기존 RegionCard imageLarge/Small UPDATE. ★이미지 전용, 정체성·연결 불변.
 *
 * dry: npx tsx scripts/fill-xy11a-images.ts
 * 적용: npx tsx scripts/fill-xy11a-images.ts --apply
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
const SET = "jp-tcg-XY11a", PACK = "og-xy11a";

const CARDS = [
  { number: "008", name: "メガヤンマBREAK", img: "https://static.tcgcollector.com/content/images/e6/c3/6b/e6c36b6de064ad87ba91d42cc93cd73b5e5fed07e507a1e9fd58c1d7b4067641.jpg" },
  { number: "034", name: "イベルタルBREAK", img: "https://static.tcgcollector.com/content/images/96/7e/4a/967e4ac63f46b4757b07fa1becf913b1ec1e5dcc31646db8624e7f6585490abd.jpg" },
  { number: "043", name: "サザンドラBREAK", img: "https://static.tcgcollector.com/content/images/7c/85/f8/7c85f8c3529a8d985cad3490fb256173e8c9a77311bc6360777cc84dfa003343.jpg" },
];

async function dl(url: string): Promise<Buffer> {
  const { stdout } = await exec("curl", ["-sSL", "--fail", "--max-time", "30", "-A", "Mozilla/5.0", url], { maxBuffer: 20 * 1024 * 1024, encoding: "buffer" } as any);
  const b = stdout as unknown as Buffer; if (b.length < 4000) throw new Error(`small ${b.length}`); return b;
}

async function main() {
  assertWritable([PACK], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "fill-xy11a-images" });
  console.log(`${APPLY ? "APPLY" : "DRY"} fill-xy11a-images | ${CARDS.length}장 (BREAK 이미지 필)`);
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
    console.log(`\njp-tcg-XY11a 이미지 보유: ${cov}/${total}`);
  }
}
main().catch((e) => { console.error("FAIL:", e); process.exit(1); }).finally(() => prisma.$disconnect());
