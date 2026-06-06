# 카드게임 페이지 전면 개편 계획 — 전 탭 · 전 섹션

작성일: 2026-06-06 · 상태: 설계(승인 대기) · 선행: `docs/meta-pipeline-multisource.md` (P0~P3·P5 구현 완료)
근거: 18개 사이트 UX 벤치마크(워크플로우 wf_0057997d) + 구현 사실확인 3종(wf_88722ea8 — 시세/UI자산/데이터 준비도 전수 실측)

---

## 0. 설계 원칙 (벤치마크 도출)

1. **모든 %에 원시 표본 병기** — "12.9% (341)". 표본 없는 숫자 금지
2. **신선도·기준 선언** — 갱신 시각·표본·기간·산정 방식을 화면에 명시 (시장 전체가 산식을 숨기는 것이 역설적 차별 기회)
3. **레시피는 3계층** — 핵심 카드(최빈+채용률) → 평균 → 실제 입상 리스트. 대표 1개를 사이트가 선정하지 않음
4. **저표본은 숨기지 말고 규칙으로** — 표본 컷·"—" 티어·회색 처리 + 사유 문구
5. **읽기→실행 전환** — 덱코드 복사·견적·리스트 보기가 모든 덱 노출의 종착 버튼

---

## 1. IA 맵

```
/cardgame (사이드바 6탭 유지)
├─ 🏆 메타 ("")            [🌍|🇯🇵|🇰🇷] 탭 (✅ 구현됨)
├─ 🃏 카드 (/cards)
├─ 📕 덱 (/decks) ─── 덱 상세 (/decks/[id]) ──┐
├─ 🎮 대회 (/tournaments) ─ 대회 상세 ────────┼─ 🆕 리스트 뷰어 (/lists/[standingId])
├─ ⚔️ 🆕 상성 (/matchups)   ← 메타 탭 카드에서 진입 (사이드바 추가는 선택)
├─ 📖 가이드 (/guide)
└─ 💬 커뮤니티 (별도 작업 진행 중 — 본 계획 범위 외)

정리: /cardgame/sets·sets/[id] 는 /dex redirect 잔재 — 삭제 (IA-cleanup)
```

---

## 2. 공통 인프라 (신규 빌딩블록 6)

### I1. 덱 견적 엔진 `src/lib/services/deck-pricing.ts` ★핵심
시세 사실확인(2026-06-06) 반영 의사코드:

