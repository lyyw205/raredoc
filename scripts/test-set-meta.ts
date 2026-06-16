/**
 * set-meta.ts 단위 테스트 — DB 불필요. Run: npx tsx scripts/test-set-meta.ts
 */
import assert from "node:assert/strict";
import { derivePackType, deriveCleanTitle, resolveSidebarTitle } from "../src/lib/cards/set-meta";

let pass = 0;
const t = (name: string, fn: () => void) => { fn(); pass++; console.log("  ✓", name); };

// ── derivePackType ──
t("본탄 확장팩 → expansion", () =>
  assert.equal(derivePackType({ name: "스칼렛&바이올렛 확장팩 「흑염의 지배자」", code: "SV3", rawEra: "SV" }), "expansion"));
t("배틀 강화 BOX(-SP) → box_set", () =>
  assert.equal(derivePackType({ name: "스칼렛&바이올렛 배틀 강화 BOX 「흑염의 지배자」", code: "SVF", rawEra: "SV-SP" }), "box_set"));
t("강화 확장팩 → reinforced", () =>
  assert.equal(derivePackType({ name: "스칼렛&바이올렛 강화 확장팩 「레이징서프」", code: "SV3a", rawEra: "SV" }), "reinforced"));
t("하이클래스팩 → high_class", () =>
  assert.equal(derivePackType({ name: "스칼렛&바이올렛 하이클래스팩 「샤이니트레저 ex」", code: "SV4a", rawEra: "SV" }), "high_class"));
t("GOLDEN BOX(regular era) → box_set (concept 아님)", () =>
  assert.equal(derivePackType({ name: "소드&실드 「25th ANNIVERSARY GOLDEN BOX」", code: "S8a-G", rawEra: "S (소드·실드)" }), "box_set"));
t("스타터 세트(-SP) → starter", () =>
  assert.equal(derivePackType({ name: "스칼렛&바이올렛 스타터 세트 「뮤츠 ex」", code: "SVEM", rawEra: "SV-SP" }), "starter"));
t("프로모(code PR) → promo", () =>
  assert.equal(derivePackType({ name: "Scarlet & Violet Black Star Promos", code: "PR-SV", rawEra: null }), "promo"));
t("JP 본탄 짧은 이름 → expansion", () =>
  assert.equal(derivePackType({ name: "흑염의 지배자", code: null, rawEra: "SV" }), "expansion"));
t("KR DP 본탄(era=null, '확장팩') → expansion", () =>
  assert.equal(derivePackType({ name: "DP 확장팩 모험의 시작", code: "BS1", rawEra: null }), "expansion"));
t("EN SM 본탄(era=null, 키워드無) → null(override 대상)", () =>
  assert.equal(derivePackType({ name: "Sun & Moon", code: "SUM", rawEra: null }), null));

// ── deriveCleanTitle ──
t("「」 안쪽 추출", () =>
  assert.equal(deriveCleanTitle("스칼렛&바이올렛 확장팩 「흑염의 지배자」"), "흑염의 지배자"));
t("「」 없으면 접두 제거", () =>
  assert.equal(deriveCleanTitle("스칼렛&바이올렛 확장팩 「미래의 일섬」"), "미래의 일섬"));
t("이미 짧은 JP 이름 그대로", () =>
  assert.equal(deriveCleanTitle("흑염의 지배자"), "흑염의 지배자"));
t("「」 없는 구세대 이름 그대로", () =>
  assert.equal(deriveCleanTitle("콜렉션 X"), "콜렉션 X"));
t("EN 영문 이름 그대로", () =>
  assert.equal(deriveCleanTitle("Obsidian Flames"), "Obsidian Flames"));

// ── resolveSidebarTitle (3단 폴백) ──
const shorten = (n: string) => n.replace(/^.*「([^」]+)」.*$/, "$1");
t("1순위 titleClean", () =>
  assert.equal(resolveSidebarTitle({ setTitleClean: "흑염의 지배자", cardPackName: "X", legacyName: "Y", rawEra: "SV", shortenPackName: shorten }), "흑염의 지배자"));
t("2순위 cardPack canonical", () =>
  assert.equal(resolveSidebarTitle({ setTitleClean: null, cardPackName: "흑염의 지배자", legacyName: "Y", rawEra: "SV", shortenPackName: shorten }), "흑염의 지배자"));
t("3순위 shortenPackName 폴백", () =>
  assert.equal(resolveSidebarTitle({ setTitleClean: null, cardPackName: null, legacyName: "확장팩 「흑염의 지배자」", rawEra: "SV", shortenPackName: shorten }), "흑염의 지배자"));

console.log(`\n✅ ${pass} passed`);
