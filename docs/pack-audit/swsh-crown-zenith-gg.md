# 팩 점검 · 출처 기록 — Crown Zenith Galarian Gallery (swsh12.5GG) / 크라운 제니스 갈라리안 갤러리

> 점검 깊이: **감사 + 이슈로그**. **EN 전용 특수 서브셋** (한국·일본 미발매).

- **setGroup**: `og-swsh12pt5gg` · era S (소드·실드) · 발매 2023-01-20
- **점검일**: 2026-05-31 (SWSH 시리즈 점검 시작 팩)
- **특이점**: Crown Zenith는 서양 전용 컴필레이션. **JP/KR은 「VSTAR 유니버스」(s12a / kr-s12a)로 대응** — Crown Zenith라는 독립 제품 없음 → **나무위키 정본 채움 비적용**. Galarian Gallery는 GG01~GG70 아트레어 서브셋.

## 1. 세트 구성
| region | setId | loaded | cardCount | 비고 |
|---|---|---:|---:|---|
| EN | `en-tcg-swsh12pt5gg` | 70 | 70 ✓ | 단독 |

primarySetId: en-tcg-swsh12pt5gg(70) 일원화. 지역 EN만.

## 2. 점검 결과 — **건강(safe fix 불필요)**
- 카드수 70/70 ✓, 번호 GG01~GG70 전부 정상(`numberInt` null은 GG 접두어라 정상).
- hp 60/60(포켓몬) · rarity 70/70 · illustrator 70/70 · 이미지 70/70(R2) · attacks 구조화 59 · abilities 36 ✓
- 레어도 6종 정상 분류: Trainer Gallery Rare Holo(34, holo_rare) · Rare Holo VSTAR(10, double_rare) · Rare Ultra(10, ultra_rare) · Rare Holo V(9, double_rare) · Rare Secret(4, hyper_rare) · Rare Holo VMAX(3, double_rare).
- supertype 오분류 0 ✓
- **flavorText 34/70 = 결손 아님**: GG01~34(일반 포켓몬)만 도감텍스트 보유, GG35~70(V/VMAX/VSTAR/트레이너)은 원래 flavor 없음.
- provenance: pokemontcg_io/catalog(70) ✓
- ko CardText 60: 포켓몬 종족명 수준 보유(PokeAPI 그룹화 유래).

## 3. 남은 공백 (cross-cutting · 추후 패스)
- **트레이너 10장(GG57~66) ko명 없음** + 포켓몬 ko명이 종족명 수준(V/VMAX/VSTAR 접미어 누락). → **VSTAR 유니버스(kr-s12a) 동일 카드로 그룹화 시 통합** 가능(그룹화 패스 대상, namu 비적용).
- [P5] ja CardText 0 · [P6] —.

## 4. 출처
| 데이터 | 출처 | 상태 |
|---|---|---|
| EN 게임데이터·레어도·이미지 | pokemontcg.io | ✅ |
| ko명(종족) | PokeAPI 그룹화 | ✅(부분) |
| KR/JP 정본 | **해당 없음(미발매)** — 대응 제품은 VSTAR 유니버스 | — |
