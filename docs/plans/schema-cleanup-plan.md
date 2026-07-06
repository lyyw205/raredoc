# DB 스키마 정리 플랜 (시세 연결 전 마감용)

> 작성 2026-06-29. 9-에이전트 감사(라이브 prod DB 실측 + 코드 grep + 적대 검증) 결과.
> 목적: 시세 연결 직전, 새 개발자가 봐도 **거짓말 안 하는 / 간결한 / 이해하기 쉬운** 스키마로.

## 결정적 전제 (왜 대규모 rename을 안 하는가)

1. **`prisma/migrations/`가 비어있고 `package.json`은 `prisma db push`로 동작.**
   db push는 rename 감지가 없어 **모든 테이블/컬럼 개명을 DROP+CREATE(=데이터 손실)로 렌더링**한다.
2. **가격 클러스터는 비어있지 않다 (라이브 실측):**
   `Price` 61,283 · `MarketStat` 67,344 · `PrintVariant` 63,764 · `ExternalIdMapping` 36,903행.
   → "비어있으니 지금 공짜로 개명" 전제는 **거짓**.
3. **`@@map`/`@map` 간접참조는 Prisma 클라이언트 경로(99%)에 완전 투명** = idiomatic, 부채 아님.
   옛 물리명이 새는 곳은 **raw SQL 쓸 때뿐**이고, scripts/ 가 거기 깊이 묶임:
   `LogicalCard` 49파일 · `CardLocale` 36 · `SetGroup` 7 · `LogicalCardSpecies` 6 (전부 **tsc-제외** → 빌드 green, 런타임 폭발).
   src/ 는 단 1파일(`queries.ts`)만 raw 참조 = 앱 레이어 이미 깨끗.

**model ↔ 물리테이블 매핑(영구 안정):**
| Prisma model | 물리 테이블 |
|---|---|
| `Card` | `LogicalCard` |
| `RegionCard` | `CardLocale` |
| `CardPack` | `SetGroup` |
| `CardSpecies` | `LogicalCardSpecies` |

물리컬럼(@map): `cardId=logicalCardId` · `cardPackId=setGroupId` ·
`regionCardId = cardLocaleId`(Price·ExternalIdMapping) / `localeId`(Trade·CollectionItem·RankingSnapshot) ← **두 철자 공존**.

---

## 🟢 DO NOW

### ✅ N3·N4·N5 — 완료 (2026-06-29, 순수 주석/라벨, 위험 0)
- 헤더: "rename 부채" → **의도된 안정 매핑표 + raw SQL/Prisma 규칙 + 라이브 6만+행 경고**.
- `Card.setGroupId`(113)·`attacksKo/abilitiesKo`(141)·`ExternalIdMapping.setGroupId`(496): "배포 後 DROP 대기" 거짓말 → "DROP **완료**" / 삭제.
- ArtCard 혼동(151-153): "추가형 ArtCard(Slice3)·drop 가역" → **"Card가 곧 '한 그림'(P5 collapse 완료, 별도 ArtCard 테이블 없음)"**.
- N4 `ExternalIdMapping`(492): "정확히 하나만 채움"(거짓) → "regionCardId 1차, cardId 비정규화 사본".
- N5: `PriceSource`="시세 피드 레지스트리" / `ExternalSource`="id-매핑·카탈로그 레지스트리" 라벨(병합 금지).
- 손대지 않음(거짓 아님): line 327(GameCard "폐기 완료"=과거형)·399-400(Price 와이드컬럼=N1 전엔 컬럼 실존 = 참).

### ⬜ N1 — Price 와이드컬럼 5개 물리 DROP (`normal, holofoil, reverseHolo, firstEdition, marketPrice`)
- 모델엔 이미 없고 `amount`(100% 채움)로 대체됨. 유일 writer `scripts/lib/price-sync-lib.ts:150-167`는 입력으로만 쓰고 저장 안 함.
- 유일 직접 reader `scripts/seed-market.ts:66`은 모델에 없는 필드 select → **이미 런타임 throw 중**(이 DROP과 무관).
- **단계:** ① `seed-market.ts` 깨진 select 수정/삭제 → ② Supabase 스냅샷 → ③ 명시적 `ALTER TABLE "Price" DROP COLUMN "normal", DROP COLUMN "holofoil", DROP COLUMN "reverseHolo", DROP COLUMN "firstEdition", DROP COLUMN "marketPrice";` → ④ schema line 399-400 주석 lockstep 제거. **db push 금지.**

### ⬜ N2 — `Price.usdToKrw` 컬럼 DROP
- 참조 0건·0% 채움. `FxRate`(날짜별) read-time 환산이 올바른 설계. `ALTER TABLE "Price" DROP COLUMN "usdToKrw";`. 손실 0. (N1과 같은 ALTER 배치 가능.)

---

## 🟡 STAGED (expand-contract, 가격 통합과 함께)

### S1 — Price 일일 스냅샷 무결성 (가장 시급, 볼륨 적재 전)
- 문제: `upsertDailyPrice`가 `findFirst(recordedAt>=today)→create`, unique 없음 → 동시 sync 중복 INSERT 가능.
- **키: `@@unique([regionCardId, sourceId, recordedDate])` + `NULLS NOT DISTINCT`** (리뷰어 초기 제안 `[printVariantId, sourceId, priceKind, conditionType, recordedDate]`는 nullable 함정으로 **틀림**).
- 단계: ① nullable `recordedDate DateTime @db.Date` 추가 → ② `recordedDate = recordedAt::date` 백필 → ③ 기존 중복행 제거 → ④ upsert를 `@@unique` 기반으로 전환(`recordedAt`은 정렬용 유지) → ⑤ 제약 추가. **게이트: 백필+중복제거 완료 후에만 제약.**

