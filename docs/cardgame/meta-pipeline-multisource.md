# 멀티소스 메타 파이프라인 설계 — 수집→정규화→DB→UI

작성일: 2026-06-06 · 상태: 설계(미구현) · 선행 문서: `docs/cardgame/meta-pipeline-limitless.md`
산출 방법: 레포 사실확인 3 + 독립 설계안 3(최소변경/어댑터/제품역산) + 심판 통합 + 적대적 리스크 검증(P0 3건·P1 8건 반영 완료)

## 0. 목적

기존 Limitless play API 단일 소스 파이프라인(2026-06-01 구현, 미커밋)을 확장해 **JP 시티리그/CL·코리안리그·공식 메이저**를 동일 양식으로 정규화·축적하고, /cardgame 메타·덱·대회 페이지에 region별(글로벌/일본/한국)로 노출한다.

검증된 소스 목록·엔드포인트·검증 증거는 메모리 `reference_tournament_meta_sources` 및 본 문서 §1 참조 (2026-06-06 실측+독립재검증 완료).

---

## 1. 소스와 정본표 (대회 정체성의 단일 규칙)

**원칙: 정본(primary) 소스만 Tournament 행을 생성한다. 보강(enrichment) 소스는 기존 행에 필드 주입 + SourceRef 등록만 — 행 생성 금지.** 이것이 이중집계 방지의 1원칙이다.

| 현실 대회 | 정본 (행 생성) | 보강 (필드 주입) | metaRegion | level |
|---|---|---|---|---|
| 온라인 그래스루츠 | `limitless-play` (A. play API) | — | INTL | online |
| 공식 메이저 (Regionals/IC/Worlds) | `pokedata` (E) | `limitless-web` slug 교차검증, `ptcglegends`(F) 레트로·장애 폴백 정본 | INTL | worlds/ic/regional/special |
| JP 시티리그 | `jp-official` (C. event_type 3:2) | **`pokekameshi` 기본**(event_holding_id 역링크 — 정확 조인), `limitless-jp` 는 data-shop 언어 실측 스파이크 통과 시에만 | JP | city |
| **JP 챔피언스리그(CL)** | `jp-official` (C. event_type 3:1 — 같은 체인 재사용) | `limitless-web` enrichment | JP | cl |
| 코리안리그 | `limitless-web` (B. — 단 **시리즈/type 기준 선별, data-country="KR" 단독 선별 금지**) | `kr-official` (D. 덱코드 48 + KR decklist 주입) | KR | league |

- ⚠️ [리스크 P1-2] 한국 개최 메이저/스페셜이 data-country="KR"로 잡혀 KR 메타를 오염시킬 수 있다 → 코리안리그는 `type=` 파라미터(실측 후) 또는 대회명 시리즈로 선별. major-registry에 "한국 개최 메이저는 INTL" 명시. 적재 시 (date, country) 근접 대회 경고 로그.
- ⚠️ [리스크 P1-3] JP CL 정본 누락 방지를 위해 위 표에 명시 — #3 수집기의 event_type 파라미터화로 비용 거의 0.
- 메이저 B∩E∩F 조인: `data/major-registry.json` 수기 레지스트리(연 ~20건).
- **디비전 처리** [리스크 P1-4]: Tournament 행은 디비전 단위 — `pd-{id}-{division}`. 코리안리그도 limitless 이벤트 구조 실측 후 동일 원칙. `NormalizedTournament` 계약에 `division` 필드 명시. (`@@unique([tournamentId, placing])` 충돌 방지)

집행 3중: ⑴ `TournamentSourceRef @@unique([source, sourceId])` ⑵ 보강 수집기는 정본 행 미존재 시 skip+로그 ⑶ `Tournament @@unique([source, sourceId])`.

---

## 2. 통합 데이터 모델 — prisma 스키마 diff

마이그: 순수 `db push` 운용. **선행 필수: 현재 untracked 파이프라인 전체 커밋(P0).**

