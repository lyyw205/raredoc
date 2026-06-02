# 팩 점검 · 출처 기록 — ロケット団の栄光 (SV10) / Destined Rivals / 로켓단의 영광

> 형식: [sv-black-bolt-white-flare.md](./sv-black-bolt-white-flare.md) 참고.
> 점검 깊이: **감사 + 안전수정 + 이슈로그** (대량 재수집은 [sv-issues-log.md](./sv-issues-log.md)로 이관).

- **setGroup**: `sv-destined-rivals` · era SV
- **이름**: JP「ロケット団の栄光」(SV10) / EN「Destined Rivals」(sv10) / KR「로켓단의 영광」(kr-sv10)
- **점검일**: 2026-05-31
- **특이점**: JP는 정규세트(001–098)만 적재 — **시크릿 레어(SAR/UR) 미수집**. EN은 자체 번호체계(244장, 알파벳순)라 JP와 번호 불일치 → numberInt 기반 EN↔JP 그룹화 불가(이름기반 필요). KR은 JP 번호체계 동일.

---

## 1. 지역별 세트 구성 (정리 후)

| region | setId | 카드수 | cardCount | 비고 |
|---|---|---:|---:|---|
| JP | `jp-sv-destined-rivals` | 98 | 98 ✓ | 정규세트 001–098만. 시크릿 미수집 |
| EN | `sv10` | 244 | 244 ✓ | 자체 번호 1–244. 게임데이터 거의 없음(아래) |
| KR | `kr-sv10` | 129 | 129 ✓ | JP 번호체계. namu 132행 중 [41,42,85] 누락 |

### 삭제된 중복 세트 (2026-05-31)
| setId | 사유 |
|---|---|
| `kr-sv-destined-rivals` | 빈 껍데기(CardLocale 0 · LogicalCard 0). Set 레코드만 삭제. (BBWF 선례) |

---

## 2. 그룹화 현황 (기존, 이번에 변경 안 함)

LogicalCard.primarySetId 분포 기준:
- JP `jp-sv-destined-rivals`: 98 (전부 JP 자체)
- KR `kr-sv10`: **95 → JP** (정규 1–98, 번호체계 동일하여 정상 그룹화), **34 → EN(sv10)** (시크릿 99–132; JP에 대응 없어 EN으로 연결)
- EN `sv10`: 242 → 자체 LC(sv10), 2 → JP

> EN↔JP 그룹화는 **번호체계 불일치로 보류**(EN #1=Ethan's Pinsir vs JP #1=クヌギダマ). 이름기반 매칭은 재수집 작업으로 이관.
> KR 시크릿 34장이 EN으로 묶인 매핑의 정확성은 **미검증**(이슈로그 기재).

---

## 3. 이번 점검에서 수행한 안전수정 (2026-05-31)

| 항목 | 내용 | 출처/방법 |
|---|---|---|
| 한글 카드명 | kr-sv10 129장 placeholder "SV10 N" → 정식명 | **나무위키 「로켓단의 영광」** → `CardText(ko).name` + `LogicalCard.nameKo` |
| 레어도 | kr-sv10 129장 Rarity 정정 | 나무위키 표 (`sync-pack-namu-ko.ts`) |
| JP CardText(ko) | 2 → 95 (KR이 JP LC 공유하여 동시 반영) | 상동 |
| JP cardCount | 0 → 98 | 메타데이터 정정 (BBWF 관례: cardCount=적재수) |
| kr-sv10 releaseDate | 1970-01-01(epoch) → 2025-06-20 | 삭제된 KR 껍데기의 날짜 승계 |

**스크립트**: `scripts/sync-pack-namu-ko.ts kr-sv10 "로켓단의 영광"` (멱등)

---

## 4. 남은 공백 — 재수집 트리거용 (이슈로그 참조)

1. **JP 시크릿 레어 미수집** — 정규 098만. EN(244)·namu(132)에 시크릿 존재. TCGdex JP 재임포트 필요.
2. **EN `sv10` 게임데이터 0** — 242 LC가 hp/attacks/abilities null (rarity·illustrator·image만). supertype 오분류 208장은 hp 결측의 표면증상. EN 게임데이터 재수집(pokemontcg.io/Bulbapedia) 필요.
3. **KR 누락 [41,42,85]** — namu 132행 중 3장 DB 부재. KR 전용/번호공백 여부 pokemoncard.co.kr 확인 필요.
4. **KR CardLocale.name = "SV10 N" placeholder** — 표시는 CardText(ko) 오버레이로 대체(옵션 C)되나 원본 placeholder는 이상적이지 않음.
5. **pokedexNumbers 희소** (EN 55 / JP 2 / KR 36) — PokeAPI 보강 가능.
6. **abilities 0 (전 지역)** · **flavorText 0** · **CardText(ja) 0** — 미수집.
7. **provenance(ExternalIdMapping)** — JP/KR 없음, EN은 poketrace/price 1건만.
8. **JP supertype 대부분 null**, #98만 Pokémon 오분류(에너지/트레이너 #95–98 hp 정상 null).

---

## 5. 출처 (provenance)

| 데이터 | 출처 | 상태 |
|---|---|---|
| JP 게임데이터(이름/기술/illustrator/rarity/hp) | TCGdex | ✅ (정규 098만) |
| EN 데이터 | pokemontcg.io | ⚠ rarity·illustrator·image만 (게임데이터 없음) |
| 카드 이미지(전 지역) | Cloudflare R2 | ✅ |
| **한글 카드명·레어도** | **나무위키 「로켓단의 영광」** | ✅ 2026-05-31 (132행) |
| pokedexNumbers·abilities·flavorText·CardText(ja) | 미수집 | ❌ |
