// G_FK — FK 테이블 무손실 게이트 (P9 로드맵 S0, docs/migration/identity-model-migration-plan.md §0′).
//
// conservation(check-locale-conservation)이 못 잡는 사각: locale 소유권은 보지만
// CardText/CardSpecies/ExternalIdMapping/DeckRecipeCard 등 FK 테이블의 행 손실·고아는 못 본다.
// 이 게이트는 9개 FK 테이블의 (전체수·non-null FK수·고아수)를 베이스라인으로 찍고, 단계마다 대조한다.
//
// 하드 규칙(자동 차단):
//   ① orphan(FK 가 존재하지 않는 부모를 가리킴) = 0 필수 — 모든 단계.
//   ② locale-side FK(Price/Trade/CollectionItem/ExternalId·localeId) non-null 손실 = 0 필수
//      — RegionCard.id 는 불변이라 locale 참조는 어느 단계에서도 줄면 안 됨.
//   ③ card-side FK 의 감소는 collapse(P5) 의 의도된 dedup 일 수 있으므로 '보고'만 하고,
//      collapse 스크립트가 자체적으로 dedup 수와 대조한다(여기선 델타만 출력).
//
// 실행:  npx tsx scripts/migration/gate-fk.ts --save <label>      (베이스라인 저장)
//        npx tsx scripts/migration/gate-fk.ts --compare <label>   (대조·위반 시 exit 1)
import "dotenv/config";
import { prisma } from "../../src/lib/prisma";
import { writeFileSync, readFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const SNAP_DIR = resolve(process.cwd(), ".migration-snapshots");

// FK 컬럼(DB 물리명) → 부모 테이블. card-side=logicalCardId / locale-side=cardLocaleId|localeId.
const FK: { t: string; col: string; parent: string; side: "card" | "locale" | "other" }[] = [
  { t: "CardLocale", col: "logicalCardId", parent: "LogicalCard", side: "card" },
  { t: "CardText", col: "logicalCardId", parent: "LogicalCard", side: "card" },
  { t: "LogicalCardSpecies", col: "logicalCardId", parent: "LogicalCard", side: "card" },
  { t: "LogicalCardSpecies", col: "speciesId", parent: "Species", side: "other" },
  { t: "ExternalIdMapping", col: "logicalCardId", parent: "LogicalCard", side: "card" },
  { t: "ExternalIdMapping", col: "cardLocaleId", parent: "CardLocale", side: "locale" },
  { t: "DeckRecipeCard", col: "logicalCardId", parent: "LogicalCard", side: "card" },
  { t: "Trade", col: "logicalCardId", parent: "LogicalCard", side: "card" },
  { t: "Trade", col: "localeId", parent: "CardLocale", side: "locale" },
  { t: "CollectionItem", col: "logicalCardId", parent: "LogicalCard", side: "card" },
  { t: "CollectionItem", col: "localeId", parent: "CardLocale", side: "locale" },
  { t: "Ruling", col: "logicalCardId", parent: "LogicalCard", side: "card" },
  { t: "Price", col: "cardLocaleId", parent: "CardLocale", side: "locale" },
];

type Metric = { total: number; nonNull: number; orphan: number; side: string };
const q = async (sql: string) => Number(((await prisma.$queryRawUnsafe(sql)) as { c?: number | bigint }[])[0]?.c ?? 0);

async function metrics(): Promise<Record<string, Metric>> {
  const out: Record<string, Metric> = {};
  for (const f of FK) {
    const total = await q(`SELECT count(*)::int c FROM "${f.t}"`);
    const nonNull = await q(`SELECT count(*)::int c FROM "${f.t}" x WHERE x."${f.col}" IS NOT NULL`);
    const orphan = await q(
      `SELECT count(*)::int c FROM "${f.t}" x WHERE x."${f.col}" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "${f.parent}" p WHERE p.id = x."${f.col}")`,
    );
    out[`${f.t}.${f.col}`] = { total, nonNull, orphan, side: f.side };
  }
  return out;
}

const snapPath = (label: string) => resolve(SNAP_DIR, `gate-fk-${label}.json`);
const sgn = (n: number) => (n >= 0 ? `+${n}` : `${n}`);

async function main() {
  const mode = process.argv[2];
  const label = process.argv[3] || "default";
  const m = await metrics();

  if (mode === "--save") {
    if (!existsSync(SNAP_DIR)) mkdirSync(SNAP_DIR, { recursive: true });
    writeFileSync(snapPath(label), JSON.stringify(m, null, 2));
    console.log(`✅ G_FK 베이스라인 저장: ${snapPath(label)}`);
    for (const [k, v] of Object.entries(m)) {
      console.log(`   ${k.padEnd(36)} total=${v.total} nonNull=${v.nonNull} orphan=${v.orphan}${v.orphan ? " 🔴" : ""}`);
    }
    await prisma.$disconnect();
    return;
  }

  if (mode === "--compare") {
    if (!existsSync(snapPath(label))) {
      console.error(`🔴 베이스라인 없음: ${snapPath(label)} — 먼저 --save ${label}`);
      await prisma.$disconnect();
      process.exit(1);
    }
    const base = JSON.parse(readFileSync(snapPath(label), "utf8")) as Record<string, Metric>;
    let fail = 0;
    console.log(`════ G_FK 대조 vs '${label}' ════`);
    for (const [k, v] of Object.entries(m)) {
      const b = base[k];
      const dTotal = v.total - (b?.total ?? v.total);
      const dNon = v.nonNull - (b?.nonNull ?? v.nonNull);
      const orphanBad = v.orphan > 0;
      const localeLoss = v.side === "locale" && dNon < 0;
      if (orphanBad || localeLoss) fail++;
      console.log(
        `   ${k.padEnd(36)} total ${sgn(dTotal)} · nonNull ${sgn(dNon)} · orphan ${v.orphan}` +
          `${orphanBad ? " 🔴고아" : ""}${localeLoss ? " 🔴locale손실" : ""}${v.side === "card" && dNon < 0 ? " ⓘcard감소(=collapse dedup? 확인)" : ""}`,
      );
    }
    console.log(fail === 0 ? "\n✅ G_FK 통과 (고아 0 · locale 손실 0)" : `\n🔴 G_FK 위반 ${fail}건 — 진행 중단`);
    await prisma.$disconnect();
    process.exit(fail === 0 ? 0 : 1);
  }

  console.log("사용법: npx tsx scripts/migration/gate-fk.ts --save <label> | --compare <label>");
  await prisma.$disconnect();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