```prisma
model Tournament {              // 기존 필드 전부 유지
  source      String?   // "limitless-play"|"limitless-web"|"jp-official"|"pokedata"|"ptcglegends" — null=목업
  sourceId    String?   // 정본 소스 원본 ID
  metaRegion  String    // INTL|JP|KR — 집계 파티션. ⚠ @default 두지 않음(필수 입력) — 누락 시 loader가 throw [리스크 P2-2]
  level       String?   // worlds|ic|regional|special|cl|league|city|online — 대회 페이지 필터 탭
  externalUrl String?
  sourceRefs  TournamentSourceRef[]
  @@unique([source, sourceId])
  @@index([metaRegion, date])
}

model TournamentSourceRef {     // 신규 — 이중집계 DB 차단 + 출처 표기
  id           String     @id @default(cuid())
  tournamentId String
  tournament   Tournament @relation(fields: [tournamentId], references: [id], onDelete: Cascade)
  source       String     // "kr-official"|"pokekameshi"|"limitless-jp"|"limitless-web"|"pokedata"|"ptcglegends"
  sourceId     String     // event_holding_id, pokedata ID 등
  role         String     // "primary"|"enrichment"
  url          String?
  @@unique([source, sourceId])
  @@index([tournamentId])
}

model TournamentStanding {      // 추가 4컬럼
  playerUsername String?  // matchup 매칭 안정화(표시명 비교 의존 해소)
  deckCode       String?  // JP "XXXXXX-XXXXXX-XXXXXX" | KR recipe code — 복사 버튼 + 재수집 키
  archetypeRaw   String?  // 소스 원문 라벨(ポケカ飯 일어명, data-winner 등) — 사후 재분류 원천
  deckSource     String?  // decklist provenance: "limitless"|"jp-deckcode"|"kr-deckcode"|"pokedata"
}

model ArchetypeRegionStat {     // 신규 — region 분리의 구조적 해법 (3설계안 만장일치)
  id              String        @id @default(cuid())
  archetypeId     String
  archetype       DeckArchetype @relation(fields: [archetypeId], references: [id], onDelete: Cascade)
  region          String        // INTL|JP|KR
  tier            String        // sampleSize<30이면 "—"
  usageRate       Float         @default(0)
  winCount        Int           @default(0)
  avgRank         Float         @default(0)
  winRate         Float         @default(0)
  conversion      Float         @default(0)
  consistency     Float         @default(0)
  sampleSize      Int           @default(0)
  tournamentCount Int           @default(0)
  isUnderdog      Boolean       @default(false)
  isTrap          Boolean       @default(false)
  isMetaCounter   Boolean       @default(false)
  updatedAt       DateTime      @updatedAt
  @@unique([archetypeId, region])
  @@index([region, tier])
}
```

**DeckRecipeCard 변경은 P2에서** [리스크 P0-2 — P0에 넣으면 aggregate-meta upsert 키 이름이 깨져 P0 게이트 자체가 통과 불능]:
- `region String @default("INTL")` 추가 + unique를 `@@unique([archetypeId, region, cardName, setCode, number])`로 교체.
- ⚠️ [리스크 P1-5] `setCode`/`number`는 **NOT NULL + `""` 정규화**(where/create 통일) — Postgres unique에서 NULL은 항상 distinct라 upsert가 영원히 create로 빠져 실행마다 중복 증식. JP 항목은 cardId 중심이라 set이 비는 경우가 구조적으로 발생.
- unique 교체와 `aggregate-meta.ts` where 키(`archetypeId_cardName_setCode_number` → `archetypeId_region_cardName_setCode_number`) 패치는 **한 커밋으로 원자화**.

