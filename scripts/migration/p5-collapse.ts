// ── P5 COLLAPSE: per-pack Card(LogicalCard) → 대표 Card 물리 병합 ────────────
//
// 로드맵 근거:
//   docs/migration/identity-model-migration-plan.md:84 — P5 행:
//   "1 트랜잭션: 자식 FK 전부 생존자로 repoint→dedup→비대표 Card 삭제하되
//    cascade victim 0 단언(CardText Cascade 주의: 삭제 전 이동). RegionCard.id 불변"
//
//   docs/migration/identity-model-migration-plan.md:90 — collapse 손실 벡터 & 무손실 처리:
//   "▸CardText @@unique[cardId,language] 충돌 ~2,005 → authority-pick + loser 로그
//    ▸CardSpecies @@id[cardId,speciesId] 충돌 ~2,600 → DISTINCT union
//    ▸ExternalIdMapping @@unique[sourceId,externalId] → dedup 후 repoint
//    ▸★CardText onDelete:Cascade → 비대표 Card 삭제가 텍스트를 cascade 삭제하지 않게
//      삭제 전 자식 이동 + cascade victim 0 단언
//    ▸RegionCard.id 절대 불변(Price 61k·MarketStat 60k·카드페이지 URL 이 참조)
//    ▸id 재발급 skip 권장(8 FK orphan 위험·가치 낮음)"
//
// ★★★ 실행 전제 ★★★
//   1) build-art-groups --apply 완료 (artCardId 전량 적재). 미적재 시 비대표=0 → no-op.
//   2) B 단계: 덱리스트→GameCard resolver 완료 (DeckRecipeCard.cardId → 생존자 이미 바인딩).
//      collapse 후 DeckRecipeCard.cardId 가 사라진 비대표를 가리키는 상황 방지.
//   3) SNAP: pg_dump 스냅샷 완료 + restore 리허설 성공. 이 단계는 비가역.
//   4) gate-fk.ts --save before-p5 베이스라인 찍은 상태.
//
// ★★★ 가역성 = 비가역 ★★★ (SNAP 복원만 가능)
//
// 실행:
//   dry-run (기본):  npx tsx scripts/migration/p5-collapse.ts
//   적용 (비가역):   npx tsx scripts/migration/p5-collapse.ts --apply [--allow-protected]
//
// 이후 게이트:
//   npx tsx scripts/migration/gate-fk.ts --compare before-p5
//   npx tsx scripts/check-locale-conservation.ts --compare   (check-locale-conservation)
//
import "dotenv/config";
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { prisma } from "../../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "../lib/protected-groups";

const APPLY = process.argv.includes("--apply");
const ALLOW = hasAllowProtectedFlag();

// ── 손실벡터 처리 전략 요약 ──────────────────────────────────────────────────
// [V1] RegionCard.logicalCardId FK → 대표로 repoint (RegionCard.id 절대 불변)
// [V2] CardText @@unique[cardId,language] → authority-pick: confidence↑·updatedAt↑ 우선.
//      loser 로그 출력 + .jsonl 저장. cascade victim 0 단언(삭제 전 자식 이동 필수).
// [V3] CardSpecies @@id[cardId,speciesId] → DISTINCT union: 비대표 행 삭제 후 대표로 재삽입.
// [V4] ExternalIdMapping @@unique[sourceId,externalId] → dedup: 비대표 쪽 중복 삭제 후 repoint.
//      dedup 삭제분 .jsonl 저장.
// [V5] DeckRecipeCard.logicalCardId(nullable) → repoint. unique 없음(자유 N:M).
// [V6] Trade.logicalCardId → repoint. Trade.localeId 는 RegionCard(불변) → 무변경.
// [V7] CollectionItem.logicalCardId → repoint. CollectionItem.localeId 무변경.
// [V8] Ruling.logicalCardId(nullable) → repoint.
// ── ────────────────────────────────────────────────────────────────────────

// 트랜잭션 클라이언트 타입 — Prisma.$transaction 콜백 파라미터와 동일
type TxClient = Omit<
  typeof prisma,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

// raw 쿼리 helper: 카운트 반환 (트랜잭션 밖 사전조회용 — prisma 직접 사용 허용)
async function qCount(sql: string, params: unknown[] = []): Promise<number> {
  const rows = (await prisma.$queryRawUnsafe(sql, ...params)) as { c: number | bigint }[];
  return Number(rows[0]?.c ?? 0);
}

// 비대표 Card 목록: artCardId != id AND artCardId IS NOT NULL
type NonRepRow = { id: string; artCardId: string; cardPackId: string | null };

async function fetchNonReps(): Promise<NonRepRow[]> {
  return prisma.$queryRawUnsafe<NonRepRow[]>(
    `SELECT id, "artCardId", "setGroupId" AS "cardPackId"
     FROM "LogicalCard"
     WHERE "artCardId" IS NOT NULL AND "artCardId" != id
     ORDER BY id`,
  );
}

