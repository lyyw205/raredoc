/**
 * Set.packType + titleClean{Ko,Ja,En} 백필 — set-meta.ts 분류기 + override 표.
 *
 * ★ packType / titleCleanKo / titleCleanJa / titleCleanEn 4개 컬럼만 SET 한다.
 *   연결 FK(cardPackId·localeCards·primarySetForLogical 등)는 절대 미터치 → 동결(freeze) 위반 아님.
 *   그래도 규약상 영향 cardPackId 로 assertWritable() 호출(동결팩은 --allow-protected 필요).
 *
 * Run: npx tsx scripts/backfill-set-meta.ts                          # dry-run(기본, 미적용)
 *      npx tsx scripts/backfill-set-meta.ts --apply --allow-protected
 *
 * 설계: docs/design/dex-pack-typing.md §4
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { derivePackType, deriveCleanTitle, type PackType } from "../src/lib/cards/set-meta";
import { PACK_TYPE_OVERRIDE } from "./lib/set-meta-overrides";
import { assertWritable, hasAllowProtectedFlag, protectedTouched } from "./lib/protected-groups";

const APPLY = process.argv.includes("--apply");
const ALLOW = hasAllowProtectedFlag();

const cleanOrNull = (s: string | null): string | null => (s ? deriveCleanTitle(s) : null);

type Row = {
  id: string;
  name: string;
  nameKo: string | null;
  nameJa: string | null;
  code: string | null;
  region: string;
  cardPackId: string | null;
  cardPack: { era: string | null } | null;
};

function computed(s: Row): {
  packType: PackType | null;
  titleCleanKo: string | null;
  titleCleanJa: string | null;
  titleCleanEn: string | null;
} {
  const ov = PACK_TYPE_OVERRIDE[s.id];
  // 분류는 region 우선 표시명으로(EN=영문 name, JP/KR=nameKo). validation 과 동일.
  const primaryName = s.region === "EN" ? s.name : (s.nameKo ?? s.name);
  const packType = ov?.packType ?? derivePackType({ name: primaryName, code: s.code, rawEra: s.cardPack?.era });
  return {
    packType,
    titleCleanKo: cleanOrNull(s.nameKo),
    titleCleanJa: cleanOrNull(s.nameJa),
    titleCleanEn: s.region === "EN" ? cleanOrNull(s.name) : null,
  };
}

async function main() {
  const sets = (await prisma.set.findMany({
    select: {
      id: true, name: true, nameKo: true, nameJa: true, code: true, region: true,
      cardPackId: true, cardPack: { select: { era: true } },
    },
    orderBy: { id: "asc" },
  })) as Row[];

  // ── 동결 가드(영향 cardPackId 전체) — dry-run 은 경고, --apply 는 --allow-protected 필요 ──
  const affected = sets.map((s) => s.cardPackId);
  assertWritable(affected, { allow: ALLOW, dryRun: !APPLY, tool: "backfill-set-meta" });

  const dist: Record<string, number> = {};
  const nulls: Row[] = [];
  let titleKo = 0, titleEn = 0, ovCount = 0;

  for (const s of sets) {
    const c = computed(s);
    dist[c.packType ?? "NULL"] = (dist[c.packType ?? "NULL"] ?? 0) + 1;
    if (c.packType === null) nulls.push(s);
    if (c.titleCleanKo) titleKo++;
    if (c.titleCleanEn) titleEn++;
    if (PACK_TYPE_OVERRIDE[s.id]) ovCount++;

    if (APPLY) {
      // ★ 메타 4컬럼만. 연결 FK 미터치.
      await prisma.set.update({
        where: { id: s.id },
        data: {
          packType: c.packType,
          titleCleanKo: c.titleCleanKo,
          titleCleanJa: c.titleCleanJa,
          titleCleanEn: c.titleCleanEn,
        },
      });
    }
  }

  console.log(`\n${APPLY ? "✅ APPLIED" : "🔍 DRY-RUN"} — ${sets.length} Set`);
  console.log("packType 분포:", dist);
  console.log(`titleClean 채움: ko=${titleKo} / en=${titleEn}, override 적용=${ovCount}`);
  console.log(`동결팩 영향: ${protectedTouched(affected).length} 그룹 (메타 컬럼만 변경, 연결 FK 무변경)`);
  if (nulls.length) {
    console.log(`\n미분류(packType NULL) ${nulls.length}건 — override 또는 setGroup 백필 필요:`);
    for (const s of nulls) console.log(`   ${s.region} ${s.id} [${s.code ?? "-"}] :: ${s.nameKo ?? s.name}`);
  }
  if (!APPLY) console.log(`\n적용하려면: npx tsx scripts/backfill-set-meta.ts --apply --allow-protected`);
}

main()
  .catch((e) => { console.error("FAIL:", e?.message ?? e); process.exit(1); })
  .finally(() => prisma.$disconnect());
