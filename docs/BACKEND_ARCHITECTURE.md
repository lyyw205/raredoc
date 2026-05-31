# Raredoc 백엔드 아키텍처 & 구현 계획

> 작성일 2026-05-27 · 프론트 전 영역 분석 기반. 실제 백엔드 설계/주입을 위한 단일 기준 문서.

---

## 0. 현재 상태 (Ground Truth)

### 이미 실재(real)인 것
- **DB(Prisma/Postgres) 5개 모델**: `Set`, `Card`, `Price`, `TierEntry`, `Trade` — TCG 카탈로그·시세·거래 한정.
- **외부 연동**: pokemontcg.io(세트·카드·이미지), PokeTrace(시세 3티어·거래), 번개장터(국내 시세), eBay(가격).
- **데이터 접근 방식**: RSC(서버 컴포넌트) + Server Actions (`src/lib/actions/*`), 별도 REST API 라우트 **없음**. `src/lib/api/*`가 서비스 계층 역할.
- **실데이터로 동작하는 화면**: `/cards`, `/cards/[cardId]`(시세+기본정보), `/expansions`, `/dex`(카탈로그), `/tier-list/[setCode]`(파일 기반), 홈 일부.

### 아직 목업(mock)인 것
- **인증/유저 전체** — `MOCK_USER` 하드코딩, 로그인/회원가입 UI만 존재, auth 백엔드 없음.
- **컬렉션·보유카드·인증·뱃지·랭킹·하이라이트** (프로필/도감 "내 카드"/최근등록).
- **마켓플레이스**: 보유자 리스트(`/cards/[cardId]/owners`)·구매 제안·거래 라이프사이클.
- **커뮤니티**: 게시글·댓글·좋아요·조회수·거래글(팝니다/삽니다).
- **메시지(DM)**: 대화·메시지·읽음·약속·후기·카드 첨부.
- **카드게임 메타**: 덱 아키타입·대회·플레이어 랭킹·룰·용어집·봉입률 (가상 메가 시리즈 mock).
- **마켓 랭킹**(`/tier-list` 상승률/거래량/트렌딩/낙폭/신고가): 전부 목업.

### 두 개의 평행 우주(중요)
1. **실제 pokemontcg.io 카탈로그** — `/cards`, `/expansions`로 일원화 완료.
2. **가상 카드게임 mock**(메가 시리즈) — `/cardgame`. 카드게임 카드 상세는 이미 `/cards/[realId]`로 리다이렉트해 통합 중. → **백엔드에서는 카드게임 덱/대회가 "실제 Card(pokemontcg.io id)"를 참조하도록 설계**한다.

---

## 1. PRD (제품 요구사항 요약)

Raredoc = **수집형 카드(주로 포켓몬 TCG) 시세·도감·컬렉션·커뮤니티·C2C 거래 플랫폼**.

| 도메인 | 핵심 사용자 가치 | 대표 화면 |
|---|---|---|
| 카탈로그/시세 | 카드 정보 + 다출처 시세 + 히스토리 | `/cards`, `/cards/[id]`, `/expansions`, `/tier-list` |
| 컬렉션 | 내 보유 카드 등록·등급·인증·가치 추적 | `/dex`(내 카드), `/collection`, `/profile?tab=collection` |
| 게이미피케이션 | 뱃지·랭킹·시즌으로 수집 동기 부여 | `/profile?tab=badges/ranking`, 홈 TOP3 |
| 마켓플레이스 | 보유자 탐색 → 구매 제안 → 거래 성사·후기 | `/cards/[id]/owners`, 메시지 |
| 커뮤니티 | 정보·자랑·질문 + 직거래/택배 거래글 | `/community` |
| 메시지 | 거래 협상·약속·후기 1:1 DM | `/messages` |
| 카드게임 메타 | 덱 티어·대회·룰 등 경쟁 정보 | `/cardgame` |

핵심 플로우: **회원가입 → 보유 카드 등록(인증 선택) → 컬렉션/가치/랭킹 노출 → 마켓 노출 → 구매 제안(DM) → 거래 성사 → 후기/평점**.