**의도적 비변경**: `DeckArchetype.id`(=deckKey) — region 접미사화는 FK 5개+라우트+ARCHETYPE_KO 연쇄라 기각. 본체 집계 컬럼은 **INTL 미러로 의미 고정**(현행 화면 무중단). `DeckMatchup` region 미도입(pairings는 play API 단독). 카드 조인은 기존 `ExternalIdMapping`이 전부 수용 — **신규 매핑 테이블 0, 어댑터 추상층 0**.

**realOnly 판별 교체**: `limitlessId not null` → `source not null` (cardgame.ts·aggregate-meta.ts 2곳). 백필 `scripts/migrate-tournament-source.ts`: 기존 6행 `source="limitless-play"` 등 + DeckArchetype 집계값 → ArchetypeRegionStat(INTL) 복사.

---

## 3. 소스별 수집기

공통: 어댑터 추상층 없음(레포 관행 — 소스별 독립 tsx CLI + `--dry-run`). curl execFile 래퍼(`scripts/lib/limitless-api.ts` 패턴), 정규식 파싱(`sync-pack-namu-ko.ts` 패턴), 2단계 멱등(`syncedAt`은 standings 성공 후 set), 소스별 `data/` 캐시. 공용 적재만 `scripts/lib/tournament-loader.ts`의 `NormalizedTournament`/`NormalizedStanding` 타입 + `loadNormalizedTournament()` 함수로 통일(멱등·SourceRef 등록·dedup 검사·metaRegion 필수 검증을 한 곳에).

