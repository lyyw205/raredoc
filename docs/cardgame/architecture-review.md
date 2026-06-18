<!-- 자동생성: cardgame-arch-review 워크플로(2026-06-17, 6렌즈+적대검증). -->

# cardgame 폴더 아키텍처 점검

## 종합 평가

**완성도 등급: 보통(탄탄한 골격 + 한정적 토대 공백).** cardgame 미니앱은 "server `page.tsx`(얇은 데이터 로더) + `XxxPageView`(client 상호작용)" 분리가 6섹션 14개 라우트에서 일관되게 지켜지고, 도메인 데이터 접근을 `src/lib/services/cardgame.ts` 단일 출입구로 모으며, client View가 서비스에서 **`import type`만** 가져와 prisma/로직이 번들로 새지 않는다 — 신규 개발자가 폴더 트리만 봐도 기능 지도가 그려지고 새 섹션을 추가할 템플릿이 명확하다는 점에서 토대 자체는 탄탄하다. 다만 ① 데이터 접근 경계가 `cards/page.tsx` 한 곳에서 깨지고(폴더에서 유일하게 prisma 직접 호출), ② App Router의 스트리밍/에러 격리 인프라(loading·error·Suspense)가 cardgame 전역에 0건이며, ③ 티어·등수·delta 같은 **시각 언어와 데이터 계약**이 이미 파일 간에 *드리프트*(같은 개념이 다른 색·다른 분기)를 일으키기 시작했다. 이들은 "미완성이라 곧 바뀔 잔소리"가 아니라 **섹션이 늘수록 비용이 복리로 커지는 토대 결정**이라, 지금(가장 싼 시점) 못박아두면 이후 섹션이 패턴을 상속받는다. 결론적으로 "어느 개발자가 봐도 탄탄한가"에는 **"골격은 Yes, 토대 규칙 4개를 명문화하면 Yes"**로 답한다.

## 잘 된 점(유지)

- **server-thin / client-interactive 분리가 6섹션 전반 일관** — `page.tsx`가 `params`/`searchParams`만 풀고 `services/cardgame`에서 `Promise.all`로 병렬 로드 후 얇게 client View로 위임(`decks/page.tsx`, `tournaments/page.tsx`, `guide/page.tsx`). 데이터 패칭과 렌더의 경계가 깨끗하다.
- **client View가 서비스에서 `import type`만 가져옴** — `MetaPageView`·`DecksPageView`·`DeckDetailView`·`TournamentsPageView`·`RegionMetaView` 전부 타입만 import해 client 번들에 prisma/서비스 로직이 새지 않고, 서비스 반환 타입이 단일 계약(contract)으로 공유된다. 경계 위생이 좋다.
- **서비스가 plain serializable 뷰모델만 반환** — Date→ISO 변환, FK 없는 수동 조인을 `nameById` Map으로 흡수해 transform 책임이 서비스에 모이고 page는 `await→props`만 한다.
- **detail([id]) not-found·빈 상태 컨벤션 통일** — `getX(id)===null`이면 '뒤로가기 링크 + `EmptyState`' 동일 골격을 `decks/[id]`·`tournaments/[id]`·`lists/[id]`가 공유(`decks/[id]/page.tsx:21-42`, `tournaments/[id]/page.tsx:37-58`). 신규 detail 섹션의 명확한 템플릿.
- **폐기 라우트를 깨진 채 두지 않고 redirect 스텁으로 흡수** — `sets`·`sets/[id]`·`cards/[id]`가 `/dex`·`/cards`로 redirect(사유 주석 포함). 라우트 표면이 사이드바 nav와 어긋나지 않게 관리됐다.
- **공용 위젯 호이스팅·colocation 규칙이 합리적** — cross-page 위젯(`DeckIcon`·`CardThumb`·`TierShareButton`)은 `components/cardgame`로 승격, page-local 위젯(`DeckCostWidget`·`DeckCodeButton`)은 `[id]`에 colocate. `CardThumb`은 `cards/CardGridItem` 패턴에서 의도적 추출(주석에 출처 명시)돼 프리미티브 수용지(landing zone)가 이미 준비돼 있다.

