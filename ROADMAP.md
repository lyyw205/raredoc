# raredoc 구현 로드맵

> 작성일: 2026-05-13  
> 현재 스택: Next.js 16.2.6 · Prisma · PostgreSQL(Supabase) · pokemontcg.io · PokeTrace

---

## 현재 완료 상태

| 기능 | 상태 |
|------|------|
| 확장팩 목록 + 사이드바 | ✅ |
| 카드 상세 페이지 | ✅ |
| PokeTrace USD 시세 (eBay + TCGPlayer NM/LP) | ✅ |
| 가격 트렌드 뱃지 (avg7d 비교) | ✅ |
| 가격 히스토리 차트 (30일) | ✅ |
| 티어리스트 페이지 | ✅ |
| i18n (ko/en) | ✅ |

---

## Phase 1 — 가격 데이터 파이프라인 (4주)

> **목표**: 시세 정보가 raredoc의 핵심 가치. 지금은 한 번 렌더링 후 1시간 캐시에 의존하는 구조. 가격을 DB에 누적해야 히스토리가 쌓이고 KRW 시세도 붙일 수 있다.

### 1-1. PokeTrace ID 매핑 캐시

**문제**: 카드 상세 페이지마다 PokeTrace를 2회 호출 (search + history). 무료 250 req/day 빠르게 소진.

**해결**: 매핑을 DB에 저장해서 재검색 차단.

```prisma
// 스키마 추가
model CardMapping {
  id           String   @id @default(cuid())
  pokemontcgId String   @unique  // "sv3pt5-202"
  poketraceId  String             // PokeTrace UUID
  verified     Boolean  @default(true)
  createdAt    DateTime @default(now())
  
  @@index([pokemontcgId])
}
```

**흐름**:
1. 카드 페이지 로드 시 `CardMapping`에서 먼저 조회
2. 없으면 `findPokeTraceCard()` 호출 후 DB 저장
3. 이후 같은 카드 접근 시 PokeTrace 검색 호출 0회

→ API 소비: 카드당 최초 1회 search + 매일 1회 history

---

### 1-2. 가격 자동 수집 Cron

**목표**: 인기 카드 상위 N개 가격을 매일 DB에 적재 → 자체 히스토리 구축 (PokeTrace 30일 제한 우회)

```
// 구조
src/app/api/cron/collect-prices/route.ts

실행: Vercel Cron (vercel.json) 또는 GitHub Actions 매일 00:00 KST
```

```typescript
// 수집 우선순위
1. TierEntry.tier = "S" or "A" 인 카드
2. Price 테이블에서 최근 조회 수 상위 카드 (조회 로그 추가 시)
3. 신규 세트 전체

// 수집 후 Price 테이블에 적재
// Price.source = "poketrace_ebay" | "poketrace_tcg" | "bunjang"
```

**vercel.json**:
```json
{
  "crons": [
    { "path": "/api/cron/collect-prices", "schedule": "0 15 * * *" }
  ]
}
```

---

### 1-3. KRW 시세 — 번개장터

**번개장터 비공식 API** (공개 검색 엔드포인트):
```
GET https://api.bunjang.co.kr/api/1/find_v2.json
  ?q={카드명}
  &order=date
  &n=30
  &f_category_id=310  // 트레이딩카드 카테고리
```

**파싱 대상 필드**:
- `list[].name` — 상품명
- `list[].price` — 판매가 (KRW)
- `list[].update_time` — 등록일
- `list[].status` — 판매중/예약중/판매완료

**수집 전략**:
1. 카드명으로 검색 (한글명 우선, 없으면 영문)
2. 상품명에서 카드 번호/세트 매칭으로 정확도 필터
3. `Price` 테이블에 `source = "bunjang"`, `currency = "KRW"` 저장

```prisma
// Price 모델 확장 (이미 source, currency 컬럼 있음 — 활용)
// normal 컬럼 → KRW 금액 그대로 저장 (currency로 구분)
```

**UI**:
- 카드 상세 페이지 시세 섹션에 KRW 행 추가
- "번개장터 평균 ₩XXX,XXX (N건)" 형태

---

### 1-4. USD → KRW 환율 자동화

현재 `.env`에 `USD_TO_KRW=1350` 하드코딩 → 주 1회 자동 업데이트로 전환

