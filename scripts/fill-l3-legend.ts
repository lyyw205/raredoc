/**
 * 頂上大激突 (jp-tcg-L3, og-l3) #070-#075 이미지 누락 채우기 — LEGEND 카드 6장(상·하 분할 3쌍).
 *   #070 カイオーガ&グラードンLEGEND (상반부, Kyogre, HP150)
 *   #071 カイオーガ&グラードンLEGEND (하반부, Groudon)
 *   #072 パルキア&ディアルガLEGEND (상반부, Palkia, HP160)
 *   #073 パルキア&ディアルガLEGEND (하반부, Dialga)
 *   #074 レックウザ&デオキシスLEGEND (상반부, Rayquaza, HP140)
 *   #075 レックウザ&デオキシスLEGEND (하반부, Deoxys)
 *
 * 배경: 정체성 이미 존재. ★LEGEND 쌍은 이름이 같아 이름검증으로 상/하 뒤바뀜을 못 잡음 →
 *   첨부 6장을 확대 시각검증: 상반부(#070/072/074)=HP+이름배너+첫포켓몬, 하반부(#071/073/075)=기술텍스트
 *   확인 완료(번호순 = 상→하, 사용자 제공 순서와 일치).
 * 출처: 사용자 제공 tcgcollector 이미지(URL).
 *
 * 동작: 다운 → webp large(q90)+245 small(q80) → R2 og-l3/ja/{size}/jp-tcg-L3/{NNN}.webp
 *   → 기존 RegionCard imageLarge/Small UPDATE. ★이미지 전용, 정체성·연결 불변.
 *
 * dry: npx tsx scripts/fill-l3-legend.ts
 * 적용: npx tsx scripts/fill-l3-legend.ts --apply
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
const SET = "jp-tcg-L3", PACK = "og-l3";

const CARDS = [
  { number: "070", name: "カイオーガ&グラードンLEGEND", img: "https://static.tcgcollector.com/content/images/56/62/a9/5662a9f883afebbf2c14103cd44b297b17d36e593d7997233f9713a33e599dfd.webp" },
  { number: "071", name: "カイオーガ&グラードンLEGEND", img: "https://static.tcgcollector.com/content/images/3a/1a/70/3a1a70e283611682319fcfe853bba704ee3c24e5748363ea11d467d429802b36.webp" },
  { number: "072", name: "パルキア&ディアルガLEGEND", img: "https://static.tcgcollector.com/content/images/1a/30/4f/1a304fa68ab3c0f94e0cf62ec182ece18f46b5a8a414cdbb6708ba23fea69fe3.webp" },
  { number: "073", name: "パルキア&ディアルガLEGEND", img: "https://static.tcgcollector.com/content/images/d5/d3/50/d5d350b7995b604a1407cad43394378376dc8e0039c861752f32854b4d2dcfc9.webp" },
  { number: "074", name: "レックウザ&デオキシスLEGEND", img: "https://static.tcgcollector.com/content/images/dd/ab/d9/ddabd9a590ecce8d728cb9d90dc0ce5148a5e3538bc360f22cbb74caa0251558.webp" },
  { number: "075", name: "レックウザ&デオキシスLEGEND", img: "https://static.tcgcollector.com/content/images/3d/4a/6b/3d4a6bc8a36338df389f1aa16c8a2fd3ecf17996ccaeac1f6cc0d932c8ac94e3.webp" },
];

async function dl(url: string): Promise<Buffer> {
  const { stdout } = await exec("curl", ["-sSL", "--fail", "--max-time", "30", "-A", "Mozilla/5.0", url], { maxBuffer: 20 * 1024 * 1024, encoding: "buffer" } as any);
  const b = stdout as unknown as Buffer; if (b.length < 4000) throw new Error(`small ${b.length}`); return b;
}

async function main() {
  assertWritable([PACK], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "fill-l3-legend" });
  console.log(`${APPLY ? "APPLY" : "DRY"} fill-l3-legend | ${CARDS.length}장 (LEGEND 상·하 6장)`);
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
    console.log(`\njp-tcg-L3 잔여 이미지없음: ${noImg}`);
  }
}
main().catch((e) => { console.error("FAIL:", e); process.exit(1); }).finally(() => prisma.$disconnect());
