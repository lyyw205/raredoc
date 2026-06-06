# 메타 수집 파이프라인 설계 — Limitless TCG 기반

작성일: 2026-06-01 · 상태: 설계(미구현)

## 0. 목적

현재 메타 페이지(`/cardgame`)의 추천덱 지표 **사용률·CL우승·평균등수**는 전부 손으로 박은 목업.
Limitless TCG 공식 API로 **실제 대회 결과를 주기 수집 → 집계로 도출**한다.

---

## 1. 데이터 소스 (실측 2026-06-01)

### Limitless TCG API (`play.limitlesstcg.com/api`)
- **인증 불필요** (`/decks` 집계 엔드포인트만 키 필요 — 우리는 자체 집계해서 우회)
- **Rate limit: 50 req / 5분** (응답 헤더 `ratelimit: "50-in-5min"; r=44` 로 잔량 확인)
- CORS 개방, 공식 문서 `docs.limitlesstcg.com/developer.html`

#### 엔드포인트
| 엔드포인트 | 반환 |
|---|---|
| `GET /api/tournaments?game=PTCG&limit=N` | 대회 목록: `{id, name, date, format, players, organizerId}` |
| `GET /api/tournaments/{id}/standings` | 선수별: `{placing, name, player, country, record{wins,losses,ties}, deck{id,name,icons[]}, decklist{pokemon,trainer,energy}, drop}` |

#### 핵심: 아키타입이 이미 식별됨
```json
"deck": { "id": "rockets-honchkrow", "name": "Rocket's Honchkrow",
          "icons": ["honchkrow", "porygon2"] }
```
→ **데클리스트로 덱 분류하는 로직 불필요.** Limitless `deck.id` 를 정본 키로 사용.
→ `deck.icons` 는 대표 포켓몬(히어로 카드) 썸네일 매핑에 사용.

#### 한계
- Limitless는 **국제(주로 영문권) 대회 위주** — 일본 시티리그/CL 커버리지 약함
- 일본 메타는 후속(`ポケカ飯` 스크랩)으로 보강. 이 설계 범위 밖.

---

## 2. 스키마 변경

### 2.1 신규: `TournamentStanding` (대회별 입상 1행)
```prisma
model TournamentStanding {
  id           String   @id @default(cuid())
  tournamentId String
  tournament   Tournament @relation(fields: [tournamentId], references: [id], onDelete: Cascade)
  placing      Int
  playerName   String
  country      String?           // standings.country (US/JP/KR...)
  deckKey      String            // Limitless deck.id (정본 아키타입 키) — null 가능(미제출)
  deckName     String?           // Limitless deck.name (영문 원문)
  wins         Int      @default(0)
  losses       Int      @default(0)
  ties         Int      @default(0)
  decklist     Json?             // 원본 데클리스트 보존(선택) — 카드별 분석/검증용
  createdAt    DateTime @default(now())

  @@unique([tournamentId, placing])
  @@index([deckKey])
  @@index([tournamentId])
}
```

### 2.2 변경: `Tournament` (Limitless 식별자 + 동기화 메타)
```prisma
model Tournament {
  id                String   @id              // = "lim-{limitlessId}"
  limitlessId       String?  @unique          // 신규: 원본 API id
  nameKo            String
  name              String?                   // 신규: 원문(영문) 대회명
  date              DateTime
  region            String                    // 파생: 참가자 country 최빈값 (JP/US/KR/INTL)
  format            String                    // STANDARD/EXPANDED (API format 매핑)
  players           Int
  winnerArchetypeId String?                   // = 1위 standing 의 deckKey
  status            String                    // upcoming/completed
  standings         TournamentStanding[]      // 신규 관계
  syncedAt          DateTime?                 // 신규: 마지막 standings 동기화 시각
  createdAt         DateTime @default(now())

  @@index([date])
  @@index([region])
}
```

