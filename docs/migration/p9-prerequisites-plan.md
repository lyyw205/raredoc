# raredoc P9 마이그 사전작업 — 순서화·게이트 실행계획

> 6본 사전분석(파편화 census · 게임데이터 누락지도 · 백필소스 · GameCard 키재설계 · ArtCard+P9 순서 · 가드/동결)의 합성본. 전부 READ-ONLY 조사 기반이며, 본 문서는 **실행 순서·게이트·승인 체크포인트**를 확정한다. DB 쓰기 스크립트는 사용자 로컬 실행 전제.

---

## 0. Executive Summary

### 0.1 실제 파편화 규모 (상한 아님 — census 정밀치)

브리프가 들고 온 "상한치"(non-ASCII 3,802 / null-attacks 4,958 / 4,958-21,845)는 **"분할될 수 있는 카드 총수"**다. census(보고1)가 측정한 **"실제로 같은 오라클인데 갈라진 군집"**은 훨씬 작다:

| 지표 | 정밀치 | 출처 |
|---|---|---|
| **Track A — 이름/언어 over-split** (effPart 완전 동일인데 gameCardId 갈림) | **209 군집 / 554 LC** (파편 gameCardId 421개, 최대 n_gc=3) | 보고1(a) |
| **Track B — missing-attacks over-split** (base4에 populated+null 공존) | **209 base / 277 null LC** (그중 결정적 병합 가능 77 base, 모호 132 base) | 보고1(a) |
| **합산 over-split 영향 LC** | **≈ 831장** (Track A·B 거의 비중첩) | 보고1(a) |
| **백필 필요 distinct LogicalCard** (attacks IS NULL, 포켓몬, CardLocale 보유) | **4,927** (정확치 / 세트-귀속 작업부피 10,873) | 보고2 |
| **백필 영향 동결팩 포켓몬** | **2,756 / 8,803 (31%)** — 하한(오염 케이스 미포함) | 보고6 |
| **동결 귀속 누락 비율** | **7,505 / 10,873 = 69.0%** | 보고2 |
| **현재 GameCard 총수** | **17,088** (distinct used 16,406, non-ASCII name 3,802) | 보고4 |
| **재빌드 후 collapse 추정** | **~12,000–13,000대** (정확치는 dry-run 필요) | 보고4(3) |

**원인 분해(직교 2축):** ① **missing-attacks** — attacks=null이 effPart의 `na`/`dmg`를 0/빈으로 만들어 본세트판(공격≥1)과 키가 갈림(collapse 기여 ~7,500 규모, 지배적). ② **표시명 언어split** — canonName이 키에 들어가 EN 유무로 언어 분기(collapse 기여 ~1,000 규모). 둘 다 **GameCard 버킷(gameCardId)을 쪼개고**, `build-art-groups`는 버킷 내부에서만 union하므로 **같은 그림이어도 art 후보에조차 못 든다**(보고5 A). 이게 사전작업의 근본 동기다.

### 0.2 워크스트림 순서 (한눈에)

```
        ┌──────────────────────────────────────────────────────────┐
S0/S1   │ 게이트 베이스라인 (recon·golden·G_FK·G_MERGE --save)      │  SERIAL 선행
        └──────────────────────────────────────────────────────────┘
                              │
   ┌──────────────────────────┴───────────────────────────┐
   │  WS-A 게임데이터 백필 (BF)   ──────────────────────►  effectSig 결측 메움
   │     ↓ (SERIAL — A는 B의 전제)                          │
   │  WS-B 언어중립 GameCard 키 재빌드 (RK) ────────────►  버킷 통합
   │     ↓ (SERIAL — B는 C의 전제)                          │
   │  WS-C ArtCard 재그룹 (AR) ─────────────────────────►  같은 그림 묶임
   └───────────────────────────────────────────────────────┘
                              │
        ┌──────────────────────────────────────────────────────────┐
B→P6.5  │ collapse staging (덱리바인드·art-meta복제·ko·충돌플랜·SNAP)│
        └──────────────────────────────────────────────────────────┘
                              │
        ┌──────────────────────────────────────────────────────────┐
P5→P9   │ P9 엔드게임 (비가역 collapse · 재배선 · DB drop 맨 마지막) │
        └──────────────────────────────────────────────────────────┘
```

