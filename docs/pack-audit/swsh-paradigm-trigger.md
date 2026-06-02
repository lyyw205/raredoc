# 팩 점검 · 출처 기록 — パラダイムトリガー (S12) / 패러다임트리거

> 점검 깊이: **감사 + 안전수정 + 이슈로그**. SWSH #4.

- **setGroup**: `og-s12` · era S (소드·실드) · 확장팩 · 발매 2022-10-21
- **점검일**: 2026-05-31
- **특이점**: 별도 제품 **스페셜 덱 세트가 본세트 LC에 오그룹화**([P17]+[P8]).

## 1. 세트 구성
| region | setId | loaded | cardCount | 비고 |
|---|---|---:|---:|---|
| JP | `jp-tcg-S12` | 125 | 125 ✓ | |
| KR | `kr-s12` | 120 | 120 ✓ | 패러다임트리거 본세트, namu 정본화 |
| KR | `kr-so` | 32 | 32 ✓ | ⚠ **스페셜 덱 「리자몽 VSTAR VS 레쿠쟈 VMAX」** — 본세트 LC 오그룹화 |

primarySetId: jp-tcg-S12(125) 단일. KR 두 세트 모두 jp-tcg-S12 LC 공유.

## 2. 안전수정 (완료)
- **namu 「패러다임트리거」 정본화**: kr-s12 120장 ko명+레어도. 공유 LC 통해 JP rarity 94→123·ko 0→120 동시. (미매핑 레어도 0, 누락 5장만 noMatch)

## 3. 남은 이슈
- ✅ **[P17 해결 2026-06-01] kr-so 스페셜 덱 언머지**: kr-so 32장을 자체 LC(`lc-orphan-kr-so-*`)로 분리(swsh-decks 그룹). 패러다임트리거 한글명 오표시 해소 → placeholder 정직 표시. 실데이터는 pokemoncard.co.kr 재수집 대기[P9].
- [P15/P5] JP·KR 게임데이터 결손(hp 0·attacks scalar·abilities 0·illustrator 0·flavor 0) → TCGdex 재임포트.
- [P3] KR(kr-s12) name = JP placeholder 잔존(표시는 CardText(ko) 오버레이로 정상).
- [P2] KR 누락 5장 [28,32,34,74,115]. JP는 125 완비.
- [P6] provenance 없음 · [P10] releaseDate epoch(1970).

## 4. 출처
| 데이터 | 출처 | 상태 |
|---|---|---|
| **KR/JP 한글명·레어도** | **나무위키 「패러다임트리거」** | ✅ 2026-05-31 |
| JP/KR 게임데이터(hp/attacks/abilities) | TCGdex 재임포트 | ⏳ 미수집 |
| kr-so 스페셜 덱 카드 | pokemoncard.co.kr (un-merge 후) | ⏳ 미수집 |
