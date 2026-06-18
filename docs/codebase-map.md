<!-- 자동생성: codebase-survey 워크플로(2026-06-17, 9영역 병렬조사+비평+보정). 갱신 시 재실행. -->

# raredoc 코드베이스 구조 맵

raredoc는 한국 사용자를 대상으로 한 **포켓몬 TCG(카드게임) 웹앱**이다. 카드 도감(dex)·시세·콜렉션·마켓플레이스·커뮤니티·메타(cardgame) 기능을 제공하며, 카드 한 장이 일본판/영문판/한국판으로 나뉘어 발매되는 복잡함을 DB 정체성 계층으로 풀어낸 것이 핵심이다. 스택은 **수정된(포크된) Next.js**(App Router, `node_modules/next/dist/docs`가 진실 — 훈련데이터와 다를 수 있음) + **Prisma 7** + **Supabase Postgres** + **R2**(이미지 호스팅) + **next-intl**(ko/en i18n). 규모는 대략 `src` 413 + `scripts` 341(top-level .ts) + `data` ~900파일(19MB+ 덤프) + `docs` 173 + `prisma` 단일 1034줄 스키마(52 model·enum 0). 설계 철학은 **DB-first 렌더**(앱은 DB만 읽고, 외부 인터넷 수집은 전부 `scripts/` 데이터 공장이 단방향으로 DB에 적재)이며, **동결 카드팩 가드**(`scripts/lib/protected-groups.ts`)로 검증 완료된 EN/KR 매칭을 보호한다. 참고: 레포에 **자동화 테스트(*.test/*.spec)는 0건**이다 — 이 사실이 "scripts는 컴파일이 안 잡으니 grep 수동검증 필수" 위험을 크게 키운다.

---

## 한눈에 보는 전체 구조

```
raredoc/
├── src/                       앱 런타임 코드 (DB만 읽음)
│   ├── app/                   ① App Router — 모든 URL 페이지·API·미들웨어
│   │   ├── layout.tsx           최상위 html 셸
│   │   ├── [locale]/            ko/en 분기 아래 홈·dex·cards·cardgame·community 등
│   │   ├── api/                 auth(NextAuth) + cron/daily(일 1회 집계)
│   │   ├── robots.ts·sitemap.ts SEO
│   │   ├── proxy.ts             로케일 미들웨어 (이 포크는 middleware→proxy 명명)
│   │   └── auth.ts             NextAuth 설정 단일출처
│   ├── components/            ② UI 컴포넌트
│   │   ├── toss/                자체 디자인 시스템(프리미티브 42파일, 전역 46곳 소비)
│   │   ├── ui/ (7)             ★shadcn 잔재 — import 0건 추정(검증 필요)
│   │   └── dex·cards·home·...   피처별 폴더 17개 (DexCatalog 1798줄=최대 허브)
│   ├── lib/                   ③ 비즈니스 로직 (서버측)
│   │   ├── actions/             "use server" 진입점(검증+revalidate 얇은 껍데기)
│   │   ├── services/            도메인 로직(DB 집계·계산, 서비스간 결합 0)
│   │   ├── api/                 외부 사이트 클라이언트(pokemontcg.io 등)
│   │   ├── cards/              도감 데이터 파이프라인(인메모리 캐시)
│   │   ├── cardgame/           메타 보조(mock 1178줄 대부분 死 + mockToReal 살아있는 어댑터)
│   │   └── price/              ★미사용 추정 — 死 후보(검증 필요)
│   ├── data/                  ④ 표시용 보조데이터(레거시)
│   │   └── group-*.json (206)   JP+EN+KR 스냅샷 19MB, 174개를 GroupCards가 import
│   ├── i18n/·types/·styles/   ④ 번역·타입보강·디자인토큰(toss.css)
│   └── generated/prisma/      Prisma 클라이언트 자동생성물(.gitignore)
├── scripts/                   ⑥ 데이터 공장 (tsc 제외, tsx 실행, DB에 단방향 쓰기)
│   ├── *.ts (top-level 341)    fix 141·collect 68·sync·fill·seed... (대부분 일회성)
│   ├── lib/                     공용 인프라 20개(protected-groups·trainer-names...)
│   └── migration/              정체성 4계층 ERD 마이그(p0~p8a)
├── data/                      ⑦ 외부 원본덤프 캐시 (scripts가 읽어 DB 적재)
│   ├── jp-official·kr-official  JP/KR 공식 카드 덤프(권위 원본, tracked)
│   ├── en-ptcg·collect·pokedata 진행형 수집물·대회결과(대부분 untracked)
│   ├── pokeapi/                 종 이름 매핑 CSV(도감번호 조인 허브, README 보유)
│   └── tier-lists/              ★앱이 직접 읽는 유일한 data(src/lib/tier.ts)
├── prisma/                    ⑤ DB 설계도
│   ├── schema.prisma            단일 1034줄·52 model·enum 0 (Card=LogicalCard 등 @@map)
│   ├── backups/·*.bak           101MB 덤프 + 스키마 스냅샷(정리 대상)
│   └── migrations/              빈 폴더 (db push 방식 추정)
├── docs/                      ⑧ 문서·작업로그
│   ├── pack-audit/              팩별 점검 로그 100개 + README(파이프라인 허브)
│   ├── design-system/·migration/·verification/·agents/
│   └── (root 31개)             설계문서 + 완료 로그가 평면 혼재
├── public/                   ⑩ Next.js 정적 자산 루트
│   ├── type-icons/             ★런타임 타입아이콘 자산(앱이 직접 서빙 가능성)
│   ├── ads.txt                 광고 인증
│   └── *.svg (5)               next·vercel·globe·window·file (부트스트랩 cruft 후보)
├── designs/                  ⑪ 디자인 소스 (.pen/.png 13 + toss-design-brief.md)
├── .github/workflows/        ⑫ CI — deploy.yml·sync-cards.yml·sync-prices.yml
└── (root) ⑨                   package.json·tsconfig·next.config·AGENTS.md
                               + 스크린샷 jpeg·xlsx·tsbuildinfo (cruft)
```

---

## 데이터 파이프라인 흐름

이 프로젝트의 본질은 **단방향 데이터 공장**이다. 앱은 절대 외부 인터넷을 직접 때리지 않고, `scripts/`가 긁어 DB에 박아둔 것만 읽는다. 중요한 추가 사실: 이 공장 일부는 **GitHub Actions에도 배선**돼 있다 — `sync-cards.yml`이 `npm run seed`+`npm run sync:cards`를, `sync-prices.yml`이 `npm run sync:prices`를 CI에서 호출한다(아카이브 위험이 package.json 너머 CI까지 미침).

```
[외부 공식·보조 출처]
  pokemon-card.com(JP) · pokemonkorea.co.kr(KR) · pokemontcg.io/pokemon.com(EN)
  tcgdex · Limitless · PokeAPI · pokedata.ovh
        │
        │ ⓵ 수집  scripts/collect-*·scrape-*  (collect-pack.ts=제네릭 프레임워크)
        ▼
[data/ 원본덤프 캐시]  ← 웹 403/봇차단 우회용 영구 박제
  jp-official(JP권위) · kr-official(KR권위) · en-ptcg · collect · pokeapi(조인키)
        │
        │ ⓶ 적재  scripts/seed-*·load-*·fill-*·backfill-*  (Prisma upsert)
        │          ↑ npm run seed / sync:cards 는 .github/workflows 에서도 호출됨
        ▼
[prisma DB / Supabase Postgres]  ← 단일 진실원천(SSOT)
  Card(@@map LogicalCard) ─ RegionCard(@@map CardLocale) ─ Set ─ CardPack(@@map SetGroup)
  Rarity · Price · MarketStat · DeckArchetype · Tournament ...
        ▲ │
   ⓷ 교정·검증  scripts/fix-*·merge-*·link-*·verify-*·audit-*
        │ │  (동결팩은 protected-groups.assertWritable() 가 쓰기 차단)
        │ │
        │ │ ⓸ 읽기  src/lib/cards(dex-region·dex-catalog, 인메모리 TTL캐시)
        │ ▼          src/lib/services·actions·api (DB-first)
        │ [src/app 페이지 — 서버컴포넌트]
        │   dex · cards/[cardId] · cardgame · collection · community ...
        │        │ ⓹ props 주입
        │        ▼
        │ [src/components — toss 디자인시스템으로 렌더]
        │
   ⓺ 운영 반복: api/cron/daily → rebuildRankings·rebuildMarketStats
            package.json "meta:weekly" 체인 → 메타 집계
            .github/workflows sync-prices → 시세 갱신 CI
```

핵심 규칙:
- **레어도 표시** = `RegionCard.rarity ?? Card.rarity`. **dex 렌더** = `RegionCard(setId)` 기준 + 게임필드(hp/attacks)는 `Card` 직독.
- **scripts는 tsc 컴파일 제외** → 모델/컬럼 변경 시 `grep` 수동 검증 필수(안 그러면 런타임만 깨짐). **테스트 0건**이라 이 검증을 대신해 줄 안전망이 없다.
- 앱이 `data/`를 직접 읽는 곳은 `data/tier-lists`(via `src/lib/tier.ts`) **단 하나**. 나머지 `data/`는 전부 scripts 경유 오프라인 자산.

---

## 영역별 상세

### ① src/app 라우팅 (App Router·API·미들웨어)
들어온 URL이 어떤 화면을 보일지, 로그인·크론·SEO를 결정하는 곳. ko/en을 `[locale]` 폴더로 분기. 이 포크는 표준 `middleware.ts`가 **부재**하고 `proxy.ts`를 채택했다 — 즉 요청 전처리(로케일 리라이트 등) 진입점이 `src/proxy.ts`이며, App Router 미들웨어 동작을 손볼 땐 이 파일을 봐야 한다.

| 경로 | 역할 |
|---|---|
| `src/app/[locale]/layout.tsx` | 모든 페이지 공통 셸·SEO(canonical/hreflang)·세션 주입 허브 |
| `src/app/[locale]/cards/[cardId]/page.tsx` | 카드 상세 허브(**781줄**, 최대 페이지), revalidate=3600 |
| `src/app/[locale]/cardgame/` | 메타 영역 — 자체 client 레이아웃·사이드바를 가진 "앱 속 미니앱"(21파일, 최대 하위트리) |
| `src/app/[locale]/dex/page.tsx` | 도감 메인, `?region&pack` 딥링크 |
| `src/app/api/cron/daily/route.ts` | 유일한 비-auth API, Bearer 가드 후 랭킹·마켓 재집계 |
| `src/auth.ts`·`src/proxy.ts` | NextAuth 설정 / 로케일 미들웨어(포크명 proxy) |

연결: 페이지(서버컴포넌트) → `src/lib/services·actions` → DB. 보호 페이지는 `getCurrentUser→redirect` 가드 일관. cardgame은 `@/lib/cardgame/mockToReal`에 의존(mock→실데이터 이행 중인 **살아있는 어댑터** — `services/cardgame.ts`·`cardgame/cards/[id]/page.tsx`가 소비).

### ② src/components UI
화면에 그려지는 모든 재사용 컴포넌트. 2층 구조: `toss/`(디자인 시스템) + 피처 폴더 17개.

| 경로 | 역할 |
|---|---|
| `src/components/toss/` (42) | tossinvest.com 재현 디자인 시스템. README+토큰 문서 완비, 전역 46곳 소비. 성숙도 높음 |
| `src/components/dex/DexCatalog.tsx` | **1798줄 최대 컴포넌트**. /dex 도감 전체 로직(가상스크롤·필터·검색·모달·시세) 단일 허브 |
| `src/components/ui/` (7: badge·button·card·select·separator·skeleton·tabs) | ★shadcn 프리미티브 — toss로 대체된 死 레이어 **추정**(전역 import 0건, 삭제 전 build 검증 필요) |
| 그 외 cards·home·community·collection·profile·messages... | 피처별 화면 조립 |

연결: 페이지가 DB 조회 후 props 주입 → 피처 컴포넌트가 `toss/` 프리미티브로 구성. cardgame 큰 뷰는 여기가 아니라 `app/[locale]/cardgame/`에 colocate.

### ③ src/lib 비즈니스 로직
페이지/컴포넌트가 DB·외부API를 직접 안 만지게 모아둔 서버 로직층. `actions`(얇은 진입점) / `services`(DB 로직) / `api`(외부 클라) / `cards`(도감 파이프라인)로 명확히 분리.

| 경로 | 역할 |
|---|---|
| `src/lib/cards/dex-region.ts` (465) | 도감 지역탭(JP/KR/EN) 데이터층 허브, 1h 인메모리 캐시 |
| `src/lib/services/cardgame.ts` (1217) | 메타 영역 최대 서비스(17곳 소비), mock CARDS 폴백 + mockToReal 어댑터 사용 |
| `src/lib/api/pokemontcg.ts` | 메인 외부 클라이언트(카드/세트 fetch·upsert 원천) |
| `src/lib/utils.ts` (35) | 전역 유틸 — 70곳 소비, 최다 |
| `src/lib/trades/shared.ts` | 환율·거래 공용헬퍼(다수 service가 소비, 살아있음) |
| `src/lib/price/` | ★미사용 死 후보(검증 필요) — poketrace/bunjang로 대체된 폐기 초기설계 추정 |

연결: `actions`↔`services` 역할분담 깔끔(중복 거의 없음, services간 결합 0). 도감 표시규칙(`eras`·`rarity`·`card-fields`)은 단일출처 헬퍼로 추출됨.

### ④ src/data·i18n·types·styles·generated
앱이 카드를 그릴 때 쓰는 보조데이터+설정. 핵심 발견: 거대한 `group-*.json`은 **DB-first로 대체 진행 중인 레거시**이나, 여전히 **살아있는 단일 렌더 경로**를 갖는다(아래 연결 참조).

| 경로 | 역할 |
|---|---|
| `src/data/group-*.json` (206·19MB) | JP+EN+KR 그룹 스냅샷. **`GroupCards.tsx`가 이 중 174개를 import** → sv-base 페이지가 렌더. 19MB 전체가 번들 영향권 |
| `src/i18n/messages/{ko,en}.json` (각 58줄) | next-intl 메시지. **매우 얇음 = UI 텍스트 대부분이 코드/DB에 인라인**(추정 아닌 실측 사실) |
| `src/styles/toss.css` (332) | 디자인 토큰 단일출처(3계층) |
| `src/generated/prisma/` (60) | Prisma 클라이언트 자동생성물(.gitignore된 빌드산출물) |

연결: 두 렌더 경로 공존 — 레거시(group-json 174개 → `GroupCards` → sv-base 페이지 **1곳이 174 json을 모두 끌어다 씀**) vs 현행(DexCatalog → DB 직독). "단일 고립 1 json 소비"가 아니라 "단일 페이지가 174 json을 소비"하는 구조다.

### ⑤ prisma DB 모델
DB 설계도 한 장(`schema.prisma` 1034줄·**52 model**·enum 0). 카드 정체성을 4계층으로 정리.

| 모델(테이블) | 역할 |
|---|---|
| `Card` (@@map LogicalCard) | 언어중립 인쇄정체성·게임필드 권위. ★폐기예정 `nameKo/attacksKo` 집결지 |
| `RegionCard` (@@map CardLocale) | 지역별 발매판·번호·이미지·레어도. dex 렌더 기준. unique 의도적 부재 |
| `CardPack` (@@map SetGroup) | 논리 확장팩 slug. **동결팩 가드 대상 단위** |
| `Set` | 지역 발매판. cardPackId=@map setGroupId, packType 등 dex 메타 |
| `DeckArchetype`·`Tournament` | cardgame 메타 허브(집계+편집자산+견적캐시 혼재) |

연결: scripts가 적재 → generator가 `src/generated/prisma` 생성 → 앱이 import. enum 대신 String+주석(파이프라인 유연성 우선). 동결팩 보호는 schema가 아닌 `protected-groups.ts` 담당.

### ⑥ scripts 데이터 파이프라인
외부 사이트에서 긁어 DB에 적재·교정·검증하는 데이터 공장. tsc 제외, tsx 실행. 대부분 일회성. top-level **341개** .ts.

| 경로 | 역할 |
|---|---|
| `scripts/lib/protected-groups.ts` (117) | **★최중요 허브**. 동결팩 SSOT + `assertWritable()` 가드 |
| `scripts/collect-pack.ts`·`verify-pack.ts` | 제네릭 수집·검증 프레임워크(재사용 인프라) |
| `scripts/build-group.ts` (94KB) | 최대 파일. CardPack CONFIG(206키) — 팩 대응표 코드 원천 |
| `scripts/fix-*.ts` (**141**) | **압도적 다수**. 팩코드 박힌 단일팩 일회성 교정. 이 중 **57개만 assertWritable() 가드 채택**(나머지 수리 시 가드 추가 의무) |
| `scripts/collect-*.ts` (**68**) | 수집 스크립트 |
| `scripts/lib/trainer-names-*.ts` (9) | 시대별 트레이너 KR↔JP↔EN 이름 사전(스크램블 교정 권위) |

연결: 외부+`data/` → DB 단방향 쓰기. `meta:weekly` 체인 + **CI 워크플로(seed/sync:cards/sync:prices)**가 운영 파이프라인이다.

### ⑦ data 원본덤프
외부 출처를 박제한 원본 캐시 창고. DB 적재의 권위 원본 + 봇차단 우회용 영구 캐시.

| 경로 | 역할 |
|---|---|
| `data/jp-official` (~365)·`kr-official` (~250) | JP/KR 공식 카드 덤프(권위 원본, tracked) |
| `data/pokeapi/` | 종 이름 매핑 CSV(도감번호 조인 허브, README+.pinned-commit 재현성) |
| `data/tier-lists/` (3) | ★앱이 직접 읽는 유일한 data(`src/lib/tier.ts`) |
| `data/en-ptcg·collect·pokedata·limitless-web` | 진행형 수집물·대회결과(대부분 **untracked** — 추적 정책 부재). `pokedata`는 재조회금지 |

연결: scripts가 읽어 DB 적재. 런타임 결합도 매우 낮음(tier-lists 1곳뿐).

### ⑧ docs 문서
코드 밖 참고문서·작업로그. 사람과 다음 세션 AI를 위한 인계 기록.

| 경로 | 역할 |
|---|---|
| `docs/pack-audit/` (101) | 팩별 점검 로그(58%). README가 파이프라인 절차 허브 |
| `docs/cardgame/meta-pipeline-multisource.md` | 코드 14회 참조 — 최활성 living 설계문서 |
| `docs/ERD.md`·`BACKEND_ARCHITECTURE.md` | 모델↔테이블 매핑·아키텍처 권위 문서 |
| `docs/list_match_log.md` (37KB) | 리스트↔DB 대조 캠페인 누적 로그(pack-list-check 스킬이 append) |

연결: 런타임 입력 아님(인계용). 일부 설계문서는 코드/스킬이 경로 참조하는 living SSoT. MEMORY.md의 project_* 항목이 이들을 상세본으로 가리킴.

### ⑨ 루트 설정·잡동사니
최상위 빌드/툴체인 설정 + 디자인 작업 잔재.

| 경로 | 역할 |
|---|---|
| `package.json` | 빌드/배포 + 50 데이터 파이프라인 스크립트 진입점 |
| `AGENTS.md` | 동결팩 가드 명세(CLAUDE.md가 import) |
| `tsconfig.json` | app vs scripts 타입체크 경계 분리(scripts exclude) |
| `next.config.ts` | next-intl wrap, output=standalone(Lightsail 배포) |
| (cruft) 루트 17 jpeg·2 xlsx·5 tsbuildinfo·경쟁사분석 3종 | 스크린샷·xlsx·빌드캐시·`poketrace.md`/`tcgbox.md`/`너정다.md` |

연결: 코드 생산 안 함, 다른 모든 영역을 감쌈. GitHub Actions가 master push→standalone 빌드 Lightsail 배포.

### ⑩ public 정적 자산
Next.js가 루트 경로로 그대로 서빙하는 정적 파일. **초안에서 통째로 누락됐던 영역**.

| 경로 | 역할 |
|---|---|
| `public/type-icons/` | ★타입(불·물 등) 아이콘 — 앱 런타임이 직접 서빙할 가능성. **삭제·이동 전 참조 검증 필수** |
| `public/ads.txt` | 광고 네트워크 인증 파일(운영상 필요할 수 있음) |
| `public/{next,vercel,globe,window,file}.svg` (5) | create-next-app 부트스트랩 SVG — 미사용 cruft **후보**(검증 필요) |

연결: 런타임이 URL로 직접 접근. type-icons는 코드 경로가 grep에 안 잡힐 수 있으니(문자열 조합 경로) 정리 대상에서 제외하고 검증부터.

### ⑪ designs 디자인 소스
toss 디자인 시스템·화면 시안의 원본. **초안 누락 영역**.

| 경로 | 역할 |
|---|---|
| `designs/*.pen`·`*.png` (13) | cardgame-community·community-write·market-write·my-page 등 화면 시안(.pen=편집소스, .png=렌더) |
| `designs/toss-design-brief.md` | 디자인 브리프(toss 시스템 의도 문서) |

연결: 런타임 미참조. toss 컴포넌트 구현의 디자인 출처일 가능성이 높아 cruft가 아니라 **자산**으로 취급. `.pen.bak` 한 건은 정리 후보.

### ⑫ .github/workflows CI
배포·데이터 동기화 자동화. **초안 누락 — scripts 아카이브 위험의 핵심 맥락**.

| 파일 | 역할 |
|---|---|
| `deploy.yml` | master push → `npm run build` → standalone Lightsail 배포 |
| `sync-cards.yml` | `npm run seed` + `npm run sync:cards` 를 CI에서 실행(카드 동기화) |
| `sync-prices.yml` | `npm run sync:prices` 를 CI에서 실행(시세 동기화) |

연결: package.json 스크립트를 CI가 직접 호출 → **scripts/ 파일이나 npm 스크립트 이름을 옮기면 CI 파이프라인까지 동시에 깨진다**(아카이브 위험이 로컬 너머로 확장).

---

## 정리·리팩토링 제안

> 전제: 아래 "참조 0건/死/cruft" 판정 상당수는 grep 기반 **추정**이다. 동적 import·조건부 마운트·문자열 경로는 grep에 안 잡힌다. **테스트가 0건이므로 빌드/타입체크가 유일한 안전망** — 삭제 전 반드시 `npm run build`+타입체크 1회로 확정한다.

### 우선순위 높음 — 저위험·고효과(즉시 가능)

| 무엇을 | 왜 | 어떻게 | 리스크 |
|---|---|---|---|
| `src/components/ui/` 7파일 삭제 검토 | import 0건 추정, toss로 대체된 shadcn 잔재. "toss vs ui 어느 게 정답?" 혼란 유발 | 각 파일 grep 재확인 → build 1회로 확정 → 폴더 통째 삭제 | 낮음(빌드가 잡음) |
| `src/lib/price/` 폴더 삭제 검토 | index·ebay·types 미사용 추정. poketrace/bunjang로 대체된 폐기 초기설계 | grep+타입체크로 확정 → 폴더 삭제 | 낮음 |
| trades 액션체인 정리 (`actions/trades.ts`+`api/trades.getRecentTrades`) | 소비처 0 추정, 기능 휴면(TradeFeed 미렌더). 단 `trades/shared`는 보존(services 다수 소비) | 함수+re-export 제거, shared 직참조 유지 | 낮음 |
| 루트 17 jpeg `git rm --cached` | .gitignore 룰 이전에 커밋돼 추적 상태. 디스크 파일은 유지 | `git rm --cached *.jpeg`, 파일 보존 | 매우 낮음 |
| 5 tsbuildinfo 삭제 + `.omc` 중첩 정리 | card-check 스킬 임시캐시(오타변종 4종, ~1.7MB) + `data/*/.omc/` 상태파일 유입 | `rm` (재생성됨) + `.gitignore`에 `**/.omc/` 추가 | 매우 낮음 |
| `prisma/backups/*.bak`(101MB)·`schema.prisma.bak-*` 정리 | 1회성 덤프·스냅샷, git history로 복원 가능 | 레포 밖 보관 또는 삭제, `.gitignore`에 `prisma/backups/` | 낮음(마이그 안정 확인 후) |
| `data/collect/jp-s-p-supplement*.json` 중복 병합 | `-official`과 바이트 동일, 빈 `jp-extra-reg.json([])` 등 | 권위본 1개로 통합, reader 확인 | 낮음 |
| `src/lib/cards/set-meta.ts` docstring 갱신 | docstring이 "미배선"이라 적혔으나 실제 DexCatalog·dex-region 둘 다 import 중(stale 확인됨) | 주석만 수정 | 없음 |
| `public/*.svg` 부트스트랩 5종 정리 검토 | create-next-app 잔재 cruft 후보 | grep 참조 확인 후 삭제 | 낮음(검증 필요) |

### 우선순위 중간 — 구조 개선(검토 후)

| 무엇을 | 왜 | 어떻게 | 리스크 |
|---|---|---|---|
| `scripts/` 일회성 fix/collect 아카이브 | 341 .ts 평면 누적이 최대 구조 문제. fix 141·collect 68이 팩코드 하드코딩 완료물 | `scripts/archive/{fix,collect}/`(시대별 xy/sm/sv...) 이관. **삭제 아닌 아카이브**(헤더에 교정이력 보존) | **중간~높음 — package.json wired 스크립트(seed-*·sync-*·aggregate-meta·fix-pokedex 등)는 절대 이동 금지 또는 경로 동시수정. ★추가로 `.github/workflows`의 seed/sync:cards/sync:prices가 깨지지 않는지 동시 확인** |
| `src/lib/cardgame/mock.ts` 다이어트 | 1178줄 중 대형 export(SETS·TOURNAMENTS 등) 소비 0 추정, CARDS만 폴백 생존 | 死 export 삭제, CARDS+타입 잔존. **mockToReal는 살아있는 어댑터이므로 보존** | 중간(CARDS 폴백·mockToReal 경로 확인) |
| `data/` 원본 vs 파생 분리 | `limitless-setmap.json`·`major-registry.json`(빌드산출물)이 원본 덤프와 루트 평면 혼재 | `data/derived/`·`data/raw-scrape/`(limitless-web·kr-league) 분리 | 낮음(reader 경로 수정 필요) |
| `data/` untracked 추적정책 수립 | jp/kr-official은 커밋, EN/대회/수집물 미커밋 → 재현불가 리스크 + git status 영구오염. **pokedata는 재조회금지라 반드시 보존** | 보존 대상 결정 → 커밋 또는 명시적 .gitignore | 중간(pokedata 손실 주의) |
| docs root 평면 31개 정리 + `docs/README.md` 인덱스 신설 | living 설계문서와 완료 로그 혼재, 진입점 없음 | `docs/archive/`·`docs/cardgame/`·`docs/research/` 신설, 인덱스 작성 | 낮음(코드/스킬 참조 경로 가진 문서는 이동 시 참조 수정) |
| 루트 경쟁사 분석 3종 이동 | `poketrace.md`·`tcgbox.md`·`너정다.md`가 root 산재(config도 code도 아님) | `docs/research/`로 이동 | 낮음 |
| root `README.md` 재작성 | create-next-app 부트스트랩 그대로(프로젝트 설명 0) | AGENTS.md/ROADMAP 가리키는 실제 설명으로 교체 | 없음 |

### 우선순위 낮음 — 사용자 확인 필수(고위험·판단 필요)

| 무엇을 | 왜 | 어떻게 | 리스크 |
|---|---|---|---|
| `src/data/group-*.json`(19MB)+`GroupCards.tsx`+`dex/sv-base` 폐기 **검토** | DexCatalog가 DB-first로 가는 중이나, **현재 GroupCards가 174 json을 import하고 sv-base 페이지가 실렌더하는 살아있는 경로**다("고립" 아님) | sv-base를 DexCatalog로 흡수 → 174 import 제거 → 번들 영향 측정 후 폐기 **검토** | **높음 — ① 살아있는 렌더 경로 ② sv-base 포함 동결팩 18종이 이 경로에 직접 걸려 AGENTS.md 동결 규정과 충돌 가능 ③ 동결 검증 스냅샷일 가능성. 반드시 사용자 확인** |
| 고아 `group-og-*.json` 32개 | GroupCards 174 import 목록에 없는 순수 고아(grep 참조 0 추정) | GroupCards 등록계획 없으면 삭제 또는 비-src 이동 | 낮음(런타임 미참조 검증 후) |
| `Card.nameKo/attacksKo/abilitiesKo` DROP | 주석상 Phase7 폐기예정이나 **src에 247참조(40파일, services·actions·dex 핵심 포함) 생존** | CardText 백필·읽기이관 **완료 검증 후** expand-contract DROP | **높음 — 지금 DROP하면 확정 런타임 붕괴. 참조 규모가 큼(247/40파일)** |
| 미사용 컴포넌트 정리(CollectionDashboard·RankingBoard·CardHeroSlider·BadgeTabs·AdUnit) | 외부참조 0건 실측(자기파일 외 import 없음) | 동적/조건부 마운트 가능성 대비 build 1회 검증 후 삭제 | 중간(동적 마운트 가능성) |
| `community` vs `cardgame/community` "중복 축소" — **재평가 필요** | 초안은 "사실상 같은 게시판"이라 했으나 실측상 **구조 비대칭**: `cardgame/community`는 [id] 상세 없음(page+write만), 일반 `community`는 [id]+page+write 보유 | 통합은 의도된 분리를 깰 위험. **통합 전 비대칭 의도 확인** | 중간(부정확 전제 — 섣불리 통합 금지) |

### 건드리면 안 되는 것 (불변)

- **동결 카드팩**: `mega-*` 5종·`sv-*` 18팩(sv-base 포함)·`sv-black-bolt-white-flare` 등의 EN/KR 매칭. 단일출처는 `scripts/lib/protected-groups.ts`. 변경은 `--allow-protected` + **사용자 확인 체크포인트** 필수. raw SQL/즉석 prisma 우회 금지. (※ sv-base 등이 group-json 렌더 경로에도 걸려 있으니 group-json 정리도 동결 규정 영향권.)
- **scripts tsc 제외 경계**: `tsconfig.json`이 scripts/를 의도적으로 제외. 모델/컬럼명 변경 시 scripts는 컴파일이 안 잡으니 `grep` 수동검증 필수(`feedback_db_column_drop_procedure` 규약). **테스트 0건이라 안전망 없음.**
- **공유 Supabase DB**: 프로덕션 가동 중. 마이그 방식이 db push 추정(migrations/ 빈 폴더)이라 스키마 변경은 신중히.
- **naver 크론**: Lightsail 프로덕션의 불가침 크론(MEMORY 기록).
- **`@@map` 매핑**: 모델명(Card)≠테이블명(LogicalCard). 이름 헷갈려도 schema의 @map/@@map 건드리면 물리 호환 깨짐.
- **CI 배선 스크립트**: `deploy.yml`·`sync-cards.yml`·`sync-prices.yml`이 호출하는 `build`·`seed`·`sync:cards`·`sync:prices`는 이름·경로 변경 시 CI까지 깨진다.

---

## 리스크·주의

- **런타임 import 추적의 한계 + 테스트 0건**: 본 분석의 "참조 0건/cruft" 판정 상당수가 grep 기반 **추정**이다. 동적 import·조건부 마운트·문자열 경로는 grep에 안 잡힌다. 게다가 레포에 자동화 테스트가 0건이라 회귀를 잡아줄 안전망은 `npm run build`+타입체크뿐 — 삭제 전 반드시 1회 실행해 확정할 것(특히 컴포넌트·public/type-icons류).
- **동결 가드 우회**: DB 뮤테이터를 새로 만들거나 fix-*를 수리할 때 `assertWritable()` 가드를 빼면 동결팩이 무방비로 노출된다. 현재 **fix-* 141개 중 57개만 가드 채택** — 나머지 수리 시 가드 추가 의무.
- **scripts 아카이브 = package.json + CI 동시 위험**: 아카이브 이관 시 `seed-*`·`sync-prices-*`·`sync-tournaments-*`·`aggregate-meta`·`fix-pokedex-mapping`·`backfill-logos-*`·`rebuild-rankings/market` 등 wired 스크립트를 같이 옮기면 `meta:weekly`뿐 아니라 **`.github/workflows`의 seed/sync:cards/sync:prices CI까지 깨진다**. 경로 동시수정 또는 미이동.
- **group-json 폐기 영향 재평가**: dex가 group-json(레거시)과 DexCatalog(현행) 두 경로를 갖는다. group-json은 "고립 1 json"이 아니라 **sv-base 페이지 1곳이 174 json을 끌어다 쓰는 19MB 렌더 경로**이며, 여기 **동결팩 18종이 직접 걸려 있다**. 폐기는 동결 규정·standalone 번들 크기·sv-base 렌더 셋 다 영향 → 사용자 확인 + 번들 측정 전제.
- **배포 standalone**: `next.config.ts`의 `output: standalone`은 Lightsail self-host 전제. group-json 19MB를 src 번들에서 빼면 standalone 빌드 크기에 영향(개선 방향이나 검증 필요).
- **data/ untracked 손실**: `data/pokedata`(개인 .ovh 서버, 재조회금지)는 untracked인데 삭제하면 영구 손실. 정리 전 보존 정책부터.
- **마이그레이션 미완 컬럼**: `*Ko` 컬럼은 폐기예정이지만 읽기이관 미완(**src 247참조·40파일 생존**, 초안 158보다 큼). DB DROP은 코드 이관 완료 검증 후에만.
- **public/type-icons 런타임 의존**: 타입 아이콘은 문자열 조합 경로로 서빙될 수 있어 grep에 안 잡힌다. cruft로 오인해 삭제 금지 — 검증 우선.

(불확실 표기: 컴포넌트/export "참조 0건", `ui/`·`lib/price/` 死 여부, group-json 폐기 가부, mock.ts 死 export 범위, public SVG cruft 여부는 제공·실측 근거 일부가 grep 기반 **추정**이며 실삭제 전 빌드·grep 재확인 전제. 반대로 cards page 781줄·52 model·scripts 341/fix 141/collect 68·GroupCards 174 import·*Ko 247참조(40파일)·테스트 0건·workflow 3종·designs 13파일·i18n 58줄·mockToReal 살아있음은 **실측 확정** 사실이다.)