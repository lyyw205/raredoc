# PokeTrace (poketrace.com) 분석 리포트

> 조사일: 2026-05-13  
> URL: https://poketrace.com  
> 성격: **API-first 포켓몬 카드 시세 데이터 공급자** (B2B/개발자 타겟)  
> 핵심 포지션: TCGPlayer + eBay + CardMarket 3개 마켓 시세를 단일 API로 제공

---

## 1. 사이트 개요

- 60,000+ 포켓몬 카드 실시간 시세 추적
- Base Set(1996) ~ 최신 Scarlet & Violet 전 세대 커버
- **US 마켓**: TCGPlayer(정가 기준) + eBay(실거래 낙찰가)
- **EU 마켓**: CardMarket(시세 트렌드 + 활성 매물)
- PSA·BGS·CGC·SGC·ACE·TAG 6개 그레이딩 회사 등급별 가격
- 24/7 연속 업데이트 (일괄 배치 아님), 응답속도 ~150ms
- 개발자/비즈니스 타겟 API 서비스 (일반 유저용 UI는 Catalog·Value Checker)

---

## 2. 페이지별 분석

### 2-1. 홈 (`/`)

**메시지**: "CHECK YOUR POKEMON CARD VALUE"  
**핵심 수치 강조**:
- 60,000+ cards
- 3 markets (TCGPlayer / eBay / CardMarket)
- Free 플랜 제공
- 24/7 업데이트

→ 개발자·수집가 모두를 유입 타겟으로 하는 랜딩

---

### 2-2. Card Catalog (`/catalog`)

일반 유저가 카드 시세를 직접 검색·열람하는 UI

**퀵 검색 태그**: Charizard / Pikachu / Mewtwo / Gengar / Umbreon / Base Set / Pokemon 151 / Alt Art

**필터 옵션**:
| 필터 | 선택지 |
|---|---|
| 카드 상태 | All / Graded / Raw |
| Set | All Sets |
| Market | US / EU |
| Product type | single / sealed / code_card / accessory |
| Product family | booster_box / booster_pack / booster_bundle / elite_trainer_box / tin / deck / box_collection / blister |
| Language | All Languages |
| Trend | All Trends |
| Condition/Grade | NM / LP / MP / HP / DMG + PSA·BGS·CGC 등급 |
| Variant | Normal / Holofoil / Reverse Holofoil / 1st Edition Holofoil |

**카드 카드에 표시되는 정보**:
- 카드 이미지
- 카드명 + 세트명
- US 가격 ($) + EU 가격 (€) 동시 표시
- "ADD TO PORTFOLIO" 버튼 (포트폴리오 기능)

→ **봉탕(sealed) 상품도 조회 가능** — booster_box, booster_pack, tin 등 필터링 지원

---

### 2-3. Value Checker (`/value-checker`)

"내 카드 얼마야?" 일반 소비자용 가이드 페이지

- 카드 상태(컨디션) 확인 방법 가이드
- PSA 10 의미 설명
- 2026년 기준 고가 카드 가격표:

| 카드 | 가격 범위 | 핵심 요인 |
|---|---|---|
| Charizard Base Set | $350 ~ $420,000 | 등급 (PSA 10 1판 = $420K+) |
| Pikachu Illustrator | $375,000 ~ $5.3M | 희소성 (전 세계 39장) |
| Shadowless Charizard | $200 ~ $75,000 | 컨디션·센터링 |
| Pokemon 151 Charizard ex | $25 ~ $800 | 스페셜 아트 |
| Base Set Blastoise | $40 ~ $45,000 | 등급·에디션 |

- "그레이딩 맡길 가치 있는 기준: 원화 비교 $50~100 이상"

---

### 2-4. Portfolio (`/portfolio`)

- 보유 카드 등록 → 총 가치 추적
- 가격 변동 알림
- (로그인 필요)

---

### 2-5. Blog (`/blog`)

