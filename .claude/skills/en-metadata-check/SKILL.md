---
name: en-metadata-check
description: 영문판(EN) 카드팩 하나를 받아서, 그 팩 EN 카드들의 메타데이터(hp·types·subtypes·retreatCost·weakness·resistance·evolvesFrom·attacks·abilities·rarity·illustrator·name·images·pokedexNumbers)를 권위 소스(pokemontcg.io)와 대조해 ① 비어있는 값(특히 orphan 카드)을 수집·채우고 ② 잘못 들어간/틀린 값을 점검·교정하는 스킬. 사용자가 EN 팩/세트를 주며 "메타데이터 점검", "빈 값 채워줘", "hp/attack/이름 비어있는 거 확인", "EN 카드 값 틀린 거 점검", "메타 완전성" 같이 요청하면 이 스킬을 쓴다. en-binding-check(EN 미묶임 카드 합치기)와 짝이며 — **EN 팩 점검 요청 시 두 스킬을 함께(병렬) 돌린다**(아래 동반 실행). pack-list-check(붙여넣은 JP 리스트 6필드 대조)와 다르다: 이쪽은 **EN 카드의 게임/표시 메타데이터를 pokemontcg.io 권위와 자동 대조**한다. 활성화되면 아래 파이프라인·계층규칙·함정을 글자 그대로 따른다.

---

# en-metadata-check — EN 메타데이터 완전성 + 정확성 점검

EN 카드의 내용(스탯·기술·레어도·이미지 등)이 **빠짐없이 들어있고 올바른지**를 권위 소스(pokemontcg.io EN)와 대조한다. en-binding-check 가 "정체성/연결"을 다룬다면 이 스킬은 "카드 내용"을 다룬다 — **연결 여부와 무관하게** 채우고 교정한다(EN 단독 orphan 도 내용은 채워야 도감에 제대로 나온다).

왜 필요한가: merge 가 만든 orphan EN 카드(`lc-orphan-*`)는 supertype/subtypes/dex 만 채워지고 **hp·types·weakness·attacks·rarity 가 비어있다.** 또 bound 카드도 EN 레어도(RegionCard.rarity)·EN 기술텍스트(CardText en)가 비거나, JP 공유 Card 가 EN 메커니즘 subtype(MEGA/Tera…)을 누락한다. 이런 빈값/오값을 잡는다.

## 동반 실행 (en-binding-check 와 함께)

**사용자가 EN 팩 하나를 점검 요청하면 이 스킬과 `en-binding-check` 를 모두 진행한다.** 둘 중 무엇으로 진입했든 양쪽 다 돈다.
- **감사(읽기 전용)는 병렬**: `en-binding-check/scripts/audit-en-pack.ts` 와 `en-metadata-check/scripts/audit-en-metadata.ts` 를 동시에 돌려 결과를 모은다.
- **수정은 직렬·전건 확인**: 바인딩(repoint)과 메타데이터(채움/교정)는 각각 dry-run→확인→apply. 같은 동결 체크포인트(`--allow-protected`)를 공유.
- 보고는 한 번에: 묶임 상태 + 메타 완전성/정확성을 합쳐 사용자에게 제시.

## 설계 결정 (en-binding-check 와 동일 선)