```
입력: archetypeId, region="INTL", mode ∈ {budget(저레어) | premium(고레어)}
① recipe(region) 로드 → cardName 그룹핑: 수량 = round(Σ avgCount) (행별 합산, 상한 4 — 에너지 제외)
   ⚠ 레시피는 인쇄판별 행(드래펄트 151행≠60장) — dedupe 없이는 255장 견적이 나옴
   ⚠ 그룹핑 키 = cardName 단독: Limitless 의미론(decklist name = 게임 텍스트 단위, 같은 name+다른
     set = 재록)에 의존 — P1 이름검증 100% 가 이 가정을 뒷받침. 단 그룹 내 supertype 혼재 시 분리(가드)
   ⚠ logicalCardId null 행(INTL 9.2% — 에너지·CRI 등): cardName+setCode+number→CardLocale 직조인
     폴백, 그래도 없으면 missing 목록행
② 이름당 인쇄판 후보 = 행들의 logicalCardId + **EN명 역추적 확장**(orphan LC 가격 분열 흡수
   — SWSH 병합 LC 의 EN locale 가격이 lc-orphan-* 에 고립된 실측 사례)
③ 인쇄판 서열 = LogicalCard.rarity.category.tier (null 24% → 0=저레어 취급)
   budget: tier 최소 / premium: tier 최대 인쇄판
④ 가격 = 그 LC 전 locale 의 Price 중:
   - 소스 in (yuyu_tei_sell, tcgplayer, cardmarket), condition null 만
   - (locale,source)당 최신 1행 (recordedAt desc — 시계열 1~3행 누적 실측)
   - 행 내 폴백: marketPrice ?? holofoil ?? normal ?? reverseHolo ?? firstEdition
   - 환산: toKrw(v, currency) — src/lib/trades/shared.ts 상수(USD 1400/JPY 9/EUR 1500)
   - 소스 우선순위: 1차 출시에선 JP(yuyu) 우선 표기 + EN 병기 (PriceSource.priority 재정의 금지
     — 카드 상세와 정책 충돌 방지, 견적 엔진 내부 상수로)
⑤ 가격 없는 인쇄판 → 같은 이름 차선 인쇄판 폴백 / 기본 에너지(logicalCardId null) → 장당 고정
   단가 상수(정책: 200원, UI 에 "에너지 추정" 주석)
출력: { totalKrw, byCurrency:{jpy,usd}, pricedCount, totalCount, lines[], missing[] }
   → 캐시: **deckCostBudget / deckCostPremium 2필드**(스키마 변경 — 기존 deckCostKrw 는 budget 별칭
     역할로 대체·제거). 토글은 프리캐시 2값 스왑 — 클릭 시 서버 재계산 없음(쿼리 폭발 방지)
재사용: getCardPrices(getCardPrices.ts:28) 폴백 패턴, pickPriceKrw(market.ts:35) 환산
정확도 가드: missing 에 레어도 tier≥6 카드가 있으면 견적에 "±변동 큼" 라벨 의무(고가 누락 기만 방지)
```
**UI 표기 의무**: "기준: 遊々亭 판매가+TCGplayer · 5/31 · 53/60장 집계 — 실구매가와 다를 수 있음".
KR(번개장터) 시세 수집기 가동 시 한국가가 메인으로 승격(시세 파이프라인 과제, 본 계획 외부 의존).

### I2. 아키타입 아이콘 파이프라인
- `iconKeys`("dragapult" 슬러그) → dex#: **빌드타임 정적 JSON** `src/data/pokemon-slug-dex.json`
  (`scripts/refresh-pokeapi-names.ts` 흐름에 생성 추가 — pokeapi-names.ts 의 node:fs 로더를 RSC 에서 직접 쓰지 않음)
- 이미지: PokeAPI official-artwork(`sprites/pokemon/other/official-artwork/{dex}.png`)를 **R2 백필**
  (`scripts/backfill-archetype-icons.ts`, 세트로고 R2 전례) → `<DeckIcon keys={iconKeys}/>` 컴포넌트
- 적용처: 메타 티어보드·랭킹, 덱 테이블, 대회 카드 우승덱, RegionMetaView — 전 화면 공통

### I3. 공용 카드 썸네일 `<CardThumb/>`
cardgame/cards 의 CardGridItem(page.tsx:152-198) 패턴 추출 — aspect-[5/7], raw `<img>` lazy, 폴백 placeholder.
적용처: 핵심 카드 그리드·리스트 뷰어·레시피·가이드.

### I4. 신선도 헤더 `<FreshnessBar/>`
"갱신 N시간 전 · 대회 N건 · 입상 N건 · 기간 ___" — Tournament.syncedAt max + 집계 카운트.
메타/덱/상성 페이지 공통.

### I5. 티어표 이미지 공유 (2차)
의존성 신규 설치 필요(html-to-image — 현재 레포에 없음 실측). 티어보드 DOM → PNG 다운로드 버튼.

### I6. 리스트 뷰어 데이터 `getStandingDecklist(standingId)`
decklist JSON(93.3% 보유) + logicalCardId → CardLocale 이미지/가격 resolve.
**선행 D2 필수** (limitless-play 분 해석률 15.8% 실측 — 백필 누락 상태).

---

## 3. 데이터 보강 선행 작업 (UI 차수 전 게이트)