---

## 2. 아키텍처 결정 (ADR 요약)

1. **인증**: Auth.js(NextAuth v5) + Prisma Adapter. credentials(email/pw, bcrypt/argon2) + OAuth(구글/카카오) 옵션. 세션은 DB. `User`가 모든 UGC의 author FK.
2. **데이터 접근**: 현행 유지 — RSC + Server Actions가 1차. 별도 REST는 **웹훅/크론/이미지 업로드/외부 연동**에만 `app/api/*/route.ts`로 추가. 입력 검증은 **Zod**, 도메인 로직은 `src/lib/services/*`(신규)로 모아 액션/라우트가 호출.
3. **3개 데이터 출처 계층**:
   - **외부 카탈로그 캐시**(pokemontcg.io→DB sync, 읽기전용): `Set`, `Card`.
   - **외부 시세/거래**(PokeTrace/번개장터, live+스냅샷): `Price`, `Trade`, `MarketStat`.
   - **자체 UGC**(유저 생성): 컬렉션·커뮤니티·메시지·마켓·게이미피케이션.
4. **카드게임 메타 = 에디토리얼/큐레이션 데이터**: 실시간 KR 메타 API가 없으므로 관리자/시드로 채우는 큐레이션 테이블로 모델링. `DeckCard.cardId` → 실제 `Card.id` 참조.
5. **집계/랭킹/뱃지**: 원천(컬렉션·활동)에서 파생. **Vercel Cron**으로 일일 `RankingSnapshot` + 뱃지 진행도 배치. 컬렉션 가치 = 카드 최신가 × 컨디션 계수.
6. **이미지 업로드**(인증 사진·거래 사진·프로필): **Vercel Blob**(private/public).
7. **i18n**: next-intl 유지. pokemontcg.io는 영문 → `CardTranslation`/`nameKo`로 한글 보강(번역 sync 별도).
8. **캐싱**: 카탈로그는 `revalidate`(일 단위) + DB. 시세는 live+히스토리. Next.js Cache Components/`revalidateTag` 활용.
9. **마켓 통합점**: "판매 중"의 정본은 `Listing`. 커뮤니티 거래글(`Post`)·보유자리스트 둘 다 `Listing`을 가리킬 수 있게 하여 **구매 제안→대화→약속→후기**를 한 파이프라인으로.

---

## 3. ERD (도메인 모델)

### 도메인 그룹
- **A. Identity**: User, Account, Session, (Follow)
- **B. Catalog**(일부 존재): Set, Card(+게임필드), CardTranslation, Price, Trade, TierEntry, MarketStat
- **C. Collection**: CollectionItem, Certification, HighlightSlot, (UserSetProgress 캐시)
- **D. Gamification**: Badge, BadgeTier, UserBadge, Season, RankingSnapshot
- **E. Marketplace**: Listing, Offer, Appointment, Review
- **F. Community**: Post, Comment, PostLike, CommentLike
- **G. Messaging**: Conversation, Message, ConversationRead
- **H. Cardgame Meta**: DeckArchetype, DeckCard, DeckVariant, Tournament, PlayerRanking, ArchetypeTrend, PullRate, Ruling, GlossaryEntry

### 관계 핵심
```
User ─1:N─ CollectionItem ─N:1─ Card
User ─1:N─ UserBadge ─N:1─ Badge ─1:N─ BadgeTier
User ─1:N─ RankingSnapshot   (일일 스냅샷)
CollectionItem ─1:0..1─ Certification
CollectionItem ─1:0..1─ Listing ─1:N─ Offer ─(buyer)─ User
Listing ─0..1─ Post           (커뮤니티 거래글 연동)
Offer/거래 ─→ Conversation ─1:N─ Message ─0..1─ Appointment/Review
User ─1:N─ Post ─1:N─ Comment
DeckArchetype ─1:N─ DeckCard ─N:1─ Card(실제 pokemontcg id)
Tournament ─N:1─ DeckArchetype(winner)
```

