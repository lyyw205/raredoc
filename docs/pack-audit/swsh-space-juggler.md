# 팩 점검 · 출처 기록 — スペースジャグラー (S10P) / 스페이스저글러

> 점검 깊이: **감사 + 안전수정 + 이슈로그**. SWSH #11. (짝꿍: 타임게이저 og-s10d)

- **setGroup**: `og-s10p` · era S (소드·실드) · 확장팩 · 발매 2022-04-08

## 1. 세트 구성
| region | setId | loaded | cardCount | 비고 |
|---|---|---:|---:|---|
| JP | `jp-tcg-S10P` | 88 | 88 ✓ | namu 88장(직접 적용) |

**KR 스페이스저글러 세트 DB 미수집**(EN은 짝꿍과 합쳐 Astral Radiance=og-s10d로 수록). JP 단독 그룹.

## 2. 안전수정 (완료)
- **namu 「스페이스 저글러」(공백 포함 제목) 정본화**: jp-tcg-S10P 88장 ko명+레어도. 미매핑 0·noMatch 0. (#1 독침붕 V=スピアーV ✓)

## 3. 남은 이슈
- **supertype 오분류 #59 (Trainer/hp100)** — 실제 데이터 오류(트레이너인데 hp 보유, TCGdex 소스 분류 오류 추정). #64/#77/#83은 hp null 포켓몬(게임데이터 결손 부작용).
- [P9/구조] KR 스페이스저글러 세트 미수집 → pokemoncard.co.kr 수집 + 그룹화 필요.
- [P15/P5] JP 게임데이터 부분결손(attacks 미구조화·illustrator·flavor 0·pokedex 0) · [P6] provenance 없음.

## 4. 출처
| 데이터 | 출처 | 상태 |
|---|---|---|
| **JP 한글명·레어도** | **나무위키 「스페이스 저글러」** | ✅ 2026-06-01 |
| JP 게임데이터 | TCGdex 재임포트 | ⏳ 미수집 |
| KR 세트 | pokemoncard.co.kr | ⏳ 미수집 |
