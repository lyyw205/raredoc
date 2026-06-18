# 비교 자료 (comparison sources) — pack-list-check 유동부

> **이 파일이 "바뀌는 부분"이다.** 새 검증 자료·출처·필드·매핑이 생기면 여기를 고치고(필요하면 `scripts/compare-list.ts`도), `SKILL.md`의 파이프라인·금지·유의는 건드리지 않는다.
> 각 항목은 "어떤 필드를, 어떤 자료로, 어떻게 대조하는가"를 정의한다.

---

## 1. 입력 리스트 포맷 (tcgcollector)

붙여넣는 리스트는 카드 1장당 **7줄** 블록이다:

```
0                       ← line0: 보유수(0=미보유)  ※ 대조에 안 씀
Tangela                 ← line1: 카드명(보통 EN)
001/066                 ← line2: 번호/세트총장수
Basic                   ← line3: 진화단계(트레이너/에너지는 "—")
Grass                   ← line4: 타입(포켓몬=에너지타입 / 트레이너="Trainer" / 에너지="Energy")
Common (C)              ← line5: 레어도명 (약어)
$0.19                   ← line6: 시세  ※ 대조에 안 씀
```

- 번호 `NNN/TTT`: 앞=콜렉션 번호, 뒤=세트 총장수(본탄 기준, 시크릿은 초과번호 067+).
- 레어도 약어는 끝 괄호 안: `Common (C)` → `C`. (§4 매핑)
- 파싱은 `compare-list.ts`가 7줄 청크로 처리. 포맷이 다른 리스트가 오면 여기 규격을 갱신.

---

## 2. 타깃 세트 식별

