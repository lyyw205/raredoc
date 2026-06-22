# 마켓랭킹 → 시세(Price) 페이지 리디자인 계획서

> 상태: **계획만** (미구현). 작성일 2026-06-19.
> 대상 라우트: `/tier-list` (현재 "마켓 랭킹"). 파일: `src/app/[locale]/tier-list/page.tsx`, `MarketRankingsClient.tsx`.
> 사전 매핑·아키텍트 적대검증 완료 — 아래 file:line 근거는 실제 코드 기준.

---

## 1. 목표

현재 "마켓 랭킹" 페이지를 **시세 페이지**로 전환한다. 새 레이아웃(위→아래):

1. **히어로**: 카드 검색 인풋. 검색 시 하단에 해당 종의 여러 카드 버전을 인라인으로 나열.
2. **선택 시**: 그 하단에 선택 카드의 **시세 정보를 지역별로** 나열.
3. **최하단**: 기존 상승률·거래량 등 랭킹을 **가로탭**으로 재배치.

```
[전역 Header]
┌──────────────────────────────────────────────┐
│ ① HERO  "시세"   [ SearchField ]              │
├──────────────────────────────────────────────┤
│ ② 검색 결과: 카드 버전 그리드                  │  ← 검색어 있을 때만
│    CardThumb + 이름/세트/번호/레어도 (클릭=선택) │
├──────────────────────────────────────────────┤
│ ③ 선택 카드: 지역별 시세 패널                  │  ← 카드 선택 시만
│    [일본판] [영문판] [한국판] 섹션별 소스 가격   │
│    (데이터 없으면 빈 상태)                      │
├──────────────────────────────────────────────┤
│ ④ 하단 랭킹 가로탭                             │
│    [상승률][거래량][트렌딩][고점낙폭][신고가]    │
│    선택 탭의 RankingTable (기존 그대로)          │
└──────────────────────────────────────────────┘
```

---

## 2. 확정 결정 (사용자 합의)

| 항목 | 결정 |
| --- | --- |
| ③ 지역별 시세 데이터 소스 | **DB `getCardPrices()` 우선** + 데이터 없으면 빈 상태 UI. 수집 파이프라인 복원은 별도 트랙(이번 범위 밖). |
| ② 종 묶기 방식 | **기존 카드 이름 검색 재사용** (`searchCardsAction` + `src/lib/search.ts`). 진짜 Species 조인은 미도입(필요 시 후속). |
| 진행 범위 | **계획서만** (이 문서). 구현은 승인 후. |
| 라우트 | `/tier-list` **유지**, Header 라벨만 "마켓 랭킹"→"시세" 변경(아래 9-D). |

### 종 검색에 대한 주의
기존 도감 검색은 Species 테이블이 아니라 **카드 이름 문자열 부분일치**(`matchesSearch`)다. "피카츄" 입력 시 피카츄/피카츄V/VMAX/ex가 다 나오는 건 이름에 "피카츄"가 들어있기 때문. 대부분의 메인 포켓몬엔 "종 검색"처럼 잘 동작하지만, **이름에 종명이 안 들어간 카드(트레이너 소유 포켓몬·일부 폼/별칭)는 누락**될 수 있고 드물게 과잉매칭 가능. 정확한 도감 단위 묶기가 필요해지면 후속으로 `getCardsBySpecies()` 추가.

---

## 3. 현재 구조 요약

- **서버** `tier-list/page.tsx:54-82`: `getGainers/getVolumeLeaders/getTrending/getDips/getNewHighs`(`src/lib/services/market.ts`) 7세트 `Promise.all`, `revalidate=3600`. 랭킹은 `MarketStat`(글로벌 `cardId` 집계, 지역분리 없음) 기반.
- **클라이언트** `MarketRankingsClient.tsx`:
  - 레이아웃 `lg:grid-cols-[220px_1fr]`(:349) — **좌측 세로 사이드바**(`<aside lg:sticky lg:top-[68px]>` :351) + 우측 본문.
  - 탭 정의 `TABS`(:324), `TAB_SUBTITLES`(:334), 활성탭 제목 `<h1>` 블록(:381-388).
  - 탭 컴포넌트 5개 `GainersTab/VolumeTab/TrendingTab/DipsTab/HighsTab` — 모두 props로만 구동되는 순수 프리젠테이션. `GainersTab`은 내부 `ToggleGroup`(1주/1달/3달, :80, 로컬 `useState`).
- 히어로·검색·하단 가로탭은 **현재 없음**.

---

## 4. 핵심 배선 (아키텍트 검증 결과 — 함정 해소)

