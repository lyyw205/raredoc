All critical claims confirmed: `MarketStat.cardId` is an unconstrained `String` (729) with no FK — C2's "unverified reference target" is real. `Rarity` has `nameEn/nameJa/nameKo` (880-882) with `cards LogicalCard[]` (887) — C6's region-keyed display and the LogicalCard→CardLocale roll-up count explosion are real. `ExternalIdMapping` has `setGroupId` (938) confirming the 4-site `setGroupId` atomic removal (C1-adjacent, H8). I have everything. Writing the integrated final plan now.

# raredoc 도감 DB 정체성 4계층 이행 — 최종 마이그레이션 계획서 (실행 착수판)

> 작성 기준: `prisma/schema.prisma`(955줄), `scripts/build-group.ts`(1402줄), `src/components/dex/GroupCards.tsx`(515줄, group-json import 174개), `src/data/group-*.json`(206개). 모든 인용은 `(파일:줄)` 형식. 단계 약어 P-1~P9는 PR 시퀀스, Phase A~D는 롤아웃 국면.
>
> **이 판의 변경점(비판검토 반영):** ① **P-1 진단 PR 신설** — 가역·순서를 깨는 무검증 단정(MarketStat.cardId 참조 대상, Conversation/Message 약참조, pokedexNumbers 오저장, unique 충돌행)을 **데이터로 먼저 확정**한 뒤에만 후속 설계를 못박는다. ② **C1 충돌 머지 스텝(P6.5) 격리** — `[gameCardId,setId]`/`[archetypeId,gameCardId]` unique는 roll-up과 정면충돌하므로 별도 선행 마이그레이션으로 분리. ③ **가역성 슬로건 정직화** — "P1~P8 전부 가역"은 거짓. P5 진입 후 art메타 정정분만큼 비가역임을 명시하고 정정 작업을 P5.5로 분리. ④ **dual-write를 복제 시점(P3)부터** 강제(freeze 규칙 명문화). ⑤ 형제매칭 PC-collapse·시세 집계정책·flavorText 사다리·rarity 집계 폭증 가드·골든 재현 패키지·orphan 도구 분리 등 H/M 결함 전수 반영.

---

## 0′. 개정 결정 기록 — 평평 ArtCard + 결정성 형제 리졸버 (2026-06-22, 이 절이 충돌 시 우선)

> 사용자 검토(2026-06-22)로 확정된 방향. **아래 D1~D5 결정과 형제 리졸버 사양은, 본 문서의 §3.1·§3.4·§4.4·§5.3·§5.4·§0.2 와 충돌하는 부분을 대체(supersede)한다.** 근거 수치는 실측(read-only Supabase, project poke) 기준이며 인용은 `(파일:줄)` 또는 `SQL→결과`.
>
> **핵심 통찰(실측):** "어떤 형제를 옆에 보여줄까" 모호성은 **grain 에 달려 있다.** GameCard 그레인에서는 (gc,region) 쌍의 30.6%(11,724쌍)가 후보 2개 이상이고, 그 중 wave-내 모호 케이스의 88.3%가 **같은 setId**(같은 발매일 → 날짜 tie-break 무력)다. 그러나 **현재 per-pack `Card`(@@map LogicalCard) 그레인에서는 동일지역 형제가 2개 이상인 (region,Card) 쌍이 단 93건**(2개 88, 3개 5)뿐이고 **전부 distinct setId·전부 이미지 보유 → 결정성 tie-break 로 100% 해소 가능**. ⇒ **형제 풀은 GameCard 가 아니라 ArtCard(같은 그림) 그레인**으로 잡아야 한다. ArtCard 가 아직 없으므로 **이행 전에는 풀 = 현 `Card.id`(=card.locales, 1:1)**, 병합 후에는 풀 = `artCardId`(cross-pack). 같은 함수가 그대로 확장된다.

### 결정 D1~D5

- **D1 (평평·필드구분):** `ArtCard → RegionCard[]` 평평(공통 cross-region 팩 노드 없음). 각 RegionCard 가 `region·language·setId(지역별 Set)·number·name·image·price` 를 **자기 필드로** 보유 → EN/JP/KR 은 **동등 형제이되 필드로 완전 구분**. (이미 §0.1·§1.4·원칙2 형태 — 본 문서가 이미 충족.)
- **D2 (유연한 검색 묶기):** 정체성이 계층화(Species→GameCard→ArtCard→RegionCard)되고 region 이 필드이므로, 검색/리스트는 **요청 시점에 group-by 레벨 선택** — `artCardId`(같은 그림 1행) / `gameCardId`(게임상 같은 카드 1행=덱슬롯) / region 필터 / `regionCardId`(인쇄본별). DB dedupe 가 아니라 **action/query 계층의 파라미터(`groupBy`)** 로 구현. → §0.2 에 **원칙 6** 추가, §3.4 에 groupBy 주석 추가.
- **D3 (형제 리졸버 — 표시 전용, 단일 함수):** 아래 사양으로 §4.4 `pickRepresentative` 를 대체. 매칭(pickByImage)+렌더가 공유, **시세는 제외(D5).**
- **D4 (CardPackLink = 선택적 정확도/내비 레이어):** 정체성·표시에 **하드 의존 금지.** 용도 = Tier-A 트윈(D3), 합본(merge) 뱃지, 교차지역 "같은 확장팩" 점프, 사이드바 시대정렬·클린명. **불완전 커버리지(84/743 세트 미링크)는 출시 차단 금지** — D3 날짜 폴백이 메움. → §5.4 invariant 를 **차단게이트가 아닌 enrichment 타깃**으로 변경, §5.2(c)·§5.3·§1.5 도 "선택적"으로 reframe.
- **D5 (시세 독립):** `getCardPrices`/덱 시세는 자기 RegionCard 를 잡거나 **ArtCard 전체로 집계** — D3 의 날짜폴백 픽을 **절대 상속 안 함**(엉뚱한 팩 가격은 오해 유발). 집계 그레인 = **ArtCard**(GameCard 아님 — 알트아트/일반판 가격대 분리). → §3.1·§8.2 U9·§4.4 마지막문장의 "price 가 pickRepresentative 재사용" 서술을 **역전**(분리).

### D3 형제 리졸버 사양 (`resolveSibling`, §4.4 대체)

```
resolveSibling(anchorRC, candidateLocales, packLinksForAnchorSet) → RegionCard | { unavailable: true }
  // anchorRC = 클릭된 실물. candidateLocales = anchor 가 속한 ArtCard 의 모든 locale.
  //   (ArtCard 병합 전: 현 Card.id 의 locales = card.locales. 병합 후: artCard.locales.)
  // 대상지역 rT 마다 1장 결정:
  1) 후보풀 = candidateLocales 중 region == rT        // 같은 그림 안에서만 — 다른 그림에서 빌리지 않음
     - 비면 → { unavailable: true } ("이 지역 미발매")
  2) Tier-A (정확 트윈) = 후보 중, Set 이 anchor 의 Set 과 같은 CardPackLink.waveId 에 묶인 것
     - MERGE_N_TO_1 이면 단수 아님(집합). 비면 Tier-B.
  3) Tier-B (폴백) = 후보 전체
  4) 택1 티어 안 tie-break(순서 고정):
     ① image-present desc
     ② pack role: ANCHOR/NATIVE > reprint   // CardPackLink.role, 없으면 anchor 의 primarySet 로 근사
     ③ |Set.releaseDate(cand) − Set.releaseDate(anchorRC.set)| 최소   // "최초"가 아니라 "클릭카드에 최근접"
        · releaseDate ≤ 1996-01-01(=1970 센티넬 30건: JP7·KR23) 은 "불명" 취급 → ③ 건너뜀
     ④ 같은 setId 다중(날짜·이미지·역할 동률, gameCard그레인의 88% 케이스) → number 오름차순(=비시크릿 우선) → 안정 id
```
- 날짜 키는 **`Set.releaseDate`(NOT NULL)** 사용, `CardPack.releaseDate`(nullable 5건)는 금지.
- 후보풀의 "같은 그림"은 ArtCard. **이행 전엔 같은 `Card.id`** 로 대용(자연히 per-pack, 93건만 모호·전부 ④로 해소). **`gameCardId` 로 풀을 넓히지 말 것** — 다른 아트를 섞어 88% 동일세트 모호를 끌어들임.
- `gameCardId` 8.7%(2,684 LC) 누락 → anchor 의 정체성 키가 없으면 **현 Card.id 풀로 폴백**(커버리지 후퇴 금지).

### 구현 슬라이스 순서 (지금 시작)

1. **Slice 1 — `resolveSibling` 순수 함수(읽기전용·스키마 무변경·revert 가역).** `src/lib/cards/sibling-resolver.ts` 신설(위 사양). 4개 분산 picker(`dex-region.ts:261-269` first-wins, `getCardDetail.ts:70-80` byRegion, `queries.ts:114-126` pickLocale, `dex-catalog.ts:97`)를 이 함수로 수렴. `loadCardByLocaleId`/`mapRowToDexCard` select 에 `locales.set.releaseDate` + 앵커 `gameCardId` 추가, 풀=card.locales. **효과: picker 단일화 + 93 모호건 결정화 + cross-pack seam 확보**(아직 cross-pack 형제는 아님 — 그건 Slice 3). `getCardPrices` 는 불변(D5), import 금지 lint/test 추가.
2. **Slice 2 — Set.releaseDate 센티넬 백필(가드된 뮤테이터).** 1970-01-01 30건(JP7·KR23) 을 `data/jp-official`·`data/kr-official`·namu 로 채움. **반드시 `assertWritable()`**(다수가 동결 SV/SM 팩 → `--allow-protected` 체크포인트), dry-run 기본. Set 테이블만(정체성 행 무변경). 사이드바 정렬도 동시 교정.
3. **Slice 3 — cross-pack 같은-그림 그룹(헤드라인 기능). ★방식 확정(2026-06-22 검증 워크플로): 추가형(B)만 — 물리 Card 병합·id 재발급 안 함.** 리졸버는 호출부가 넘긴 풀로 동작하므로(현재 per-pack `card.locales`), Slice 3 은 **그 풀을 cross-pack 아트그룹으로 넓히기만** 하면 된다.
   - **구현:** ▸additive `Card.artFingerprint String?`(pHash 64bit hex, nullable·db push·drop 가역) + `Card.artCardId String?`(그룹 대표 id, 파생) **2개 컬럼만 추가 → 기존 FK 0개 건드림·완전 가역.** ▸offline 멱등 배치 `scripts/migration/build-art-groups.ts`: `RegionCard.imageLarge`(98.2% 커버)로 pHash 계산 후, **같은 gameCardId 안에서** §0′ 병합 3조건(같은 GameCard + pHash Hamming ≤ 임계 + art-불변 메타 무충돌)으로 그룹핑·`artCardId` 부여(이미지 없는 ~1,116·메타 충돌·null pHash → under-merge). ▸리졸버 풀을 `card.locales`→아트그룹 locales 로 **feature flag 뒤에서** 교체(flag off = DB 롤백 없이 차단; cross-pack 풀엔 `anchorGameCardId` 넘기지 않음). **★pHash 라이브러리 없음 → 추가 필요**(`sharp` + 작은 pHash 구현 또는 `image-hash`/`blockhash`).
   - **★P3 v3 키(GameCard de-over-merge)는 이 기능의 전제 아님 — 디커플.** 리졸버는 아트그룹으로 풀링하고 `gameCardId` 는 비활성 옵션 필터(`anchorGameCardId`)라, over-merge 는 **채용률/게임 dedup 정확도만** 해치지 형제표시는 안 깬다(오거폰 4가면은 병합조건 (c) `types` 충돌로 GameCard 상태와 무관하게 자동 4분할). ⇒ P3 v3 apply·물리 Card 병합·id 재발급·`deck-pricing.ts:98-111` "EN명 역추적" 삭제·이미지 dedup `cardId→artCardId`·컬럼 드롭·도감 동결은 **전부 P9 엔드게임으로 이연**(이번 배치에 묶지 않음 — 메모리의 'id 재발급 동반' 지침은 이 기능엔 불필요).
   - **순서(가역성 표기):** [1] Slice 1 커밋(읽기전용·git revert 가역) → [2] `p0-recon-verify.ts:33,48` 수리(드롭된 ArtCard 테이블 SELECT 가드 — 지금 실행 시 에러) → [3] db push: `artFingerprint`+`artCardId` 추가(가역) → [4] build-art-groups **dry-run**(오거폰/Switch/태그팀 샘플 출력) → [5] `check-locale-conservation --save` + `g0-golden-check.sh` before-snapshot → [6] build-art-groups **--apply**(`assertWritable`·동결팩 `--allow-protected`, **컬럼만 씀 — RegionCard.cardId/Card.id 불변**) → [7] conservation `--compare` + golden after(**diff=0** 게이트) → [8] 리졸버 풀 cross-pack 전환(flag on). DEFERRED→P9: 물리 Card 병합·Card.id 재발급·P3 v3 apply·@map 컬럼 드롭·SetGroup/setGroupId 제거·도감 동결.
   - **⚠이력:** 2026-06-11 ArtCard(테이블) 폐기 사유 = 키 `gameCardId|illustrator` 의 폼변종 over-merge(오거폰 4가면→1, 라이브 347 GameCard 가 여전히 type 충돌). **이번엔 그 사고를 병합조건 (c) 메타 가드가 막는다**(P3 v3 가 아니라). Slice 1·2 는 이 모두와 무관(현 per-pack Card 에서 안전).
  - **★Slice 3 병합 판정 기준(확장, 2026-06-22 — over-merge 2중 방어):** 두 인쇄본을 한 ArtCard 로 합치려면 **세 조건 동시 충족**: ▸(구조) 같은 `GameCard` ▸(1차 양성신호) 이미지 pHash 임계 이내 ▸(가드) 아래 *art-불변* 메타가 **충돌하지 않을 것** — 둘 다 값이 있을 때만 비교하고 한쪽 결측은 차단하지 않음, 정규화 후 비교: `illustrator`(대소문자·공백 정규화)·`types`(정렬 집합 — ★오거폰 가면 구분 핵심)·`subtypes`(정렬 집합)·`supertype`·`pokedexNumbers`(집합)·`evolvesFrom`. **하나라도 충돌하면 병합 금지**(같은 GameCard 아래 별 ArtCard 로 둠). 보수적으로 **under-merge 선호**(정당한 같은-그림 둘로 갈리는 손해 ≪ over-merge 로 타입 오표시되는 손해). ▸반대로 reprints 에서 **정당히 갈리는 값**(`rarity`·`number`·이미지 URL·`regulationMark`·`legalities`·hp errata)은 **일치 요구 안 함** — 요구하면 정당한 재판 병합을 막는다. ※이미지는 1차 양성신호, 메타는 음성(충돌) 가드 — 둘이 합쳐져야 예전 "메타 추측 단독" over-merge 와 "pHash 오탐" 양쪽을 막는다.

### 보존(변경 불필요) / 정직성 메모

- `getCardAdoption`(`cardgame.ts:991-1033`)은 이미 `gameCardId` roll-up — **무변경**. `getDecksUsingCard take:n*2`·`normalizeRecipeCardName`(텍스트 정규화) 유지(주석의 "gameCardId 미병합 우회" 문구만 정리).
- `db push` 는 additive 만(no migrations dir, Prisma 7.8). 컬럼 drop/rename 은 P9 격리.
- **솔직히:** Slice 1 단독으로는 "다른 팩의 같은 그림"이 형제로 뜨지 않는다(현 Card 가 팩단위라서). 그 헤드라인 기능은 **Slice 3(추가형 아트그룹 + 풀 확장)** 에서 켜진다(물리 병합 아님). Slice 1·2 는 그 토대 + 즉시 가치(결정성·정렬·picker 단일화).

### ★ 지금 → P9 무손실 전체 실행 로드맵 (2026-06-22 확정 · 목적지=P9 완전 정규화)

> 사용자 확정: **목적지는 P9(평평 collapse·완전 정규화)**, 중간 인간-점검 없음, Slice 들은 **카드 손실 최소화하며 거쳐가는 staging**. ⇒ 인간 점검을 **자동 게이트**로 대체하고 끊김 없이 진행. (검증 워크플로 wwwhg3p23, author+적대적 손실비평)
>
> **게이트 4종(전 단계 통과 필수, 사람 아닌 자동):** ① `recon`=check-locale-conservation(locale 소유권 — cardId 이동 포착, ★FK 테이블 손실은 못 잡음) ② `golden`=g0-golden-check(도감 JSON diff=0) ③ **★G_FK(신설)**=9개 FK 테이블(RegionCard·CardText·CardSpecies·ExternalIdMapping·DeckRecipeCard·Trade·CollectionItem·Ruling) 행수+값 베이스라인/델타(=FK 손실 포착, recon 사각 보완) ④ **★G_MERGE(신설)**=아트그룹 메타 충돌 하드블록(잘못된 병합 자동 차단 = 비가역 전 인간점검 대체).

