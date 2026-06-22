<!-- 자동생성: dedup-audit 워크플로(2026-06-17). -->

# 공용화 백로그 (2차)

## 요약

card-fields.ts/CostPips 1차 공용화 이후 남은 **진짜 중복은 14건**이다. 도메인은 크게 네 갈래로 나뉜다 — (1) **지역(region) 상수** 4건(REGION_LABEL, 배열 REGION_ORDER, 정렬맵 REGION_ORDER, REGIONS), (2) **시세·컨디션·BASE_URL** 6건(CONDITION_COEFFICIENT, pickPriceUsd, conditionCoefficient, GRADES, BASE_URL, TIER_ORDER), (3) **거래·탭** 3건(isTradeCategory, TRADE_CATS, deckLabel), (4) **시간·금액 포맷** 2건(상대시간 헬퍼군, 만/억 금액 축약군). 이 중 **순수 상수·순수 함수라 동작 변경 위험이 없는 7건**(REGION_LABEL, REGION_ORDER 2종, REGIONS, CONDITION_COEFFICIENT, pickPriceUsd, conditionCoefficient, BASE_URL)이 高 우선순위다. 반대로 포맷 헬퍼 2건은 호출부마다 표기 카피(주/개월 표기 여부, '만' vs '만원', '방금 전' vs '1분 전')가 미세하게 달라 **단순 치환 시 화면 문구가 바뀌므로** 옵션화·스냅샷 합의가 선행돼야 하는 中 우선순위다. 동결 카드팩이나 DB를 건드리는 항목은 **0건**이다(전부 표시/계산 로직).

## 우선순위 공용화 표 (진짜 중복만)

