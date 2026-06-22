// G_MERGE — 아트그룹 병합 정확성 게이트 (P9 로드맵, docs/migration/identity-model-migration-plan.md §0′).
//
// 비가역 collapse(P5) 전에 "잘못된 병합"을 자동 차단하는 게이트 — 사용자 '중간 인간점검 없음' 방침의
// 대체 안전장치. 같은 artCardId(같은 그림으로 묶인) 멤버들이 art-불변 메타에 충돌하면 하드블록한다.
//   검사 필드: gameCardId · illustrator · types · subtypes · supertype · pokedexNumbers · evolvesFrom
//   (둘 다 값이 있을 때만 충돌 판정 — 한쪽 결측은 무시. under-merge 선호 정책과 일치.)
//   ★오거폰 4가면(types Grass/Water/Fighting/Fire)처럼 다른 그림이 한 artCardId 로 뭉치면 즉시 차단.
//
// 실행:  npx tsx scripts/migration/gate-merge.ts        (위반 시 exit 1)
//        (artCardId 컬럼은 S3a 후 생김 — 없으면 skip)
import "dotenv/config";
import { prisma } from "../../src/lib/prisma";

const colExists = async (table: string, col: string) =>
  Boolean(
    ((await prisma.$queryRawUnsafe(
      `SELECT (to_regclass('"${table}"') IS NOT NULL AND EXISTS (
         SELECT 1 FROM information_schema.columns WHERE table_name='${table}' AND column_name='${col}')) c`,
    )) as { c?: boolean }[])[0]?.c,
  );

type Row = {
  artCardId: string;
  id: string;
  gameCardId: string | null;
  illustrator: string | null;
  types: unknown;
  subtypes: unknown;
  supertype: string | null;
  pokedexNumbers: unknown;
  evolvesFrom: string | null;
};

const norm = (s: string | null | undefined) => (s ?? "").trim().toLowerCase().replace(/\s+/g, " ");
const setKey = (a: unknown) => [...new Set((Array.isArray(a) ? a : []).map((x) => String(x)))].sort().join(",");

async function main() {
  if (!(await colExists("LogicalCard", "artCardId"))) {
    console.log("⚠ LogicalCard.artCardId 컬럼 없음 — S3a(컬럼 추가)·S3b(build-art-groups) 후 실행. (게이트 skip)");
    await prisma.$disconnect();
    return;
  }

  const rows = (await prisma.$queryRawUnsafe(
    `SELECT "artCardId", id, "gameCardId", illustrator, types, subtypes, supertype, "pokedexNumbers", "evolvesFrom"
     FROM "LogicalCard" WHERE "artCardId" IS NOT NULL`,
  )) as Row[];

  const groups = new Map<string, Row[]>();
  for (const r of rows) {
    const g = groups.get(r.artCardId);
    if (g) g.push(r);
    else groups.set(r.artCardId, [r]);
  }

  const checks: [string, (r: Row) => string][] = [
    ["gameCardId", (r) => r.gameCardId ?? ""],
    ["illustrator", (r) => norm(r.illustrator)],
    ["types", (r) => setKey(r.types)],
    ["subtypes", (r) => setKey(r.subtypes)],
    ["supertype", (r) => norm(r.supertype)],
    ["pokedexNumbers", (r) => setKey(r.pokedexNumbers)],
    ["evolvesFrom", (r) => norm(r.evolvesFrom)],
  ];

  const conflicts: { artCardId: string; field: string; values: string[]; members: number }[] = [];
  for (const [ac, members] of groups) {
    if (members.length < 2) continue;
    for (const [field, f] of checks) {
      const vals = [...new Set(members.map(f).filter((v) => v !== ""))];
      if (vals.length > 1) conflicts.push({ artCardId: ac, field, values: vals.slice(0, 6), members: members.length });
    }
  }

  const multi = [...groups.values()].filter((g) => g.length >= 2).length;
  console.log(`════ G_MERGE — 아트그룹 ${groups.size}개(멤버 2+ ${multi}개 검사) ════`);
  if (conflicts.length === 0) {
    console.log("✅ G_MERGE 통과 — art-불변 메타 충돌 0 (over-merge 없음)");
    await prisma.$disconnect();
    return;
  }
  console.log(`🔴 G_MERGE 위반 ${conflicts.length}건 — over-merge 의심, collapse 중단:`);
  for (const c of conflicts.slice(0, 40)) {
    console.log(`   ${c.artCardId} [멤버 ${c.members}] ${c.field}: ${c.values.join(" | ")}`);
  }
  if (conflicts.length > 40) console.log(`   … 외 ${conflicts.length - 40}건`);
  await prisma.$disconnect();
  process.exit(1);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
