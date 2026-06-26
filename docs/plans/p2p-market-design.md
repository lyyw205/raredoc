# P2P 호가주문서 마켓 설계 (Order-Book Marketplace)

> 상태: 설계 확정 대기 (2026-06-26) · 모델=호가주문서 + 소프트 시세밴드 · "과복잡 금지"

## 1. 목표 & 채택 모델

개인 간(P2P) 중고 카드 거래에서 **사용자가 매수/매도 주문을 미리 걸어두고(standing order) 가격이 교차하면 매칭**되는 **호가주문서(order book)**를 도입한다.

채택 결정(사용자):
- **코어 = 호가주문서** — 카드별 매수호가(bid)/매도호가(ask)를 미리 등록, 교차 시 자동 매칭. (크림·피파온라인 이적시장 계열)
- **시세지수 = 소프트 참고밴드** — 가격·거래내역을 지속 수집해 **상·하한가 범위와 변동만** 표시. **하드 캡 아님**, 등록 시 가이드 + 참고용.
- **자유 등록 허용** — 밴드 밖 가격도 자유롭게 등록 가능.
- **과복잡 금지** — 검수센터·완전자동정산 등 무거운 장치는 MVP 제외.

근거: 리서치 5종(CDA/콜옥션/지수앵커/Want·Have/Best Offer) 비교 결과 — 우리만의 자산인 **신뢰 시세지수**를 살리고, 자체 포인트 통화는 금지(PucaTrade 붕괴), 유동성 따라 헤드/롱테일 분리. 피파온라인 이적시장 = 호가주문서 + 시세 상하한 밴드의 실증 선례(한국 유저 친숙). 단 피파는 동질·무한복제·게임머니 즉시정산이라 순수 호가주문서가 돌지만, 우리는 롱테일·실물·현금이라 **밴드는 소프트**로, 매칭은 **자동매칭→양측 확인**으로 둔다.

## 2. 기존 인프라 재사용 (이미 구축됨)

| 필요 | 기존 자산 | 위치 |
|---|---|---|
| 사용자 계정 | NextAuth v5 (구글·카카오·이메일) + `User` | `src/auth.ts`, schema `User` |
| **거래 단위** | `RegionCard.id` (특정 언어·세트·번호의 단일 카드) | schema `RegionCard` |
| 컨디션 | `CollectionItem.grade` (NM/LP/MP/HP/VNDS/DS/미개봉/1착) | schema `CollectionItem` |
| 시세 데이터 | `Price`(다출처·통화자동) + `Trade`(PokeTrace) + `MarketStat`(일일집계) | `src/lib/services/market.ts` |
| 환율 변환 | `toKrw()` (USD/JPY/EUR→KRW) | `src/lib/trades/shared.ts` |
| 정산/협상 | `Conversation`/`Message`/`Appointment`/`Review` | schema ⓕ·ⓖ |
| 기존 마켓 | `Listing`(판매글)+`Offer`(DM협상) = 당근/번개식 자유등록 | schema `Listing`/`Offer` |

→ **인증·거래단위·시세·정산·자유등록은 이미 있다.** 호가주문서는 그 위에 **"펌(firm) 주문 + 자동매칭"** 레이어만 추가하면 된다. 기존 `Listing`/`Offer`(자유 협상 등록)는 **그대로 유지**(사용자 "자유롭게도 등록 가능").

## 3. 새로 만드는 것 — 모델 2개

### MarketOrder (호가 주문)
```prisma
model MarketOrder {
  id           String    @id @default(cuid())
  userId       String                      // 주문자
  regionCardId String                      // 거래단위 (RegionCard.id)
  cardId       String                      // logical (집계/도감 조인용)
  side         String                      // "buy" | "sell"
  grade        String                      // 컨디션 (CollectionItem.grade 동일 enum)
  priceKrw     Int                         // 호가
  quantity     Int       @default(1)
  filledQty    Int       @default(0)
  status       String    @default("open")  // open/partial/filled/cancelled/expired
  itemId       String?                     // sell: 연결된 CollectionItem(보유확인, 선택)
  expiresAt    DateTime?                    // 만료(예: 7/30/90일·무기한)
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  @@index([regionCardId, side, status, priceKrw])
  @@index([userId])
}
```

### MarketMatch (체결/매칭)
```prisma
model MarketMatch {
  id             String   @id @default(cuid())
  regionCardId   String
  buyOrderId     String
  sellOrderId    String
  buyerId        String
  sellerId       String
  priceKrw       Int                        // 체결가 = 먼저 걸린(maker) 호가
  quantity       Int
  status         String   @default("matched") // matched/confirmed/done/cancelled
  conversationId String?                    // 매칭 시 자동 생성 대화
  createdAt      DateTime @default(now())
  @@index([regionCardId, createdAt])        // ← 시세밴드 수집원
}
```

