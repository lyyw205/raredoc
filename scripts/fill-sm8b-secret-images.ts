// SM8b 시크릿 #244~250 일러스트(이미지) 채우기 — 사용자 제공 tcgcollector URL.
//   매핑은 카드에 인쇄된 번호("SM8b NNN/150")를 이미지에서 직접 눈으로 확인해 확정(도감순 url 1..7 → 244..250).
//   tcgcollector CDN 핫링크 허용. imageSmall=imageLarge=동일 URL.
// 기본 dry-run, --apply 로 기록.
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "./lib/protected-groups";

const APPLY = process.argv.includes("--apply");
const JP_SET = "jp-tcg-SM8b";

// 시각 확인 완료: 각 URL = 카드에 찍힌 번호 (도감순 = 콜렉션번호순 244~250)
const MAP: { num: number; url: string }[] = [
  { num: 244, url: "https://static.tcgcollector.com/content/images/93/aa/5c/93aa5c2d05e62e72d1f9b63082e046218b56bdd20becdb94036fdf545dbdd495.jpg" }, // カプ・ブルルGX UR
  { num: 245, url: "https://static.tcgcollector.com/content/images/3d/b9/d0/3db9d0213a08a2b24a65d631405c1a3e570520f9116ee8bec6f3c70d07b398a8.jpg" }, // カプ・レヒレGX UR
  { num: 246, url: "https://static.tcgcollector.com/content/images/78/4d/cc/784dcc26a2e01d9941ac819be2bde24e440b270bdb3447b3faaaf546498e3a9f.jpg" }, // カプ・コケコGX UR
  { num: 247, url: "https://static.tcgcollector.com/content/images/85/7e/aa/857eaacbbbe6722d9913e73d7fc9366d1f071edf65b3db8664202bb329ff48c4.jpg" }, // カプ・テテフGX UR
  { num: 248, url: "https://static.tcgcollector.com/content/images/02/e6/ef/02e6efe9d5657e5f2806242a7fa7da3a4eac4240f7666160b187a80d30ed95c4.jpg" }, // ルナアーラGX UR
  { num: 249, url: "https://static.tcgcollector.com/content/images/d9/63/ec/d963ec36002d33698c6cd9ad302d617aaaf353202d27a39ea42f7e7ddc2e9a35.jpg" }, // ソルガレオGX UR
  { num: 250, url: "https://static.tcgcollector.com/content/images/09/01/f8/0901f8a9c6fa3a007b7911cc8eaef185cf537585b3deba9b090dbfec8b42e681.jpg" }, // ウルトラネクロズマGX UR
];

async function main() {
  assertWritable(["og-sm8b"], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "fill-sm8b-secret-images" });

  console.log(`\n=== 이미지 채우기 (${APPLY ? "APPLY" : "DRY-RUN"}) — ${MAP.length}장 ===`);
  for (const { num, url } of MAP) {
    const rc = await prisma.regionCard.findUnique({ where: { id: `${JP_SET}-${num}` }, select: { name: true, imageSmall: true } });
    if (!rc) { console.warn(`  #${num}: ❌ RegionCard 없음`); continue; }
    console.log(`  #${num} ${rc.name}  ${rc.imageSmall ? "(기존 있음 — 덮어씀)" : "(null → 채움)"}  ← ${url.slice(-20)}`);
  }

  if (!APPLY) { console.log("\n(dry-run — --apply 로 기록)"); await prisma.$disconnect(); return; }

  let n = 0;
  for (const { num, url } of MAP) {
    await prisma.regionCard.update({ where: { id: `${JP_SET}-${num}` }, data: { imageSmall: url, imageLarge: url } });
    n++;
  }
  console.log(`\n✅ ${n}장 이미지 기록 완료.`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