### 2.3 변경: `DeckArchetype` (Limitless 키 연결 + 지역)
```prisma
model DeckArchetype {
  id          String  @id                     // = Limitless deck.id (예: "rockets-honchkrow")
  nameKo      String                          // 한글명 — 수동/사전 매핑(편집 자산)
  nameEn      String?                         // 신규: Limitless deck.name 원문
  iconKeys    String[]                        // 신규: deck.icons (히어로 카드 식별)
  region      String  @default("INTL")        // 신규: 지역별 메타 분리 (집계 단위)
  tier        String                          // 파생: usageRate 임계값 → S/A/B/C
  regulation  String                          // format 매핑(스탠다드/익스텐디드)
  usageRate   Float   @default(0)             // 집계: 채용수 / 전체 standings
  winCount    Int     @default(0)             // 집계: placing==1 횟수
  avgRank     Float   @default(0)             // 집계: 평균 placing
  sampleSize  Int     @default(0)             // 신규: 집계 표본 수(신뢰도 표시용)
  description String  @default("")            // 편집 자산(LLM/수동)
  strengths   String[]                        // 편집 자산
  weaknesses  String[]                        // 편집 자산
  counters    String[]                        // 편집 자산
  cards       DeckCard[]
  variants    DeckVariant[]
  trends      ArchetypeTrend[]
  updatedAt   DateTime @updatedAt

  @@index([tier])
  @@index([region])
}
```
**중요**: `usageRate/winCount/avgRank/tier/sampleSize` = 집계로 덮어씀(파생).
`nameKo/description/strengths/weaknesses/counters` = 사람/LLM이 채우는 **편집 자산**(집계가 안 건드림).

### 2.4 `ArchetypeTrend` (주차별 추이 — 기존 활용)
```prisma
model ArchetypeTrend {
  id          String @id @default(cuid())
  archetypeId String
  region      String @default("INTL")   // 신규: 지역별 추이
  week        String                     // ISO week "2026-W22"
  usage       Float
  @@unique([archetypeId, region, week])
}
```

---

## 3. 파이프라인 (2단계 스크립트)

### 3.1 수집: `scripts/sync-tournaments-limitless.ts`
```
입력: --since=YYYY-MM-DD (기본: 마지막 syncedAt 이후) --format=STANDARD --limit=N
흐름:
  1. GET /tournaments?game=PTCG&limit=...  → 날짜/포맷 필터링
  2. 이미 동기화된(limitlessId 존재 + syncedAt 최근) 대회는 skip (멱등)
  3. 각 신규 대회마다 GET /tournaments/{id}/standings
     - rate limit: 응답 헤더 r(잔량) 확인, r<5 면 대기. 기본 간격 7s/req (50/5min 여유)
     - WSL fetch 불안정 → curl + execFile
  4. upsert:
     - Tournament (region = country 최빈값, winnerArchetypeId = placing1.deck.id)
     - TournamentStanding[] (placing 별)
  5. syncedAt 갱신
출력: 대회 N건 / standings M건 / skip / rate-limit 대기 횟수
```

### 3.2 집계: `scripts/aggregate-meta.ts`
```
입력: --window=30 (롤링 일수) --region=ALL|INTL|JP|KR --regulation=스탠다드
흐름:
  1. window 내 TournamentStanding 조회 (region 필터)
  2. deckKey 별 group:
     - usageRate = count(deckKey) / count(전체 standings) * 100
     - winCount  = count(placing==1)
     - avgRank   = avg(placing)
     - sampleSize= count
  3. tier 파생: usageRate >= 15 → S, >=8 → A, >=3 → B, else C
       (임계값은 상수, 추후 조정)
  4. DeckArchetype upsert (집계 필드만; 편집 자산 보존)
     - nameKo 미존재 시 nameEn 으로 임시 채우고 미번역 로그 → 수동 보완 큐
     - iconKeys = deck.icons
  5. ArchetypeTrend upsert (이번 주 ISO week, region 별 usage)
출력: 아키타입 N개 / region별 표본수 / 미번역 덱 목록
```