// ── .migration-snapshots 디렉토리 확보 ──────────────────────────────────────
const SNAPSHOT_DIR = ".migration-snapshots";
function ensureSnapshotDir(): void {
  if (!existsSync(SNAPSHOT_DIR)) mkdirSync(SNAPSHOT_DIR, { recursive: true });
}

// ── .jsonl 스냅샷 저장 helper ──────────────────────────────────────────────
function writeJsonl(filename: string, rows: unknown[]): void {
  ensureSnapshotDir();
  const path = `${SNAPSHOT_DIR}/${filename}`;
  const content = rows.map((r) => JSON.stringify(r)).join("\n") + "\n";
  writeFileSync(path, content, "utf-8");
  console.log(`    스냅샷 저장: ${path} (${rows.length}행)`);
}

// CardText authority-pick: 같은 (repId, language) 충돌 시 confidence↑ · updatedAt↑ 우선
// ★복구로그 완전성(reverify blocking): SELECT * 로 CardText 전체 컬럼 캡처
//   (attacks/abilities Json · rules String[] · flavorText · verifiedAt · createdAt 포함).
//   로직이 쓰는 필드만 명시 타이핑, 나머지 전 컬럼은 인덱스 시그니처로 보존 → .jsonl 복구 완전.
type TextRow = {
  id: string;
  cardId: string; // = "logicalCardId" 별칭 (authority/repoint 로직용)
  language: string;
  name: string | null;
  source: string;
  confidence: number;
  updatedAt: Date;
} & Record<string, unknown>;

// ★ 핵심 수정 #1: client 파라미터로 트랜잭션 클라이언트를 받아 tx 경계 내에서 쓰기
async function resolveCardTextCollisions(
  client: TxClient,
  nonRepIds: string[],
  repMap: Map<string, string>, // nonRepId → repId
  dryRun: boolean,
): Promise<{ survivors: number; losers: number; loserLog: string[]; loserRows: TextRow[] }> {
  if (nonRepIds.length === 0) return { survivors: 0, losers: 0, loserLog: [], loserRows: [] };

  // 비대표들이 가진 CardText(비대표→대표 repoint 시 충돌 가능한 것 분리)
  const nonRepTexts = await client.$queryRawUnsafe<TextRow[]>(
    `SELECT *, "logicalCardId" AS "cardId"
     FROM "CardText"
     WHERE "logicalCardId" = ANY($1::text[])`,
    nonRepIds,
  );

  // 대표가 이미 가진 CardText 집합: (repId, language) → TextRow
  const repIds = [...new Set(nonRepIds.map((id) => repMap.get(id)!))];
  const repTexts = await client.$queryRawUnsafe<TextRow[]>(
    `SELECT *, "logicalCardId" AS "cardId"
     FROM "CardText"
     WHERE "logicalCardId" = ANY($1::text[])`,
    repIds,
  );
  const repKey = (repId: string, lang: string) => `${repId}|${lang}`;
  const repIndex = new Map<string, TextRow>();
  for (const t of repTexts) repIndex.set(repKey(t.cardId, t.language), t);

  const toDelete: string[] = []; // 삭제할 loser CardText id
  const toRepoint: { id: string; repId: string }[] = []; // repoint 할 CardText id → repId
  const loserLog: string[] = [];
  const loserRows: TextRow[] = []; // 삭제되는 loser 전체 데이터(스냅샷용)

  for (const t of nonRepTexts) {
    const repId = repMap.get(t.cardId)!;
    const existing = repIndex.get(repKey(repId, t.language));
    if (existing) {
      // 충돌: authority-pick — confidence↑ or updatedAt↑ 이 winner
      const nonRepWins =
        t.confidence > existing.confidence ||
        (t.confidence === existing.confidence && t.updatedAt > existing.updatedAt);
      if (nonRepWins) {
        // 비대표 쪽이 더 권위있음: 대표 쪽 기존 텍스트를 loser 로 삭제 후 비대표 repoint
        toDelete.push(existing.id);
        loserRows.push(existing);
        toRepoint.push({ id: t.id, repId });
        loserLog.push(
          `CardText loser(대표쪽삭제) id=${existing.id} rep=${repId} lang=${existing.language}` +
            ` conf=${existing.confidence} → winner=${t.id} conf=${t.confidence}`,
        );
        // repIndex 갱신(같은 language 두 번 등장 방지)
        repIndex.set(repKey(repId, t.language), { ...t, cardId: repId });
      } else {
        // 대표 쪽이 권위있음: 비대표 쪽 텍스트를 loser 로 삭제
        toDelete.push(t.id);
        loserRows.push(t);
        loserLog.push(
          `CardText loser(비대표쪽삭제) id=${t.id} nonRep=${t.cardId} lang=${t.language}` +
            ` conf=${t.confidence} → winner=${existing.id} conf=${existing.confidence}`,
        );
      }
    } else {
      // 충돌 없음: 그냥 repoint
      toRepoint.push({ id: t.id, repId });
      // repIndex 에 추가(같은 그룹 내 다른 비대표가 같은 언어로 또 충돌할 수 있음)
      repIndex.set(repKey(repId, t.language), { ...t, cardId: repId });
    }
  }

  if (!dryRun) {
    // loser 먼저 삭제 (cascade 방지: CardText 에 Cascade FK 없음. Card가 Cascade → 이건 Card 삭제 전 단계)
    if (toDelete.length > 0) {
      await client.$executeRawUnsafe(
        `DELETE FROM "CardText" WHERE id = ANY($1::text[])`,
        toDelete,
      );
    }
    // repoint
    for (const { id, repId } of toRepoint) {
      await client.$executeRawUnsafe(
        `UPDATE "CardText" SET "logicalCardId"=$1 WHERE id=$2`,
        repId,
        id,
      );
    }
  }

  return { survivors: toRepoint.length, losers: toDelete.length, loserLog, loserRows };
}