## 4. 매칭 로직 (린)

1. 신규 주문 등록 → 같은 `regionCardId`의 **반대편 open 주문** 조회. **컨디션(grade) 무시 — 가격만으로 매칭**(grade는 호가에 표시만, 불일치는 체결 후 대화로 확인). §8 결정.
2. 교차 판정: `buy.priceKrw ≥ sell.priceKrw`.
3. 우선순위: **가격 우선 → 시간 우선(먼저 등록)**. 체결가 = **먼저 걸린 쪽(maker) 호가**.
4. `MarketMatch` 생성 + 양 주문 `filledQty` 갱신(부분체결 지원).
5. **자동 "체결"이 아니라 "자동 매칭"**: 실물+현금+배송이라 돈은 자동이체 안 함 → 매칭 즉시 **Conversation 자동 생성**("호가 체결: ₩X에 매칭되었습니다") + 양측 알림 → 기존 `Appointment`(직거래/택배) → `Review`로 마무리.

## 5. 시세 참고밴드 (소프트 · 참고/등록용)

- **수집원**: 기존 `Price`(다출처) + `Trade`(PokeTrace) + **신규 `MarketMatch`(우리 체결)**. 이미 도는 `rebuildMarketStats()`/`MarketStat`를 확장 재사용.
- **표시**: RegionCard별 **최근 시세범위(상·하한)** + 변동(간단 시계열). (a) 주문 등록 모달에 "참고 시세범위 ₩X–₩Y" 가이드, (b) 호가창 상단에 범위 배지/스파크라인.
- **소프트**: 매칭/등록을 제약하지 않음. 밴드 밖 가격 **자유 등록 가능**(경고 표시만).
- **경량 조작 가드**: 밴드는 외부출처(Price/Trade) 가중 + 우리 체결은 median·이상치 트림. 자동체결을 밴드에 묶지 않으므로(=참고용) 오라클 반사성 위험 낮음. 무거운 격리는 후속.

## 6. UI

- **카드 상세** `/[locale]/cards/[cardId]`: 신규 **"호가" 섹션** — 매도호가(낮은가↑)/매수호가(높은가↑) 리스트, best ask·bid·스프레드, 최근 체결, **참고 시세범위+변동**. CTA: `매수 주문`·`매도 주문`.
- **주문 등록 모달**: side · 컨디션(grade) · 가격(참고범위 표시·자유입력) · 수량 · 만료.
- **내 호가**: `/[locale]/profile`(또는 신규 `/[locale]/marketplace`)에 "내 주문" 탭(수정·취소).
- **매칭 알림**: 매칭 시 알림 + 자동 대화 진입.

## 7. 정합성·신뢰·잠금가드

- MVP 정산 = 기존 방식(직거래/택배 + `Review` 평판). **에스크로/안전결제는 후속**(기존 시스템도 미보유).
- **매핑 잠금(mapping-lock) 무관**: MarketOrder/Match는 *사용자 거래 데이터*지 카드 정체성(cardId/이미지/종/번호)이 아니므로 `assertMappingWritable` 가드 대상 아님(=FREE).

## 8. 컨디션(grade) 매칭 방식 — 결정됨 ✅

**결정(사용자 2026-06-26): 컨디션 무시, 가격만 매칭.**
- `grade`는 `MarketOrder`에 **표시 필드로만** 보존(호가창에 "NM"·"미개봉" 등 노출) — **매칭 키 아님**.
- 매칭은 같은 `regionCardId` 안에서 **가격만**으로 성립(유동성 최대 = 롱테일에 유리).
- 컨디션 불일치는 **체결(매칭) 후 대화에서 확인·협의**(매도자 grade·사진을 매칭 시점에 매수자에게 노출, 필요 시 취소 가능하게).
- ⚠후속 보완 후보: 매수자가 자율적으로 "이 등급 미만은 매칭 알림에서 흐리게" 정도의 필터(매칭 자체는 막지 않음).

## 9. 단계 (린 로드맵)

- **P0**: `MarketOrder` 모델 + 등록/취소 + 카드상세 호가창 표시(매칭 없이 호가만).
- **P1**: 매칭 엔진 + `MarketMatch` + 대화/약속 연동(체결 완주).
- **P2**: 시세 참고밴드(수집·범위·변동) + 등록 가이드.
- **P3(후속)**: 안전결제/에스크로, 헤드 카드 고도화, 교차언어(JP/EN/KR) 매칭 풀 통합.
