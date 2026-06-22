// 단위테스트: src/lib/cards/sibling-resolver (D3 형제 리졸버)
// 실행: npx tsx --test scripts/test/sibling-resolver.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  pickSiblingForRegion,
  resolveSiblings,
  isUnavailable,
  type SiblingCandidate,
} from "@/lib/cards/sibling-resolver";

function cand(p: Partial<SiblingCandidate> & { id: string; region: string; setId: string }): SiblingCandidate {
  return {
    releaseDate: "2024-06-01",
    hasImage: true,
    role: undefined,
    numberInt: null,
    number: null,
    gameCardId: null,
    ...p,
  };
}

const anchorJP = cand({ id: "jp1", region: "JP", setId: "jpSet", releaseDate: "2024-06-01" });

test("Tier-A 정확 트윈이 더 가까운 날짜의 비트윈보다 우선", () => {
  const cands = [
    anchorJP,
    cand({ id: "enTwin", region: "EN", setId: "enSet", releaseDate: "2024-08-01" }), // 트윈, 먼 날짜
    cand({ id: "enOther", region: "EN", setId: "enOther", releaseDate: "2024-06-05" }), // 비트윈, 가까운 날짜
  ];
  const pick = pickSiblingForRegion(anchorJP, cands, "EN", { twinSetIds: new Set(["jpSet", "enSet"]) });
  assert.equal(isUnavailable(pick), false);
  assert.equal((pick as SiblingCandidate).id, "enTwin");
});

test("트윈 없으면 클릭카드에 가장 가까운 발매일 우선", () => {
  const cands = [
    anchorJP,
    cand({ id: "enFar", region: "EN", setId: "enA", releaseDate: "2024-08-01" }),
    cand({ id: "enNear", region: "EN", setId: "enB", releaseDate: "2024-06-05" }),
  ];
  const pick = pickSiblingForRegion(anchorJP, cands, "EN", {});
  assert.equal((pick as SiblingCandidate).id, "enNear");
});

test("대상 지역 후보 없으면 unavailable", () => {
  const cands = [anchorJP, cand({ id: "en1", region: "EN", setId: "enA" })];
  const pick = pickSiblingForRegion(anchorJP, cands, "KR", {});
  assert.equal(isUnavailable(pick), true);
});

test("이미지 있는 후보가 없는 후보보다 우선", () => {
  const cands = [
    anchorJP,
    cand({ id: "enNoImg", region: "EN", setId: "enS", hasImage: false }),
    cand({ id: "enImg", region: "EN", setId: "enS", hasImage: true }),
  ];
  const pick = pickSiblingForRegion(anchorJP, cands, "EN", {});
  assert.equal((pick as SiblingCandidate).id, "enImg");
});

test("역할 ANCHOR/NATIVE 가 reprint 보다 우선 (이미지·날짜 동률)", () => {
  const cands = [
    anchorJP,
    cand({ id: "enReprint", region: "EN", setId: "enS", role: "MIRROR" }),
    cand({ id: "enNative", region: "EN", setId: "enS", role: "NATIVE" }),
  ];
  const pick = pickSiblingForRegion(anchorJP, cands, "EN", {});
  assert.equal((pick as SiblingCandidate).id, "enNative");
});

test("센티넬(1970) 발매일 후보는 날짜 키에서 밀린다", () => {
  const cands = [
    anchorJP, // known 2024-06-01
    cand({ id: "enSent", region: "EN", setId: "enA", releaseDate: "1970-01-01", numberInt: 1 }),
    cand({ id: "enReal", region: "EN", setId: "enB", releaseDate: "2024-06-10", numberInt: 99 }),
  ];
  const pick = pickSiblingForRegion(anchorJP, cands, "EN", {});
  assert.equal((pick as SiblingCandidate).id, "enReal");
});

test("anchor 발매일 불명이면 날짜 키 무력 → 번호 낮은 쪽", () => {
  const anchorSent = cand({ id: "jpS", region: "JP", setId: "jpSet", releaseDate: "1970-01-01" });
  const cands = [
    anchorSent,
    cand({ id: "enHi", region: "EN", setId: "enS", releaseDate: "2024-09-01", numberInt: 50 }),
    cand({ id: "enLo", region: "EN", setId: "enS", releaseDate: "2024-03-01", numberInt: 10 }),
  ];
  const pick = pickSiblingForRegion(anchorSent, cands, "EN", {});
  assert.equal((pick as SiblingCandidate).id, "enLo");
});

test("같은 세트 다중(모든 키 동률) → 낮은 번호, 다음 안정 id", () => {
  const cands = [
    anchorJP,
    cand({ id: "z", region: "EN", setId: "enS", numberInt: 134 }),
    cand({ id: "a", region: "EN", setId: "enS", numberInt: 113 }),
  ];
  assert.equal((pickSiblingForRegion(anchorJP, cands, "EN", {}) as SiblingCandidate).id, "a"); // 113 < 134

  const tieNum = [
    anchorJP,
    cand({ id: "b", region: "EN", setId: "enS", numberInt: 7 }),
    cand({ id: "a", region: "EN", setId: "enS", numberInt: 7 }),
  ];
  assert.equal((pickSiblingForRegion(anchorJP, tieNum, "EN", {}) as SiblingCandidate).id, "a"); // id a < b
});

test("gameCard 가드: 다른 gameCardId 후보 제외", () => {
  const cands = [
    anchorJP,
    cand({ id: "enWrong", region: "EN", setId: "enA", releaseDate: "2024-06-02", gameCardId: "gc2" }),
    cand({ id: "enRight", region: "EN", setId: "enB", releaseDate: "2024-12-01", gameCardId: "gc1" }),
  ];
  const pick = pickSiblingForRegion(anchorJP, cands, "EN", { anchorGameCardId: "gc1" });
  assert.equal((pick as SiblingCandidate).id, "enRight"); // 더 먼 날짜라도 같은 gameCard
});

test("resolveSiblings: 자기 지역은 anchor, 없는 지역은 unavailable", () => {
  const cands = [anchorJP, cand({ id: "en1", region: "EN", setId: "enA" })];
  const map = resolveSiblings(anchorJP, cands);
  assert.equal((map.JP as SiblingCandidate).id, "jp1"); // 자기 지역 = anchor
  assert.equal((map.EN as SiblingCandidate).id, "en1");
  assert.equal(isUnavailable(map.KR), true); // KR 없음
});
