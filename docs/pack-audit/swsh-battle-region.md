# 팩 점검 · 출처 기록 — バトルリージョン (S9a) / 배틀리전

> 점검 깊이: **감사 + 안전수정 + 이슈로그**. SWSH #13. 구조 클린(JP/KR).

- **setGroup**: `og-s9a` · era S (소드·실드) · 강화확장팩 · 발매 2022-02-25

## 1. 세트 구성
| region | setId | loaded | cardCount | 비고 |
|---|---|---:|---:|---|
| JP | `jp-tcg-S9a` | 93 | 93 ✓ | |
| KR | `kr-s9a` | 87 | 87 ✓ | namu 87장 정본화 |

primarySetId: jp-tcg-S9a(93). KR이 JP LC 그룹화 → namu 동시 반영.

## 2. 안전수정 (완료)
- **namu 「배틀리전」 정본화**: kr-s9a 87장 ko명+레어도(공유 LC로 JP rarity 61→89·ko 0→87 동시). 미매핑 0. namu 2단 중복행이나 동일값(검증, #1 뚜벅쵸=ナゾノクサ ✓).

## 3. 남은 이슈
- KR 누락 6장 [17,54,75,79,83,84].
- [P15/P5] JP·KR 게임데이터 전무(hp 0·attacks scalar·abilities 0·illustrator·flavor 0) → TCGdex 재임포트. supertype 오분류는 hp null 부작용(실제 오분류 아님).
- [P6] provenance 없음 · [P10] KR releaseDate epoch.

## 4. 출처
| 데이터 | 출처 | 상태 |
|---|---|---|
| **KR/JP 한글명·레어도** | **나무위키 「배틀리전」** | ✅ 2026-06-01 |
| JP/KR 게임데이터 | TCGdex 재임포트 | ⏳ 미수집 |