### 제안 Prisma 스키마(발췌, 신규/확장분)
```prisma
// ── A. Identity ──
model User {
  id            String   @id @default(cuid())
  username      String   @unique
  displayName   String
  email         String   @unique
  passwordHash  String?
  avatarInitial String?
  avatarUrl     String?
  bio           String?
  tier          String   @default("BRONZE") // BRONZE..LEGEND (파생/캐시)
  location      String?
  emailVerified DateTime?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  collection    CollectionItem[]
  badges        UserBadge[]
  posts         Post[]
  comments      Comment[]
  // accounts/sessions: Auth.js adapter
}

// ── C. Collection ──
model CollectionItem {
  id            String   @id @default(cuid())
  userId        String
  cardId        String
  grade         String   // NM/LP/MP/HP/...
  certified     Boolean  @default(false)
  estimatedKrw  Int?
  forSale       Boolean  @default(false)
  highlightSlot Int?     // 1..5
  user          User     @relation(fields: [userId], references: [id])
  card          Card     @relation(fields: [cardId], references: [id])
  certification Certification?
  listing       Listing?
  createdAt     DateTime @default(now())
  @@index([userId]) @@index([cardId]) @@index([userId, forSale])
}
model Certification {
  id            String  @id @default(cuid())
  itemId        String  @unique
  photoUrl      String
  status        String  @default("pending") // pending/approved/rejected
  approvedGrade String?
  reviewedAt    DateTime?
  item          CollectionItem @relation(fields: [itemId], references: [id])
}

// ── D. Gamification ──
model Badge      { id String @id  name String  category String  emoji String  unit String?  rankMode Boolean @default(false)  tiers BadgeTier[]  userBadges UserBadge[] }
model BadgeTier  { id String @id @default(cuid())  badgeId String  tier String  threshold Int  label String  badge Badge @relation(fields:[badgeId],references:[id]) }
model UserBadge  { id String @id @default(cuid())  userId String  badgeId String  earnedTier String?  currentValue Int @default(0)  earnedAt DateTime?  @@unique([userId,badgeId]) }
model Season     { id Int @id  name String  startsAt DateTime  endsAt DateTime  active Boolean @default(false) }
model RankingSnapshot { id String @id @default(cuid())  userId String  date DateTime  rank Int  totalKrw Int  certifiedCount Int  badgeCount Int  monthlyAdded Int  @@unique([userId,date]) @@index([date,rank]) }

// ── E. Marketplace ──
model Listing     { id String @id @default(cuid())  itemId String @unique  sellerId String  askingKrw Int?  negotiable Boolean @default(true)  dealMethod String  location String?  status String @default("active") /*active/reserved/completed/hidden*/  postId String?  offers Offer[]  createdAt DateTime @default(now()) @@index([status]) }
model Offer       { id String @id @default(cuid())  listingId String  buyerId String  proposedKrw Int?  status String @default("pending") /*pending/accepted/declined/cancelled/completed*/  conversationId String?  createdAt DateTime @default(now()) @@index([listingId]) }
model Appointment { id String @id @default(cuid())  offerId String  date DateTime  place String  status String @default("proposed") }
model Review      { id String @id @default(cuid())  offerId String  raterId String  rateeId String  rating Int  manner String  comment String?  createdAt DateTime @default(now()) }

// ── F. Community ──
model Post        { id String @id @default(cuid())  userId String  collectibleCategory String  category String  title String  body String  imageUrl String?  priceKrw Int?  condition String?  certified Boolean @default(false)  location String?  dealMethod String?  tradeStatus String?  isPinned Boolean @default(false)  viewCount Int @default(0) likeCount Int @default(0) replyCount Int @default(0)  createdAt DateTime @default(now()) deletedAt DateTime?  comments Comment[] @@index([category]) @@index([collectibleCategory]) }
model Comment     { id String @id @default(cuid())  postId String  userId String  parentId String?  body String  likeCount Int @default(0)  createdAt DateTime @default(now()) deletedAt DateTime? @@index([postId]) }
model PostLike    { id String @id @default(cuid())  postId String  userId String  @@unique([postId,userId]) }
model CommentLike { id String @id @default(cuid())  commentId String  userId String  @@unique([commentId,userId]) }

// ── G. Messaging ──
model Conversation     { id String @id @default(cuid())  user1Id String  user2Id String  sourceType String /*direct/card_inquiry/community_post*/  sourceCardId String?  sourcePostId String?  lastMessageAt DateTime?  messages Message[]  @@unique([user1Id,user2Id]) }
model Message          { id String @id @default(cuid())  conversationId String  senderId String  content String  attachedCardId String?  appointmentId String?  reviewId String?  readAt DateTime?  createdAt DateTime @default(now()) @@index([conversationId]) }
model ConversationRead { id String @id @default(cuid())  conversationId String  userId String  lastReadMessageId String?  @@unique([conversationId,userId]) }

// ── H. Cardgame Meta (큐레이션) ──
model DeckArchetype { id String @id  nameKo String  tier String  regulation String  usageRate Float  winCount Int  avgRank Float  description String  cards DeckCard[]  variants DeckVariant[]  trends ArchetypeTrend[] }
model DeckCard      { id String @id @default(cuid())  archetypeId String  cardId String  count Int  role String?  @@unique([archetypeId,cardId]) } // cardId → 실제 Card.id
model DeckVariant   { id String @id @default(cuid())  archetypeId String  nameKo String }
model Tournament    { id String @id  nameKo String  date DateTime  region String  format String  players Int  winnerArchetypeId String?  status String }
model PlayerRanking { id String @id @default(cuid())  season Int  rank Int  name String  csp Int  favArchetypeId String?  wins Int }
model ArchetypeTrend{ id String @id @default(cuid())  archetypeId String  week String  usage Float }
model PullRate      { id String @id @default(cuid())  setId String  rarity String  types Int  probability Float  perBox String }
model Ruling        { id String @id  cardId String?  question String  answer String  sourceUrl String? }
model GlossaryEntry { id String @id @default(cuid())  term String  definition String  example String?  locale String @default("ko") }

// ── B. Catalog 확장 ──
// Card에 게임 필드 추가: hp Int?, weakness/resistance String?, retreat Int?,
//   abilities/attacks/legalities → Json?, evolvesFrom String?, evolvesTo String[],
//   regulationMark String?, flavorText String?, nationalPokedex Int[]
// CardTranslation { cardId, locale, name, flavorText, ... } (한글 보강)
// MarketStat { cardId, date, change1w/1m/3m, txCount, volumeKrw, athKrw, viewΔ, wishlist } (마켓 랭킹용)
```