| # | 스크립트 | 소스 | 역할 | id | 캐시 | 스로틀 | 주기 |
|---|---|---|---|---|---|---|---|
| 1 | `sync-tournaments-limitless.ts` (기존) | A | 정본: 온라인 | `lim-{id}` | — | rateGuard 700ms | 주1 |
| 2 | `collect-tournaments-limitless-web.ts` | B | 정본: 코리안리그(시리즈 선별) / 보강: 메이저 slug | `lw-{id}-{division}` | `data/limitless-web/` | 1s, robots 전면허용 | 시즌 후·메이저 후 수동 |
| 3 | `collect-tournaments-jp-official.ts` | C ①event_search(3:2/**3:1**) ②event_result_detail_search ③confirm.html | 정본: JP 시티 + **CL** | `jpc-{event_holding_id}` | `data/jp-city/` + `data/deck-codes/jp/{code}.json` **영구** | 400ms | 시즌 중 주1 (현재 휴지기=백필 윈도우). **7,802 전수 금지 — 2026 S4부터 역순** |
| 4 | `enrich-cityleague-pokekameshi.ts` | ポケカ飯 | **기본 보강**: 역링크 event_holding_id로 정확 조인, 아키타입 원문 라벨 [리스크 P1-6 — 우선순위 승격] | event_holding_id+rank | `data/pokekameshi/` | 1s | #3과 동시 |
| 5 | `enrich-cityleague-limitless.ts` (조건부) | B /tournaments/jp | 보강: top16 라벨 교차검증 — **data-shop 언어 실측 스파이크 통과 시에만**, (date,shop) 다중 후보면 부착 거부 | (date,shop) 조인 | `data/limitless-jp/` | 1s | 분류 검증기 용도 |
| 6 | `enrich-koreanleague-kr.ts` | D menu700+ajax2 | 보강(행 생성 금지): `lw-*` KR리그 행에 deckCode+KR decklist 주입 | placing 우선+입상자명 검증, TOP4는 {3,4} 집합 부착 | `data/kr-league/` + `data/deck-codes/kr/` | 300ms, **X-Requested-With+Referer+Origin 필수** | 시즌당 1회 |
| 7 | `collect-archetype-rules-limitless.ts` | A /games/PTCG/decks (API키, env `LIMITLESS_API_KEY`) | 분류규칙 수신 | 덮어쓰기+버전 | `data/limitless/deck-rules.json` + `deck-rules-extra.json`(JP 선행카드 수동) | rateGuard | 월1 |
| 8 | `collect-majors-pokedata.ts` | E | 정본: 메이저 | `pd-{id}-{division}` | `data/pokedata/` — **영구 캐시·재조회 금지**(개인서버) | 2s | 메이저 직후 수동 |
| 9 | `collect-majors-ptcglegends.ts` (옵션) | F | 레트로 정본·E 폴백 | `ptl-{EVENT_ID}-{division}` | `data/ptcglegends/` | 2s | 필요 시 |

- **JP 덱코드는 standings 수집 즉시 confirm.html까지 당겨 영구 캐시** [리스크 P2-4 — 덱코드 영구 보존 미보장, 지연 백필 금지].
- 0건 파싱 시 hard fail + 원문 캐시 보존 + 행수/필수필드 assert (나무위키 다중표 오염 선례).
- npm: `sync:meta:web` / `sync:meta:jp` / `sync:meta:krleague` / `sync:meta:major` + 체인 `meta:weekly`. **수집은 로컬 수동 유지, Vercel cron 미연결**(curl 래퍼 서버리스 부적합).
- `meta:weekly` 리포트에 **소스별 기대 신선도 내장**(limitless-play 주간 N≥1, jp-official은 시즌 캘린더 기반) — "신규 0건"이 휴지기인지 파서 사망인지 구분 [리스크 P2-5].

### 선행 백필 3종 (P1)
1. `build-limitless-setmap.ts` — **통합 세트코드 사전** [리스크 P0-3 확장]: ⑴ EN ptcgoCode→setId (`data/en-ptcg` 139파일 + SVI/PAL/OBF/MEW/PAR/PAF 수동 6건 + SVE 특례) ⑵ **JP 세트코드(SV11B→jp-sv11b 등)→setId** — limitless standard-jp 덱리스트(코리안리그 포함!)는 JP 세트코드 표기를 쓰므로 이 클래스가 없으면 KR 탭 시세 연동이 통째로 불발. `Set.code` 백필 겸행.
2. `backfill-eim-jp-cardid.ts` — pc-jp cardID→EIM `pokemoncard_jp`: ①imageSmall 파일명 6자리(4,049행, 실증됨) ②`data/jp-official` detailUrl(7,070건) ③R2 소실 1,833행은 resultAPI 재조회(덱 등장 카드 lazy 보충 옵션).
3. `backfill-eim-kr-bs.ts` — BS코드→EIM `pokemoncard_kr`: `data/kr-official` 138파일의 `(detailId, setCode, number)` → `CardLocale.id={krSet}-{number}`.

---

## 4. 정규화 규칙

### ① 아키타입 키
정본 = **Limitless deck slug** (현행 `DeckArchetype.id`·ARCHETYPE_KO 키 — 변경 0).
- A/B: slug 직접. play↔web slug 집합 1회 대조, 불일치는 `src/data/archetype-aliases.json`(네임스페이스 구분: limitless-web / pokekameshi).
- C/D/E(무라벨·검증): **분류기 `scripts/lib/classify-decklist.ts`** — deck-rules cards[]를 resolver로 logicalCardId 변환 후 덱(logicalCardId set) 포함 매칭, 복수 매칭 시 카드 수 많은 규칙 우선, 실패 `"other"`. logicalCard 레벨이라 JP 덱코드·KR BS·EN 표기 전부 동일 규칙 → 소스 간 키 자동 일치.
- 라벨 소스는 분류 결과와 교차검증(불일치 로그) + 실패분 alias 폴백. `archetypeRaw` 항상 보존.
- **P4 착수 전 스파이크 2종** [리스크 P1-1]: ⑴ API키 발급 + 규칙 cards[] 표기 1회 실측 + 기존 547 standings 재분류 일치율 ≥95% ⑵ **limitless-jp 라벨이 있는 JP 시티리그 5~10대회의 덱코드를 미리 수집·분류해 교차 일치율 측정** — 547 정답지는 EN덱 vs EN규칙 검증이라 EN↔JP LogicalCard 병합 미완(EN 페이즈 진행 중)이 숨는다. deck-rules 등장 카드의 EN 병합 커버리지 리포트 산출 → EN 페이즈 우선순위 피드백.

### ② 덱리스트 통일 양식 + logicalCardId 해석 4경로
`TournamentStanding.decklist` = Limitless 3버킷 상위호환(기존 547행 호환):
```json
{"pokemon":[{"count":3,"name":"Raging Bolt ex","set":"TEF","number":"123","cardId":null,"logicalCardId":"lc-..."}],"trainer":[],"energy":[]}
```
jp-official: cardId=pc-jp 숫자ID (hidden 필드 매핑 pke→pokemon / gds·tool·tech·sup·sta→trainer / ene→energy). kr-official: cardId=BS코드.

단일 해석기 `scripts/lib/resolve-card.ts`:
| 경로 | 입력 | 키 경로 |
|---|---|---|
| ① EN 약어 | ptcgoCode+number (limitless-play, pokedata) | setmap → SV-era `CardLocale.id={setId}-{number}`(비패딩 주의) / SWSH-era EIM `pokemontcg_io` |
| ② **JP 세트코드** [P0-3 신설] | SV11B+number (limitless-web standard-jp — 코리안리그 decklists 포함) | setmap JP 클래스 → jp CardLocale |
| ③ JP cardID | pc-jp 숫자ID (jp-official 덱코드) | EIM `pokemoncard_jp` (인쇄판 1:1 — 재록 안전) |
| ④ KR BS코드 | BS코드 (kr-official 덱코드) | EIM `pokemoncard_kr` |

미해석은 null 유지 + 미해석률 리포트, `backfill-decklist-logical.ts`로 재시도. `matchRecipeToLogicalCard` TODO도 동일 resolver 호출 — **DeckRecipeCard.logicalCardId 단일 병목(카드 이미지·시세·채용률 미연결)의 해소 지점**.

### ③ region/format 매핑 — §1 정본표의 metaRegion/level 열 참조. `Tournament.region`(참가자 최빈값)은 표시용 레거시, 집계·필터는 metaRegion만. /cardgame/cards의 `region` searchParam(언어 개념)과 충돌 방지 위해 파라미터명 `metaRegion`.

---

## 5. 집계 변경 — aggregate-meta.ts

1. CLI `--region=INTL|JP|KR|all` (all=순차 3패스).
2. 대회 선별: `source not null AND metaRegion={region}`. 분모·usageRate region-로컬.
3. tier: sampleSize<30 → `"—"`. 임계 15/8/3 공통 시작 + `TIER_THRESHOLDS` Record로 region별 보정 여지. 1차 집계 후 분포 리포트.
4. 쓰기 분리: 전 region → `ArchetypeRegionStat` upsert. **INTL 패스만 DeckArchetype 본체 미러 갱신**(기존 화면 무중단). JP-only 덱은 본체 스텁 생성(편집자산 보존 로직 그대로).
5. Matchup: INTL 패스 + **source="limitless-play" 필터**(region 필터 아님 — pokedata 대회에 pairings 무의미 콜로 rate limit 소모 방지 [리스크 P2-1]). `playerUsername` 우선 매칭.
6. metaCounter: region-로컬 topDecks 기준 → RegionStat에 기록.
7. Trend: "INTL" 리터럴 2곳 → region 인자(스키마 이미 ready).
8. Recipe: region 키 + resolver 호출 + setCode/number `""` 정규화 [P1-5]. usage 비오염은 "보강은 행 생성 금지" 원칙이 구조적으로 보장.
9. window: region별 오버라이드(JP 휴지기 — "마지막 시즌 90d" 등).
10. **소비측 선행 패치(순서 강제, P0)** [리스크 P0-1 — 4곳]: `getArchetypeTrends`/`getRisingDecks`의 trends 조회 + **`getArchetypeRecipe`(region 인자, 기본 INTL)** + **`getCardAdoption`(region 필터)** — JP/KR 행 적재 전 배포 필수. realOnly의 region 패스는 본체 sampleSize가 아닌 **RegionStat.sampleSize 기준** 분기 [리스크 P2-3].

---

## 6. UI 노출 (한국 유저 가치 순)

1. **메타 페이지 region 탭** `?metaRegion=` [글로벌|일본|한국] — getArchetypes는 RegionStat 조인(INTL은 본체 — 무회귀). ⚠️ [리스크 P1-8] **JP/KR 탭은 S/A/B/C 티어보드 대신 usage 정렬 리스트**(또는 "표본 부족" 섹션) — tier "—" 행이 현행 MetaPageView 하드코딩 필터에서 증발해 빈 화면이 되는 것 방지. JP 탭 "입상 점유율 기준" 라벨(분모가 INTL과 다름 — top16만), 휴지기 빈상태 카피("2026 S4 종료 — 차기 시즌 개막 시 갱신"), KR 탭 "표본 N건" 뱃지.
2. **덱 상세 region 비교 스트립** — RegionStat 3행 비교. ⚠️ usageRate는 분모 정의를 행 단위 병기하거나 winRate 등 동질 지표만 비교 [리스크 P2-5]. region별 레시피 토글, KR 미발매 뱃지, 레시피 logicalCardId → **카드 이미지 + KR 시세** (#20/#25 해금 — raredoc 핵심 시너지).
3. **대회 페이지** — level 필터 탭(전체|코리안리그|시티리그·CL|메이저|온라인), 시티리그 행에 현·점포, sourceUrl 출처 링크. 목업 플레이어랭킹 숨김 → 후속 KR /players(RP/KP) 대체.
4. **대회 상세 덱코드 복사 버튼** — JP는 pokemon-card.com 덱 시뮬레이터 링크, KR은 recipe/search 병기(공식 빌더 import).
5. **/cards/[cardId] 역링크** — "이 카드를 쓰는 덱"(DeckRecipeCard.logicalCardId 역조회, region별 채용률).

---

## 7. 로드맵 (집계 선행 분리 + region 수직 슬라이스)

| 단계 | 산출물 | 선행 | 검증 게이트 | 규모 |
|---|---|---|---|---|
| **P0 기반** | untracked 전체 커밋 → 스키마 push(**DeckRecipeCard unique 교체 제외** [P0-2]) + migrate-tournament-source + realOnly 교체 2곳 + **소비측 region-안전 패치 4곳**(trends 2 + recipe + adoption [P0-1]) | — | 기존 3페이지 회귀 0, 547 standings 집계 수치 동일 | S |
| **P1 카드 조인** | build-limitless-setmap(EN+**JP 세트코드** [P0-3]) + resolve-card.ts(4경로) + matchRecipeToLogicalCard + 기존 547 decklist 백필 → cards 페이지 이미지/시세 연결 | P0 | EN 매칭률 ≥95%(에너지 별도 분모) | M |
| **P2 집계 region화** | aggregate --region + RegionStat + tier 가드 + tournament-loader + **DeckRecipeCard unique 교체와 upsert 키 패치 원자 커밋** [P0-2] + setCode `""` 정규화 [P1-5] | P0 | **INTL 재집계 = 현행 본체 값 동일** (공짜 회귀 게이트) + recipe/adoption 4곳 region-안전 확인 | M |
| **P3 KR 슬라이스** | backfill-eim-kr-bs + limitless-web KR(시리즈 선별 [P1-2]) + enrich-koreanleague + KR 탭(usage 리스트)·대회 필터. **스파이크: 코리안리그 decklist 1건 실측 → set 표기 분포 확인** [P0-3] | P1·P2 | Final 645 standings 일치, **SourceRef ≥40+미부착 전건 사유 로그, BS 매칭률 ≥95%(프로모 제외 분모)** [P1-7], 이중행 0 | M |
| **P4 JP 슬라이스** | **스파이크 2종**(547 정답지 ≥95% + **JP 시티 5~10대회 교차 일치율** [P1-1]) → backfill-eim-jp-cardid + jp-official(시티 3:2 + **CL 3:1** [P1-3], 2026 S4부터 역순) + pokekameshi 기본 보강 [P1-6] + JP 탭 | P1·P2 | 분류↔라벨 교차 ≥90%, "other" <10%, 덱 60장 합 검증 | L |
| **P5 메이저** | collect-majors-pokedata(`pd-{id}-{division}` [P1-4]) + major-registry + limitless-web slug 보강 (+옵션 ptcglegends) | P1·P2 | 인디애나폴리스 1,974/1,968 적재, E↔B slug 대조 | M |
| **P6 정례화·잔여** | meta:weekly 체인(신선도 기대치 내장 [P2-5]) + KR /players 랭킹 + #5 HHI·#12 매트릭스(INTL)·#18 deckCostKrw + JP 디폴트 탭 검토 + webhook 재검토 | P3~P5 | 주간 로그(신규 N·해석률·분류율) 추이 | S~M |

P3·P4 상호 독립 — 병렬 가능. 각 단계 독립 배포 가능.

---

## 8. 리스크 레지스터 (적대 검증 반영 잔여분)

| 리스크 | 완화 |
|---|---|
| 분류규칙 cards[] 형식 미실측 (P4 최대) | 스파이크 선행 + 547 정답지 + **JP 교차 스파이크** + 실패 시 pokekameshi alias 단독으로도 top16 성립(폴백) |
| JP 선행카드 덱 미분류 | deck-rules-extra.json 수동 규칙 + "other" 주간 리포트 >10% 시 규칙 추가 |
| EN↔JP LogicalCard 병합 미완(EN 페이즈 진행 중) | deck-rules 카드 EN 병합 커버리지 리포트 → EN 페이즈 우선순위 피드백 |
| pokedata 개인서버 소실 | 영구 캐시·재조회 금지 + ptcglegends 폴백 + SourceRef 구조라 적재분 무손상 |
| JP 공식 rate limit 불명 | 400ms 스로틀 + `--since` window + 덱코드 영구 캐시(수집 즉시 당김) + 휴지기 백필 |
| HTML 구조 변경 | 원문 캐시 + 행수/필수필드 assert + 0건 파싱 hard fail + dry-run 선행 |
| KR ajax 차단/헤더 정책 변경 | 3헤더+UA 패턴(collect-kr-pokemoncard 선례) + "접근불가" 감지, 연 5회 소량 |
| KR 덱코드↔standings 매칭 | placing 우선+이름 검증, TOP4는 {3,4} 집합 부착(placing 미확정 플래그), 불일치 미부착+로그 |
| region 혼합 오염 | P0 소비측 4곳 선행 패치 + metaRegion default 없음(loader throw) + 본체=INTL 미러 명문화 |
| 이중집계 | SourceRef unique + 보강 행 생성 금지 + 정본표 §1 + major-registry + (date,country) 근접 경고 |
| 1인 운영 과부하 | 주간 1커맨드 + 수직 슬라이스(단계마다 가시 증분) + 한계가치 낮은 소스(실드배틀 3:7, limitless-jp 단독 ingest) 기본 비활성 |

**종합 판정(적대 리뷰)**: 조건부 실행 가능 — P0 3건 + P1-1/2/4/7 게이트·정본 수정 반영(본 문서에 반영 완료)이면 실행 가능.

**핵심 의존 경로**: P1(resolver+EIM 백필) → P3/P4. 전부 기존 인프라(ExternalIdMapping, data/ 캐시 138+211파일, manual-fix-sv1s-001 선례) 위에서 성립. **신규 테이블 2개(TournamentSourceRef, ArchetypeRegionStat), 신규 매핑 테이블 0, 어댑터 추상층 0.**
