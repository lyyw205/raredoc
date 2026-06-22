# EN 메타데이터 출처 + 필드↔계층 매핑 + 함정

권위 소스와 DB 계층, 그리고 "비교하면 안 되는 필드"를 정리. `audit-en-metadata.ts` 가 이걸 구현한 엔진이다.

---

## A. 권위 소스

- **1차: pokemontcg.io** — `GET https://api.pokemontcg.io/v2/cards?q=set.id:<code>&pageSize=250`. EN 카드의 hp·types·subtypes·retreatCost·weaknesses·resistances·evolvesFrom·attacks(name/cost/damage/text)·abilities·rarity·images·nationalPokedexNumbers 제공. 번호 정규화: 선행 0 제거(`001→1`), 알파벳 접미 유지.
- **2차(폴백): tcgdex** — `https://api.tcgdex.net/v2/en/cards/<setCode>-<localId>` (세트: `/v2/en/sets/<code>`). ptcg.io 가 **artist 를 누락**하는 신팩(me 시리즈 등)에서 일러스트레이터 보강용. 카드별 조회라 요청 많음 — 필요한 카드만.
- **최종 권위(개별 판정): pokemon.com 공식** — 단건만(봇차단). 서드파티가 엇갈릴 때 심판. (상세 레시피는 `../../card-check/references/research-sources.md`.)

신팩 시크릿은 ptcg.io 등재가 지연될 수 있다 — `noAuthCards` 로 표시되며 "권위없음"은 오류가 아니라 미등재일 수 있다.

---

## B. 필드 ↔ DB 계층 매핑 (수정 시 어디에 쓰나)

| 권위 필드 | DB 경로(쓰기 계층) | 비고 |
|---|---|---|
| name | **RegionCard.name** (EN) | EN 표시명. CardText(en).name 은 별개(오버레이) |
| hp | **Card.hp** | 게임스탯(언어무관) |
| types | **Card.types** (String[]) | 〃 |
| subtypes | **Card.subtypes** (String[]) | 〃 — ⚠ ENMECH 함정(§C) |
| retreatCost | **Card.retreatCost** (Int) | 권위 array 길이 = Int |
| weaknesses[].type/value | **Card.weakness** (JSON 문자열) | DB 관례 `[{"type","value"}]`, value 는 `x2`(소문자 x) |
| resistances[].type/value | **Card.resistance** (JSON 문자열) | 〃 |
| evolvesFrom | **Card.evolvesFrom** | ⚠ 언어 의존(§C) — bound 는 손대지 마라 |
| nationalPokedexNumbers | **Card.pokedexNumbers** (Int[]) | |
| artist | **Card.illustrator** | ptcg.io 미제공 시 tcgdex |
| rarity | **RegionCard.rarity**(EN 인쇄본별) ?? Card.rarity | ⚠ EN↔JP 레어도 차이(§C) — EN 값은 RegionCard 에 |
| images.small/large | **RegionCard.imageSmall/Large** | |
| flavorText | RegionCard.flavorText / Card.flavorText | 우선순위 낮음 |
| attacks/abilities | **orphan: Card.attacks/abilities** · **bound: CardText(en)** | ⚠ §C — bound 는 Card 가 JP 텍스트 |

`apply-en-metadata.ts` 의 필드 스위치가 이 표를 따른다. Card 필드와 RegionCard 필드를 섞어 쓰지 않는다.

---

## C. 함정 (오탐·오수정 방지 — 반드시 숙지)

1. **언어 의존 필드를 bound 카드에서 EN 권위와 비교/덮어쓰기 금지.**
   - 공유 Card(=JP 형제 있는 bound)는 **앵커(JP) 언어로 저장**된 필드가 있다: `evolvesFrom`(예 DB `イトマル` vs EN `Spinarak`), `attacks`/`abilities`(JP 기술명/텍스트), `flavorText`.
   - 이걸 EN 권위와 비교하면 **전부 오탐**, 덮어쓰면 **JP 오라클 파괴**. → 엔진은 bound 에서 이 필드들을 **비교 안 함**. EN 기술텍스트는 `CardText(en)` 백필 여부만 **리포트**(자동수정 안 함 — CardText.attacks 마이그레이션 미착수).
   - orphan(EN 앵커)은 이 필드들이 EN 이어야 하므로 비교/채움 정상.

2. **언어 무관 필드만 bound 에서 교정 가능**: hp·types·retreatCost·weakness.type·resistance.type·pokedexNumbers·images·rarity·illustrator. 이건 지역 불문 같아야 하므로, bound 에서 비어있으면 채우고(공유 Card 라 JP/KR 에도 반영 = 정상), 다르면 점검 대상.

3. **subtypes — ENMECH enrich 갭.** JP DB 는 EN 전용 메커니즘 subtype(**MEGA**·Tera·Ancient·Future·Radiant 등)을 안 담는다. 그래서 bound mega 카드가 `["ex","Stage 1"]`(DB) vs `["Stage 1","MEGA","ex"]`(EN)로 mismatch 뜬다 — **누락이지 오류가 아니다.** 교정은 **합집합(union)으로 추가**(MEGA 보충)하고 기존 값을 떨구지 않는다. 안전하면 확인 후 `Card.subtypes` 에 union 값으로 plan 작성.

