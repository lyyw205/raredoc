# 팩 점검 · 출처 기록 — フュージョンアーツ (S8) / 퓨전아츠 / Fusion Strike(EN)

> 점검 깊이: **감사 + 안전수정 + 이슈로그**. SWSH #18.

- **setGroup**: `og-s8` · era S (소드·실드) · 확장팩 · 발매 2021-09-24

## 1. 세트 구성
| region | setId | loaded | cardCount | 비고 |
|---|---|---:|---:|---|
| JP | `jp-tcg-S8` | 129 | 129 ✓ | namu 129장(직접 적용) |
| KR | `kr-s8` | 97 | 97 ✓ | 퓨전아츠(번호 1~110), JP LC 그룹화 → namu 반영 |
| EN | `en-tcg-swsh8` | 284 | 284 ✓ | Fusion Strike, 건강·별 LC |
| KR | `kr-sp5` | 4 | 4 | ⚠ **스페셜 카드 세트 「자시안 V-UNION」** — 본세트 LC 오그룹화 [P17] |

primarySetId: en-tcg-swsh8(284)·jp-tcg-S8(129).

## 2. 안전수정 (완료)
- **namu 「퓨전아츠」 정본화**: jp-tcg-S8에 직접 적용(kr-s8이 97장뿐이라 전체 1~129 커버). 129장 ko명+레어도, 공유 LC로 kr-s8 ko 0→97 동시. 미매핑 0·noMatch 0. (#1 캐터피=キャタピー ✓)

## 3. 남은 이슈
- ✅ **[P17 해결 2026-06-01] kr-sp5 「자시안 V-UNION」 언머지**: 4장을 자체 LC(`lc-orphan-kr-sp5-*`, og-s8→swsh-goods 이전)로 분리. 오표시 해소. 실데이터 재수집 대기[P9].
- KR 누락 kr-s8 13장 [5,6,7,33,39,40,51,101~106].
- [P15/P5] JP·KR 게임데이터 결손 · [P6] provenance 없음 · [P10] KR releaseDate epoch.
- EN Fusion Strike: 건강(hp 245·illustrator 281·flavor 197), 별 LC 무오염.

## 4. 출처
| 데이터 | 출처 | 상태 |
|---|---|---|
| **KR/JP 한글명·레어도** | **나무위키 「퓨전아츠」** | ✅ 2026-06-01 |
| EN 게임데이터·이미지 | pokemontcg.io | ✅ |
| JP/KR 게임데이터·서브제품 | TCGdex / pokemoncard.co.kr | ⏳ 미수집 |