```typescript
// src/lib/exchange-rate.ts
// 무료 환율 API: exchangerate-api.com 또는 한국은행 OpenAPI
// 주 1회 cron으로 DB의 Config 테이블에 저장

model Config {
  key       String   @id
  value     String
  updatedAt DateTime @updatedAt
}
// Config { key: "USD_TO_KRW", value: "1380" }
```

---

## Phase 2 — 카드 DB 강화 (4주)

> **목표**: pokemontcg.io는 영어판 위주. 한국 콜렉터는 일본판을 많이 다룬다. DB 품질이 검색/매칭의 기반.

### 2-1. 한글 카드명 완성

현재 `Card.nameKo` 컬럼 있지만 대부분 null.

**방법**:
1. pokemontcg.io는 영어명만 제공
2. 공개 데이터셋 활용: `github.com/PokemonTCG/pokemon-tcg-data` (영어)
3. 한글명 매핑 테이블 수동 작성 or 커뮤니티 기여 방식

**단기 해결**: 
- 한국 공식 포켓몬 사이트의 카드 DB 구조 참고
- 최소한 SV 시리즈 주요 레어 카드 한글명 먼저 입력
- 관리자 페이지에서 직접 수정 가능하도록 (Phase 3 이후)

---

### 2-2. 일본판 카드 지원

pokemontcg.io는 일본판 카드 없음. 별도 소스 필요.

**옵션 A**: TCG API (api.tcgdex.net) — 영어/일어 카드 지원
```
GET https://api.tcgdex.net/v2/ko/cards/{id}  // 한국어 지원
GET https://api.tcgdex.net/v2/ja/sets        // 일본판 세트
```

**옵션 B**: 직접 수집 — TCGBOX 카탈로그 기반으로 `sv2a`, `sv9` 등 일본 세트 ID 목록화

**접근 방법**:
- 영어판(`sv3pt5`)과 일본판(`sv2a`) 간 카드 대응 테이블 구축
- `Card` 모델에 `language` 필드 추가, `Set.language` 활용 (이미 있음)
- PokeTrace 검색 시 일본판은 `market: "EU"` (Cardmarket 연동) 또는 별도 처리

---

### 2-3. 전체 검색

현재 세트 내 검색만 가능. 카드명/번호로 전체 검색 필요.

```typescript
// src/app/api/search/route.ts
// GET /api/search?q=피카츄&lang=ko

// DB 검색 (name/nameKo ILIKE)
// 없으면 pokemontcg.io API fallback
// 결과: [{ id, name, nameKo, set, rarity, imageSmall, price }]
```

**UI**:
- 헤더 글로벌 검색바 (현재 없음)
- 검색 결과 페이지 `/search?q=...`
- 카드 썸네일 그리드 + 가격 표시

---

### 2-4. 카드 목록 페이지 개선

현재 세트 상세 페이지 (`/expansions/[setId]`) 구현 상태 확인 필요.

추가할 것:
- 레어도 필터 (NM/Rare/SAR/SR 등)
- 가격순 정렬 (높은 가격 먼저)
- "시세 있는 카드만" 토글

---

## Phase 3 — 사용자 인증 (4주)

> **목표**: 개인거래는 계정 없이 불가. 인증 시스템은 거래 플랫폼의 전제조건.

### 3-1. Supabase Auth

```bash
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs
```

**지원 로그인**:
1. 이메일 + 패스워드 (기본)
2. 카카오 OAuth (한국 사용자 최우선 — Supabase Provider 지원)
3. 구글 OAuth (글로벌 사용자)

```prisma
model User {
  id          String    @id // Supabase auth.users.id와 동기화
  email       String    @unique
  nickname    String    @unique
  region      String?   // "서울", "경기" 등
  avatarUrl   String?
  rating      Float     @default(0)
  tradeCount  Int       @default(0)
  listings    Listing[]
  reviews     Review[]  @relation("reviewer")
  received    Review[]  @relation("reviewee")
  createdAt   DateTime  @default(now())
}
```

**미들웨어 보호 라우트**:
```
/sell           → 로그인 필요
/profile/*      → 로그인 필요
/trade/*        → 로그인 필요
/api/listings/* → 인증 헤더 필요
```

