# Price-Collector 계획 (v2 — 독립 출처 교차검증)

> 작성 2026-05-30. 시세 수집 에이전트 + 파이프라인 설계. `docs/followup-plans.md §8` Fleet 구축의 price-collector 상세판.
> 관련: `memory/reference_pokemon_tcg_sites.md`(출처 카탈로그), `docs/BACKEND_ARCHITECTURE.md`.

## 확정된 결정 (사용자)
1. **KR 시세**: USD→KRW 환산을 기본값으로, **핫카드만 실제 KR 데이터(번개/디시)** 로 덮어씀.
2. **데이터 우선순위**: 실거래(Trade) · 변동추이(MarketStat) · JP 매입가(店 buy).
3. **법적 리스크**: 출처별 직접 판단 (아래 표, 일부 미확정).
4. **효율화**: 티어링 + Lazy 수집.
5. **출처 독립성(B안)**: eBay·TCGplayer·CardMarket을 PokeTrace 집계에 의존하지 않고 **각각 1급 PriceSource로 독립 적재** → 어긋나면 교차검증 신호. PokeTrace는 sold 이력+컨디션 티어 전용(Trade).

## 현재 코드 상태 (출발점)
- DB 모델은 3계층 준비됨: `Price`(출처별 스냅샷) · `Trade`(sold) · `MarketStat`(일별 롤업). `PriceSource` 마스터 존재.
- **적재 파이프라인은 끊김**: Phase 5에서 `sync-prices.ts`/`sync-poketrace-trades.ts` 삭제됨.
- 현재 카드 상세는 **요청 시 PokeTrace API + 번개 검색 라이브 호출**로 "시세 3출처"를 그림 → DB Price/Trade/MarketStat은 거의 빈 상태.
- eBay는 안 빠짐: `src/lib/price/ebay.ts`(EbayPriceProvider, Browse API 직접) + PokeTrace 응답의 `prices.ebay/tcgplayer/cardmarket`(컨디션 티어별) 두 경로 존재.
- 시드된 PriceSource: ebay, tcgplayer, poketrace(활성) / hareruya2, bunjang(비활성). cardmarket·tcgcsv·JP매입가 없음.

---

## 1. 시장조사 — 출처 인벤토리

데이터 성격: 호가(offer) / 실거래(sold) / 매입가(店 buy)

| 지역 | 출처(code) | 성격 | 적재 모델 | 수집 방식 | 독립성 |
|---|---|---|---|---|---|
| 글로벌 | ebay | sold/호가 | Price | eBay Browse API(직접) | 독립 |
| 글로벌 | tcgplayer | 시장가 | Price | pokemontcg.io 임베드 | 독립 |
| 글로벌 | cardmarket | 시장가(EU) | Price | pokemontcg.io 임베드 | 독립 |
| 글로벌 | poketrace | sold 이력+컨디션 티어 | Trade | PokeTrace API | 집계(이력 전용) |
| JP | tcgcsv | 시장가(USD) | Price | tcgcsv cat.85 벌크 | 독립 |
| JP | pokekyo / pokeget | 매입가 | Price(condition=buy) | 에이전트 파싱 | 독립 |
| JP | magi | 실거래(낙찰) | Trade | 약관 통과 시 | 보류 |
| KR | bunjang | 호가(실매물) | Price | 검색 스냅샷(핫카드만) | 독립 |
| KR | dcinside | 호가/체결 | Price | 에이전트(핫카드만) | 회색 |
| KR | (환산) | 파생 | MarketStat | USD→KRW(롱테일) | 파생 |

PriceSource 시드 갱신 필요: cardmarket·tcgcsv·pokekyo·pokeget 추가, hareruya2 제거 검토, bunjang 활성화.

## 2 & 4. 수집 가능성 (feasibility)

| 출처 | 접근 | 구조화 | 차단/제약 | 판정 |
|---|---|---|---|---|
| pokemontcg.io | API 키 벌크 | ★★★ | 없음 | 스크립트 |
| tcgcsv (JP) | curl 벌크 | ★★★ | 가격 서브파일 실측 필요 | 스크립트(검증 후) |
| eBay Browse | OAuth API | ★★★ | 키·쿼터 | 스크립트(핫카드 한정) |
| PokeTrace | API/llms.txt | ★★☆ | AI친화 | 스크립트 |
| pokekyo/pokeget | curl+UA | ★☆☆ | URL 인코딩 | 에이전트 |
| 번개장터 | 검색 | ☆ | — | 핫카드 스냅샷 |
| 디시 | curl+세션 | ☆ | 비정형·회색 | 핫카드 에이전트 |
| ICU / ポケカジラ | — | — | 봇차단 | 보류/금지 |

