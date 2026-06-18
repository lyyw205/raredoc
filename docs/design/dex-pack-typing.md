> 상태: **Phase 0 — 설계 합의 대기** (2026-06-16). 마이그레이션 미적용(분석/설계만).
> 단일출처(예정): `src/lib/cards/set-meta.ts`(`deriveSetMeta`) · 스키마 `Set.packType` / `Set.titleClean{Ko,Ja,En}`(additive nullable)
> 산출 근거: ultracode 13-에이전트 워크플로(서브시스템 매핑→4안 경쟁→3렌즈 심판→종합) + 메인 루프의 전수 DB 실측 검증.

# 도감 팩 타이핑 재설계 (packType + 클린 팩명)

## 1. 배경 — 현 상태와 문제

도감 사이드바 팩명은 현재 표시-only `shortenPackName`(`src/lib/cards/dex-region.ts`)으로 런타임 축약된다.
규칙: **raw `era`가 `-SP`가 아니고 「」가 있으면 괄호 안쪽 추출, 아니면 원본**. 이걸로
"스칼렛&바이올렛 확장팩 「흑염의 지배자」" → "흑염의 지배자".

사용자 요청: 표시 문자열만 바꾸지 말고, DB에 **(1) 팩 종류 분류** + **(2) 클린 팩명**을 1급 데이터로
분리 저장하고 사이드바엔 클린 팩명을 노출하는 게 나은지 검토. JP/EN/KR 지역탭마다 사이드바 목록이 달라지는 점까지 포함.

### 1.1 표시-only의 구조적 한계 (실측)

- **분류가 정렬/필터/검색에 1급으로 안 잡힌다.** 정렬은 `era`·`releaseDate`, 그룹핑은 `era`·`isEtc`만.
  product-type(본탄/강화/하이클래스/스타터/덱/특전박스/프로모)은 어디에도 없다.
  PackGallery 검색(`PackGallery.tsx` `p.name.includes`)은 이미 축약된 `p.name`만 본다.
- **`-SP`는 무축약된다.** `shortenPackName`이 `rawEra.endsWith("-SP")`면 원본 유지 → `kr-svf`의
  "…배틀 강화 BOX 「흑염의 지배자」"는 안 줄어, 본탄 `kr-sv3`("흑염의 지배자")와 **같은 콘텐츠인데 표기가 갈린다.**
- **「」 없는 팩·EN 접두는 못 줄인다.** 구세대(DP/Pt/Neo/e카드/base)·"콜렉션 X"·"라이징 피스트"는 규칙 미작동.

### 1.2 region별 nameKo 정제 편차 (실측)

같은 콘텐츠인데 지역탭마다 길이가 다르다:
- JP 본탄 `jp-sv-obsidian-flames.nameKo` = `"흑염의 지배자"` (이미 짧음, tcgdex 번역체)
- KR `kr-sv3.nameKo` = `"스칼렛&바이올렛 확장팩 「흑염의 지배자」"` (공식 pokemoncard.co.kr 긴 정식명)

`shortenPackName`은 KR 쪽만 우연히 잡고 JP는 손 안 댄다. region 무관 동일 표기를 보장하려면 정규 클린 title이 필요하다.

### 1.3 ★결정적 발견 — packType은 setGroup의 함수가 아니다

라이브 DB 실측: 한 setGroup `sv-goods`(era `SV-SP`)가 **11개 이질 SKU**를 묶는다.

| region | Set.id | name | product-type |
|---|---|---|---|
| JP/KR | jp-tcg-SVB / kr-svb | 프리미엄 트레이너 박스 ex | box_set |
| JP/KR | jp-tcg-SVF / kr-svf | 배틀 강화 BOX 「**흑염의 지배자**」 | box_set |
| JP/KR | jp-tcg-SVK / kr-svk | 배틀 강화 BOX 「**스텔라미라클**」 | box_set |
| JP/KR | jp-tcg-SVN / kr-svn | 배틀 강화 BOX 「**배틀파트너즈**」 | box_set |
| JP/KR | jp-tcg-SVP1 / kr-svp1 | 「ex 스페셜 세트」 | box_set |
| KR | kr-svp2 | 「ex 스페셜 세트 ver.2」 | box_set |

같은 setGroup 안에 4개의 서로 다른 콘텐츠 title + 여러 product-type이 공존한다.
`bw-decks`(34 Set), `sv-decks`(32), `xy-decks`(27)도 같은 catch-all 패턴이다.

