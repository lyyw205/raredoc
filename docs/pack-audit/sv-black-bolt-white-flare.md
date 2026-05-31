# 팩 점검 · 출처 기록 — ブラックボルト + ホワイトフレア (SV11B + SV11W)

> 형식: [mega-abyss-eye.md](./mega-abyss-eye.md) 참고.

- **setGroup**: `sv-black-bolt-white-flare` · era SV (스칼렛&바이올렛 시리즈 마지막 확장팩)
- **이름**: JP「ブラックボルト」(SV11B) +「ホワイトフレア」(SV11W) / EN「Black Bolt」+「White Flare」/ KR「블랙볼트」+「화이트플레어」
- **점검일**: 2026-05-31
- **특이점**: JP는 두 팩 합본(`jp-sv-black-bolt-white-flare`, SV11B-001~174 + SV11W-001~174, 총 348장). EN/KR은 각 별도 세트. 포켓몬 카드 게임 SV 시리즈 최종 확장팩.

---

## 1. 지역별 세트 구성 (정리 후)

| region | setId | 카드수 | cardCount | 비고 |
|---|---|---:|---:|---|
| JP | `jp-sv-black-bolt-white-flare` | 348 | 348 ✓ | SV11B(1–174)+SV11W(1–174) 합본 |
| EN | `zsv10pt5` | 172 | 172 ✓ | Black Bolt, JP 그룹화 ✓ |
| EN | `rsv10pt5` | 173 | 173 ✓ | White Flare, JP 그룹화 ✓ |
| KR | `kr-sv11b` | 166 | 166 ✓ | 블랙볼트 본판, JP 그룹화 ✓ |
| KR | `kr-sv11w` | 171 | 171 ✓ | 화이트플레어 본판, JP 그룹화 ✓ |

### 삭제된 중복 세트 (2026-05-31)
| setId | 사유 |
|---|---|
| `jp-tcg-SV11B` | 합본에 의해 대체된 이전 import. 게임데이터 0, setGroupId=null. CardLocale 174 + LogicalCard 174 삭제. |
| `jp-tcg-SV11W` | 동상. CardLocale 174 + LogicalCard 174 삭제. |
| `kr-sv-black-bolt-white-flare` | 빈 껍데기(CardLocale 0). Set 레코드만 삭제. |

---

## 2. 그룹화 결과 (2026-05-31)

**스크립트**: `scripts/group-sv11-kr-en.ts`

| 세트 | 매칭방식 | 연결수 | 이름불일치 SKIP |
|---|---|---:|---:|
| kr-sv11b | numberInt + 이름검증(일본어) | 166 | 0 |
| kr-sv11w | numberInt + 이름검증(일본어) | 171 | 0 |
| zsv10pt5(EN) | numberInt만 (영문명, 이름검증 불가) | 172 | — |
| rsv10pt5(EN) | numberInt만 | 173 | — |
| **합계** | | **682** | **0** |

- 고아 LogicalCard 삭제: **661** (682 re-point 중 KR+EN이 같은 JP LC를 공유해 21건 중복 제외)
- 잔여 고아(JP sibling 없음): **0**

누락 번호(JP에도 없음):
- kr-sv11b: [32,33,74,75,116,117,154,155] — 8장
- kr-sv11w: [5,159,167] — 3장
- zsv10pt5: [80] — 1장

---

## 3. 최종 충전 상태 (2026-05-31)

### JP (348장)

| 항목 | SV11B(174) | SV11W(174) | 전체 | 출처 |
|---|---|---|---|---|
| 카드번호 | 174/174 | 174/174 | 348/348 ✓ | TCGdex |
| rarity | 174/174 | 174/174 | 348/348 ✓ | TCGdex |
| illustrator | 173/174 | 173/174 | 346/348 | TCGdex |
| hp | ~163/174 | ~164/174 | 327/348 | TCGdex (트레이너·에너지 21장 정상 null) |
| attacks 구조화 | ~163 | ~163 | 326/348 | TCGdex |
| CardText(ko) | — | — | **337/348** ✓ | 나무위키 (블랙볼트/화이트플레어) |
| nameKo | — | — | **337/348** ✓ | 나무위키 |
| pokedexNumbers | 0 | 0 | **0** ❌ | 미수집 |
| abilities | 0 | 0 | **0** ❌ | 미수집 |
| 이미지 | 0 | 0 | **0** ❌ | 미호스팅 |
| CardText(ja) | 0 | 0 | 0 | 미수집 |
| flavorText | 0 | 0 | 0 | 미수집 |

