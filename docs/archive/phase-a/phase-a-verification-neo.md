# Phase A Verification: NEO1~4

생성 일시: 2026-05-29 08:02:41 UTC

대상: NEO1~4 (일본판 Neo 시리즈, 1999~2001). 총 323장.

## A) 이미지 라이브니스 (Image Liveness)

Supabase Storage에 업로드된 카드 이미지 HTTP 상태 점검 (HEAD).

| 세트 | JP 이름 | 총 카드 | HTTP 200 | 실패 | 성공률 |
| --- | --- | --- | --- | --- | --- |
| neo1 | 金、銀、新世界へ... | 96 | 96 | 0 | 100.0% |
| neo2 | 遺跡をこえて... | 57 | 54 | 3 | 94.7% |
| neo3 | めざめる伝説 | 57 | 57 | 0 | 100.0% |
| neo4 | 闇、そして光へ... | 113 | 111 | 2 | 98.2% |

**전체:** 318/323 이미지 정상 (98.5%)

### 실패 목록 (5건)
| ID | 이름 | URL | HTTP 상태 |
| --- | --- | --- | --- |
| jp-tcg-neo2-055 | 化石卵 | (null) | 0 |
| jp-tcg-neo2-056 | ハイパーデボルブスプレー | (null) | 0 |
| jp-tcg-neo2-057 | 壁を台無しにする[aerodactyl] | (null) | 0 |
| jp-tcg-neo4-031 | マンタイン | (null) | 0 |
| jp-tcg-neo4-229 | ヘルガー | (null) | 0 |

## B) 필드 완성도 감사 (Field Completeness)

각 LogicalCard 필드의 채움률 (%). 
※ nameKo는 NEO 시리즈 한국 미발매이므로 0% 예상.

| 세트 | 총계 | hp | types | attacks | abilities | subtypes | illustrator | rarityId | pokedexNumbers | supertype | nameKo |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| neo1 | 96 | 75.0% | 75.0% | 74.0% | 8.3% | 75.0% | 100.0% | 100.0% | 75.0% | 100.0% | 75.0% |
| neo2 | 57 | 91.2% | 91.2% | 89.5% | 21.1% | 91.2% | 94.7% | 100.0% | 91.2% | 100.0% | 91.2% |
| neo3 | 57 | 91.2% | 91.2% | 91.2% | 26.3% | 91.2% | 100.0% | 100.0% | 91.2% | 100.0% | 91.2% |
| neo4 | 113 | 86.7% | 86.7% | 86.7% | 21.2% | 86.7% | 98.2% | 100.0% | 86.7% | 100.0% | 86.7% |

## C) 인덱스 연속성 (ID Contiguity)

각 세트의 카드 ID가 001부터 {cardCount}까지 연속되는지 점검.

| 세트 | cardCount | 실제 수 | 갭 수 | 중복 수 | 상태 |
| --- | --- | --- | --- | --- | --- |
| neo1 | 96 | 96 | 0 | 0 | ✓ |
| neo2 | 57 | 57 | 0 | 0 | ✓ |
| neo3 | 57 | 57 | 0 | 0 | ✓ |
| neo4 | 113 | 112 | 1 | 0 | ! |

**neo4 갭:** 024

## E) 누락 이미지 카드 진단

imageSmall이 NULL인 카드 — tcgdex API 직접 탐침으로 실재 여부 확인.

| 세트 | 번호 | 이름 | tcgdex 상태 | tcgdex 이름 | 레어도 | 타입 | DB 존재 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| neo2 | 055 | 化石卵 | 200 | 化石卵 | Uncommon | — | O |
| neo2 | 056 | ハイパーデボルブスプレー | 200 | ハイパーデボルブスプレー | Uncommon | — | O |
| neo2 | 057 | 壁を台無しにする[aerodactyl] | 200 | 壁を台無しにする[aerodactyl] | Uncommon | — | O |
| neo4 | 031 | マンタイン | 200 | マンティン | Common | Water | O |
| neo4 | 229 | ヘルガー | 200 | 暗い猟犬 | Holo Rare | Fire | O |

**요약:** tcgdex 200=5, 404=0, 기타=0
> tcgdex에 존재하는 카드(5건)는 이미지 소스 확보 후 재시도 가능.

## F) Supertype 분류

각 세트의 LogicalCard.supertype 값 분포.

| 세트 | 합계 | Energy | Pokemon | Trainer |
| --- | --- | --- | --- | --- |
| neo1 | 96 | 3 | 72 | 21 |
| neo2 | 57 | 0 | 52 | 5 |
| neo3 | 57 | 0 | 52 | 5 |
| neo4 | 113 | 1 | 98 | 14 |

> 모든 카드에 supertype 존재.

## G) EN 교차 검증 — 보류 (Deferred)

NEO 시리즈는 EN 세트와 1:1 대응이 없어 교차 검증을 보류함.

> **사유:** JP NEO 시리즈(neo1~4)는 EN에서 Neo Genesis, Neo Discovery, Neo Revelation, Neo Destiny로 분할·재편되었으며, 카드 번호 체계가 재배열되어 단순 ID 매핑 불가. 별도 대응 테이블 작성 후 진행 예정.

## H) 버전 가용성 (CardLocale 언어 분포)

각 LogicalCard의 CardLocale 언어 조합. NEO는 한국 미발매이므로 ja only 예상.

| 세트 | 총계 | ja |
| --- | --- | --- |
| neo1 | 96 | 96 |
| neo2 | 57 | 57 |
| neo3 | 57 | 57 |
| neo4 | 113 | 113 |

> 모든 NEO 카드가 ja 단일 언어 — 정상.

## 권장 액션 (Recommended Actions)

| 우선순위 | 액션 |
| --- | --- |
| **P1** | 이미지 미확보 5건 — Supabase Storage 재업로드 필요 |
| **P1** | 누락 카드 5건 tcgdex에 존재 → 이미지 소스 별도 확보 후 재시도 |
| **P2** | ID 갭 존재 세트: neo4(1갭) — 카드 누락 또는 cardCount 불일치 확인 |
| **P3** | nameKo 미입력 (NEO 한국 미발매) — 필요 시 비공식 한국어명 별도 관리 |
| **P3** | EN 교차 검증 보류 — JP↔EN 카드 대응 테이블 작성 후 별도 스크립트 실행 |

---
*자동 생성: scripts/phase-a-verify-neo.ts*