그리고 같은 콘텐츠 "흑염의 지배자"가 **product-type으로 갈린다**:
`kr-sv3`(setGroup `sv-obsidian-flames`, era `SV`, **본탄=expansion**) vs
`kr-svf`(setGroup `sv-goods`, era `SV-SP`, **box_set**).

→ **packType의 결정변수는 setGroup이 아니라 region별 SKU = `Set` 차원이다.**
CardPack(SetGroup)에 두면 sv-goods 1행이 단일값을 강제받아 구조적으로 표현 불가(데이터로 반증됨).
참고: 스키마상 `Set`에는 `era` 컬럼이 없다(era는 `CardPack.era`에만 존재) → packType 백필 시 `-SP` 신호는 `cardPack` join으로 읽는다.

## 2. 설계 — 직교 3축 + 2계층 명명

### 2.1 세 직교 축

| 축 | 의미 | 단일출처 | 변경 |
|---|---|---|---|
| **era** | 언제(연대, SV세대) | `CardPack.era`(raw) → `Era`(`eras.ts`) | 보존 |
| **packType** | 어떤 상품형태 | **신설 `Set.packType`** | 추가 |
| **titleClean** | 표시명(클린) | **신설 `Set.titleClean*`** + `CardPack.name*` 폴백 | 추가 |

현 era의 `-SP` 접미는 packType의 **저해상도 2값 근사**(본탄 vs 특전)다. packType(9값)을 도입하면 era는
순수 연대축으로 정리되고 `-SP`의 product 의미는 packType으로 이관된다. era raw는 그대로 보존(백필 입력 신호).

### 2.2 packType enum (9값)

slug(DB저장) / 라벨(UI) / 정의:

1. `expansion` — 확장팩 : 본탄 메인 부스터(흑염의 지배자 kr-sv3)
2. `reinforced` — 강화확장팩 : KR `강화 확장팩`, JP `強化拡張パック`
3. `high_class` — 하이클래스팩 : KR `하이클래스팩`, JP `ハイクラスパック`/`BREAK進化パック`(샤이니트레저·VMAX클라이맥스)
4. `concept` — 컨셉팩 : JP `コンセプトパック`, 20th BASE PACK, 25th ANNIVERSARY COLLECTION
5. `starter` — 스타터 : `스타터 세트*`/`スターターセット*`/`スタートデッキ`/`Starter Set`/`Trainer Kit`
6. `deck` — 덱 : `배틀 마스터 덱`/`스페셜 덱 세트`/`…60장 덱`/`バトルマスターデッキ`/`…デッキ60`
7. `box_set` — 특전박스 : `배틀 강화 BOX`/`프리미엄 트레이너 박스`/`GOLDEN BOX`/`Elite Trainer Box`/`McDonald's Collection`
8. `promo` — 프로모 : `* Black Star Promos`(code `PR*`)/`프로모`/`プロモ`/`S-P`/`M-P`/`POP Series`
9. `subset` — 서브셋 : EN `Trainer Gallery`(상위 세트 부속 갤러리)

### 2.3 클린 title — 저장하되 콘텐츠 canonical 폴백

**title은 영속 저장한다**(파생 아님). 근거: PackGallery 검색·향후 시세/메타/콜렉션 SQL 조인·집계는
클린명이 DB 1급 컬럼이어야만 받친다. 파생(런타임)이면 앱 메모리에만 존재해 외부 조인 불가 → 로드맵과 충돌하는 "중간 단계"가 된다.

단 저장의 동기화 부채를 막기 위해 **3단 우선순위**로 읽는다(`resolveSidebarTitle`):
1. `Set.titleClean{Ko/Ja/En}` (있으면 — catch-all SKU·예외 보정 + 정규 백필분)
2. `CardPack.name{Ko/Ja/En}` (콘텐츠 canonical — 정상 본탄에서 3국 Set이 공유 → region 무관 동일 표기 구조 보장. build-group CONFIG가 이미 클린값 보유)
3. `shortenPackName(Set.name, era)` (미백필 graceful 폴백 — 무중단 점진 마이그)

**localized 3컬럼인 이유**: "흑염의 지배자"(KR) ≠ "黒炎の支配者"(JP) ≠ "Obsidian Flames"(EN). 단일 canonical 1컬럼은 다국어 사이드바에서 깨진다.