## 3. 방법론 (2-레이어)

**Layer 1 — 결정적 스크립트 (cron)**
- `sync-prices-pokemontcg.ts` → Price(tcgplayer) + Price(cardmarket) 각각 별 행
- `sync-prices-tcgcsv-jp.ts` → Price(tcgcsv)
- `sync-prices-ebay.ts` → Price(ebay), 핫카드 티어만(쿼터 보호)
- `sync-trades-poketrace.ts` → Trade(poketrace, 컨디션 티어별) — 삭제분 신 ERD로 재작성
- 전부 멱등 upsert, 시계열 누적.

**Layer 2 — price-collector 에이전트 (LLM)**
- JP 매입가(pokekyo/pokeget) + KR 핫카드(번개/디시) 비정형 파싱
- 엔티티 해소: 스크랩 문자열 → cardLocaleId, ExternalIdMapping 캐시, 미확신=skip
- 신팩·사이트 구조 변경 모니터링

**집계**: 원천(Price/Trade) → 야간 배치 → MarketStat. 출처별 교차검증(중앙값/이상치 플래그, 출처 1개면 신뢰도 낮음 표시), KRW 환산 + 변동률·ATH·거래량 계산.

## 5. 효율성 (수만 장)

티어링 + Lazy + 미리계산. 신호: MarketStat.viewDelta/wishlist + collectionItem 수 + rarity + 거래량.

| 티어 | 대상 | 시장가 출처 | 주기 |
|---|---|---|---|
| S | 핫/고가/관심 | tcgplayer·cardmarket·ebay·tcgcsv·KR실데이터 전부 | 일 1 |
| A | 모던 플레이어블 | tcgplayer·tcgcsv | 주 1 |
| B | 롱테일/구판 | tcgplayer/tcgcsv 중 1 | 월 1 또는 Lazy |
| 벌크 커먼 | 나머지 | 없음 | USD→KRW 환산만 |

- eBay는 쿼터 때문에 S티어 한정.
- Lazy: 카드 첫 조회 시 stale이면 백그라운드 큐 + 캐시본 노출.
- UI는 MarketStat 1행 읽기(O(1)). 원천 raw는 분리 보관, 오래된 건 일→주 다운샘플.

## 6. 에이전트 생성 방안

`.claude/agents/price-collector.md`:
- 담당: 비정형 JP 매입가 + KR 핫카드 + 엔티티 해소 + 모니터링 → Price/Trade upsert. 구조화 출처는 스크립트가 담당.
- tools: Bash, Read, Grep, Glob, WebFetch
- model: sonnet (애매한 엔티티 해소만 opus 에스컬레이션)
- 철칙: 실제 받은 값만(할루시네이션 금지) · robots/약관 준수 · 미확신 skip · 출처 표기 · 멱등

## 법적 표 (일부 미확정)

| 출처 | 권장 | 확정 |
|---|---|---|
| pokemontcg.io / tcgcsv / PokeTrace / eBay API | 사용 | 대기 |
| pokekyo / pokeget | 저빈도·인용비율 | 대기 |
| magi | 약관 직접확인 | 사용자 콜 |
| 번개 / 디시 | 핫카드·저빈도 | 사용자 콜 |
| ICU / ポケカジラ | 금지 | 대기 |

## tcgcsv 가격 실측 결과 (2026-05-30) — JP 백본 ❌

엔드포인트 `https://tcgcsv.com/tcgcsv/{cat}/{group}/prices` 실측 (S3 백엔드가 간헐적 NoSuchKey 반환 — 플래키, 재시도 필요):
- **EN (category 3)**: 가격 파일 존재. 예) Black Bolt(group 23873) **1557 행**, 필드 `lowPrice/midPrice/marketPrice/highPrice` + `subTypeName`. TCGplayer 시세 그대로.
- **JP (category 85)**: groups 556개·products 존재(예 group 24258 = 446개)하나 **prices는 0건/NoSuchKey** (신·구 13개 샘플에서 단 1건도 가격 없음). JP TCGplayer 가격 미제공으로 판단.