**불변식: `BF → RK → AR`은 엄격 SERIAL.** BF 없이는 RK의 effectSig가 여전히 null로 분기, RK 없이는 AR의 버킷이 여전히 갈려 같은 그림이 후보에 못 든다(보고5 B·C).

### 0.3 즉시 다음 게이트 스텝 (READY TO EXECUTE NEXT 요약 — 상세는 §5)

1. **G0 — 백필 5종에 `assertWritable` 가드 추가** (특히 `enrich-era-meta-tcgdex.ts`는 dry-run도 없음). 이건 코드 변경, DB 무관.
2. **G1 — 베이스라인 세이브**: `check-locale-conservation --save` + `gate-fk --save pre-enrich` + `golden-tcgcard` 베이스라인 + `g0-golden-check`(diff=0 확인).
3. **G2 — BF dry-run**: 비동결 fully-empty 우선세트(`jp-tcg-SVG` 등) 1개로 `fill-jp-attacks-types.ts <gid> <pg> SVG`(파서 4필드 확장 후) dry-run.

---

## 1. 문제 정밀 범위

### 1.1 over-split 실제 수 (보고1)

오라클 정체성 키를 **gameCardId와 무관하게** speciesId 집합 기반으로 재정의(언어무관)해 측정. effPart(damage)는 P3 산식을 그대로 mirror(raw 문자열 정렬, 정규화 안 함) — 그래야 "실제 over-split"만 분리되고 census가 인위적으로 부풀지 않는다.

- **Track A (이름/언어 분할):** 오라클 키 `(speciesSet, subtypes, types, hp, 정렬damage, 공격수, 특성수)`가 **완전 동일**한데 gameCardId가 갈린 경우 = **209 군집 / 554 LC**. effPart가 같으니 missing-attacks가 원인일 수 없고 순수 canonName-다리 실패(언어/폼명).
- **Track B (missing-attacks):** base4 `(speciesSet, subtypes, types, hp)`가 populated(공격≥1)+null-attacks를 동시에 가진 군집 = **209 base / 277 null LC**.

### 1.2 원인 분해 (보고1 b)

| 원인 | 정의 | 군집/장수 |
|---|---|---|
| 이름-언어 (ascii vs non-ascii) | Track A 중 한쪽 ASCII·다른쪽 일/한글 | **108 군집** |
| 이름-동일스크립트 | Track A 중 둘 다 같은 스크립트(폼명/canonName-다리 불일치) | **101 군집** |
| **Track A 소계** | effPart 동일 | **209 / 554** |
| missing-attacks | base4 null+populated 공존 | **209 base / 277 null** |
| 둘 다(중첩) | Track A는 effPart 동일 요구 → null 멤버 불가 | **~0 (직교)** |

⚠ caveat: 동일스크립트 101 중 일부는 **데이터 오염성 가짜 군집**(speciesId 25 피카츄에 잘못 매달린 기본에너지 3종이 effSig 우연 충돌). 순수 종 over-split은 ≤101.

### 1.3 누락 총량 / 동결 비율 (보고2)

- **백필 필요 distinct LogicalCard = 4,927** (정확치). 세트 단위 작업부피 = **10,873**(EN/JP/KR 중복 포함).
- affected Set **321** (fully-empty **230** / partial **91**).
- **동결 비율: affected 세트 137/321, 귀속 누락 7,505/10,873 = 69.0%.** 백필이 동결팩 게임데이터를 광범위하게 건드린다.
- 비동결 fully-empty **131세트 / 2,677장**이 차단 없이 바로 착수 가능한 1순위.
- 누락 최다 동결 cardPack: `mega-start-deck-100`(1,305), `sv-paldean-fates`(~830), `sv-white-flare`+`sv-black-bolt-white-flare`(~810), `og-smp`(336), SV 본세트·제품 동결군 전반.

### 1.4 파편 LC 최다 기여 세트 Top (보고1 c)

`sv4`(111) · `en-tcg-me1`(72) · `en-tcg-swsh12pt5`(63) · `jp-tcg-SV4M`/`kr-sv4m`(각 60) · `jp-tcg-SV4K`/`kr-sv4k`(각 59) · `sv2`(57) · `en-tcg-swsh11`(46) · `jp-tcg-M1S`/`kr-m1s`(각 45) · `jp-tcg-M1L`/`kr-m1l`(각 29). **SV4(샤이니트레저)·SV2·MEGA M1S/M1L가 집중 발생원.**