**원본 보존**: `Set.name/nameKo/nameJa`(접두·「」 포함 긴 정식 상품명)는 손대지 않는다 — 상세페이지·원문 검색용. 사이드바=titleClean, 상세=name.

## 3. 분류 규칙 (결정 트리)

입력: raw `era`(CardPack join) + `name`(locale우선; EN은 영문 `name`, JP/KR은 `nameKo`) + `code`. 위→아래 첫 매치.
구현은 `src/lib/cards/set-meta.ts` `derivePackType()`.

```
1. code ~ ^PR  OR  name ~ (Black Star Promo|프로모|プロモ|S-P|M-P)        → promo
2. name ~ (Trainer Gallery|트레이너 갤러리)                                → subset
3. NOT -SP AND name ~ (하이클래스|ハイクラス|BREAK進化パック|Classic Collection) → high_class
4. name ~ (강화 ?확장팩|強化拡張パック)                                     → reinforced
5. name ~ (コンセプトパック|ANNIVERSARY COLLECTION|BASE PACK) AND NOT GOLDEN BOX → concept
5.5 name ~ (GOLDEN BOX|프리미엄 트레이너 박스|プレミアムトレーナーボックス|Elite Trainer Box) → box_set  (era 무관)
6. -SP 게이트:  스타터/Trainer Kit → starter ·  덱/デッキ/Deck → deck ·  else → box_set
7. era 본탄(-SP 아님, era≠null)                                            → expansion
8. era=null(isEtc 잔여): 확장팩/拡張パック→expansion · Trainer Kit→starter ·
   POP Series/Best of Game/Rumble→promo · McDonald/Futsal/Energies/Classic Collection→box_set · else → null(수동)
```

### 3.1 자동 분류 커버리지 — ★전수 실측 (717 Set)

메인 루프가 위 분류기를 전 Set에 직접 돌린 결과:

| packType | 건수 |  | packType | 건수 |
|---|---|---|---|---|
| expansion | 400 | | promo | 27 |
| deck | 89 | | high_class | 16 |
| starter | 60 | | concept | 3 |
| box_set | 57 | | subset | 4 |
| reinforced | 49 | | **NULL(미분류)** | **12** |

**자동 커버리지 705/717 = 98.3%.** 남은 12건은 전부 **EN SM 본탄**(Sun & Moon, Guardians Rising, Burning Shadows,
Shining Legends, Crimson Invasion, Forbidden Light, Celestial Storm, Lost Thunder, Team Up, Unbroken Bonds,
Unified Minds, Cosmic Eclipse)이며, **공통 원인은 packType 문제가 아니라 이 EN Set들이 `setGroup` 미연결(era=null)인
기존 데이터 갭**이다. → 두 길:
- **(권장) setGroup 백필**: 이 12개 EN Set을 해당 SM 그룹에 연결하면 era가 채워져 자동으로 `expansion` 분류 + SM 카테고리에도 정상 합류.
- **(임시) override 1줄**: `sm1..sm12, sm35 → expansion`.

### 3.2 명시 예외/검증 포인트 (실측 발견)

- `kr-s8a-g` "25th GOLDEN BOX": era가 regular `S`라 concept/expansion으로 샐 뻔 → 규칙 5.5로 **box_set** 확정.
- `kr-s8a` "25th ANNIVERSARY COLLECTION": **concept**(정책 확정 필요 — §8 Q1).
- KR DP 본탄 `kr-bs1..bs10`("DP 확장팩 …"): era=null이지만 규칙 8의 `확장팩` 매치로 **expansion** 회수.
- `sv-goods` 산하 SKU: name 키워드로 box_set 자동, 모호건만 override.

## 4. 백필 (미적용 — Phase 2)

단일 헬퍼 `deriveSetMeta(set, override?)`가 `src/lib/cards/set-meta.ts`에 신설(이미 작성됨, 미배선).
모든 Set 업서트가 이 헬퍼만 호출하게 funnel화(staleness 방지). 백필 스크립트 `scripts/backfill-set-meta.ts`:
1. 전 Set에 `deriveSetMeta` **dry-run** → packType + titleClean 산출 전수 리뷰.
2. JSON override 테이블(setId→{packType,title})로 모호건(~12 EN-SM 등) 주입.
3. 영향 `cardPackId` 수집 후 `assertWritable(ids, { dryRun: !APPLY, allow: ALLOW_PROTECTED })`.
4. `--apply`는 `--allow-protected` + 사용자 사전확인 동반(동결팩 다수 영향이나 **연결 FK 무변경**).