| 우선 | 무엇 (식별자) | 어디 중복 (파일수) | 내용 | 단일출처 위치 | 가치 | 위험 |
|---|---|---|---|---|---|---|
| **高** | `BASE_URL` (사이트 오리진) | 4 — `src/app/robots.ts:3` · `src/app/[locale]/layout.tsx:14` · `src/app/sitemap.ts:3` · `src/components/seo/JsonLd.tsx:14` | 4곳 모두 한 글자도 다르지 않게 `process.env.NEXT_PUBLIC_BASE_URL ?? "https://raredoc.kr"`. SEO·sitemap·robots·JSON-LD metadataBase. **동일** | `src/lib/constants.ts` 에 `export const SITE_BASE_URL`. 4곳 import | high | 낮음. `NEXT_PUBLIC_` env라 클라 번들 인라인 안전, 값 동일→출력 불변. 하드코딩 fallback 드리프트 방지 |
| **高** | `CONDITION_COEFFICIENT` (컨디션→계수 맵) | 3 — `marketplace.ts:8` · `collection.ts:9` · `gamification.ts:13` | 키·값 완전 동일 `{미개봉:1.15, 1착:1.1, NM:1.0, VNDS:0.95, LP:0.85, MP:0.65, HP:0.45, DS:0.3, D:0.3}`. 주석으로 "동일 기준" 명시. **동일** | `src/lib/trades/shared.ts` (client-safe, USD_KRW/toKrw 동거). `export const CONDITION_COEFFICIENT` | high | 낮음. 순수 상수. server-only 서비스가 client-safe 파일에서 상수만 import하는 방향은 안전 |
| **高** | `pickPriceUsd` (대표 USD 선택) | 3 — `marketplace.ts:20` · `collection.ts:26` · `gamification.ts:21` | 본문 완전 동일 `holofoil ?? normal ?? reverseHolo ?? firstEdition ?? null`, 인자 타입도 동일. **동일** | `src/lib/trades/shared.ts`. `export function pickPriceUsd` (인자 타입도 export) | high | 낮음. 순수 함수, 외부 의존 없음 |
| **高** | `conditionCoefficient` (룩업 래퍼) | 2 + 1 인라인 — `collection.ts:21` · `gamification.ts:17` (+ `marketplace.ts:39` 인라인 `CONDITION_COEFFICIENT[grade] ?? 1.0`) | `return CONDITION_COEFFICIENT[grade] ?? 1.0`. collection·gamification 동일, marketplace는 같은 일을 인라인. **동일** | `src/lib/trades/shared.ts`. `export function conditionCoefficient`. marketplace 인라인도 치환 | high | 낮음. 동작 동일 |
| **高** | `REGION_LABEL` (JP/EN/KR 풀라벨) | 4 — `GroupCards.tsx:367` · `DexCatalog.tsx:176` · `PackGallery.tsx:11` · `CardVersionTabs.tsx:16` | 4곳 모두 `{ JP:"일본판", EN:"영문판", KR:"한국판" }` (키 순서만 다름). **동일** | `src/lib/cards/card-fields.ts` 에 `export const REGION_LABEL` (SUBTYPE_KO/FORMAT_LABEL 동거) | high | 낮음. 순수 표시 라벨, 값 동일→동작 불변 |
| **高** | `REGION_ORDER` (표시순 배열, JP-first) | 2 — `DexCatalog.tsx:823` · `PackGallery.tsx:10` | 둘 다 `Region[] = ["JP","EN","KR"]`. availableRegions 필터·순회용. **동일** (REGIONS 배열과도 값 동일) | `src/lib/cards/dex-region.ts` (Region 타입 본거지) 에 신설, REGIONS와 통합 | high | 낮음. 단 아래 정렬맵 `REGION_ORDER`(EN-first)와 **이름은 같고 의미가 다름** → 합치면 안 됨 |
| **高** | `REGION_ORDER` (정렬 우선순위 맵, EN-first) | 2 — `queries.ts:75` · `getCardDetail.ts:51` | 둘 다 `Record<string,number> = { EN:0, JP:1, KR:2 }`, `(ORDER[a]??9)-(ORDER[b]??9)` 정렬. **동일** | `dex-region.ts` (또는 card-fields.ts) 에 **별도 이름** `REGION_SORT_PRIORITY` 로 신설 | high | 낮음. 단 배열형 `REGION_ORDER`와 이름 충돌 → 반드시 이름 분리(REGION_SORT_PRIORITY)해 잘못된 import 방지 |
| **中** | `REGIONS` (지역 배열) | 2 — `dex/page.tsx:8` · `packs/page.tsx:8` | 둘 다 `Region[] = ["JP","EN","KR"]`, listRegionPacks 순회용. **동일** (표시순 REGION_ORDER 배열과도 동일→흡수 가능) | `src/lib/cards/dex-region.ts` 에 단일화(표시순 REGION_ORDER와 한 상수로) | medium | 낮음. server component import 무해. dex-region.ts가 listRegionPacks 본거지라 자연스러움 |
| **中** | `GRADES` (전체 9등급 어휘) | 2 — `actions/collection.ts:25` (zod enum) · `OwnersList.tsx:35` (`GRADE_ORDER` 이름) | `['미개봉','1착','NM','VNDS','LP','MP','HP','DS','D']` 순서 완전 동일 = CONDITION_COEFFICIENT 키 집합과 일치. 이름만 다름 | `src/lib/trades/shared.ts` 에 `export const GRADES` (`as const`). enum·정렬·계수키 단일출처화 | medium | 낮음~중. actions는 `z.enum(GRADES)` 위해 `as const` 유지 필요. 정렬/enum이 같은 배열 공유→추후 한쪽 순서만 바꾸려는 의도 생기면 결합도 주의 |
| **中** | `TIER_ORDER` (뱃지 SILVER/GOLD/DIAMOND) | 2 — `BadgeCatalog.tsx:38` · `gamification.ts:153` | 둘 다 `["SILVER","GOLD","DIAMOND"]`, `.indexOf` 비교. **동일** (※ `cardgame.ts:197` 동명은 `{S,A,B,C}` 메타티어 맵 → 우연 일치, 제외) | `gamification.ts:153` (이미 `as const` + `TierName` 타입 존재) 를 export, BadgeCatalog가 import | medium | 낮음. BadgeCatalog는 컴포넌트(클라), gamification은 service → 순환의존/번들 경계만 확인 |
| **高** | `isTradeCategory` (거래 카테고리 판별) | 2 — `tradeMeta.ts:37` · `community.ts:31` | 거래('팝니다'/'삽니다') 판별. tradeMeta는 직접 비교, services는 로컬 Set.has() — 구현 다르나 결과 100% 동일. PostDetail/CommunityBoard는 이미 tradeMeta판 사용 | `src/components/community/tradeMeta.ts:37` (이미 export, `'use client'` 없음). services 로컬 정의 제거→import | high | 낮음. 한글 문자열 값 자체는 actions zod enum과 결합→**값 변경 금지**, 판별 로직만 통합 |
| **高** | `TRADE_CATS` (`Set(["팝니다","삽니다"])`) | 2 — `actions/community.ts:43` · `services/community.ts:29` | 두 파일 완전 동일. actions는 zod refine·createPost에서 `has()`, services는 isTradeCategory 내부. **동일** | `tradeMeta.ts` 에 `TRADE_CATS` (또는 isTradeCategory 헬퍼)로 단일출처. 양쪽 import | high | 낮음~중. actions는 `'use server'` → client 컴포넌트 import 금지지만 tradeMeta는 client 아님(타입만 import)→안전. tradeMeta가 import하는 Post 타입을 별도 types로 빼면 더 깔끔 |
| **中** | `deckLabel` (아키타입 표시명) | 2 — `DecksPageView.tsx:44` · `MetaPageView.tsx:60` | `nameKo || nameEn || 폴백`. 폴백만 다름(DecksPageView=`a.id`, MetaPageView=`""`), 인자 타입도 부분형 차이 | `src/lib/services/cardgame.ts` (ArchetypeSummary 인근) 또는 cardgame util. 시그니처 `Pick<{nameKo;nameEn}> + fallback` 인자로 일반화 | medium | 낮음. **폴백 차이(`''` vs `id`)를 인자/디폴트로 보존**해야 동작 동일. 기본값 `""`, DecksPageView 호출부에서 `a.id` 전달 |
| **中** | 상대시간 헬퍼군 `relativeKo`/`formatRelative`/`timeAgo` | 4 — `services/community.ts:9` · `recent/page.tsx:7` · `messaging/format.ts:2` · `MetaPageView.tsx:28` | 같은 '방금 전/N분/N시간/N일 전' 사다리. 차이: ① community=주/개월/년 없음 ② messaging.formatRelative=가장 완전(+주/개월/년+null) ③ recent=`{label,daysAgo}` 반환 ④ MetaPageView=ISO 입력+`min<1→1분 전` 보정 | 신설 `src/lib/format/relative-time.ts` (또는 messaging.formatRelative 승격). `formatRelativeKo(input: Date\|string\|number\|null, opts?:{withDaysAgo?})`. 완전판을 정본, ISO·{label,daysAgo}를 옵션/래퍼로 흡수 | medium | 낮음~중. **단순 치환 시 표기 변경**: recent/community는 7일+도 'N일 전'인데 완전판은 '주/개월/년 전'으로 바뀜(UI 카피 변경) · MetaPageView '1분 전' 보정 vs 타곳 '방금 전' · recent의 `daysAgo` 반환형 보존 필수. 동결/런타임 위험은 없음 |
| **中** | 만/억 금액 축약군 `formatKrw`/`formatCost`/`formatMan` | 3 — `TradeFeed.tsx:17` · `DecksPageView.tsx:27` · `DeckCostWidget.tsx:12` | KRW→만/억 축약 같은 알고리즘. 차이: TradeFeed=억 분기+'N만원'(상위호환) · DeckCostWidget='만원' · DecksPageView='만'(원 없음)+`null→'—'`. 사실상 복붙 | 신설 `src/lib/format/krw.ts`. `formatKrwShort(value, opts?:{suffix?:'만'\|'만원'; eok?; emptyDash?})` | medium | 낮음. **접미사/억처리/null표기를 호출부별 정확히 매핑**해야 표기 불변(DecksPageView='만'+'—', DeckCostWidget='만원', TradeFeed=억 분기). 잘못 통합 시 가격 카피 변경 — 시세 정직표기 정책상 주의. ※ `toss/_utils.ts:13 formatKRW`(Intl 천단위)는 도메인 달라 제외 |

