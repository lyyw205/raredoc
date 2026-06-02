# 팩 점검 · 출처 기록 — ロストアビス (S11) / 로스트어비스 / Lost Origin(EN)

> 점검 깊이: **감사 + 안전수정 + 구조정리**. SWSH 구조정리로 **신설된 setGroup**. (2026-06-01)

- **setGroup**: `og-s11` (신설) · era S (소드·실드) · 발매 2022-07-15(JP Lost Abyss 기준)
- **배경**: 본래 s11 세대(로스트어비스/로스트오리진) setGroup이 없어 KR 로스트어비스(kr-s11)가 og-s11a(백열의 아르카나)에 오편입돼 있었음 → 구조정리 S1/S2로 신설·이전.

## 1. 세트 구성 (정리 후)
| region | setId | loaded | cardCount | 비고 |
|---|---|---:|---:|---|
| EN | `en-tcg-swsh11` | 217 | 217 ✓ | Lost Origin (og-s10a→og-s11 이전), 건강·별 LC |
| KR | `kr-s11` | 123 | 123 ✓ | 로스트어비스 (og-s11a→og-s11 이전 + **언머지** + namu 정본화) |

**JP Lost Abyss(jp-tcg-S11)는 DB 미수집** — 향후 TCGdex 임포트 대상.

## 2. 구조정리 + 안전수정 (완료 2026-06-01)
- **og-s11 신설**: nameJa ロストアビス / nameEn Lost Origin / nameKo 로스트어비스 / releaseDate 2022-07-15.
- **Set 이전**: en-tcg-swsh11(og-s10a→og-s11), kr-s11(og-s11a→og-s11). (덤: en-tcg-swsh12(Silver Tempest) og-s11a→og-s12 — S3.)
- 🔧 **kr-s11 언머지 [P17]**: 123장이 jp-tcg-S11a(91)+en-tcg-swsh12(32) LC에 흩어져 그룹화돼 백열/실버템페스트 한글명으로 오표시 → 자체 orphan LC(`lc-orphan-kr-s11-*`)로 분리.
- **namu 「로스트어비스」 정본화**: kr-s11 123장 ko명(rarity 103). #1 콘팡 ✓. 오염 해소.

## 3. 남은 이슈
- [P15/P5] JP Lost Abyss 미수집 · kr-s11 게임데이터 결손(hp/attacks/abilities 0, 언머지로 blank) → TCGdex 임포트.
- KR namu noMatch 4(번호 공백) · rarity 20장 미매핑(namu 공백).
- [P3] kr-s11 CardLocale.name ASCII placeholder 잔존(표시는 CardText(ko) 오버레이로 정상).
- EN Lost Origin: 건강(hp/attacks/rarity/illustrator 완비), 별 LC 무오염.

## 4. 출처
| 데이터 | 출처 | 상태 |
|---|---|---|
| **KR 한글명·레어도** | **나무위키 「로스트어비스」** | ✅ 2026-06-01 |
| EN Lost Origin | pokemontcg.io | ✅ |
| JP Lost Abyss·게임데이터 | TCGdex 임포트 | ⏳ 미수집 |