- 포켓몬 카드 투자·시세 관련 아티클
- 예: "Most Valuable Pokemon Cards", "PSA Grading Guide", "Alt Art Cards"

---

### 2-6. Why (`/why`)

- 경쟁 API 대비 차별점 어필
- 타 API는 TCGPlayer 단독이지만 PokeTrace는 3개 마켓 통합

---

### 2-7. Status (`status.poketrace.com`)

- 실시간 API 서버 상태 모니터링

---

## 3. API 전체 분석

### 3-1. 기본 정보

| 항목 | 내용 |
|---|---|
| Base URL | `https://api.poketrace.com/v1` |
| 인증 방식 | HTTP Header: `X-API-Key: YOUR_KEY` |
| 응답 포맷 | JSON |
| 응답 속도 | ~150ms (타 API 300~500ms 대비 빠름) |
| 업타임 SLA | 99.9% |
| OpenAPI Spec | `https://poketrace.com/docs/openapi` (머신리더블 계약서) |

---

### 3-2. 플랜별 요금 및 제한

| 플랜 | 가격 | 일일 요청 | 버스트 제한 | 주요 차이 |
|---|---|---|---|---|
| **Free** | 무료 | 250회/일 | 1회/2초 | US(eBay·TCGPlayer) Raw만, 비상업용 |
| **Pro** | $19.99/월 | 10,000회/일 | 30회/10초 | +EU(CardMarket), 그레이딩, 가격 히스토리, 상업용 |
| **Scale** | $98/월 | 100,000회/일 | 60회/10초 | +WebSocket, Sold Listings, 우선 지원 |
| **Enterprise** | 문의 | 커스텀 | 커스텀 | 전용 인프라 |

**요금 구조 특이점**: 크레딧 시스템 없음 → 요청 1건 = 1카운트 (단순·투명)

---

### 3-3. 엔드포인트 전체 목록

#### Cards API

| 메서드 | 엔드포인트 | 플랜 | 설명 |
|---|---|---|---|
| GET | `/v1/cards` | Free+ | 카드 검색 (시세 포함, 페이지네이션) |
| GET | `/v1/cards/:id` | Free+ | 카드 ID로 단건 조회 (전체 시세) |
| GET | `/v1/cards/:id/prices/:tier/history` | Pro+ | 특정 등급 가격 히스토리 |
| GET | `/v1/cards/:id/listings` | Scale | eBay 실거래 낙찰 목록 |

**`/v1/cards` 검색 파라미터**:
- `search` — 카드명 검색 (예: `charizard`)
- `market` — `US` / `EU`
- `set` — set slug (예: `base-set`, `obsidian-flames`)
- `limit` — 페이지당 건수
- `cursor` — 커서 기반 페이지네이션
- `product_type` — `single` / `sealed` / `code_card` / `accessory`
- `product_family` — `booster_box` / `booster_pack` / `booster_bundle` / `elite_trainer_box` / `tin` / `deck` / `box_collection` / `blister`

#### Sets API

| 메서드 | 엔드포인트 | 설명 |
|---|---|---|
| GET | `/v1/sets` | 전체 세트 목록 + 메타데이터 |
| GET | `/v1/sets/:slug` | 특정 세트 상세 |

세트 메타데이터: 발매일, 카드 수, TCGPlayer ID, CardMarket ID (크로스레퍼런스용)

#### Price History API (Pro+)

| 파라미터 | 값 | 설명 |
|---|---|---|
| `period` | `7d` / `30d` / `90d` / `1y` / `all` | 조회 기간 |
| `limit` | 최대 365 | 날짜별 row 수 |
| `tier` | `NEAR_MINT` / `PSA_10` / `BGS_9_5` / `AGGREGATED` | 등급/컨디션 |