검증: `scripts/verify-set-meta.ts` CI — 전 Set에 derive 재실행, 저장값 ≠ derive(override 제외)면 실패.
packType NULL 신규 Set·catch-all override 누락도 적발.

## 5. 사이드바 UX (잠금해제)

`RegionPack`에 `packType?`, `title`(=3단 폴백 결과) 추가. region별 목록 차이는 `Set.region` 필터로 자연 발생(EN 186 / JP 282 / KR 249) — 무변경.

- **2단 섹션**: era 헤더 아래 본탄(expansion/reinforced/high_class/concept/subset) + 하단 접힌 디스클로저 "특전·덱·프로모"(starter/deck/box_set/promo).
- **필터**: 상단 SegmentedControl "전체 / 본탄만 / 특전 포함"(region 탭 패턴 복제 + `@@index([region, packType])` 서버 프리필터).
- **뱃지**: 선택헤더·타일에 `[강화확장팩] 흑염의 지배자` 라벨칩 + 클린 title 병기.
- **정렬**: `eraOrder` → `PACK_TYPE_ORDER`(본탄>강화>하이클래스>…>특전>프로모) → `releaseDate`.
- **검색 1급화**: PackGallery 검색이 title + packType 분류검색 지원(영속 컬럼이라 가능).

### 5.1 region별 노출 정책 (제안 — §8 Q3 확정 필요)

| packType | JP | EN | KR |
|---|---|---|---|
| expansion/reinforced/high_class/concept | 노출 | 노출 | 노출 |
| subset | — | 노출(EN만) | — |
| starter/deck/box_set | 접기 | 접기 | 접기 |
| promo | 숨김(토글) | 숨김(EN 다수) | 숨김 |

★구현 함정: 사이드바·모바일칩·PackGallery 3곳이 정렬·그룹 가정을 독립 재구현(`DexCatalog.tsx`, `PackGallery.tsx`).
`buildRegionPacks`에서 `groupKey`/`isGroupStart`를 선계산해 UI는 읽기만 하게 끌어올린다. 데드코드 `DexSet.isSpecial`/`specialSuffix`는 이 기회에 삭제 정리.

## 6. identity-model 마이그와의 관계

`docs/migration/identity-model-migration-plan.md`(미착수)는 정체성축(Species→GameCard→ArtCard→RegionCard) 재배선이고
packType/titleClean(Set 메타축)과 **직교**다. 그 계획상 `Set` 모델은 거의 보존(드롭=setGroup 다이아몬드 경로뿐)이라
**Set은 마이그 전후 안정 테이블** → 지금 additive로 붙이면 그대로 승계(rarity-redesign Phase2가 Rarity에 abbr/canonicalCode 붙인 것과 동형). **마이그 대기 불요·선행 가능.**

★packType을 ArtCard(현 LogicalCard)에 두면 안 됨 — cross-pack/cross-region이라 "이 카드의 packType" 미성립
(흑염 본탄 R과 배틀강화BOX 재수록이 같은 ArtCard일 수 있음).

## 7. 리스크

- **EN 분류 정확도가 구조적으로 약함**: EN은 `-SP` era 신호가 거의 없고(대부분 era=null isEtc), name 키워드 의존.
  현 실측 미분류 12건이 전부 EN. EN은 애매하면 expansion/노출 보수 처리 + setGroup 백필이 근본책.
- **packType slug 오타가 컴파일에 안 잡힘**: `scripts/`는 tsc exclude(메모리 `feedback_db_column_drop_procedure`).
  → `verify-set-meta.ts` CI가 유일 안전망. 후속 `SetProductType` 마스터 테이블 + FK 승격 시 라벨/정렬/색 1급화(RarityCategory 선례).
- **title 저장 ↔ name 교정 결합**: `apply-kr-official`·`fix-*-meta`가 `Set.name`을 바꾸면 `titleClean` stale 가능.
  CardPack canonical 폴백이 정상 본탄에선 완충하나, `Set.titleClean` override가 있는 SKU는 verify CI로 적발.