⚠ **동결팩 파편 노출:** `jp-tcg-M1S/M1L = mega-symphonia(45)·mega-brave-symphonia(29)`, `sv-paldea-evolved(24)`, `mega-dream-ex(6)`, `mega-munikisuzero(1)`, `mega-infernox(1)`, `sv-151(1)`. GameCard 통합 시 이 동결팩 LC의 gameCardId도 재배정됨 → 승인 체크포인트(§4).

---

## 2. 워크스트림

### WS-A — 게임데이터 백필 (BF)

**목표:** effectSig가 깨지는 attacks/weakness/retreat/abilities 결측을 메워, RK 단계에서 jp-tcg-SVG류가 본세트판과 effectSig 일치하도록.

**소스 판정 (보고3):** **pokemon-card.com JP 상세페이지(details.php)가 사실상 유일·완전 소스.** tcgdex(svg 404)·pokemontcg.io(totalCount 0)는 JP 스타터/덱/프로모를 아예 보유하지 않아 보조조차 안 됨. kr-official은 게임데이터 소스 아님(표시명/이미지 전용).

**재사용 자산:**
- `scripts/fill-jp-attacks-types.ts` — 상세에서 `parseAttacks()`(cost/name/text/damage)+`parseTypes()` 긁어 비파괴 백필, 이미 122세트 실적. `npx tsx fill-jp-attacks-types.ts <gid> <pgCode> SVG` 형태.
- `data/jp-official/*.json` **208개가 detailUrl 보유** → 재스크랩 즉시 가능(pgCode 재발견 불필요). 우선세트(svg/svd/svi/svm/svk/svam/sval/svaw/svc/svem/svel/svhk/svhm/svjl/svjp/svln/svls/svom/svod/sv5k/sv5m/sv11b/sv11w) 전부 dump 존재.

**소규모 신규(파서 확장만):** `fill-jp-attacks-types.ts`가 현재 **attacks+types만** 캡처하고 **weakness/resistance/retreatCost/abilities 4필드 미파싱**(`<table>` 만나면 ワザ 섹션 종료). 소스 HTML엔 4필드 다 있으므로(보고3 §3) `parseWeakResistRetreat()`+`parseAbilities()` 추가 — 기존 `TYPE_ICON`/`stripTags` 재사용. **신규 수집기·신규 소스 불필요.**

**우선세트 (보고3 §5):**
| 우선 | 세트 | 비고 |
|---|---|---|
| P0 (SV스타터/덱·dump보유·비동결 다수) | SVG·SVD·SVI·SVM·SVK·SVAM/L/W·SVC·SVEM/EL·SVHK/HM·SVJL/JP·SVLN/LS·SVOM/OD·SV5K/5M | dump detailUrl 직접 재스크랩 → 확장파서 4필드 → 비파괴 백필 |
| P1 (구세대 덱·dump보유) | DP-ST1·BWFS·XY0·SD | EN 병합카드면 EN텍스트 보존 규칙 유의 |
| **검토필요(백필 대상 아닐 수)** | MC(653)·SI(369)·프로모(smp/svp/bwp)·하이클래스/시크릿(paldean-fates·sv11b/w) | 별 카드·기본에너지·시크릿 슬롯은 빈 게임데이터가 **정상**. fully-empty라고 전부 백필 대상 아님 — 세트 성격별 선별 |

**동결 플래그:** 우선세트(SVG/SVD/SVM 등 SV 덱군)는 PROTECTED_GROUPS 미포함이라 차단 없이 착수 가능. 단 SV 18팩 본탄·동결 제품군은 `assertWritable` 게이트 필요(보고3 §6, §4 CP-1).

**⚠ 아키텍처 근본원인:** `load-jp-official.ts`(delete-reload)가 Card 생성 시 attacks/weakness/retreat를 **아예 안 씀** → SVG류 fully-empty. 백필은 load가 아닌 **fill-* 보강 단계** 담당이라 그 단계만 돌리면 됨.

**★C4 freeze 규칙 (보고5 BF):** LogicalCard oracle 컬럼 직접 UPDATE 금지 — **GameCard에만 적재**(P3~P7 구간). 진짜 형제전무 케이스(Track B의 모호 132 base 일부)는 새 수집 백로그로 분리.

### WS-B — 언어중립 GameCard 키 (RK)

