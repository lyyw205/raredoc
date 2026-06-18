# Phase A Verification: PMCG1~6

생성 일시: 2026-05-29 05:17:21 UTC

대상: PMCG1~6 (일본판 구판, 1996~1999). 총 457장.

## A) 이미지 라이브니스 (Image Liveness)

Supabase Storage에 업로드된 카드 이미지 HTTP 상태 점검 (HEAD).

| 세트 | JP 이름 | 총 카드 | HTTP 200 | 실패 | 성공률 |
| --- | --- | --- | --- | --- | --- |
| PMCG1 | 拡張パック | 102 | 102 | 0 | 100.0% |
| PMCG2 | ポケモンジャングル | 48 | 48 | 0 | 100.0% |
| PMCG3 | 化石の秘密 | 48 | 48 | 0 | 100.0% |
| PMCG4 | ロケット団 | 65 | 65 | 0 | 100.0% |
| PMCG5 | リーダーズスタジアム | 96 | 84 | 12 | 87.5% |
| PMCG6 | 闇からの挑戦 | 98 | 92 | 6 | 93.9% |

**전체:** 439/457 이미지 정상 (96.1%)

### 실패 목록 (18건)
| ID | 이름 | URL | HTTP 상태 |
| --- | --- | --- | --- |
| jp-tcg-PMCG5-085 | 霧 |  | 0 |
| jp-tcg-PMCG5-086 | ミスティの願い |  | 0 |
| jp-tcg-PMCG5-087 | カオスジム |  | 0 |
| jp-tcg-PMCG5-088 | 秘密の使命 |  | 0 |
| jp-tcg-PMCG5-089 | ブロック |  | 0 |
| jp-tcg-PMCG5-090 | ブロックの保護 |  | 0 |
| jp-tcg-PMCG5-091 | レジスタンスジム |  | 0 |
| jp-tcg-PMCG5-092 | 中佐 |  | 0 |
| jp-tcg-PMCG5-093 | Surgeの秘密計画中 |  | 0 |
| jp-tcg-PMCG5-094 | 除去ジムはありません |  | 0 |
| jp-tcg-PMCG5-095 | ロケットのトレーニングジム |  | 0 |
| jp-tcg-PMCG5-096 | ロケットのtrap |  | 0 |
| jp-tcg-PMCG6-093 | ブレイン |  | 0 |
| jp-tcg-PMCG6-094 | コガ |  | 0 |
| jp-tcg-PMCG6-095 | ジョバンニ |  | 0 |
| jp-tcg-PMCG6-096 | ジョバンニの最後の手段 |  | 0 |
| jp-tcg-PMCG6-097 | ビリディアンシティジム |  | 0 |
| jp-tcg-PMCG6-098 | サブリナ |  | 0 |

## B) 필드 완성도 감사 (Field Completeness)

각 LogicalCard 필드의 채움률 (%). 
※ nameKo는 이번 Phase에서 신규 추가 예정이므로 0% 예상.

| 세트 | 총계 | hp | types | attacks | abilities | subtypes | illustrator | rarityId | pokedexNumbers | supertype | nameKo |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| PMCG1 | 102 | 67.6% | 67.6% | 67.6% | 5.9% | 67.6% | 0.0% | 100.0% | 67.6% | 100.0% | 0.0% |
| PMCG2 | 48 | 97.9% | 97.9% | 97.9% | 12.5% | 97.9% | 0.0% | 100.0% | 97.9% | 100.0% | 0.0% |
| PMCG3 | 48 | 89.6% | 89.6% | 85.4% | 18.8% | 89.6% | 0.0% | 100.0% | 89.6% | 100.0% | 0.0% |
| PMCG4 | 65 | 81.5% | 81.5% | 81.5% | 21.5% | 81.5% | 0.0% | 100.0% | 81.5% | 100.0% | 0.0% |
| PMCG5 | 96 | 68.8% | 68.8% | 68.8% | 11.5% | 68.8% | 0.0% | 100.0% | 68.8% | 100.0% | 0.0% |
| PMCG6 | 98 | 76.5% | 76.5% | 76.5% | 11.2% | 76.5% | 0.0% | 100.0% | 76.5% | 100.0% | 0.0% |

**주의:** 0% 필드: PMCG1.illustrator, PMCG2.illustrator, PMCG3.illustrator, PMCG4.illustrator, PMCG5.illustrator, PMCG6.illustrator

## C) 인덱스 연속성 (ID Contiguity)

각 세트의 카드 ID가 001부터 {cardCount}까지 연속되는지 점검.

| 세트 | cardCount | 실제 수 | 갭 수 | 중복 수 | 상태 |
| --- | --- | --- | --- | --- | --- |
| PMCG1 | 102 | 102 | 0 | 0 | ✓ |
| PMCG2 | 48 | 48 | 0 | 0 | ✓ |
| PMCG3 | 48 | 48 | 0 | 0 | ✓ |
| PMCG4 | 65 | 65 | 0 | 0 | ✓ |
| PMCG5 | 96 | 96 | 0 | 0 | ✓ |
| PMCG6 | 98 | 98 | 0 | 0 | ✓ |