**결론 / 계획 영향:**
- tcgcsv는 **JP 시세 백본이 될 수 없음** (가설 기각).
- EN 가격은 tcgcsv로도 가능하나 **pokemontcg.io가 이미 tcgplayer+cardmarket 제공 → 중복**. tcgcsv는 시세 파이프라인에서 제외(카탈로그 용도로만 유지).
- **새 공백: JP 카드 시세 출처 부재.** pokemontcg.io는 영문 세트만 → JP CardLocale(region=JP) 시세 0. JP도 KR처럼 "무료 구조화 출처 없음" 상태.
- JP 시세 후보 재정렬: ① PokeTrace의 JP 커버리지 확인 → ② magi(실거래, 약관) → ③ pokekyo/pokeget 매입가(에이전트) → ④ 최후 USD 환산 폴백.

## 영어판(EN) 시세 — 확정 (2026-05-31)

영어권 시세 출처 리서치 결과: 대부분의 "다른 API"는 TCGplayer/Cardmarket을 재판매할 뿐이라 교차검증 가치 없음. 진짜 독립 신호는 ① eBay 실거래 ② 등급카드(PSA/BGS/CGC) 두 종류뿐. eBay sold·등급은 모두 eBay 체결 데이터를 가공하는 "집계 사이트"를 거쳐야 얻음(eBay 공식 sold API는 승인제로 사실상 막힘).

**확정 구성:**
```
pokemontcg.io (무료·벌크)   → raw 미등급 (TCGplayer market + Cardmarket), 전 영어카드 일1회 cron
PokeTrace Pro ($19.99/월)   → 등급별 시세(PSA/BGS/CGC, 15개 사) + 가격 히스토리 + 상업적 사용권
(추후) PokeTrace Scale($98) → eBay 실거래(sold) 필요해지면 업그레이드
```

**근거/메모:**
- pokemontcg.io는 영어 세트 한정. TCGplayer market(실거래 기반)+Cardmarket(EU) 2개 독립 출처를 벌크로 제공 → raw 베이스라인은 사실상 공짜·콜드미스 없음.
- **PokeTrace Pro 선택 이유**: (a) 등급 PSA뿐 아니라 BGS/CGC 15개사 커버, (b) **상업적 사용권 포함** — 현재 카드상세가 Free 티어를 라이브로 쓰는 라이선스 회색지대도 동시 해소, (c) 이미 코드 연동됨. EU(Cardmarket)는 불필요하나 Pro에 끼워져 옴(추가비용 없음).
- 대안 비교: PriceCharting은 등급 최강이나 풀 API는 최상위 "Legendary"(가격 비공개·고가)에서만 → 보류. PokemonPriceTracker는 PSA 8/9/10만·상업용 $99 → 열위.
- 등급/sold는 **고가 카드 소수에만 의미** → 티어 S + Lazy로 호출 최소화(10,000 req/일로 충분).
- eBay 실거래(sold)는 Scale($98)에 있음. raw 실거래는 pokemontcg.io의 TCGplayer `market`으로 어느 정도 대체되므로 **Pro로 시작, 필요 시 Scale 업그레이드**.

**PriceSource 시드 갱신(EN 부분):** tcgplayer·cardmarket·poketrace 활성 유지, poketrace에 grade 행 추가 대응. tcgcsv는 시세에서 제외(EN 중복·JP 공백).

**스키마 보완 1개:** `Price`에 등급가용 일반 값 칼럼(`marketPrice Float?` 또는 `value`) 추가 — raw는 기존 변형 칼럼(normal/holofoil…), 등급 행은 (gradingCompany, grade, marketPrice)로 저장.

## JP 시세 — 스크랩 실측 + 구성안 (2026-05-31)

전 후보 사이트 robots + 정적/SPA + JSON엔드포인트 실측 결과:

| 사이트 | robots | 접근(실측) | 데이터 | 판정 |
|---|---|---|---|---|
| **yuyu-tei** | 완전 클린 | 정적 HTML, 가격 내장(369토큰)+JSON-LD | 샵 販売+買取 | ✅✅ 백본 |
| **hareruya2** | cart/checkout만 차단 | **Shopify `/products.json` 작동** (가격+PSA10 등급품 포함) | 샵 販売(raw+등급) | ✅ 2번째 클린 출처 |
| pokeca-chart | 관대 | Next.js, `__NEXT_DATA__` 없음 → API역설계/Playwright | 집계 | ⚠️ 고비용 |
| snkrdunk | 대체로 OK | Next.js, 런타임 API → Playwright | **C2C 実売** | ⚠️ 고비용·가치↑ |
| magi | — | SPA성, 미검증 | C2C 実売 | ⚠️ |
| cardrush / suruga-ya | **claude/AI봇 명시차단**(+suruga 403) | — | 샵 | 🚫 금지 |
| mercari | API 차단, 안티봇 | SSR 일부 | C2C 実売 | 🚫 ToS |
| pokecazilla | 봇 차단 | — | 집계 | 🚫 금지 |
| pokeca-bank | DNS 실패 | — | — | ❓ 미검증 |

**핵심 발견:**
- yuyu-tei = robots 클린 + 정적 + 구조화 → **에이전트 없이 스크립트로 수집. JP 백본 확정.**
- hareruya2 = Shopify `/products.json` 뚫림 + **JP 등급카드(PSA10 등)도 포함** → 2번째 클린 출처 + JP 등급 보너스.
- "정적 샵 3곳 교차검증"은 무산(cardrush·suruga-ya가 AI봇 차단) → **yuyu-tei + hareruya2 2곳으로 JP 販売 교차검증** 성립.
- snkrdunk·pokeca-chart는 `__NEXT_DATA__` 없이 클라이언트 페치 → API역설계/Playwright 필요(고비용).

**JP 구성안 (다출처 동시):**
```
[백본·스크립트·robots-clean·일1회]   yuyu-tei(販売+買取) + hareruya2(販売, products.json)
                                      → 두 샵 販売 median = JP 미등급 시세
[핫카드 実売·에이전트·Playwright]    snkrdunk(C2C 실거래, 정확도 최고) + magi(보조)  — 고가·인기만
[제외]                                JustTCG — JP가 일본 국내가 아님(아래 검증)
[금지]                                cardrush·suruga-ya·pokecazilla(AI봇차단)·mercari(ToS)
```
- 각 출처 = 독립 PriceSource 행. MarketStat에서 종류별 가중: **実売 > 販売 median > 買取(바닥, 별도)**. 種類 다른 값 혼합 median 금지.
- **Phase 1 = yuyu-tei + hareruya2(스크립트)** 로 JP raw+등급 대부분 커버. snkrdunk 実売(Playwright)는 Phase 2.

### 백본 품질·정확성 검증 (2026-05-31 실측)
- **yuyu-tei ★★★★★**: `sv2a` 시크릿 포함 전세트(번호 210/165까지). 카드별 번호+이름+레어도배지+가격이 정적 HTML 구조화. **販売(호가)+買取(매입가) 둘 다** = bid-ask 확보. 단 SELL은 재고분만 노출(품절 구멍) → 커버리지는 BUY가 더 완전. **raw JP 백본 확정.**
- **hareruya2 ★★★★**: products.json 수천~만 개. **등급카드 ~25%(PSA10 등 JP 등급 대량)** → PokeTrace(EN 등급 위주)의 **JP 등급 공백을 메움**. 단 `product_type` 비어있고 정보가 제목 블롭(`【PSA10】이름(변형){타입}〈번호〉[세트코드]#id`)에 인코딩 → **정규식 파싱 + 액세서리(슬리브 등) 필터 필요.** **JP 등급 백본 + raw 교차검증.**
- **JustTCG 제외 확정**: TCGplayer 기반·USD, JP도 서양시장 값(일본 국내가 아님) → pokemontcg.io의 JP판일 뿐 가치 낮음.
- **snkrdunk/magi = Playwright 필요(Phase 2)**: 둘 다 데이터 클라이언트 페치(초기 HTML에 가격/API無). `api.snkrdunk.com` robots는 비어있음(허용적) → snkrdunk 実売 기술적 가능, 효율만 낮음.