### 4.1 검색 → 시세 배선은 추가 조회 불필요 ✅
- `searchCards.ts:11,56`: `CardSearchHit.id` = **`RegionCard.id`** (KO 우선 locale 행의 id).
- `getCardPrices.ts:27-31`: `regionCardId`를 받아 같은 논리 `Card`의 **모든 지역 형제 RegionCard**로 펼쳐 가격 union.
- ⇒ **선택한 검색 히트의 `.id`를 그대로 `getCardPrices(regionCardId)`에 전달**하면 됨. Card↔RegionCard 별도 조회 불필요.
- 두 함수 모두 `"use server"`(각 파일 1행), 클라이언트에서 직접 호출 가능. **이미 운영 중 패턴**: `DexCatalog.tsx:450`이 `getCardPrices(card.id)` 호출.

### 4.2 지역별 시세 렌더 — "지역 묶기"는 신규 로직 (재사용 대상 교정)
- `getCardPrices`는 **소스(`PriceSource.code`)별로 dedup·priority 정렬된 flat `CardPriceRow[]`** 반환(`getCardPrices.ts:46-74`). 기존 UI(`DexCatalog.tsx:587-616`)는 이를 **지역이 아니라 소스 단위로** 나열함. 즉 **JP/EN/KR 섹션화는 새로 작성하는 클라이언트 로직**.
- **재사용 대상(교정됨)**: 현재 시세 렌더는 `DataRow` + 로컬 `PRICE_SOURCE_META` + `formatPrice()`(`DexCatalog.tsx:210, 585-620`)를 쓴다. 기존 시세 모달과 시각적 일관성을 원하면 **이 3개를 공용 컴포넌트(`CardPriceList`)로 추출**해 재사용. (초안에 적었던 `PriceText/PriceSourceHeader/Card` 조합은 실제 시세 UI와 다름.)
  - `PriceText`, `DeltaBadge`, `EmptyState` → `@/components/toss` 존재.
  - `PriceSourceHeader` → **`@/components/cards`** 경로(toss 아님), props `{emoji, title, href?, rightText?}`.
- **⚠ 지역 키 매핑 함정**: `CardPriceRow.region` 값은 `PriceSource.marketRegion` 기준 **`US | GLOBAL | JP | KR`** (`getCardPrices.ts:21`)다. `card-fields.ts:8`의 `REGION_ORDER = ['JP','EN','KR']`와 **키가 다름** → 그대로 키잉하면 `US/GLOBAL` 행이 조용히 누락된다. **명시적 매핑 필요**:

  ```
  marketRegion → 표시 지역
    US, GLOBAL → 영문판(EN)
    JP         → 일본판(JP)
    KR         → 한국판(KR)
  ```

### 4.3 하단 가로탭 — 레이아웃 이동만, 서버 데이터 무손상
- 5개 탭 컴포넌트·`TABS`·`TAB_SUBTITLES`는 props 구동이라 그대로 둠. 서버 fetch(`page.tsx:54-82`) 변경 없음.
- **제거 대상**: `lg:grid-cols-[220px_1fr]` 그리드(:349) + 스티키 `<aside>`(:351) + 활성탭 `<h1>` 블록(:381-388). `top-[68px]`는 헤더 높이용이라 하단바로 옮기지 말 것.
- 가로탭 컨트롤: `SegmentedControl variant='underline'`(toss) 권장, 또는 `Tab`. `GainersTab` 내부 기간 `ToggleGroup`은 **별개 인스턴스로 유지**.

---

## 5. 신규/수정 컴포넌트

| 컴포넌트 | 신규/수정 | 역할 |
| --- | --- | --- |
| `PricePageClient` (신규, `tier-list/`) | 신규 | 최상위 클라이언트. 상태: `query`, `searchResults`, `selectedRegionCardId`. + 서버에서 받은 랭킹 데이터(`MarketRankingsData`) 보유. 기존 `MarketRankingsClient`를 래핑/대체. |
| 히어로 검색 | 재사용 | `SearchField`(toss) + 제출 시 `searchCardsAction` 호출, 결과는 **인라인 상태**(라우팅 X). |
| `CardVersionResults` (신규) | 신규 | 검색 히트 그리드. `CardThumb` + 이름/세트/번호/레어도. 클릭 시 `selectedRegionCardId = hit.id`. |
| `CardPriceByRegion` (신규) | 신규 | `getCardPrices(selectedRegionCardId)` → `CardPriceRow[]`를 `marketRegion→표시지역` 매핑으로 묶어 일본판/영문판/한국판 섹션 렌더. 빈 상태 2계층(§7). |
| `CardPriceList` (추출) | 리팩터 | `DexCatalog.tsx`의 `DataRow`+`PRICE_SOURCE_META`+`formatPrice`를 공용화(선택). |
| 하단 랭킹 섹션 | 수정 | 세로 사이드바 → 가로 `SegmentedControl`. 탭 컴포넌트 5개 재사용. |

---

## 6. 서버/액션

- 랭킹 7세트는 **서버에서 계속 fetch**(하단탭용, `revalidate=3600` 유지).
- 검색·시세는 **온디맨드 서버액션**(`searchCardsAction`, `getCardPrices`) — 초기 서버부하 없음. 둘 다 `"use server"`, 클라이언트 호출 검증됨.
- 지역 그룹핑은 클라이언트에서 `CardPriceRow.region` 기준 수행(또는 얇은 `getCardPricesByRegion()` 래퍼 신설 — 선택).

