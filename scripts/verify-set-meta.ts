/**
 * Set.packType 정합 검증(CI) — 저장값이 set-meta.ts 분류기 + override 표와 일치하는지.
 * 신규 팩 stale(미백필 NULL)·분류기 변경 후 미반영·override 누락을 적발. mismatch 있으면 exit 1.
 *
 * Run: npx tsx scripts/verify-set-meta.ts
 * 설계: docs/design/dex-pack-typing.md §4
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { derivePackType } from "../src/lib/cards/set-meta";
import { PACK_TYPE_OVERRIDE } from "./lib/set-meta-overrides";

async function main() {
  const sets = await prisma.set.findMany({
    select: {
      id: true, name: true, nameKo: true, code: true, region: true, packType: true,
      cardPack: { select: { era: true } },
    },
    orderBy: { id: "asc" },
  });

  const mismatches: string[] = [];
  const stillNull: string[] = [];
  for (const s of sets) {
    const ov = PACK_TYPE_OVERRIDE[s.id];
    const primaryName = s.region === "EN" ? s.name : (s.nameKo ?? s.name);
    const expected = ov?.packType ?? derivePackType({ name: primaryName, code: s.code, rawEra: s.cardPack?.era });
    if (s.packType !== expected) {
      mismatches.push(`   ${s.id} [${s.region}] 저장=${s.packType ?? "null"} ≠ 기대=${expected ?? "null"} :: ${s.nameKo ?? s.name}`);
    }
    if (s.packType === null && expected === null) stillNull.push(`${s.id}(${s.region})`);
  }

  if (stillNull.length) {
    console.warn(`⚠ packType NULL ${stillNull.length}건(분류기도 null — override 또는 setGroup 백필 권장): ${stillNull.join(", ")}`);
  }
  if (mismatches.length) {
    console.error(`\n🛑 packType 불일치 ${mismatches.length}건 — backfill-set-meta.ts 재실행 또는 override 갱신 필요:`);
    console.error(mismatches.join("\n"));
    process.exit(1);
  }
  console.log(`✅ verify-set-meta: ${sets.length} Set 전부 분류기와 일치 (NULL ${stillNull.length}건은 의도된 미분류).`);
}

main()
  .catch((e) => { console.error("FAIL:", e?.message ?? e); process.exit(1); })
  .finally(() => prisma.$disconnect());