## 구조적 개선 — 우선순위

| 우선순위 | 무엇을 | 왜 (아키텍처 영향) | 어떻게 | 영향범위/리스크 |
|---|---|---|---|---|
| **高** | `cards/page.tsx`의 데이터 접근을 서비스로 승격 (`loadCards`→`getCardCatalog(filters)`) | cardgame 폴더에서 **유일하게** `@/lib/prisma`를 직접 import(`cards/page.tsx:3,72`)해 `loadCards`(:41-156)가 where 조립·`findMany`·KR>JP>EN dedupe·정렬·`CatalogCard` 매핑까지 라우트에 인라인. 13/14 page는 서비스만 호출하는데 cards만 '얇은 셸' 계약을 깬다. **이미 드리프트 발생**: 동일 KR>JP>EN 선택 규칙이 page(`REGION_ORDER` :21, region-only tie-break)와 서비스(`resolveCardImages` PRIORITY `cardgame.ts:448`, image보유 가중 tie-break)에 **다르게** 구현됨 → `regionCard.imageSmall` 등 컬럼 변경 시 두 곳을 따로 고쳐야 하고 한쪽만 고치면 cards 탭만 조용히 어긋남 | `loadCards`/`CatalogCard`를 `services/cardgame.ts`의 `getCardCatalog(params)`로 이동(`/dex`엔 이미 동형 `getDexCatalog`가 선례, `dex-catalog.ts:201`). KR>JP>EN 선택을 서비스 내 헬퍼 1개로 통합. page는 `await getCardCatalog(sp)`+그리드 렌더만 남김. `CardGridItem`은 추출돼 있는 `CardThumb` 기반으로 재구성 | 1개 라우트·국소적. 동작 회귀 없음. 기존 서비스 패턴과 정확히 일치해 기계적 |
| **高** | cardgame 시각 프리미티브 1급화 (`TierBadge`·`PlacingBadge`·`DeltaBadge`·`StatBadge`) + 토큰 단일화 | 미니앱 핵심 시각 언어인데 단일 소스가 없어 **이미 드리프트 중**: `TIER_COLORS`가 `MetaPageView.tsx:53`·`DecksPageView.tsx:14`·`DeckDetailView.tsx:21` 3벌 + `lib/constants.ts:46`에 색이 다른 4번째 팔레트. 등수 메달 뱃지 3벌인데 `DeckDetailView.tsx:158-168`은 1/≤4 2분기 vs 나머지 2곳은 금·은·동 3분기로 **이미 어긋남**. 언더독/함정/카운터 뱃지 2벌도 크기 토큰이 갈림. ★ `src/components/toss/data/DeltaBadge.tsx`에 범용 프리미티브가 이미 있는데 cardgame이 import 안 하고 인라인 복제 | `components/cardgame`에 `<TierBadge tier>`·`<PlacingBadge placing>`·`<StatBadge>` 추가, delta는 **기존 toss `DeltaBadge` 채택/래핑**. `TIER_COLORS`·임계 상수는 `lib/cardgame` 단일 모듈로. 거대 뷰는 소비만 | 순수 프레젠테이션. 데이터/정체성 무관. `components/cardgame` 수용지가 이미 있어 저비용. 변경마다 3~4파일 동기화 비용 제거 |
| **高** | 죽은 타입 계약(`ArchetypeWithCards.cards`/`cardList`/`heroCardIds`) 정리 | 타입은 카드 데이터를 약속하나 소스가 영구 빈 값: `toSummary()`(`cardgame.ts:238-246`)가 `heroCardIds:[]`·`cardList:[]`·`variants:[]` 하드코딩(DeckCard/DeckVariant 테이블 드롭 2026-06-11). `getArchetype(:330)`이 빈 배열로 `resolveDeckCardMap` 호출→cards 항상 `{}`. `DeckDetailView`는 `ArchetypeWithCards`를 prop으로 **요구하나 `.cards`/`.cardList`/`.heroCardIds`를 한 번도 안 읽음**(grep 0). `home/MetaDeckSection.tsx:44-47,80-97`만 실제로 `heroCardIds.map(...cards[id])`로 3번째 썸네일 컬럼 렌더 → 영구 빈 배열이라 컬럼 통째로 조용히 증발 | 죽은 필드를 타입에서 옵셔널/deprecate로 분리. (a) `DeckDetailView` prop을 `ArchetypeWithCards`→`ArchetypeSummary`로 낮춤, (b) home은 `heroCardIds` 빈 시 렌더 분기 자체 차단. 복원 시 `toSummary` 한 곳만 채우면 전 계약이 살아나도록 결선만 보존 | 런타임 크래시 아님(graceful). 저비용. 타입이 거짓 약속을 멈춰 신규 개발자 오인 방지 |
| **中** | cardgame 스트리밍/에러 경계 인프라 도입 (`loading.tsx`·`error.tsx`·`Suspense`) | cardgame 서브트리에 loading/error 파일 0·Suspense 0·`use server` 0(grep). 메타 `page.tsx:84-92`는 7개 서비스를 단일 `Promise.all`로 막고, `tournaments/[id]/page.tsx:35`는 대형 standings를 단일 await. 핵심 경로(메타 7콜·standings)는 `.catch` 미적용이라 서비스 1개가 throw하면 세그먼트 전체가 Next 기본 에러로 추락. layout이 `"use client"`라 섹션 전환 시 즉시 피드백 없음. **단 이건 cardgame만의 회귀가 아니라 `src/app` 전역 컨벤션 부재**라 cardgame 단독 critical은 과함 | 섹션 공통 `cardgame/loading.tsx`(스켈레톤)+`error.tsx` 도입, 무거운 `[id]` 라우트는 page를 셸로 두고 무거운 서브트리를 `<Suspense>`로 감싼 async 서버 컴포넌트로 분리해 스트리밍. `STANDINGS_DISPLAY_CAP`(이미 존재) 같은 방어가 있어 갈아끼우기 쉬움 | 신규 파일 위주, 기존 동작 보존. 토대 단계에 깔면 이후 섹션이 상속 |
| **中** | 정적 페이지의 광범위 `'use client'` 경계 재단 (특히 Guide·Meta) | `matchups`/`tournaments/[id]`는 '순수 서버 JSX + 작은 client 섬'을 이미 잘 보여주는데, `GuidePageView`(485줄, 정적 FAQ·룰링·용어집을 client 번들에 적재)·`MetaPageView`(recharts 전체를 client로)는 정반대로 페이지 전체 client. 같은 폴더에서 경계 전략이 양분 → '어느 쪽이 표준인가' 모호 | 표준을 'matchups 패턴(서버 셸+좁은 client 섬)'으로 정의. Guide의 FAQ/룰링/용어집 마크업은 서버 컴포넌트로, 검색·탭만 client 래퍼로. Meta는 차트(recharts)·공유버튼만 client 자식으로 분리 | 미세 리팩터 아닌 '경계 전략 단일화' 결정. View 리팩터라 회귀 검증 필요 |
| **中** | 거대 서비스(`cardgame.ts` 47 export/1217줄) 도메인 분할 + mock 격리 | cardgame 전 섹션의 단일 의존 허브에 카드해석·아키타입·메타집계·상성·대회·랭킹·룰·용어가 한 파일 공존. 섹션이 늘수록 선형 비대. `mock.ts`(1178줄)는 9개 테이블 export하나 실효 소비처는 `CARDS` 폴백 1개뿐(나머지 8개는 DB 대체 완료) | 도메인별 파일 분할(`cardgame/cards.ts`·`archetypes.ts`·`meta.ts`·`tournaments.ts`·`reference.ts`) + `cardgame.ts`는 barrel로 호환 유지. `CARDS` 폴백만 좁은 `mock-card-fallback.ts`로 분리, 죽은 8개 테이블 export 삭제 | 내부 재배치, 외부 계약 불변(barrel). 저위험. 이행 완료 경계가 코드로 드러남 |
| **低** | client 루트 컴포넌트 명명 규약 1줄 정립 + nav 단일 config | `XxxPageView`(cardgame) vs `MarketRankingsClient`(tier-list) vs `RegionMetaView`/`DeckDetailView`(Page 접두 누락)로 client 진입점 명칭이 분기. nav도 `layout.tsx:8-15` `NAV_ITEMS` 하드코딩과 실재 라우트(matchups·lists·sets)가 별도 출처 | 'route client 셸=`*PageView`, 상세=`*DetailView`, 공용 위젯=명사' 규칙을 AGENTS에 1줄. nav를 `cardgame/nav.ts` config로 빼 primary/secondary/deprecated 분류 | 신규 파일부터 적용, 강제 리네이밍 불필요. 저위험 |

