# 팩 점검 · 출처 기록 — アビスアイ (Abyss Eye)

> 이 문서는 카드팩 단위 메타데이터 점검 결과 + **데이터 수집 출처(provenance)** 기록이다.
> 나중에 재수집/검증할 때 리서치 없이 이 문서의 "출처"를 그대로 사용한다.
> 형식은 이후 모든 팩 점검에 동일 적용.

- **setGroup**: `mega-abyss-eye`
- **era**: MEGA (Mega Evolution)
- **발매일(JP)**: 2026-05-21 (점검일 2026-05-31 기준 신팩)
- **지역 구성**: **JP only** (EN·KR 미발매/미수집 — 신팩이라 정상으로 추정, *사용자 확인 필요*)
- **점검일**: 2026-05-31

---

## 1. 지역별 세트 구성 + primarySetId

| region | setId | code | 카드수 | 로고 |
|---|---|---|---:|---|
| JP | `jp-mega-abyss-eye` | (null) | 118 | ✓ |
| EN | — | — | — | 미발매 |
| KR | — | — | — | 미발매 |

- **primarySetId**: 118/118 = `jp-mega-abyss-eye` ✓ (JP만 있으므로 정상)
- ⚠️ JP `Set.code` = null → JP 공식 팩 코드(M-series, 예: M4 등) 미기록. 재수집 시 채울 것.

## 2~6. 카드 단위 점검 결과 (118장)

| 점검 항목 | 상태 | 비고 |
|---|---|---|
| 카드번호(`numberInt`) | ✅ 118/118 | |
| 이미지(`imageSmall/Large`) | ✅ 118/118 | R2 호스팅됨 |
| supertype | ✅ 118/118 | |
| rarity | ✅ 118/118 | |
| hp | ⚠️ 94/118 | 나머지 24 = 트레이너/에너지(정상) |
| **attacks** | ❌ **구조 불량** | 94장 배열·24장 scalar. `name`에 코스트+기술명+효과+`<br>`가 전부 뭉침. text/cost/damage 분리 안 됨 |
| **abilities** | ❌ 전부 null | |
| **pokedexNumbers** | ✅ 94/94 | **PokeAPI 완료(2026-05-31)** — 포켓몬 94장 전국도감번호 |
| **illustrator** | ❌ 0/118 | 일러스트레이터 전무 → ②Bulbapedia 예정 |
| flavorText | ⚠️ 73/118 | 있는 것도 **전부 영어** |
| **CardText(ko)** | ✅ 94/94 | **PokeAPI ko 종족명 완료** (포켓몬 한글명, source=pokeapi). 트레이너/에너지 24장은 미대상 |
| CardText(ja) | ❌ 0/118 | |
| **지역판별(region/language)** | ❌ **오류** | `JP/ja`로 태깅됐으나 **내용 100% 영어**(카드명 118/118 ASCII, 일본어 0). 실제론 TCGPlayer EN 데이터 |

### 핵심 문제
**이 "JP" 세트는 사실상 영문(TCGPlayer) 데이터가 일본판으로 잘못 적재된 것.** 진짜 일본어 데이터(일본 카드명·기술 텍스트)는 미수집 상태.

---

## 데이터 수집 출처 (provenance) — 재수집 기준

### 출처 리서치 결과 (2026-05-31, 직접 확인)
| 사이트 | アビスアイ 보유 | 제공 데이터 | 비고 |
|---|---|---|---|
| **Bulbapedia** (카드 개별 페이지) | ✅ | **일본어명·EN명·일러스트레이터·기술(구조 정상)·HP·약점/저항/후퇴** | `Tropius_(Abyss_Eye_1)` 확인. flavor는 없음(미발매). **JP 정본으로 채택** |
| Serebii (`/card/abysseye/`) | ✅ | 이름·번호·레어도·HP·약점/저항/후퇴 | 세트 목록 OK, 카드 상세 URL 패턴 별도 확인 필요(`/1.shtml` 404) |
| Pokellector (`/Abyss-Eye-Expansion`) | ✅ | 이름·번호·**이미지** | 로고/이미지 출처 |
| TCGdex JP | ❌ | M1L·M1S·M2·M3까지만 (M4 미색인) | 색인되면 보강 후보 |
| PokeAPI | ✅(종족) | **pokedexNumbers·ko 종족명** | 영문명→매핑 |
| 공식 pokemon-card.com | ✅(발매사) | 전부(JP) | JS 폼 기반, 스크랩 난이도↑. 최후 보루 |

