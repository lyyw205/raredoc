# EN ↔ JP/KR 팩 관계 확정 + 카드 매칭 레시피

이 스킬의 핵심 안전장치: **EN 고아 카드를 아무 JP/KR 카드에나 붙이지 않는다.** 먼저 "이 EN 팩과 관계있는 JP/KR 팩"을 확정하고, **그 팩(들) 안에서만** 매칭 상대를 찾는다. 팩명·구성이 EN/JP 간 일치하지 않을 수 있으므로(EN 이 JP 여러 팩을 합본하거나, 다른 이름으로 현지화), **이름이 아니라 발매 관계로** 판정한다.

---

## A. 팩 관계 확정 (orphan 매칭보다 먼저)

`audit-en-pack.ts` 의 `packRelationship` 을 먼저 읽는다.

### A1. DB 1차 — 이미 관계가 인코딩돼 있나
- **`siblingSetsInSameCardPack`**: 같은 `cardPackId` 로 묶인 JP/KR 세트. 있으면 그게 **1차 후보 소스 팩**이다(EN 합본↔분할 JP 다중세트도 여기 다 나온다).
- **`cardPackLinks`**(팩 대응표 `CardPackLink`): `role`/`relationType` 으로 관계가 명시돼 있다.
  - `ONE_TO_ONE` — EN 1 ↔ JP 1.
  - `MERGE_N_TO_1` — JP 여러 팩이 EN 1팩으로(예: EN 베이스 = JP 컨셉팩 2종). 그 JP setId 들 **전부**가 소스 범위.
  - `SPLIT_1_TO_N` — JP 1팩이 EN 여러 팩으로.
  - `CROSS` / `EN_ONLY` / `JP_ONLY` — 대응 없음 마커. **`EN_ONLY` 면 그 범위 카드는 붙일 JP/KR 가 없는 게 정상** → orphan 유지.

### A2. DB 에 관계가 없거나 불완전하면 — 리서치로 보강
EN 팩이 자체 그룹(JP 형제 세트 없음)이면, 실제 발매 관계를 조사해 소스 JP/KR 팩을 정한다.
- **발매일 근접성이 1차 게이트.** JP 가 EN 보다 보통 수개월 앞선다. EN 팩 발매일과 동떨어진(수년 차) 무관한 JP/KR 팩에서 **억지로 끌어오지 않는다.** `audit` 의 `enSet.releaseDate` 와 후보 팩 `releaseDate` 를 비교.
- **세트 대응 출처**로 JP 원본을 확인한다(아래 §C). Bulbapedia 세트 페이지의 "Japanese release" / limitlesstcg / serebii 가 EN↔JP 세트 대응을 명시한다.
- **EN 오리지널 컴필레이션 주의**(Generations · Hidden Fates · Shining Fates · Celebrations · Crown Zenith · …): 단일 JP 원본이 없고 여러 JP 팩에서 차출되거나 **EN 단독 서브셋**(예: ...GX, SV, TG, GG 갤러리)을 포함한다.
  - 이런 팩은 **부분 대응**이다: 특정 JP 팩으로 거슬러 올라가는 카드만 그 팩 범위에서 붙이고, **EN 단독 서브셋은 orphan 으로 둔다.** 통째로 한 JP 팩에 매핑하려 하지 말 것.

### A3. 확정 결과를 기록
"이 EN 팩의 소스 팩 = JP `<setId(s)>` (+ KR `<setId>`)" 를 한 줄로 적고, 그 setId 들이 매칭의 **허용 범위**다. 범위 밖 카드와는 합치지 않는다.

---

## B. orphan 카드 매칭 (확정된 소스 팩 범위 안에서만)

매칭 정체성 기준은 `scripts/merge-en-identity.ts` 와 동일하다(번호로 맞추지 않는다 — EN/JP 번호 체계가 다름):

- **포켓몬**: `pokedexNumbers`(태그팀은 dex 집합) + `subtypes`(진화단계·V/VMAX/ex 등) + 통합 레어도 랭크. `audit` 출력의 `bucketKey`(=`dex|subtypes`)가 같은 JP 카드를 소스 팩에서 찾는다.
  - ⚠ JP DB 는 EN 전용 메커니즘(Tera/Ancient/Future/Radiant)을 subtypes 에 안 담는다 — 그 키는 빼고 비교.
