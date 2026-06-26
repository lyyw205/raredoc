# 카드 정체성·가격 분류 체계 (Card Model & Pricing Taxonomy)

> 권위 설계문서 · 확정 2026-06-27 · 시세 노출 + P2P 호가주문서의 공통 기반
> 근거: 국제표준 딥리서치([[reference_language_edition_pricing]]) + DB 진단 + 설계 워크플로(3안+비판) 종합

## 0. 목적

같은 아트가 에디션·팩·변형·컨디션에 따라 가격이 2~200배 갈리는데, 지금은 그 차원이 일부만 모델에 있다. 이 문서는 **"하나의 가격을 매기는 단위(SKU)"를 명확히 정의**하고, 시세 표시와 P2P 마켓이 **같은 키**를 쓰도록 정돈한다.

**가격 SKU = (에디션 JP/EN/KR) × (세트 + 컬렉터번호) × (변형/마감) × (컨디션 or 등급)**
- 앞 3축 = **정체성(테이블 행)** · 마지막 축 = **시장 스택의 필드**(계층 아님).

## 1. ★확정된 정정 (먼저 — 되살리지 말 것)

- **`Card`(@@map `LogicalCard`) = 이미 "그림(아트) 한 장" 계층이다** (P5 collapse 2026-06-22로 그림당 1행). 즉 **Card 가 곧 ArtCard.** cross-pack 같은그림 = `card.locales`(여러 RegionCard) 네이티브.
- **별도 `ArtCard` 테이블 신설 금지** — 2026-06-11 폐기됨(over-merge: 오거폰 4가면→1). 설계 워크플로가 "ArtCard 테이블 승격"을 권했으나 **이미 한 일이라 채택 안 함**. `artCardId`/`artFingerprint`는 그룹화 증거/흔적(계산속성), 정체성 키 아님.
- 따라서 "흩어진 같은-그림 Card들"은 **새 구조가 아니라 기존 Card 그레인으로 마저 합치는 정제**(P5 잔여).

## 2. 정체성 계층 (큐레이션·mapping-lock 대상)

| L | 계층 | 단위(무엇 1개인가) | 테이블 | 상태 |
|---|---|---|---|---|
| L1 | Species | 종/도감 | `Species` | ✅ 있음 |
| L2 | GameCard | 게임상 같은 카드(덱 4장·채용률 dedup) | `GameCard` | ✅ 있음 |
| L3 | **Card = Art** | 같은 일러스트 한 장(cross-pack/region 롤업) | `Card`(@@map `LogicalCard`) | ✅ 있음(=ArtCard) |
| L4 | **Print** | 에디션×세트×번호 = 실물 인쇄본 | `RegionCard`(@@map `CardLocale`) | ✅ 있음 |
| L5 | **PrintVariant** | 마감/스탬프 = **카탈로그 SKU** | `PrintVariant` | ★신규(유일한 새 정체성 계층) |

```
Species → GameCard → Card(=Art) → RegionCard(=Print) → ★PrintVariant(=SKU)
```

**PrintVariant 규칙:**
- reverse holo · 마스터볼/포켓볼 미러 · 1st Edition · Shadowless · staff/prerelease/세계대회 스탬프 · error 등 **마감만 다른** 것.
- RegionCard(Print)의 자식 (변형은 지역귀속: EN reverse vs JP 마스터볼).
- **RegionCard당 기본 `standard` 1행** → 대부분 카드는 변형 0, 진짜 있을 때만 행 추가.
- ★변형을 `RegionCard` 컬럼/별 행으로 두지 않는다 — 도감 "이 세트 N장" 카운트 오염 + 잠금가드(`--allow-protected`) 폭증. 별 FREE 테이블이라 mapping-lock 무관.
- 결정적 자연키 `@@unique([printId, kind, slug])` → 수집기 멱등 upsert.

**3-way 경계 판정(운영 단일출처):** 번호/세트 다름 → 새 **Print** · 번호·세트 같고 그림 다름(샤이니·알트·풀아트) → 같은 GameCard 아래 새 **Card(Art)** · 그림까지 같고 마감만 다름 → 새 **PrintVariant**.

