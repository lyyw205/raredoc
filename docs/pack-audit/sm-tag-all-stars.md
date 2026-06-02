# 팩 점검 · 출처 기록 — TAG TEAM GX タッグオールスターズ (SM12a) / 태그올스타즈

> 점검 깊이: **감사 + 안전수정 + 이슈로그**.

- **setGroup**: `og-sm12a` · era SM (하이클래스팩, TAG TEAM GX 컴필레이션)
- **점검일**: 2026-06-01
- **특이점**: 대형 컴필레이션(JP 공식 351종). JP 235장만 적재(불완전). EN 단독 세트 없음(JP/KR만).

## 1. 지역별 세트 구성
| region | setId | loaded | cardCount | 비고 |
|---|---|---:|---:|---|
| JP | `jp-tcg-SM12a` | 235 | 351 | **불완전(235/351)**. 이미지 r2 119 + tcgplayer-cdn 116 혼재, ASCII名 25·numberInt 결측 9 |
| KR | `kr-sm12a` | 210 | 210 ✓ | **namu 정본화 완료**(ko 210/210) |

## 2. 안전수정 (2026-06-01)
- KR 한글명: kr-sm12a 210장 (namu「태그올스타즈」226행, 16-noMatch=secret 211~226) → CardText(ko)+nameKo.
- 스폿체크: #1 페로코체&매시붕(RR) / #105 나옹 / #210 기본 에너지(SR) ✓

## 3. 남은 공백 — 재수집/검증 대기
1. **KR rarity ~31/210** — namu 컴필레이션 표 레어도 셀 레이아웃 상이로 추출 저조(헤더기반 파서 적용 후). 보강 필요.
2. **JP 불완전 235/351** [P2] — TCGdex 재임포트(시크릿/알트 116장 결손).
3. **JP ASCII名 25·numberInt 결측 9·tcgplayer-cdn 이미지 116** — JP 세트에 EN출처 카드 혼입 의심. 검증 필요.
4. **게임데이터**: attacks 미구조화(빈약 127/scalar 83)·abilities 0·pokedexNumbers 0·illustrator 0·flavor 0 [P5]. TCGdex 최소 메타.
5. CardText(ja) 0 · provenance 0 [P6].

## 4. 출처
| 데이터 | 출처 | 상태 |
|---|---|---|
| JP/KR 기본 메타(번호/이미지/hp/rarity) | TCGdex | ⚠ JP 불완전·게임데이터 결손 |
| **KR 한글명** | **나무위키 「태그올스타즈」** | ✅ 2026-06-01 (rarity 53/210) |