1. **한 EN 팩씩.**
2. **빈 값은 수집(채움)** — EN 완전성 목표. orphan 의 빈 스탯이 핵심 타깃.
3. **언어 의존 필드는 bound 에서 손대지 않음**(아래 🚫#2). KR-only/JP텍스트 영역 보류.
4. **모든 채움·교정은 전건 확인.** 자동 적용 없음.

---

## 🚫 절대 금지 (HARD STOP)

1. **계층을 섞지 않는다.** 게임스탯=`Card`, EN 표시(name·이미지·rarity)=`RegionCard`, 기술텍스트(bound)=`CardText(en)`. `references/metadata-sources.md` §B 매핑을 그대로 따른다. `apply-en-metadata.ts` 가 이 매핑의 구현이다.
2. **언어 의존 필드를 bound 카드에서 비교/덮어쓰지 않는다.** 공유 Card 의 `evolvesFrom`·`attacks`·`abilities`·`flavorText` 는 JP 앵커 언어다 — EN 권위와 비교하면 오탐, 덮으면 JP 오라클 파괴. bound 는 EN 기술텍스트를 **CardText(en) 백필 여부만 리포트**(자동수정 금지, 마이그레이션 미착수). (§C-1)
3. **rarity 는 EN 값을 RegionCard 에만 쓴다.** EN↔JP 레어도 체계가 다르다(Uncommon↔Rare, Art Rare↔Illustration Rare). 공유 `Card.rarity` 를 EN 값으로 덮지 않는다 — `RegionCard.rarity` 에 EN 값을 세팅해 JP 표시를 안 깬다. (§C-4)
4. **subtypes 는 합집합으로 enrich** — MEGA/Tera/Ancient 등 EN 메커니즘 누락은 추가만, 기존 값 제거 금지. (§C-3)
5. **불확실하면 두고 리포트.** mismatch 가 EN↔JP 정상 차이인지 진짜 오류인지 모호하면 교정하지 말고 보고. 추측 수정 금지.
6. **동결팩 가드 우회 금지.** `apply-en-metadata.ts` 의 `assertWritable` 통과 — 동결 영향 시 dry-run 확인 → 사용자 확인 → `--apply --allow-protected`. 즉석 prisma/SQL 금지.

---

## 파이프라인 (순서 불변)

### 0. 감사 (읽기 전용)
```bash
npx tsx .claude/skills/en-metadata-check/scripts/audit-en-metadata.ts --set <enSetId> --emit-plan /tmp/<set>-meta-plan.json
```
- 권위 = pokemontcg.io(`set.id:<code>`). 각 EN 카드 필드를 DB 와 대조해 **EMPTY**(채움 후보)·**MISMATCH**(점검 대상)로 분류.
- `--emit-plan` 은 **안전한 EMPTY 채움 액션만** plan 으로 저장(MISMATCH 는 자동 포함 안 함 — 확인 대상).
- 출력의 `summary.counts`(empty/mismatch/planFills), `frozenGroupsTouched`, `authority.noAuthCards`(권위 미등재=오류 아님)를 본다.

### 1. 완전성(EMPTY) 채움 — 확인 후 적용
- plan 을 필드별 건수로 요약해 사용자에게 제시(예: orphan Lapras ex hp/types/weakness/attacks/rarity, 트레이너 7장 rarity, bound 16장 resistance…). **확인** 받는다.
- dry-run → 적용:
```bash
npx tsx .claude/skills/en-metadata-check/scripts/apply-en-metadata.ts --plan /tmp/<set>-meta-plan.json            # dry
npx tsx .claude/skills/en-metadata-check/scripts/apply-en-metadata.ts --plan /tmp/<set>-meta-plan.json --apply [--allow-protected]
```
- 부분 적용: `--only <필드>` / `--cards <regionCardId,..>`.
- ⚠ `attacks(EN텍스트)`·`abilities(EN텍스트)` 리포트 항목은 plan 에 없다(bound CardText 백필, 자동수정 안 함). 별건으로 기록만.

### 2. 정확성(MISMATCH) 교정 — 전건 확인
리포트의 mismatch 를 종류별로 제시하고 **건건 확인** 후, 확인된 것만 액션을 만들어 적용한다.
- **rarity**: EN 인쇄본에 JP 용어가 저장된 체계적 현상(Super Rare→Ultra Rare·Art Rare→Illustration Rare 등). **팩마다 교정한다** — `audit-en-metadata.ts --emit-rarity-plan /tmp/<set>-rarity-fix.json` 로 `{layer:"RegionCard", field:"rarity", value:<ptcg.io EN값>}` 액션을 받아 확인 후 `apply`. **EN `RegionCard.rarity` 만** 바꾸므로 JP/KR·공유 Card 는 보존(검증됨). 용어차·티어차(Uncommon→Rare 등) 모두 ptcg.io EN 값으로. 전 팩 순회로 점진 정규화(전역 작업으로 미루지 않음). 상세 §C-4.
- **subtypes**: MEGA/ENMECH 누락이면 `Card.subtypes` 에 **union** 값으로(§C-3).
- **hp/types/weakness/retreat 등 언어무관 mismatch**: 진짜 오류면 교정, EN↔JP 정상차이면 보류.
- 확인된 액션을 `/tmp/<set>-meta-fix.json` 의 `actions` 배열로 작성 → `apply-en-metadata.ts --plan` 으로 dry→apply.

### 3. 재검증 + 보고
- `audit-en-metadata.ts` 재실행 → EMPTY/MISMATCH 가 의도대로 줄었는지 확인.
- `docs/en-binding-log.md`(동반 실행이므로 같은 로그)에 메타 줄 추가: 채움 N(필드별)·교정 N(rarity/subtypes…)·리포트만(CardText) N.
- 사용자에게 한국어로: 채운 빈값, 교정한 오값(계층 명시), 보류/리포트(이유). 코드·세트명 원문 유지.

---

## 유의사항
- **orphan 의 빈 스탯이 최대 수확** — 도감 표시에 직접 영향. 우선 채운다.
- **권위없음(noAuthCards)** = ptcg.io 미등재(신팩 시크릿/EN단독)일 수 있다 — 오류로 보지 말고 tcgdex/공식으로 확인.
- **bound mega 의 MEGA subtype 누락**은 흔한 정상 갭(enrich) — 종류별로 한꺼번에 처리.
- 함정(언어의존·rarity 체계·×/x·retreat 0/null·번호정규화)은 `references/metadata-sources.md` §C 에 전부 있다.
- 실행은 **레포 루트에서**.

## 자산
- `scripts/audit-en-metadata.ts` — 권위 대조 감사 엔진(읽기 전용, `--emit-plan`). **재작성 금지, 그대로 사용.**
- `scripts/apply-en-metadata.ts` — plan 기반 적용(계층별 쓰기, `assertWritable`, dry-run, `--only/--cards`). DB 변경 유일 경로.
- `references/metadata-sources.md` — 출처·필드↔계층 매핑·함정. 새 출처/필드는 여기만 고친다.
- 재사용: `scripts/lib/protected-groups.ts`(가드), `card-check/references/research-sources.md`(개별 최종판정). 짝: `en-binding-check`.