// CardSpecies: DISTINCT union — 비대표 행 삭제 후 (대표, speciesId) 없으면 insert
// ★ 핵심 수정 #1: client 파라미터로 트랜잭션 클라이언트를 받음
async function resolveCardSpeciesCollisions(
  client: TxClient,
  nonRepIds: string[],
  repMap: Map<string, string>,
  dryRun: boolean,
): Promise<{ repointed: number; dedupRemoved: number }> {
  if (nonRepIds.length === 0) return { repointed: 0, dedupRemoved: 0 };

  type SpRow = { cardId: string; speciesId: number };
  const nonRepSpecies = await client.$queryRawUnsafe<SpRow[]>(
    `SELECT "logicalCardId" AS "cardId", "speciesId" FROM "LogicalCardSpecies"
     WHERE "logicalCardId" = ANY($1::text[])`,
    nonRepIds,
  );

  // 대표가 이미 가진 (repId, speciesId) 집합
  const repIds = [...new Set(nonRepIds.map((id) => repMap.get(id)!))];
  const repSpecies = await client.$queryRawUnsafe<SpRow[]>(
    `SELECT "logicalCardId" AS "cardId", "speciesId" FROM "LogicalCardSpecies"
     WHERE "logicalCardId" = ANY($1::text[])`,
    repIds,
  );
  const repSpKey = (repId: string, sid: number) => `${repId}|${sid}`;
  const repSpSet = new Set<string>(repSpecies.map((s) => repSpKey(s.cardId, s.speciesId)));

  const toInsert: { cardId: string; speciesId: number }[] = [];
  let dedupRemoved = 0;

  for (const s of nonRepSpecies) {
    const repId = repMap.get(s.cardId)!;
    const key = repSpKey(repId, s.speciesId);
    if (repSpSet.has(key)) {
      // 이미 대표에 있음: 비대표 행은 삭제(@@id[cardId,speciesId] PK 충돌 방지)
      dedupRemoved++;
    } else {
      // 없음: 대표로 재삽입
      toInsert.push({ cardId: repId, speciesId: s.speciesId });
      repSpSet.add(key); // 같은 그룹 내 중복 방지
    }
  }

  if (!dryRun) {
    // 비대표 행 전부 삭제 (onDelete:Cascade 라 Card 삭제 전에 수동 삭제해야 PK 충돌 없음)
    if (nonRepIds.length > 0) {
      await client.$executeRawUnsafe(
        `DELETE FROM "LogicalCardSpecies" WHERE "logicalCardId" = ANY($1::text[])`,
        nonRepIds,
      );
    }
    // 대표로 재삽입 (충돌 없는 것만)
    for (const ins of toInsert) {
      await client.$executeRawUnsafe(
        `INSERT INTO "LogicalCardSpecies" ("logicalCardId", "speciesId")
         VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        ins.cardId,
        ins.speciesId,
      );
    }
  }

  return { repointed: toInsert.length, dedupRemoved };
}

// ExternalIdMapping: @@unique[sourceId, externalId] — 중복 삭제 후 repoint
// ★ 핵심 수정 #1: client 파라미터로 트랜잭션 클라이언트를 받음
async function resolveExternalIdCollisions(
  client: TxClient,
  nonRepIds: string[],
  repMap: Map<string, string>,
  dryRun: boolean,
): Promise<{ repointed: number; dedupRemoved: number; deletedRows: unknown[] }> {
  if (nonRepIds.length === 0) return { repointed: 0, dedupRemoved: 0, deletedRows: [] };

  // ★복구로그 완전성(reverify blocking): SELECT * 로 ExternalIdMapping 전체 컬럼 캡처
  //   (regionCardId/setId/cardPackId/url/verifiedAt/verifiedBy/confidence/notes/createdAt/updatedAt 포함).
  type ExtRow = {
    id: string;
    cardId: string | null; // = "logicalCardId" 별칭
    sourceId: string;
    externalId: string;
  } & Record<string, unknown>;
  const nonRepExt = await client.$queryRawUnsafe<ExtRow[]>(
    `SELECT *, "logicalCardId" AS "cardId"
     FROM "ExternalIdMapping"
     WHERE "logicalCardId" = ANY($1::text[])`,
    nonRepIds,
  );

  // 대표가 이미 가진 (sourceId, externalId) 집합 → id
  const repIds = [...new Set(nonRepIds.map((id) => repMap.get(id)!))];
  const repExt = await client.$queryRawUnsafe<ExtRow[]>(
    `SELECT *, "logicalCardId" AS "cardId"
     FROM "ExternalIdMapping"
     WHERE "logicalCardId" = ANY($1::text[])`,
    repIds,
  );
  const extKey = (src: string, ext: string) => `${src}|${ext}`;
  const repExtSet = new Set<string>(repExt.map((e) => extKey(e.sourceId, e.externalId)));

  const toRepoint: string[] = []; // ExternalIdMapping.id → repId 로 repoint
  const toRepointMap: Map<string, string> = new Map();
  const toDelete: string[] = []; // 중복 loser
  const deletedRows: ExtRow[] = []; // 삭제되는 dedup 전체 데이터(스냅샷용)
  let dedupRemoved = 0;

  for (const e of nonRepExt) {
    const repId = repMap.get(e.cardId!)!;
    const key = extKey(e.sourceId, e.externalId);
    if (repExtSet.has(key)) {
      // 대표에 이미 같은 (sourceId, externalId) 존재 → 비대표 쪽 삭제
      toDelete.push(e.id);
      deletedRows.push(e);
      dedupRemoved++;
    } else {
      toRepoint.push(e.id);
      toRepointMap.set(e.id, repId);
      repExtSet.add(key); // 같은 그룹 내 중복 방지
    }
  }

  if (!dryRun) {
    if (toDelete.length > 0) {
      await client.$executeRawUnsafe(
        `DELETE FROM "ExternalIdMapping" WHERE id = ANY($1::text[])`,
        toDelete,
      );
    }
    for (const id of toRepoint) {
      await client.$executeRawUnsafe(
        `UPDATE "ExternalIdMapping" SET "logicalCardId"=$1 WHERE id=$2`,
        toRepointMap.get(id)!,
        id,
      );
    }
  }

  return { repointed: toRepoint.length, dedupRemoved, deletedRows };
}

// 단순 FK repoint helper (unique 없는 테이블: DeckRecipeCard, Trade, CollectionItem, Ruling)
// ★ 핵심 수정 #1: client 파라미터로 트랜잭션 클라이언트를 받음
async function simpleRepoint(
  client: TxClient,
  tableName: string,
  col: string, // DB 물리 컬럼명
  nonRepIds: string[],
  repMap: Map<string, string>,
  dryRun: boolean,
): Promise<number> {
  if (nonRepIds.length === 0) return 0;

  // repoint 대상 id 목록
  type IdRow = { id: string; cardId: string };
  const rows = await client.$queryRawUnsafe<IdRow[]>(
    `SELECT id, "${col}" AS "cardId" FROM "${tableName}"
     WHERE "${col}" = ANY($1::text[])`,
    nonRepIds,
  );
  if (rows.length === 0) return 0;

  if (!dryRun) {
    // 배치별 UPDATE (500개씩 — 너무 크면 plan 비용)
    const BATCH = 500;
    for (let i = 0; i < rows.length; i += BATCH) {
      const batch = rows.slice(i, i + BATCH);
      // CASE WHEN 방식으로 한 번에
      const cases = batch.map((r, j) => `WHEN "${col}"=$${j * 2 + 1} THEN $${j * 2 + 2}::text`).join(" ");
      const params: string[] = batch.flatMap((r) => [r.cardId, repMap.get(r.cardId)!]);
      await client.$executeRawUnsafe(
        `UPDATE "${tableName}" SET "${col}"= CASE ${cases} END
         WHERE "${col}" = ANY($${params.length + 1}::text[])`,
        ...params,
        batch.map((r) => r.cardId),
      );
    }
  }

  return rows.length;
}

async function main() {
  console.log(`\n════ P5 COLLAPSE ════ ${APPLY ? "★★★ APPLY (비가역) ★★★" : "(dry-run — 쓰기 0)"}\n`);

  // 1) 비대표 Card 목록
  const nonReps = await fetchNonReps();
  console.log(`비대표 Card(artCardId!=id): ${nonReps.length}`);

  if (nonReps.length === 0) {
    console.log("\n✅ 비대표 Card 0건 — 이미 collapse 완료이거나 build-art-groups 미적재. no-op.");
    await prisma.$disconnect();
    return;
  }

  const nonRepIds = nonReps.map((r) => r.id);
  const repMap = new Map<string, string>(nonReps.map((r) => [r.id, r.artCardId]));
  const affectedPackIds = [...new Set(nonReps.map((r) => r.cardPackId))];

  // 2) assertWritable — dry-run 이면 경고만, apply 이면 차단(--allow-protected 없으면)
  assertWritable(affectedPackIds, { allow: ALLOW, dryRun: !APPLY, tool: "p5-collapse" });

  // ── 수정 #7: half-collapse 사전 감지 ──────────────────────────────────────
  // "비대표 Card 가 남아있는데 일부 FK 가 이미 대표를 가리키는" 부분붕괴 상태를 감지
  // (트랜잭션 수정으로 대부분 방지되나, 이전 중단 실행 잔재 방어)
  {
    const repIds = [...new Set(nonRepIds.map((id) => repMap.get(id)!))];
    // 비대표 CardText 가 0인데 비대표 Card 가 남아 있으면 이미 일부 진행된 상태
    const orphanCtText = await qCount(
      `SELECT count(*)::int c FROM "CardText" WHERE "logicalCardId" = ANY($1::text[])`,
      [nonRepIds],
    );
    const orphanRcText = await qCount(
      `SELECT count(*)::int c FROM "CardLocale" WHERE "logicalCardId" = ANY($1::text[])`,
      [nonRepIds],
    );
    // 대표를 가리키는 RegionCard 도 이미 있어야 하는데, 비대표 RegionCard 가 0 이면 반쪽 진행됨
    const isHalfCollapsed =
      orphanCtText === 0 && // CardText 가 이미 이동됨
      orphanRcText === 0;   // RegionCard FK 도 이미 이동됨
    if (isHalfCollapsed && nonRepIds.length > 0) {
      console.error(
        `\n⛔ half-collapse 감지: 비대표 Card(${nonRepIds.length}건)가 잔존하는데 CardText+RegionCard FK 가 이미 0 입니다.`,
      );
      console.error(`   이전 실행이 중단됐을 가능성이 있습니다. SNAP 복원 후 재시도하거나 상태를 수동 검토하세요.`);
      await prisma.$disconnect();
      process.exit(1);
    }
  }

  // 3) 손실벡터 사전 분석 (dry-run 이든 apply 이든 항상 출력)
  console.log("\n[분석] FK 테이블별 영향 건수:");

  const rcCount = await qCount(
    `SELECT count(*)::int c FROM "CardLocale" WHERE "logicalCardId" = ANY($1::text[])`,
    [nonRepIds],
  );
  console.log(`  [V1] RegionCard repoint 대상: ${rcCount}건`);

  // CardText 충돌 예비 분석
  const ctTotal = await qCount(
    `SELECT count(*)::int c FROM "CardText" WHERE "logicalCardId" = ANY($1::text[])`,
    [nonRepIds],
  );
  const ctCollision = await qCount(
    `SELECT count(*)::int c FROM "CardText" nr
     WHERE nr."logicalCardId" = ANY($1::text[])
       AND EXISTS (
         SELECT 1 FROM "CardText" rep
         WHERE rep."logicalCardId" = (
           SELECT "artCardId" FROM "LogicalCard" WHERE id = nr."logicalCardId"
         )
           AND rep.language = nr.language
       )`,
    [nonRepIds],
  );
  console.log(`  [V2] CardText: 총 ${ctTotal}건 (충돌 ${ctCollision}건 → authority-pick, 나머지 repoint)`);

  const spTotal = await qCount(
    `SELECT count(*)::int c FROM "LogicalCardSpecies" WHERE "logicalCardId" = ANY($1::text[])`,
    [nonRepIds],
  );
  const spCollision = await qCount(
    `SELECT count(*)::int c FROM "LogicalCardSpecies" nr
     WHERE nr."logicalCardId" = ANY($1::text[])
       AND EXISTS (
         SELECT 1 FROM "LogicalCardSpecies" rep
         WHERE rep."logicalCardId" = (
           SELECT "artCardId" FROM "LogicalCard" WHERE id = nr."logicalCardId"
         )
           AND rep."speciesId" = nr."speciesId"
       )`,
    [nonRepIds],
  );
  console.log(`  [V3] CardSpecies: 총 ${spTotal}건 (충돌 ${spCollision}건 → DISTINCT union dedup, 나머지 repoint)`);

  const extTotal = await qCount(
    `SELECT count(*)::int c FROM "ExternalIdMapping" WHERE "logicalCardId" = ANY($1::text[])`,
    [nonRepIds],
  );
  const extCollision = await qCount(
    `SELECT count(*)::int c FROM "ExternalIdMapping" nr
     WHERE nr."logicalCardId" = ANY($1::text[])
       AND EXISTS (
         SELECT 1 FROM "ExternalIdMapping" rep
         WHERE rep."logicalCardId" = (
           SELECT "artCardId" FROM "LogicalCard" WHERE id = nr."logicalCardId"
         )
           AND rep."sourceId" = nr."sourceId"
           AND rep."externalId" = nr."externalId"
       )`,
    [nonRepIds],
  );
  console.log(`  [V4] ExternalIdMapping: 총 ${extTotal}건 (충돌 ${extCollision}건 → dedup)`);

  const drcCount = await qCount(
    `SELECT count(*)::int c FROM "DeckRecipeCard" WHERE "logicalCardId" = ANY($1::text[])`,
    [nonRepIds],
  );
  console.log(`  [V5] DeckRecipeCard: ${drcCount}건`);

  const tradeCount = await qCount(
    `SELECT count(*)::int c FROM "Trade" WHERE "logicalCardId" = ANY($1::text[])`,
    [nonRepIds],
  );
  console.log(`  [V6] Trade: ${tradeCount}건`);

  const ciCount = await qCount(
    `SELECT count(*)::int c FROM "CollectionItem" WHERE "logicalCardId" = ANY($1::text[])`,
    [nonRepIds],
  );
  console.log(`  [V7] CollectionItem: ${ciCount}건`);

  const rulingCount = await qCount(
    `SELECT count(*)::int c FROM "Ruling" WHERE "logicalCardId" = ANY($1::text[])`,
    [nonRepIds],
  );
  console.log(`  [V8] Ruling: ${rulingCount}건`);

  if (!APPLY) {
    console.log(`\n[dry-run 요약]`);
    console.log(`  비대표 Card 삭제 예정: ${nonReps.length}건`);
    console.log(`  영향 cardPackId: ${affectedPackIds.filter(Boolean).length}개 팩`);
    console.log(
      `  총 repoint 예상: RegionCard ${rcCount} · CardText ${ctTotal - ctCollision}(충돌 ${ctCollision}) · CardSpecies ${spTotal - spCollision}(dedup ${spCollision}) · ExternalId ${extTotal - extCollision}(dedup ${extCollision}) · DeckRecipeCard ${drcCount} · Trade ${tradeCount} · CollectionItem ${ciCount} · Ruling ${rulingCount}`,
    );
    console.log(`\n  ★ cascade victim 0 단언: CardText(onDelete:Cascade) 를 모두 이동/삭제 완료 후 Card 삭제 → victim 0 보장 설계`);
    console.log(`  ★ RegionCard.id 절대 불변: RegionCard 행 자체는 삭제 안 함, logicalCardId(FK)만 재바인딩`);
    console.log(`\n(dry-run) 쓰기 0. 적용하려면 --apply 플래그 추가 (비가역 — SNAP 먼저).`);
    await prisma.$disconnect();
    return;
  }

  // 4) APPLY 경로: 1 트랜잭션 안에서 전부 처리
  console.log("\n★ APPLY 진입 — 1 트랜잭션 시작...");

  // ── 수정 #2: apply 시 스냅샷 타임스탬프 준비 ──────────────────────────────
  const ts = new Date().toISOString().replace(/[:.]/g, "-");

  // RegionCard 행수 불변 단언용 — P5는 CardLocale.id 미변경·미삭제(오직 logicalCardId UPDATE).
  const rcTotalBefore = await qCount(`SELECT count(*)::int c FROM "CardLocale"`);

  await prisma.$transaction(
    async (tx) => {
      // 4-a) CardText: cascade victim 0 보장을 위해 반드시 Card 삭제 전에 처리
      //      (CardText.onDelete = Cascade → Card 삭제 시 자동 삭제됨 = victim 이 됨)
      console.log("  [V2] CardText authority-pick + repoint...");
      // ★ 수정 #1: tx 를 client 로 전달
      const { survivors: ctSurv, losers: ctLosers, loserLog, loserRows } =
        await resolveCardTextCollisions(tx, nonRepIds, repMap, false);

      if (loserLog.length > 0) {
        console.log(`    CardText loser 로그(${loserLog.length}건):`);
        for (const line of loserLog) console.log(`      ${line}`);
      }
      console.log(`    CardText repoint ${ctSurv}건 · loser 삭제 ${ctLosers}건`);

      // ★ 수정 #2: loser 전체 데이터를 .jsonl 로 영구 저장
      if (loserRows.length > 0) {
        writeJsonl(`p5-cardtext-losers-${ts}.jsonl`, loserRows);
      }

      // 4-b) cascade victim 0 단언: 비대표에 남은 CardText 가 0 이어야 Card 삭제 후 cascade 0
      const remainText = await tx.$queryRawUnsafe<{ c: bigint }[]>(
        `SELECT count(*)::int c FROM "CardText" WHERE "logicalCardId" = ANY($1::text[])`,
        nonRepIds,
      );
      const remainTextN = Number(remainText[0]?.c ?? 0);
      if (remainTextN !== 0) {
        throw new Error(`cascade victim 단언 실패: 비대표에 CardText ${remainTextN}건 잔존 — 트랜잭션 롤백`);
      }
      console.log(`    ✅ cascade victim 단언 통과 (비대표 CardText 잔존 0)`);

      // 4-c) CardSpecies: DISTINCT union
      console.log("  [V3] CardSpecies DISTINCT union...");
      // ★ 수정 #1: tx 를 client 로 전달
      const { repointed: spRep, dedupRemoved: spDedup } =
        await resolveCardSpeciesCollisions(tx, nonRepIds, repMap, false);
      console.log(`    CardSpecies repoint ${spRep}건 · dedup 삭제 ${spDedup}건`);

      // ★ 수정 #3/#4: CardSpecies onDelete:Cascade 전용 cascade-victim-0 단언
      const remainSpecies = await tx.$queryRawUnsafe<{ c: bigint }[]>(
        `SELECT count(*)::int c FROM "LogicalCardSpecies" WHERE "logicalCardId" = ANY($1::text[])`,
        nonRepIds,
      );
      const remainSpeciesN = Number(remainSpecies[0]?.c ?? 0);
      if (remainSpeciesN !== 0) {
        throw new Error(
          `CardSpecies cascade victim 단언 실패: 비대표에 LogicalCardSpecies ${remainSpeciesN}건 잔존 — 트랜잭션 롤백`,
        );
      }
      console.log(`    ✅ CardSpecies cascade victim 단언 통과 (비대표 LogicalCardSpecies 잔존 0)`);

      // 4-d) ExternalIdMapping dedup + repoint
      console.log("  [V4] ExternalIdMapping dedup + repoint...");
      // ★ 수정 #1: tx 를 client 로 전달
      const { repointed: extRep, dedupRemoved: extDedup, deletedRows: extDeletedRows } =
        await resolveExternalIdCollisions(tx, nonRepIds, repMap, false);
      console.log(`    ExternalIdMapping repoint ${extRep}건 · dedup 삭제 ${extDedup}건`);

      // ★ 수정 #2: ExternalIdMapping dedup 삭제분도 .jsonl 저장
      if (extDeletedRows.length > 0) {
        writeJsonl(`p5-externalid-dedup-${ts}.jsonl`, extDeletedRows);
      }

      // ★ 수정 #3/#4: ExternalIdMapping onDelete:Cascade 전용 cascade-victim-0 단언
      const remainExt = await tx.$queryRawUnsafe<{ c: bigint }[]>(
        `SELECT count(*)::int c FROM "ExternalIdMapping" WHERE "logicalCardId" = ANY($1::text[])`,
        nonRepIds,
      );
      const remainExtN = Number(remainExt[0]?.c ?? 0);
      if (remainExtN !== 0) {
        throw new Error(
          `ExternalIdMapping cascade victim 단언 실패: 비대표에 ExternalIdMapping ${remainExtN}건 잔존 — 트랜잭션 롤백`,
        );
      }
      console.log(`    ✅ ExternalIdMapping cascade victim 단언 통과 (비대표 잔존 0)`);

      // 4-e) RegionCard logicalCardId repoint (id 불변)
      console.log("  [V1] RegionCard logicalCardId repoint...");
      const rcUpdated = await tx.$executeRawUnsafe(
        `UPDATE "CardLocale" SET "logicalCardId" = lc."artCardId"
         FROM "LogicalCard" lc
         WHERE "CardLocale"."logicalCardId" = lc.id
           AND lc."artCardId" IS NOT NULL AND lc."artCardId" != lc.id`,
      );
      console.log(`    RegionCard repoint ${rcUpdated}건`);

      // 4-f) 단순 FK repoint: DeckRecipeCard
      console.log("  [V5] DeckRecipeCard logicalCardId repoint...");
      // ★ 수정 #1: tx 를 client 로 전달
      const drcN = await simpleRepoint(tx, "DeckRecipeCard", "logicalCardId", nonRepIds, repMap, false);
      console.log(`    DeckRecipeCard repoint ${drcN}건`);

      // 4-g) Trade logicalCardId repoint (localeId = RegionCard FK, 불변)
      console.log("  [V6] Trade logicalCardId repoint...");
      // ★ 수정 #1: tx 를 client 로 전달
      const tradeN = await simpleRepoint(tx, "Trade", "logicalCardId", nonRepIds, repMap, false);
      console.log(`    Trade repoint ${tradeN}건`);

      // 4-h) CollectionItem logicalCardId repoint
      console.log("  [V7] CollectionItem logicalCardId repoint...");
      // ★ 수정 #1: tx 를 client 로 전달
      const ciN = await simpleRepoint(tx, "CollectionItem", "logicalCardId", nonRepIds, repMap, false);
      console.log(`    CollectionItem repoint ${ciN}건`);

      // 4-i) Ruling logicalCardId repoint (nullable — IS NOT NULL 필터)
      console.log("  [V8] Ruling logicalCardId repoint...");
      // ★ 수정 #1: tx 를 client 로 전달
      const rulingN = await simpleRepoint(tx, "Ruling", "logicalCardId", nonRepIds, repMap, false);
      console.log(`    Ruling repoint ${rulingN}건`);

      // 4-j) 비대표 Card 삭제 전 최종 자식 잔존 검사
      console.log("  [삭제 전 자식 잔존 검사]...");
      const childChecks: [string, string][] = [
        ["CardLocale", "logicalCardId"],
        ["CardText", "logicalCardId"],
        ["LogicalCardSpecies", "logicalCardId"],
        ["ExternalIdMapping", "logicalCardId"],
        ["DeckRecipeCard", "logicalCardId"],
        ["Trade", "logicalCardId"],
        ["CollectionItem", "logicalCardId"],
        ["Ruling", "logicalCardId"],
      ];
      let totalRemain = 0;
      for (const [tbl, col] of childChecks) {
        const cnt = Number(
          ((await tx.$queryRawUnsafe<{ c: bigint }[]>(
            `SELECT count(*)::int c FROM "${tbl}" WHERE "${col}" = ANY($1::text[])`,
            nonRepIds,
          )) as { c: bigint }[])[0]?.c ?? 0,
        );
        if (cnt > 0) {
          console.warn(`    ⚠ ${tbl}.${col} 잔존 ${cnt}건`);
          totalRemain += cnt;
        }
      }
      if (totalRemain > 0) {
        throw new Error(`자식 잔존 단언 실패: 총 ${totalRemain}건 남음 — 트랜잭션 롤백`);
      }
      console.log(`    ✅ 자식 잔존 단언 통과 (모든 FK 테이블 0건)`);

      // 4-k) 비대표 Card 삭제
      console.log(`  [Card 삭제] 비대표 ${nonRepIds.length}건...`);
      const deleted = await tx.$executeRawUnsafe(
        `DELETE FROM "LogicalCard" WHERE id = ANY($1::text[])`,
        nonRepIds,
      );
      console.log(`    Card 삭제 ${deleted}건`);

      // 4-l) cascade victim 사후 검증: 삭제 후 모든 FK 테이블 고아 없음
      console.log("  [cascade victim 사후 검증]...");
      for (const [tbl, col] of childChecks) {
        const orphan = Number(
          ((await tx.$queryRawUnsafe<{ c: bigint }[]>(
            `SELECT count(*)::int c FROM "${tbl}" x
             WHERE x."${col}" IS NOT NULL
               AND NOT EXISTS (SELECT 1 FROM "LogicalCard" p WHERE p.id = x."${col}")`,
          )) as { c: bigint }[])[0]?.c ?? 0,
        );
        if (orphan > 0) {
          throw new Error(`사후 고아 단언 실패: ${tbl}.${col} 고아 ${orphan}건 — 롤백`);
        }
      }
      console.log(`    ✅ 사후 cascade victim 단언 통과 (고아 0)`);

      // 4-m) RegionCard 불변 단언 — P5는 CardLocale.id 를 변경/삭제하지 않음(오직 logicalCardId repoint).
      //   ★구판 단언(삭제 Card.id == RegionCard.id 이면 차단)은 FALSE-POSITIVE 제거:
      //     정체성 마이그가 1:1 카드의 LogicalCard.id 를 RegionCard.id 와 동일하게 둔 설계라(jp-svp-37 등 293건),
      //     비대표 LC 삭제 시 같은 id 의 RegionCard 는 살아남아 logicalCardId 가 대표로 repoint 됨
      //     (위 '사후 cascade victim 고아 0' 단언이 FK 무결성 이미 보증). → 행수 불변으로 교체.
      const rcTotalAfter = Number(
        ((await tx.$queryRawUnsafe<{ c: bigint }[]>(`SELECT count(*)::int c FROM "CardLocale"`)) as { c: bigint }[])[0]?.c ?? 0,
      );
      if (rcTotalAfter !== rcTotalBefore) {
        throw new Error(`RegionCard 행수 불변 위반: ${rcTotalBefore} → ${rcTotalAfter} (RegionCard 삭제/생성 발생) — 롤백.`);
      }

      console.log(`\n  ✅ 트랜잭션 완료. collapse ${nonRepIds.length}건.`);
      console.log(`  다음: gate-fk.ts --compare before-p5 · check-locale-conservation --compare`);
    },
    // ★ 수정 #8: 대량 collapse를 위해 타임아웃 10분으로 상향
    { timeout: 600_000 },
  );

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