## 우연히 이름만 같음 (그대로 둠)

- **`TIER_ORDER` (cardgame, `cardgame.ts:197`)** — `{S:0,A:1,B:2,C:3}` 메타티어 순위 맵. 뱃지 SILVER/GOLD/DIAMOND 배열과 도메인·타입·값 전부 다름.
- **`REGION_ORDER` (배열 JP-first ↔ 정렬맵 EN-first)** — 이름은 겹치나 한쪽은 표시순 배열, 한쪽은 정렬 우선순위 맵. **공용화 시 이름 분리 필수**(같은 상수로 합치면 안 됨).
- **`REGION_LABEL` (cardgame 메타용 단축)** / **`REGION_PRIORITY` (cardgame KR-first)** — cardgame 메타 도메인 전용, dex/cards 카드판 라벨과 의미·값 다름.
- **`GRADES` (UI 서브셋 4등급)** — 9등급 풀어휘가 아닌 화면용 부분집합.
- **`GRADE_COLOR`** — 색상 맵, 등급 어휘(GRADES)와 별개 관심사.
- **`BASE_URL` (외부 API 호스트)** / **`R2_PUBLIC_BASE_URL`** / **`DATABASE_URL`** — 사이트 오리진이 아닌 외부 서비스 호스트·DB 접속자.
- **`RARITY_KO` / `RARITY_LABEL` / `RARITY_COLOR` / `RARITY_CAT_ABBR`** — 단일 정의이거나 색/약어 등 서로 다른 관심사(레어도 도메인 내 중복 아님).
- **`TIER_LABEL` / `TIER_LABELS`** / **`TIER_COLORS` / `META_TIER_COLORS`** — 라벨 vs 색상, 뱃지 vs 메타로 도메인 분리.
- **`CATS` / `SORT_OPTIONS` / `TABS` / `TYPE_META` / `SIZE`** — 각 컴포넌트 로컬 도메인 전용(같은 이름이라도 무관한 옵션/탭/사이즈 맵).
- **`TRADE_STATUS_STYLE` / `DEAL_METHOD_LABEL` / `catColor` / `tradeStatusColor` / `coverImage`** — 단일 정의 또는 서로 다른 표시 관심사.
- **`formatKRW` (`toss/_utils.ts:13`, Intl 천단위)** — 만/억 축약이 아닌 단순 천단위 포맷. 축약군과 도메인 다름.
- **`formatMessageTime` / `formatEarnedAt` / `formatPrice` / `fmtDate`** — 단일 정의 날짜·가격 포맷(중복 아님).