4. **rarity — EN 인쇄본에 JP 용어가 저장된 체계적 현상. 팩 순회 시 *팩마다* EN 인쇄본 rarity 를 교정한다(EN-only, JP/KR 보존).**
   - 실측(2026-06-20, me3): EN `RegionCard.rarity` 가 비어 Card 로 폴백한 게 아니라, **EN/JP/KR 전 지역이 동일한 JP식 레어도**를 저장(Super Rare·Art Rare·Special Art Rare·Mega Ultra Rare…). EN 탭이 그 `nameEn`(=JP 용어)을 표시.
   - 규모: 전 EN 카드 중 Super Rare **1004**·Art Rare **438**·Special Art Rare **234**·Mega Ultra Rare 6 … = **~1700+ EN 카드**. me3 한정 문제가 아니다.
   - JP↔EN 등가(같은 티어, 명칭만 다름): `Art Rare↔Illustration Rare`, `Special Art Rare↔Special Illustration Rare`(둘 다 `canonicalCode` 로 이미 통합: `art_rare`/`special_art_rare`), 그리고 `Super Rare↔Ultra Rare`, `Ultra Rare↔Hyper Rare`, `Mega Ultra Rare↔Mega Hyper Rare`(이쪽은 **canonicalCode 가 아직 통합 안 함** — JP SR=EN UR, JP UR=EN HR 시스템 매핑은 `merge-en-identity.ts` rankJp 참조).
   - **교정 방법(표준, 팩마다): `audit-en-metadata.ts --emit-rarity-plan /tmp/<set>-rarity-fix.json`** 가 rarity mismatch 를 `{layer:"RegionCard", field:"rarity", value:<ptcg.io EN 용어>}` 액션으로 뱉는다. 사용자 확인 → `apply-en-metadata.ts --plan ... --apply [--allow-protected]`.
     - **EN `RegionCard.rarity` 에만 EN 용어를 세팅** → EN 탭은 EN 용어(Ultra Rare·Illustration Rare…), JP/KR 인쇄본 rarity·공유 `Card.rarity` 는 **불변**(JP `スーパーレア`·KR `슈퍼 레어` 그대로). 실측 검증됨(me3 Decidueye ex #100: EN→Ultra Rare, JP/KR 보존).
     - 용어 등가(SR→Ultra Rare·AR→Illustration Rare·SAR→Special Illustration Rare·Mega UR→Mega Hyper Rare)도, 진짜 티어차(예 `Uncommon→Rare`, JP도 Uncommon인데 EN만 Rare)도 **똑같이 ptcg.io EN 값으로** 교정. 신팩이라 tcgdex 미인덱싱이면 ptcg.io 가 EN 권위(교차소스 없으면 ptcg.io 단독 인정).
     - 한 팩만 고치면 그 순간 사이트가 부분적으로만 EN 용어이지만, **전 팩 순회로 점진 정규화**되므로 정상(전역 작업으로 미루지 않는다).
     - `apply` 가 ptcg.io 명칭→Rarity.code 로 해석(Ultra Rare·Illustration Rare·Special Illustration Rare·Mega Hyper Rare·Rare 등 존재 확인됨). 매칭 코드 없으면 스킵·경고 → 그 카드만 수동 확인.
   - **rarity EMPTY 채움**(orphan 등 rarity 없던 카드)은 ptcg.io EN 용어로 채운다(위 교정과 일관). Common·Double Rare 등 공통 표기는 안전.
   - 비교는 **code 아닌 `nameEn`** 로(엔진 반영). `U↔Uncommon`·`R↔Rare`·`C↔Common` 약어를 오탐으로 잡지 않기 위함.

5. **retreat 0 vs null.** 후퇴비용 0은 정상값 — ptcg.io 가 retreatCost 를 생략하기도 한다. `null`(미상)과 `0`(무후퇴)을 혼동하지 마라. 엔진은 권위에 retreatCost 가 있을 때만 채움.

6. **weakness 값 표기 ×/x.** DB 는 `x2`(소문자), ptcg.io 는 `×2`(곱셈기호). 정규화 후 비교(엔진 내장). 채울 때 DB 관례(`x2`)로 저장.

7. **번호 매칭은 정규화로.** DB `001`/`121a` ↔ ptcg.io `1`/`121a`. 선행 0만 제거, 접미 유지.

8. **weakness/resistance 저장 포맷이 팩마다 섞여 있다(오탐 주의).** 어떤 팩은 JSON `[{"type":"Fire","value":"x2"}]`(예 me3), 어떤 팩은 **평문 `"Fire×2"`**(예 me2pt5)로 저장. 엔진 `typeSet` 이 평문의 배수 접미(×N/xN/-N/+N)를 떼고 type 만 비교하도록 고쳐서 오탐을 막았다(2026-06-20, me2pt5 weakness 128 오탐 교정). 새 팩에서 weakness mismatch 가 비정상적으로 많으면 이 포맷차를 먼저 의심(데이터는 정상, 표기만 다름). 빈값 채움은 JSON 포맷으로 쓴다(DB 혼재는 표시계층이 흡수, 별도 정규화는 후속).

9. **ptcg.io 가 일부 신규 레어도를 ALL_CAPS 코드로 반환한다(노이즈).** 예 `MEGA_ATTACK_RARE`(읽기명 "Mega Attack Rare"). DB 가 이미 읽기명("Mega Attack Rare")을 가지면 이건 진짜 mismatch 가 아니다 — `apply` 가 `code:"MEGA_ATTACK_RARE"` Rarity 를 못 찾아 자동 스킵하므로 무해하나, rarity-plan 에 잔류 노이즈로 남는다. 교정 대상에서 제외(이미 정상).

10. **illustrator mismatch 를 단독으로 "다른 카드"라 단정하지 마라 — 두 함정이 있다.** (사용자 교정 2026-06-20)
    - **함정 A: ptcg.io artist 오기가 잦다.** 실측 me2pt5: #14·#227(ptcg=Dsuke 인데 실제 EN 카드 "illus. June")·#197(ptcg=Takashi 인데 "Kenichi Yamaguchi")·**#72(ptcg=chibi 인데 실제 DOM — svp#182 DOM 과 아트 일치, dream-ex#59 묶음 정답·이전승인 유효)**. → ptcg artist 만으로 판단 금지.
    - **함정 B: 같은 카드 정체성인데 지역별 일러만 다를 수 있다.** 같은 시리즈·같은 포켓몬·같은 슬롯이 EN/JP 에서 다른 일러로 인쇄되기도 한다 — 일러 다름 ≠ 무조건 다른 카드.
    - **올바른 판정 절차**: ① ptcg 말고 **EN 카드의 실제 인쇄 일러 크레딧 + 아트 이미지**를 본다. ② **Limitless 인쇄 계보**(`limitlesstcg.com/cards/ASC/<n>` 의 prints 목록)로 그 EN 카드가 *어느 인쇄 패밀리*인지 확인. ③ DB 가 묶은 JP 와 **아트가 같으면**(또는 같은 계보) → 정상(필요시 illustrator 만 교정). **아트가 명백히 다르고 다른 인쇄본 계보면** → 미스바인딩.
    - 실측 진짜 미스바인딩(me2pt5): #105(EN "illus.Whisker"·나무풍경 → dream-ex#86 Ounishi 주황절벽 아님, MEP/MEG 계보)·#204(EN "illus.DOM"·커피잔방 → dream-ex#178 akagi R-의자방 아님, DRI 계보)·#231(EN 풀아트 IR mingo → MC#278 일반 Akira 아님, JTG 계보). ★이중출신 컴필레이션은 rankZip 이 같은 종의 다른 아트/레어도를 교차결합하기 쉽다 — 단, 교정 타깃이 me2pt5 팩관계 밖(크로스팩)이면 합치기 전 사용자 확인.

11. **ptcg 가 같은 번호에 카드 2장을 둘 수 있다(중복번호 오비교).** 실측 zsv10pt5 #60 = Escavalier(Pokémon) + Antique Cover Fossil(Trainer). 번호→단일카드 맵이면 엉뚱한 짝을 집어 name/hp/types/rarity 가 통째로 허위 mismatch 난다. **엔진은 번호→카드[] 멀티맵 + 조회 시 이름일치 카드 우선**으로 처리(반영됨). 새 세트에서 한 카드만 name+hp+rarity 가 동시에 다 다르면 이 중복번호부터 의심(진짜 wrong-card 아님).

12. **set.id 가 ptcg.io set id 다(set.code 아님).** SV 특수세트는 set.id=zsv10pt5(ptcg id)·set.code=BLK(마케팅코드). 엔진은 `set.id`(en-tcg- 제거) 우선·`set.code` 폴백으로 ptcg 조회(반영됨). ptcg: zsv10pt5=Black Bolt(172)·rsv10pt5=White Flare(173). 프로모/에너지(mep·mee)는 ptcg 미수록 → tcgdex 만.

---

## D. 수정 적용 흐름 (plan 기반)

1. **완전성(EMPTY) 채움**: `audit ... --emit-plan /tmp/<set>-meta-plan.json` 가 안전한 빈값 채움 액션만 plan 으로 뱉는다. 사용자에게 요약(필드별 건수) 제시 → 확인 → `apply --plan ... --apply [--allow-protected]`. 부분만 적용하려면 `--only <필드>` / `--cards <id,..>`.
2. **정확성(MISMATCH) 교정**: 자동 plan 에 **안 들어간다.** 리포트로 종류별(rarity/subtypes 등) 제시 → **전건 확인** → 확인된 것만 액션을 plan 에 추가(rarity=RegionCard 계층, subtypes=Card union)해 `apply`.
3. **보존/검증**: 적용 후 `audit` 재실행해 EMPTY/MISMATCH 가 의도대로 줄었는지 확인. (메타데이터는 로케일 이동이 아니라 보존 검사 불필요. 단 동결팩이면 `--allow-protected` 가 곧 사용자 체크포인트.)