| # | 단계 | 핵심 작업 | 가역성 | 무손실 게이트 |
|---|---|---|---|---|
| **S0** | 게이트 선작성 | `G_FK`·`G_MERGE` 작성 + `p0-recon-verify.ts:33,48` 드롭된 ArtCard SELECT 에 `to_regclass` 가드 | 가역 | recon 무에러·G_FK 베이스라인 |
| **S1** | Slice1 커밋 + 베이스라인 | sibling-resolver 커밋, recon/golden/G_FK 베이스라인 저장 | 가역 | recon0·golden0·MOVES0·baseline==live |
| **S2** | Slice2 releaseDate | JP 트윈 발매일 백필(Set만, assertWritable) | 가역 | 행수 불변·golden0 |
| **S3a** | Slice3 컬럼+ArtCard | `Card.artFingerprint`+`artCardId`(또는 ArtCard) nullable 추가(additive·FK 0) | 가역 | recon0·행수불변·G_FK Δ0 |
| **S3b** | build-art-groups | **같은 gameCardId 안에서** pHash+메타3조건 그룹핑, NOHASH/충돌=under-merge, 리졸버 풀 flag | 가역 | MOVES0·golden0·**G_MERGE0**·Card당 artCardId 1개 |
| **B** | 덱리스트→GameCard resolver | 외부 Limitless 덱리스트→gameCardId 통일 + `DeckRecipeCard.cardId` 생존자 재바인드(★collapse 전 필수) | 가역 | 채용률 diff0·recon0·non-null→생존자 |
| **P3v3** | P3 v3 키 apply | name+types 키로 GameCard de-over-merge → build-art-groups 재실행 | 가역 | p3 self-verify·G_MERGE0·MOVES0 |
| **P4** | art-meta→ArtCard 복제 | illustrator/types 등 대표 복제(합치 단언) | 가역 | mismatch0·G_FK Δ0 |
| **P8a** | CardText ko 백필 | 병합 대상 전 Card 에 ko CardText 보장 | 가역 | missing-ko0 |
| **P6.5** | unique 사전 dedup **플랜** | CardSpecies(union)·CardText(authority+loser 로그)·ExternalId(dedup) 충돌 사전 해소 플랜 산출 | 가역(until next) | 위반0·union==baseline |
| **SNAP** | 스냅샷+골든 동결 | `pg_dump` + recon/G_FK save + **restore 리허설**(모든 비가역 직전) | 가역 | scratch restore==baseline |
| **P5** | **COLLAPSE** (per-pack Card→ArtCard) | **1 트랜잭션**: 자식 FK 전부 생존자로 repoint→dedup→비대표 Card 삭제하되 **cascade victim 0 단언**(CardText Cascade 주의: 삭제 전 이동). RegionCard.id 불변 | **비가역** | recon0·G_FK 보존·cascade0·RegionCard.id 불변. 실패=SNAP 복원 |
| **P5.5** | region rarity 정정 | 지역별 rarity 표기차 정정(P4 보류분) | **비가역** | RegionCard.id 불변·golden0 |
| **P7** | 읽기 재배선 | 소비처를 collapse 모델로(flag·A/B render diff0) | 가역(until next) | render diff0·recon0 |
| **P8** | ko→CardText 완주 | 표시/효과 2축, READ 전환 | 가역(until next) | dupe0·superset·전 read CardText |
| **P9** | **TERMINAL** | setGroupId/SetGroup 드롭 → 잔여 art-meta 컬럼 드롭 → (**id 재발급=skip 권장**) → 도감 동결 | **비가역** | recon0·RegionCard.id 바이트동일·golden0 |

**collapse 손실 벡터 & 무손실 처리(P5 핵심):** ▸CardText `@@unique[cardId,language]` 충돌 ~2,005 → authority-pick + loser 로그 ▸CardSpecies `@@id[cardId,speciesId]` 충돌 ~2,600 → DISTINCT union ▸ExternalIdMapping `@@unique[sourceId,externalId]` → dedup 후 repoint ▸**★CardText `onDelete:Cascade`** → 비대표 Card 삭제가 텍스트를 cascade 삭제하지 않게 **삭제 전 자식 이동 + cascade victim 0 단언** ▸**RegionCard.id 절대 불변**(Price 61k·MarketStat 60k·카드페이지 URL 이 탐) ▸**id 재발급 skip 권장**(8 FK orphan 위험·가치 낮음, 하면 동일 트랜잭션).

**남은 결정:** pHash 라이브러리(sharp vs image-hash, 골든 위해 결정성) · pHash 임계(under-merge 편향) · CardText errata authority · 관찰 윈도우(크론 1주기) · id 재발급 최종 skip 여부.

**실행 현실:** 코드 작업(S0 게이트·recon수리·S3 스키마/스크립트·B resolver·읽기재배선)은 진행 가능. **DB 쓰기·스냅샷·collapse(--apply/pg_dump)는 DB 접속 필요 → 사용자 로컬 실행**(스크립트는 전부 준비해 둠).

---

## 0. 요약 (Executive Summary)

### 0.0 용어 / 네이밍 규칙 (확정 2026-06-10) — 이 표가 권위

> 기존 `LogicalCard`처럼 추상적인 이름을 직관적으로 교체한다. **이 표가 전 문서의 목표 엔티티 이름을 지배**한다.

| 계층 (뜻) | **확정 이름** | 약어 | 변수·필드 (camelCase + `Id`) | 구 이름(현재 코드/초안) |
|---|---|---|---|---|
| 종 | **Species** | SP | `speciesId` | (신규) |
| 게임상 같은 카드 (덱 4장·룰) | **GameCard** | GC | `gameCardId` | (신규, oracle) |
| 같은 그림 한 장 (cross-pack/region) | **ArtCard** | AC | `artCardId` | 현 `LogicalCard` 승격 (초안 PrintCard) |
| 실물 한 장 (나라·팩별 인쇄본) | **RegionCard** | RC | `regionCardId` | 현 `CardLocale` |
| 카드팩 (발매 묶음) | **CardPack** | CP | `cardPackId` | 현 `SetGroup` (초안 ReleaseWave) |
| 팩 대응표 (JP↔EN↔KR 다대다) | **CardPackLink** | — | `cardPackLinkId` | (신규, 초안 PackCorrespondence) |
| 나라별 세트 | `Set` (유지) | — | `setId` | `Set` |
| 시대 분류 | `Era` (유지) | — | `eraId` | `eras.ts` |

**규칙:**
- **변수/필드는 `모델명(camelCase) + Id`** — 예: `LogicalCard.id` → `ArtCard.id`, `logicalCardId`(소비처) → 의미에 따라 `gameCardId`(게임 dedup) 또는 `artCardId`(시세/이미지). 구 `lcid`·`logicalCardId` 약칭은 폐기.
- **현재 코드명은 인용으로 보존**: 본문에서 `LogicalCard`·`CardLocale`·`SetGroup` 및 `schema:NNN` 인용은 **"지금 코드의 상태"**를 가리키는 것이라 그대로 둔다(아직 rename 전). "현 LogicalCard 승격" = "지금 LogicalCard였던 걸 ArtCard로".
- **본문 약어 브리지**: 일부 구절의 `PC`(=ArtCard), `CL`(=RegionCard)은 초안 약어다. 위 표의 새 약어(AC/RC)로 읽는다. (`PCG` 시대명·`C1~C7` 결함번호·`P0~P9` 단계는 약어 아님 — 혼동 주의.)
- 모델 rename 자체는 **P9 직전 일괄 적용**(`@map`으로 DB 컬럼 물리명은 보존, 코드 식별자만 교체) — 중간 단계는 구명/신명 혼재 가능.

### 0.1 목표 모델 한 그림

```
                    ┌─────────────────────────────────────────────────────────┐
                    │                    Species (SP, 신규)                     │
                    │  id=dex# · nameKo/En/Ja(순수 종명) · 진화체인              │
                    │  ※ 도감 네비/종 이름 전용 — dedup 에 절대 안 씀            │
                    └───────────────▲─────────────────────────────────────────┘
                                    │ N:M (ArtCardSpecies / 태그팀=복수 dex)
                    ┌───────────────┴─────────────────────────────────────────┐
                    │                   GameCard (GC, 신규)                     │
                    │  oracle: supertype(NOT NULL) · name · rules · attacks ·   │
                    │  abilities · hp · weakness · regulationMark · legalities  │
                    │  ※ 덱 4장 제한 · 채용률 · 게임 dedup 의 유일 권위          │
                    │  ※ N개 LogicalCard → 1 GC roll-up (unique 충돌원 — P6.5)  │
                    └───────────────▲─────────────────────────────────────────┘
                                    │ 1:N (ArtCard.gameCardId)
                    ┌───────────────┴─────────────────────────────────────────┐
                    │         ArtCard (PC, = 현 LogicalCard 의미 승격)         │
                    │  '같은 그림 한 장' 정체성 (cross-pack/cross-region)        │
                    │  illustrator · types · artFingerprint · flavorText(EN폴백)│
                    │  ※ 시세 비교 · 이미지 dedup 단위 · id 는 LogicalCard.id 보존│
                    └───────────────▲─────────────────────────────────────────┘
                                    │ 1:N (RegionCard.artCardId, @unique 없음)
                    ┌───────────────┴─────────────────────────────────────────┐
                    │           RegionCard (RC, 실물 — 현 CardLocale)            │
                    │  number · numberInt · image · price · setId(팩태그) +     │
                    │  ★art메타 수령: rarityId(region가변) · subtypes            │
                    │  ※ 시세 숫자 · 이미지 · 번호 · 팩소속이 여기 산다           │
                    └───────────────┬─────────────────────────────────────────┘
                                    │ setId → Set
       ┌────────────────────────────┴──────────────────────────────────────────┐
       │   CardPackLink (PACK, 신규 1급) + CardPack + Era              │
       │   JP팩↔EN세트↔KR세트 다대다 (1:1 / 합본N→1 / 분할1→N / JP단독 / EN단독)  │
       │   ※ "검색범위 좁히는 뼈대" — 카드 정밀배정은 ArtCard(이미지)가 결정    │
       │   ※ 카드 FK 컬럼 부재 = 팩표로 카드 배정 구조적 불가                     │
       └───────────────────────────────────────────────────────────────────────┘
```

### 0.2 핵심 원칙 5개

1. **art-meta는 "변주 축"으로 3분할 (통째로 CL로 내리지 않음).** 같은 그림이면 모든 지역·팩에서 동일한 메타(`illustrator`·`types`·`dex`·`flavor(EN폴백)`)는 **PC 잔류**, 인쇄본마다 갈리는 메타(`rarityId`·`subtypes`·`number`·이미지·가격)는 **CL 하강**, 게임상 동일한 oracle(`hp`·`weakness`·`attacks`·`abilities`·`rules`·`legalities`)은 **GC 상승**. 이 분할이 "연결만 수정"을 깨는 정확한 좌표 — `toRow`(`build-group.ts:1083-1088`)가 dex/illus/subtypes는 `logicalCard.*`에서, number/rarity는 region별로 읽는 비대칭과 일치. **단, rarity는 "art-불변"이 아니다** — `toRow:1085-1087`이 같은 `rarity` 객체에서 region에 따라 `nameJa/nameKo/nameEn`을 골라 뽑으므로, 같은 rarityId도 **region별 표시가 다르고** 인쇄본별 rarity 자체도 갈린다(SR↔SAR). CL 하강 근거는 **이 둘 다**(§1.3 매핑표·C6 반영).

2. **팩소속 직교화.** 팩소속(`setGroupId`)을 LogicalCard·Set에서 떼어 PACK 테이블 + `CardLocale.setId`(물리)로만 표현 → 재포인트가 형제 팩을 비우던 '도둑질'의 *원인* 구조적 제거. `LogicalCard.setGroupId`(`schema:754`) vs `Set.setGroupId`(`schema:23`) 이중경로('다이아몬드') 소멸. **단, `Set.setGroupId`·`LogicalCard.setGroupId`·`SetGroup` 모델·`ExternalIdMapping.setGroupId`(`schema:938`) 4곳은 P9 원자 PR-1에서 동시 제거**(한쪽만 남기면 이중경로 잔존, §7.5).

3. **정체성 PK 보존.** `ArtCard.id = 현 LogicalCard.id`(`schema:753`)를 1:1 승계. 재포인트 표면(Trade·Collection·Deck·Ruling 전체가 `logicalCardId` 참조)의 값을 불변으로 두고 **의미만 GC/PC로 분기** → 마이그레이션이 "FK 폭발"이 아니라 "신규 GC 생성 + 기존 id 의미 재해석". **주의:** 일부 소비처는 unique 제약이 `logicalCardId`를 키로 잡고 있어(`TierEntry@@unique([logicalCardId,setId])` `schema:92`, `DeckCard@@unique([archetypeId,logicalCardId])` `schema:564`), GC로 키를 옮기면 N→1 roll-up이 **unique 충돌**을 일으킨다 → **P6.5 충돌 머지 선행**(C1).

4. **이미지가 PC 경계의 최종 권위.** 작가만으론 부족(디아루가/펄기아 SR 2종·글라디오 동명동일러 다른아트). 같은 그림 판정은 `imageLarge`(`schema:815`) perceptual hash. 다른 아트는 별 PC로 두고 같은 GC 아래. **재수록(같은 지역 복수 인쇄본)은 매칭 입력을 locale이 아니라 "PC 단위(대표 locale 동반)"로 collapse**해야 다중성으로 인한 영구 미연결을 피한다(C5).

5. **비파괴·가역·additive-first — 단, 가역에는 경계가 있다.** P1~P4·P6~P8은 가역(구 컬럼/읽기 잔존). **P5(ArtCard 승격, cross-pack 병합)는 유일한 locale '이동'이라 가역의 분기점** — P5 진입 전까지 P4는 완전 가역이나, **P5 이후 가해지는 art메타 region별 정정(P5.5)분만큼은 비가역**이다. 파괴는 P9에 격리. "P1~P8 전부 가역"이라는 단순 슬로건은 폐기하고 §가역성 표를 정직 표기로 대체(C3).

### 0.3 단계 개요

| Phase | PR | 내용 | 종류 | 가역성 |
|---|---|---|---|---|
| **선결** | **P-1** | **진단 PR — 무검증 단정 실측 확정 (MarketStat.cardId·약참조·dex오저장·충돌행 사전집계)** | **읽기전용 진단** | **무변경** |
| A (섀도) | **P0** | 선결 정규화 (supertype·스테일세트·swap오염·dex오저장) | 파괴적(정규화) | 스냅샷 역적용 |
| A | **P1** | Species 신설 | additive | DROP TABLE |
| A | **P2** | CardPackLink/CardPack 신설 + CONFIG 추출 | additive | DROP TABLE |
| A | **P3** | GameCard 신설 + oracle 묶기 (**dual-write 동시 가동**) | additive(복사+dual-write) | gameCardId NULL+DROP |
| A | **P4** | art메타 *기계적* 복제 (LogicalCard→CardLocale) | 파괴적(복제) | 컬럼 DROP (**P5 이전 한정 완전가역**) |
| A | **P5** | LogicalCard→ArtCard 승격 + cross-pack 병합 | rename+이동 | conservation --revert |
| A | **P5.5** | art메타 region별 정정 (rarity 표기차) | 파괴적(정정) | **정정분 비가역**(정정전 CL스냅샷) |
| A | **P6** | 효과 89% 형제회복 | additive(복사) | source태그 NULL복원 |
| A | **P6.5** | **unique 충돌 머지 (TierEntry·DeckCard GC키 전환 선행)** | **머지(파괴적 집계)** | 머지전 행 스냅샷 |
| B (섀도검증) | — | 골든 diff + 보존가드 3축 + 시세 섀도비교 | 검증 | — |
| C (플래그) | **P7** | 조인 재배선 (읽기 전환) | 읽기전환 | PR revert |
| C | **P8** | *Ko→CardText 마이그 완주 (표시축/효과축 2행 분열) | 읽기이관 | 컬럼잔류 |
| D (폐기) | **P9** | 정리/파괴 (구컬럼·JSON·build-group) | 비가역 | full snapshot만 |

---

## 1. 목표 스키마 전문 (Prisma 스케치)

> 현 `schema.prisma` 대비 변경점을 컬럼별로 명시. `@map`을 활용해 DB 컬럼 rename을 최소화한다.

### 1.1 Species + ArtCardSpecies (신규)

