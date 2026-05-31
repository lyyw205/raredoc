# 팩 점검 · 출처 기록 — ニンジャスピナー (Ninja Spinner / Chaos Rising)

> 형식: [mega-abyss-eye.md](./mega-abyss-eye.md) 참고. 점검 결과 + 재수집용 출처 기록.

- **setGroup**: `mega-ninja-spinner`
- **era**: MEGA (M4)
- **이름**: JP「ニンジャスピナー」 / EN「**Chaos Rising**」 / KR「닌자 스피너」
- **점검일**: 2026-05-31
- **⚠️ 중요**: Bulbapedia는 이 세트를 **영문 세트명 "Chaos Rising"** 으로 문서화. JP명 페이지(`X_(Ninja_Spinner_N)`)는 `#REDIRECT [[X (Chaos Rising N)]]` 로 리다이렉트됨. → 범용 스크래퍼에 **리다이렉트 자동 추적** 추가함(다음 팩에도 유효).

## 1. 지역 구성 + primarySetId
| region | setId | 카드수 | 비고 |
|---|---|---:|---|
| JP | `jp-mega-ninja-spinner` | 120 | base 83 + secret 37 |
| KR | `kr-m4` | 81 | 정규판 (번호 #34·#48 누락) |
| KR | `kr-m-p` | 33 | 프로모 (#10~14·16 등 누락) |

- primarySetId 전부 `jp-mega-ninja-spinner` ✓ — **KR 114장 전부 JP 논리카드에 그룹화됨**(kr-m4 81/81, kr-m-p 33/33) → JP 보강이 KR로 자동 상속.

## 2~6. 최종 충전 상태
| 항목 | JP(120) | KR 상속 | 출처 |
|---|---|---|---|
| pokedexNumbers | 96/96(포켓몬) | 공유 | PokeAPI |
| CardText(ko)·nameKo | 96 | kr-m4 69 / kr-m-p 33 | PokeAPI ko 종족명 |
| 일본어 카드명(JP locale) | **118/120** | — | Bulbapedia(Chaos Rising) |
| 구조화 attacks | **96/120**(전 포켓몬) | 공유 | Bulbapedia |
| illustrator | **115/120** | 공유 | Bulbapedia |
| abilities | 22/120 | 공유 | Bulbapedia |
| supertype 오분류 | **0** (16→0 교정) | 0 | Bulbapedia infobox + 정합성 교정 |

→ 시크릿레어(84-120)도 **Chaos Rising 페이지가 커버**해 직접 채워짐(abyss-eye처럼 base 복사 불필요).

## 데이터 수집 출처 (provenance)
| 데이터 | 확정 출처 | 상태 |
|---|---|---|
| JP 카탈로그·게임데이터·일러스트 | **Bulbapedia "Chaos Rising"** (카드 개별페이지, JP→EN 리다이렉트 추적) | ✅ |
| 도감번호·한글명 | **PokeAPI** | ✅ |
| 이미지 | R2 업로드본 / 원본 Pokellector·TCGPlayer 추정 | ✅ |
| KR 정규 카드명 | pokemoncard.co.kr 공식 (미수집 — CardText(ko)로 표시 대체 중) | ⚠️ |
| TCGdex JP | M4 미색인(M1L/M1S/M2/M3까지만) | ❌ 대안 불가 |

## 확정 불가 / 남은 공백
1. **#73 Big Haul Net·#74 Book of Transformation 의 JP명** — Bulbapedia에 페이지 없음(missingtitle). supertype은 Trainer로 정합성 교정함. JP명 미수집(영문 잔존).
2. **KR CardLocale.name 영문 잔존** (kr-m4 81·kr-m-p 33) — 화면은 CardText(ko)로 한글 표시되나, KR 정식 인쇄명은 pokemoncard.co.kr 발매분에서 보강 가능.
3. **JP flavorText / CardText(ja)** — 미수집.
4. **provenance(ExternalIdMapping)** — 미기록.
5. KR 누락 번호(kr-m4 #34·#48 / kr-m-p 일부) — KR 미발매분이거나 수집 누락, 확인 필요.

## 이번에 개선된 범용 자산
- `sync-pack-bulbapedia-jp.ts`: **#REDIRECT 자동 추적**(JP명→EN명) + **트레이너/에너지 인포박스 jname 파싱** + **supertype 정합성 교정** 추가 → 모든 후속 팩에 적용됨.