- 후보: `prisma.set.findMany({ where: { cardPackId } })` 또는 코드로 찾기. **region=JP**가 타깃.
- **JP명 덤프로 검증**(SKILL 🚫#2): 앞 8 + 뒤 6장. 리스트 EN명과 종이 맞는지 본다(モンジャラ=Tangela, ガチグマ アカツキ=Bloodmoon Ursaluna 등).
- 장수로 고르지 않는다 — 동명·유사 구성 세트가 있어 오선택 위험.

---

## 3. 6필드 ↔ DB 읽기 경로

카드는 `RegionCard`(setId로 필터) 기준, 게임필드는 `card`(LogicalCard) 직독:

| 리스트 필드 | DB 경로 | 비교법 |
|---|---|---|
| 카드명 | (포켓몬) `Card.pokedexNumbers` → §5 CSV 종명 | EN리스트명 ⊇ CSV-en종명, DB-JP명 ⊇ CSV-ja종명(자기검증). 트레이너/에너지는 §6 |
| 번호 | `RegionCard.numberInt`/`number` | 번호로 행 매칭 |
| 세트총장수 | 본탄 장수 | 리스트 `/TTT`와 비교(시크릿 초과 허용) |
| 진화단계 | `Card.subtypes` | 리스트 단계값이 subtypes에 포함되는지 |
| 타입 | `Card.types` | 포켓몬: 리스트 타입 ∈ types. 트레이너/에너지: supertype로 판정 |
| 분류(supertype) | `Card.gameCard.supertype ?? Card.supertype` | 리스트 타입칸(Trainer/Energy/에너지타입)으로 역산해 일치 확인 |
| 레어도 | `RegionCard.rarity ?? Card.rarity` → `.code`(+`category.code`) | §4 매핑으로 정규화 후 비교 |
| ex 표기 | `Card.subtypes` 에 `EX`(대문자) vs `ex` | 리스트가 `... ex`인데 DB에 `EX`면 EX→ex 대상 |

---

## 4. 레어도 매핑 (리스트 약어 ↔ DB Rarity.code)

DB는 broad `RarityCategory.code`(common…hyper_rare)와 구체 `Rarity.code` 2계층. AR/SR/SAR/ACE 구분은 **구체 code**로 해야 한다(category로는 ACE와 UR이 둘 다 ultra_rare로 뭉개짐).

| 리스트 약어 | 리스트 풀네임 | DB Rarity.code (JP) | category.code |
|---|---|---|---|
| C | Common | `C` / `Common` | common |
| U | Uncommon | `U` / `Uncommon` | uncommon |
| R | Rare | `R` / `Rare` | rare |
| RR | Double Rare | `Double Rare` | double_rare |
| AR | Art Rare | `Art Rare` / `Illustration Rare` | illustration_rare |
| SR | Super Rare | `Super Rare` | super_rare |
| SAR | Special Art Rare | `Special Art Rare` / `Special Illustration Rare` | special_illustration_rare |
| UR | Ultra Rare | `Ultra Rare` (gold) / `Hyper Rare` | ultra_rare / hyper_rare |
| ACE | ACE SPEC Rare | `ACE SPEC Rare` / `Rare ACE` | ultra_rare(주의: code로 구분) |
| MA | (메가) Mega Attack Rare | `Mega Attack Rare` | ultra_rare |
| MUR | Mega Ultra Rare | `Mega Ultra Rare` | hyper_rare |

- compare-list.ts의 `dbRar()`가 이 표를 구현. 새 레어도(신팩)가 나오면 여기 + `dbRar()` 갱신.
- **무레어도(`-`/None/null)**: 하이클래스팩 본탄·**덱/박스 제품 전체**는 정상적으로 레어도가 없을 수 있다(§유의). 리스트가 전부 무레어도면 그대로.
  - **무레어도 정규화(엔진 내장)**: 리스트 레어도칸이 `—`/빈값이면 "레어도 없음", DB는 `RegionCard.rarity`·`Card.rarity` 둘 다 null이면 "레어도 없음". **양쪽 다 없으면 일치(스킵)**, 한쪽만 있으면 불일치로 보고. (덱 리스트 전체 `—`일 때 허위 53건 방지 — SVHM 사례.)

**레어도 권위 출처(리스트에 없을 때만):** 공식 pokemon-card.com(JP)이 메인, Bulbapedia는 보조(단독 금지, JP 교차 필수). 상세는 메모리 `reference_jp_rarity_verification`. **리스트에 레어도가 있으면 리스트가 1차 권위**(SKILL 🚫#3).

---

## 5. 포켓몬 종명 검증 — pokeapi CSV (양방향)

파일: `data/pokeapi/pokemon_species_names.csv`
헤더: `pokemon_species_id,local_language_id,name,genus`
- `pokemon_species_id` = 전국도감번호.
- `local_language_id`: **1=일본어(가나)**, **3=한국어**, **9=영어**. (2=일어로마자, 4~ 기타언어 — 안 씀.)

검증(포켓몬 카드만, `Card.pokedexNumbers[0]` 사용):
1. **EN리스트 ↔ DB 정합**: CSV-en(lang9) 종명이 리스트 EN명에 포함되는지. (예: dex114 → "Tangela" ⊂ 리스트 "Tangela") — 리스트가 DB 번호의 올바른 카드와 맞는지 직접 확인.
2. **DB 자기검증**: CSV-ja(lang1) 종명이 DB-JP `RegionCard.name`에 포함되는지. (예: dex114 → "モンジャラ" ⊂ DB "モンジャラ")
3. **정규화 필수**: 전각→반각(`２`→`2`,`Ｚ`→`Z`), 영문은 소문자+발음기호 제거+영숫자만. (compare-list.ts `fw()`/`en()`)

한계: 지역폼/메가/팀명 접두("Hisuian", "Bloodmoon", "Iron", "Mega")는 종명이 리스트명의 **부분집합**이라 "포함" 방향이 맞다. 종명에 공백/기호가 있는 종(Iron Leaves, Scream Tail, Ting-Lu)도 포함검사로 처리.

---

## 6. 트레이너/도구/스타디움/에너지 — 종표 밖

CSV 종표에 없어 자동 종명검증 불가. 처리:
- **번호·단계(—)·분류(Trainer/Energy)·레어도**는 그대로 6필드 대조.
- **이름 정합**은 EN RegionCard 링크가 있으면 그걸로, 없으면 스폿 확인. KR 트레이너 스크램블이 의심되면 card-check 스킬의 `references/kr-trainer-alignment.md` + `audit-kr-trainers.ts`로 넘긴다(별도 작업, 이 점검에서 즉석 교정 금지).
- KR 번호 가나다 재배열은 정상(§유의).

---

## 7. 새 자료 추가 가이드

새 검증 수단이 생기면:
1. 여기에 **무엇을·어떻게** 대조하는지 항목 추가(위 표 형식).
2. `scripts/compare-list.ts`에 구현 추가(기존 diff 루프에 끼워넣기).
3. 출처가 외부 사이트면 메모리 `reference_*`에도 한 줄(있으면 가리키기).
4. **SKILL.md는 건드리지 않는다** — 파이프라인 단계 자체가 바뀌어야 할 때만 사용자와 상의 후.
