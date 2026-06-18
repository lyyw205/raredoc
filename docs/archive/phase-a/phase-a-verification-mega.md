# Phase A Verification: MEGA Sets

생성 일시: 2026-05-31 (수동 작성)

대상: MEGA era (2024~, 신규 포맷) — 6 SetGroups, JP-only.

---

## 0) SetGroup 커버리지

| SetGroup | nameJa | nameKo | Sets (region:count) |
| --- | --- | --- | --- |
| mega-brave-symphonia | メガブレイブ+メガシンフォニア | 메가브레이브+메가심포니아 | JP:184 |
| mega-infernox | インフェルノX | 인페르노X | JP:116 |
| mega-dream-ex | MEGAドリームex | MEGA 드림 ex | JP:250 |
| mega-munikisuzero | ムニキスゼロ | 무니키스 제로 | JP:117 |
| mega-ninja-spinner | ニンジャスピナー | 닌자 스피너 | JP:120 |
| mega-abyss-eye | アビスアイ | 어비스 아이 | JP:118 |

**요약:** 6/6 SetGroup nameKo 채움, 0 EN/KR 카드 (JP-only 포맷).

---

## A) 이미지 liveness

| SetGroup | JP imageSmall 예시 | HTTP |
| --- | --- | --- |
| mega-brave-symphonia | https://tcgplayer-cdn.tcgplayer.com/product/647110_200w.jpg | 200 ✓ |

**결론:** 모든 MEGA 이미지가 tcgplayer-cdn URL, HTTP 200 확인. 905/905장 imageSmall 있음.

---

## B) 필드 완성도

| SetGroup | total_lc | supertype | nameKo | illustrator | en_img | jp_img |
| --- | --- | --- | --- | --- | --- | --- |
| mega-brave-symphonia | 184 | 184/184 (100%) | 152/184 (83%) | 184/184 (100%) | 0 | 184 |
| mega-infernox | 116 | 116/116 (100%) | 116/116 (100%) | 115/116 (99%) | 0 | 116 |
| mega-dream-ex | 250 | 250/250 (100%) | 0/250 (0%) | 0/250 (0%) | 0 | 250 |
| mega-munikisuzero | 117 | 117/117 (100%) | 117/117 (100%) | 114/117 (97%) | 0 | 117 |
| mega-ninja-spinner | 120 | 120/120 (100%) | 0/120 (0%) | 0/120 (0%) | 0 | 120 |
| mega-abyss-eye | 118 | 118/118 (100%) | 0/118 (0%) | 0/118 (0%) | 0 | 118 |

**supertype 분류법:**
- mega-brave-symphonia / mega-infernox / mega-munikisuzero: tcgdex JP API (enrich-mega-meta-tcgdex.ts)
- mega-dream-ex / mega-ninja-spinner / mega-abyss-eye: name-based heuristic (enrich-mega-supertype-heuristic.ts), 정확도 ~90%

---

## C) ID 연속성

| Set ID | cardCount(DB) | DB rows | min# | max# | 갭 |
| --- | --- | --- | --- | --- | --- |
| jp-mega-brave-symphonia | 0 (미등록) | 184 | 1 | 92 | 0 (M1L:46 + M1S:46 = 92 unique per sub-set) |
| jp-mega-infernox | 0 (미등록) | 116 | 1 | 116 | 0 |
| jp-mega-dream-ex | 486 (TCGPlayer 기준) | 250 | 1 | 250 | 0 |
| jp-mega-munikisuzero | 0 (미등록) | 117 | 1 | 117 | 0 |
| jp-mega-ninja-spinner | 120 | 120 | 1 | 120 | 0 |
| jp-mega-abyss-eye | 118 | 118 | 1 | 118 | 0 |

---

## F) Supertype 분포

| SetGroup | Pokémon | Trainer | Energy |
| --- | --- | --- | --- |
| mega-brave-symphonia | 154 (84%) | 30 (16%) | 0 |
| mega-infernox | 98 (84%) | 17 (15%) | 1 (1%) |
| mega-dream-ex | 222 (89%) | 24 (10%) | 4 (2%) |
| mega-munikisuzero | 91 (78%) | 23 (20%) | 3 (3%) |
| mega-ninja-spinner | 112 (93%) | 5 (4%) | 3 (3%) |
| mega-abyss-eye | 105 (89%) | 11 (9%) | 2 (2%) |

---

## H) 버전 가용성

| SetGroup | EN | JP | KR |
| --- | --- | --- | --- |
| 전체 6그룹 | 0 | 905 (100%) | 0 |

MEGA era 는 JP-only 포맷. EN/KR 발매 없음.

---

## 미해결 이슈 (followup-plans.md N+13 참조)

- mega-dream-ex / mega-ninja-spinner / mega-abyss-eye nameKo 0% — pokedexNumbers 없어 PokeAPI 매칭 불가. 카드명에서 포켓몬명 추출 후 한글명 매핑 스크립트 필요.
- mega-dream-ex / mega-ninja-spinner / mega-abyss-eye illustrator 0% — tcgdex 미수록, 대안 소스 필요.
- mega-dream-ex supertype 정확도 ~90% (name-based heuristic), "(Energy Symbol Pattern)" 카드 118장 수동 수정 완료.
- brave-symphonia cardCount=0 (미등록) — Set.cardCount 업데이트 필요.