| # | 작업 | 내용 | 근거(실측) | 규모 |
|---|---|---|---|---|
| D1 | **시세 커버리지 확장** | ①yuyu SET_MAP 에 TWM·DRI·SV6~11·me 시리즈 추가 수집 ②2026 EN 신세트(me2pt5/me3/me4) tcgplayer 수집 ③견적 엔진의 EN명 역추적(②로도 안 잡히는 orphan 분열 흡수) | 드래펄트 코어 71장 중 EN 41·JP 17만 견적 가능 — 60장 완성 불가 | **L**(세트당 코드 역설계+매칭 검증 — M 은 과소추정, 적대검증 지적 반영) |
| D2 | **decklist logicalCardId 백필 재실행** | 범위 명시: (a) TournamentStanding.decklist JSON 내 logicalCardId — limitless-play 분 15.8%→(sync 25대회분 미백필 해소) (b) DeckRecipeCard.logicalCardId 는 P1 에서 90.8% 기완료(신규 집계분만 자동) — 둘 다 backfill-recipe-logical --decklists 가 커버, **meta:weekly 체인 말미에 정례화**. deckSource null 602행 백필 | limitless-play 해석률 15.8% 실측, set/number 직조인 시 78~96% 매칭 확인 | S |
| D3 | **변형(variant) 분류** | decklist 파트너 포켓몬 감지로 재분류(예: 드래펄트+야느와르몽). archetypeRaw(lw 398행)는 정답지로 활용. deckIcons 는 변형 구분 불가(실측 — 수집기간 채움차이일 뿐) | 추가 수집 불필요 판정. P4 분류기와 동근 — 같은 모듈로 | M(P4 연계) |
| D4 | **편집자산 시드** | 상위 10덱 description/strengths/weaknesses 초안(수동+LLM, 일본식 해설 문법 참조) + 미번역 17종 사전 | 84덱 전부 description="" — 덱 상세 §3 이 조건부 숨김 중 | S |
| D5 | 견적 캐시 | deckCostKrw 배치 갱신 스크립트(I1 산출) — meta:weekly 말미 | 84덱 전부 null | S |

---

## 4. 탭별 섹션 설계

표 범례 — ✅현행 유지 / 🔧개보수 / 🆕신규. "의존"은 §2 인프라·§3 보강 번호.

### 4-1. 🏆 메타 탭 (`page.tsx` + `MetaPageView` + `RegionMetaView`)