### S2 — `MarketStat.cardId` → `regionCardId` 개명 (이름이 referent를 속이는 클러스터 최대 함정)
- `cardId`가 실제로 RegionCard id를 담음(CardLocale 매칭 39,862행 vs LogicalCard 65). `scripts/migration/gate-fk.ts:40`도 `parent:"CardLocale"`로 선언.
- **최저위험:** ① Prisma 필드만 `regionCardId @map("cardId")`(DDL 0, 복합키 `cardId_date→regionCardId_date` 변경 → `src/lib/services/market.ts:233/262` lockstep) → ② daily 크론(`src/app/api/cron/daily/route.ts rebuildMarketStats`) green 확인 → ③ 물리 RENAME은 나중(@map 은퇴 시).
- **FK 추가 금지:** ~27k행 미매칭(seed mock 추정).

### S3 — `Card.nameKo` DROP (게이트 미충족 → 단계화)
- 366개 LogicalCard가 `nameKo` 보유하나 대응 `CardText(ko).name` 없음 → 미충족. 라이브 fallback 6곳(`queries.ts:249 lc.texts?.[0]?.name ?? lc.nameKo`), writer ~4개.
- 단계: ① 366건 `CardText(ko)` 백필 → ② `?? nameKo` fallback 제거 → ③ gap=0 재검증 → ④ DROP. **★`nameKo`는 Set/Species/Rarity/RarityCategory에도 존재 — `LogicalCard.nameKo`로 외과적 스코프, 맹목적 삭제 금지.**

### S4 — `regionCardId` @map 철자 통일 (`cardLocaleId`/`localeId` → `regionCardId`)
- 모든 대상 populated(Price 61k, ExternalIdMapping 37k) → **db push 절대 금지**. 수동 `ALTER … RENAME COLUMN`(메타데이터 op, 안전) + 스크립트 raw SQL 9곳 교정. S2/D1 물리개명 번들과 함께 한 번에.

### S5 — 빈 가격 테이블 정비 (가격 통합 PR에 동승)
- `SealedProduct.setGroupId String?`(느슨) → 진짜 FK `cardPackId`(0행·참조 0 = 무위험), `PrintDistribution.role` → enum. **단독 PR은 churn** — 첫 소비자(sealed/distribution 적재) 생기는 PR에 묶기.

### S6 — `priceKind`/`conditionType` enum화 (가격 통합 PR에 동승)
- 100% 채움이나 writer 단 1곳(`price-sync-lib.ts`), `priceKind` app reader 0. SKU 분류 자기문서화 → `price-sync-lib.ts` 수정과 동일 PR.

---

## 🔵 DEFER

- **D1 — 물리 테이블/FK 컬럼 개명 번들** (`LogicalCard→Card`, `logicalCardId→cardId` 등). **트리거: `prisma migrate` 히스토리 baseline 후.** 수동 `ALTER … RENAME` + 구이름 호환 VIEW로 in-flight raw SQL 보호 + 스크립트 ~300참조 일괄 교정. **piecemeal 절대 금지.** S4 여기 합류.
- **D2 — `Price.printVariantId` NOT NULL 타이트닝** — 100% 채움이나 비표준 variant 등장 전까지 보류.
- **D3 — `artCardId` 제거** — P5 후 대부분 `id`와 동일하나 **1,852행 NULL** + 리졸버(`decklist-gamecard-resolver.ts`) 방어로직 load-bearing. 트리거: 리졸버 단순화 시.

## ⛔ SKIP (건드리지 말 것)

- **`@@map` 테이블 "지금 개명"** — scripts/ raw SQL 30파일·~300참조 tsc-제외 = 런타임 폭발. 클라이언트 API 이미 깨끗 → 이득 0/위험 高. N3 매핑표가 가치 90%를 위험 0%로 포획.
- **`@relation("…Locale…")` 관계명 정리** — blast 0이나 가치도 0. 순수 churn(D1 편집 중 아니면 금지).
- **ExternalSource ↔ PriceSource 병합** — 다른 FK 타깃·컬럼, 98k행 재배선. 주석만(N5 완료).
- **`Price.regionCardId`/`printVariantId` 드롭** — 전자=모든 read 조인 키, 후자=미래 SKU 축. 둘 다 유지.
- **`Set.packType`(119참조, TS union 가드)·`region`/`language`(수백 참조, 의도적 자유문자열) enum화** — 새 안전 없이 churn만.

---

## 프로덕션 안전 체크리스트 (모든 DROP/RENAME에 적용)

1. **`prisma db push` 금지** — 명시적 `ALTER TABLE …` 또는 baseline 후 `prisma migrate`만.
2. **개명 전 `scripts/` + `src/generated/prisma` grep 필수** — tsc-제외라 컴파일 통과해도 런타임 깨짐. 물리명 문자열 전수 확인.
3. **code-first → 배포 → 물리 DROP/RENAME 마지막** (expand-contract).
4. **ALTER 전 Supabase 스냅샷** (특히 61k+ populated 테이블).
5. **populated 테이블 RENAME은 `ALTER … RENAME`만**(메타데이터 op) — db push로 안 렌더되게 `@map` lockstep.
6. **daily 크론**(`api/cron/daily/route.ts`)이 MarketStat/Price 기록 → 그 모델 변경 후 크론 1회 green 확인 전 다음 단계 금지.

## 권장 순서

DO NOW: ✅N3 → ✅N4·N5 → ⬜N1(seed-market.ts 먼저) → ⬜N2 (N1·N2 같은 ALTER 배치).
STAGED: S1(가장 시급) → S2(크론 green) → 가격 통합 PR에서 S5·S6 → S3(직교) → D1 번들에 S4.