---

## 4. 데이터 소스 전략

| 데이터 | 출처 | 적재 방식 |
|---|---|---|
| 세트·카드 기본 | pokemontcg.io | sync 스크립트 → DB 캐시 (이미 일부) |
| 카드 게임필드 | pokemontcg.io v2 | sync 시 함께 적재(JSON) 또는 live |
| 한글명 | 별도 번역 소스(공식/위키) | `CardTranslation` 배치 |
| 시세(글로벌) | PokeTrace(ebay/tcgplayer) | live + `Price`/`Trade` 스냅샷 |
| 시세(국내) | 번개장터 | live |
| 마켓 랭킹 통계 | Price/Trade 집계 | 일일 배치 → `MarketStat` |
| 컬렉션·커뮤니티·DM·마켓 | 자체 UGC | DB 직접 |
| 덱·대회·룰 | 관리자/시드(큐레이션) | seed + admin |

---

## 5. 단계별 구현 로드맵

의존성·가치 기준 순서. 각 Phase는 "스키마 → 서비스/액션 → UI 와이어링 → 검증" 사이클.

### Phase 0 — 기반 (Foundations) ★선행 필수
- Auth.js + `User`/`Account`/`Session`, 로그인/회원가입 실연동, 세션·미들웨어, `MOCK_USER` 제거.
- 공통 규약: `src/lib/services/*` 계층, Zod 스키마, 에러 처리, 이미지 업로드(Vercel Blob).
- `Card` 게임필드/`CardTranslation` 확장 + sync 보강(현재 `/cards/[id]` live 의존 → 캐시).
- **산출물**: 로그인하면 진짜 내 계정. 카드 상세가 DB 캐시 기반.