```prisma
// 종(species) — 도감 네비/종 이름 전용. dedup 에는 절대 쓰지 않음(트레이너/에너지는 무종).
// data/pokeapi CSV(11,261행) 기반. 메가/리전폼/Gmax 는 종으로 미분해(subtypes/rules 에 남김).
model Species {
  id            Int      @id              // = National Pokédex number (PokeAPI 권위)
  nameEn        String                    // "Bulbasaur"
  nameJa        String?                   // "フシギダネ"
  nameKo        String?                   // 순수 종명 "이상해씨" — ★fill-kr-names 의 'ex'오염 차단
  generation    Int?
  evolvesFromId Int?
  evolvesFrom   Species?  @relation("SpeciesEvolution", fields: [evolvesFromId], references: [id])
  evolvesTo     Species[] @relation("SpeciesEvolution")
  cards         ArtCardSpecies[]
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([nameKo])
  @@index([nameEn])
}

// ArtCard ↔ Species N:M. 현 LogicalCard.pokedexNumbers Int[] (760) 를 정규화 join 으로 승격.
model ArtCardSpecies {
  artCardId String
  speciesId   Int
  ordinal     Int       @default(0)       // pokedexNumbers[] 순서 보존(태그팀 좌/우)
  printCard   ArtCard @relation(fields: [artCardId], references: [id], onDelete: Cascade)
  species     Species   @relation(fields: [speciesId], references: [id])

  @@id([artCardId, speciesId])
  @@index([speciesId])
}
```

> **시드 권위 충돌 가드(M13):** Species 행은 PokeAPI dex로 시드하지만, 조인 입력인 `pokedexNumbers[]`(`schema:760`)는 **카드 저장값**이고 MEMORY "도감 매핑 감사"에 **SV 카드번호 오저장 1293건**(카드번호를 dex칸에 오저장한 버그) 이력이 있다. P1 조인이 이 오저장 dex를 그대로 끌면 **존재하지 않는 Species 또는 엉뚱한 종에 붙는다.** → **P0에 "pokedexNumbers 오저장 정합성 교정" 스텝을 supertype 정규화와 나란히 추가**(P0.4). 미존재 dex(>11,261 또는 카드번호 범위로 의심)는 조인 보류·플래그.

### 1.2 GameCard (신규, oracle)

```prisma
// 게임상 "같은 카드"(oracle). 아트·지역·팩 무관. 덱 4장 제한·메타 채용률·게임 dedup 의 유일 권위.
// ★N개 LogicalCard 가 1개 GC 로 roll-up — 이게 TierEntry/DeckCard unique 충돌의 근원(P6.5).
model GameCard {
  id              String   @id @default(cuid())
  supertype       String   // ★NOT NULL — 정규화 선결(P0.1). "Pokémon"|"Trainer"|"Energy"
  oracleName      String   // 게임상 카드명(EN 정규, 묶음키). 종명 아님(예: "Charizard ex")
  // ── oracle 능력치/효과 (게임상 동일) ──
  hp              Int?
  retreatCost     Int?
  weakness        String?
  resistance      String?
  evolvesFrom     String?              // 카드텍스트상 진화원(SP 진화체인과 별개)
  evolvesTo       String[]
  abilities       Json?                // [{ name, text, type }]
  attacks         Json?                // [{ name, text, cost?, damage? }]
  rules           String[]             // 묶음키 일부
  // ── 게임 포맷/합법성 (덱 4장·포맷 권위) ──
  regulationMark  String?              // 묶음키 일부
  legalities      Json?                // { standard, expanded, unlimited }
  // ── 역관계: 게임단위 집계가 전부 여기로 ──
  printCards      ArtCard[]          @relation("ArtCardGameCard")
  deckCards       DeckCard[]           @relation("DeckCardGameCard")
  deckRecipeCards DeckRecipeCard[]     @relation("DeckRecipeCardGameCard")
  tierEntries     TierEntry[]          @relation("TierEntryGameCard")
  rulings         Ruling[]             @relation("RulingGameCard")
  texts           CardText[]           @relation("CardTextGameCard")
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@unique([supertype, oracleName, regulationMark])  // 같은 oracle 2행 생성 차단(보수적)
  @@index([supertype])
  @@index([oracleName])
  @@index([regulationMark])
}
```

### 1.3 ArtCard (= LogicalCard 의미 승격)

```prisma
// 한 장의 그림(아트) 정체성. 같은 그림의 모든 지역·모든 팩 인쇄본을 거느림.
// '같은 그림' 최종판단은 이미지(작가만으론 부족 — 글라디오/디아루가 함정).
model ArtCard {
  id             String   @id @default(cuid())  // ★현 LogicalCard.id(753) 그대로 보존
  gameCardId     String                          // ★신규 FK: 이 아트가 속한 oracle
  gameCard       GameCard @relation("ArtCardGameCard", fields: [gameCardId], references: [id])
  // ── 아트 불변 메타 (같은 그림 = 모든 지역/팩 동일) — PC 잔류 ──
  illustrator    String?                         // 현 769. link-en-orphans bk 키·toRow 가 아트단위로 사용
  types          String[] @default([])           // 현 763. (oracle 변주 드뭄 → 여기 단독, GC 미보유)
  artFingerprint String?                         // ★신규: 이미지 perceptual hash. '같은 그림' 권위
  flavorText     String?                         // ★EN 대표 1개(invariant: PC당 1). 폴백 최하위(H9 사다리)
  // ── 역관계 ──
  species        ArtCardSpecies[]
  locales        CardLocale[]                    // 같은 지역 복수 인쇄본 허용(CL unique 없음)
  texts          CardText[]       @relation("CardTextArtCard")
  collectionItems CollectionItem[] @relation("CollectionItemArtCard")
  trades         Trade[]          @relation("TradeArtCard")
  externalIds    ExternalIdMapping[] @relation("ExternalIdMappingArtCard")
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@unique([gameCardId, artFingerprint])          // 같은 아트 중복 PC 차단(NULL distinct → 미해시 공존)
  @@index([gameCardId])
  @@index([illustrator])
}
```

> **미해시 dedup 구멍 가드(M14):** `@@unique([gameCardId, artFingerprint])`는 Postgres NULL distinct 규칙상 **미해시(artFingerprint=NULL) PC가 무제한 중복 생성 가능**하다. P5에서 이미지 해시 실패분(작은 이미지·결측 imageLarge)이 전부 NULL이면 dedup이 **아예 안 걸린다.** → **미해시 PC는 sentinel 해시 `"NOHASH:" + gameCardId + ":" + normalize(illustrator) + ":" + dexKey`로 채워** 폴백 유니크를 강제(NULL 방치 금지). pHash 성공분만 진짜 해시.

**컬럼 거주지 매핑표** (현 `LogicalCard` → 목표):

| 현 LogicalCard 컬럼 | 줄 | 목표 거주지 | 근거 |
|---|---|---|---|
| `id` | 753 | **PC.id (보존)** | 재포인트 표면이 이 id 참조 → 값 불변 |
| `setGroupId` | 754 | **드롭** → PACK + CL.setId | 직교화(원칙2). S1·S9·S10·ExternalId와 원자 제거 |
| `primarySetId`/`primaryNumber` | 756-759 | **CL.setId/number** ↓ | 실물 번호로 흡수 |
| `pokedexNumbers` | 760 | **PC→SP join** | §1.1 (P0.4 오저장 교정 선행) |
| `supertype` | 761 | **GC** ↑ (정규화) | oracle 분류 |
| `subtypes` | 762 | **CL로 하강** ↓ | SR↔SAR·메커니즘 평행 |
| `types` | 763 | **PC** | 아트 불변(GC 중복회피) |
| `hp` | 764 | **GC** ↑ | oracle 능력치 |
| `retreatCost`/`weakness`/`resistance` | 765-767 | **GC** ↑ | oracle |
| `regulationMark` | 768 | **GC** ↑ | legalities 키 |
| `illustrator` | 769 | **PC** | 같은 아트=같은 작가(`link-en-orphans:19`) |
| `evolvesFrom`/`evolvesTo` | 770-771 | **GC** ↑ | 카드텍스트(SP 체인과 별개) |
| `abilities`/`attacks`/`legalities`/`rules` | 772-775 | **GC** ↑ | oracle 효과 |
| `flavorText` | 776 | **PC** (EN폴백, PC당 1) + CardText | 인쇄/아트별, 읽기 사다리 H9 |
| `rarityId` | 777 | **CL로 하강** ↓ | **① region별 표시 분기(`toRow:1085-1087`) ② 인쇄본별 rarity 상이(RR↔SAR)** |
| `nameKo/attacksKo/abilitiesKo/rulesKo/flavorTextKo` | 779-784 | **CardText로 이관 후 제거** | §1.7, 표시축/효과축 2행 분열(H11) |

### 1.4 CardLocale (유지 + art메타 수령)

```prisma
// 실물 한 장(physical printing). 시세 숫자·이미지·번호·팩태그가 산다.
model CardLocale {
  id            String      @id                    // = 기존 Card.id (803). MarketStat 참조대상 P-1 확정필요
  artCardId   String      @map("logicalCardId")  // ★현 logicalCardId(804) — @map 으로 컬럼 rename 회피
  printCard     ArtCard   @relation(fields: [artCardId], references: [id])
  gameCardId    String?                             // ★신규(P3 백필→NOT NULL): 게임집계 직접 조인용
  gameCard      GameCard?   @relation(fields: [gameCardId], references: [id])
  language      String      // "en" | "ja" | "ko"
  region        String      // "EN" | "JP" | "KR"
  setId         String                              // 물리 발매판(팩소속 유일 경로)
  set           Set         @relation("CardLocaleSet", fields: [setId], references: [id])
  number        String                              // ★art-meta 수령: primaryNumber(758) 하강처
  numberInt     Int?                                // ★P4 백필 필수(M15): parseInt(number.replace(/\D/g,"")) 재계산
  name          String                              // 결측 0% — 매칭키 완비
  // ── ★art-meta 수령 슬롯 ──
  rarityId      String?                             // 현 LogicalCard.rarityId(777) 하강 (region가변 — P5.5 정정대상)
  rarity        Rarity?     @relation("RarityLocale", fields: [rarityId], references: [id])
  subtypes      String[]    @default([])            // 현 762 하강
  flavorText    String?                             // 인쇄본별 플레이버(813 유지) — H9 사다리 중간순위
  imageSmall    String?                             // 이미지 dedup 실측 단위(814)
  imageLarge    String?                             // PC '같은 그림' 판단 권위 입력(815)
  // ── 시세·역관계 ──
  prices          Price[]            @relation("PriceCardLocale")
  marketStats     MarketStat[]       @relation("MarketStatLocale")  // ★FK 명시화 — 단 P-1 참조확정 후에만
  collectionItems CollectionItem[]   @relation("CollectionItemLocale")
  trades          Trade[]            @relation("TradeLocale")
  externalIds     ExternalIdMapping[] @relation("ExternalIdMappingLocale")
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt

  // unique 제약 없음 유지 — 평행팩(SV2D/SV2P)·레터서브셋(15_A/15_B)·복수팩 재수록.
  // '도둑질'은 unique 로 못 막음(이동=단일 update) → check-locale-conservation 게이트로 검증.
  @@index([artCardId])
  @@index([setId, number, language])
  @@index([setId])
  @@index([region])
  @@index([rarityId])                               // 신규(art-meta 하강 쿼리용)
}
```

> **`hp`/`types`는 CL이 수령하지 않는다** — hp는 GC(oracle), types는 PC(아트). art메타를 "통째로 CL"로 내리는 단순 이해를 정정하는 핵심.
>
> **rarity 집계 폭증 가드(C6):** `rarityId`가 CL로 내려오고 `Rarity.cards`가 `LogicalCard[]`(`schema:887`)→`CardLocale[]`(S13)로 바뀌면, **rarity별 카드수 집계/정렬이 "아트 1장"(LogicalCard) 기준에서 "인쇄본 N장"(CardLocale) 기준으로 region배수 폭증**한다. dex 사이드바·검색의 rarity 필터가 "아트 1장"을 세던 곳이면 카운트가 부푼다. → **P7 rarity 집계 소비처(§3.4 `cl.rarity`로 바꾸는 줄들)는 전수 "PC당 1 rarity가 정상인지" 확인하고, 아트 단위 카운트가 필요한 곳은 `groupBy`에 `distinct artCardId` 강제.** §6.1 I-rarity 게이트로 측정.

### 1.5 CardPackLink + CardPack + Era (신규 1급)

```prisma
model Era {
  key     String @id            // "MEGA","SV","S",... (eras.ts:9-27 흡수)
  order   Int    @unique
  labelKo String                // "MEGA (메가신화)" (eras.ts:31-49)
  waves   CardPack[]
}

// 발매 웨이브 = 형제 매칭의 1순위 단위. 현 SetGroup 의 그룹키가 사실상 이것.
model CardPack {
  id            String   @id    // = 기존 SetGroup.id (slug, "sv-base")
  eraKey        String
  era           Era      @relation(fields: [eraKey], references: [key])
  nameKo        String?
  nameEn        String?
  nameJa        String?
  jpAnchorOrder Int?            // null = EN단독/JP단독
  releaseDate   DateTime?
  packs         CardPackLink[]
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([eraKey, jpAnchorOrder])
}

// 웨이브↔지역세트 다대다. build-group CONFIG(29-1067) 의 jp/kr/enNative/krMirror 통합.
// "검색범위를 좁히는 뼈대"일 뿐 — 정밀 카드배정은 ArtCard(이미지 최종권위)가 담당.
// ★카드 FK 컬럼 부재 = 팩표로 카드를 배정하려야 못 함(구조적 경계 강제).
model CardPackLink {
  id            String   @id @default(cuid())
  waveId        String
  wave          CardPack @relation(fields: [waveId], references: [id], onDelete: Cascade)
  region        String      // "JP" | "EN" | "KR"
  setId         String?     // → Set. CROSS(enNative:null) 는 NULL 허용
  set           Set?        @relation("PackSet", fields: [setId], references: [id])
  role          String      // ANCHOR|NATIVE|MERGED|MIRROR|CROSS|EN_ONLY|KR_ONLY|JP_ONLY
  relationType  String      // ONE_TO_ONE|MERGE_N_TO_1|SPLIT_1_TO_N|EN_ONLY|JP_ONLY|KR_OVERFLOW
  mirrorOfSetId String?     // krMirror{kr→jp} 대체
  mirrorOfSet   Set?        @relation("PackMirror", fields: [mirrorOfSetId], references: [id])
  numberMirrors Boolean  @default(false)  // krMirrorAll 대체(정수번호 완전미러)
  note          String?                   // CONFIG 인라인 주석·guide 근거 이관
  createdAt     DateTime @default(now())

  @@unique([waveId, region, setId])         // 합본 N→1 은 region 다른 row 로 표현
  @@index([waveId])
  @@index([setId])
  @@index([region, role])
}
```

### 1.6 Set / SetGroup 정리

```prisma
model Set {
  id            String   @id
  name          String
  nameKo        String?
  nameJa        String?
  series        String
  releaseDate   DateTime
  cardCount     Int
  logoUrl       String?
  symbolUrl     String?
  region        String   @default("EN")
  code          String?                       // 지역 팩 코드(PACK 입력)
  // ★제거(P9 원자 PR-1): setGroupId(23)·setGroup(24)·primarySetForLogical(26) — '다이아몬드' 해소
  localeCards   CardLocale[]         @relation("CardLocaleSet")
  packsAsSet    CardPackLink[] @relation("PackSet")
  packsAsMirror CardPackLink[] @relation("PackMirror")
  tierEntries   TierEntry[]
  pullRates     PullRate[]
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([series])
  @@index([releaseDate])
  @@index([region])
  // ★제거(P9): @@index([setGroupId])(34)
}
// ★SetGroup 모델 완전 제거(P9 원자 PR-1) → CardPack 가 대체. era 분류(eras.ts)는 CardPack.era 로 보존.
```

### 1.7 CardText (FK 재지정 — 효과축/표시축 이원)

```prisma
model CardText {
  id          String   @id @default(cuid())
  // ★재지정: logicalCardId(843) → gameCardId(효과축) | artCardId(표시축: name/flavor)
  // ★앱검증(U7): gameCardId XOR artCardId — 정확히 하나만 채움(Prisma CHECK 미지원)
  gameCardId  String?
  gameCard    GameCard? @relation("CardTextGameCard", fields: [gameCardId], references: [id], onDelete: Cascade)
  artCardId String?
  printCard   ArtCard? @relation("CardTextArtCard", fields: [artCardId], references: [id], onDelete: Cascade)
  language    String                           // "ko" | "en" | "ja" | "zh"
  name        String?                          // 표시축(artCardId 행)
  attacks     Json?                            // 효과축(gameCardId 행)
  abilities   Json?                            // 효과축
  rules       String[]                         // 효과축
  flavorText  String?                          // 표시축(인쇄/아트별)
  source      String   @default("auto")        // official_kr|namuwiki|pokemon_dict|tcgdex|pokemontcg_io|auto
  confidence  Float    @default(1.0)
  verifiedAt  DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([gameCardId, language])              // 효과축 (GC당 1행으로 dedup — P8 GC머지 필요)
  @@unique([artCardId, language])             // 표시축
  @@index([gameCardId])
  @@index([artCardId])
  @@index([language])
}
```

