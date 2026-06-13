// SM12a 시크릿 #211~226 일러스트(이미지) 채우기 — 사용자 제공 tcgcollector URL.
//   매핑은 카드에 인쇄된 번호("SM12a NNN/173")를 이미지에서 직접 눈으로 확인해 확정(01→211 … 16→226).
//   tcgcollector CDN 은 핫링크 허용(referer 무관 200) 확인됨. imageSmall=imageLarge=동일 URL.
//   #202~210 기본에너지는 이미 유효한 R2 이미지 보유 → 건드리지 않음.
// 기본 dry-run, --apply 로 기록.
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "./lib/protected-groups";

const APPLY = process.argv.includes("--apply");

// 시각 확인 완료: 각 URL = 카드에 찍힌 번호. (도감순 = 콜렉션번호순 211~226)
const MAP: { num: number; url: string }[] = [
  { num: 211, url: "https://static.tcgcollector.com/content/images/34/f9/f4/34f9f4956d2f708d5db9cc818166973b3ef82b75fce6596d3ad62b4c717b0933.jpg" }, // ヨワシGX HR
  { num: 212, url: "https://static.tcgcollector.com/content/images/e8/1b/fa/e81bfaf3cc637efeb4f54e2e886635c7fdf567122250489f21fced07f39a224b.jpg" }, // エーフィ&デオキシスGX HR
  { num: 213, url: "https://static.tcgcollector.com/content/images/70/a6/5f/70a65fe7bb09a5fe27f6590d73f364421fbc3837f9de033bfec3550cc71923f1.jpg" }, // オーロット&ヨノワールGX HR
  { num: 214, url: "https://static.tcgcollector.com/content/images/ca/db/84/cadb84235455b8a0904ff794d84106b88ad28b1f48d0876e937f7ac010718a87.jpg" }, // ジラーチGX HR
  { num: 215, url: "https://static.tcgcollector.com/content/images/09/4e/b4/094eb467cda93513030d82f24e0768a63ba69d31da56956b352f5ae44d36f8f8.jpg" }, // ブラッキー&ダークライGX HR
  { num: 216, url: "https://static.tcgcollector.com/content/images/37/15/74/3715740fd0ed9b17b76b61bcc9928ecca03b2d3ffdba10cf639a56ee49f6feec.jpg" }, // マニューラGX HR
  { num: 217, url: "https://static.tcgcollector.com/content/images/ce/60/19/ce601970ab68854ae3c517316c7fc456341d331f983ab418252fa9337451c771.jpg" }, // メルメタルGX HR
  { num: 218, url: "https://static.tcgcollector.com/content/images/68/04/a7/6804a7ec0c612d8e2a5d679bcf2c4c2051ebb7a53e3a790910f73e8508b0f8e7.jpg" }, // トゲピー&ピィ&ププリンGX HR
  { num: 219, url: "https://static.tcgcollector.com/content/images/bf/61/41/bf6141abd60081847cdcbe3f9ab739737dcf28af843a7e3864b766ff9f5a9e0f.jpg" }, // イーブイGX HR
  { num: 220, url: "https://static.tcgcollector.com/content/images/e9/41/cb/e941cbf875d566939e17d315b9c2301e8422ba7363e23efac9ed9ac483c7e0c6.jpg" }, // レシラム&リザードンGX UR
  { num: 221, url: "https://static.tcgcollector.com/content/images/38/65/85/3865851da3a8e3495575c8ce6fe97f7a56440a47a7b710625ffc22868fa8e04e.jpg" }, // ピカチュウ&ゼクロムGX UR
  { num: 222, url: "https://static.tcgcollector.com/content/images/a1/d1/68/a1d168feb3b89ef4dba24903e5ecd714d8c7bf52711a0e691a1f497261b7b150.jpg" }, // ミュウツー&ミュウGX UR
  { num: 223, url: "https://static.tcgcollector.com/content/images/e4/55/60/e4556042b0c0ca0595ab53b1ac7182ca40e62a4e48c618a4ac04ea1a7aed30ce.jpg" }, // ゲッコウガ&ゾロアークGX UR
  { num: 224, url: "https://static.tcgcollector.com/content/images/bb/e5/6c/bbe56ce347cd2f54fc8b4fe98c346a7e61d1ba82a47191b474d05e347b1bf9d5.jpg" }, // ルカリオ&メルメタルGX UR
  { num: 225, url: "https://static.tcgcollector.com/content/images/48/9e/42/489e427a24a8dfed2d3a2c268ea0cc9c4e27af7080897aaf1727817f2ef6ea49.jpg" }, // ガブリアス&ギラティナGX UR
  { num: 226, url: "https://static.tcgcollector.com/content/images/68/91/67/6891679a851062c32f1b7d9ebcdd64b2b533a8684352e52618f7ce42d2dbbc5b.jpg" }, // ファイヤー&サンダー&フリーザーGX UR
];

async function main() {
  assertWritable(["og-sm12a"], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "fill-sm12a-secret-images" });

  console.log(`\n=== 이미지 채우기 (${APPLY ? "APPLY" : "DRY-RUN"}) — ${MAP.length}장 ===`);
  for (const { num, url } of MAP) {
    const rc = await prisma.regionCard.findUnique({ where: { id: `jp-tcg-SM12a-${num}` }, select: { name: true, imageSmall: true } });
    if (!rc) { console.warn(`  #${num}: ❌ RegionCard 없음`); continue; }
    console.log(`  #${num} ${rc.name}  ${rc.imageSmall ? "(기존 있음 — 덮어씀)" : "(null → 채움)"}  ← ${url.slice(-20)}`);
  }

  if (!APPLY) { console.log("\n(dry-run — --apply 로 기록)"); await prisma.$disconnect(); return; }

  let n = 0;
  for (const { num, url } of MAP) {
    await prisma.regionCard.update({ where: { id: `jp-tcg-SM12a-${num}` }, data: { imageSmall: url, imageLarge: url } });
    n++;
  }
  console.log(`\n✅ ${n}장 이미지 기록 완료.`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
