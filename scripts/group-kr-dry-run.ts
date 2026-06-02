/**
 * Phase KR-그룹화 DRY-RUN (읽기 전용, DB 변경 없음).
 *
 * 목적: 고아 KR 카드(형제 EN/JP 없는 KR-only LogicalCard)를 같은 소속 카드팩(setGroup)
 *       + 카드번호(numberInt) 기준으로 EN/JP 형제 LogicalCard 에 매칭 가능한지 분류.
 *
 * 분류:
 *   - unique   : 후보 형제 LogicalCard 정확히 1개 → 확신 매칭(연결 대상)
 *   - ambiguous: 후보 2개+ (평행팩/레터서브셋 등) → 사람/심판 필요, 자동연결 금지
 *   - no_match : setGroup·번호는 있으나 형제 없음
 *   - unkeyed  : setGroup 또는 numberInt 없음 → 매칭 키 부재
 *
 * 실행: npx tsx scripts/group-kr-dry-run.ts
 */
import "dotenv/config";
import { prisma } from "@/lib/prisma";

type Row = {
  kr_locale_id: string;
  kr_lc: string;
  kr_name: string | null;
  sg: string | null;
  num: number | null;
  distinct_siblings: number;
  jp_siblings: number;
};

async function main() {
  const t0 = Date.now();

  const rows = await prisma.$queryRawUnsafe<Row[]>(`
    WITH kr AS (
      SELECT cl.id AS kr_locale_id, cl."logicalCardId" AS kr_lc, cl.name AS kr_name,
             cl."numberInt" AS num, s."setGroupId" AS sg
      FROM "CardLocale" cl JOIN "Set" s ON s.id = cl."setId"
      WHERE cl.region='KR'
    ),
    orphan AS (
      SELECT kr.* FROM kr
      WHERE NOT EXISTS (
        SELECT 1 FROM "CardLocale" sib
        WHERE sib."logicalCardId" = kr.kr_lc AND sib.region IN ('EN','JP')
      )
    ),
    cand AS (
      SELECT s."setGroupId" AS sg, cl."numberInt" AS num,
             cl."logicalCardId" AS lc, cl.region
      FROM "CardLocale" cl JOIN "Set" s ON s.id = cl."setId"
      WHERE cl.region IN ('EN','JP') AND cl."numberInt" IS NOT NULL AND s."setGroupId" IS NOT NULL
    )
    SELECT o.kr_locale_id, o.kr_lc, o.kr_name, o.sg, o.num,
           count(DISTINCT c.lc)::int AS distinct_siblings,
           count(DISTINCT c.lc) FILTER (WHERE c.region='JP')::int AS jp_siblings
    FROM orphan o
    LEFT JOIN cand c ON c.sg = o.sg AND c.num = o.num
    GROUP BY o.kr_locale_id, o.kr_lc, o.kr_name, o.sg, o.num
  `);

  // 단순 분류(distinct 기준) — 참고용
  const simple = { unique: 0, ambiguous: 0, no_match: 0, unkeyed: 0 };
  // JP 우선 전략 분류 — 실제 연결 판단용
  const buckets = {
    jp_unique: [] as Row[],   // JP 형제 정확히 1개 → 확신(연결)
    en_unique: [] as Row[],   // JP 없고 EN 형제 1개 → 중간 확신
    ambiguous: [] as Row[],   // JP 형제 2개+ (평행팩 등) → 진짜 애매, 심판 필요
    no_match: [] as Row[],
    unkeyed: [] as Row[],
  };
  for (const r of rows) {
    if (r.sg == null || r.num == null) { simple.unkeyed++; buckets.unkeyed.push(r); continue; }
    if (r.distinct_siblings === 0) { simple.no_match++; buckets.no_match.push(r); continue; }
    if (r.distinct_siblings === 1) simple.unique++; else simple.ambiguous++;
    // JP 우선
    if (r.jp_siblings === 1) buckets.jp_unique.push(r);
    else if (r.jp_siblings === 0) {
      // JP 없음 → EN 후보로 판단
      if (r.distinct_siblings === 1) buckets.en_unique.push(r);
      else buckets.ambiguous.push(r);
    } else buckets.ambiguous.push(r); // jp_siblings > 1
  }

  const total = rows.length;
  const pct = (n: number) => `${((n / total) * 100).toFixed(1)}%`;
  console.log("\n========== KR 그룹화 DRY-RUN ==========");
  console.log(`고아 KR 카드 총계: ${total}`);
  console.log(`\n[참고] 단순분류(EN·JP 미그룹 탓 애매 과대): unique=${simple.unique} ambiguous=${simple.ambiguous} no_match=${simple.no_match} unkeyed=${simple.unkeyed}`);
  console.log(`\n[JP 우선 전략 — 실제 연결 판단]`);
  const connectable = buckets.jp_unique.length + buckets.en_unique.length;
  console.log(`  ✅ jp_unique (JP형제 1개 · 확신)  : ${buckets.jp_unique.length} (${pct(buckets.jp_unique.length)})`);
  console.log(`  ✅ en_unique (JP無·EN형제 1개)    : ${buckets.en_unique.length} (${pct(buckets.en_unique.length)})`);
  console.log(`  → 연결 가능 소계                  : ${connectable} (${pct(connectable)})`);
  console.log(`  ⚠️  ambiguous (JP형제 2개+ · 심판) : ${buckets.ambiguous.length} (${pct(buckets.ambiguous.length)})`);
  console.log(`  ❌ no_match (형제 없음)           : ${buckets.no_match.length} (${pct(buckets.no_match.length)})`);
  console.log(`  ⛔ unkeyed (setGroup/번호無)      : ${buckets.unkeyed.length} (${pct(buckets.unkeyed.length)})`);
  // buckets.jp_unique 를 아래 샘플/Top12 에서 직접 사용

  // 샘플: unique 매칭이 진짜 맞는지 형제 이름 동반 출력
  async function sampleWithSibling(rs: Row[], label: string, n = 5) {
    console.log(`\n--- ${label} 샘플 ---`);
    for (const r of rs.slice(0, n)) {
      const sib = await prisma.$queryRawUnsafe<Array<any>>(`
        SELECT cl.region, cl.name, cl."numberInt"
        FROM "CardLocale" cl JOIN "Set" s ON s.id=cl."setId"
        WHERE s."setGroupId"=$1 AND cl."numberInt"=$2 AND cl.region IN ('EN','JP')
        ORDER BY cl.region LIMIT 4`, r.sg, r.num);
      console.log(`KR "${r.kr_name}" #${r.num} [${r.sg}] → ${sib.map(s=>`${s.region}:"${s.name}"`).join(", ")}`);
    }
  }
  await sampleWithSibling(buckets.jp_unique, "unique(확신)");
  await sampleWithSibling(buckets.ambiguous, "ambiguous(애매)");
  console.log("\n--- unkeyed 샘플(매칭불가) ---");
  for (const r of buckets.unkeyed.slice(0, 5)) console.log(`KR "${r.kr_name}" #${r.num ?? "?"} sg=${r.sg ?? "null"}`);

  // setGroup별 unique 매칭 분포 상위
  const bySg = new Map<string, number>();
  for (const r of buckets.jp_unique) bySg.set(r.sg!, (bySg.get(r.sg!) ?? 0) + 1);
  const top = [...bySg.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);
  console.log("\n--- unique 매칭 많은 소속카드팩 Top12 ---");
  for (const [sg, c] of top) console.log(`  ${sg.padEnd(20)} ${c}`);

  console.log(`\n(소요 ${((Date.now() - t0) / 1000).toFixed(1)}s · DB 변경 없음)`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
