# 팩 점검 · 출처 기록 — ムニキスゼロ (니힐제로 / M3)

> 형식: [mega-abyss-eye.md](./mega-abyss-eye.md) 참고.

- **setGroup**: `mega-munikisuzero`
- **era**: MEGA (M3)
- **이름**: ⚠️ **불일치** — DB·TCGdex = `ムニキスゼロ / Munikisu Zero / 무니키스 제로`, 사용자 호칭 = **「니힐제로」**. TCGdex가 신팩 placeholder명을 쓴 정황. **실제 정식명 검증 필요**(검증 전 DB명 미변경).
- **점검일**: 2026-05-31
- **특이점**: abyss/ninja와 달리 **TCGdex 수록(M3) → JP 데이터가 일본어로 정상 수집됨**.

## 1. 지역 구성 + primarySetId
| region | setId | 카드수 | 비고 |
|---|---|---:|---|
| JP | `jp-mega-munikisuzero` | 117 | Set.cardCount 0→117 보정함 |
| KR | `kr-m3` | 111 | 번호 #3·27·45·54·99 누락 |

- primarySetId 전부 jp ✓ — **KR 111장 JP 논리카드 그룹화 완료** → JP 정정이 KR로 자동 상속.

## 2~6. 최종 상태
| 항목 | JP(117) | 출처/비고 |
|---|---|---|
| 일본어 카드명 | 117/117 ✓ | TCGdex (언어↔region 정합 ✓) |
| pokedexNumbers | 117/117 ✓ | TCGdex (검증결과 정확) |
| illustrator | 114/117 | TCGdex |
| 구조화 attacks | 91/117(전 포켓몬) | TCGdex |
| rarity | 117/117 ✓ | |
| **CardText(ko)** | 117 → **91장 정정** | 아래 ⚠️ 참조 |
| supertype 오분류 | 0 ✓ | |
| abilities | **0** | TCGdex 미제공 — 보강 후보 |
| flavorText | **0** | TCGdex 미제공 — 보강 후보 |

### ⚠️ 발견·수정한 치명적 오류: 한글명 카드번호 오매핑
과거 한글명이 **"카드번호=도감번호"** 로 잘못 채워져 있었음 (예: #1 `イトマル`(dex167)인데 ko가 `이상해씨`(dex1), #2 `アリアドス`→`이상해풀`). pokedexNumbers 자체는 정확했으므로, **올바른 pokedexNumbers→PokeAPI ko 로 91장 전부 재파생·정정**함 (`fix-pack-ko-from-dex.ts`). KR(kr-m3)도 공유 논리카드라 함께 정정됨.
→ **inspect-pack은 "존재"만 보고 "정확성"은 못 잡았음.** 한글명 정확성 검증 = `fix-pack-ko-from-dex <set> --dry-run` 의 corrected 수로 확인.

## 출처 (provenance)
| 데이터 | 확정 출처 | 상태 |
|---|---|---|
| JP 카탈로그·게임데이터·일러스트 | **TCGdex JP (set M3)** `api.tcgdex.net/v2/ja/sets/M3` | ✅ |
| 도감번호 | TCGdex (정확) | ✅ |
| 한글명 | **PokeAPI** (pokedexNumbers→ko, 정정 완료) | ✅ |
| 이미지 | R2 업로드본 | ✅ |
| abilities·flavorText | TCGdex 미제공 | ❌ Bulbapedia 보강 후보(M3 EN 세트명 확인 필요) |
| KR 정규 카드명 | pokemoncard.co.kr (미수집, CardText ko로 표시 대체) | ⚠️ |

## 확정 불가 / 남은 공백
1. abilities·flavorText (TCGdex 미제공) — Bulbapedia에 M3 페이지 있으면 보강(EN 세트명 미확인).
2. KR CardLocale.name 영문 잔존(111) — CardText(ko)로 표시 대체 중.
3. KR 누락 번호 #3·27·45·54·99 — 미발매분/수집누락 확인 필요.
4. 세트 정식명(니힐제로 vs ムニキスゼロ) 검증.
5. provenance(ExternalIdMapping) 미기록.

## ⚠️ 다른 팩에도 적용 필요 (cross-pack)
**stale-ko(카드번호 오매핑) 버그는 다른 TCGdex 수록 MEGA 팩에도 있을 가능성 높음**: `mega-brave-symphonia`, `mega-infernox`. 해당 팩 점검 시 **`fix-pack-ko-from-dex <setId> --dry-run` 먼저 실행**해 한글명 오류부터 확인할 것.
