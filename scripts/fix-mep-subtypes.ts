/**
 * en-tcg-mep subtypes 표기 정규화 — "Stage1"→"Stage 1", "Stage2"→"Stage 2".
 *   MEP 는 Limitless/TCGdex 적재라 진화단계가 공백없는 형태로 들어가 DB 표준("Stage 1"/"Stage 2",
 *   DexCatalog STAGE_SUBTYPES 와도 일치)과 어긋났음 → 진화단계 라벨 미표시. DB 전체 anomaly 36장이 전부 MEP.
 *   비동결(cardPackId=null).
 *
 * 실행: npx tsx scripts/fix-mep-subtypes.ts            (dry-run)
 *       npx tsx scripts/fix-mep-subtypes.ts --apply
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { assertWritable } from "./lib/protected-groups";

const MAP: Record<string, string> = { Stage1: "Stage 1", Stage2: "Stage 2" };

async function main() {
  const apply = process.argv.includes("--apply");
  const set = await prisma.set.findUnique({ where: { id: "en-tcg-mep" }, select: { cardPackId: true } });
  assertWritable([set?.cardPackId], { dryRun: !apply, tool: "fix-mep-subtypes" });

  // en-tcg-mep 에 속한 LogicalCard 중 subtypes 에 Stage1/Stage2 포함된 것
  const lcs = await prisma.card.findMany({
    where: { locales: { some: { setId: "en-tcg-mep" } }, subtypes: { hasSome: ["Stage1", "Stage2"] } },
    select: { id: true, subtypes: true, locales: { where: { setId: "en-tcg-mep" }, select: { number: true } } },
  });
  console.log(`${apply ? "[APPLY]" : "[DRY]"} 정규화 대상 ${lcs.length}장`);
  for (const lc of lcs) {
    const next = lc.subtypes.map((s) => MAP[s] ?? s);
    const num = lc.locales[0]?.number ?? "?";
    console.log(`  #${num}: [${lc.subtypes.join(",")}] → [${next.join(",")}]`);
    if (apply) await prisma.card.update({ where: { id: lc.id }, data: { subtypes: next } });
  }
  console.log(apply ? "✅ 완료" : "(dry-run — --apply 로 적용)");
}

main().then(() => prisma.$disconnect()).catch((e) => { console.error(e); prisma.$disconnect(); process.exit(1); });