## E) PMCG5/6 누락 18장 진단

Bulbapedia JP 섹션에 없어서 이미지 미확보된 카드 18장 — tcgdex API 직접 탐침.

| 세트 | 번호 | 예상 이름 | tcgdex 상태 | tcgdex 이름 | 레어도 | 타입 | DB 존재 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| PMCG5 | 085 | 霧 | 200 | 霧 | Rare | — | O |
| PMCG5 | 086 | ミスティの願い | 200 | ミスティの願い | Rare | — | O |
| PMCG5 | 087 | カオスジム | 200 | カオスジム | Rare | — | O |
| PMCG5 | 088 | 秘密の使命 | 200 | 秘密の使命 | Uncommon | — | O |
| PMCG5 | 089 | ブロック | 200 | ブロック | Rare | — | O |
| PMCG5 | 090 | ブロックの保護 | 200 | ブロックの保護 | Rare | — | O |
| PMCG5 | 091 | レジスタンスジム | 200 | レジスタンスジム | Rare | — | O |
| PMCG5 | 092 | 中佐 | 200 | 中佐 | Rare | — | O |
| PMCG5 | 093 | Surgeの秘密計画中 | 200 | Surgeの秘密計画中 | Rare | — | O |
| PMCG5 | 094 | 除去ジムはありません | 200 | 除去ジムはありません | Rare | — | O |
| PMCG5 | 095 | ロケットのトレーニングジム | 200 | ロケットのトレーニングジム | Rare | — | O |
| PMCG5 | 096 | ロケットのtrap | 200 | ロケットのtrap | Holo Rare | — | O |
| PMCG6 | 093 | ブレイン | 200 | ブレイン | Rare | — | O |
| PMCG6 | 094 | コガ | 200 | コガ | Rare | — | O |
| PMCG6 | 095 | ジョバンニ | 200 | ジョバンニ | Holo Rare | — | O |
| PMCG6 | 096 | ジョバンニの最後の手段 | 200 | ジョバンニの最後の手段 | Rare | — | O |
| PMCG6 | 097 | ビリディアンシティジム | 200 | ビリディアンシティジム | Rare | — | O |
| PMCG6 | 098 | サブリナ | 200 | サブリナ | Rare | — | O |

**요약:** tcgdex 200=18, 404=0, 기타=0
> tcgdex에 존재하는 카드(18건)는 이미지 소스 확보 후 재시도 가능.

## F) Supertype 분류

각 세트의 LogicalCard.supertype 값 분포.

| 세트 | 합계 | Energy | Pokemon | Trainer |
| --- | --- | --- | --- | --- |
| PMCG1 | 102 | 7 | 69 | 26 |
| PMCG2 | 48 | 0 | 47 | 1 |
| PMCG3 | 48 | 0 | 43 | 5 |
| PMCG4 | 65 | 3 | 53 | 9 |
| PMCG5 | 96 | 0 | 66 | 30 |
| PMCG6 | 98 | 0 | 75 | 23 |

> 모든 카드에 supertype 존재.

## G) EN Base Set 교차 검증 (PMCG1 only)

pokemontcg.io base1 세트 vs PMCG1 — HP·공격기 수 비교.

> PMCG2~6 교차 검증은 이번 실행에서 제외 (API 호출 과다). 추후 별도 진행 예정.

- pokemontcg.io base1 카드 수: 102
- PMCG1 Pokemon (dex 있음): 69
- 매칭 성공: 69
- 매칭 실패 (EN 후보 없음): 0
- 불일치 (HP or 공격기 차이): 0

> 불일치 없음 (매칭된 카드 모두 HP·공격기 수 일치).

## H) 버전 가용성 (CardLocale 언어 분포)

각 LogicalCard의 CardLocale 언어 조합. PMCG는 일본 원판이므로 대부분 "ja only" 예상.

| 세트 | 총계 | ja |
| --- | --- | --- |
| PMCG1 | 102 | 102 |
| PMCG2 | 48 | 48 |
| PMCG3 | 48 | 48 |
| PMCG4 | 65 | 65 |
| PMCG5 | 96 | 96 |
| PMCG6 | 98 | 98 |

> 모든 PMCG 카드가 ja 단일 언어 — 정상.

## 권장 액션 (Recommended Actions)

| 우선순위 | 액션 |
| --- | --- |
| **P1** | 이미지 미확보 18건 — Supabase Storage 재업로드 필요 |
| **P1** | PMCG5/6 누락 18건 tcgdex에 존재 → 이미지 소스 별도 확보 후 재시도 |
| **P3** | illustrator 채움률 낮음: PMCG1(0.0%), PMCG2(0.0%), PMCG3(0.0%), PMCG4(0.0%), PMCG5(0.0%), PMCG6(0.0%) — tcgdex 지원 여부 확인 |
| **P3** | nameKo 필드 전체 미입력 (0%) — 한국어 카드명 번역/입력 Phase 시작 |
| **P3** | PMCG2~6 EN 교차 검증 미실시 — 별도 스크립트 실행 필요 |

---
*자동 생성: scripts/phase-a-verify-pmcg.ts*