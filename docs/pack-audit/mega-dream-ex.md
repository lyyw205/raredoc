# 팩 점검 · 출처 기록 — MEGAドリームex (High Class Pack: MEGA Dream ex / M2a)

> 형식: [mega-abyss-eye.md](./mega-abyss-eye.md) 참고.

- **setGroup**: `mega-dream-ex` · era MEGA (M2a, Inferno X와 Nihil Zero 사이 하이클래스팩)
- **이름**: JP「ハイクラスパック MEGAドリームex」/ EN「High Class Pack: MEGA Dream ex」/ KR「MEGA 하이클래스팩 MEGA 드림 ex」
- **점검일**: 2026-05-31
- **특이점**: **컴필레이션(재수록) 하이클래스팩** — Destined Rivals·Ascended Heroes 등 원본세트 카드를 모음. Bulbapedia가 각 카드를 **원본세트로 리다이렉트**(`MEGA Dream ex N` → `Destined Rivals N` 등). 우리 리다이렉트 추적 스크래퍼가 처리.

## 정체 규명 (untangle 결과)
처음엔 "Destined Rivals(SV) 오적재"로 의심됐으나, `MEGA_Dream_ex_(TCG)` 실존 확인 → **정상적인 MEGA기 컴필레이션 세트**. 손상 아님.

## 지역 구성 (정리 후)
| region | setId | 카드수 | 비고 |
|---|---|---:|---|
| JP | `jp-mega-dream-ex` | 250 | cardCount 486→**250 보정** |
| KR | `kr-m2a` | 242 | 하이클래스팩 본판, JP 그룹화 ✓ (번호 #11·47·79·90·131·196·205 누락) |
| KR | `kr-ma` | 48 | 프리미엄 트레이너 박스, JP 그룹화 ✓ |

### ⚠️ kr-mc 분리 (구조 정리)
`kr-mc`("**스타트 덱 100 배틀컬렉션**", 752장)는 dream-ex와 무관한 별개 제품인데 잘못 묶여 있었음. → **새 setGroup `kr-startdeck-100`으로 분리 완료.**
- 미해결: kr-mc 511장은 **플레이스홀더명("MC 251"…)**, 나머지 ~241장은 번호 기반으로 JP dream-ex에 묶여 있으나(우연/정당재판 불명). **pokemoncard.co.kr 재수집 + 그룹화 재평가 필요**(별도 작업).

## 최종 충전 상태 (JP 250)
| 항목 | 결과 | 출처 |
|---|---|---|
| 일본어 카드명 | **248/250** | Bulbapedia (리다이렉트→원본세트) |
| illustrator | 246/250 | Bulbapedia |
| 구조화 attacks | 190/250(전 포켓몬) | Bulbapedia |
| abilities | 80/250 | Bulbapedia |
| pokedexNumbers·CardText(ko) | 190 (포켓몬) | PokeAPI |
| **rarity** | **113/250** ⚠️ | TCGPlayer(부분) — 보강 필요 |

## 남은 공백
1. **rarity 113/250** — 절반 미만. Bulbapedia `jprarity`로 보강 가능(스크래퍼에 rarity 캡처 추가 필요).
2. JP명 미스 2장(Bulbapedia 페이지 부재), supertype 오분류 5장(#164·188 트레이너 오라벨 / #205·206·208 = Trainer인데 hp보유 → 포켓몬 오라벨 의심, 확인 필요).
3. flavorText·CardText(ja) 미수집.
4. KR 정규 카드명 영문 잔존(CardText ko로 표시 대체).
5. **kr-mc(스타트덱100) 전체** — 별도 재수집 작업.

## 출처 (provenance)
- JP 게임데이터·일러스트·JP명: **Bulbapedia "MEGA Dream ex"**(리다이렉트로 원본세트 페이지) ✅
- 도감번호·한글명: PokeAPI ✅ / 이미지: R2 ✅
- rarity: TCGPlayer(부분) → Bulbapedia jprarity 보강 권장
- kr-mc: pokemoncard.co.kr 재수집 필요