**남은 검증(구현 시):** yuyu-tei/hareruya2 利用規約(robots는 클린), snkrdunk Playwright API 캡처 실측.

### JP 표시/집계 방침 (확정)
- **저장**: `yuyu-tei_sell` / `yuyu-tei_buy` / `hareruya2` 각각 **독립 PriceSource 행** (블렌딩해서 저장하지 않음).
- **표시**: 카드 상세에 **두 출처 나란히** 노출(EN의 "시세 3출처" 패턴과 동일). raw는 yuyu-tei 販売 vs hareruya2 販売 1:1 비교 + yuyu-tei 買取(매입가) 보너스. 등급은 hareruya2 단독 표시.
- **주의 — 같은 종류끼리만 비교**: 두 출처는 같은 걸 재지 않음. raw 販売끼리만 비교, 買取/등급은 별도 라벨. 種類 혼합 금지.
- **집계(MarketStat)**: 차트·랭킹·KRW환산·변동률은 카드당 **대표값 1개** 필요 → raw 대표 = yuyu-tei 販売 우선(또는 두 販売 median), 등급 대표 = hareruya2. 두 販売 X% 이상 괴리 시 신뢰도 플래그.
- 요약: **"표시는 둘 다, 집계는 대표 하나."**

## KR 시세 — 출처 실측 (2026-05-31)

| 사이트 | robots | 접근(실측) | 데이터 | 판정 |
|---|---|---|---|---|
| **번개장터** | 웹 `Disallow:/talk2`만 | **공식 API `api.bunjang.co.kr/api/1/find_v2.json` 작동** (예: 메가리자몽 ₩100,000, 10건) | C2C 매물 호가(KRW) | ✅ 핵심 실KR(에이전트) |
| **중고나라** | 허용적(my-account/form만 차단) | **SSR 정적** HTML에 가격 내장(won=73), Next | C2C 매물 호가 | ✅ 2번째 실KR(스크랩) |
| icu.gg | **claude/gptbot/ccbot 차단** + /api/ /mypage/ | (한글판 시세 사실상 표준이나 AI봇 금지) | 시세 그래프·랭킹 | 🚫 제휴만 |
| 디시 포카 마갤 | **`Disallow:/` + claude 차단** | 본문 SPA | 거래/얼마 글 | 🚫→회색(AI봇차단, 신중) |
| naver 쇼핑 | 418 teapot(안티봇) | 차단 | 가격비교 | 🚫 |
| cardkingdom.co.kr | admin/cart 차단 | SPA(샵) | 샵 판매 | ⚠️ 고비용 |
| thegreat.io | — | **카드 사이트 아님(IT컨설팅사)** | — | ✗ 오인 제거 |
| collectbook.io | DNS 실패 | 미확인(거래소?) | — | ❓ 미검증 |
| cardmonster(cardmon) | — | 과거 SPA 폐기(데이터 0) 추정 | — | ❓/사망 |

**결론(기존 결정 재확인):** 깨끗한 구조화 KR 시세 출처는 **없음.** 실KR 데이터는 **번개장터 API + 중고나라 SSR** 둘(모두 C2C 매물 호가=ask, 체결가 아님, 엔티티 매칭 노이즈, ToS/robots 회색). ICU는 한글판 표준이나 AI봇 명시차단 → 제휴 전 금지. → **KR 전략 그대로 확정.**

**KR 구성 (확정 — 2026-05-31 사용자 결정 변경):**
```
[한국판 실가]  eBay API 한국어 키워드 검색 → 실제 한국판 인쇄본 시세(USD→KRW)
[폴백]         영문가 × 환율 → eBay에 없는 롱테일 카드
[제외]         번개·중고나라(국내 스크랩 안 함) ← 사용자 결정(ToS회색·노이즈·유지비)
[금지]         icu.gg(AI봇차단)·naver쇼핑(안티봇)·디시(AI봇차단)
[미검증]       collectbook.io(DNS)·cardmonster(사망 추정)
```
**변경 핵심:** 국내 스크랩(번개/중고나라) 폐기 → KR은 **eBay 한국어 검색 + 환산 폴백**으로 사실상 **스크립트만**(KR 비정형 에이전트 불필요). eBay 한국어 검색은 영문가 환산보다 정확(실제 한국판 거래가).
**주의:**
- 이건 **"해외 eBay 한국판 시세"**지 국내(번개) 시세 아님. 해외 한국판은 싸고 평평 → **UI 라벨 "해외(eBay) 한국판 시세"로 정직하게**(국내가 표기 금지).
- eBay 한국어 검색 노이즈 큼 → **세트+번호를 쿼리에** 넣어 엔티티 정확도 확보.
- 롱테일은 eBay 미수록 多 → 영문가 환산 폴백 빈도 높음.
⚠️ 번개 API는 비공식·ToS 회색 — 현재 카드상세가 이미 라이브로 사용 중. 중고나라도 robots는 허용적이나 利用약관 확인 필요. 컴플라이언스 재확인 후 사용.