| 데이터 | 현재 출처(실제) | 상태 | **확정 재수집 출처** |
|---|---|---|---|
| JP 카탈로그·게임데이터(이름/기술/일러스트/HP) | TCGPlayer (EN) — 잘못 라벨 | ❌→수집가능 | **Bulbapedia** (카드 개별 페이지) |
| JP 카드 이미지 | Cloudflare R2 업로드본 | ✅ | Pokellector |
| 세트 로고 | `den-media.pokellector.com/.../Abyss-Eye.logo.433.png` | ✅ | Pokellector |
| illustrator | 없음 | ❌→수집가능 | **Bulbapedia** |
| pokedexNumbers | 없음 | ❌→수집가능 | **PokeAPI** (영문명 매핑) |
| flavorText(JP) | 영문만 73/118 | ⚠️ pending | 공식/발매 후 (Bulbapedia 미보유) |
| EN 카탈로그 | (미발매) | — | pokemontcg.io / TCGdex EN (발매 후) |
| KR 카탈로그 | (미발매) | — | pokemoncard.co.kr 공식 (발매 후) |
| CardText(ko) | 없음 | ❌→부분수집 | PokeAPI(ko 종족명) 지금 / 공식 KR 발매 후 |

### ExternalIdMapping (DB 기록 출처)
- **현재 0건** — 이 팩 카드에 출처 매핑이 DB에 전혀 기록돼 있지 않음. 재수집 시 `ExternalSource`+`ExternalIdMapping`에 카드별 출처 ID를 적재할 것.

---

---

## 최종 충전 상태 (2026-05-31 작업 완료)

| 항목 | base 1–81 | secret 82–118(37) | 전체 | 출처 |
|---|---|---|---|---|
| pokedexNumbers | — | — | 포켓몬 94/94 | PokeAPI |
| CardText(ko)·nameKo | — | — | 포켓몬 94/94 | PokeAPI ko 종족명 |
| 일본어 카드명 | 81/81 | 33/37 | **114/118** | Bulbapedia / secret은 base 복사 |
| 일러스트레이터 | 79/81 | 0/37(의도적) | 79/118 | Bulbapedia |
| 구조화 attacks | 69/81 | 25/37 | **94/118** | Bulbapedia / secret은 base 복사 |
| abilities | 12/81 | 7/37 | 19/118 | Bulbapedia / base 복사 |

### 확정 불가(현재) 공백 — 재수집 트리거용
1. **시크릿레어 37장 일러스트레이터** — 알트아트 작가, Bulbapedia 미수록 → SR 페이지 생기면/공식에서 보강.
2. **#80·#81 특수에너지 일러스트** — Bulbapedia "Illus. Unknown".
3. **#102 Iron Defender·#103 Energy Switch·#104 Crushing Hammer·#107 Brave Bangle** — base(1–81)에 없는 트레이너 SR(타 세트 재판 추정). JP명/attacks 미수집.
4. **JP flavorText** — 미발매로 어디에도 없음.
5. **#71·72·73·78·79** — 과거 import 오류로 supertype=Pokémon 오분류(실제 트레이너). 별도 정정 필요.

### 추가된 영구 스크립트
- `scripts/fill-pack-pokeapi.ts <setId>` — PokeAPI 도감번호+ko명 (범용)
- `scripts/sync-pack-bulbapedia-jp.ts <setId> --bulbaSet="..."` — Bulbapedia JP명/일러스트/attacks/abilities (범용)
- `scripts/fix-abyss-eye-misses.ts` — base 미스 재시도(리다이렉트/트레이너 인포박스 대응)
- `scripts/fill-abyss-secret-from-base.ts` — 시크릿레어 base 복사

## Action items (재수집 시)
1. JP 진짜 데이터로 교체: 공식 pokemon-card.com 또는 TCGdex JP(색인 후)에서 일본어 카드명·기술(cost/text/damage 분리)·abilities·pokedexNumbers 수집.
2. illustrator 수집 (Bulbapedia/TCGdex).
3. JP `Set.code`(M-series 코드) 기록.
4. region/language 정합성: JP 세트엔 일본어 데이터가 들어가도록.
5. CardText(ko) 백필 (KR 발매 후 공식, 그 전엔 PokeAPI ko 종족명으로 카드명만이라도).
6. EN/KR 발매 시 별도 세트 추가 + 그룹화.