- **트레이너/스타디움/도구**: 일러가 아니라 **이름**이 정체성(같은 일러에 여러 카드 스크램블). EN 이름 ↔ JP 이름은 `scripts/lib/trainer-names-*.ts`(시대별 `TR_JP2EN`) 사전으로 대응.
- **기본에너지**: 에너지 타입(草=Grass 등)으로. 특수에너지는 이름쌍.

### 실존/이미지 확인
DB 에 매칭 JP/KR 카드가 안 보이거나 매칭이 애매하면, `card-check` 의 검증 소스를 **그대로 재사용**한다(중복 금지):
- `../../card-check/references/research-sources.md` — KR 공식(pokemoncard.co.kr) · JP 공식(pokemon-card.com) · EN 공식(pokemon.com, 단건만) · 보조(tcgdex/limitlesstcg).
- 단건 EN 최종 판정은 pokemon.com 공식이 권위. 애매하면 **카드 스캔 이미지로 눈 대조**가 최종.

### 매칭 판정
- **JP 매칭 확정** → bind 후보(§D).
- **KR 만 매칭(JP 없음)** → **보류 + 리포트.** EN↔KR 직접 묶기는 하지 않는다(설계 결정). `audit` 의 `krOnly` 와 함께 보고만.
- **소스 팩 범위에 매칭 없음** → EN 단독으로 판정, orphan 유지.
- **불확실** → 유지. 추측으로 붙이지 않는다(미연결 > 오연결).

---

## C. 세트 대응·실존 리서치 출처 (요약 — 상세는 card-check reference)

- EN↔JP 세트 대응: `https://bulbapedia.bulbagarden.net/wiki/<EN_set>_(TCG)` 의 "Japanese release" / `https://limitlesstcg.com/cards/<EN>` / serebii.
- 실존/식별자 확인 명령(KR/JP/EN 공식, tcgdex)은 **`../../card-check/references/research-sources.md`** 참조.
- EN 메타(dex/subtypes/rarity/artist) 대량 조회: pokemontcg.io (`q=set.id:<code>`), tcgdex.

---

## D. 합치기·수집 메커니즘

### D1. 매칭 JP 카드가 이미 DB 에 있음 (대부분의 경우)
`bind-en-orphan.ts` 로 외과적 repoint. dry-run → 사용자 확인 → `--apply`(동결 영향 시 `--allow-protected`).
```bash
npx tsx .claude/skills/en-binding-check/scripts/bind-en-orphan.ts --en <enRegionCardId> --to <targetJpCardId>
```
스크립트가 자동 거부하는 안전위반(붙이면 안 되는 신호): ① 입력 EN 이 이미 JP 형제 보유 ② 타깃에 JP 로케일 없음 ③ 타깃이 이미 EN 보유.

### D2. 매칭 JP/KR 카드가 DB 에 없음 (수집 후 합치기)
소스 팩의 JP(또는 KR) 카드 자체가 미수집이면, **먼저 수집**한 뒤 bind 한다. 수집은 기존 전담 경로를 쓴다(이 스킬에서 새 수집기를 즉흥 작성하지 않는다):
- `card-collector` 에이전트(TCGdex EN·JP, KR 공식) 또는 레포의 기존 수집 스크립트.
- 수집으로 JP RegionCard+Card 가 생기면 D1 의 bind 로 EN 을 붙인다.

### D3. EN 미수집 카드(번호 갭) 보강
`audit` 의 `numberCompleteness.missing` = EN 팩에서 빠진 번호. **EN 완전성이 목표**이므로 이들을 수집한다(`card-collector` / pokemontcg.io·tcgdex 로 해당 EN 세트에 채움). 수집 후 `audit` 를 다시 돌려 갭 0 확인 → 새로 들어온 EN 카드도 §B 매칭 대상에 포함.

### D4. 로케일 보존 검사 (DB 변경 전후 필수)
bind 는 EN 로케일을 옮기는 작업이라 다른 팩을 비울 수 있다. `card-check` 의 보존 검사를 그대로 쓴다:
```bash
npx tsx .claude/skills/card-check/scripts/check-locale-conservation.ts --save
#   …bind-en-orphan --apply…
npx tsx .claude/skills/card-check/scripts/check-locale-conservation.ts --compare --target <작업 cardPackId>
```
작업 대상 외 그룹의 🔴 손실/⚠★ 이동이 0이어야 정상. 0이 아니면 이미지로 판정 전엔 완료로 보고하지 않는다.
