# 팩 점검 · 출처 기록 — ソード (S1W) / 소드 / Sword & Shield Base(EN)

> 점검 깊이: **감사 + 안전수정 + 이슈로그**. SWSH #37. SWSH 출범 세트(소드).

- **setGroup**: `og-s1w` · era S (소드·실드) · 확장팩 · 발매 2019-12-06

| region | setId | loaded | cardCount | 비고 |
|---|---|---:|---:|---|
| JP | `jp-tcg-S1W` | 75 | 75 ✓ | namu 75장(직접 적용) |
| KR | `kr-s1w` | 68 | 68 ✓ | JP LC 그룹화 → namu 반영 |
| EN | `en-tcg-swsh1` | 216 | 216 ✓ | Sword & Shield Base, 건강·별 LC |
| KR | `kr-sd` | 31 | 31 | ⚠ **「확장팩 세트 V」**(서브제품) 본세트 LC 오그룹화 [P17] |

`og-s1w` 그룹의 다른 KR 서브세트(스타터덱 등)는 swsh-decks/goods 그룹으로 이미 분리됨.

## 안전수정
- **namu 「소드(포켓몬 카드 게임)」**: jp-tcg-S1W 75장 ko명+레어도(공유 LC로 kr-s1w ko 0→68). 미매핑 0·noMatch 0. (#1 로젤리아=ロゼリア ✓)

## 남은 이슈
- ✅ **[P17 해결 2026-06-01] kr-sd 「확장팩 세트 V」 언머지**: 31장을 자체 LC(`lc-orphan-kr-sd-*`, og-s1w→swsh-goods 이전)로 분리. 오표시 해소. 실데이터 재수집 대기[P9].
- [P15/P5] JP·KR 게임데이터 결손 · [P6] provenance 없음 · [P10] KR releaseDate epoch.
- EN S&S Base: 건강, 별 LC 무오염.

## 출처
| 데이터 | 출처 | 상태 |
|---|---|---|
| **KR/JP 한글명·레어도** | **나무위키 「소드(포켓몬 카드 게임)」** | ✅ 2026-06-01 |
| EN S&S Base | pokemontcg.io | ✅ |
| JP/KR 게임데이터·서브제품 | TCGdex / pokemoncard.co.kr | ⏳ 미수집 |