## 3. 시장 계층 (FREE·고변동·mapping-lock 무관)

컨디션·등급은 **계층 아님 = 가격/주문/보유 행의 필드.**

```
priceable SKU  = PrintVariant.id (싱글)  |  SealedProduct.id (실링)
priceable line = SKU × conditionClass
   raw     : NM | LP | MP | HP | DMG
   graded  : <grader>:<grade>      grader ∈ PSA·BGS·CGC·BRG·TAG (국산 포함)
   sealed  : sealed | loose
```

- **`Price`**: `printVariantId?` XOR `sealedProductId?`, `conditionType(raw|graded|sealed)`, `condition`, `grader?`, `grade?`, **`priceKind(market|sell|buy|listing|sold)`**(JP 販売/買取 분리 — 없으면 yuyu-tei 매입/판매가 한 줄로 뭉개짐), `amount`(단일가), `currency`, `fxRateId?`, `recordedAt`. ★와이드 컬럼(`normal/holofoil/reverseHolo/firstEdition`) 폐기 → finish는 PrintVariant로 상승.
- **시장 FK 통일**: `Price·Trade·MarketOrder·MarketMatch·MarketStat·CollectionItem` 전부 **`printVariantId` 하나**를 가리킨다.
- **`MarketStat`**: `cardId`(logical) → `printVariantId(+conditionTier)` — 현재 Card-레벨 집계가 에디션·변형·컨디션을 섞는 버그 교정.

**컨디션 매칭(★사용자 확정 교정):** 호가 매칭 풀 키 = `(printVariantId, conditionTier)`.
- `raw` = 모든 raw 한 버킷(유동성 — p2p §8 "컨디션 무시" 의도 보존, 사진으로 확인).
- `graded` = 등급밴드 분리.
- **단 raw ↔ graded 경계는 분리**(PSA10 매도가 막 쓴 raw 매수에 자동체결 방지). ← p2p-market-design §8 의 *의도된 교정*.

## 4. 확장 side 테이블 (★"앞으로 확장"의 핵심 — 지금 안 두면 못 붙임)

| 신규 | 이유 |
|---|---|
| **`SealedProduct`** | 부스터박스·ETB·블리스터·번들 = *싱글의 컨디션 아닌 다른 상품 클래스*. 지금 `CollectionItem.grade="미개봉"`은 범주 오류. Set/CardPack에 M:N, 자체 Price 라인. |
| **`FxRate(base, quote, date) → rate`** | KR 시세=영문가×환율 폴백인데 `usdToKrw`가 행별 스냅샷이라 과거 환산 재현·일괄갱신 불가. |
| **`PrintDistribution(printId, setId, role: primary\|secondary)`** | 한 인쇄본이 두 상품서 차출([[project_mega_startdeck100_freeze]] "Ascended Heroes 이중출신"). 현재 단일 `setId`로 표현 불가. 정체성=primary 1개, 출처=N개. |
| **`ExternalIdMapping.printVariantId`** + 결정적 SKU 자연키 | 수집기(TCGplayer reverse·Cardmarket idLanguage·yuyu 매입)는 변형별 product → SKU에 못 붙으면 시세수집이 변형을 합침. |

## 5. Prisma 스케치 (신규/변경 핵심만)

