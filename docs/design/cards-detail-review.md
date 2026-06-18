<!-- 자동생성: cards-detail-review 워크플로(2026-06-17). -->

# cards 상세 페이지 완성도 점검

## 종합 평가

**완성도 등급: B+ (양호, 손볼 곳은 명확하고 좁다)**

두 페이지(`page.tsx` 781줄 · `owners/page.tsx` 156줄)는 **데이터 가공과 프레젠테이션이 이미 잘 분리**돼 있는 건강한 코드다. `extractPoketraceTiers`(page.tsx:142)·`buildChartData`(201)·`buildVersions`(243)가 모듈 스코프 순수 함수로 추출돼 있고, 400줄 렌더는 "위에서 다 계산하고 아래는 거의 순수 JSX" 구조라 781줄치고 가독성이 좋다. 외부 9개 소스가 `try/catch`·`.catch(()=>[])`로 격리돼 한 출처가 죽어도 페이지가 안 죽는 방어 설계도 적절하다.

등급을 A로 못 올리는 이유는 **세 가지 실제 결함**이다 — (1) `getCard()`가 두 페이지에 중복 구현되며 owners 쪽 레어도 라벨이 이미 미묘하게 드리프트해 있고(인쇄본별 레어도 오버라이드 카드에서 표면화), (2) URL 파라미터 `cardId`가 두 개의 다른 엔티티 id(RegionCard id vs 정규 Card id)를 동시에 의미해 함수 분해 시 가장 조용히 깨질 함정이며, (3) 단일 카드 시세 쿼리가 prisma 직접 인라인이라 파일 내 유일한 패턴 예외다. 모두 **현재 동작은 정상**이고 수정도 동작 보존적이라, 리스크 낮은 정리 작업으로 A에 도달할 수 있다.

## 잘 된 점

- **데이터/프레젠테이션 분리가 모범적.** `extractPoketraceTiers`(page.tsx:142)·`buildChartData`(201)·`buildVersions`(243)가 컴포넌트 본문 밖 모듈 스코프 순수 함수로 있어 입출력이 명확하고 단위 테스트·재배치가 쉽다. 400줄 렌더가 "계산+JSX 뒤범벅"이 아니라 데이터는 위에서(page.tsx:291-374) 다 계산하고 아래는 거의 순수 JSX다.
- **폴백 전략이 주석으로 의도까지 문서화.** `getCard`의 ERD 우선 → 영문 API 폴백 → DB 재폴백(page.tsx:108-127)이 주석과 함께 명시돼 시세/탭 핵심 분기를 추적하기 쉽다.
- **부작용 격리가 올바름.** `recordCardView`를 `void`로 fire-and-forget(page.tsx:297) + 서비스 내부도 try-catch로 추적 실패를 삼켜(market.ts:289) 렌더를 절대 막지 않는다. `Promise.all`로 priceHistory·poketrace·bunjang 3소스 병렬 로드, PokeTrace 히스토리만 id 의존성 때문에 순차로 분리(page.tsx:304·336)한 것도 합리적.
- **props 계약이 컴파일 타임에 강제됨.** `buildVersions`가 `CardVersion` 타입(CardVersionTabs.tsx:6-14)을 직접 참조하고, `PriceChart`의 history/lineLabels/ranges 3-prop이 `buildChartData` 출력 + 컴포넌트가 export한 동일 `PT_RANGES`로 맞물려 라벨/레인지 불일치가 없다. `versions.length>1` 가드(page.tsx:362,390)로 단일 로케일 시 안전 폴백.
- **캐시 정책이 데이터 성격에 맞게 분리.** 상세=`revalidate=3600`(ISR), owners=`force-dynamic`(보유자/세션 실시간)으로 의도적으로 갈려 있고 주석으로 명시.
- **owners 페이지 진입 경로가 안전.** `stats.offerable>0`일 때만 링크 노출(page.tsx:473)되고, owners의 `getOwnersForCard`/`getCardOwnerCounts`(marketplace.ts:122,179) 계약과 cardId(=localeId)가 일치.

## 개선안(우선순위)

검증으로 REAL 확정된 항목 위주. 모든 수정은 **값 불변·동작 보존**(시세/탭/차트/조회기록).

