# 팩 점검 · 출처 기록 — タイムゲイザー (S10D) / 타임게이저

> 점검 깊이: **감사 + 안전수정 + 이슈로그**. SWSH #10. (짝꿍: 스페이스저글러 og-s10p)

- **setGroup**: `og-s10d` · era S (소드·실드) · 확장팩 · 발매 2022-04-08

## 1. 세트 구성
| region | setId | loaded | cardCount | 비고 |
|---|---|---:|---:|---|
| JP | `jp-tcg-S10D` | 88 | 88 ✓ | namu 88장(직접 적용) |
| KR | `kr-s10` | 86 | 86 ✓ | 타임게이저(번호 3~88), JP LC 그룹화 → namu 반영 |
| KR | `kr-sj` | 32 | 32 ✓ | ⚠ **스페셜 덱 「자시안·자마젠타 VS 무한다이노」** — 본세트 #1~32 LC 오그룹화 |
| EN | `en-tcg-swsh10` | 216 | 216 ✓ | **Astral Radiance**(별 LC, 건강·무오염) |

primarySetId: en-tcg-swsh10(216)·jp-tcg-S10D(88). KR 두 세트 모두 jp-tcg-S10D LC 공유.

## 2. 안전수정 (완료)
- **namu 「타임게이저」 정본화**: jp-tcg-S10D에 직접 적용(kr-s10이 #1,2 결번이라 전체 1~88 커버 위해 JP 기준). 88장 ko명+레어도, 공유 LC로 kr-s10 ko 0→86 동시. 미매핑 0·noMatch 0. (#3 리피아=リーフィア ✓)

## 3. 남은 이슈
- ✅ **[P17 해결 2026-06-01] kr-sj 언머지**: 32장을 자체 LC(`lc-orphan-kr-sj-*`, swsh-decks)로 분리. 타임게이저 한글명 오표시 해소. 실데이터 재수집 대기[P9].
- [P15/P5] JP·KR 게임데이터 부분결손(attacks 미구조화·illustrator·flavor 0) · [P6] provenance 없음 · [P10] KR releaseDate epoch.
- EN Astral Radiance: 건강(hp 167·rarity 216·illustrator 215), 별 LC라 무오염.

## 4. 출처
| 데이터 | 출처 | 상태 |
|---|---|---|
| **KR/JP 한글명·레어도** | **나무위키 「타임게이저」** | ✅ 2026-06-01 |
| EN 게임데이터·이미지 | pokemontcg.io | ✅ |
| JP/KR 게임데이터 | TCGdex 재임포트 | ⏳ 미수집 |
