// 단위테스트: src/lib/cards/decklist-gamecard-resolver
// 실행: npx tsx --test scripts/test/decklist-gamecard-resolver.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildSetNumberIndex,
  resolveRecipeCard,
  resolveRecipeCards,
  computeAdoptionByGameCard,
  type CardCandidate,
  type RecipeCardRef,
  type ResolveSuccess,
} from "@/lib/cards/decklist-gamecard-resolver";

// ── 헬퍼 ─────────────────────────────────────────────────────────────────────

function card(
  p: Partial<CardCandidate> & { id: string }
): CardCandidate {
  return {
    gameCardId: null,
    artCardId: null,
    printings: [],
    ...p,
  };
}

function ref(
  p: Partial<RecipeCardRef> & { cardName: string }
): RecipeCardRef {
  return {
    cardId: null,
    setCode: "",
    number: "",
    ...p,
  };
}

// 공통 후보 풀
const GC1 = "gc_pikachu";
const GC2 = "gc_raichu";

const cardA = card({
  id: "lc_a",
  gameCardId: GC1,
  artCardId: "lc_a", // 대표(생존자)
  printings: [{ setCode: "SVI", number: "1" }],
});
const cardB = card({
  id: "lc_b",
  gameCardId: GC1,
  artCardId: "lc_a", // 비대표(비생존자) → 대표=lc_a
  printings: [{ setCode: "SVI", number: "2" }],
});
const cardC = card({
  id: "lc_c",
  gameCardId: GC2,
  artCardId: null, // build-art-groups 미실행 → 자기 id 로 폴백
  printings: [{ setCode: "OBF", number: "5" }],
});
const cardNoGC = card({
  id: "lc_nogc",
  gameCardId: null,
  artCardId: null,
  printings: [{ setCode: "SVI", number: "99" }],
});

const POOL: CardCandidate[] = [cardA, cardB, cardC, cardNoGC];

// ── buildSetNumberIndex 테스트 ────────────────────────────────────────────────

test("buildSetNumberIndex: setCode null 행은 인덱스 제외", () => {
  const withNull = card({
    id: "lc_null",
    gameCardId: "gc_x",
    printings: [{ setCode: null, number: "10" }],
  });
  const idx = buildSetNumberIndex([withNull]);
  assert.equal(idx.size, 0);
});

test("buildSetNumberIndex: 같은 키에 복수 후보 누적", () => {
  // cardA 와 cardB 는 다른 setCode|number 이므로 각 1개
  const idx = buildSetNumberIndex([cardA, cardB]);
  assert.equal(idx.get("SVI|1")?.length, 1);
  assert.equal(idx.get("SVI|2")?.length, 1);
});

test("buildSetNumberIndex: 동일 키 복수 후보", () => {
  const dupe1 = card({ id: "d1", gameCardId: "gc_x", printings: [{ setCode: "SVI", number: "7" }] });
  const dupe2 = card({ id: "d2", gameCardId: "gc_x", printings: [{ setCode: "SVI", number: "7" }] });
  const idx = buildSetNumberIndex([dupe1, dupe2]);
  assert.equal(idx.get("SVI|7")?.length, 2);
});

// ── resolveRecipeCard: cardId 경로 ────────────────────────────────────────────

test("cardId 경로: 정상 리졸브 → gameCardId + 생존자 반환", () => {
  const poolById = new Map(POOL.map((c) => [c.id, c]));
  const snIdx = buildSetNumberIndex(POOL);
  const r = resolveRecipeCard(ref({ cardName: "피카츄", cardId: "lc_a" }), poolById, snIdx);
  assert.equal(r.status, "resolved");
  if (r.status === "resolved") {
    assert.equal(r.gameCardId, GC1);
    assert.equal(r.survivorCardId, "lc_a"); // artCardId===id → 자기가 대표
    assert.equal(r.inputCardId, "lc_a");
  }
});