### KR 해외거래 — 보강 출처 (2026-05-31 실측)
한국판은 해외에서도 활발히 거래됨:
- **eBay**: 한글판 리스팅 **36,000+** (글로벌 최대 한국판 시장), 실거래 sold(박스 "X sold"+싱글).
- **PriceCharting**: **한국판 카테고리 존재**(`/console/pokemon-korean-promo` 등, eBay sold 기반, 등급+미등급).
- **Cardmarket**: Korean 정식 언어 인식(매물 얇음). **TCGplayer**: 전용 카탈로그 없음·산발. **PokeTrace**: 한국판 커버리지 불명확(구현 시 실측).

**함정(반드시 분리):**
1. **해외 한국판가 ≠ 국내가.** 해외선 싸고 평평(원화약세+상시공급+지역독점 없음). 한국 유저 관심은 국내 KRW가.
2. **커버리지 편향**: 해외는 미개봉 박스+인기/등급 싱글 위주, 한국판 롱테일은 거의 없음.

**반영(KR 보강):**
- **등급 한국판·미개봉·인기 싱글** → eBay sold / PriceCharting 한국판이 국내 스크랩보다 깨끗 → 보조 출처로 채택. 이미 쓰는 **eBay API를 한국어 키워드로** 돌리면 저비용으로 "해외 한국판 시세" 축 확보.
- **국내 일반 거래가(KRW)** → 여전히 번개+중고나라.
- **표시 분리 필수**: "국내 시세(KRW)" vs "해외 시세(USD)" — 합치지 말 것. 별도 PriceSource(marketRegion=KR vs GLOBAL).
- 등급 한국판 중요 시 PriceCharting이 PokeTrace보다 유리할 수 있음(한국판 카테고리 보유) — 트레이드오프로 남김.

## 진행 순서
1. ~~tcgcsv 가격 실측~~ ✅ 완료 (JP ❌)
2. ~~영어판 출처 확정~~ ✅ 완료 (pokemontcg.io + PokeTrace Pro)
3. ~~JP 시세 출처 리서치/실측~~ ✅ 완료 (yuyu-tei + hareruya2 백본, snkrdunk 実売 Phase 2)
4. ~~PriceSource 시드 갱신 + 스키마 보완(marketPrice 칼럼)~~ ✅ 완료 (2026-05-31)
   - `Price.marketPrice Float?` 추가 + `prisma db push` 적용
   - `seed-price-source.ts` → 9개 출처 시드(tcgplayer/cardmarket/ebay/poketrace ON, pricecharting/bunjang off, yuyu_tei_sell/yuyu_tei_buy/hareruya2 ON)