## 추천 순서

연관된 것끼리 한 PR로 묶어, 위험 낮은 순수 상수·함수부터 시작한다.

1. **시세·컨디션 묶음 (高, 한 묶음)** — `CONDITION_COEFFICIENT` + `conditionCoefficient` + `pickPriceUsd` + `GRADES` 를 `src/lib/trades/shared.ts` 한 곳으로. 네 항목이 같은 3개 서비스 파일(marketplace/collection/gamification)에 얽혀 있어 함께 옮겨야 깔끔하고, marketplace의 인라인 계수도 이때 함수로 통일. 순수 상수/함수라 위험 최저 → **가장 먼저**.
2. **BASE_URL (高, 독립)** — `src/lib/constants.ts` 에 `SITE_BASE_URL` 신설 후 4곳 교체. 단순·고립·위험 없음. 1번과 병렬 가능.
3. **지역 상수 묶음 (高~中, 한 묶음)** — `REGION_LABEL`→card-fields.ts, 표시순 배열 `REGION_ORDER`+`REGIONS`→dex-region.ts(한 상수로 통합), 정렬맵은 **이름 분리** `REGION_SORT_PRIORITY`→dex-region.ts. 이름 충돌이 함정이라 네 항목을 **한 번에** 정리해야 혼동을 막는다.
4. **거래 카테고리 묶음 (高, 한 묶음)** — `TRADE_CATS` + `isTradeCategory` 를 `tradeMeta.ts` 로 단일화, actions/services 양쪽 교체. `'use server'`/`'use client'` 경계만 확인. 한글 문자열 값은 변경 금지(판별 로직만).
5. **TIER_ORDER (中, 독립)** — gamification.ts 의 `as const` 판을 export, BadgeCatalog가 import. cardgame.ts 동명 맵은 손대지 않음.
6. **deckLabel (中, 독립)** — cardgame util로 폴백 인자화. 작고 cardgame 도메인 한정.
7. **포맷 헬퍼 2건 (中, 마지막)** — 상대시간군·만억군. **호출부별 표기 카피를 먼저 스냅샷·합의**한 뒤 옵션 시그니처로 정본화. 표시 문구가 바뀔 수 있어 가장 신중히, 별도 PR로 마지막에.

근거: 모든 file:line은 현 워킹트리에서 grep 재확인 완료. 동결 카드팩·DB·런타임 깨짐 위험 항목은 없음(전부 표시/계산 로직). 유일한 함정은 ① `REGION_ORDER` 이름 충돌(배열↔정렬맵 분리 필수) ② 포맷 헬퍼 치환 시 UI 카피 변경 두 가지이며 위 표·순서에 반영함.