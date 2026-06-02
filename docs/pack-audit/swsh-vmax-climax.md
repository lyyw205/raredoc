# 팩 점검 · 출처 기록 — VMAXクライマックス (S8b) / VMAX 클라이맥스

> 점검 깊이: **감사 + 안전수정 + 이슈로그**. SWSH #15. 하이클래스팩(JP/KR).

- **setGroup**: `og-s8b` · era S (소드·실드) · 하이클래스팩 · 발매 2021-12-03

## 1. 세트 구성
| region | setId | loaded | cardCount | 비고 |
|---|---|---:|---:|---|
| JP | `jp-tcg-S8b` | 285 | 395 ⚠ | 시크릿 110 누락 [P2] |
| KR | `kr-s8b` | 270 | 270 ✓ | namu 270장 정본화 |

primarySetId: jp-tcg-S8b(285). KR이 JP LC 그룹화 → namu 동시 반영.

## 2. 안전수정 (완료)
- **namu 「VMAX 클라이맥스」 정본화**: kr-s8b 270장 ko명+레어도(공유 LC로 JP ko 0→270 동시). 미매핑 0. (#1 뿔충이=ビードル ✓)

## 3. 남은 이슈
- [P2] JP 시크릿 110장 누락(285/395) · KR 누락 15장.
- JP/KR ASCII 6장(영문명 카드, 확인 필요).
- [P15/P5] JP·KR 게임데이터 결손(pokedex·illustrator·flavor·attacks구조 0) · [P6] provenance 없음 · [P10] KR releaseDate epoch.

## 4. 출처
| 데이터 | 출처 | 상태 |
|---|---|---|
| **KR/JP 한글명·레어도** | **나무위키 「VMAX 클라이맥스」** | ✅ 2026-06-01 |
| JP/KR 게임데이터 | TCGdex 재임포트 | ⏳ 미수집 |