test("cardId 경로: 비대표 Card → 생존자는 artCardId(대표)", () => {
  const poolById = new Map(POOL.map((c) => [c.id, c]));
  const snIdx = buildSetNumberIndex(POOL);
  const r = resolveRecipeCard(ref({ cardName: "피카츄 재판", cardId: "lc_b" }), poolById, snIdx);
  assert.equal(r.status, "resolved");
  if (r.status === "resolved") {
    assert.equal(r.gameCardId, GC1);
    assert.equal(r.survivorCardId, "lc_a"); // artCardId=lc_a → 대표는 lc_a
  }
});

test("cardId 경로: artCardId null → 자기 id 가 생존자(build-art-groups 미실행 폴백)", () => {
  const poolById = new Map(POOL.map((c) => [c.id, c]));
  const snIdx = buildSetNumberIndex(POOL);
  const r = resolveRecipeCard(ref({ cardName: "라이츄", cardId: "lc_c" }), poolById, snIdx);
  assert.equal(r.status, "resolved");
  if (r.status === "resolved") {
    assert.equal(r.survivorCardId, "lc_c"); // artCardId null → 자기 id
  }
});

test("cardId 경로: pool에 없는 cardId → cardid_not_in_pool", () => {
  const poolById = new Map(POOL.map((c) => [c.id, c]));
  const snIdx = buildSetNumberIndex(POOL);
  const r = resolveRecipeCard(ref({ cardName: "미수집", cardId: "lc_ghost" }), poolById, snIdx);
  assert.equal(r.status, "unresolved");
  if (r.status === "unresolved") assert.equal(r.reason, "cardid_not_in_pool");
});

test("cardId 경로: gameCardId null → no_gamecardid", () => {
  const poolById = new Map(POOL.map((c) => [c.id, c]));
  const snIdx = buildSetNumberIndex(POOL);
  const r = resolveRecipeCard(ref({ cardName: "GC없음", cardId: "lc_nogc" }), poolById, snIdx);
  assert.equal(r.status, "unresolved");
  if (r.status === "unresolved") assert.equal(r.reason, "no_gamecardid");
});

// ── resolveRecipeCard: setCode+number 경로 ────────────────────────────────────

test("setCode+number 경로: 정상 리졸브", () => {
  const poolById = new Map(POOL.map((c) => [c.id, c]));
  const snIdx = buildSetNumberIndex(POOL);
  const r = resolveRecipeCard(
    ref({ cardName: "라이츄", setCode: "OBF", number: "5" }),
    poolById,
    snIdx,
  );
  assert.equal(r.status, "resolved");
  if (r.status === "resolved") {
    assert.equal(r.gameCardId, GC2);
    assert.equal(r.survivorCardId, "lc_c");
  }
});

test("setCode+number 경로: 해당 키 없으면 setcode_no_match", () => {
  const poolById = new Map(POOL.map((c) => [c.id, c]));
  const snIdx = buildSetNumberIndex(POOL);
  const r = resolveRecipeCard(
    ref({ cardName: "없는카드", setCode: "PRE", number: "99" }),
    poolById,
    snIdx,
  );
  assert.equal(r.status, "unresolved");
  if (r.status === "unresolved") assert.equal(r.reason, "setcode_no_match");
});

test("setCode+number 경로: 복수 후보 동일 gameCardId → 생존자 우선 선택", () => {
  // 같은 키에 동일 gameCardId 를 가진 두 Card (재판 상황)
  const rep = card({ id: "lc_rep", gameCardId: "gc_dup", artCardId: "lc_rep", printings: [{ setCode: "SVI", number: "10" }] });
  const nonRep = card({ id: "lc_nr", gameCardId: "gc_dup", artCardId: "lc_rep", printings: [{ setCode: "SVI", number: "10" }] });
  const poolById = new Map([[rep.id, rep], [nonRep.id, nonRep]]);
  const snIdx = buildSetNumberIndex([rep, nonRep]);
  const r = resolveRecipeCard(ref({ cardName: "중복", setCode: "SVI", number: "10" }), poolById, snIdx);
  assert.equal(r.status, "resolved");
  if (r.status === "resolved") {
    assert.equal(r.survivorCardId, "lc_rep"); // 생존자(artCardId===id)가 선택됨
  }
});

