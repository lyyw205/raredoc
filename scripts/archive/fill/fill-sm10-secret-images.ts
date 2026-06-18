// 더블블레이즈 (og-sm10) 시크릿 #108~116 이미지 채우기 — manifest 의 tcgcollector URL.
//   매핑은 카드 인쇄번호("SM10 NNN/095")를 이미지에서 직접 눈으로 확인해 확정(도감순 1→108 … 9→116).
//   imageSmall=imageLarge=동일 URL. 기본 dry-run, --apply 로 기록.
import "dotenv/config";
import { prisma } from "../../../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "../../lib/protected-groups";
import fs from "node:fs";

const APPLY = process.argv.includes("--apply");
const JP = "jp-tcg-SM10";

const manifest = JSON.parse(fs.readFileSync("/tmp/sm_illust_manifest.json", "utf8"));
const urls: string[] = manifest["더블블레이즈"].urls; // 도감순 1..9

// 시각 확인: 도감순 i(1-based) → 시크릿번호 108 + (i-1)
const MAP = urls.map((url, idx) => ({ num: 108 + idx, url }));

async function main() {
  assertWritable(["og-sm10"], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "fill-sm10-secret-images" });

  console.log(`\n=== 이미지 채우기 (${APPLY ? "APPLY" : "DRY-RUN"}) — ${MAP.length}장 ===`);
  for (const { num, url } of MAP) {
    const rc = await prisma.regionCard.findUnique({ where: { id: `${JP}-${num}` }, select: { name: true, imageSmall: true } });
    if (!rc) { console.warn(`  #${num}: ❌ RegionCard 없음`); continue; }
    console.log(`  #${num} ${rc.name}  ${rc.imageSmall ? "(기존 있음 — 덮어씀)" : "(null → 채움)"}  ← ${url.slice(-24)}`);
  }

  if (!APPLY) { console.log("\n(dry-run — --apply 로 기록)"); await prisma.$disconnect(); return; }

  let n = 0;
  for (const { num, url } of MAP) {
    await prisma.regionCard.update({ where: { id: `${JP}-${num}` }, data: { imageSmall: url, imageLarge: url } });
    n++;
  }
  console.log(`\n✅ ${n}장 이미지 기록 완료.`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