### Phase 1 — 컬렉션 코어 ★최대 가치
- `CollectionItem`(+`Certification`, `HighlightSlot`). 보유 카드 등록/수정/인증신청.
- 와이어링: `/dex` 내 카드, `/collection`, `/profile?tab=collection`, `/recent`(피드=CollectionItem), 홈 캐러셀, 컬렉션 가치 계산.
- **산출물**: 사용자가 실제로 컬렉션을 쌓고 가치가 집계됨. (랭킹·뱃지·마켓의 전제)

### Phase 2 — 게이미피케이션
- `Badge`/`BadgeTier`/`UserBadge`, `Season`, `RankingSnapshot` + **Vercel Cron** 일일 배치.
- 와이어링: `/profile?tab=badges/ranking`, 홈 이달의 TOP3, 시즌 배너.

### Phase 3 — 커뮤니티
- `Post`/`Comment`/`PostLike`/`CommentLike` + 조회수. 작성/목록/상세/좋아요.
- 와이어링: `/community`, `/community/[id]`, 홈 핫토픽.

### Phase 4 — 메시지 + 마켓플레이스
- `Conversation`/`Message`/`ConversationRead`, `Listing`/`Offer`/`Appointment`/`Review`.
- 보유자 리스트(`forSale` CollectionItem) → 구매 제안 → DM → 약속 → 거래완료 → 후기.
- 커뮤니티 거래글(`Post`)과 `Listing` 연결.
- 와이어링: `/cards/[id]/owners`, `/messages/*`.

### Phase 5 — 카드게임 메타
- `DeckArchetype`/`DeckCard`(실제 Card 참조)/`Tournament`/`PlayerRanking`/`Ruling`/`GlossaryEntry`/`PullRate` + 시드·관리자.
- mock(`src/lib/cardgame/mock.ts`) 제거, `/cardgame/*` 실데이터화.

### Phase 6 — 마켓 분석 & 마무리
- `MarketStat` 일일 집계(상승률/거래량/트렌딩/낙폭/신고가), 조회·위시 추적.
- 와이어링: `/tier-list` 마켓 랭킹 탭. 관측성/인덱스 튜닝/캐시 정리.

### 횡단 관심사(모든 Phase)
검색(카드/유저/글), 신고/모더레이션, 알림(뱃지획득·DM·제안), 레이트리밋, 어드민, SEO(JsonLd 이미 존재).

---

## 6. 확정 결정 (2026-05-27)
1. **거래 정산 = 중개만**. 결제/에스크로/배송 모델 **제외**. `Listing`/`Offer`/`Appointment`/`Review`까지만(연락 매칭 + 후기/평점). Order/Payment/Shipment 모델 불필요.
2. **인증 = 이메일/비밀번호 + 소셜(구글/카카오)**. Auth.js + Prisma Adapter, `Account`/`Session` 포함.
3. **카드게임 메타 = 외부 메타 수집**. 관리자 수기 대신 **크롤링/sync 파이프라인**으로 적재(디시 포카 마갤·일본 まとめ 등 — `memory/reference_pokemon_tcg_sites.md` 카탈로그 활용, robots/약관 준수). → P5에 `scripts/sync-meta.ts` + 큐레이션 보정 레이어 포함.
4. **수집 카테고리 = 포켓몬 TCG 집중**. 스키마는 `collectibleCategory` 필드로 확장 여지만 남기고, 구현/시드는 포켓몬만. (커뮤니티/recent의 유희왕·스니커즈 등은 UI 옵션으로만 잔존, 데이터 미적재)

### 미해결(추후)
- **카드 한글화 소스**: 공식 발매명 확보 경로 — P0~P1 중 `CardTranslation` 채울 출처 확정 필요(공식/위키/수기).

---

## 부록 — 신규 테이블 수
기존 5 + 신규 약 30개(도메인 A·C~H). 핵심 우선순위 5: **User · CollectionItem · Conversation/Message · Post · Listing/Offer**.
