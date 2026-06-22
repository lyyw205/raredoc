// ── P9: Card.attacksKo/abilitiesKo → CardText(ko).attacks/abilities 검증 + 보존 ──────────
// 목적: attacksKo/abilitiesKo 컬럼 드롭 전 무손실 보장(P9 잠금 해제).
//   - Phase 1: 유효 데이터 갭 측정 (LC에만 있고 CT에 없는 건수)
//   - Phase 2: 기존 CT·LC 간 불일치 검증
//   - Phase 3: 갭 채우기 (현재 상태에서는 0건 — 안전망용)
//   - Phase 4: 사후 게이트 재실행 (missing=0 확인)
// 기본 dry-run. --apply 로만 DB 쓰기. --verify 로 게이트만 실행.
// 실행: npx tsx scripts/migration/p9-cardtext-attacks.ts [--apply] [--verify]
// 멱등: 재실행 시 갭 0 → 즉시 GATE PASS 종료.
// assertWritable 불필요: CardText.attacks/abilities 는 번역 텍스트 추가(identity 변경 아님).
import "dotenv/config";
import { prisma } from "../../src/lib/prisma";

const APPLY = process.argv.includes("--apply");
const VERIFY_ONLY = process.argv.includes("--verify");

/** JSON 값이 실제 데이터인지 판별 (빈 sentinel 제외) */
function isReal(json: unknown): boolean {
  if (json === null || json === undefined) return false;
  const s = JSON.stringify(json);
  // 빈 배열·빈 객체·JSON null 문자열은 데이터 없음
  return s !== "[]" && s !== "{}" && s !== "null";
}

// ── 게이트 쿼리 ─────────────────────────────────────────────────────────────────────────

/** attacksKo 유효값이 있는데 CT.attacks 가 없는 건수 */
async function gapAttacksCount(): Promise<number> {
  const rows = await prisma.$queryRaw<{ cnt: number }[]>`
    SELECT count(*)::int AS cnt
    FROM "LogicalCard" lc
    WHERE lc."attacksKo" IS NOT NULL
      AND lc."attacksKo"::text NOT IN ('[]', '{}', 'null')
      AND NOT EXISTS (
        SELECT 1 FROM "CardText" ct
        WHERE ct."logicalCardId" = lc.id
          AND ct.language = 'ko'
          AND ct.attacks IS NOT NULL
          AND ct.attacks::text NOT IN ('[]', '{}', 'null')
      )`;
  return rows[0].cnt;
}

/** abilitiesKo 유효값이 있는데 CT.abilities 가 없는 건수 */
async function gapAbilitiesCount(): Promise<number> {
  const rows = await prisma.$queryRaw<{ cnt: number }[]>`
    SELECT count(*)::int AS cnt
    FROM "LogicalCard" lc
    WHERE lc."abilitiesKo" IS NOT NULL
      AND lc."abilitiesKo"::text NOT IN ('[]', '{}', 'null')
      AND NOT EXISTS (
        SELECT 1 FROM "CardText" ct
        WHERE ct."logicalCardId" = lc.id
          AND ct.language = 'ko'
          AND ct.abilities IS NOT NULL
          AND ct.abilities::text NOT IN ('[]', '{}', 'null')
      )`;
  return rows[0].cnt;
}

/** LC·CT 모두 유효값 보유 + 내용이 다른(불일치) 건수 */
async function mismatchCount(): Promise<number> {
  const rows = await prisma.$queryRaw<{ cnt: number }[]>`
    SELECT count(*)::int AS cnt
    FROM "LogicalCard" lc
    JOIN "CardText" ct ON ct."logicalCardId" = lc.id AND ct.language = 'ko'
    WHERE
      (
        lc."attacksKo" IS NOT NULL
        AND lc."attacksKo"::text NOT IN ('[]', '{}', 'null')
        AND ct.attacks IS NOT NULL
        AND lc."attacksKo"::text != ct.attacks::text
      )
      OR (
        lc."abilitiesKo" IS NOT NULL
        AND lc."abilitiesKo"::text NOT IN ('[]', '{}', 'null')
        AND ct.abilities IS NOT NULL
        AND lc."abilitiesKo"::text != ct.abilities::text
      )`;
  return rows[0].cnt;
}

