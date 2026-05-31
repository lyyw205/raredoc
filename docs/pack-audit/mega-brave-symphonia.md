# 팩 점검 · 출처 기록 — メガブレイブ + メガシンフォニア (M1L + M1S)

> 형식: [mega-abyss-eye.md](./mega-abyss-eye.md) 참고.

- **setGroup**: `mega-brave-symphonia` · era MEGA
- **이름**: JP「メガブレイブ」(M1L) +「メガシンフォニア」(M1S) 합본 / KR「메가브레이브」+「메가심포니아」
- **점검일**: 2026-05-31
- **특이점**: JP는 두 팩을 하나의 세트(`jp-mega-brave-symphonia`)로 합본 수집(M1L-001~092 + M1S-001~092, 총 184장). KR은 각각 별도 세트(`kr-m1l` 89장, `kr-m1s` 86장).

---

## 1. 지역별 세트 구성

| region | setId | 원래 setGroup | 카드수 | cardCount | 비고 |
|---|---|---|---:|---:|---|
| JP | `jp-mega-brave-symphonia` | mega-brave-symphonia | 184 | 184 ✓ | M1L(1–92)+M1S(1–92) 합본 |
| KR | `kr-m1l` | mega-brave-symphonia | 89 | 89 ✓ | 메가브레이브 본판, JP 그룹화 ✓ |
| KR | `kr-m1s` | mega-brave-symphonia | 86 | 86 ✓ | 메가심포니아 본판, JP 그룹화 ✓ |
| KR | `kr-mbg` | ~~mega-brave-symphonia~~ → **kr-starter-m1** | 23 | 23 ✓ | 스타터 세트 MEGA 「메가팬텀 ex」 — 분리 완료 |
| KR | `kr-mbd` | ~~mega-brave-symphonia~~ → **kr-starter-m1** | 23 | 23 ✓ | 스타터 세트 MEGA 「메가디안시 ex」 — 분리 완료 |

### 스타터덱 분리
`kr-mbg`·`kr-mbd`는 별개 제품(스타터 세트)이므로 새 setGroup `kr-starter-m1`(era=MEGA, nameKo="MEGA 스타터 세트", order=998)으로 분리. 카드 데이터는 건드리지 않음(플레이스홀더명 "MBG 1" 등 그대로).

---

## 2. KR 그룹화 (2026-05-31)

**스크립트**: `scripts/group-m1-kr.ts`

| 항목 | 결과 |
|---|---|
| kr-m1l 연결 | 89/89 (이름 불일치 SKIP 0) |
| kr-m1s 연결 | 86/86 (이름 불일치 SKIP 0) |
| 고아 LogicalCard 삭제 | 175 |
| 잔여 고아(JP sibling 없음) | 0 |

KR 카드명이 모두 일본어(JP와 동일)였으므로 이름 검증 100% 통과. 누락 번호: kr-m1l [17,23,40], kr-m1s [8,32,43,65,72,77] — JP에 해당 번호 없어 매핑 불가(정상).

---

## 3. 최종 충전 상태 (2026-05-31 작업 완료)

### JP (jp-mega-brave-symphonia, 184장)

| 항목 | M1L(92) | M1S(92) | 전체 | 출처 |
|---|---|---|---|---|
| 카드번호(numberInt) | 92/92 | 92/92 | 184/184 | TCGdex |
| 이미지 | 92/92 | 92/92 | 184/184 | R2 호스팅 |
| rarity | 92/92 | 92/92 | 184/184 | TCGdex |
| illustrator | 92/92 | 92/92 | 184/184 | TCGdex |
| hp | ~77/92 | ~77/92 | 154/184 | TCGdex (트레이너·에너지 30장은 정상 null) |
| attacks 구조화 | — | — | 154/184 | TCGdex |
| attacks scalar | — | — | 30/184 | 트레이너·에너지(정상) |
| pokedexNumbers | — | — | 152/184 | TCGdex |
| CardText(ko) | 92/92 | 92/92 | **184/184** ✓ | 나무위키(메가브레이브/메가심포니아) — 2026-05-31 |
| nameKo | 92/92 | 92/92 | **184/184** ✓ | 나무위키 |
| CardText(ja) | 0 | 0 | 0 | 미수집 |
| flavorText | 0 | 0 | 0 | 미수집 |
| abilities | 0 | 0 | 0 | 미수집 |
| provenance(ExternalIdMapping) | — | — | 0 | 미기록 |

### KR (kr-m1l 89장, kr-m1s 86장)

그룹화로 JP M1L/M1S LogicalCard를 공유 → 게임데이터(hp/rarity/attacks/illustrator/pokedexNumbers)·CardText(ko)·nameKo 모두 JP에서 상속.

| 항목 | kr-m1l | kr-m1s |
|---|---|---|
| 번호 | 89/89 ✓ | 86/86 ✓ |
| rarity | 89/89 ✓ | 86/86 ✓ |
| CardText(ko) | 89/89 ✓ | 86/86 ✓ |
| hp 상속 | 74 | 71 |
| 누락 번호 | [17,23,40] | [8,32,43,65,72,77] |

---

## 4. 확정 불가 공백 — 재수집 트리거용

1. **CardText(ja)** — 일본어 카드 텍스트 0건. TCGdex/Bulbapedia에서 수집 가능.
2. **abilities** — JP 전체 0. TCGdex/Bulbapedia 보강 필요.
3. **flavorText** — 0건. JP 공식 수집 후 보강.
4. **kr-m1l 누락 3장([17,23,40])·kr-m1s 누락 6장([8,32,43,65,72,77])** — JP에도 없는 번호. pokemoncard.co.kr 공식 확인 필요.
5. **kr-mbg·kr-mbd 플레이스홀더명** ("MBG 1" 등) — 별도 재수집 작업.
6. **provenance(ExternalIdMapping)** — JP 카드별 TCGdex 출처 ID 미기록. 재수집 시 적재.

---

## 출처 (provenance)

| 데이터 | 출처 | 상태 |
|---|---|---|
| JP 게임데이터(이름/기술/illustrator/rarity/hp) | **TCGdex** | ✅ |
| 카드 이미지 | Cloudflare R2 | ✅ |
| 세트 로고 | R2 (pokellector 원본 추정) | ✅ |
| **한글 카드명·레어도** | **나무위키 「메가브레이브」/「메가심포니아」** | ✅ 2026-05-31 |
| pokedexNumbers·CardText(ko) 종족명 보조 | PokeAPI | ✅ (TCGdex가 우선) |
| abilities·flavorText·CardText(ja) | 미수집 | ❌ |
| kr-mbg·kr-mbd 카드명 | 미수집 | ❌ (플레이스홀더) |

---

## 추가된 영구 스크립트

- `scripts/group-m1-kr.ts` — kr-m1l/kr-m1s → JP M1L/M1S 그룹화 (이름 검증 포함, 멱등)