> **1→2 행 분열 명세(H11):** 현 `*Ko`는 한 LogicalCard에 `nameKo`(표시명)+`attacksKo/abilitiesKo/rulesKo`(효과)가 **한 묶음**(`schema:780-784`). CardText로 옮기면 **표시명→artCardId 행, 효과→gameCardId 행**으로 쪼개져 한 LogicalCard가 **2개 CardText 행**을 낳는다. 효과축은 **GC당 1행으로 dedup**(N LogicalCard→1 GC)되어야 하므로 `migrate-nameko-to-cardtext.ts`가 **GC 단위로 attacks/abilities/rules를 머지(형제 중 source/confidence 권위 1개 선택)**해야 한다. 현 부분실행(11,442건)은 logicalCard 단위라 GC 머지 미수행 → P8 재작성 범위는 "완주"가 아니라 **"GC축 재설계 + 표시/효과 2축 분리"**.

### 1.8 재포인트 FK 의미 전환표 (전 소비 모델)

| 모델(현 줄) | 현 FK | 목표 FK | 변경 | unique | 충돌위험 |
|---|---|---|---|---|---|
| `Price`(58-60) | cardLocaleId | cardLocaleId | **무변경** | — | 없음 |
| `MarketStat`(727-743) | **cardId(FK없는 평문 `:729`)** | **P-1 진단 후 결정**(CL or PC) | **참조대상 미확정 — 무단정 금지** | `[cardId,date]`(741) | **C2** |
| `TierEntry`(80-95) | logicalCardId+setId, `@@unique([logicalCardId,setId])`(92) | **gameCardId+setId** | GC 이전 | **`[gameCardId,setId]` — roll-up 충돌** | **C1/P6.5** |
| `Trade`(100,102) | localeId+logicalCardId | localeId(CL)+**artCardId(PC)** | 시장 dedup=PC | `[localeId,soldAt,tier,source]`(113) 유지 | 없음 |
| `CollectionItem`(195,196) | localeId+logicalCardId | localeId(CL)+**artCardId(PC)** | 도감 아트 dedup=PC | — | 없음 |
| `DeckCard`(557) | logicalCardId, `@@unique([archetypeId,logicalCardId])`(564) | **gameCardId** | GC | **`[archetypeId,gameCardId]` — roll-up 충돌** | **C1/P6.5** |
| `DeckRecipeCard`(529) | logicalCardId? | **gameCardId?** | GC | `[archetypeId,region,cardName,setCode,number]`(532) 유지 | 없음(cardName키) |
| `Ruling`(706) | logicalCardId? | **gameCardId?** | GC(룰=oracle) | — | 없음 |
| `ExternalIdMapping`(935-938) | cardLocaleId/logicalCardId/setId/**setGroupId(938)** | cardLocaleId/**artCardId**/**gameCardId**/setId/**waveId** | 슬롯 분기 | `[sourceId,externalId]`(950) 유지 | setGroupId→waveId는 S1 원자(P9) |
| `Conversation.sourceCardId`(435)·`Message.attachedCardId`(451) | 평문 String | **P-1 진단 후 결정** | 약참조 — **CL.id/LC.id 미확정** | — | **M16** |

---

## 2. 단계별 마이그레이션 (PR 단위)

> 각 PR: **목적 / 선행조건 / 백필 / 검증 / 가역성 / 완료판정**. 순서 한눈: **P-1 진단 → P0 선결 → P1 Species → P2 PACK → P3 GameCard(+dual-write) → P4 art메타 복제 → P5 ArtCard 승격 → P5.5 art정정 → P6 효과회복 → P6.5 unique 충돌머지 → P7 조인 재배선 → P8 *Ko→CardText → P9 정리.**

### P-1 — 진단 PR (읽기전용, 무변경) ★신규

**목적:** 후속 설계가 "단정"으로 못박은 4개 무검증 가정을 **데이터로 확정**. 결과에 따라 §1.4/§1.8/S12 시점·대상이 바뀌므로 **반드시 가장 먼저**.
**선행조건:** 없음.
**진단 항목(전부 읽기 SQL/스크립트, DB 변경 0):**

1. **MarketStat.cardId 참조 대상(C2):**
   ```sql
   -- ① CL.id 안 가리키는 행 수
   SELECT count(*) FROM "MarketStat" ms WHERE NOT EXISTS (SELECT 1 FROM "CardLocale" cl WHERE cl.id = ms."cardId");
   -- ② LogicalCard.id 가리키는 행 수
   SELECT count(*) FROM "MarketStat" ms WHERE EXISTS (SELECT 1 FROM "LogicalCard" lc WHERE lc.id = ms."cardId");
   ```
   **판정:** ①=0이면 cardId=CL.id → S12 "localeId FK 명시화" 유효. ①>0이면 LC/혼합 참조 → FK 대상은 PC, S12 대상·시점 **재작성**(P5 이후). **이 결과 전에는 §1.4 `marketStats` 관계·§1.8 MarketStat 행·S12를 확정으로 적지 않는다.**

2. **Conversation.sourceCardId / Message.attachedCardId 참조 대상(M16):** 위와 동형 `NOT EXISTS` 쿼리로 CL.id인지 LC.id인지 실측. P5에서 id 의미가 LC→PC로 승계되므로 둘 중 무엇을 가리키는지 확정 후 §3.6 약참조 주석 결정.

3. **unique 충돌행 사전집계(C1, P6.5 입력):**
   ```sql
   -- TierEntry: GC키 전환 시 충돌할 (gameCardId,setId) 그룹  ※ gameCardId는 P3 매핑 dry-run 테이블 조인
   SELECT te."setId", m.game_card_id, count(*) AS n
   FROM "TierEntry" te JOIN gc_map m ON m.logical_card_id = te."logicalCardId"
   GROUP BY te."setId", m.game_card_id HAVING count(*) > 1;
   -- DeckCard: (archetypeId, gameCardId)
   SELECT dc."archetypeId", m.game_card_id, count(*) AS n
   FROM "DeckCard" dc JOIN gc_map m ON m.logical_card_id = dc."logicalCardId"
   GROUP BY dc."archetypeId", m.game_card_id HAVING count(*) > 1;
   ```
   (P3 dry-run의 `gc_map` 임시테이블 사용.) **출력=P6.5 머지 대상 명세.** 0이면 P6.5는 no-op로 통과하나 생략은 금지(게이트 유지).

4. **pokedexNumbers 오저장 규모(M13):** `pokedexNumbers[]`에 11,261 초과값/카드번호 의심값 보유 LogicalCard 수 집계 → P0.4 교정 작업량 산정.

**가역성:** 무변경(읽기전용).
**완료판정:** 4개 항목 수치 확정 + 각 항목의 후속 설계 분기 결정 기록(§1.4/§1.8/S12/§3.6/P0.4/P6.5에 반영).

### P0 — 선결: 결정적 정규화 (묶기 키 오염 제거)

**목적:** GC/PC 묶기 키의 오염원 4건 제거. 전부 재수집 없이 DB-state UPDATE.
**선행조건:** **P-1 완료**(오저장 규모·충돌행 확정).

#### P0.1 supertype 정규화 — hard blocker

- **백필:** ① `UPDATE LogicalCard SET supertype='Pokémon' WHERE supertype='Pokemon'` (1,819건, 전부 `lc-orphan-*` 출처 `create-jp-set-limitless.ts:60`). ② NULL 1,238건: dex 있으면 'Pokémon', `locale.name`이 트레이너/에너지 사전 매칭이면 해당값 추론 백필 (1,224건이 KR-only 오펀 `apply-kr-official.ts:488`).
- **검증:** 376종 양철자 동시존재 → 통일 후 0. no-accent 잔존 0.
- **가역성:** 변경 전 `(id, supertype)` 스냅샷 CSV. 롤백 = 역적용.
- **완료판정:** `SELECT DISTINCT supertype` = {Pokémon, Trainer, Energy, 추론불가 잔여}. no-accent 0.
- **왜 hard blocker:** 376개 dex가 두 철자에 분열 → 정규화 없이 GC를 묶으면 1,819건이 형제풀에서 누락, "89.4% 효과 형제회복"(P6) 전제가 깨짐.

#### P0.2 스테일 트윈 세트 45쌍 — ★삭제 아니라 "시세 병합"(dry-run 2026-06-10 발견)

> **★★ 지뢰(dry-run 실측, `p0-2-stale-sets-dryrun.ts`):** bare 유령 로케일에 **Price 19,397행**이 매달려 있다. 단순 삭제 시 시세 19,397행 소실/FK차단. bare↔twin은 **같은 물리 카드의 중복 RegionCard**이므로 P0.2는 *삭제*가 아니라 **병합**: ① Price(19,397) bare→twin 재포인트 ② CollectionItem(5) 재포인트 ③ 그 후 bare 제거. **MarketStat 16,509 레거시 id와 동일 뿌리(시세 레이어가 옛 set-id 네임스페이스 사용)** → 시세 id 리맷 트랙과 묶어 처리 권장. **일부 쌍 locale 수 불일치**(sm1 173/172·sm10 238/234 등)로 twin에 짝 없는 bare 로케일 존재 → 그 Price는 단순 재포인트 불가(번호매칭+잔여처리 별도 dry-run 필수). **선결 dry-run 통과 전 삭제 금지.**

- **백필(검증된 규모):** bare-EN(setGroupId NULL) ↔ `en-tcg-<id>` 트윈 **정확히 45쌍 / 6,522 locale / CollectionItem 5 / Trade 0 / 고아LC 0**(실측 일치). + **Price 19,397 재포인트(신규)**. ② Price·CollectionItem 재포인트 후 bare 세트·LC·CardLocale 제거. 빈 껍데기 2개(sm5/sm75)·빈 그룹 og-sma 동시 제거.
- **★CONFIG 정합 동시처리(H8):** 삭제하는 45쌍이 `build-group.ts:29-1067` CONFIG에 `enNative`/`krMirror` 등으로 **등장하는지 먼저 grep**하고, 등장분은 **CONFIG에서도 동시 제거(코드+데이터 원자 커밋)**. 안 하면 P2 왕복 동등성 검증이 "CONFIG는 가리키는데 데이터 없음"으로 깨진다. 대안: **P2 왕복 골든을 P0.2 삭제 *전* CONFIG 산출로 동결**(둘 중 하나 필수).
- **수동검증:** 15쌍 수 드리프트 — 삭제 전 트윈이 superset인지 locale 수 비교.
- **보존가드:** `check-locale-conservation --save` → 삭제 후 `--compare`로 "의도 6,522 외 손실 0" 증명.
- **가역성:** 삭제 전 45세트 dump(JSON). 트랜잭션 단위.
- **완료판정:** bare-EN+트윈보유 0쌍. collection 5건 유효 LC 가리킴. **삭제 세트가 CONFIG에 잔존 참조 0.**

#### P0.3 nameKo swap 오염 905건 감사

- **백필:** `nameKo ≠ CardText.name` genuine 905건 중 swap 교차오염("유채의 활기"↔"찬석")을 `source`/`confidence`로 권위 결정 — official_kr=1.0 우선, pokeapi=0.95는 베이스종이라 카드 표시명엔 부적합.
- **수동검증:** swap 의심쌍은 이미지 1:1 대조(자동 불가).
- **가역성:** 감사 결과를 별도 정정 테이블로 기록, nameKo 컬럼은 P8 전까지 미변경(읽기 영향 0).
- **완료판정:** swap 905 전수 분류(정정/양성/보류). **"swap 0건" 게이트** 통과 — 보류분은 P8 차단 목록에 등재(미통과 시 P1/P3 묶기 진입 금지: SP/GC가 오염명으로 묶임).

#### P0.4 pokedexNumbers 오저장 교정 ★신규(M13)

- **백필:** P-1.4가 집계한 오저장(카드번호를 dex칸에 넣은 SV 패턴 등) 정정. MEMORY "도감 매핑 감사"의 PokeAPI 권위로 dex 재배정, 11,261 초과/범위이탈 값은 조인 보류·플래그.
- **검증:** 교정 후 `pokedexNumbers` 전 원소가 유효 Species id 범위 내(또는 명시 보류).
- **가역성:** 정정 전 `(id, pokedexNumbers)` 스냅샷.
- **완료판정:** P1 조인이 끌어올 dex 중 미존재 Species 매핑 0(보류분 제외).

### P1 — Species 신설 (순수 additive)

- **목적:** 종 네비/종명 전용 축. dedup 미사용.
- **선행조건:** **P0.3(swap 0건 게이트)**·**P0.4(dex 오저장 교정)**.
- **백필:** ① Species 행 = `data/pokeapi` CSV 11,261행에서 시드(dex+3국 종명). **nameKo는 pokeapi 베이스 종명으로 시드 — `LogicalCard.nameKo`(접미사 오염 2,806건)에서 시드 금지.** ② 조인 = `LogicalCard.pokedexNumbers[]`(`schema:760`, P0.4 교정본) 펼쳐 각 dex→Species 매핑. 트레이너/에너지는 조인 0행.
- **검증:** pokedexNumbers 비어있지 않은 LogicalCard의 99%+가 ≥1 Species 조인 보유.
- **가역성:** `DROP TABLE Species, ArtCardSpecies`. 완전 가역.
- **완료판정:** 메가/리전폼/Gmax는 pokeapi 베이스 dex로만 조인(폼 구분은 subtypes/rules 잔류).

### P2 — CardPackLink/CardPack 신설 (additive, CONFIG 추출)

- **목적:** 팩 대응표 1급화. 팩↔정체성 직교화 토대.
- **선행조건:** **P0.2(스테일 트윈 정리 + CONFIG 정합)** — 안 하면 `swsh1`/`en-tcg-swsh1` 양쪽 등록돼 dedup 깨짐 + 왕복 동등성 붕괴(H8).
- **백필:** `build-group.ts:29-1067` CONFIG 206키를 행으로 추출(`scripts/extract-pack-correspondence.ts` 신규). 플래그→관계 변환:
  - `jp:[다중]`→ANCHOR/MERGE_N_TO_1, `enNative:[다중]`→NATIVE/SPLIT_1_TO_N, `enNative:null`→CROSS, `enNative:[]`→JP_ONLY, `enAnchor`→EN_ONLY.
  - `krMirror{kr→jp}`(`build-group.ts:33`)→`mirrorOfSetId`, `krMirrorAll`→`numberMirrors`.
  - `enMerged`/`krMerged`/`enCrossFallback`은 **테이블 미수록** — "DB에 이미 LC병합됐는지"라는 데이터 상태(ArtCard 정체성이 흡수). **단 흡수는 P5에서야 일어나므로(M17), 이 플래그는 P2 왕복 동등성 검증에서 "P5 후 재검증" 디퍼드 항목으로 명시** — P2 동등성이 이들을 무시하면 검증이 실제보다 느슨.
  - `Set.setGroupId`(`schema:23`)·`LogicalCard.setGroupId`(`schema:754`)는 *아직 안 건드림*(병렬 신설).
  - `canonEra()`(`eras.ts:80-82`) 1회 적용해 Era 테이블 시드.
- **수동검증(커버리지 공백):** ① CONFIG 부재 29 SetGroup(Trainer Gallery·KR프로모 6그룹 863 LC·EX9)을 명시 row 추가. ② `jp-tcg-M-P`(og-jp-mega-promo) 누락 보강.
- **왕복 동등성 검증:** 기존 CONFIG로 group-*.json 굽고, 추출 테이블에서 `(jp[],kr[],enNative[],krMirror,krMirrorAll)`를 재구성해 CONFIG와 deep-equal. **불일치 0(enMerged류 디퍼드 제외).**
- **가역성:** `DROP TABLE CardPackLink, CardPack, Era`. CONFIG는 P9까지 코드 잔존(안전망).
- **완료판정:** JP 281/281 세트 커버(M-P 포함). 29 CONFIG-부재 그룹 전부 row 보유.

### P3 — GameCard 신설 + 묶기 (additive + dual-write 동시)

- **목적:** 게임상 같은 카드 = 덱 4장·채용률·룰의 유일 권위.
- **선행조건:** **P0.1(supertype 정규화) — hard blocker.** **P0.3(swap 0건).**
- **백필:** ① `GameCard{ supertype, oracleName, rules, regulationMark, legalities, ... }` 신설. ② `LogicalCard.gameCardId String?`(nullable FK) 신규 컬럼 추가, 기존 oracle 스칼라(`schema:761,764-775`)는 *복사*. ③ `CardLocale.gameCardId` 백필. ④ 묶기 키 = `정규화(name) + rules[] + supertype + regulationMark` 클러스터링. **트레이너/에너지(무종)도 이름으로 충분히 묶임**(rules 53% 결측이나 묶기엔 이름 충분).
- **★dual-write 동시 가동(C4):** **복제하는 순간(=지금)부터 oracle 스칼라는 dual-write/freeze.** 복사만 하고 6주 방치하면 P6이 GC에 회복분을 넣는 동안(P6~P7 윈도우) 교정 스크립트가 LogicalCard 원본을 건드려 GC↔LC가 양방향 갈라지고 P7 읽기전환 시 권위 충돌. → **운영 규칙 명문화: P3~P7 구간 LogicalCard oracle 컬럼(761,764-775) 직접 UPDATE 금지, 모든 교정은 GameCard에만.** 가능하면 애플리케이션 dual-write 어댑터로 강제(트리거 또는 write-through). 이 규칙을 CLAUDE.md/card-check SKILL.md에 등재.
- **수동검증:** regulationMark 75.6% 결측(구세대 정상, `schema:768`)이라 묶기 키에서 결측은 와일드카드 취급. 동명 다른효과(재판 너프) 충돌은 rules 차이로 분리, 애매하면 별 GameCard("미연결>오연결").
- **보존가드:** GC 카운트 sanity — DeckCard/DeckRecipeCard/TierEntry/Ruling가 가리키는 distinct logicalCardId 수 ≥ 매핑될 distinct gameCardId 수(묶임으로 감소만). **이 매핑테이블(`gc_map`)을 영속화해 P-1.3/P6.5 충돌집계 입력으로 재사용.**
- **가역성:** `gameCardId=NULL` 일괄 + `DROP TABLE GameCard`. 완전 가역.
- **완료판정:** 모든 비-orphan LogicalCard가 gameCardId 보유. 같은 name+rules 클러스터가 단일 GameCard로 수렴(채용률 분열 통합 dry-run 확인). **freeze 규칙 가동 확인.**

### P4 — art메타 *기계적* 복제 (LogicalCard → CardLocale, 파괴적 핵심)

- **목적:** ArtCard cross-art 승격(P5)의 충돌 제거. "연결만 수정"을 깨는 가장 큰 마이그레이션.
- **선행조건:** P3 완료(oracle 메타는 이미 GameCard로 복사 → 여기선 *art메타만* 이전).
- **백필(순수 기계적, C3):** ① CardLocale에 art메타 수령 슬롯 신설 — `rarityId`(현 777)·`subtypes`(762). `number`(810)는 이미 존재(primaryNumber 758 수령처). **`numberInt` 재계산 백필 포함(M15):** `parseInt(number.replace(/\D/g,""))` 폴백으로 결측 0 보장(정렬 깨짐 방지). ② 각 LogicalCard의 art 스칼라를 그 LogicalCard의 *모든* locale에 **부모 값 그대로 복사**(현재 1 LogicalCard = 1 print-family라 art메타 균일 → 안전). ③ `Rarity.cards LogicalCard[]`(`schema:887`) 역관계도 `localeCards CardLocale[]`로 재배선 준비(컬럼 추가만, 구 관계 잔류). **`illustrator`·`hp`·`types`는 CL에 안 내림** — illustrator/types는 PC(P5), hp는 GC(P3).
- **★region별 rarity 정정은 여기서 하지 않는다(C3):** "EN Ultra Rare vs JP rank차" 같은 region별 표기 정정은 **P5.5로 분리.** P4는 순수 기계적 복제로만 묶어 가역성(원본 스칼라 ↔ CL 복제본 동기)을 보장.
- **보존가드:** art메타는 *복사*라 locale 이동 0. art메타 완전성 검사: 복사 후 모든 CardLocale이 부모 LogicalCard와 동일 rarity/subtypes 보유(누락 0). numberInt 결측 0.
- **가역성:** 신규 컬럼 DROP. 읽기는 여전히 `LogicalCard.*`(P7 전까지 미전환) → **P5 진입 전까지 완전 가역.**
- **완료판정:** 67,115 CardLocale 전부 art메타 컬럼 채움(결측 = 부모 결측분과 동일: subtypes 0.3%). numberInt 결측 0.

### P5 — LogicalCard → ArtCard 승격 (rename + cross-pack 병합)

- **목적:** 같은 그림 한 장의 모든 지역·모든 팩 인쇄본을 거느림 = 시세 비교·이미지 dedup 단위.
- **선행조건:** P4(art메타가 CL로 내려가 PC 스칼라 충돌 없음) + P2(CardPackLink가 형제 매칭 웨이브 뼈대).
- **백필(2단계):**
  - **(a) 1:1 승계:** 모든 기존 LogicalCard → 동명 ArtCard(id 동일). cross-pack 미통합(현 print-family 그대로). `CardLocale.logicalCardId`는 `@map`으로 컬럼 유지, 필드명만 `artCardId`로(의미 전환).
  - **(b) cross-pack 병합(이미지 권위):** 같은 GameCard 아래 `dex+정규화일러+이미지`로 "같은 그림" ArtCard 병합. **build-group의 fpP/formKey/ampN 지문로직(`build-group.ts:1094-1117`)을 이 1회성 클러스터링에 동원**(빌드시점 추정→DB 영구정체성으로 졸업). `artFingerprint` 컬럼을 imageLarge 해시로 채움(미해시는 sentinel, M14).
- **★형제매칭 PC-collapse(C5):** cross-pack 매칭 입력을 **"locale 리스트"가 아니라 "PC 리스트(대표 locale 동반)"**로 둔다. 같은 그림이 같은 지역 복수 팩에 재수록되면(§1.4 허용) raw pool의 `byHash.length≥2`가 정상 상태가 되어 매칭이 영구 null로 떨어진다(SV 재수록·하이클래스 합본에서 흔함, MEMORY sv2·sv3 합본 이력). → 이미 같은 `artCardId`로 묶인 복수 locale은 **1개 후보로 collapse**한 뒤 매칭. `pickByImage`와 `pickRepresentative`(§4.4)가 **동일한 PC-collapse 입력**을 쓰도록 통일(두 함수가 같은 다중성에 다른 정책 쓰는 것 금지).
- **수동검증(이미지 최종권위, 가장 중요):** dex+일러 일치해도 `imageLarge` 1:1 대조로 최종 확정. 디아루가/펄기아 SR 2종·글라디오 함정. CardLocale 진성중복 51건(전부 kr-* 이미지 상이)도 흡수: 같은그림=같은PC, 다른그림=분리. `scripts/audit-printcard-cohesion.ts`(신규)로 pHash 클러스터 일관성 자동 적발 → 사람 판정.
- **보존가드:** **여기가 conservation 게이트의 핵심.** cross-pack 병합은 locale을 한 ArtCard로 *이동*(unique 없는 FK 재배정 = 도둑질 위험). `check-locale-conservation --save`(전) → `--compare`(후): "의도 병합 외 형제 팩 안 비워짐" 증명. **cross-pack 병합 본체는 신규 `merge-printcard-by-art.ts`(정상 LC 전체 대상)**, `link-en-orphans-by-art.ts`(lc-orphan+JP-less 한정)는 **orphan 입양에만 존속**(orphan 가정 JP-less를 정상 카드에 전이 금지, H10).
- **가역성:** (a) id 승계라 자명 가역. (b) conservation `--revert`. **단 P5.5 정정 진입 후엔 art메타 정정분만큼 비가역**(C3). 미전환 읽기는 P7까지 구 경로.
- **완료판정:** cross-pack 재수록본이 한 ArtCard 산하 복수 CardLocale로 통합. `getCardPrices` artCardId 묶음이 EN+JP+KR 다팩 통합 dry-run.

### P5.5 — art메타 region별 정정 (rarity 표기차) ★신규(C3)

- **목적:** P5에서 서로 다른 부모를 가졌던 locale들이 한 PC 밑으로 모인 뒤, region별 rarity 표기차("EN Ultra Rare" rank6 vs JP rank8)를 정정. **P4에서 분리한 이유:** 정정을 P4 안에서 하면 원본 스칼라와 CL 복제본이 갈라져 P5 revert가 P4 직후 상태를 못 복원.
- **선행조건:** P5(b) 병합 완료.
- **백필:** `toRow:1085-1087`이 region별로 뽑던 표기 규칙을 1회 적용해 CL.rarityId/표기 정정. **정정 전 CL.rarity 스냅샷(`(cardLocaleId, rarityId)`)을 먼저 남긴다.**
- **가역성:** **정정분만큼 비가역** — 스냅샷으로 P5.5 직후까지만 복원 가능(P4 직후로는 불가). 가역성 표에 정직 표기.
- **완료판정:** 같은 PC 내 region별 rarity 표기 일관성 검사 통과. 정정 스냅샷 보관.

### P6 — 효과 89% 형제회복 (additive 보강)

- **목적:** 포켓몬 효과(attacks+abilities 둘다無) 15.9%(4,986) 중 89.4%(4,459) 회복. 진짜 막힘 527(1.7%) 잔존.
- **선행조건:** **P3(GameCard)** — 형제회복 단위가 GameCard. **P0.1(supertype) 필수** — no-accent 1,819 누락 시 89% 전제 붕괴. P5와 병렬 가능.
- **백필:** 효과 결측 LogicalCard마다 같은 GameCard(=같은 dex+subtypes+name+rules) 형제 중 attacks/abilities 보유분에서 복사. 결측 집중: SP특수상품군 100%·SV 36% 우선. **회복분은 GameCard.attacks/abilities에 기록**(C4 freeze 규칙 하에 — LC 원본 미변경, GC만 적재).
- **수동검증:** 진짜 막힘 527(형제 전무) — 새 수집 백로그로 분리. 같은 GameCard인데 효과가 형제마다 다르면(재판 너프) reg마크/세트로 분기.
- **보존가드:** 회복분에 `source='sibling_recover'` 태깅. 회복 카운트: 4,986 → ≤527. **GC↔LC 갈라짐 점검: P3 freeze 규칙 하에 LC oracle 무변경 확인.**
- **가역성:** 태깅 일괄 NULL 복원.
- **완료판정:** 포켓몬 효과 결측 ≤1.7%. 잔존 527 백로그 등재.

### P6.5 — unique 충돌 머지 (TierEntry·DeckCard GC키 전환 선행) ★신규(C1)

- **목적:** `TierEntry@@unique([logicalCardId,setId])`(`schema:92`)→`[gameCardId,setId]`, `DeckCard@@unique([archetypeId,logicalCardId])`(`schema:564`)→`[archetypeId,gameCardId]` 전환은 **N→1 roll-up과 정면충돌**해 DDL/백필 시점 **unique violation으로 트랜잭션이 깨진다.** I4 sanity("before≤after")로는 안 잡힘 — **DDL 전에 충돌행을 머지**해야 함. **읽기전환(P7) 안에 숨기면 롤백 단위가 오염**되므로 별도 선행 PR로 격리.
- **선행조건:** P3(gc_map 확정)·P-1.3(충돌행 사전집계). P7 직전.
- **백필:** P-1.3이 집계한 `GROUP BY ... HAVING count>1` 충돌 그룹마다 **머지 로직 적용** — 어느 행을 살리고 어느 수치를 합칠지:
  - `TierEntry`: 같은 `(gameCardId, setId)` 충돌행은 **티어/카운트 수치 머지**(채용률·점유 SUM 또는 최댓값 규칙 확정 후 1행 잔존).
  - `DeckCard`: 같은 `(archetypeId, gameCardId)`(같은 oracle의 두 인쇄본, 예: 다른 팩 기본에너지) 충돌행은 **수량 합산**(take/count SUM)해 1행.
  - 머지 규칙(SUM vs MAX vs 권위행 선택)을 그룹 유형별로 명시하고, 머지 전 **원본 충돌행 전수 스냅샷.**
- **검증:** 머지 후 `GROUP BY (gameCardId,setId)`/`(archetypeId,gameCardId)` HAVING count>1 = **0**(DDL 안전 확인). 합산 수치 sanity(머지 전 SUM == 머지 후 단일행 값).
- **가역성:** 머지 전 충돌행 스냅샷으로 복원(파괴적 집계라 스냅샷 필수).
- **완료판정:** 충돌행 0. P7에서 `@@unique` GC키 전환이 violation 없이 통과 가능.

### P7 — 조인 재배선 (읽기 전환, 소비처별 독립 PR)

- **목적:** 소비처를 구 `LogicalCard.*` 경로에서 새 4계층으로 전환. (상세 표는 §3)
- **선행조건:** P3·P4·P5·P5.5·P6·**P6.5(충돌 머지 — unique GC키 전환 전 필수)** 완료. 소비처별 독립 PR로 격리.
- **백필:** 데이터 무변경(읽기 경로만 전환). dual-write 유지. **unique 제약 GC키 전환(`[gameCardId,setId]`/`[archetypeId,gameCardId]`)은 P6.5 충돌 0 확인 후에만.**
- **검증:** 각 PR마다 **구/신 경로 결과 diff = 0** 회귀 테스트. **rarity 집계 소비처는 PC당 1 rarity 가정 확인 + `distinct artCardId` 강제(C6).**
- **가역성:** PR 단위 revert.
- **완료판정:** §3 매트릭스 전 항목 전환. deck-pricing EN명역추적(`deck-pricing.ts:103-111`) 삭제. dex 이원렌더(`DexCatalog.tsx:1216`) 단일 ArtCard 렌더러로 통합. 구 `LogicalCard.setGroupId`/art스칼라 읽기 0건(grep 확인). 캐시 1회 `revalidateTag("dex-catalog")`(`dex-catalog.ts:191`). **freeze 규칙 해제 가능(읽기가 GC/PC로 전환됨).**

### P8 — *Ko → CardText 마이그레이션 완주 (읽기 이관)

- **목적:** overlay `*Ko`(`schema:779-784`)를 CardText로 일반화(주석 838-839 명시 예정작업).
- **선행조건:** **P0.3(swap 905 감사, swap 0건 게이트) 완료** — 보류분이 CardText로 들어가면 GC/SP가 오염명으로 묶임. P3·P5 완료(CardText FK를 GC/PC로 재지정).
- **백필(2축 분열, H11):** `migrate-nameko-to-cardtext.ts` **GC축 재설계** — 부분실행(11,442) 외 나머지 ~10,900건. **표시축 행(artCardId: name/flavorText) + 효과축 행(gameCardId: attacks/abilities/rules) 2행 생성.** 효과축은 **GC당 1행으로 dedup**(N LogicalCard→1 GC, 형제 중 source/confidence 권위 1개 머지). source/confidence 권위: official_kr=1.0 > namuwiki > pokeapi(0.95). 카드명(CardText.name, artCardId)과 종명(Species.nameKo) 이원화 — "ex"접미사 카드명은 CardText, 순수종명은 P1 Species.
- **수동검증:** 불일치 1,386 중 genuine 905 보류분 케이스별 확정.
- **보존가드:** CardText FK→GC/PC 재지정 후 `@@unique([gameCardId,language])`+`[artCardId,language]` 재정의 — 중복 0. **앱검증 gameCardId XOR artCardId(U7).**
- **가역성:** *Ko 컬럼은 P9 전까지 잔류(읽기만 전환).
- **완료판정:** 전 *Ko 데이터가 CardText에 존재. 읽기 단일권위. **불일치 0을 축별 분리 측정**(name은 printCard축, attacks는 gameCard축).

### P9 — 정리/파괴 (시퀀스 종착, 비가역)

- **목적:** §7 정리 계획 실행. **이 PR만 파괴적·비가역.**
- **선행조건:** P-1~P8 전부 완료 + 운영 안정성 관찰(읽기 전환 후 회귀 0).
- **가역성:** **비가역.** 이 PR 전 full DB snapshot 필수.
- **완료판정:** §7 표의 전 항목 제거. CardPackLink/Species/GameCard/ArtCard 4계층이 유일 권위.

### 가역성·보존가드 요약 (정직 표기 — C3 반영)

| 단계 | 종류 | 가역성 | 핵심 보존가드 |
|---|---|---|---|
| **P-1** | **읽기전용 진단** | **무변경(자명)** | 4개 단정 실측 확정 |
| P0 | 파괴적(정규화) | 스냅샷 역적용 | conservation(P0.2+CONFIG정합), 이미지대조(P0.3), dex범위(P0.4) |
| P1 | additive | DROP | 불필요 |
| P2 | additive | DROP | 왕복 동등성(enMerged류 디퍼드) |
| P3 | additive(복사+dual-write) | gameCardId NULL+DROP | GC카운트≤distinct logicalCardId + **freeze 규칙 가동** |
| **P4** | **파괴적(복제)** | **컬럼 DROP — P5 진입 전 완전가역** | art메타 완전성(누락0)+numberInt(결측0) |
| **P5** | **rename+이동** | **conservation --revert (P5.5 전까지)** | **conservation 게이트+이미지권위+PC-collapse** |
| **P5.5** | **파괴적(정정)** | **★정정분 비가역 — 정정전 CL스냅샷까지만** | region별 rarity 일관성 |
| P6 | additive(복사) | source태그 NULL복원 | 회복카운트(≤527)+GC↔LC 무변경 |
| **P6.5** | **파괴적(집계 머지)** | **머지전 충돌행 스냅샷** | **머지후 충돌행=0(DDL안전)+합산 sanity** |
| P7 | 읽기전환 | PR revert | 구/신 diff=0 + rarity distinct artCardId |
| P8 | 읽기이관 | 컬럼잔류 | unique재정의 중복0(2축 분리) |
| **P9** | **비가역** | **full snapshot만** | 운영회귀0 관찰후 |

> **핵심 불변식(정직판):** P1~P4·P6~P8은 가역(구 컬럼/읽기 잔존). **가역의 분기점은 P5** — P5.5 art정정과 P6.5 집계머지가 들어가는 순간 "정정·머지분만큼" 비가역이 된다. 파괴 격리는 P9이나, **P5.5/P6.5는 P9 이전의 부분 비가역 지점**이므로 각각 전용 스냅샷이 안전망. "P1~P8 전부 가역"이라는 단일 슬로건은 폐기.

---

## 3. 코드 재배선 표 (소비처 before→after)

> 라우팅: **시세=실물(region별 CL) · 이미지/시세비교=PC · 게임집계=GC · 종브라우즈=SP**.

### 3.1 시세 (ArtCard 비교 + CL 숫자) — 집계정책 명시(H12)

| 소비처(파일:줄) | before | after | 계층 |
|---|---|---|---|
| `getCardPrices.ts:29-39` | `findUnique(...).logicalCardId` → `findMany({where:{logicalCardId}})` | `.artCardId` → `findMany({where:{artCardId}})` + **region·pack 그리드 반환** | PC(비교)+CL(숫자) |
| `deck-pricing.ts:98-111` | EN명 역추적(`name in (...)`+MODERN_SET_PREFIXES) | **삭제** — PC가 cross-pack Price 자동통합 | PC 통합 |
| `deck-pricing.ts:114-124` | `logicalCard.rarity` 배치조회 | `cardLocale.rarity`(art메타 하강) | CL |
| `deck-pricing.ts:153-172` | `byPrint = Map<lcId>` | `Map<artCardId>` (변수명이 이미 의도 노출) | PC |
| `market.ts:213-264,344` | `cardLocaleId`, `MarketStat.cardId=?`(`schema:729`) | **P-1.1 확정 후 결정** (CL.id이면 FK명시화 유지) | CL/PC(미확정) |
| `gamification.ts:78-82,104-111` | `locale.prices` 최신 1건 | **유지** | CL |
| `collection.ts:119` | `locale.prices[...]` | **유지** | CL |

**★시세 집계 정책(H12 — §3.1 필수 명세):** PC 묶음 전환으로 같은 PC 아래 JP/EN/KR + 복수 팩 가격이 섞인다(Phase B에서 가격행 *늘면* 정상). 출력 형태를 다음으로 확정:
- `getCardPrices`/`deck-pricing` 출력 = **(region, pack) 그리드** 보존 + **region별 대표 1가** 파생.
- 대표가 선택은 **§4.4 `pickRepresentative`와 동일한 우선순위 함수를 재사용**(이미지 대표와 가격 대표가 다르면 UI 불일치). 같은 region 내 복수 팩(재수록) 가격은 대표 1팩 가격을 표시값으로, 나머지는 펼침.
- Phase B 섀도비교 게이트 강화: "가격행 늘면 정상"이 아니라 **"늘되 집계 후 단일 표시값은 이전 범위와 동등"**까지 검증.

### 3.2 게임집계 (GameCard)

| 소비처(파일:줄) | before | after | 계층 |
|---|---|---|---|
| `cardgame.ts:241-255` | `DeckCard.logicalCardId` | `gameCardId` (**P6.5 머지 후**) | GC |
| `cardgame.ts:563-584` `getCardAdoption` | `groupBy(["logicalCardId"])` | `groupBy(["gameCardId"])` — 재수록 분열 해소 | GC |
| `cardgame.ts:801-826` `getTopAdoptedCards` | `Map<logicalCardId>` | `Map<gameCardId>` | GC |
| `cardgame.ts:838-866` `getDecksUsingCard` | `take:n*2 //인쇄판중복`(`:843`)+`byArch`(`:846-850`) | GC 묶음으로 **우회 삭제** | GC |
| `cardgame.ts:874-905` `getNewSetDecks` | `newLcIds`+EN locale | `CardLocale.setId`(신팩=CL권위) | CL |
| `cardgame.ts:1190-1204` `getRulings` | `Ruling.logicalCardId` | `gameCardId` | GC |
| `TierEntry`(schema:82,92) | `logicalCardId+setId`, unique(92) | `gameCardId+setId`, unique 재정의 (**P6.5 충돌머지 필수**) | GC |
| `DeckCard`(schema:557,564) | `logicalCardId`, unique(564) | `gameCardId`, unique 재정의 (**P6.5 충돌머지 필수**) | GC |

### 3.3 이미지/도감 dedup (ArtCard)

| 소비처(파일:줄) | before | after | 계층 |
|---|---|---|---|
| `cardgame.ts:449-477` `resolveLogicalCardImages` | `Map<logicalCardId>` KR>JP>EN | `gameCardId`→대표 PC→대표 CL(2-hop) | PC |
| `collection.ts:162-179` addItem | CL→`logicalCardId` 복사 | CL→`artCardId` | PC |
| `cards/page.tsx:70-137` dedup | `Map<logicalCardId>` KR>JP>EN | `artCardId`(아트별) 또는 `gameCardId` | PC/GC |
| `Trade.logicalCardId`(schema) | print-family | `artCardId`(시장 dedup) | PC |
| `CollectionItem.logicalCardId`(schema) | print-family | `artCardId`(도감 아트 dedup) | PC |

### 3.4 art메타 읽기 전환 (CL/PC/GC 3분할) — rarity 폭증 가드(C6)·flavor 사다리(H9)

| 소비처(파일:줄) | before | after | 계층 |
|---|---|---|---|
| `queries.ts:390-456` `logicalCardToTCG` | LC 스칼라 전부 | `(pc,gc,cl)` 3분할: art→cl, oracle→gc, dex→sp, **flavor 사다리** | 분기 |
| `queries.ts:249-266` `loadCardByLocaleId` | `logicalCard.locales[]` | `printCard.locales[]`(지역판 탭 cross-pack) | PC |
| `queries.ts:344-384` `searchLogicalCards` | `where.setGroupId`+`rarity.code` | `CL.setId`+`CL.rarityId` (**rarity 카운트는 distinct artCardId**) | CL |
| `dex-catalog.ts:36-40,99-117` | `lc.types/supertype/rarity` | `pc.types`+GC join+`cl.rarity` (**rarity 집계 distinct artCardId**) | CL/PC/GC |
| `cardgame.ts:110-115` `resolveDeckCardMap` | `logicalCard.types/hp/supertype` | 표시=CL/PC, 게임메타=GC | CL/PC/GC |

**★flavorText 읽기 사다리(H9 — 3중 저장 단일권위화):** flavorText는 PC(776, EN폴백 PC당1)·CL(813, 인쇄본별)·CardText(다언어) 3곳 존재. **읽기 우선순위 사다리를 명시:** `CardText[lang].flavorText` → `CL.flavorText`(해당 인쇄본) → `PC.flavorText`(EN 폴백). PC.flavorText는 **PC당 1개 invariant**(§1.3 주석). §6.1 I2 체크섬은 이 사다리 기준 "표시 결과값"을 검증(어느 컬럼을 보는지 모호성 제거).

### 3.5 팩소속 직교화 ('도둑질' 발원지 제거)

| 소비처(파일:줄) | before | after | 계층 |
|---|---|---|---|
| `queries.ts:306-329` `loadCardsByGroup` | `findMany({where:{setGroupId}})` 논리경로 | `CardLocale.where({setId∈웨이브})`+`groupBy(artCardId)` | CL→PC묶음 |
| `dex-catalog.ts:18-35` | `setGroup→logicalCards` include | `setGroup→PackMapping→sets→CardLocale→artCardId` | CL→PC |
| `searchCards.ts:36` | `setGroupId: params.setId` | `CardLocale.setId`+PackMapping | CL |

### 3.6 종 브라우즈 (Species) + 유지(무변경) + 약참조(P-1 확정)

- **→ SP:** `pokedexNumbers`(LC 스칼라배열) → `ArtCardSpecies` N:M. 종 네비, nameKo 종명. **dedup 미사용.**
- **유지(무변경):** `api/trades.ts:48-78`(실물만), `market.ts` 전체(단 cardId 참조는 P-1.1), `collection.ts:229-294`(setId 진척), `gamification.ts:67-118`(setId 집계), `eras.ts` 분류체계, `pickLocale`(`queries.ts:110-122`, 입력만 `PC.locales[]`).
- **약참조(P-1.2 확정 후):** `Conversation.sourceCardId`(`schema:435`)·`Message.attachedCardId`(`schema:451`) 평문 — **CL.id인지 LC.id인지 P-1.2로 실측 후** 주석 명시. P5 id 의미전환(LC→PC) 시 가리키는 대상이 CL이면 무영향, LC면 PC.id로 의미 승계(값 불변).

---

## 4. dex 렌더 전환안

### 4.1 현 이원경로 (전환 마찰점)

`/dex`는 **두 데이터 파이프라인 공존**:
- **경로1(DB 런타임):** `dex/page.tsx:21 getDexCatalog` → `dex-catalog.ts:191 unstable_cache(buildDexCatalog,["dex-catalog"],{revalidate:3600})` → `SetGroup → logicalCards(논리경로) → locales` → 사이드바.
- **경로2(빌드타임 JSON):** `build-group.ts`가 `src/data/group-*.json`(206개) 생성 → `GroupCards.tsx:4-177`이 **174개 하드코딩 import** → `DATA`(`:181-356`) → `GROUPED_GROUP_IDS`(`:357`).
- **합류:** `DexCatalog.tsx:1216 GROUPED_GROUP_IDS.has(set.id)` 삼항.

### 4.2 정적 vs 런타임 비교 (2GB 셀프호스트 SSR 제약 핵심)

| 축 | ① 정적 JSON | ② 런타임 DB+cache |
|---|---|---|
| 빌드 메모리 | 전 그룹 DB로딩 → WSL OOM 이력 | 가벼움 |
| 런타임 메모리(2GB) | 206개 JSON 번들 상주 → **상수 RSS 증가** | 요청 그룹만 캐시, revalidate 후 GC |
| 갱신 지연 | 카드 1장 교정도 풀빌드 재배포 | `revalidateTag("dex-group:<id>")` 1줄 |
| 드리프트 | 174 import vs 206 JSON = 32개 누락(구조적) | DB 단일권위, 0 |
| first-load | 즉시 | 첫 요청 캐시미스 지연 |

### 4.3 권고: **후보 ② (런타임 DB + 그룹별 캐시 태그)**, 단계적

**근거:** (1) 2GB 제약 — 정적 JSON 206개 상주 vs 런타임 캐시 요청분만(OOM 환경 직접 이득). (2) 갱신 비용 — 카드 교정이 일상(커밋 로그 "감사 18건 교정")이라 `revalidateTag` 그룹 단위 무효화가 운영 부합. (3) 드리프트 32개 구조 소멸.

> **Next.js 주의(AGENTS.md):** `unstable_cache`/`revalidateTag` API는 이 레포의 Next.js 버전에서 시그니처가 다를 수 있다. **구현 착수 전 `node_modules/next/dist/docs/`의 캐싱 가이드를 먼저 확인**(Cache Components/`use cache`/`cacheTag`로 대체됐을 가능성). 아래 스케치는 의도 표현이며, 실제 API는 docs 확인 후 확정.

**캐시 설계(의도 스케치 — docs 확인 후 API 확정):**
```ts
const getGroupCards = (groupId: string) =>
  unstable_cache(
    () => loadGroupArtCards(groupId),
    ["dex-group", groupId],
    { revalidate: 3600, tags: [`dex-group:${groupId}`, "dex-all"] },
  )();
// 사이드바(가벼운 메타)는 별도: unstable_cache(buildDexSidebar, ["dex-sidebar"], {tags:["dex-all"]})
// 교정 스크립트 말미: revalidateTag(`dex-group:${id}`)
```
**SSR 메모리 가드:** 그룹 본문 쿼리 `select` 최소화(이미지 URL·번호·rarity코드만, JSON 효과는 상세패널 lazy). 사이드바는 카운트만.

### 4.4 anchor 스키마 3슬롯 깨기 — PC-collapse 통일(C5)

현 `Anchor = {jp,en,kr,dex}`(`GroupCards.tsx:360`)는 "지역당 1장" 박제 → 목표:
```ts
type Anchor = { artCardId: string; gameCardId: string;
  byRegion: Record<"JP"|"EN"|"KR", Locale[]>; species: number[] };
```
한 PC가 같은 지역 복수 인쇄본을 거느리므로 region이 배열. 대표 1장 선택 `pickRepresentative`(시세 대표 선택과 **동일 함수 재사용** — §3.1 H12):
```ts
function pickRepresentative(locales: CL[], preferred: Region): CL {
  return locales.filter(l => l.region === preferred).sort((a,b) =>
    (hasImg(b)-hasImg(a)) ||                         // ① 이미지 보유 우선
    (roleRank(a.setId)-roleRank(b.setId)) ||         // ② ANCHOR/NATIVE 팩 우선(재수록보다 원본)
    ((a.set.releaseDate?.getTime()??Inf)-(b.set.releaseDate?.getTime()??Inf))  // ③ 발매 빠른쪽
  )[0] ?? locales[0];
}
```
`GroupCards.tsx:456 cur=a[active]` 단일픽 대체. 상세패널(`DexCatalog.tsx:470 activeVariant`)은 (region, pack) 복합픽으로 전 인쇄본 노출. **매칭(`pickByImage`)·렌더(`pickRepresentative`)·시세(§3.1)가 같은 PC-collapse 입력·같은 우선순위를 공유**(세 곳 정책 분기 금지).

### 4.5 이원렌더 통합 (전환 단계)

1. 런타임 PC 렌더러를 비그룹 팩에 먼저 적용(이미 DB경로).
2. 그룹 본문도 런타임 전환 + `DexCatalog.tsx:1216` 삼항 제거.
3. JSON·174 import·build-group 폐기(P9).

**드리프트 선처리(★Week 0로 앞당김 — C7):** 206 JSON − 174 import = 32개(`og-adv*`/`og-e*`/`og-pcg*`/`og-vs1` 등) 사이드바엔 뜨나 본문 폴백. **렌더 의도 확정을 P7이 아니라 Week 0(G0 골든 동결과 동시)에 완료** — 골든 동결 자체가 Week 0 항목인데 드리프트가 미해결이면 골든이 오염된 채 동결("원래 빈 화면" vs "이행 회귀" 판별 불가). Week 0에 32개 전수 "본문 노출 의도/폴백 의도" 사람판정.

---

## 5. 팩 대응표 1급화 + 수집 완성

### 5.1 두 책임 물리적 분리 (핵심 명제)

`build-group.ts`는 한 함수에서 **거시(팩 대응, fact)** + **미시(카드 정밀배정, inference)**를 융합. CardPackLink가 거시를 DB 1급으로 들어올려 미시(이미지)와 직교화.

### 5.2 경계 강제 3장치

| 장치 | 메커니즘 |
|---|---|
| **(a) 카드 FK 부재** | CardPackLink 스키마(§1.5)에 `cardLocaleId`/`logicalCardId` 컬럼 **없음** → 팩표로 카드 배정 구조적 불가 |
| **(b) artCardId ⊥ setId** | 정체성(`CardLocale.artCardId`)과 팩소속(`CardLocale.setId`) 별 컬럼 → 재포인트가 팩 멤버십 안 건드림 |
| **(c) candidatePool은 set-level만** | STEP A가 `setId:{in}`까지만 필터, 카드 선택은 STEP B(이미지) |

### 5.3 매칭 2단 분리 — PC-collapse 적용(C5)

```ts
// STEP A — candidatePool (거시, CardPackLink 유일 입력)
function candidatePool(jpCard, region): PrintCandidate[] {
  const wave = waveOf(jpCard);                          // CardLocale.setId → PC → wave
  const rows = pc.where({ waveId: wave.id, region });
  const pool = rows.some(r => r.role === "CROSS")
    ? globalByDex(jpCard.species)                       // enNative:null
    : cardLocale.where({ region, setId: { in: rows.map(r=>r.setId) } });  // 정상: 범위 제한
  return collapseByArtCard(pool);                     // ★C5: locale → PC 단위(대표 locale 동반)
}
// STEP B — pickByImage (미시, 이미지 유일 권위 — PC 단위 입력)
function pickByImage(jp, pool: PrintCandidate[]): PrintCandidate | null {
  const byHash = pool.filter(c => imgHashClose(c.repImageLarge, jp.imageLarge));
  if (byHash.length === 1) return byHash[0];            // PC-collapse 후엔 재수록도 1개로 수렴
  const linked = pool.find(c => c.artCardId === jp.artCardId);
  if (linked) return linked;
  return null;  // 미연결 > 오연결
}
```
**CI 린트:** `candidatePool()`에서 imageLarge/illustrator 참조 금지, `pickByImage()`에서 CardPackLink/setId 쿼리 금지. **추가 린트:** `pickByImage` 입력이 PC-collapse를 거쳤는지 타입(`PrintCandidate`)으로 강제 — raw `CardLocale[]` 전달 금지(C5 회귀 방지).

### 5.4 수집 완성 = 커버리지 100%

**불변식:** 모든 Set이 ≥1 CardPackLink 행, 모든 행(setId≠null)이 ≥1 CardLocale.
```sql
-- 공백 A: 팩표에 있으나 카드 0 (수집 필요)
SELECT pc.* FROM "CardPackLink" pc LEFT JOIN "CardLocale" cl ON cl."setId"=pc."setId"
WHERE pc."setId" IS NOT NULL GROUP BY pc.id HAVING count(cl.id)=0;
-- 공백 B: Set 있으나 팩표 미등록 (대응표 보강)
SELECT s.id FROM "Set" s LEFT JOIN "CardPackLink" pc ON pc."setId"=s.id WHERE pc.id IS NULL;
```

### 5.5 공백 메우기 (실측)

- **JP M-P 1건:** 수집은 됨(LC 70), 누락은 팩표 등록만 → `role=ANCHOR, relationType=JP_ONLY` 행 추가.
- **29 CONFIG-부재 SetGroup:** Trainer Gallery→`EN_ONLY`, KR프로모(863 LC)→`KR_ONLY/KR_OVERFLOW`, M-P→`JP_ONLY`. dex-catalog DB경로로만 뜨던 비대칭 해소.
- **SV 48/48 완전, 신팩 공백 0:** SV는 수집 아닌 *팩표 등록 검증*만.
- **10,199 EN/KR단독 LC:** 두-경로 단일화 전 그룹소속을 CardPackLink CROSS/EN_ONLY 행으로 보존(P9 setGroupId 제거 전 필수 — §8.1 리스크1).

### 5.6 수집 권위 매트릭스

| region | 1차 소스 | 디렉터리 |
|---|---|---|
| JP | pokemon-card.com 공식 (resultAPI pg코드) | `data/jp-official/` |
| EN | pokemontcg.io (+ pokemon.com 개별 권위) | `data/en-ptcg/` |
| KR | pokemoncard.co.kr 공식 (search_text_cards AJAX) | `data/kr-official/` |
| 종 | PokeAPI CSV (dex 11,261행) | `data/pokeapi/` |

**신팩 상시 절차:** JP 수집 → CardPack+JP행 즉시 → EN/KR 발매 시 행 추가 + relationType 확정 → 카드 정밀배정 자동(STEP A→B). 신팩마다 CONFIG 손코딩이 **테이블 3행 INSERT**로 축소.

---

## 6. 검증·가드·롤아웃

### 6.1 불변식 (전 단계 게이트)

| # | 불변식 | 측정 |
|---|---|---|
| **I1 로케일 보존** | 모든 CL.id가 의도 외 소유주 안 바꿈 | `check-locale-conservation` diff=0 |
| **I2 메타 무손실** | art/oracle 분산 시 카드당 필드 손실 0 (flavor는 H9 사다리 결과값 기준) | per-LC 필드 체크섬 before==after |
| **I3 dex 출력 동등** | 이행 후 렌더가 카드집합·번호순·지역배정 동등(의도통합만 추가) | group-*.json 206개 골든 diff |
| **I4 게임 dedup 보존** | GC 승격이 채용률/티어 안 깸 | `cardgame.ts` 집계 before≤after |
| **★I5 unique 충돌 0** | GC키 전환 전 충돌행 머지 완료 | P6.5 `HAVING count>1`=0 (C1) |
| **★I-rarity 집계 무폭증** | rarity별 카운트가 region배수로 안 부풂 | rarity groupBy distinct artCardId == 이행전 LC카운트 (C6) |

### 6.2 보존가드 3축 확장

현 `check-locale-conservation.ts`는 2계층(`region|logicalCardId` + `lc→setGroupId`)만 추적. 확장:
```ts
type Snapshot = {
  locales: Record<string, string>;   // cardLocaleId -> "REGION|artCardId|gameCardId"
  pcGame:  Record<string, string>;   // artCardId  -> gameCardId
  clPack:  Record<string, string>;   // cardLocaleId -> setId(packTag)
};
```
`compare`(`:108-121`)를 `pcMoves`(도둑질 후보)+`gcMoves`(게임 재분류)로 분기. **신규 `check-gamecard-conservation`:** GC 개수 감소만 허용(증가=채용률 분열 경보). **신규 `check-unique-collision`:** P6.5 전후 `(gameCardId,setId)`/`(archetypeId,gameCardId)` 충돌행 수 추적(C1 게이트).

### 6.3 이미지 최종권위 검증 (3지점)

- **(A) PC 클러스터링 직후:** `audit-printcard-cohesion.ts`로 클러스터 내 imageLarge pHash 일관성 검사. "작가 동일+이미지 거리 큼"=디아루가/펄기아 패턴 최우선 사람검토. **+ PC-collapse 검증: 같은 PC로 묶인 복수 locale이 매칭에서 1후보로 접혔는지(C5).**
- **(B) 보존가드 경보 시:** `★`/🔴 발생 PC는 이미지 대조 전 완료 보고 금지.
- **(C) EN/KR 미연결 판정 시:** `research-en-release.ts`로 ptcg.io 실존 조회 → 애매하면 pokemon.com 공식 단건 이미지 확정.

### 6.4 dex 골든 회귀 — 재현 패키지(C7)

- **G0 동결(★재현 패키지로):** 이행 전 206 JSON을 `golden/dex-pre/`에 + 경로1 DB출력 직렬화. **단순 파일 복사가 아니라 "JSON 파일 + build-group 소스 커밋해시 + 입력 DB 스냅샷" 3종 세트로 태그·아카이브** → P9에서 build-group 폐기 후에도 **"이 커밋+이 DB덤프로 골든 재생성 가능"** 보장(골든이 폐기대상과 운명공동체가 되는 걸 차단). 32 드리프트 확정을 **Week 0(G0와 동시, §4.5)**에 완료해 오염 골든 동결 방지.
- **G_n diff:** 새 렌더러 산출 vs 골든. anchor 단일슬롯→배열 확장이므로 "이행 전 단일값이 배열 원소로 보존"+"cross-pack 통합은 추가만 허용". 카드 집합 완전일치 강제. `enMatched` 증가만, `enOnly/krOnly` 감소만.
- **시각 회귀(고위험 표본):** sv-base(합본)·sm1(분할)·og-bw(N→1)·kr프로모 10개만 Playwright before/after.

### 6.5 롤아웃 (섀도+플래그)

- **Phase A (섀도):** logicalCardId 무변경, 섀도 컬럼만 채움 → 도둑질 구조적 불가. **P-1~P6.5.** dual-write는 **P3부터** 가동(C4).
- **Phase B (섀도검증):** 골든 diff + 3축 보존가드 + **unique 충돌 0(I5)** + **시세 섀도비교(artCardId 묶음이 가격행 *늘면* 정상, 단 집계 후 단일 표시값은 이전 범위 동등 — H12)** + rarity 무폭증(I-rarity). 트래픽 0.
- **Phase C (플래그):** `USE_IDENTITY_V2` env. 읽기만 전환, dual-write. 순서: 상세패널 → 시세모달 → dex → cardgame(GC). 각 단계 I1~I5 + 캐시무효화. **P7~P8.** P7 cardgame(GC) 전환 직전 P6.5 충돌머지 완료 필수.
- **Phase D (폐기):** 플래그 100% + 안정화 후 구컬럼/JSON 제거. **P9.** 도둑질 영구 차단.

### 6.6 card-check 스킬 갱신

| 도구 | 갱신 |
|---|---|
| `check-locale-conservation.ts` | 3축 확장 + 마이그레이션 게이트 격상 |
| `link-en-orphans-by-art.ts` | **orphan 입양 한정 존속**(JP-less 가정 정상카드 전이 금지, H10) |
| **신규** `merge-printcard-by-art.ts` | **cross-pack 병합 본체(정상 LC 전체)** — orphan 도구와 분리 |
| `merge-en-identity.ts` | art메타 백필부(`:64,79,118,179,182`) 재작성, rankZip 알고리즘 보존 |
| `audit-kr-trainers.ts` | nameKo→CardText, 재배정 타깃→GC |
| `search-card.ts` | include 트리 4계층화 |
| `research-en-release.ts` | 입력만 "이 PC에 EN 있나"로(`:60`), 본체 무변경 |
| **신규** `audit-printcard-cohesion.ts` | 이미지 pHash 오병합 적발 + PC-collapse 검증 |
| **신규** `check-unique-collision.ts` | P6.5 충돌행 추적(C1 게이트) |
| `migrate-nameko-to-cardtext.ts` | **GC축 재설계**(표시/효과 2축, GC당 효과 1행 머지, H11) |

source-registry: 이미지 권위 소스 절 신설. auto-memory: `project_identity_migration` 신설(Phase 상태·골든 경로·I1~I5 게이트 누적·**P3~P7 oracle freeze 규칙·P-1 진단 결과**).

---

## 7. 정리(제거) 계획

> 원칙: **이중경로 붕괴 · 정체성 직교화 · 강등 vs 제거**. 안전 시점 = "복사(P3/P4) → 읽기전환(P7) → 물리삭제(P9)" 3박자. 순서 위반 시 빌드/런타임 깨짐.

### 7.1 스키마 컬럼/모델 제거

| # | 대상 | 위치 | 근거 | 시점 | 의존성 끊기 |
|---|---|---|---|---|---|
| S1 | `LogicalCard.setGroupId`+관계+idx | `754,755,797` | 도둑질 발원지. CL.setId+PACK 일원화 | P9 | P7 읽기 CL로 → PACK 시드 → **10,199 단독LC 보존(§5.5)** → drop |
| S2 | `LogicalCard.primarySetId`+관계+idx | `756,757,799` | CL.setId가 대체 | P9 | A3(역관계)+S1 동시 |
| S3 | `LogicalCard.primaryNumber*` | `758,759` | CL.number 정본 | P9 | P4 복사 → P7 전환 → drop |
| S4 | `subtypes` | `762` | CL 하강(인쇄본별) | P9 | P4 복사 → P7 전환 → drop |
| S5 | `rarityId`+관계+idx | `777,778,798` | CL 하강. Rarity.cards(887)→localeCards | P9 | P4 복사 + CL idx 신설 → **P5.5 정정** → P7 rarity.code 필터 재배선(distinct artCardId, C6) → drop |
| S6 | `types`/`illustrator`/`flavorText` | `763,769,776` | PC 잔류(이전) | P9 | PC 모델 승계 → P7(flavor 사다리 H9) → LC에서 drop |
| S7 | oracle 스칼라(`supertype,hp,retreat,weakness,resistance,regulationMark,evolvesFrom/To,abilities,attacks,legalities,rules`) | `761,764-775` | GC 상승 | P9 | P0.1(supertype)+P3 복사(+**freeze P3~P7, C4**) → P7 → drop |
| S8 | `pokedexNumbers` | `760` | SP join 정규화 | P9 | P0.4 교정 → P1 시드+join → P7 → drop |
| S9 | `Set.setGroupId`+관계+idx | `23,24,34` | 물리경로. PACK 1급화 → 이중경로 제거 | P9 | **S1과 원자적 동시**(한쪽만 남기면 이중경로 잔존) |
| S10 | `SetGroup` 모델 전체 | `39-55` | CardPack 대체(era 보존) | P9 | P2 행 승계 → P7 소비처 전환 → 모델 drop |
| S11 | `*Ko` 컬럼군 | `779-784` | CardText 이관(주석 839 예정) | P9 | P0.3(swap 0건) → P8 완주(2축, H11) → drop |
| S12 | `MarketStat.cardId` 평문 | `729` | **P-1.1 확정 후** FK 명시화(localeId) or PC | P9 | **P-1.1 참조 실측** → CL.id 확인 시 FK 추가 → 평문 정리. **LC참조 판명 시 대상·시점 재작성(C2)** |
| S13 | `Rarity.cards LogicalCard[]` | `887` | `localeCards CardLocale[]` | P9 | S5 짝, 동시. **집계 소비처 distinct artCardId 전환 확인(C6)** |

### 7.2 데이터 정리

| # | 대상 | 규모 | 시점 |
|---|---|---|---|
| D1 | supertype 오염(`Pokemon`/NULL) | 1,819+1,238 | **P0.1**(UPDATE) |
| D2 | 스테일 트윈 세트+NULL LC | 45쌍 ~6,522 locale, collection 5 | **P0.2**(재포인트 후 삭제 + CONFIG 정합 H8) |
| D3 | `og-sma` 빈 그룹 | LC=0 | **P0.2** |
| D4 | nameKo swap 오염 | 905 | **P0.3**(감사, swap 0건 게이트) |
| D5 | pokedexNumbers 오저장 | P-1.4 집계분(SV 패턴 등) | **P0.4**(교정, M13) |
| D6 | CardLocale 진성중복 | 51(전부 kr-*, 이미지 상이) | **P5**(PC 경계 흡수) |
| D7 | unique 충돌행(TierEntry/DeckCard) | P-1.3 집계분 | **P6.5**(머지, C1) |

### 7.3 코드/아티팩트 폐기 (ZONE 순서 = 잎→뿌리)

| Zone | 대상 | 위치 | 시점 | 빌드깨짐 리스크 |
|---|---|---|---|---|
| 0 | `enKr:[]` 데드필드 | `build-group.ts:1137,1392` + JSON 206 | 즉시 가능 | 0 (안 읽힘) |
| 1 | 매칭 휴리스틱(`enByLcid`/`fpP`/`bucketPair`/교차6단계/`jpPacksOf`) | `build-group.ts:1094-1378` | P5 1회용 강등 → P9 | 0 (build-group 운명공동체) |
| 2 | 174 import+`DATA`+`GROUPED_GROUP_IDS` | `GroupCards.tsx:4-357` | P7 읽기전환 → P9 | **고**(import 의존 사슬) |
| 2 | 정적 group-*.json | `src/data/*` 206개 | **P9** (★골든 재현패키지 보존 후, C7) | **고** |
| 2 | 이원렌더 삼항 | `DexCatalog.tsx:1216` | P7 | 중 |
| 3 | EN명역추적 | `deck-pricing.ts:98-111` | P7(전환과 원자적) | 중 |
| 3 | `take:n*2`+`byArch` | `cardgame.ts:843,846-850` | P7 | 중 |
| 3 | `isSpecial`/`isEnOnly` 정규식 | `dex-catalog.ts:156-158` | P7 | 저 |
| 4 | `build-group.ts` 본체+CONFIG | 전체 1402줄 | P9(P2 추출 후 **+골든 재현패키지로 커밋해시 보존**) | 저(런타임 무관) |
| 5 | 일회성 스크립트 | `merge-en-identity`/`create-jp-set-limitless`/`apply-kr-official`/`fill-kr-names`/`migrate-nameko-to-cardtext` | P9 `_archive/` 이동 | 0 |
| 7 | `eras.ts` CANON/ORDER/LABEL | `eras.ts:9-82` | P9(Era 흡수, **분류함수 골격 유지**) | 저 |
| 7 | `docs/design/card-packs-jp-en-guide.md` | 문서 | P9 격하(note 이관 후 참조) | 0 |

### 7.4 빌드깨짐 함정 (순서 역전 금지)

1. **JSON 파일 삭제를 174 import 제거보다 먼저** → 모듈 not-found 컴파일 즉사. **반드시 `grep "@/data/group-"` = 0 확인 후 파일 삭제.**
2. **build-group 삭제를 CI 호출처 제거보다 먼저** → 배포 파이프라인 실패. **호출처(`package.json`/GH Actions) 먼저.**
3. **ZONE 3 우회로 삭제를 P7 읽기전환과 분리** → 분열 보정 사라진 채 노출(빌드 통과해 더 위험). **전환+삭제 원자적.**
4. **★build-group/JSON 폐기를 골든 재현패키지 보존보다 먼저(C7)** → 골든 재생성 수단 소실. **G0 3종 세트(JSON+커밋해시+DB덤프) 아카이브 확인 후에만 ZONE 2·4 폐기.**
5. **★unique GC키 전환(P7)을 P6.5 충돌머지보다 먼저(C1)** → DDL unique violation으로 트랜잭션 즉사. **P6.5 `HAVING count>1`=0 확인 후에만 P7 unique 재정의.**

### 7.5 P9 원자 PR 묶음

```
[원자 PR-1] S1 + S9 + S10 + ExternalIdMapping.setGroupId→waveId  ← setGroupId 4곳 동시(schema:754/23/39-55/938)
[원자 PR-2] S2~S8 (LogicalCard 잔재 컬럼 일괄)
[원자 PR-3] S11 + CardText FK 재정의                              ← *Ko 컬럼군
[원자 PR-4] S12 (P-1.1 결과가 CL.id 확정인 경우만; LC참조면 별도 재설계 PR)
[동반]      ZONE 1·4·5·7 + S13
```

### 7.6 강등(제거 아님)

- `eras.ts` `canonEra`/`eraLabel` 분류함수 골격 → Era 테이블 읽기로 전환하되 **사이드바 분류용 존속**.
- 매칭 휴리스틱(`fpP`/`bucketPair`) → PC 클러스터링 1회용 강등 후 폐기.
- `MarketStat.cardId`/`Conversation.sourceCardId`/`Message.attachedCardId` → 제거 아닌 **P-1 확정 후** FK 명시화/주석 강화.
- `enrich-*-meta-tcgdex.ts`(12개)·`backfill-kr-images-r2.ts` → 개조 후 잔존(신규 적재에 계속 사용).
- `link-en-orphans-by-art.ts` → orphan 입양 한정 존속(H10, cross-pack은 `merge-printcard-by-art.ts`).

---

## 8. 리스크·미결정 사항·권장 착수 순서

### 8.1 최상위 리스크 (심각도순)

1. **★unique 충돌 머지 누락(C1) — 마이그레이션 트랜잭션 즉사.** `TierEntry@@unique([logicalCardId,setId])`(`schema:92`)·`DeckCard@@unique([archetypeId,logicalCardId])`(`schema:564`)를 GC키로 전환하면 N→1 roll-up이 unique violation을 일으킨다. **P6.5 충돌머지를 P7 unique 전환의 선행으로 강제**, I5 게이트로 `HAVING count>1`=0 확인. 이게 **가장 위험한 단일 결함** — GC roll-up의 존재 이유와 정면충돌.
2. **★가역성 슬로건 거짓(C3) — 안전 서사 붕괴 위험.** "P1~P8 전부 가역"은 P5.5 art정정·P6.5 집계머지 진입 후 거짓. 계획 전체가 이 한 줄에 의존하므로 정직 강등(§가역성 표) + 각 비가역 지점 전용 스냅샷(P5.5 정정전 CL, P6.5 충돌행).
3. **★무검증 단정(C2/M16) — FK 추가 실패 위험.** `MarketStat.cardId`(`schema:729` FK없는 평문)·`Conversation.sourceCardId`(435)·`Message.attachedCardId`(451)가 CL.id인지 LC.id인지 미확인. **P-1 진단으로 실측 후에만** §1.4/§1.8/S12 확정. LC 참조 판명 시 P5 id 의미전환과 충돌해 제약 추가 실패.
4. **setGroupId 4곳 동시 제거(S1+S9+S10+ExternalId `schema:938`)** — 부분 제거 시 dangling FK·이중경로 잔존. **P9 원자 PR-1 강제.** 선행: P7 모든 읽기가 CL.setId+PACK 전환 확인 + 10,199 EN/KR단독 LC 그룹소속 PACK 보존(§5.5).
5. **nameKo 카드명 오용 해소(S11/H11)** — 단순 drop 아닌 "카드명↔종명 이원 이관 + 표시/효과 2축 분열". P0.3 swap 905 감사("swap 0건" 게이트) 미통과 시 SP/GC가 오염명으로 묶임. **묶기(P1/P3) 전 절대 선결.**
6. **supertype 정규화(D1)** — GC 생성(P3) hard blocker. 1,819 무악센트가 376 dex 형제풀 누락 시 89.4% 효과회복(P6) 붕괴. **P0.1로 가장 먼저(P-1 진단 다음).**
7. **형제매칭 PC-collapse 누락(C5)** — 재수록(같은 지역 복수 인쇄본)이 `byHash≥2`로 영구 미연결되면 "89% 효과회복"·"cross-pack 시세통합" KPI가 재수록 카드에서 구조적 실패. **매칭 입력을 PC 단위 collapse로 강제(§5.3 린트).**

### 8.2 미결정 사항 (설계 판단 필요)

**→ 10건 전부 결정 완료 (2026-06-10).**

| # | 쟁점 | ✅ 결정 | 근거 |
|---|---|---|---|
| U1 | `illustrator` 거주지 | **ArtCard 단독** | **데이터 실측**: sv-base 3국 원본에서 같은 카드(dex+hp+types+subtypes) 1:1 매칭 94쌍 **JP=EN illustrator 100% 일치**, 전 지역 romaji 저장(KR도 "Tika Matsuno"식). 같은 그림→지역무관 동일. ※주의 ①현지문자 작가명(가나/한글)은 미보유 → 원하면 **별도 언어 오버레이**(작가는 동일인, 표기만 다름) ②다출처(ptcg.io↔tcgdex) 혼용 시 romanization 변이 가능 → ArtCard.illustrator 정규화 단일값 유지 |
| U2 | `types` 거주지 | **ArtCard 단독** | GC 중복 회피. 아트별 변주 드뭄 |
| U3 | GameCard 묶음키 | **`[supertype, name, effectSig]`** (effectSig = hp + 공격damage집합 + 능력/룰) ★P-1로 변경 | ★**P-1 실측**: name+regMark 3키는 복수멤버 그룹의 **47.5%(2,646)가 효과 불일치=오병합**(wobbuffet 17효과·marill 16효과 등 — 수십년 재판된 동명 포켓몬이 한 GameCard로 잘못 합쳐짐). regMark는 75% null이라 무력. **효과 시그니처를 키에 포함 필수.** |
| U4 | `artFingerprint` 알고리즘 | **pHash + 미해시 sentinel 강제(M14)** | 색변주 오판은 사람판정 큐잉 |
| U5 | dex 렌더 | **런타임 DB + 그룹별 캐시 태그** | 2GB 제약 하 §4.3, 174개 하드코딩 import 제거. Next 캐시 API는 docs 확인 |
| U6 | 랭킹·시세 집계 단위 | **실물(RegionCard) 단위 / ArtCard roll-up은 옵션 뷰** | ★**P-1 실측**: `MarketStat.cardId` LC매칭 **0** · CL매칭 31,977 → **RegionCard 확정**. 단 16,509행은 레거시 ptcg.io id(`base1-1`)라 현 CardLocale과 불일치 → **시세 id 리맵/정리 별건**(모델 비차단) |
| U7 | CardText FK "정확히 하나" | **앱검증 XOR(gameCardId/artCardId)** | Prisma CHECK 미지원 |
| U8 | TierEntry/DeckCard 충돌 머지 | **DeckCard 수량=SUM · TierEntry 점유=SUM/티어=MAX** | 그룹 유형별 명시(P6.5) |
| U9 | 시세 묶음 표시 | **(region,pack) 그리드 + region 대표1가 파생** | 정보손실 없음. pickRepresentative 재사용(H12) |
| U10 | flavorText 3중 권위 | **읽기 사다리 CardText>RegionCard>ArtCard** | PC=EN폴백 PC당1 invariant(H9) |

> **U1 검증 부산물(데이터 품질, 별건):** KR 수집 파일(`data/collect/sv-base/kr.json`)이 JP·EN과 정체성키(dex+hp+types)로 **0/216 매칭** — KR 원본이 types를 한글로 저장했거나 dex/hp 갭 추정. illustrator(romaji)와 무관하나 **P0 수집품질 점검 대상**으로 등재.

### 8.4 P-1 진단 실측 결과 (2026-06-10, `scripts/migration/p1-diagnostic.ts`)

| 항목 | 결과 | 후속 |
|---|---|---|
| **MarketStat.cardId** | 총 48,486 · LC매칭 **0** · CL매칭 31,977 · 미매칭 16,509(레거시 `base1-1` ptcg.io id) | RegionCard 확정(U6). 16,509 레거시 id **시세 리맵/정리**(별건) |
| **약참조** Conversation/Message | 각 2행, 전부 CL.id(RegionCard) | 무시가능(4행). RegionCard 약참조 |
| **pokedexNumbers 오저장** | **0건** (이미 캠페인서 교정 완료) | **P0.4 NO-OP** — 단계 제거 |
| **GameCard 3키 검증** | 복수멤버 그룹 5,576 중 **효과불일치(오병합) 2,646=47.5%** | **U3 변경**: 키에 effectSig 필수 |
| **이름 빈 LC** | `lc-orphan-sv3-*` 241개 = **로케일 0개 유령 LC**(task #78 잔재 재발) | **P0에 빈-LC 재청소** 추가(241) |
| **TierEntry/DeckCard** | **0행** | P6.5 현재 no-op(게이트 유지) |
| **ArtCard cross-pack 후보** | (dex+작가+이름) 동일 6,971그룹 → LC 16,815장 통합, 그중 **cross-pack 6,347** | P5 이미지 pHash 검증 대상 규모 |
| **Species(dex) 검증** | 포켓몬 31,433 = 단일dex 31,192 · **태그팀(복수dex) 235=N:M 확정** · dex없음 6 · 범위밖/CSV밖 **0** | Species 키 **클린** — 그대로 진행 |

### 8.3 권장 착수 순서

```
[Week 0a — 진단 (읽기전용, 무변경) ★최우선]
  0. P-1 진단 PR — MarketStat.cardId·약참조(Conv/Msg)·dex오저장·unique충돌행 실측
     → §1.4/§1.8/S12/§3.6/P0.4/P6.5 설계 분기 확정

[Week 0b — 선결, 재수집 없음]
  1. P0.1 supertype 정규화 (hard blocker)
  2. P0.2 스테일 트윈 45쌍 정리 (+CONFIG 정합 H8)
  3. P0.3 swap 905 감사 (swap 0건 게이트)
  4. P0.4 pokedexNumbers 오저장 교정 (M13)
  5. G0 골든 동결 (206 JSON + DB출력 + ★build-group 커밋해시 + DB덤프 3종세트 C7)
     + 32개 드리프트 선처리 (Week 0 완료, §4.5)
  6. check-locale-conservation 3축 확장 + check-unique-collision 신설

[Week 1-2 — additive 신설 (Phase A)]
  7. P1 Species + P2 CardPackLink (병렬)
  8. extract-pack-correspondence.ts + 왕복 동등성 검증 (enMerged류 디퍼드)
  9. P3 GameCard 묶기 (supertype 선행 확인) + ★dual-write/freeze 가동 (C4)
     + gc_map 영속화

[Week 3-4 — 파괴적 핵심 (Phase A)]
  10. P4 art메타 기계적 복제 (정정 제외, numberInt 백필, 가역)
  11. P5 ArtCard 승계+병합 (PC-collapse, merge-printcard-by-art.ts, conservation 게이트)
  12. audit-printcard-cohesion.ts 오병합 적발 → 사람판정
  13. P5.5 art메타 region별 rarity 정정 (정정전 CL스냅샷, 부분비가역 C3)
  14. P6 효과 89% 형제회복 (GC 적재, freeze 하)
  15. P6.5 unique 충돌머지 (P-1.3 집계분, HAVING count>1=0 확인 C1)

[Week 5 — 섀도검증 (Phase B)]
  16. 골든 diff + 3축 보존가드 + I5 unique + I-rarity + 시세 섀도비교 (트래픽 0)

[Week 6-7 — 읽기전환 (Phase C)]
  17. P7 조인 재배선 (상세→시세→dex→cardgame, 각 PR diff=0)
      ※ cardgame(GC) 전환은 P6.5 충돌0 확인 후 unique 재정의
      ※ rarity 집계 distinct artCardId (C6)
  18. 런타임 DB 렌더러 + 그룹별 캐시 (이원렌더 통합, Next 캐시 API docs 확인)
  19. P8 *Ko→CardText 완주 (GC축 2행 분열 H11)
  20. ★freeze 규칙 해제 (읽기가 GC/PC 전환 완료 후)

[Week 8 — 폐기 (Phase D)]
  21. 안정화 관찰 (회귀 0 확인)
  22. P9 원자 PR-1/2/3/4 + ZONE 정리 (full snapshot + 골든 재현패키지 보존 확인 후)
```

**핵심 불변식 한 줄(정직판):** 가역의 분기점은 **P5** — P5 진입 전까지 P0~P4는 가역이나, P5.5 art정정·P6.5 집계머지가 들어가는 순간 그 분량만큼 비가역이 된다. 파괴 격리는 P9이되 P5.5/P6.5는 **P9 이전의 부분 비가역 지점**이므로 전용 스냅샷이 안전망이다. 그리고 마이그레이션을 트랜잭션 레벨에서 깨뜨릴 단 하나의 결함은 **GC roll-up과 `[gameCardId,setId]`/`[archetypeId,gameCardId]` unique의 정면충돌(C1)** — 이건 I4 sanity로 안 잡히고 **P6.5 충돌머지가 P7 unique 전환을 선행해야만** 통과한다.

---

**핵심 근거 파일(절대경로):** `/home/lyyw205/repos/raredoc/prisma/schema.prisma`(LogicalCard 752-800, CardLocale 802-830, CardText 841-860, Rarity 877-890 [nameEn/Ja/Ko 880-882·cards 887], Set 10-35, SetGroup 39-55, **TierEntry unique 92, DeckCard unique 564, MarketStat cardId 729·unique 741, ExternalIdMapping setGroupId 938, Conversation sourceCardId 435, Message attachedCardId 451**) · `/home/lyyw205/repos/raredoc/scripts/build-group.ts`(CONFIG 29-1067, 매칭 1094-1378, toRow region별 rarity 1083-1088, enKr 1137·1392) · `/home/lyyw205/repos/raredoc/src/components/dex/GroupCards.tsx`(import 4-177=174개, DATA 181-356, GROUPED 357, Anchor 360) · `/home/lyyw205/repos/raredoc/src/components/dex/DexCatalog.tsx`(삼항 1216) · `/home/lyyw205/repos/raredoc/src/lib/cards/dex-catalog.ts`(18, 99-117, 156-158, 191) · `/home/lyyw205/repos/raredoc/src/lib/cards/queries.ts`(110-122, 249-329, 390-456) · `/home/lyyw205/repos/raredoc/src/lib/actions/getCardPrices.ts`(29-45) · `/home/lyyw205/repos/raredoc/src/lib/services/{deck-pricing,cardgame,market,gamification,collection}.ts` · `/home/lyyw205/repos/raredoc/src/lib/cards/eras.ts`(9-92) · `/home/lyyw205/repos/raredoc/.claude/skills/card-check/scripts/{check-locale-conservation,link-en-orphans-by-art,merge-en-identity,audit-kr-trainers,search-card,research-en-release}.ts` + SKILL.md · `/home/lyyw205/repos/raredoc/scripts/{extract-pack-correspondence(신규),audit-printcard-cohesion(신규),check-unique-collision(신규),merge-printcard-by-art(신규),create-jp-set-limitless,apply-kr-official,fill-kr-names,migrate-nameko-to-cardtext}.ts` · `/home/lyyw205/repos/raredoc/docs/design/card-packs-jp-en-guide.md` · `/home/lyyw205/repos/raredoc/data/{jp-official,en-ptcg,kr-official,pokeapi}/` · `/home/lyyw205/repos/raredoc/node_modules/next/dist/docs/`(캐시 API 확인) · 신규 산출물 `golden/dex-pre/`(골든 재현 3종 패키지).