```prisma
model PrintVariant {                 // ★신규 = 가격/거래 SKU
  id           String  @id @default(cuid())
  printId      String  @map("regionCardId")          // RegionCard FK (= Print)
  kind         String                                 // standard|reverse|masterball|pokeball|first_edition|shadowless|stamp|error
  slug         String                                 // 'standard' | 'stamp-worlds-2023' ...
  label        String?
  print        RegionCard @relation(fields:[printId], references:[id], onDelete: Cascade)
  @@unique([printId, kind, slug])                      // 결정적 자연키
  @@index([printId])
}

model SealedProduct {                // ★신규 = 비-싱글 상품축
  id        String @id @default(cuid())
  kind      String                    // booster_box|etb|blister|bundle|deck
  nameKo String?  nameJa String?  nameEn String?
  setGroupId String?                  // CardPack 연결(선택)
  @@index([setGroupId])
}

model FxRate {                        // ★신규
  base String  quote String  date DateTime  rate Float
  @@id([base, quote, date])
}

model PrintDistribution {            // ★신규 = 다중 출신
  id      String @id @default(cuid())
  printId String @map("regionCardId")
  setId   String
  role    String                      // primary|secondary
  @@unique([printId, setId])
}

// 변경: Price — 와이드컬럼 폐기, 차원 필드 추가
//   printVariantId? / sealedProductId? / conditionType / condition / grader? / grade?
//   priceKind / amount / currency / fxRateId? / recordedAt
// 변경: MarketOrder·MarketMatch·MarketStat·CollectionItem — regionCardId/cardId → printVariantId
```

## 6. 마이그레이션 로드맵 (expand-contract)

> ★운영주의([[project_identity_model_migration]]): `_snap_p5_*` 존재 동안 **`prisma db push` 절대 금지**(스냅샷까지 DROP). 신규 테이블도 `migrate`/타깃 `CREATE TABLE`로. 배포=master push→Lightsail. 코드 배포가 DB 변경보다 먼저.

- **Phase 0 — EXPAND (싸고 가역, 즉시):**
  1. **P0** 시세 페이지 팩별 분리 노출 — `getCardPrices` 의 Card-횡단 dedup 폐기 → (에디션×세트×번호) 행별 가격라인. ⚠`marketRegion(US/GLOBAL/JP/KR)→표시지역(EN/JP/KR)` 매핑 함정([[project_price_page_redesign]]). **DB 무변경(쿼리/UI만).**
  2. `PrintVariant`·`SealedProduct`·`FxRate`·`PrintDistribution` **빈 테이블 additive 생성** + RegionCard당 `standard` PrintVariant 1행 시드.
  3. P2 og-jp-dpt 이미지 차용 6건 검토.
- **Phase 1 — DETECT (read-only, 파괴 전 필수):**
  4. 같은-region 다중인쇄/같은-그림 분류기 — 정당재판(유지) / 변형 오합침(분리후보) / 롤업후보(283 잔여 collapse) 가르기. 베이스라인 저장.
- **Phase 2 — CONTRACT/BACKFILL (가드, 일부 비가역):**
  5. 283 잔여 art-collapse 마무리(pHash+메타무충돌 가드 G_MERGE).
  6. 변형 행 백필(151 마스터볼 등)을 PrintVariant 로(잠금시대=`assertMappingWritable`+`--allow-mapping`).
  7. ⚠샤이니/마감 오합침 분리(card-merge 게이트·스냅샷·G_FK·`--allow-mapping`) — **비가역=최후·최소·최대가드**.
  8. `Price` 정규화(와이드→amount+차원); 시장 FK 를 `printVariantId` 로 재키.
- **Phase 3 — MARKET:** MarketOrder/Match/Collection → printVariantId/sealedProductId; `(printVariantId, conditionTier)` 매칭.
- **별도 트랙:** 빈칸 시세 수집(KR·덱 행 price 0).

## 7. 결정 기록

- ✅ Card(@@map LogicalCard) = Art = ArtCard (P5 완료). **별도 ArtCard 테이블 재생성 금지.**
- ✅ 변형 = `PrintVariant`(별 FREE 테이블), RegionCard 컬럼/행 아님.
- ✅ 컨디션/등급 = 정체성 아닌 시장 필드. graded = (grader[+BRG/TAG]+grade+cert#).
- ✅ 호가 매칭: raw 한 버킷 유지하되 **raw↔graded 분리**(p2p §8 교정).
- ✅ sealed/FX/다중출신은 카드축 밖 side 테이블.

## 8. 연관

[[project_p2p_orderbook_market]] · `docs/plans/p2p-market-design.md` · [[reference_language_edition_pricing]] · [[project_identity_model_migration]] · [[project_price_page_redesign]] · [[project_frozen_card_packs]](mapping-lock)