---

## 7. 빈 상태 UX (2계층)

DB Price/Trade가 ~90% 비어 있으므로 빈 상태가 기본값이 될 수 있음.
1. **패널 전체 빈 상태**: `prices.length === 0` → "아직 수집된 시세가 없어요" (기존 `DexCatalog.tsx:589` 패턴 참고).
2. **지역 섹션별 빈 상태**(신규): 특정 지역(JP/EN/KR)에 소스 행이 없을 때 해당 섹션만 빈 표시. 레이아웃 깨지지 않게.

---

## 8. 미해결 sub-decisions (구현 전 확인 권장)

- **`/tier-list` 이중 네임스페이스**: `/tier-list/[setCode]`는 **별개 "투자 티어리스트"** 기능(`tier-list/[setCode]/page.tsx:66`)이고, 홈 타일(`app/[locale]/page.tsx:195`)도 "투자 티어리스트"→`/tier-list`로 링크. 메인 `/tier-list`를 시세로 바꾸면 이 홈 타일이 시세 페이지로 착지함 → **홈 타일 라벨/링크 재고 필요**(§9-D에서 처리).
- 시세 패널 시각 톤: 기존 도감 시세 모달과 동일하게 갈지(`DataRow` 추출 재사용) vs 새 디자인.
- 지역 그룹핑을 클라이언트에서 할지 `getCardPricesByRegion()` 서버 래퍼로 뺄지.

---

## 9. 구현 시퀀스 (작은 단계, 리스크 오름차순)

### A. 하단 가로탭 재배치 (리스크 최저, 데이터 무변경)
- `MarketRankingsClient`에서 `lg:grid-cols-[220px_1fr]` 그리드(:349) + 스티키 `<aside>`(:351) + 활성탭 `<h1>`(:381-388) 제거.
- 5개 탭을 하단 섹션으로 옮기고 상단에 가로 `SegmentedControl variant='underline'` 배치. `GainersTab` 내부 `ToggleGroup` 유지.
- 페이지 정상 동작 확인(서버 데이터 그대로).

### B. 히어로 검색 + 인라인 결과
- `Container` 상단에 히어로(`SearchField` + 제목) 삽입(`HomeHero.tsx:47-55` 패턴 참고하되 라우팅 X).
- 제출 → `searchCardsAction(query)` → `CardSearchHit[]`를 상태에 저장.
- `CardVersionResults`로 그리드 렌더. 클릭 시 `selectedRegionCardId = hit.id` 저장.

### C. 선택 카드 → 지역별 시세 패널
- `getCardPrices(selectedRegionCardId)` 호출 → `CardPriceRow[]`.
- `marketRegion(US/GLOBAL/JP/KR) → 표시지역(JP/EN/KR)` 매핑으로 그룹핑, `REGION_LABEL`(`card-fields.ts:66`)로 섹션 라벨.
- `CardPriceList`(또는 `DataRow`+`PRICE_SOURCE_META`+`formatPrice` 재사용)로 소스별 행 렌더. 빈 상태 2계층(§7).

### D. 네비/라우트/반응형 마감
- `Header.tsx:53` 라벨 "마켓 랭킹" → "시세" (라우트 `/tier-list` 유지).
- 홈 타일 `app/[locale]/page.tsx:195` "투자 티어리스트"→`/tier-list` 라벨/링크 재고(시세 착지 문제, §8).
- `sitemap.ts:17`은 라우트 유지 시 변경 불필요.
- 모바일/데스크톱 반응형, 카피 다듬기.

---

## 10. 리스크 & 주의

- **★ 시세 데이터 공백(최대 리스크)**: DB Price/Trade ~90% empty. 새 페이지는 데이터 채움 전까지 대부분 빈 상태. 수집 파이프라인 복원은 별도 트랙(사용자 보류).
- **지역 키 매핑**: `US/GLOBAL`→EN 매핑 누락 시 영문판 시세가 통째로 사라짐(§4.2). 반드시 명시 매핑.
- **Next.js 커스텀 버전**(AGENTS.md): 코드 작성 전 아래 가이드 확인.
  - 서버액션: `node_modules/next/dist/docs/01-app/01-getting-started/07-mutating-data.md`, `.../03-api-reference/01-directives/use-server.md`
  - (URL 상태 쓸 경우) `.../03-api-reference/04-functions/use-search-params.md`
- **검색 헬퍼 단일출처**(메모리): 정규화/매칭은 `src/lib/search.ts`만 사용. 자체 로직 금지.
- **동결 카드팩**(AGENTS.md): 이번 작업은 읽기전용 표시라 EN/KR 연결 변경 없음 → 안전. 종↔버전 매핑을 건드리게 되면 사용자 확인 필수.
- **환율 하드코딩**: USD/JPY/EUR→KRW 고정상수(`src/lib/trades/shared.ts`). 실시간 아님.