test("setCode+number 경로: 복수 후보 다른 gameCardId → 모호, setcode_no_match", () => {
  const x = card({ id: "lc_x", gameCardId: "gc_x", printings: [{ setCode: "SVI", number: "20" }] });
  const y = card({ id: "lc_y", gameCardId: "gc_y", printings: [{ setCode: "SVI", number: "20" }] }); // 다른 gameCardId
  const poolById = new Map([[x.id, x], [y.id, y]]);
  const snIdx = buildSetNumberIndex([x, y]);
  const r = resolveRecipeCard(ref({ cardName: "모호", setCode: "SVI", number: "20" }), poolById, snIdx);
  assert.equal(r.status, "unresolved");
  if (r.status === "unresolved") assert.equal(r.reason, "setcode_no_match");
});

test("setCode+number 경로: 복수 후보 한쪽 gameCardId 비-null·다른 쪽 null → setcode_no_match (P3 부분적용 케이스)", () => {
  // 같은 키에 후보 2개: 하나는 gameCardId 있음, 하나는 null → gcIds.size===2 → 모호
  const withGc = card({ id: "lc_partial", gameCardId: "gc_partial", printings: [{ setCode: "PAR", number: "30" }] });
  const noGc = card({ id: "lc_partial_null", gameCardId: null, printings: [{ setCode: "PAR", number: "30" }] });
  const poolById = new Map([[withGc.id, withGc], [noGc.id, noGc]]);
  const snIdx = buildSetNumberIndex([withGc, noGc]);
  const r = resolveRecipeCard(ref({ cardName: "부분P3", setCode: "PAR", number: "30" }), poolById, snIdx);
  assert.equal(r.status, "unresolved");
  if (r.status === "unresolved") assert.equal(r.reason, "setcode_no_match");
});

test("setCode+number 경로: 단일 후보 gameCardId null → no_gamecardid", () => {
  // 단일 후보이므로 pickUnambiguousCandidate 는 그 후보를 반환, 이후 gameCardId null 체크에서 걸림
  const noGc = card({ id: "lc_solo_null", gameCardId: null, printings: [{ setCode: "PAR", number: "40" }] });
  const poolById = new Map([[noGc.id, noGc]]);
  const snIdx = buildSetNumberIndex([noGc]);
  const r = resolveRecipeCard(ref({ cardName: "단일null", setCode: "PAR", number: "40" }), poolById, snIdx);
  assert.equal(r.status, "unresolved");
  if (r.status === "unresolved") assert.equal(r.reason, "no_gamecardid");
});

test("setCode+number 경로: 리졸브 성공 시 inputCardId 는 매칭된 Card.id(ref.cardId 아님)", () => {
  // ref.cardId=null(setCode 경로), 매칭된 카드 id=lc_c → inputCardId 는 lc_c 이어야 함
  const poolById = new Map(POOL.map((c) => [c.id, c]));
  const snIdx = buildSetNumberIndex(POOL);
  const r = resolveRecipeCard(ref({ cardName: "라이츄", setCode: "OBF", number: "5" }), poolById, snIdx);
  assert.equal(r.status, "resolved");
  if (r.status === "resolved") {
    assert.equal(r.inputCardId, "lc_c"); // setCode 경로: 매칭된 Card.id
    // ref.cardId 는 null 이었으므로 ref.cardId 와 다름
    assert.notEqual(r.inputCardId, null);
  }
});

// ── resolveRecipeCard: 참조 정보 없음 ─────────────────────────────────────────