- **enum 경계 모호**(GOLDEN BOX/ANNIVERSARY/deck↔box_set): override 테이블 유지보수 + 정책 사용자 확정 필요(§8).
- **동결 가드**: packType/title은 연결(logicalCardId/regionCard FK) 무변경이라 동결 위반 아니나, 규약상 `assertWritable` 호출.
  백필 스크립트는 packType/titleClean 컬럼만 SET하고 연결 FK는 절대 미터치함을 코드로 격리.

## 8. 오픈 이슈 (사용자 결정 필요)

- **Q1. enum 경계**: (a) `25th ANNIVERSARY COLLECTION`(kr-s8a)을 `concept`로 둘지 `expansion`으로 둘지,
  (b) `25th GOLDEN BOX`는 `box_set` 확정 동의 여부, (c) `deck`과 `box_set`을 분리 유지할지 `special` 하나로 통합(8값)할지.
- **Q2. 일관표시 수준**: 정상 본탄에서 CardPack.name canonical 폴백으로 3국 동일 표기를 "구조 보장"하는 현 설계로 충분한지,
  아니면 모든 Set에 `titleClean`을 전수 채워 region별 완전 정규화까지 갈지(후자는 백필·verify 비용↑).
- **Q3. 노출 정책**: §5.1 표(starter/deck/box_set=접기, promo=숨김) 동의 여부. 특히 KR은 절반이 특전이라
  접기 적용 시 본탄 ~146건만 기본 노출되는데 이 기본값이 맞는지.
- **Q4. 검색 범위**: PackGallery 검색이 `titleClean`(축약명)만 볼지, 원본 풀네임/시리즈/code까지 넣을지.
- **Q5. EN era=null 12건**: setGroup 백필(권장)로 근본 해결할지, override로 `expansion` 고정할지, isEtc로 둘지.
- **Q6. SetProductType 마스터 테이블**: 라벨/정렬/색/접기정책 1급화(RarityCategory 선례) 승격을 Phase 4에 포함할지,
  코드 상수(`PACK_TYPE_LABEL`/`ORDER`)로 충분한지.

## 9. 실행 단계 (승인 후, expand-contract)

- **Phase 0 (현재)**: 설계 합의. 본 문서 + `set-meta.ts`(준비물) 커밋. §8 오픈이슈 확정.
- **Phase 1 (코드 먼저, DB 무변경)**: `set-meta.ts` 신설(✅ 작성됨, 미배선). 단위테스트로 흑염 kr-sv3=expansion·kr-svf=box_set,
  GOLDEN BOX=box_set, region별 「」 추출 검증.
- **Phase 2a (additive 스키마)**: `prisma db push`로 `Set.packType` + `titleClean{Ko,Ja,En}` + `@@index([region,packType])` 추가(nullable).
  `migrate dev` 금지(prod=Supabase, rarity-redesign 황금률). scripts/ tsc override+grep로 런타임 깨짐 사전검증.
- **Phase 2b (백필)**: `backfill-set-meta.ts` dry-run 전수 리뷰 → override 주입 → assertWritable + 사용자확인 → `--apply --allow-protected` 1회. `verify-set-meta.ts` CI 추가.
- **Phase 3 (렌더 전환)**: `buildRegionPacks`가 `resolveSidebarTitle` 3단 폴백으로 name 산출 + `RegionPack.packType` 노출.
  DexCatalog/PackGallery 섹션/필터/뱃지/정렬. groupKey/isGroupStart 선계산으로 3컴포넌트 동기화.
- **Phase 4 (정리, 별도 PR)**: titleClean 백필 검수 후 `shortenPackName` 폴백 격하. 데드코드 삭제. (선택) `SetProductType` 마스터 테이블 승격. NOT NULL 승격은 최후·검수 후. **DB 컬럼 drop은 안 함(additive만).**

## 10. 대안 — 보류

- **title 파생안**(Hybrid): 운영 부채 최소지만 검색/조인 1급화 포기 → 시세/콜렉션 로드맵과 충돌, 후속 영속화 재작업 강제.
- **CardPack 우선 2계층 COALESCE**: 일관성 구조보장 최강이나 override 망각 silent 오분류 + EN cardPackId NULL 무력화 + 인지/구현 복잡도. canonical 폴백 아이디어만 차용.
- **무DB config**(eras.ts 패턴): 마이그 0·동결 무마찰이나 검색/SQL 조인 불가(중간단계). Set 안정테이블이라 마이그 충돌 우려는 기각.
