# 팩 점검 · 출처 기록 — Pokémon GO (S10b) / 포켓몬 GO

> 점검 깊이: **감사 + 안전수정 + 이슈로그**. SWSH #8. 구조 클린.

- **setGroup**: `og-s10b` · era S (소드·실드) · 강화확장팩 · 발매 2022-06-17

## 1. 세트 구성
| region | setId | loaded | cardCount | 비고 |
|---|---|---:|---:|---|
| JP | `jp-tcg-S10b` | 93 | 96 ⚠ | 시크릿 3 누락 [P2] |
| KR | `kr-s10b` | 100 | 100 ✓ | namu 92장 정본화 |
| EN | `en-tcg-pgo` | 88 | 88 ✓ | 건강 |

primarySetId: jp-tcg-S10b(93)·en-tcg-pgo(88)·kr-s10b(8). 정상 그룹화.

## 2. 안전수정 (완료)
- **namu 「Pokémon GO(포켓몬 카드 게임)」 정본화**: kr-s10b 92장 ko명+레어도(공유 LC로 JP ko 0→92 동시). 미매핑 레어도 0.

## 3. 남은 공백
- [P2] JP 시크릿 3장 누락(93/96) · KR 누락 #33 + 시크릿 94~101 namu 미수록(8장).
- [P15/P5] JP·KR 게임데이터 부분 결손(attacks 미구조화·illustrator·flavor 0) · [P6] provenance JP/KR 없음 · [P10] KR releaseDate epoch.
- EN(pgo): hp 74·illustrator 88·flavor 56 양호, ja 0.

## 4. 출처
| 데이터 | 출처 | 상태 |
|---|---|---|
| **KR/JP 한글명·레어도** | **나무위키 「Pokémon GO(포켓몬 카드 게임)」** | ✅ 2026-06-01 |
| EN 게임데이터·이미지 | pokemontcg.io | ✅ |
| JP/KR 게임데이터 | TCGdex 재임포트 | ⏳ 미수집 |