test("cardId null & setCode empty → no_cardid_no_setcode", () => {
  const poolById = new Map(POOL.map((c) => [c.id, c]));
  const snIdx = buildSetNumberIndex(POOL);
  const r = resolveRecipeCard(
    ref({ cardName: "참조없음", cardId: null, setCode: "", number: "" }),
    poolById,
    snIdx,
  );
  assert.equal(r.status, "unresolved");
  if (r.status === "unresolved") assert.equal(r.reason, "no_cardid_no_setcode");
});

test("cardId null & number empty → no_cardid_no_setcode (setCode만으로 부족)", () => {
  const poolById = new Map(POOL.map((c) => [c.id, c]));
  const snIdx = buildSetNumberIndex(POOL);
  const r = resolveRecipeCard(
    ref({ cardName: "참조불완전", cardId: null, setCode: "SVI", number: "" }),
    poolById,
    snIdx,
  );
  assert.equal(r.status, "unresolved");
  if (r.status === "unresolved") assert.equal(r.reason, "no_cardid_no_setcode");
});

// ── resolveRecipeCards 배치 처리 ──────────────────────────────────────────────

test("resolveRecipeCards: 혼합 배치 → 통계 정확", () => {
  const refs: RecipeCardRef[] = [
    ref({ cardName: "피카츄", cardId: "lc_a" }),      // resolved
    ref({ cardName: "라이츄", setCode: "OBF", number: "5" }), // resolved
    ref({ cardName: "미수집", cardId: "lc_ghost" }),   // unresolved: cardid_not_in_pool
    ref({ cardName: "참조없음" }),                      // unresolved: no_cardid_no_setcode
  ];
  const result = resolveRecipeCards(refs, POOL);
  assert.equal(result.resolved.length, 2);
  assert.equal(result.unresolved.length, 2);
  assert.equal(result.resolveRate, 0.5);
  assert.equal(result.unresolvedByReason.cardid_not_in_pool, 1);
  assert.equal(result.unresolvedByReason.no_cardid_no_setcode, 1);
});

test("resolveRecipeCards: 빈 입력 → resolveRate 1(100%)", () => {
  const result = resolveRecipeCards([], POOL);
  assert.equal(result.resolved.length, 0);
  assert.equal(result.resolveRate, 1);
});

// ── computeAdoptionByGameCard (채용률 diff0) ──────────────────────────────────

test("computeAdoptionByGameCard: 같은 gameCardId 재판 합산(100% 초과 방지)", () => {
  const rows: (ResolveSuccess & { adoptionRate: number })[] = [
    { status: "resolved", gameCardId: "gc_pika", survivorCardId: "lc_a", inputCardId: "lc_a", adoptionRate: 60 },
    { status: "resolved", gameCardId: "gc_pika", survivorCardId: "lc_a", inputCardId: "lc_b", adoptionRate: 50 },
  ];
  const map = computeAdoptionByGameCard(rows);
  // 60 + 50 = 110 → cap at 100
  assert.equal(map.get("gc_pika"), 100);
});

test("computeAdoptionByGameCard: 다른 gameCardId 는 독립 집계", () => {
  const rows: (ResolveSuccess & { adoptionRate: number })[] = [
    { status: "resolved", gameCardId: "gc_a", survivorCardId: "lc_a", inputCardId: "lc_a", adoptionRate: 80 },
    { status: "resolved", gameCardId: "gc_b", survivorCardId: "lc_b", inputCardId: "lc_b", adoptionRate: 40 },
  ];
  const map = computeAdoptionByGameCard(rows);
  assert.equal(map.get("gc_a"), 80);
  assert.equal(map.get("gc_b"), 40);
});

test("computeAdoptionByGameCard: 빈 입력 → 빈 맵", () => {
  const map = computeAdoptionByGameCard([]);
  assert.equal(map.size, 0);
});