---

### 3-2. 프로필 페이지

```
/[locale]/profile/[userId]
├── 사용자 정보 (닉네임, 지역, 가입일)
├── 거래 평점 + 건수
├── 최근 판매 목록
└── 보유 컬렉션 (Phase 5)
```

---

### 3-3. 관심 카드 + 가격 알림

```prisma
model PriceAlert {
  id          String   @id @default(cuid())
  userId      String
  cardId      String
  targetPrice Float    // USD
  condition   String   @default("NEAR_MINT")
  active      Boolean  @default(true)
  notifiedAt  DateTime?
  user        User     @relation(fields: [userId], references: [id])
  createdAt   DateTime @default(now())
}
```

**알림 수단**: 이메일 (Resend API — 무료 3,000건/월)

---

## Phase 4 — 개인거래 플랫폼 (8주)

> **목표**: raredoc의 핵심 차별화. TCGBOX는 쇼핑몰, 우리는 개인 간 거래 플랫폼.

### 4-1. 판매 글 스키마

```prisma
model Listing {
  id          String    @id @default(cuid())
  userId      String
  cardId      String
  
  condition   String    // NM / LP / MP / HP / DMG
  price       Float
  currency    String    @default("KRW")
  quantity    Int       @default(1)
  description String?
  images      String[]  // Supabase Storage URLs
  
  status      String    @default("active")  // active / reserved / sold / cancelled
  
  viewCount   Int       @default(0)
  
  user        User      @relation(fields: [userId], references: [id])
  trades      Trade[]
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  
  @@index([cardId])
  @@index([userId])
  @@index([status])
}

model WantToBuy {
  id        String  @id @default(cuid())
  userId    String
  cardId    String
  maxPrice  Float?
  currency  String  @default("KRW")
  condition String  @default("NM")
  note      String?
  active    Boolean @default(true)
  user      User    @relation(fields: [userId], references: [id])
  createdAt DateTime @default(now())
}
```

### 4-2. 판매글 페이지

```
/[locale]/sell
├── 카드 검색 (DB에서 실시간)
├── 상태 선택 (NM/LP/MP/HP/D)
├── 가격 입력 + KRW/USD 전환
├── 이미지 업로드 (Supabase Storage, 최대 5장)
└── 설명란

/[locale]/listings
├── 전체 판매 목록 (최신순/가격순)
├── 카드명 검색
├── 상태 필터
└── 세트 필터

/[locale]/listings/[id]
├── 카드 정보 + 판매자가 찍은 실물 사진
├── 시세 대비 가격 (PokeTrace 기준 몇 % 수준인지)
├── 판매자 프로필 + 평점
└── "구매 문의하기" 버튼 → 채팅
```

### 4-3. 채팅 (Supabase Realtime)

```prisma
model Trade {
  id        String    @id @default(cuid())
  listingId String
  buyerId   String
  sellerId  String
  status    String    @default("chatting")  // chatting / agreed / completed / cancelled
  messages  ChatMessage[]
  review    Review?
  listing   Listing   @relation(fields: [listingId], references: [id])
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
}

model ChatMessage {
  id        String   @id @default(cuid())
  tradeId   String
  senderId  String
  content   String
  trade     Trade    @relation(fields: [tradeId], references: [id])
  createdAt DateTime @default(now())
}
```

```typescript
// Supabase Realtime 구독
const channel = supabase
  .channel(`trade-${tradeId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'ChatMessage',
    filter: `tradeId=eq.${tradeId}`,
  }, (payload) => setMessages(prev => [...prev, payload.new]))
  .subscribe()
```

### 4-4. 거래 평점

```prisma
model Review {
  id         String  @id @default(cuid())
  tradeId    String  @unique
  reviewerId String
  revieweeId String
  rating     Int     // 1~5
  comment    String?
  trade      Trade   @relation(fields: [tradeId], references: [id])
  reviewer   User    @relation("reviewer", fields: [reviewerId], references: [id])
  reviewee   User    @relation("reviewee", fields: [revieweeId], references: [id])
  createdAt  DateTime @default(now())
}
```

---

## Phase 5 — 고급 기능 (4주)

### 5-1. 봉탕 EV 계산기

```
/[locale]/pack-ev/[setId]