**현재 키 (보고4 §1, `p3-gamecard.ts` 정본):**
- 포켓몬: `{supertype}|{dexK}|nm:{canonName}|ty:{tyOf}|{subOf}|{effPart}`, `effPart = hp{hp}|dmg{정렬 raw damage}|na{공격수}|ab{특성수}`.
- 트레이너/에너지: `{supertype}|nm:{canonName}|{subOf}`.
- `gc_ = sha1(key)[:20]` → 멱등.

**두 갈래 결함(DB 재현):** attacks=null → effPart 어긋남(포켓몬 LC 5,364/21,845 비어있음) · 표시명 언어split(non-ASCII GameCard 3,802/17,088, 포켓몬 동일오라클 언어분리 상한 2,615).

**제안 키 스펙 (보고4 §2):**
- **포켓몬:** `{supertype}|spc:{정렬 speciesId,}|ty:{tyOf}|{subOf}|{effPartLite}`
  - `spc:` = `LogicalCardSpecies.speciesId` 집합(National dex#). canonName 제거 → 언어split 소멸.
  - `effPartLite` = **`na`(공격수) 제거**, `dmg`+`hp`+`ab` 유지. 완전 회복엔 "attacks=null일 때만 와일드카드 흡수"(데이터 있는 형제로만) 규칙 권장.
- **트레이너/에너지:** `{supertype}|nm:{canonEN}|{subOf}`
  - `canonEN` = EN 우선 → **TR_ALL[JP] 사전(이미 존재, ~1,910 엔트리, `scripts/lib/trainer-names.ts` 8시대 병합)** → same-LC 다리 → 최후 JP/KR. 트레이너는 dex가 없어 canonical 명이 유일한 다리.

**Collapse 추정 (동일 방법론 상대비교, 보고4 §3):**
- 풀 키(이름의존 근사) A=19,911 → 포켓몬 species 치환 B=18,847 (Δ −1,064, 순수 언어split 회복) → effPart na제거 C=11,268 (Δ −7,579, attacks=null 회복).
- **해석: attacks=null(effPart)이 압도적(~7,500), 표시명 언어split ~1,000.** 라이브 17,088 → **대략 12,000–13,000대로 collapse 추정**(라이브 dex-union/흡수 일부 적용으로 보수적 13k 근방). **정확치는 라이브 빌더 dry-run 필요.**

**소비처 (보고4 §4 — gameCardId 읽는 곳):**
| 파일 | 용도 | 영향 |
|---|---|---|
| `src/lib/services/cardgame.ts` L1031-1074 `getCardAdoption()` | 채용률 dedup 핵심. `gc_` prefix 가정(L1066) | gc 합쳐지면 재판 채용률 통합(개선) |
| `src/lib/cards/decklist-gamecard-resolver.ts` | 덱리스트→canonical gameCardId | 모호도↓·resolve율↑ |
| `src/lib/cards/build-candidate-pool.ts` L29 | `gameCardId IS NOT NULL` 풀 조회 | NULL 수 변동 |
| `src/lib/cards/sibling-resolver.ts` L43,108-111 | `anchorGameCardId` 형제 가드 | gc 합쳐지면 가드 약화 가능 — art 그룹 별도필터라 안전하나 확인 필요 |
| `scripts/migration/build-art-groups.ts` | **같은 gameCardId 내에서만** art 묶음 | ★임무 동기: gc 합치면 art 묶음 정상화 |
| `scripts/migration/{p5-collapse,p6_5-collision-plan,gate-merge}.ts` | collapse/게이트 | 재키잉 후 재실행 |

**`DeckRecipeCard` 직접 컬럼 없음** — `cardId(@map logicalCardId)`만, gameCardId는 항상 LogicalCard 경유(보고4 §4).

**리스크:** 오병합(na 제거가 진짜 다른 오라클 합칠 수 있음 — damage-set 다르면 안전, "null일 때만 형제 흡수" 권장) · Species 폴백 잔존(dex# 없는 1,477 포켓몬·EN/사전 없는 1,699 트레이너는 표시명 의존) · 결정성(TR_ALL 사전 변경 시 gc_ 변동 → 사전 버전을 빌드 입력으로 고정).

### WS-C — ArtCard 재그룹 (AR)

**현재 그룹핑 (보고5 A, `build-art-groups.ts`):** 추가형·가역 배치(`Card.artFingerprint`·`artCardId` 2컬럼만 씀, RegionCard.id·FK 불변).
1. **버킷 = gameCardId** (L120-121). **버킷 넘는 병합 구조적 불가** → gc 갈리면 같은 그림도 절대 한 artCardId로 못 묶임 = 임무 핵심 의존성.
2. 이미지 거리 = 공통지역 최소 Hamming(pHash 16-bit, URL 캐시 멱등).
3. complete-linkage 응집 클러스터링(THRESHOLD 12, single-linkage 체이닝 over-merge 방지).
4. 메타 가드 `metaConflict`(illustrator·types·subtypes·supertype·pokedexNumbers·evolvesFrom 양쪽 다 값 있을 때만 충돌) — 오거폰 4가면 types 충돌로 4분할.

**RK 후 재실행:** 버킷이 합쳐진 상태에서 `build-art-groups.ts` 재실행 → dry-run(오거폰=분리/동일아트 재판=병합 샘플 확인) → `--apply`(`assertWritable`·동결팩 `--allow-protected`). 멱등. 이제 같은 그림 cross-pack이 **드디어 같은 버킷 안에서** 한 artCardId로 묶임.

**가드 양호:** `build-art-groups.ts`는 `assertWritable` 이미 적용(L209). 통과 게이트 = **G_MERGE0**(over-merge 차단)·MOVES0·golden0·Card당 artCardId 1개·recon0.

---

## 3. 엄격한 실행 ORDER + 게이트

### 게이트 4종 (보고5 B·6 c)
- **recon** = `check-locale-conservation.ts`(`--save`/`--compare`): locale 소유권(매칭) 이동 포착. ★FK 손실은 못 잡음.
- **golden** = `g0-golden-check.sh`: 전 그룹 build-group 재생성 → `git diff src/data/group-*.json == 0`(도감 회귀 0). + `golden-tcgcard.ts`(loadCardByLocaleId 층화샘플 ~4,800행 diff=0).
- **G_FK** = `gate-fk.ts`(`--save`/`--compare`): 9 FK 테이블 orphan=0, locale-side non-null 손실=0. card-side 감소는 dedup이라 보고만.
- **G_MERGE** = `gate-merge.ts`: 같은 artCardId 멤버가 art-불변 메타 충돌 시 exit 1.

### 시퀀스 (가역성·게이트·expand-contract·동시성)

| 단계 | 작업 | 가역 | 통과 게이트 | E-C | 동시성 |
|---|---|---|---|---|---|
| **S0** | 게이트 선작성 · `p0-recon-verify.ts:33,48` ArtCard SELECT에 `to_regclass` 가드 | 가역 | recon0·G_FK 베이스라인 | 코드만 | SERIAL |
| **S1** | sibling-resolver 커밋 + recon/golden/G_FK 베이스라인 `--save` | 가역 | recon0·golden0·MOVES0·baseline==live | 코드만 | SERIAL |
| **S2** | JP 트윈 releaseDate 백필(`backfill-set-releasedate.ts`, Set만·assertWritable) | 가역 | 행수 불변·golden0 | DB additive | **PARALLEL**(아트 무관) |
| **S3a** | `Card.artFingerprint`+`artCardId` nullable 추가(db push, additive·FK 0) | 가역 | recon0·행수불변·G_FK Δ0 | **expand: 컬럼 먼저** | SERIAL |
| **— 여기서 GameCard 파편화 해소 본체 (BF→RK→AR 엄격 SERIAL) —** |
| **BF** | WS-A 게임데이터 백필. ★C4: GameCard에만 적재, LC oracle 컬럼 직접 UPDATE 금지 | 가역(적재분 되돌림) | G_FK Δ0·recon0·mismatch0 | DB additive | **SERIAL** |
| **RK** | WS-B 언어중립 키 재빌드(`p3-gamecard.ts` → P3v3). 키 name=언어중립 oracle 키(표시명 아님) | 가역(재계산) | p3 self-verify(채용률 통합)·MOVES0·recon0 | DB(gameCardId 재배정) | **SERIAL** |
| **AR** | WS-C `build-art-groups.ts` 재실행: dry-run → `--apply`(assertWritable·동결 `--allow-protected`) | 가역(2컬럼) | **G_MERGE0**·MOVES0·golden0·recon0 | DB(2컬럼만) | **SERIAL** |
| **— collapse staging —** |
| **B** | 덱리스트→gameCardId 통일 + `DeckRecipeCard.cardId` 생존자 재바인드 | 가역 | 채용률 diff0·recon0 | 코드+DB rebind | SERIAL(RK 의존) |
| **P4** | art-meta(illustrator/types)를 ArtCard 대표로 복제 | 가역(구컬럼 잔존) | mismatch0·G_FK Δ0 | copy(읽기 미전환) | **P8a와 PARALLEL** |
| **P8a** | 병합대상 전 Card에 ko CardText 보장(cascade 손실 선이동) | 가역 | missing-ko0 | copy | **P4와 PARALLEL** |
| **P6.5** | unique dedup **플랜** 산출(`p6_5-collision-plan.ts`, read-only): CardText 7,820·CardSpecies 7,248·ExternalId 0 | 가역(플랜) | 위반0·union==baseline | write 없음 | SERIAL |
| **SNAP** | `pg_dump`(`p5-snapshot.ts`) + recon/G_FK save + restore 리허설 | 가역(스냅샷) | scratch restore==baseline | 안전망 | SERIAL(필수) |
| **— P9 엔드게임 (비가역) —** |
| **P5** | `p5-collapse.ts` **단일 트랜잭션**: per-pack Card→ArtCard, FK repoint→dedup→비대표 삭제. ★cascade victim 0·**RegionCard.id 불변**·loser jsonl 영구화 | **비가역** | recon0·G_FK 보존·cascade0·RegionCard.id 불변 | DB delete(repoint 먼저) | **SERIAL·단일 트랜잭션** |
| **P5.5** | 지역별 rarity 표기차 정정 | **비가역** | RegionCard.id 불변·golden0 | DB write | SERIAL |
| **P7** | 읽기 소비처 collapse 모델 재배선(flag·A/B diff0). `card.locales`=artCardId 그룹 | 가역(until next) | render diff0·recon0 | **코드(읽기) 먼저** | SERIAL |
| **P8** | ko→CardText 완주(READ 전환) | 가역(until next) | dupe0·superset | 읽기 전환 | SERIAL |
| **P9** | **★contract — 코드 읽기전환(P7/P8) 확인 후 마지막에 DB drop**: setGroupId 4곳 원자 드롭(원자 PR-1) → art-meta 컬럼 드롭 → cross-pack 죽은코드 제거 → id 재발급 skip 권장 → 도감 동결(골든 3종 보존 후) | **비가역** | recon0·RegionCard.id 바이트동일·golden0 | **contract: DB drop 맨 마지막** | SERIAL·원자 PR |

### SERIAL vs PARALLEL 요약 (보고5 C)
- **반드시 SERIAL:** S0→S1→S3a→**BF→RK→AR**→B→P6.5→SNAP→**P5(단일 트랜잭션)**→P5.5/P7→P8→P9.
- **PARALLEL 가능:** S2(releaseDate) / P4↔P8a(art-meta 복제 ↔ ko CardText) / 게이트 측정 자체(단 baseline save는 측정 전 SERIAL).

### expand-contract 불변식 (보고5 D)
expand(S3a 컬럼·BF/P4 메타 copy = additive) → 읽기 전환(P7/P8) → contract(P9에서만 DB drop). ★메모리 `feedback_db_column_drop_procedure`: scripts는 tsc exclude라 P9 drop 전 `override-tsconfig`+grep로 스크립트 소비처까지 검증해야 런타임 안 깨짐.

**가역 분기점 = P5** (보고5 E). S0~AR~P4~SNAP까지 전부 가역. P5/P5.5/P9 drop만 비가역(SNAP restore가 유일 퇴로).

---

## 4. 동결팩 확인 체크포인트 (사용자 승인 필요 지점)

동결 단일출처 = `scripts/lib/protected-groups.ts`의 `PROTECTED_GROUPS`(**89개 setGroup**, AGENTS.md 본문 31개는 예시 — 실 가드는 89개). 가드 API `assertWritable(ids, {allow, dryRun, tool})`: 동결팩 영향권+미허용 시 `process.exit(1)`.

> **공통 평가:** 백필·GameCard 재빌드·art 묶음은 모두 **언어중립 게임데이터/oracle 묶음**이지 EN/KR **매칭**이 아니다. 좁은 동결규칙(RegionCard 연결·트레이너 이름 대응)에는 비해당이고, recon(check-locale-conservation) 이동 0건으로 매칭 불훼손을 **증명**할 수 있다. 그러나 검증완 동결팩의 게임데이터/식별자에 손대는 첫 사례이므로 전부 **사전 승인 체크포인트**로 플래그한다.

- **CP-1 (게임데이터 백필 BF)**: 동결팩 포켓몬 **2,756장**(하한)의 attacks/types/abilities 백필. effectSig→gameCardId 이동을 의도. 통째-null 동결팩 = `mega-start-deck-100`(551), `sm-decks`(304), `sv-decks`(144), `sv-paldean-fates`(315/316), `sv-twilight-masquerade`(114), `sv-shrouded-fable`(76), `og-jp-mega-promo`(32) 등. → `--allow-protected` 또는 명시 승인.
- **CP-2 (GameCard 전역 재빌드 RK/P3v3)**: 동결팩 포함 전역 gameCardId 재계산(`where:{locales:{some:{}}}` = 팩필터 없음). RegionCard 매칭 불변이나 oracle 식별자 변경. 전역 작업이라 팩별 가드 불가 → 승인 전제 + **사후 동결팩 한정 gameCardId before/after diff 측정**(변화가 BF effectSig 변화로만 설명되는지 검증) + conservation/golden diff=0 증빙.
- **CP-3 (build-art-groups / p5-collapse `--apply`)**: 이미 `--allow-protected` 게이트 존재. 동결팩이 art 병합·collapse 영향권이면 플래그 + G_MERGE/G_FK 통과 증빙 첨부.

**파편 노출 동결팩(보고1 c, CP-2 사후검증 1순위):** mega-symphonia(45)·mega-brave-symphonia(29)·sv-paldea-evolved(24)·mega-dream-ex(6)·mega-munikisuzero(1)·mega-infernox(1)·sv-151(1).

---

## 5. READY TO EXECUTE NEXT — 바로 돌릴 첫 게이트/dry-run 스텝

> 순서대로. 각 스텝은 이전 통과가 전제. DB 쓰기는 사용자 로컬 실행.

### Step G0 — 백필 5종에 `assertWritable` 가드 추가 (코드, DB 무관)
AGENTS.md 17행 규칙 미적용 상태인 5종에 `assertWritable(affectedPackIds, {allow:ALLOW, dryRun:!APPLY, tool:...})` 추가 (보고6 b):
- `scripts/fill-jp-attacks-types.ts` (무가드, dry-run 있음)
- `scripts/enrich-jp-meta-tcgdex.ts` · `scripts/enrich-sv-meta-tcgdex.ts` (무가드)
- **`scripts/enrich-era-meta-tcgdex.ts` (무가드 + dry-run 없음·즉시쓰기 — 가장 위험, dry-run + 가드 둘 다 신설)**
- `scripts/archive/migration/p3-gamecard.ts` (P3v3 전역, 팩필터 없음 — 전역이라 `--allow-protected` 전제 또는 사후 diff=0 검증으로 대체)

### Step G1 — 베이스라인 세이브 (READ-ONLY 측정)
```
npx tsx .claude/skills/card-check/scripts/check-locale-conservation.ts --save
npx tsx scripts/migration/gate-fk.ts --save pre-enrich
npx tsx scripts/migration/golden-tcgcard.ts            # 베이스라인 박제
bash scripts/migration/g0-golden-check.sh              # git diff src/data/group-*.json == 0 확인
```

### Step G2 — `fill-jp-attacks-types.ts` 파서 4필드 확장 (코드)
`parseWeakResistRetreat()`(약점표 `<table>` 파싱) + `parseAbilities()`(`<h2>特性</h2>` 블록) 추가, 기존 `TYPE_ICON`/`stripTags` 재사용. 신규 수집기/소스 불필요(보고3 §4).

### Step G3 — BF dry-run (비동결 우선세트 1개)
비동결 fully-empty P0 세트(예 `jp-tcg-SVG`, cardPack=`sv-decks`이지만 SV 덱군 비동결)로:
```
npx tsx scripts/fill-jp-attacks-types.ts <gid> <pgCode> SVG     # --apply 없이 dry-run
```
`data/jp-official/jp-svg.json`의 detailUrl(cardID 42779~44523) 직접 사용 → 재스크랩 즉시 가능. dry-run 출력에서 attacks/weakness/retreat/ability 4필드가 채워지는지, 본세트판 effectSig와 수렴할지 샘플 확인(보고3 §3 フシギダネ SVG#001 cardID 44472 = `やどりぎのタネ` damage 20).

### Step G4 — BF apply → recon 증명 (비동결 배치)
```
npx tsx scripts/fill-jp-attacks-types.ts <gid> <pgCode> SVG --apply
npx tsx .claude/skills/card-check/scripts/check-locale-conservation.ts --compare    # 이동 0건 = 매칭 불훼손
npx tsx scripts/migration/gate-fk.ts --compare pre-enrich                            # orphan 0·locale 손실 0
bash scripts/migration/g0-golden-check.sh                                            # 도감 회귀 0
```
비동결 fully-empty **131세트·2,677장**을 이 패턴으로 완주한 뒤에야 CP-1(동결 백필) 승인 요청.

### Step G5 — RK dry-run (collapse 정확치 확정)
WS-B 언어중립 키로 `p3-gamecard.ts`(→P3v3) 수정 후 **dry-run 진단블록**(L118-135 기존 보유) 실행 → 라이브 dex-union/types-흡수 반영한 **실제 collapse 수**(추정 12k–13k 확정) + 동결팩 gameCardId before/after diff 측정. apply는 CP-2 승인 후.

---

### Caveat 종합
1. **단일 "정확수" 없음** — over-split은 키 느슨함에 비례(loose 3,161 / dominant-fold 1,833 / strict A 209). 모호함 없는 정확수 = Track A **209/554** + Track B **209 base/277 null**. effPart raw-damage mirror라 strict 209는 **하한**에 가까움.
2. **collapse 추정 미확정** — 보고4 수치는 라이브 빌더 미재현 근사. 정확치는 RK dry-run(Step G5) 필요.
3. **백필 영향 2,756 = 하한** — name 오염(`<br>`·`[`) 케이스 미포함. fully-empty라고 전부 백필 대상 아님(프로모/시크릿/기본에너지는 빈 게임데이터가 정상 — 세트 성격별 선별).
4. **Track B 132/209 base 모호** — populated gameCardId ≥2라 null을 결정적으로 못 붙임 → 자동 통합 시 추가 종/공격 대조 필요, 형제전무는 새 수집 백로그.
5. **AGENTS.md 본문(31) ≠ 가드 Set(89)** — 가드/측정은 코드 기준. 문서 갱신은 별건.
6. **DB 쓰기·pg_dump·collapse는 사용자 로컬 실행** — 스크립트 준비됨, RK/BF apply 신규 작성 항목 존재.

**핵심 파일(절대경로):**
- `/home/lyyw205/repos/raredoc/scripts/lib/protected-groups.ts` (동결 단일출처 89개)
- `/home/lyyw205/repos/raredoc/scripts/fill-jp-attacks-types.ts` (백필 본체·파서 4필드 확장 대상)
- `/home/lyyw205/repos/raredoc/scripts/enrich-{jp,sv,era}-meta-tcgdex.ts` (무가드 백필, era는 dry-run도 없음)
- `/home/lyyw205/repos/raredoc/scripts/archive/migration/p3-gamecard.ts` (정본 키빌더·P3v3 전역 재빌드)
- `/home/lyyw205/repos/raredoc/scripts/lib/trainer-names.ts` (TR_ALL 사전·canonical 다리)
- `/home/lyyw205/repos/raredoc/scripts/migration/build-art-groups.ts` · `gate-merge.ts` · `gate-fk.ts` · `golden-tcgcard.ts` · `g0-golden-check.sh` · `p5-collapse.ts` · `p5-snapshot.ts` · `p6_5-collision-plan.ts` · `backfill-set-releasedate.ts`
- `/home/lyyw205/repos/raredoc/.claude/skills/card-check/scripts/check-locale-conservation.ts`
- `/home/lyyw205/repos/raredoc/src/lib/services/cardgame.ts` (채용률 dedup) · `/home/lyyw205/repos/raredoc/src/lib/cards/{decklist-gamecard-resolver,sibling-resolver,build-candidate-pool}.ts`
- `/home/lyyw205/repos/raredoc/prisma/schema.prisma` (LogicalCard.gameCardId L151, DeckRecipeCard L842)
- `/home/lyyw205/repos/raredoc/docs/migration/identity-model-migration-plan.md` (§0′ S0~P9 골격·U3 1100행)
- `/home/lyyw205/repos/raredoc/data/jp-official/*.json` (208개 detailUrl 보유 백필 dump)