**응답 필드**:
- `date` — ISO 날짜
- `source` — `ebay` / `tcgplayer` / `cardmarket` / `cardmarket_unsold`
- `avg` / `low` / `high` — 가격 통계
- `saleCount` — 거래 건수
- `approxSaleCount` — eBay는 True (사후 취소 가능하므로 근사치)
- `median3d` / `median7d` / `median30d` — 이상치 제거 롤링 중앙값
- `avg1d` / `avg7d` / `avg30d` — CardMarket 트렌드 평균
- `country` — EU 국가별 분해 (DE/FR/IT/ES/PL/BE)
- `language` — 언어별 분해 (ALL/EN/JP)

#### Listings API (Scale)

eBay 낙찰 원본 데이터 (집계값이 아닌 개별 거래 증거)

**응답 필드**:
- `sourceItemId` — eBay 아이템 번호
- `title` — 원본 리스팅 제목
- `price` / `currency` — 낙찰가
- `soldAt` — 낙찰 일시
- `condition` — 컨디션 (NEAR_MINT 등)
- `grader` / `grade` — 그레이더사 및 등급
- `listingUrl` — eBay 원본 링크
- `anomalyFlag` / `anomalyReason` — 이상 탐지 여부 및 이유 (`price_outlier` 등)
- `listingType` — `auction` / `buy_it_now`

#### WebSocket API (Scale)

- `ws://api.poketrace.com/v1/ws`
- 카드 구독 → 가격 변동 시 실시간 푸시
- 트레이딩 봇, 실시간 알림에 활용

#### Health Check

- `GET /health` — API 서버 상태 확인

---

### 3-4. 카드 응답 스키마 (핵심 필드)

```json
{
  "id": "019bff77-befa-771d-bab0-f5909f0a78c9",
  "name": "Charizard ex",
  "cardNumber": "101/108",
  "set": { "slug": "obsidian-flames", "name": "Obsidian Flames" },
  "variant": "Holofoil",
  "rarity": "Ultra Rare",
  "productType": "single",
  "productFamily": "card",
  "image": "https://cdn.poketrace.com/cards/96b13860dec8d94b.webp",
  "game": "pokemon",
  "market": "US",
  "currency": "USD",
  "refs": {
    "tcgplayerId": "123456",
    "cardmarketId": null
  },
  "prices": {
    "ebay": {
      "PSA_10":    { "avg": 1250, "low": 1180, "high": 1320, "saleCount": 12, "approxSaleCount": true, "avg1d": 1240, "avg7d": 1220, "avg30d": 1180 },
      "NEAR_MINT": { "avg": 180,  "low": 150,  "high": 220,  "saleCount": 45, "approxSaleCount": true, "avg1d": 178,  "avg7d": 175,  "avg30d": 170  }
    },
    "tcgplayer": {
      "NEAR_MINT": { "avg": 165,  "low": 140,  "high": 195,  "saleCount": 89, "approxSaleCount": false }
    }
  },
  "gradedOptions": ["PSA_10", "PSA_9", "CGC_9_5"],
  "conditionOptions": ["NEAR_MINT", "LIGHTLY_PLAYED"],
  "topPrice": 1250,
  "totalSaleCount": 146,
  "hasGraded": true,
  "lastUpdated": "2026-01-29T12:00:00Z"
}
```

---

### 3-5. Markets & Tiers 체계

**US vs EU 분리 구조**: 카드는 US 또는 EU 중 하나에만 속함 (동일 카드 두 개 존재)

**US 마켓**:
- `ebay` — 실거래 낙찰가 (raw + graded)
- `tcgplayer` — 시장가 (raw only)
- 통화: USD
- Variant 데이터 있음 (Normal / Holofoil / Reverse Holofoil / 1st Edition)

**EU 마켓**:
- `cardmarket` — Price Trend (검증된 판매 평균, 컨디션 분해 없음, 가장 신뢰도 높음)
- `cardmarket_unsold` — 현재 매물 호가 (컨디션·등급·국가·언어별 분해 있음, 인플레이션 가능성)
- 통화: EUR
- 국가별 분해: DE / FR / IT / ES / PL / BE
- Variant 데이터 없음