계산 방법:
- 세트 전체 카드 레어도별 카운트 (DB에서 집계)
- 풀률 (pull rate) 입력 or 커뮤니티 크라우드소싱
- 기대 카드 = Σ (각 레어도 카드 평균가 × 해당 레어도 풀률)
- 팩 가격 대비 EV% 표시
```

```prisma
model PackPullRate {
  id          String  @id @default(cuid())
  setId       String
  rarity      String
  pullRate    Float   // 0.01 = 1%
  source      String  // "official" | "community"
  sampleSize  Int?
  submittedBy String?
  set         Set     @relation(fields: [setId], references: [id])
  createdAt   DateTime @default(now())
}
```

### 5-2. 컬렉션 관리

```prisma
model Collection {
  id        String  @id @default(cuid())
  userId    String
  cardId    String
  quantity  Int     @default(1)
  condition String  @default("NM")
  forTrade  Boolean @default(false)  // 교환 가능 여부
  user      User    @relation(fields: [userId], references: [id])
  
  @@unique([userId, cardId, condition])
}
```

```
/[locale]/collection
├── 보유 카드 그리드
├── 총 컬렉션 가치 (보유 카드 × 시세 합산)
├── 교환 가능 표시
└── CSV 내보내기
```

### 5-3. 세트 완성도 트래커

```
보유 카드 수 / 세트 전체 카드 수 = 완성도 %
진행 바 + 없는 카드 목록
```

---

## Phase 6 — SEO + 수익화 (상시)

### 6-1. SEO

**현재 미구현 항목**:
- 카드별 Open Graph 이미지 동적 생성 (`/api/og/[cardId]`)
- 구조화 데이터 (JSON-LD) — Product schema with price
- 사이트맵에 카드 URL 포함 (현재 `sitemap.ts` 있음, 카드 URL 누락 여부 확인)
- 카드 페이지 타겟 키워드: "피카츄 ex 시세", "151 SAR 가격" 등

```typescript
// app/api/og/[cardId]/route.tsx
// @vercel/og 사용
// 카드 이미지 + 이름 + 현재 시세 → 1200×630 OG 이미지 자동 생성
```

### 6-2. 구글 애드센스

`.env.local`에 `NEXT_PUBLIC_ADSENSE_ID` 준비됨.

**배치**:
- 카드 상세 페이지 — 이미지와 정보 사이 (300×250)
- 세트 카드 목록 — 그리드 중간 삽입 (native ad)
- 모바일 — 상단 배너 (320×50)

### 6-3. KRW 기반 거래 수수료 (장기)

- 거래 완료 시 판매가의 X% 수수료
- 무료 플랜: 월 N건 무료, 초과 시 수수료
- 프리미엄: 월정액으로 무제한 + 상단 노출

---

## 기술 의사결정 정리

| 항목 | 선택 | 이유 |
|------|------|------|
| Auth | Supabase Auth | 이미 DB가 Supabase, 카카오 OAuth 지원 |
| 이미지 스토리지 | Supabase Storage | 동일 인프라, 무료 1GB |
| 채팅 | Supabase Realtime | 별도 서비스 없이 구현 가능 |
| 이메일 | Resend | Next.js 친화적, 무료 3,000건/월 |
| Cron | Vercel Cron | Vercel 배포 시 무료 플랜 가능 |
| KRW 시세 | 번개장터 API | 가장 많은 거래 데이터 (82,033건) |
| 환율 | 한국은행 OpenAPI | 공식 데이터, 무료 |
| OG 이미지 | @vercel/og | Edge Runtime, 빠름 |

---

## 우선순위 요약

```
즉시 (1~2주)
├── PokeTrace ID 매핑 캐시 (API 절약 핵심)
└── 번개장터 KRW 시세 파이프라인 (국내 차별화 1순위)

단기 (1~2개월)
├── 가격 수집 Cron + 자체 히스토리 축적
├── 전체 카드 검색
└── Supabase Auth (로그인)

중기 (2~4개월)
├── 판매글 + 구매희망 게시판
├── 채팅
└── 거래 평점

장기 (4개월+)
├── 봉탕 EV 계산기
├── 컬렉션 관리
└── 수익화
```