> CardText(ko) 337/348: 나무위키에서 KR 미발매 11장(각 팩 누락번호 합산)은 no-match.

### KR

| setId | 카드수 | rarity | CardText(ko) | 누락번호 |
|---|---|---|---|---|
| kr-sv11b | 166 | 166 ✓ | 166/166 ✓ | [32,33,74,75,116,117,154,155] |
| kr-sv11w | 171 | 171 ✓ | 171/171 ✓ | [5,159,167] |

### EN

| setId | 카드수 | rarity | CardText(ko) | 누락번호 |
|---|---|---|---|---|
| zsv10pt5 | 172 | 172 ✓ | 163 (공유 LC) | [80] |
| rsv10pt5 | 173 | 173 ✓ | 170 (공유 LC) | — |

---

## 4. 남은 공백 — 재수집 트리거용

1. **JP 이미지 0/348** — R2 미호스팅. Pokellector/공식에서 수집 필요.
2. **pokedexNumbers 0/348** — PokeAPI(영문명→도감번호) 수집 필요. `fill-pack-pokeapi.ts` 적용 가능.
3. **abilities 0/348** — TCGdex/Bulbapedia 보강 필요.
4. **CardText(ja) 0/348** — 일본어 카드 텍스트 미수집.
5. **flavorText 0/348** — 미수집.
6. **KR 누락 11장·EN 누락 1장** — JP에도 없는 번호. pokemoncard.co.kr 공식 확인 필요(KR 전용 카드 여부).
7. **illustrator 2장 미수집** (#174 SV11B/SV11W 각 1장).
8. **provenance(ExternalIdMapping) 0** — TCGdex 카드별 출처 ID 미기록.

---

## 5. 출처 (provenance)

| 데이터 | 출처 | 상태 |
|---|---|---|
| JP 게임데이터(이름/기술/illustrator/rarity/hp) | **TCGdex** | ✅ |
| EN 게임데이터 | **pokemontcg.io** | ✅ (rarity·illustrator·attacks) |
| 카드 이미지(EN/KR) | Cloudflare R2 | ✅ |
| JP 카드 이미지 | **미호스팅** | ❌ |
| **한글 카드명·레어도** | **나무위키 「블랙볼트(포켓몬 카드 게임)」/「화이트플레어」** | ✅ 2026-05-31 |
| pokedexNumbers | 미수집 | ❌ → PokeAPI 적용 가능 |
| abilities·flavorText·CardText(ja) | 미수집 | ❌ |

### 나무위키 페이지 확인 (2026-05-31)
- 블랙볼트: `https://namu.wiki/w/블랙볼트(포켓몬 카드 게임)` — 174행, BWR 레어도 포함 ✓
  - 주의: `블랙볼트`(공백 없음) URL은 마블 코믹스 캐릭터 페이지(0 card rows) — 반드시 `(포켓몬 카드 게임)` 접미어 사용
- 화이트플레어: `https://namu.wiki/w/화이트플레어` — 174행 ✓

### BWR 레어도 추가
- `sync-pack-namu-ko.ts` RMAP에 `BWR: "Black White Rare"` 추가 완료 — #174 제크로무ex/레시라무ex에 적용됨.

---

## 추가된 영구 스크립트

- `scripts/cleanup-sv11-dups.ts` — jp-tcg-SV11B·SV11W·kr-sv-black-bolt-white-flare 중복 삭제 (의존행 0 확인 포함, 멱등)
- `scripts/group-sv11-kr-en.ts` — KR(이름검증) + EN(numberInt만) → JP SV11B/SV11W 그룹화 (멱등)
- `scripts/sync-pack-namu-ko.ts` — BWR 레어도 코드 추가 (범용 반영)
