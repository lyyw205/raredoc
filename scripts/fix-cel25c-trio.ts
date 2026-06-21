/**
 * cel25c(Celebrations Classic Collection) 3장 손상 교정.
 *   dedupe-en-sm-stubs 로 정본 en-tcg-cel25c 에 흡수된 Venusaur·Here Comes Team Rocket!·Claydol 이
 *   번호="15"·이미지 공유(cel25c/15.png)로 깨져 있음. Classic Collection 은 4장이 모두 #15(원본번호 공유)이며
 *   pokemontcg.io 가 letter 로 구분: 15_A=Venusaur · 15_B=Here Comes Team Rocket! · 15_C=Rocket's Zapdos · 15_D=Claydol.
 *   정본엔 이미 "015 Rocket's Zapdos"(정상)가 있으므로, 나머지 3장의 번호를 "015"(zero-pad 통일)로 맞추고
 *   이미지를 pokemontcg.io 정확본(letter 구분)으로 교정. (4장이 같은 015 라 R2 number-key 충돌 → 소스 URL 직접 사용.)
 *
 * 실행: npx tsx scripts/fix-cel25c-trio.ts            (dry-run)
 *       npx tsx scripts/fix-cel25c-trio.ts --apply
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { assertWritable } from "./lib/protected-groups";

const SET = "en-tcg-cel25c";
const FIX: { name: string; letter: string }[] = [
  { name: "Venusaur", letter: "A" },
  { name: "Here Comes Team Rocket!", letter: "B" },
  { name: "Claydol", letter: "D" },
];
const img = (letter: string, hires: boolean) =>
  `https://images.pokemontcg.io/cel25c/15_${letter}${hires ? "_hires" : ""}.png`;

async function main() {
  const apply = process.argv.includes("--apply");
  const set = await prisma.set.findUnique({ where: { id: SET }, select: { cardPackId: true } });
  assertWritable([set?.cardPackId], { dryRun: !apply, tool: "fix-cel25c-trio" });

  for (const f of FIX) {
    const rows = await prisma.regionCard.findMany({
      where: { setId: SET, name: f.name, number: "15" },
      select: { id: true, number: true, imageSmall: true },
    });
    if (rows.length !== 1) { console.warn(`⚠ ${f.name}: number="15" 매칭 ${rows.length}건 (기대 1) — skip`); continue; }
    const r = rows[0];
    console.log(`${apply ? "[APPLY]" : "[DRY]"} ${f.name}: number 15→015, img→15_${f.letter}.png`);
    if (apply) {
      await prisma.regionCard.update({
        where: { id: r.id },
        data: { number: "015", numberInt: 15, imageSmall: img(f.letter, false), imageLarge: img(f.letter, true) },
      });
    }
  }
  console.log(apply ? "✅ 완료" : "(dry-run — --apply 로 적용)");
}

main().then(() => prisma.$disconnect()).catch((e) => { console.error(e); prisma.$disconnect(); process.exit(1); });
