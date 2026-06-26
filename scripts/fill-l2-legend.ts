/**
 * よみがえる伝説 (jp-tcg-L2, og-l2) #063-#068 이미지 누락 채우기 — LEGEND 6장(상·하 3쌍).
 *   #063 エンテイ&ライコウLEGEND (상, Entei, HP140) / #064 (하, Raikou)
 *   #065 スイクン&エンテイLEGEND (상, Suicune, HP160) / #066 (하, Entei)
 *   #067 ライコウ&スイクンLEGEND (상, Raikou, HP160) / #068 (하, Suicune)
 *
 * 배경: 정체성 이미 존재. ★LEGEND 쌍은 이름이 같아 상/하 못 가림 → 확대 시각검증:
 *   상반부(#063/065/067)=HP+이름배너+첫 비스트, 하반부(#064/066/068)=기술텍스트 확인(번호순=상→하, 사용자 순서 일치).
 * 출처: 사용자 제공 tcgcollector 이미지(URL).
 *
 * 동작: 다운 → webp large(q90)+245 small(q80) → R2 og-l2/ja/{size}/jp-tcg-L2/{NNN}.webp
 *   → 기존 RegionCard imageLarge/Small UPDATE. ★이미지 전용, 정체성·연결 불변.
 *
 * dry: npx tsx scripts/fill-l2-legend.ts
 * 적용: npx tsx scripts/fill-l2-legend.ts --apply
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
const SET = "jp-tcg-L2", PACK = "og-l2";

const CARDS = [
  { number: "063", name: "エンテイ&ライコウLEGEND", img: "https://static.tcgcollector.com/content/images/df/5e/e4/df5ee44cef3ae69288e105c380a66ec935ef56849318dc7408c6dea7245f4d26.webp" },
  { number: "064", name: "エンテイ&ライコウLEGEND", img: "https://static.tcgcollector.com/content/images/80/f0/3e/80f03e1447baeb8c56de7fae5bcc11034092ce4f0ad3ae4f7455f9d360f41e7d.webp" },
  { number: "065", name: "スイクン&エンテイLEGEND", img: "https://static.tcgcollector.com/content/images/b2/0e/43/b20e43b5caf3ef1ece9c69efe992a20f2e0a69add30517a42c83f53e49cc264d.webp" },
  { number: "066", name: "スイクン&エンテイLEGEND", img: "https://static.tcgcollector.com/content/images/fc/08/f1/fc08f116683890113bc990b024a307f69a4148f36a16c3825f1c00d9073897cd.webp" },
  { number: "067", name: "ライコウ&スイクンLEGEND", img: "https://static.tcgcollector.com/content/images/90/cb/8b/90cb8bd94d4f2d9096a6794a2a1a414455174b291ee79d8fc7cdde7b6cb33754.webp" },
  { number: "068", name: "ライコウ&スイクンLEGEND", img: "https://static.tcgcollector.com/content/images/57/08/40/570840824f22663cbd9d2447c87ccf2dfb9019ceee863a14ef1d78788a7499d8.webp" },
];

async function dl(url: string): Promise<Buffer> {
  const { stdout } = await exec("curl", ["-sSL", "--fail", "--max-time", "30", "-A", "Mozilla/5.0", url], { maxBuffer: 20 * 1024 * 1024, encoding: "buffer" } as any);
  const b = stdout as unknown as Buffer; if (b.length < 4000) throw new Error(`small ${b.length}`); return b;
}

async function main() {
  assertWritable([PACK], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "fill-l2-legend" });
  console.log(`${APPLY ? "APPLY" : "DRY"} fill-l2-legend | ${CARDS.length}장 (LEGEND 상·하 6장)`);
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
    console.log(`\njp-tcg-L2 잔여 이미지없음: ${noImg}`);
  }
}
main().catch((e) => { console.error("FAIL:", e); process.exit(1); }).finally(() => prisma.$disconnect());
