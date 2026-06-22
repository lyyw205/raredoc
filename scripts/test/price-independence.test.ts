// 가드 테스트(D5): 시세 모듈은 표시용 형제 리졸버(sibling-resolver)를 절대 import 하지 않는다.
//   엉뚱한 팩 가격은 오해를 부른다 — 가격은 자기 RegionCard/ArtCard 전체로 따로 집계.
//   docs/migration/identity-model-migration-plan.md §0′ (D5).
// 실행: npx tsx --test scripts/test/price-independence.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const PRICE_MODULES = [
  "src/lib/actions/getCardPrices.ts",
  "src/lib/services/deck-pricing.ts",
];

for (const rel of PRICE_MODULES) {
  test(`${rel} 는 sibling-resolver 를 import 하지 않는다 (D5)`, () => {
    const src = readFileSync(resolve(process.cwd(), rel), "utf8");
    assert.equal(
      /sibling-resolver/.test(src),
      false,
      `${rel} 가 sibling-resolver 를 참조함 — 시세는 표시 리졸버의 날짜폴백 픽을 상속하면 안 됨(D5)`,
    );
  });
}