## 지금은 건드리지 말 것

- **미세 네이밍 통일을 위한 일괄 리네이밍** — `XxxPageView`/`XxxView`/`XxxClient` 혼용은 규약 1줄만 명문화하고 **신규 파일부터** 적용. 기존 파일 강제 개명은 미완성 단계에서 diff 노이즈만 키운다.
- **`mockToReal`/`STARTER_CARD_IDS` 하드코딩 id의 실 카드 치환** — mock→real 이행이 진행 중이고 가상 mock id(`m5-118` 등)는 데이터 결선 문제라, 카드 매칭 복원 작업과 함께 처리. 지금 손대면 곧 다시 바뀐다.
- **`community` 섹션을 cardgame 패턴에 억지 편입** — 공용 `CommunityBoard` 재사용은 옳은 결정(중복 방지). '섹션=자기 서비스+자기 뷰' 예외로 **둘지/전역으로 뺄지**는 community 자체 방향이 정해진 뒤 결정.
- **`generateMetadata`/SEO 일괄 적용** — 미완성이라 라우트 표면이 계속 바뀐다. detail 라우트가 안정화된 뒤 `cardgame/layout` 기본 metadata + `[id]` 동적 제목 규칙을 한 번에. 지금은 우선순위 낮음.
- **`[id]` 상세의 page-인라인 vs View-위임 비대칭** — `tournaments/[id]`·`lists/[id]`가 상호작용 없는 순수 서버 렌더라 현 상태로 정상. 정렬·페이징 같은 상호작용이 **실제로 필요해질 때** View로 분리. 지금 선제 분리는 시기상조.
- **`toSummary`의 `cardList`/`variants` 등 잔여 필드 완전 제거** — 위 高 항목에서 *타입 정리(옵셔널/deprecate)*까지만 하고, 필드 자체의 물리적 삭제는 카드 매칭 복원 계획과 묶어 한 번에(복원 결선 보존 트레이드오프 존재).

## 한 줄 결론

골격(server-thin/client-interactive·서비스 단일 출입구·redirect 흡수)은 탄탄하니 유지하고, **지금 가장 싸게 못박을 4개 토대 규칙** — ① cards의 prisma 직접 접근을 `getCardCatalog`로 서비스 복귀, ② 티어·등수·delta 시각 프리미티브 1급화(기존 toss `DeltaBadge` 채택), ③ 죽은 `ArchetypeWithCards` 카드 계약 정리, ④ loading/error/Suspense 경계 도입 — 만 선제 적용하면 이후 섹션 확장이 패턴을 상속받아 비용이 합으로 끝난다.