| # | 무엇 | 왜 (file:line) | 어떻게 (연계 안전하게) | 영향범위 |
|---|------|----------------|------------------------|----------|
| **1** | **URL `cardId`가 두 엔티티 id를 겸함 — 분해 전 이름 분리** | 가격·보유·조회·owners는 URL `cardId`(=RegionCard id)를 쓰는데 덱만 `loaded.card.id`(정규 Card id)를 씀(page.tsx:297,307,331,358,475 vs 597-598). 변수명이 같아 분해 시 한쪽을 잘못된 id로 바꾸면 **에러 없이 빈 결과**(가격 0건/덱 0건)로 조용히 degrade(price `.catch(()=>[])` 329, getDecksUsingCard `[]` 979) | 값은 그대로 두고 이름만 분리: `const regionCardId = cardId; const canonicalCardId = loaded?.card.id`. 가격/보유/조회/owners=`regionCardId`, 덱=`canonicalCardId`. 분해 작업의 **선행 안전장치** | page.tsx 단일 파일, 값 불변 |
| **2** | **두 페이지 `getCard()` 중복 + owners 레어도 이미 드리프트** | 동일 로드 골격(`loadCardByLocaleId`→`searchCards` 폴백)이 page.tsx:111-127와 owners/page.tsx:13-57에 복붙. ★이미 갈라짐: `cardToTCG`(queries.ts:380-390)는 `primary.rarityNameJa ?? lc.rarityNameJa`로 **인쇄본 레어도 우선**인데 owners/page.tsx:21은 `card.rarityNameJa`(논리카드)만 읽어 인쇄본 오버라이드 카드에서 두 페이지 레어도가 지금도 다름. getCardDetail.ts:54가 세 번째 재구현 | (a) 최소·고가치: owners/page.tsx:19-24 인라인 삼항을 `pickRarityLabel(region,{nameJa,nameEn,nameKo,code})`(card-fields.ts:9-24) 호출로 교체(런타임 동일, `?? null` 부착). (b) 더 나아가 공유 로더를 queries.ts로 1급화 — 단 상세의 `region!=='EN'` 분기(EN은 라이브 API 우선)는 **의도된 정책이라 그대로 보존**, EN 폴백 통합은 사용자 확인 후 | owners 헤더 레어도, 잠복 불일치 해소 |
| **3** | **단일 카드 시세 쿼리가 prisma 직접 인라인 — 서비스 부재** | page.tsx가 prisma 직접 import(14)해 25줄 `findMany+select(priceSource join)+map→PricePoint`를 본문에 박음(305-329). 파일 내 **유일한 직접 prisma 호출**(나머지는 전부 서비스/api). ★`PricePoint`의 `source/sourceName/sourceRegion/condition` 4개 모두 dead(매핑만 되고 소비처 0 — 차트는 recordedAt/normal/holofoil만) | `getCardPriceHistory(regionCardId): Promise<PricePoint[]>`를 market.ts(선례 214) 또는 신규 price 서비스로 추출 + `PricePoint` 타입 동반 이동. select를 recordedAt/normal/holofoil로 슬림화(priceSource join·dead 컬럼 제거). page에서 prisma import 제거. **소비처 0이라 무위험** | page.tsx + market.ts, 동작 불변 |
| **4** | **시세 3출처 카드 JSX 부분 중복 — 헤더/값 프리미티브 공통화** | TCGplayer/eBay/번개 세 `<Card>` 블록(page.tsx:613-718, ~106줄)이 헤더(국기+제목+↗)·title-1 가격·`— 데이터 수집 중` 폴백(647·685·716 3중복)·`range.low!==high` 가드(639·672) 반복. 표기 규칙 변경 시 3곳 손대야 함 | 헤더(`<SourceHeader flag title href/>`)와 값 프리미티브(title-1 가격, 수집중 폴백)만 공통화. ★body는 발산 큼(eBay median+DB폴백 679-683, 번개 ₩/검색어)이라 단일 컴포넌트 통합은 무리 → **헤더 공통화로 ~30줄 절감**이 현실적. 순수 프레젠테이션이라 렌더 불변 | page.tsx 단일 파일 |
| **5** | **400줄 렌더를 섹션 컴포넌트로 분리** | `CardDetailPage` return이 한 함수 본문 인라인(page.tsx:376-779). 데이터(291-374)와 5개 시각 영역(메인 2-col 387-594/덱역링크 596-599/시세 602-608/3출처 611-719/컨디션표 722-761/푸터 764-776)이 한 곳에 | 데이터 계산은 페이지에 남기고 `<CardInfoPanel>`·`<PriceSection>` 동기 컴포넌트로 추출. props는 이미 평탄화된 plain 값(341-374)이라 그대로 전달=렌더 불변. `DecksUsingCardSection`(36)이 같은 패턴 선례 | page.tsx, diff/스캔 단위 축소 |

## 지금 건드리지 말 것 (시기상조/취향)

- **공유 로더 전면 통합(getCard 셰이프 단일화).** 상세는 `cardToTCG` 풀 TCGCard, owners는 평탄 헤더 DTO로 **셰이프가 본질적으로 다르다**. 완전 통합은 무리이고, EN-API 폴백 가지(flat rarity 문자열)와 RegionCard 가지(rarityName* 원시필드)를 한 형태로 안 맞추면 **API 폴백 경로에서 rarity가 사라지는** 동작 변화 위험. 위 #2의 (a) 1줄 교체부터. 전면 통합은 EN 폴백 정책 의도(상세=라이브/owners=DB) 확인 후.
- **`SUBTYPE_KO`/`FORMAT_LABEL`/`SUPERTYPE_KO` lib 이동.** 순수 데이터 이동이라 안전하나, 실제 중복 소비처(도감 카탈로그 등)가 생길 때 이득. 지금은 supertype 인라인 삼항(430)을 맵 조회로 통일하는 **파일 내 일관성** 정도가 한계. 저우선.
- **`extractPoketraceTiers` 14필드 평탄 리턴 → 네임스페이스 묶기.** ebay/tcg 대칭을 `buildSourceTier()`로 묶는 건 깔끔하나 순수 내부 정리이고, 리턴/디스트럭처 두 곳 동기화 비용만 있는 잔소리 경계. **동결 우선 #1~#3 끝낸 뒤**.
- **약어 지역변수 리네이밍**(`ebayNm→ebayNearMint`, `l→locale`, `to→evoTo`). 콜백 지역 스코프라 영향 없지만 순수 취향. 손대면 무해하나 단독 작업 가치는 낮음.
- **상대경로 뒤로가기 링크**(`../../dex` page.tsx:380, `../${cardId}` owners:102) → 절대경로 통일은 합리적이나 현재 동작 정상. 라우트 구조 변경 시 함께 처리.

## 한 줄 결론

데이터/프레젠테이션 분리가 이미 모범적인 B+ 코드 — **#1(cardId 이름 분리, 분해 선행) → #2(a)(owners 레어도 1줄 교체) → #3(시세 쿼리 서비스 추출)** 세 가지 동작보존 정리만으로 시세/탭/차트/조회기록을 안 건드리고 A급 완성도에 도달한다.