### 3.3 한글명 매핑 — `src/lib/cardgame/archetype-ko.ts`
- Limitless `deck.id` → 한글명 사전 (예: `rockets-honchkrow` → "로켓단의 돈크로우")
- 신규 덱은 집계 시 미번역 로그 → 수동 추가. 미번역이면 `nameEn` 노출 폴백.

---

## 4. 지역(region) 처리

아까 뺀 지역 필터를 **실데이터로 부활** 가능:
- standings.country 최빈값 → Tournament.region
- `JP` 다수 → 일본 메타, `US/EU` → INTL, `KR` → 한국
- 단 Limitless는 JP 대회 표본이 적음 → 초기엔 `INTL` 위주, JP는 후속(ポケカ飯) 합산 시 의미 생김
- **권장 초기 UI**: region 필터는 표본 충분한 region만 노출 (sampleSize 임계값)

---

## 5. 스케줄링
- 수집 → 집계 순서로 1일 1회 (대회는 주말 집중 → 주 2~3회면 충분)
- Vercel Cron (`vercel.ts` crons) 또는 외부 cron → `npm run sync:meta && npm run aggregate:meta`
- Rate limit 50/5min 이라 대회 수백 건도 분 단위로 완주

---

## 6. 편집 자산 vs 파생 데이터 (경계 명확히)

| 필드 | 출처 | 갱신 주체 |
|---|---|---|
| usageRate, winCount, avgRank, tier, sampleSize | Limitless 집계 | 자동(파생) |
| iconKeys, nameEn, region | Limitless | 자동 |
| nameKo | 사전 매핑 | 수동/사전 |
| description, strengths, weaknesses, counters | 에디토리얼 | 수동/LLM |
| heroCardIds (DeckCard) | decklist → CardLocale 매칭 | 반자동(후속) |

---

## 7. 구현 순서 (제안)
1. 스키마 마이그(`TournamentStanding` 신규 + `Tournament`/`DeckArchetype`/`ArchetypeTrend` 컬럼 추가) → `prisma db push`
2. `sync-tournaments-limitless.ts` (수집) + smoke test (대회 5건)
3. `aggregate-meta.ts` (집계) + 검증 (목업 5행 → 실데이터 N행)
4. `archetype-ko.ts` 한글 사전 (상위 사용률 덱부터)
5. 메타 페이지 연결 — 집계값 표시 + sampleSize 신뢰도 + region 필터(표본 충분 시)
6. (후속) ポケカ飯 일본 메타 합산 / decklist→히어로카드 매칭

## 7.5 기능 → 페이지 배치 (확정: #1,2,3,4,5,7,8,9,10,11,12,13,14,16,17,20,23,25)

카드게임 탭 구조: 🏆메타 / 🃏카드 / 📕덱 / 🎮대회 / 📖가이드.
기존 페이지 골격을 재활용해 **실데이터로 채우고** 신규 기능을 더한다.

### 🏆 메타 탭 (`MetaPageView`) — 전체 현황 대시보드
| 기능 | 섹션 | 데이터 |
|---|---|---|
| #23 **해외 뜨는 덱 미리보기** | 최상단 히어로 | 최근 14일 사용률 급상승 덱 3~5개 (한국 유저 핵심) |
| #2 **티어표 S/A/B/C** | 티어 그리드 | usageRate 임계값 파생 |
| #1 **인기덱 랭킹** | 사용률 바 차트 | deck.id 빈도 |
| #5 **메타 집중도** | 요약 카드 | "상위 5덱이 N% 점유 · 덱 M종" |
| #3 **사용률 추이** | 라인 차트 | ArchetypeTrend 주차별 |
| #4 **급상승/급하락** | ▲▼ 리스트 | 주간 usage 델타 |
| #20 **메타 필수 카드** | 카드 칩 | 전역 카드 채용률 top (decklist 집계) |
| #25 **신팩 메타덱** | 배너 | 최신 set 카드 포함 입상덱 |