**Raw 컨디션 등급**:
```
MINT → NEAR_MINT → LIGHTLY_PLAYED → MODERATELY_PLAYED → HEAVILY_PLAYED → DAMAGED
```

**그레이딩 회사 6개 및 등급**:
| 회사 | 등급 범위 | 비고 |
|---|---|---|
| PSA | 1 ~ 10 (0.5단위) | 업계 표준, 가장 거래량 많음 |
| BGS (Beckett) | 1 ~ 10 (0.5단위) | BGS 10 Black Label이 최고 희귀 |
| CGC | 1 ~ 10 (0.5단위) | PSA 대안으로 빠르게 성장 |
| SGC | 1 ~ 10 (0.5단위) | 빈티지 카드 특화 |
| ACE | 1 ~ 10 | 일본 그레이더 |
| TAG | 1 ~ 10 (0.5단위) | 신생 그레이더 |

**이상치 탐지 (Anomaly Detection)**:
- 3일 중앙값의 10% 미만 또는 10배 초과 가격은 자동 제외
- `anomalyFlag` + `anomalyReason` 필드로 의심 리스팅 표시
- 가격 스파이크·컨디션 역전 이상 탐지

---

### 3-6. LLM Integration (`/docs/llm-integration`)

- OpenAPI Spec + docs를 LLM 에이전트에게 제공하는 전용 섹션
- Claude·GPT 같은 AI 에이전트가 PokeTrace API를 그라운딩 소스로 사용할 수 있도록 가이드
- AI 포켓몬 카드 가격 조회 에이전트 구축 지원

---

## 4. 강점 / 약점 (raredoc 관점)

| 구분 | 내용 |
|---|---|
| **강점** | US+EU 3개 마켓 통합 — 타 API 대비 독보적 |
| **강점** | 6개 그레이딩사 전체 커버 |
| **강점** | 이상치 자동 탐지 (시세 조작 방어) |
| **강점** | 봉탕 상품(booster_box 등) API도 지원 |
| **강점** | WebSocket 실시간 피드 (Scale) |
| **강점** | Free 250회/일 — 소규모 프로젝트 진입 쉬움 |
| **약점** | **한국 시세 전혀 없음** (원화, 번개장터, 중고나라 데이터 없음) |
| **약점** | 일본 독점 카드(일판만 존재) 커버리지 불완전 |
| **약점** | Pro $19.99/월 — 히스토리·EU·그레이딩 모두 유료 |
| **약점** | 봉탕 시세는 미국 기준 (한국 팩 정가·봉탕가 없음) |
| **약점** | 한글 인터페이스 없음 |

---

## 5. raredoc 활용 전략

| 목적 | PokeTrace 활용 방안 |
|---|---|
| 해외 시세 기준점 | Free 플랜 `/v1/cards` → eBay·TCGPlayer 현재가를 "해외 참고 시세"로 표시 |
| 가격 히스토리 차트 | Pro 플랜 `/v1/cards/:id/prices/:tier/history` → 시세 트렌드 그래프 |
| 봉탕/박스 시세 | `product_family=booster_box` 쿼리 → 미국 기준 팩·박스 가격 |
| 그레이딩 카드 시세 | Pro 플랜 PSA·BGS·CGC 등급별 가격 |
| 이상치 필터링 | `anomalyFlag` 활용 → 사기·조작 거래 자동 배제 |
| 한국 시세와 연계 | PokeTrace USD 시세 + 환율 + 한국 프리미엄/디스카운트 비율 계산 |

**핵심 결론**: PokeTrace는 **해외 기준 시세 인프라**로 활용하고, 한국 원화 시세(번개장터 기반)는 raredoc이 직접 수집·보완하는 투트랙 전략이 최적.