// ── 메인 ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`【P9 attacksKo/abilitiesKo → CardText(ko)】${
    VERIFY_ONLY ? " --verify" : APPLY ? " ★APPLY" : " (dry-run)"
  }`);
  console.log("  목적: 컬럼 드롭 전 무손실 보장 + 갭 안전망 채우기\n");

  // ── Phase 1: 유효 데이터 갭 측정 ──────────────────────────────────────────────────────
  console.log("  [Phase 1] 유효 데이터 갭 측정...");
  const [atkGapCount, abiGapCount] = await Promise.all([
    gapAttacksCount(),
    gapAbilitiesCount(),
  ]);
  console.log(`    attacks  갭: ${atkGapCount} (기대: 0)`);
  console.log(`    abilities 갭: ${abiGapCount} (기대: 0)`);

  // ── Phase 2: 일치성 검증 ─────────────────────────────────────────────────────────────
  console.log("\n  [Phase 2] LC·CT 값 일치성 검증...");
  const mismatch = await mismatchCount();
  console.log(`    불일치: ${mismatch} (기대: 0)`);

  // 현황 요약
  const [lcAtkReal, lcAbiReal] = await Promise.all([
    prisma.$queryRaw<{ cnt: number }[]>`
      SELECT count(*)::int AS cnt FROM "LogicalCard"
      WHERE "attacksKo" IS NOT NULL AND "attacksKo"::text NOT IN ('[]','{}','null')`,
    prisma.$queryRaw<{ cnt: number }[]>`
      SELECT count(*)::int AS cnt FROM "LogicalCard"
      WHERE "abilitiesKo" IS NOT NULL AND "abilitiesKo"::text NOT IN ('[]','{}','null')`,
  ]);
  const [ctAtkFilled, ctAbiFilled] = await Promise.all([
    prisma.$queryRaw<{ cnt: number }[]>`
      SELECT count(*)::int AS cnt FROM "CardText" WHERE language='ko' AND attacks IS NOT NULL`,
    prisma.$queryRaw<{ cnt: number }[]>`
      SELECT count(*)::int AS cnt FROM "CardText" WHERE language='ko' AND abilities IS NOT NULL`,
  ]);
  console.log(`\n  ── 현황 요약 ──`);
  console.log(`    LC.attacksKo  유효: ${lcAtkReal[0].cnt}`);
  console.log(`    LC.abilitiesKo 유효: ${lcAbiReal[0].cnt}`);
  console.log(`    CT(ko).attacks  채워짐: ${ctAtkFilled[0].cnt}`);
  console.log(`    CT(ko).abilities 채워짐: ${ctAbiFilled[0].cnt}`);

  // 게이트 통과 여부 판단
  const gatePass = atkGapCount === 0 && abiGapCount === 0 && mismatch === 0;

  if (gatePass) {
    console.log("\n  ✅ GATE PASS: attacksKo/abilitiesKo 의 모든 유효 데이터가 CardText(ko)에 존재.");
    console.log("     컬럼 드롭 안전(갭0·불일치0). 기존 CT.attacks/abilities 가 동일 데이터 보유.");
    await prisma.$disconnect();
    return;
  }

  // ── Phase 3: 갭 채우기 ───────────────────────────────────────────────────────────────
  console.log(`\n  [Phase 3] 갭 채우기 (attacks ${atkGapCount} + abilities ${abiGapCount})...`);

  if (VERIFY_ONLY) {
    console.log("  (--verify 모드: 갭 있음 → GATE FAIL)");
    await prisma.$disconnect();
    process.exit(1);
  }

  if (!APPLY) {
    console.log(`  (dry-run) 갭 ${atkGapCount + abiGapCount}건 발견.`);
    console.log(`  --apply 로 실행하면 갭을 채웁니다.`);
    await prisma.$disconnect();
    return;
  }

  // APPLY 모드: 갭 카드 수집
  const gapAtkRows = await prisma.$queryRaw<{ id: string; attacksKo: unknown }[]>`
    SELECT lc.id, lc."attacksKo"
    FROM "LogicalCard" lc
    WHERE lc."attacksKo" IS NOT NULL
      AND lc."attacksKo"::text NOT IN ('[]', '{}', 'null')
      AND NOT EXISTS (
        SELECT 1 FROM "CardText" ct
        WHERE ct."logicalCardId" = lc.id
          AND ct.language = 'ko'
          AND ct.attacks IS NOT NULL
          AND ct.attacks::text NOT IN ('[]', '{}', 'null')
      )`;

  const gapAbiRows = await prisma.$queryRaw<{ id: string; abilitiesKo: unknown }[]>`
    SELECT lc.id, lc."abilitiesKo"
    FROM "LogicalCard" lc
    WHERE lc."abilitiesKo" IS NOT NULL
      AND lc."abilitiesKo"::text NOT IN ('[]', '{}', 'null')
      AND NOT EXISTS (
        SELECT 1 FROM "CardText" ct
        WHERE ct."logicalCardId" = lc.id
          AND ct.language = 'ko'
          AND ct.abilities IS NOT NULL
          AND ct.abilities::text NOT IN ('[]', '{}', 'null')
      )`;

  // 갭 카드 id 합집합
  const gapIds = new Set([
    ...gapAtkRows.map((r) => r.id),
    ...gapAbiRows.map((r) => r.id),
  ]);

  if (gapIds.size === 0) {
    console.log("  (갭 없음 — 쓰기 0건)");
    await prisma.$disconnect();
    return;
  }

  // 갭 카드 전체 정보 로드
  const gapCards = await prisma.card.findMany({
    where: { id: { in: [...gapIds] } },
    select: { id: true, attacksKo: true, abilitiesKo: true, nameKo: true },
  });

  // 기존 ko CT 행 조회
  const existingCTs = await prisma.cardText.findMany({
    where: { cardId: { in: [...gapIds] }, language: "ko" },
    select: { id: true, cardId: true, attacks: true, abilities: true },
  });
  const ctByCardId = new Map(existingCTs.map((ct) => [ct.cardId, ct]));

  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const card of gapCards) {
    const realAtk = isReal(card.attacksKo) ? card.attacksKo : undefined;
    const realAbi = isReal(card.abilitiesKo) ? card.abilitiesKo : undefined;
    if (!realAtk && !realAbi) {
      skipped++;
      continue;
    }

    const ct = ctByCardId.get(card.id);
    if (ct) {
      // UPDATE: CT에서 비어있는 필드만 채움 (기존 값 덮어쓰기 금지)
      const upd: Record<string, unknown> = {};
      if (realAtk && ct.attacks === null) upd.attacks = realAtk;
      if (realAbi && ct.abilities === null) upd.abilities = realAbi;
      if (Object.keys(upd).length > 0) {
        await prisma.cardText.update({ where: { id: ct.id }, data: upd });
        updated++;
      } else {
        skipped++; // 이미 모두 채워져 있음
      }
    } else {
      // INSERT: ko CardText 행 신규 생성
      await prisma.cardText.create({
        data: {
          cardId: card.id,
          language: "ko",
          name: card.nameKo ?? null,
          attacks: realAtk ?? null,
          abilities: realAbi ?? null,
          source: "lc_attacksko",
          confidence: 0.8,
        },
      });
      inserted++;
    }
  }

  console.log(`  완료: INSERT ${inserted} / UPDATE ${updated} / skip ${skipped}`);

  // ── Phase 4: 사후 게이트 재실행 ──────────────────────────────────────────────────────
  console.log("\n  [Phase 4] 사후 게이트 재실행...");
  const [postAtkGap, postAbiGap, postMismatch] = await Promise.all([
    gapAttacksCount(),
    gapAbilitiesCount(),
    mismatchCount(),
  ]);
  console.log(`    사후 attacks  갭: ${postAtkGap} (0 기대)`);
  console.log(`    사후 abilities 갭: ${postAbiGap} (0 기대)`);
  console.log(`    사후 불일치: ${postMismatch} (0 기대)`);

  if (postAtkGap > 0 || postAbiGap > 0 || postMismatch > 0) {
    console.error("  GATE FAIL: 사후 검증 실패. 컬럼 드롭 보류.");
    await prisma.$disconnect();
    process.exit(1);
  }

  console.log("  ✅ GATE PASS (사후). 컬럼 드롭 안전.");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