5. Layer 1 스크립트 구현 — **진행 중**
   - ✅ `sync-prices-pokemontcg.ts` (EN: tcgplayer USD + cardmarket EUR, 세트벌크, 멱등). 검증: sv3pt5 207 tcgplayer + 190 cardmarket 행, Iono $89.78/€78.66 교차일치, 재실행 dup-skip=397·written=0. `npm run sync:prices:en [-- --set=ID|--limit=N]`
   - ⬜ PokeTrace Pro 등급 sync (EN graded) — POKETRACE_API_KEY는 Free, Pro 키 필요
   - ✅ `sync-prices-yuyu.ts` (JP 遊々亭: 販売+買取, 정적 HTML 파싱, 멱등). 검증: sv02a(jp-sv-151) 193파싱→190 sell+190 buy 적재, unmatched=0, ambiguous=3(복수인쇄본 skip). 販売¥298k/買取¥250k 등 정상. `npm run sync:prices:jp:yuyu [-- --set=CODE|--buy-only|--sell-only]`
     - ⚠️ 세트 매칭은 큐레이션 SET_MAP(yuyuCode→setId) 사용 — Set.code 가 인기 JP세트에서 null이라 자동매칭 불가. 현재 sv02a·m05만 등록, 점진 확장 필요.
   - ⬜ hareruya2 JP 스크래퍼 (products.json, 등급+raw) — **세트 매핑 미해결로 보류**
     - hareruya2 제목블롭 파싱 키 확정: `〈번호〉`(번호) + `[세트코드]`(예 sv2a,s8b) + `【PSA10】`(등급). raw 698/1000, graded 302/1000.
     - **블로커**: hareruya2 세트코드(sv2a 등)와 우리 Set.code 매칭 미확정. 우리 DB에 code=SV2a 세트 부재(실측), jp-sv-151의 code가 SV11B로 읽히는 등 **JP Set.code 데이터 정합성 의심** → hareruya2도 yuyu처럼 SET_MAP 큐레이션 필요. JP Set.code 실태 점검이 선행 과제.
   - ⬜ eBay sync (EN + KR 한국어 키워드)
5.5. ✅ 오케스트레이터 (2026-05-31) — **순수 코드, LLM 없음, cron 없음(CLI 수동 실행)**
   - `scripts/lib/price-sync-lib.ts`: 공통(Logger 타임스탬프, SyncResult 타입, 지수백오프 `fetchTextWithRetry`/`fetchJsonWithRetry`, `upsertDailyPrice` 멱등, `getSourceIds`, `sanityCheck`).
   - EN/yuyu 스크립트를 `run(opts): Promise<SyncResult>` 함수로 리팩터(단독 실행도 유지 — `process.argv[1]` 가드).
   - `scripts/sync-prices-all.ts`: 출처별 run() 순차 실행 + 치명실패(ok=false) 시 지수백오프 재시도(기본 2회) + sanity 경고 + 요약표 + 종료코드(실패 시 1). `npm run sync:prices:all [-- --only=en|jp-yuyu] [--en-limit=N] [--retries=N]`
   - 설계의도(사용자 결정): LLM 함대/cron 안 씀. 깨지면 로그 남기고 사람이 터미널 보고 대응. sanityCheck 가 "파싱0건/전부unmatched" 같은 조용한 실패를 경고로 표면화.
   - 검증: `--only=jp-yuyu`(m05 written=169, sv02a dup, 멱등), `--only=en --en-limit=2`(dup=331 멱등), 단독 에러경로(SET_MAP 미존재→errors=1), 시세파일 tsc 에러 0.
   - **새 출처 추가법**: 해당 스크립트에 `run()` 만들고 `sync-prices-all.ts` 의 `ALL_JOBS` 에 `{key,label,run}` 한 줄 추가.
6. MarketStat 야간 집계 + 교차검증 로직 + KRW 환산
7. price-collector 에이전트 (Layer 2: JP snkrdunk Playwright 등 비정형)

### 구현 메모 (엔티티 매핑 — 확정 키)
- **EN**: `CardLocale.id === pokemontcg.io card id` (예 sv3pt5-1) → 직접 1:1. 세트벌크 `getCardsBySet`.
- **JP**: `CardLocale.setId + number` (region=JP). Set.code(jp 팩코드 sv2a 등) 역조회.
- **KR(해외 eBay)**: 한국어 키워드+세트+번호로 검색 후 CardLocale 매칭, ExternalIdMapping 캐시.
- pokemontcg.io 가격 구조: `card.tcgplayer.prices[variant].{low,mid,high,market}` + `card.cardmarket.prices.{averageSellPrice,trendPrice,avg7,avg30}` (※ `card.prices` 아님 — 초기 오인 수정함).
- 멱등 규칙: 하루 1행/출처(`recordedAt >= UTC自정`), 있으면 update.

## 남은 결정
- 법적 표 ⚠️ 항목 최종 확정 (특히 magi 약관, 디시)
- 엔티티 해소 자동매칭 임계값
- MEGA/신팩 등 pokemontcg.io 미수록분 → JP(tcgcsv)·매입가로만 채울지
