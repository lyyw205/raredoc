# 팩 점검 · 출처 기록 — シャイニースターV (S4a) / 샤이니 스타 V / Shining Fates(EN)

> 점검 깊이: **감사 + 안전수정 + 이슈로그**. SWSH #28. 하이클래스(샤이니 다수). ⚠ kr-sc 오편입.

- **setGroup**: `og-s4a` · era S (소드·실드) · 하이클래스팩 · 발매 2020-11-20

## 1. 세트 구성
| region | setId | loaded | cardCount | 비고 |
|---|---|---:|---:|---|
| JP | `jp-tcg-S4a` | 330 | 454 ⚠ | 시크릿 124 누락 [P2] |
| EN | `en-tcg-swsh45` | 73 | 73 ✓ | Shining Fates, 건강·별 LC |
| KR | `kr-sc` | 25 | 25 | ❌ **「BW 샤이니 컬렉션」(타 era 제품)이 오편입** + S4a #1~25 LC 공유 |

## 2. 안전수정 (완료)
- **namu 「샤이니스타 V」 정본화**: jp-tcg-S4a 330장 ko명(전수, noMatch 0). 정렬 검증 #1 나몰빼미=モクロー·#100 케오퍼스=オトスパス ✓.
- 🔧 **RMAP 확장**: `A→Amazing Rare`, `S→Shiny Rare`, `SSR→Shiny Secret Rare` (기존 TCGdex 분포와 일치 확인 → SV [P14] 보류 해소).

## 3. 남은 이슈
- ✅ **[P17/구조 해결 2026-06-01] kr-sc = BW 「샤이니 컬렉션」**: `og-bw-shiny`(BW era, シャイニーコレクション/Shiny Collection) 신설 후 이전 + 25장 언머지(자체 LC). og-s4a 교차오염 해소. → **og-s4a = 샤이니스타V(JP) + Shining Fates(EN)만 남은 클린 그룹.** (BW Shiny Collection 데이터는 향후 BW era 점검 대상.)
- **rarity 163장 None 잔존**: namu 샤이니 서브컬렉션 행의 레어도 셀 공백 → 미채움(기존에도 None, 악화 아님). [P11] 일괄 보강 대상.
- [P2] JP 시크릿 124장 누락(330/454).
- [P15/P5] JP pokedex·illustrator·flavor·attacks구조 0 · [P6] provenance 없음.

## 4. 출처
| 데이터 | 출처 | 상태 |
|---|---|---|
| **JP 한글명·레어도** | **나무위키 「샤이니스타 V」** | ✅ 2026-06-01 |
| EN Shining Fates | pokemontcg.io + tcgdex | ✅ |
| JP 게임데이터·rarity 잔여 | TCGdex 재임포트 | ⏳ 미수집 |