| 순서 | 섹션 | 상태 | 내용 | 데이터 | 의존 |
|---|---|---|---|---|---|
| 0 | 신선도 헤더 | 🆕 | FreshnessBar + 티어 산정 한 줄("사용률 15/8/3%, 표본<30 보류") | syncedAt·집계 카운트 | I4 |
| 1 | 급상승 히어로 | 🔧 | 현행 + DeckIcon 아이콘 (추이 2주차부터 자동 활성 — W24 이후, 현재 1주차 실측) | getRisingDecks | I2 |
| 2 | 티어보드 | 🔧 | 현행 + DeckIcon + 🆕 [이미지 저장] 버튼(2차) | getArchetypes | I2·I5 |
| 3 | 메타 집중도 | 🆕 | "상위 5덱 N% 점유 · 총 N덱 · HHI" 요약 카드 (#5) | getArchetypes 파생 | — |
| 4 | 사용률 추이 | ✅ | 현행 recharts (주차 누적 자연 해소) | getArchetypeTrends | — |
| 5 | 급상승/급하락 | ✅ | 현행 | getRisingDecks | — |
| 6 | ⚔️ 상성 바로가기 | 🆕 | /matchups 진입 카드 ("덱 vs 덱 상성표" + 미니 프리뷰) | — | 4-6 |
| 7 | 메타 필수 카드 | 🔧 | placeholder 해소 — getCardAdoption 상위 8~12 카드 썸네일 칩 (835종 가용 실측) | getCardAdoption | I3 |
| 8 | 신팩 메타덱 | 🔧 | placeholder 해소 — 최신 발매 세트 카드 포함 입상덱 (#25) | recipe×Set.releaseDate | — |
| — | JP/KR 탭 | ✅ | RegionMetaView 현행(usage 리스트) + DeckIcon. JP 는 P4 데이터 유입까지 빈상태 유지 | RegionStat | I2 |

### 4-2. 🃏 카드 탭 (`cards/page.tsx`)

| 섹션 | 상태 | 내용 | 의존 |
|---|---|---|---|
| 필터/그리드 | ✅ | 현행 (채용률 정렬 가동 중 — 835종 실측) | — |
| 채용 배지 | 🔧 | "N덱 채용 · 평균 N%" 배지를 그리드 아이템에 (현행 오버레이 강화) | — |
| 전역 카드 상세 연동 | 🆕 | `/cards/[cardId]` 에 "이 카드를 쓰는 덱" 섹션 — 시세 섹션(page.tsx:555) 앞 형제 section. logicalCardId→recipe 역조회, 덱별 채용률·region | — |

### 4-3. 📕 덱 탭 (`DecksPageView`)

| 섹션 | 상태 | 내용 | 의존 |
|---|---|---|---|
| 필터바 | 🔧 | 현행 + 🆕 언더독 필터 토글(#9 잔여) + 🆕 variant 분리 토글(D3 후) | D3 |
| 덱 테이블 | 🔧 | 현행 컬럼 + DeckIcon 열 + 🆕 💰가격 열(budget 기준, 정렬 가능 — "싸고 센 덱" 발견) | I1·I2·D5 |

### 4-4. 📕 덱 상세 (`DeckDetailView`) ★최대 개편

| 순서 | 섹션 | 상태 | 내용 | 의존 |
|---|---|---|---|---|
| 1 | 헤더 | 🔧 | 현행 6지표 + DeckIcon + 🆕 **💰견적 위젯**: "약 N만원 [저레어↔고레어]" + 기준 캡션(출처·날짜·집계 N/60) + 미집계 카드 목록 접기 | I1·I2·D1 |
| 2 | 핵심 카드 | 🆕 | CardThumb 그리드 6~10장, "4장 · 99%" 뱃지 (recipe 채용률≥90 코어 + hero) | I3 |
| 3 | 표준 레시피 | 🔧 | 현행 텍스트 행 → CardThumb 소형 + 카드별 가격 컬럼 + 카드 상세 링크 | I1·I3 |
| 4 | 상성 | 🔧 | 현행 Top3 + 🆕 전체 보기 링크(/matchups?deck=) + 표본 표기 강화(games·W-L-T 병기) | 4-6 |
| 5 | 지역 비교 | 🆕 | 글로벌/🇰🇷 RegionStat 나란히 — **동질 지표만**(입상률·평균등수·표본. usageRate 는 분모 상이 — 리스크 P2-5) | — |
| 6 | 플레이 가이드 | 🔧 | 현행 조건부(현재 전부 숨김 — 편집자산 0% 실측) → D4 시드 후 상위 10덱부터 표시 | D4 |
| 7 | 최근 입상 리스트 | 🆕 | 타임라인: 날짜·대회·순위·선수·[리스트 보기→뷰어]. 우승 사례 섹션(현행 §4)을 이것으로 흡수 통합 | I6 |

### 4-5. 🆕 리스트 뷰어 (`/cardgame/lists/[standingId]`)

| 순서 | 섹션 | 내용 | 의존 |
|---|---|---|---|
| 1 | 컨텍스트 헤더 | "대회명 N위 · 선수 · 덱명(링크)" + 출처 | — |
| 2 | 60장 그리드 | CardThumb — 포켓몬/트레이너/에너지 구분, 장수 뱃지 | I3·D2 |
| 3 | 액션바 | 💰합계(이 리스트 그대로의 인쇄판 기준) · [📋 덱코드 복사](KR 보유 시) · [원본↗] | I1 |
| — | 미해석 카드 | "이미지 미연결 N장" 텍스트 폴백 행 (숨기지 않음 — 원칙 4) | — |

### 4-6. 🆕 ⚔️ 상성 페이지 (`/cardgame/matchups`)

표본 실측(games 1-4 가 78%, ≥10 은 102쌍) 반영 — **2단 구성**:

| 순서 | 섹션 | 내용 |
|---|---|---|
| 1 | 상위 매트릭스 | 사용률 상위 **8덱** 8×8 (DeckIcon 축) — 셀: 승률+표본 윗첨자, games<10 회색, <5 "·" | 
| 2 | 덱별 전체 리스트 | 덱 셀렉터 → 1차원 리스트(Limitless Labs 식): 상대·games·W-L-T·승률 — 전 쌍 노출 |
| 3 | 산식 푸터 | **"무승부=⅓승 · limitless-play pairings 집계 · 표본 N게임 미만 회색 · 갱신 N시간 전"** — 전 세계 메타 사이트가 안 쓰는 한 줄(차별점) |

### 4-7. 🎮 대회 탭 + 상세

| 섹션 | 상태 | 내용 | 의존 |
|---|---|---|---|
| 목록 | 🔧 | 현행(level 필터) + 카드에 우승덱 DeckIcon + Top8 미니 아이콘 행 | I2 |
| 상세 순위표 | 🔧 | 현행(CAP 128) + 🆕 [리스트 보기] 버튼 → 뷰어 (decklist 보유 행만) | I6 |
| 상세 메타게임 | 🆕 | 이 대회의 덱 분포 미니 섹션 (play.limitless metagame 페이지 벤치마크) — standings deckKey 집계 인라인 | — |
| 데클리스트 placeholder | 🔧 | 제거 — [리스트 보기]로 대체 | — |

### 4-8. 📖 가이드 탭 (3차 — 저우선)

| 섹션 | 상태 | 내용 |
|---|---|---|
| 입문 스타터 덱 | 🔧 | 하드코딩 mock 3덱(실측) → 실데이터 저가 견적 덱 3종(견적 엔진 budget 정렬 재사용) |
| 룰·재정/용어집 | ✅ | 현행 DB(10+19행) — 콘텐츠 보강은 별도 운영 과제 |
| FAQ | 🔧 | 하드코딩 유지 + 디시 반복질문 3종 추가(입문 타이밍/옛 카드 가치·레귤레이션/카운터 찾기) |
| 레귤레이션 체크 | 🆕(3차) | "이 카드 스탠다드에서 쓸 수 있나" — 카드 검색→regMark 판정 위젯 (한국 외부 유입 1위 질문 실측) |

---

## 5. 구현 차수

### UI-1a차 — "덱 상세 골격 + 잠자는 데이터 개방" (견적 비의존 — D1 지연 시 퇴로)
> 선행: D2(백필) + I2·I3 만
1. 덱 상세 개편: 핵심 카드 그리드 / 레시피 카드 이미지 / 입상 타임라인 (견적 위젯 자리는 현행 "준비 중" 유지)
2. 리스트 뷰어 신설 + 대회 상세 [리스트 보기]
3. 아키타입 아이콘 전 화면 적용

**게이트**: 리스트 뷰어 이미지 해석률 ≥90%(D2 후) · 기존 6개 뷰 스모크 체크리스트 통과
(각 뷰: ①렌더 에러 0 ②주요 데이터 섹션 비어있지 않음 — Meta/Decks/DeckDetail/Tournaments/상세/cards)

### UI-1b차 — "견적 출시" (D1 완료 후 — 1a 와 병렬 준비 가능)
> 선행: D1(시세 L) + I1 + 스키마(deckCostBudget/Premium)
1. 견적 엔진 + 덱 상세 헤더 견적 위젯 (저레어/고레어 — 프리캐시 2값 스왑)
2. 덱 테이블 💰가격 열

**게이트**: 드래펄트ex 견적 55/60장+ 집계 · 미집계 카드 전건 missing 노출 · 고가 누락 시 "±변동 큼" 라벨 동작

### UI-2차 — "메타 화면 완성 + 상성 개방"
1. 상성 페이지(매트릭스+리스트+산식 푸터) + 덱 상세 §4 연동
   - **착수 전 SQL 게이트**: 상위 8덱 28쌍 중 games≥10 비율 실측 → 50% 미만이면 6덱 축소 또는
     컷 games≥5 완화, 그래도 절반 이상 회색이면 매트릭스 보류·덱별 리스트만 1차 출시(퇴로)
2. 메타 탭: 신선도 헤더·집중도·필수 카드·신팩 메타덱 (placeholder 전소)
3. 카드 상세 역링크 ("이 카드를 쓰는 덱")
4. 티어표 이미지 공유(html-to-image 설치)

**게이트**: 메타 탭 placeholder 0개, 상성 페이지 표본 규칙 동작(회색 처리), 공유 PNG 산출

### UI-3차 — "보강·차별화"
1. variant 토글(D3 — P4 분류기 연계)
2. 지역 비교 스트립 / 언더독 필터 / 대회 메타게임 섹션
3. 가이드 개편(스타터 견적 덱·FAQ·레귤레이션 체크)
4. D4 편집자산 상위 10덱 → 플레이 가이드 표시
5. IA-cleanup: sets/ redirect 잔재 삭제

**외부 의존(차수 무관, 도착 시 편입)**: KR 번개장터 시세(견적 메인 승격) · P4 일본 데이터(JP 탭 활성) · Limitless API 키(D3 분류 정확도)

---

## 6. 리스크·정책 결정 대기

| 항목 | 내용 | 기본값 제안 |
|---|---|---|
| 환율 | shared.ts 상수(USD 1400/JPY 9/EUR 1500) — 갱신 전략 미정 | 1차는 상수 유지 + 견적 캡션에 환율 명시, 추후 일 1회 환율 API |
| 에너지 단가 | logicalCardId null — 견적 처리 | 장당 200원 고정 + "추정" 주석 |
| 견적 면책 | 시세≠실구매가 | 모든 견적에 기준·날짜·집계율 캡션 의무 (원칙 2) |
| 상성 표본 | 전체의 78%가 4게임 이하 | 매트릭스 상위 8덱 한정 + 컷 명시. 표본은 주간 sync 로 자연 증가 |
| 추이 차트 | 현재 1주차 | 코드 변경 없음 — W24(다음 주)부터 자동 활성 |
| deckCostKrw 캐시 신선도 | 시세 일변동 | meta:weekly 말미 배치 갱신 + 헤더 신선도 표기 |
| PokeAPI 아트워크 라이선스 | 종 일러스트 핫링크/미러 | R2 미러 + 출처 표기 (도감 오픈소스 자산 전례 따름) |
| 시점 혼란 | FreshnessBar(대회)·견적 캡션(시세)·캐시(배치)가 서로 다른 시각 | FreshnessBar 는 "대회 데이터 기준" 한정어, 견적은 "시세 기준일" 별도 표기 — 같은 줄에 합치지 않음 |
| i18n | [locale] 라우트(ko/en)인데 신규 문자열 한국어 하드코딩 | 정책 선언: **한국어 우선, 영문 후속(3차 이후)** — 신규 문자열은 가능한 곳에서 메시지 키 추출 |
| 환율 표류 | JPY_KRW=9 상수 | 1차 캡션에 "100엔=900원 고정 환산" 의무 표기, 환율 API 는 2차 이전 도입 또는 월 1회 수동 갱신 |
| 리스트 뷰어 성능 | 60장 × CardLocale/Price 조회 | getStandingDecklist 에 revalidate 캐시(ISR), 가격은 합계만(카드별 가격은 클릭 시) |
| SEO | cardgame 전 라우트 generateMetadata 부재 | 신규 라우트(덱 상세·상성·리스트 뷰어)부터 title/description/og 구현 — 2차 |
| 모바일 매트릭스 | 8×8 가로 초과 | 가로 스크롤+첫 열 고정, 모바일 우선은 덱별 리스트 뷰 |
| 빈 상태/에러 | 신규 섹션(견적·핵심카드·매트릭스) 실패 폴백 | 섹션별 EmptyState + 견적 실패 시 "준비 중" 폴백(에러로 페이지 깨짐 금지) |