### 📕 덱 리스트 탭 (`DecksPageView`) — 정렬/필터 테이블
기존 정렬(usage/winCount) + 필터(tier/regulation) 에 컬럼·뱃지 확장:
| 기능 | 형태 |
|---|---|
| #1 사용률 / #7 **승률** / #8 **입상률** / #11 **안정성** | 정렬 가능 컬럼 |
| #2 티어 | 필터 |
| #9 **언더독** (사용률↓+승률↑) | 🌱 뱃지 + 필터 |
| #10 **인기 함정** (사용률↑+승률→) | ⚠️ 뱃지 |
| sampleSize | 신뢰도 표시 (표본 부족 회색) |

### 📕 덱 상세 (`DeckDetailView`)
| 기능 | 섹션 |
|---|---|
| #7,8,11 성과 지표 | 헤더 스탯 (승률/입상률/평균등수/안정성) |
| #16 **표준 레시피** (평균 60장) | "덱 리스트" 섹션 — 카드별 평균 채용 수 |
| #17 **코어/테크 카드** | 레시피 내 100%=코어 / 30~70%=테크 뱃지 |
| #13 **유리/불리 상대 Top3** | "상성" 신규 섹션 — pairings 승률 |
| #14 **메타 카운터 여부** | 헤더 뱃지 ("상위덱 종합 우세") |
| (기존) 우승 사례 | 실데이터 — 이 덱으로 입상한 대회/선수 |

### 🎮 대회 탭 (`TournamentsPageView`)
| 기능 | 형태 |
|---|---|
| **대회 리스트** (기존 골격) | 카드: 날짜·대회명·포맷·지역·인원·우승덱 — 월별 그룹 |
| **최근 우승덱** | 각 대회 1위 standing → 우승덱 칩 |
| **대회 상세** (신규 `/tournaments/[id]`) | 순위별 standings: placing·선수·덱·전적(W-L-T) |
| #12 **상성 매트릭스 전체** | 탭 하단 or 메타탭 — 덱 vs 덱 승률 그리드 |

### 대회 리스트에 넣을 데이터 (정리)
대회 카드 1건당 표시 필드:
```
date(개최일) · name(한글명+원문) · format(스탠다드/익스텐디드)
region(country 최빈값 국기) · players(인원) · platform(온/오프라인)
winnerDeck(1위 deck.id→한글명+아이콘) · top8(상위 8덱 미니 아이콘)
```
대회 상세(클릭 시): standings 전체 — `순위 | 선수 | 덱(아이콘+한글) | 전적 | 데클보기`

---

## 7.6 수집 스케줄 (확정: 1일 1회)

실측: 새 대회 평균 1.6시간/건, 주말 폭증(금토일 18~23건/일), 평균 45명.

| 항목 | 값 |
|---|---|
| **수집 주기** | **1일 1회** (Vercel Cron, 예: 매일 09:00 KST) |
| 집계 윈도우 | **롤링 14일** (≈200대회 표본) |
| 대회 필터 | players ≥ 32 (소규모 온라인 노이즈 제외) |
| 순서 | `sync-tournaments-limitless` → `aggregate-meta` |
| Rate limit 여유 | 일 신규 ~15대회 × standings 1콜 = 15콜 ≪ 50/5분 |

cron 정의(`vercel.ts`):
```ts
crons: [{ path: "/api/cron/sync-meta", schedule: "0 0 * * *" }] // 매일 00:00 UTC = 09:00 KST
```
→ API route가 두 스크립트 로직 순차 실행.

---

## 8. 미해결/결정 필요
- **format 매핑**: Limitless `STANDARD/EXPANDED` → 우리 `스탠다드/익스텐디드/殿堂`. 殿堂은 Limitless에 없음(일본 전용) → INTL 메타엔 殿堂 탭 비움 or 숨김.
- **tier 임계값**: 15/8/3% 는 초안. 실표본 보고 조정.
- **region 노출 기준**: sampleSize 최소 몇 개부터 신뢰? (예: 50 미만이면 "표본 부족" 표시)
- **대회 범위**: 모든 Limitless 대회 vs 일정 규모(players>=32) 이상만? 소규모 온라인 대회가 노이즈일 수 있음.
