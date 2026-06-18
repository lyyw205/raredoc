# 리스트 ↔ DB 대조 로그 (list match log)

> tcgcollector 등에서 받은 팩 카드 리스트를 DB(기본 JP 기준)와 대조한 결과를 누적 기록.
> 대조 필드: **카드명 / 카드번호·총장수 / 진화단계 / 타입 / 레어도**(리스트에 있을 때). 시세는 dex 미적재라 제외.
> **이름 대조법(표준)**: ① EN RegionCard 링크(1차) → ② 없으면 **포켓몬은 `Card.pokedexNumbers`→`data/pokeapi/pokemon_species_names.csv`**(lang `1`=ja-hrkt·`9`=en·`3`=ko, species_id=도감번호)로 JP/EN/KR 종명 폴백 검증 → ③ 트레이너/에너지(종표 밖)만 잔여(EN링크/트레이너사전 필요). 종-ja명이 카드 ja명에 포함되는지로 자기검증. **★전각/반각 정규화 필수**(ポリゴン２/Ｚ 전각 vs DB 반각 = 오탐).
> **CSV 소급검증(2026-06-17)**: SV 15팩(SV6a~SV11W + SVN/SVM/SVLS/SVJL/SVOM/SVOD) **포켓몬 1277장 전부 도감번호 보유**, CSV 자기검증 **이름 오류 0**(Porygon2/Z 2건은 전각/반각 오탐). 초기 스폿체크가 놓친 이름 오류 없음 확인.
> 정책: **감사 + 안전 in-DB 수정(메타데이터, 연결 불변) + 로그**. 대량 신규 수집·구조변경은 모아서 전담 패스.
> 동결팩(`scripts/lib/protected-groups.ts`)은 읽기 전용 대조만.
> ⚠️ **동결 범위 정정(2026-06-17)**: 2026-06-16 "MEGA·SV·SM 세 시대 카드팩 **전부** 동결" 반영으로, 이 세션에서 처리한 팩(MEGA 전체·SV 전체·MP1/MC/SVOD/SVOM/SVN·MA·M-P 등)은 **모두 동결**. AGENTS.md "SV 18팩" 발췌는 구버전 — 단일 출처는 `protected-groups.ts`. 이번 세션의 in-DB 수정은 전부 **메타데이터(subtypes/types/supertype/rarity)로 EN/KR 연결 불변 + 사용자 승인** 하에 적용됨(동결 핵심 취지=연결 보존은 미침범).

---

## 요약표

| 날짜 | 팩 (코드) | DB setId | region | 장수 | 결과 |
|---|---|---|---|---|---|
| 06-17 | 니힐제로 (M3 / ニヒルゼロ) | `jp-mega-munikisuzero` | JP | 117/117 | ✅ 완전 일치. EN링크 갭 1(#89 Tyrunt AR) |
| 06-17 | 스타트덱100 코로챠오 (MP1) | `jp-tcg-MP1` | JP | 23/23 | 🔧 게임메타 백필. 트레이너 세부 subtype 미완 |
| 06-17 | 스타터세트 메가디안시ex (MBD) | `jp-tcg-MBD` | JP | 22/22 | ✅ 일치 + EX→ex 1 |
| 06-17 | 스타터세트 메가겐가ex (MBG) | `jp-tcg-MBG` | JP | 22/22 | ✅ 일치 + EX→ex 1 |
| 06-17 | 메가브레이브 (M1L) | `jp-tcg-M1L` | JP | 92/92 | ✅ 레어도(MUR)까지 일치(동결·읽기전용). EN링크 갭 1(#68 Riolu AR) |
| 06-17 | 메가 프로모 (M-P) | `jp-tcg-M-P` | JP | 70/123 | ⚠️ 있는 70 정확, **53장 미수집** |
| 06-17 | 프리미엄 트레이너 박스 MEGA (MA) | `jp-tcg-MA` | JP | 43/43(+8) | ✅ #1–43 일치 + EX→ex 4. DB에 기본E 8장(#44–51) 초과 |
| 06-17 | 메가심포니아 (M1S) | `jp-tcg-M1S` | JP | 92/92 | 🔧 Shedinja #43·#72 단계 `Basic→Stage1` 교정완료(이미지검증). 리스트 단계 오타 3(Kadabra·Alakazam)=DB정상 |
| 06-17 | 인페르노X (M2 / インフェルノX) | `jp-mega-infernox` | JP | 116/116 | ✅ 레어도(C/U/R…MUR)까지 완전 일치(동결·읽기전용) |
| 06-17 | MEGA 드림 ex (M2a / ドリームex) | `jp-mega-dream-ex` | JP | 250/250 | 🔧 본탄 37장 레어도→무레어도(하이클래스=무레어도). 동결·승인수정 |
| 06-17 | 닌자스피너 (M4 / ニンジャスピナー) | `jp-mega-ninja-spinner` | JP | 120/120 | ✅ 6필드 완전 일치(동결·읽기전용) |
| 06-17 | 어비스아이 (M5 / アビスアイ) | `jp-mega-abyss-eye` | JP | 118/118 | 🔧 시크릿 포켓몬 25장 `types` 백필(동결·승인수정). 그외 일치 |
| 06-17 | 스타트덱100 배틀컬렉션 (MC) | `jp-tcg-MC` | JP | 774/774 | 🔧 `EX→ex` 115장(동결·승인수정). 무레어도 세트, 그외 일치 |
| 06-17 | 블랙볼트 (SV11B / ブラックボルト) | `jp-tcg-SV11B` | JP | 174/174 | ✅ 명·번호·단계·타입·분류 일치(동결). 🔧 **#159–166 JP RegionCard `UR→SR` 교정완료**(공식=SR 리서치검증, 8장). #174 BWR 보류(유지) |
| 06-17 | 화이트플레어 (SV11W / ホワイトフレア) | `jp-tcg-SV11W` | JP | 174/174 | ✅ 명·번호·단계·타입 완전 일치(동결·읽기전용). **#159–166 SR 정상**(트윈 SV11B의 UR오류 없음). ⚠️ #174 BWR이 DB `R/Holo Rare`로 적재(cosmetic, SV11B보다 부정확) |
| 06-17 | 로켓단의 영광 (SV10 / ロケット団の栄光) | `jp-sv-destined-rivals` | JP | 132/132 | ✅ **6필드 완전 일치(0 불일치)**, 동결·읽기전용. UR 3장 포함 레어도 전부 일치(SV11B와 달리 UR이 실제 사용 세트) |
| 06-17 | 열풍의 아레나 (SV9a / 熱風のアリーナ) | `jp-sv-heatwave-arena` | JP | 92/92 | ✅ **5필드 완전 일치(0 불일치)**, **동결**(읽기전용, 변경 0). SR(#76–84)·UR(#90–92) 둘 다 정상 적재 — DB가 이 세트는 정확(SV11B 오류와 대조) |
| 06-17 | 스타터세트ex 다이고 (SVOD) | `jp-tcg-SVOD` | JP | 19/19(+2) | ✅ #1–19 일치(**동결 sv-decks**). 🔧 #7 메타그로스ex `EX→ex`(메타데이터, 연결불변). DB에 기본E 2장(#20–21 超·鋼) 초과(MA식 동봉E) |
| 06-17 | 스타터세트ex 마리 (SVOM) | `jp-tcg-SVOM` | JP | 20/20(+1) | ✅ #1–20 일치(동결 sv-decks·승인수정). 🔧 #7 마리의오롱털ex `EX→ex`. DB에 기본E 1장(#21 悪) 초과(MA식 동봉E). 트윈 SVOD 동일 패턴 |
| 06-17 | 강화박스 배틀파트너즈 (SVN) | `jp-tcg-SVN` | JP | 45/45(+8) | ✅ #1–45 일치(동결 sv-goods·승인수정). 🔧 ex 4장(#1·2·6·9) `EX→ex`. DB에 기본E 8장(#46–53) 초과(MA식 동봉E) |
| 06-17 | 배틀파트너즈 (SV9 / バトルパートナーズ) | `jp-sv-journey-together` | JP | 132/132 | ✅ **5필드 완전 일치(0 불일치)**, **동결·읽기전용**. SR·SAR·UR(#130–132) 전부 정상 적재 |
| 06-17 | 랜덤 스타트 덱 Generations (SVM) | `jp-tcg-SVM` | JP | 175/175(+8) | ✅ **5필드 완전 일치(0 불일치)**, 동결·읽기전용. **ex 전부 소문자 정상(EX→ex 불필요)**. DB에 기본E 8장(#176–183) 초과(MA식 동봉E) |
| 06-17 | 테라스탈페스ex (SV8a / テラスタルフェスex) | `jp-sv-prismatic-evolutions` | JP | 237/237 | ✅ **5필드 완전 일치(0 불일치)**, 동결·읽기전용. **하이클래스 본탄 144장 "None"(무레어도) 정상**(M2a식 가짜레어도 없음)·RR/ACE/SR/SAR/UR 정상. EN링크갭 101 중 포켓몬 80장 **종CSV로 이름검증 완료(80/80)**, 트레이너 21만 미검증 |
| 06-17 | 초전브레이커 (SV8 / 超電ブレイカー) | `jp-sv-surging-sparks` | JP | 138/138 | ✅ **5필드 완전 일치(0 불일치)**, 동결·읽기전용. ACE SPEC(#95·97·98)·UR(#136–138) 포함 레어도 전부 정상. ex 소문자 정상 |
| 06-17 | 스타터세트 파라블레이즈ex (SVLS) | `jp-tcg-SVLS` | JP | 22/22(+3) | ✅ #1–22 일치(동결 sv-decks·승인수정). 🔧 #6 파라블레이즈(소우브레이즈)ex `EX→ex`. DB에 기본E 3장(#23–25 炎·超·鋼) 초과(MA식 동봉E). SVOD/SVOM 동일 패턴 |
| 06-17 | 스텔라미라클 (SV7 / ステラミラクル) | `jp-sv-stellar-crown` | JP | 135/135 | ✅ **5필드 완전 일치(0 불일치)**, 동결·읽기전용. ACE SPEC(#94·96·101)·UR(#133–135) 포함 레어도 전부 정상. ex 소문자 정상 |
| 06-17 | 나이트원더러 (SV6a / ナイトワンダラー) | `jp-sv-shrouded-fable` | JP | 94/94 | ✅ 명·번호·단계·타입 일치(동결). 🔧 **#55 Poké Vital A ↔ #56 Night Stretcher 레어도 스왑 교정**(ACE↔U). 나머지 정상 |
| 06-17 | 배틀마스터덱 테라스탈리자몽ex (SVJL) | `jp-tcg-SVJL` | JP | 21/21(+1) | ✅ #1–21 일치(동결 sv-decks·승인수정). 🔧 #6 리자몽ex `EX→ex`. DB에 기본E 1장(#22 炎) 초과(MA식 동봉E). V/VSTAR 단계 정상 |
| 06-17 | 크림슨헤이즈 (SV5a / クリムゾンヘイズ) | `jp-sv-crimson-haze` | JP | 96/96 | ✅ 명·번호·단계·타입 일치(동결). 🔧 **ACE SPEC 오배정 4건 3국 일괄 교정**: #53 언페어스탬프·#59 서바이브깁스 `U→ACE`, #58 러브볼·#60 럭키멧 `ACE→U`. 포켓몬 종CSV 양방향 검증 통과 |
| 06-17 | 스타터덱&빌드세트 미래의미라이돈ex (SVHM) | `jp-tcg-SVHM` | JP | 53/53(+8) | ✅ #1–53 일치(**동결 sv-decks**, 덱=무레어도). 🔧 #11 미라이돈ex·#14 피죤ex `EX→ex`. DB에 기본E 8장(#54–61 草炎水雷超闘悪鋼) 초과(MA식 동봉E). 포켓몬 종CSV 양방향 통과 |

**적용한 DB 변경(전부 미커밋):**
- MP1 백필 — 포켓몬 10장(분류+타입+단계) · 트레이너 11장(분류) · Pikachu ex `EX→ex`
- EX→ex subtypes 교정 — MBD #5 메가디안시ex · MBG #3 메가겐가ex · MA #2 Mew ex·#3 Fezandipiti ex·#7 Pidgeot ex·#10 Squawkabilly ex · **SVOD #7 메타그로스ex** · **SVOM #7 마리의오롱털ex** · **SVN #1·2·6·9 ex 4장** · **SVLS #6 파라블레이즈ex** · **SVJL #6 리자몽ex** · **SVHM #11 미라이돈ex·#14 피죤ex**(동결 sv-decks, EX→ex 자동승인) (누계 **10팩 17장**, MC 115장 별도)
- **abyss-eye(M5)** — 시크릿 포켓몬 25장 `types` 백필(본탄 타입 복제: AR 12·SR ex 8·SAR 4·MUR 1)
- **SD100(MC)** — modern ex `EX→ex` **115장** 정규화(EX 0·ex 117)
- **M2a(드림ex)** — 본탄 37장 레어도 제거(무레어도화): `Card.rarity` 37 + JP `RegionCard.rarity` 29. EN me2pt5(공유 LC 22)·KR 표시 불변(자체 RC.rarity 보유)
- **M1S** — Shedinja #43·#72 단계 `Basic→Stage 1` 교정(이미지검증 후 승인수정)
- **SV11B(블랙볼트)** — #159–166 **JP `RegionCard.rarityId` `UR(tier8)→SR(tier7)` 교정 8장**(공식=SR 리서치검증). `Card.rarityId`·EN·KR 미변경(EN은 "Ultra Rare"가 정상이라 공유 LC 보존). BWR(#174)은 사용자 지시로 보류.
- **SV6a(나이트원더러)** — #55 Poké Vital A(ポケバイタルA) ↔ #56 Night Stretcher(夜のタンカ) **JP `RegionCard.rarityId` 스왑 교정**(공식: 전자=ACE SPEC·후자=Uncommon인데 DB가 뒤바꿔 적재). 카드명·EN·KR·Card 미변경.
- **SV5a(크림슨헤이즈)** — ACE SPEC/Uncommon 오배정 4 LC를 **`Card.rarity` + JP/EN/KR `RegionCard.rarity` 전 계층 일괄 교정**(3국 동일오류·동일정답): n53 언페어스탬프 `U→ACE` · n59 서바이브깁스 `U→ACE` · n58 러브볼 `ACE→U` · n60 럭키멧 `ACE→U`(n55 하이퍼아로마는 ACE 정상). 실제 SV5a ACE SPEC=언페어스탬프·하이퍼아로마·서바이브깁스 3장. EN(sv6 `sv-twilight-masquerade`)도 동일오류라 함께 교정(두 동결팩 `--allow-protected`). EN/KR 연결·번호·이름 불변. SV11B(JP만)·SV6a(JP만)와 달리 **3국 전부 틀려** 전 계층 교정.

---

## 팩별 상세

### 니힐제로 — `jp-mega-munikisuzero` (M3, JP 117장) ✅
- 5필드 0 불일치. 117/117, 누락·잉여 없음.
- ⚠️ EN링크 갭: #89 Tyrunt(AR, ja=チゴラス). base 정상, AR 1장만 미연결.
- ※ 첫 대조 때 EN(`en-tcg-me3` "Perfect Order" 124장)에 잘못 맞댄 "대량 어긋남"은 region 착오 → **철회**. EN판은 구성·번호 다른 정상 재편성.

### 스타트덱100 코로챠오 — `jp-tcg-MP1` (JP 23장) 🔧
- 이름·번호 23/23 일치. 세트 메타(코드·발매일 2025-12-19·무레어도)도 tcgcollector와 일치.
- 백필 완료: #6 Pikachu ex·#12 Snorlax 외 21장 게임데이터 비어 있던 것 채움(포켓몬 10=분류+타입+단계, 트레이너 11=분류). Pikachu ex `EX→ex`.
- ⚠️ 미완: 트레이너 세부 subtype(Item/Supporter) — 리스트에 구분 없어 보류.
- ℹ️ #21 ガイ ↔ Urbain(현지화명, EN링크 없어 자동확인 불가).

### 스타터세트 메가디안시ex — `jp-tcg-MBD` (JP 22장) ✅
- 5필드 일치, 게임데이터 완비. 🔧 #5 Mega Diancie ex `EX→ex`.

### 스타터세트 메가겐가ex — `jp-tcg-MBG` (JP 22장) ✅
- 5필드 일치, 게임데이터 완비. 🔧 #3 Mega Gengar ex `EX→ex`.

### 메가브레이브 — `jp-tcg-M1L` (M1L, JP 92장, 동결 `mega-brave-symphonia`) ✅
- 5필드 0 불일치 — 레어도 C/U/R/RR·AR·SR·SAR·**MUR**(#92 Mega Lucario ex)까지. 옛 EX 0건. 읽기 전용.
- ⚠️ EN링크 갭: #68 Riolu(AR, ja=リオル). base #28 정상.

### 메가 프로모 — `jp-tcg-M-P` (M-P, JP, 그룹 `og-jp-mega-promo` **동결**) ⚠️
- DB 70 / 리스트 123. 매칭 70장 구조필드(분류·타입·단계) 0 불일치 · 정체성 스폿체크 통과 · 옛 EX 0. DB-only 0.
- ⚠️ **53장 미수집**(아래 부록). dex 미렌더 + `kr-m-p` 재연결 이력 민감구역 → 수집 시 타깃 LC 충돌 선점검.

### 프리미엄 트레이너 박스 MEGA — `jp-tcg-MA` (MA, JP 51장, 그룹 `mega-goods` **동결**) ✅
- DB 51 = 리스트 43장(#1–43) + 기본에너지 8장(#44–51).
- #1–43 이름·번호·단계·타입 전부 일치. **TM 에볼루션(#33)/디볼루션(#34) 순서 JP 정상**(KR `fix-ma-kr-tm-swap`와 별개).
- 🔧 EX→ex 4장: #2 Mew ex · #3 Fezandipiti ex · #7 Pidgeot ex · #10 Squawkabilly ex.
- ⚠️ **DB 초과 8장(#44–51)**: 基本草~鋼 기본에너지. 공식 리스트(/043)엔 없는 박스 동봉 기본E를 우리 소스가 번호 부여한 것. "기본에너지 차이"(우선순위 낮음) — 유지/삭제 결정 대기.

### 메가심포니아 — `jp-tcg-M1S` (M1S, JP 92장, 동결 `mega-symphonia`) ⚠️
- 번호 92/92, 이름·분류·타입·레어도(MUR까지) 전부 일치. EN링크 갭 1(#71 Alakazam, ja=フーディン). 읽기 전용.
- **단계(진화) 충돌 5건 → 실제 카드 이미지로 검증:**
  - #37 Kadabra(ユンゲラー)=`1進化`, #38 Alakazam(フーディン)=`2進化`, #71 Alakazam(AR)=2進化 → **DB 맞음**, **리스트 단계값이 오타**(Basic로 잘못 표시). DB 조치 없음.
  - #43 Shedinja(ヌケニン)=`1進化`(ツチニンから進化), #72 Shedinja(AR)=1進化 → **DB 오류**(subtypes=["Basic"]). 리스트가 맞음. → 🔧 **`["Basic"]→["Stage 1"]` 교정완료**(승인 후).

### 인페르노X — `jp-mega-infernox` (M2, JP 116장, 동결 `mega-infernox`) ✅
- 6필드 0 불일치(읽기 전용). 116(본탄 80 + 시크릿 36) · 1–116 연속 · 누락·중복 0.
- 레어도 `{C 38·U 26·R 8·RR 8·AR 12·SR 17·SAR 6·MUR 1}` — Bulbapedia·리스트와 **완전 동일**. 타입 9구간 일치(Dragon 없음 정상). 옛 EX 0.
- ℹ️ 일부 ex subtypes 순서 `ex|Stage 2`↔`Stage 2|ex` 혼재 — 표시 무영향, 미수정.

### MEGA 드림 ex — `jp-mega-dream-ex` (M2a, JP 250장, 동결 `mega-dream-ex`) 🔧
- 5필드(명·번호·총장수 250·단계·타입) 일치. MA(메가어택레어)=DB `MAR` 10장 일치.
- 🔧 **레어도 — 하이클래스팩 본탄은 무레어도가 정답.** (Bulbapedia가 InfernoX엔 C/U/R 채우는데 M2a 본탄은 전부 `-` → 무레어도 진짜. 리스트 "—"와 일치. ※ Bulba는 출처 신뢰성 교차검증용, 리스트가 비어 어느 쪽인지 못 가릴 때만 사용.)
  - DB가 본탄 37장에 가짜 레어도 부여:
    - **8장** 시크릿 쌍둥이 레어도가 `Card.rarity`에 오적재 — #6/8/11/35/108/132 AR · #150 SAR · #173 SR. (#150 せいなるはい=Sacred Ash 는 쌍둥이도 없는 순수 버그.)
    - **29장** `RegionCard.rarity=C` 오적재(하이클래스 본탄엔 C 없음).
  - → 37 LC `Card.rarity=NULL` + 29 JP `RegionCard.rarity=NULL`. 검증: Bulbapedia 불일치 0(#101 Crobat ex 는 Bulba 누락·DB RR 이 정답). EN me2pt5(공유 LC 22)·KR 표시 불변.

### 닌자스피너 — `jp-mega-ninja-spinner` (M4, JP 120장, 동결 `mega-ninja-spinner`) ✅
- 6필드 0 불일치(읽기 전용). 120(본탄 83 + 시크릿 37) · 1–120 연속. #31–34 Deoxys 4폼 정상.
- 시크릿 84–120 타입까지 채워져 있음(어비스아이 같은 결측 없음). 옛 EX 0.

### 어비스아이 — `jp-mega-abyss-eye` (M5, JP 118장, 동결 `mega-abyss-eye`) 🔧
- 총장수 118 · 1–118 연속 · 카드명(JP↔EN 종 정합) · 진화단계 · 레어도(C/U/R/RR·AR·SR·SAR·MUR) 일치.
- ⚠️→🔧 **타입 결측**: 시크릿 포켓몬 25장(AR #82–93 · SR ex #94–101 · SAR #112–115 · MUR #118)의 `Card.types` 빈 배열 → 같은 이름 본탄에서 복제 백필. 검증: 포켓몬 타입 빈칸 0 · 시크릿=본탄 100% 일치.

### 스타트덱100 배틀컬렉션 — `jp-tcg-MC` (MC, JP 774장, 동결 `mega-start-deck-100`) 🔧
- 총장수 774 = 본탄 742 + 시크릿 743–766 + 기본E 767–774(리스트 No.1000–1007) · 누락·중복 0.
- supertype 653/106/15(Pokémon/Trainer/Energy) = 리스트 일치 · 전 카드 **무레어도**(스타트덱)=리스트 "—"와 일치 · 타입 10구간 일치 · 포켓몬 타입 빈칸 0.
- 🔧 **`EX`(대문자)→`ex` 115장**: modern ex 가 옛 XY 메커니즘 표기 `EX`로 적재(소문자 정상은 2장뿐). 정규화 후 ex 117·EX 0.

### 블랙볼트 — `jp-tcg-SV11B` (SV11B, JP 174장, 동결 `sv-black-bolt-white-flare`) ✅
- 번호 174/174 · 카드명 · 분류 · 타입 · 진화단계 전부 0 불일치(읽기 전용). EN링크 갭 3(JP단독 프린트).
- 레어도 분포 DB `{C 39·U 31·R 10·RR 6·AR(Illustration Rare) 72·UR(Ultra Rare) 8·SAR(Special Illustration Rare) 7·Black White Rare 1}`.
- ⚠️→🔧 **레어도 오류 — 리서치 검증 후 교정완료(공식=SR)**:
  - #159–166(8): DB `Ultra Rare(UR, tier8)`였던 것 = 오류. **공식 = SR(Super Rare)** 확정 → 🔧 **JP `RegionCard.rarityId` `UR→SR` 교정완료**(M1L과 동일 SR 엔티티).
    - 근거: ① snkrdunk(발매정보) "Zekrom ex [SV11B 161/086] **SR**", #169=SAR 명시 ② tcgcollector 리스트 SR·UR 0장 ③ 시크릿 구성 AR72+SR8+SAR7+BWR1=88(UR 자리 없음) ④ 내부정합: M1L·트윈 SV11W 동일등급은 이미 SR.
    - ★`Card.rarityId`·EN/KR RegionCard은 **미변경** — EN판은 같은 풀아트 ex를 "Ultra Rare"로 부르는 게 정상이라 공유 LC 보존(지역별 레어도 체계 차이).
  - #174 Zekrom ex: 리스트 `BWR` ↔ DB `nameEn="Black White Rare"`(정확) + abbr `R`(cosmetic). **사용자 지시로 보류(유지).**

### 화이트플레어 — `jp-tcg-SV11W` (SV11W, JP 174장, 동결 `sv-white-flare`) ✅
- SV11B(블랙볼트)의 트윈 세트. 번호 174/174 · 카드명(JP 스폿검증: #1 クルミル=Sewaddle·#16 クイタラン=Heatmor·#17 レシラムex=Reshiram ex·#62 サザンドラex=Hydreigon ex…) · 단계 · 타입 전부 **0 불일치**(읽기 전용).
- 레어도 분포 DB `{C 38·U 32·R 11·RR 6·AR 72·SR 8·SAR 7}`. 리스트와 173/174 일치.
  - ✅ **#159–166 SR 정상**(DB=SR=리스트=공식). **트윈 SV11B의 UR 오적재(M11)가 여기엔 없음** — 쌍둥이 세트가 서로 다르게 수집됨(SV11B만 UR 오류).
  - ⚠️ **#174 Reshiram ex(BWR)**: 리스트 `Black White Rare` ↔ DB abbr `R`·category `Holo Rare`. **SV11B #174보다 부정확**(SV11B는 nameEn="Black White Rare" 보유, SV11W는 BWR 정체성 자체가 없음). cosmetic·1장·동결 → 보류(BWR 손볼 때 SV11B와 함께).
- ℹ️ EN(`rsv10pt5` 173장)은 **번호 체계가 JP와 다름**(#16–18에 Litwick→Lampent→Chandelure 라인 삽입 등, 173≠174) → EN-번호 직접대조는 무의미(region 착오, **철회**). 동결 EN/KR 연결이 매핑 담당, JP 앵커 기준 정합.

### 로켓단의 영광 — `jp-sv-destined-rivals` (SV10, JP 132장, 동결 `sv-destined-rivals`) ✅
- **★ JP 전용 대조(사용자 지시) — EN 세트 미조회.** 6필드 전부 **0 불일치**(읽기 전용).
- 132/132 · 1–132 연속 · 누락·중복 0. 단계 0·타입 0·레어도 0 불일치.
- 카드명 JP 스폿검증: #1 クヌギダマ=Pineco · #15 ロケット団のファイヤーex=Team Rocket's Moltres ex · #39 ロケット団のミュウツーex=Team Rocket's Mewtwo ex · #55 レジロックex=Regirock ex · #75 ザマゼンタ=Zamazenta · #132 ジャミングタワー=Jamming Tower.
- 레어도 분포 DB `{C 47·U 33·R 10·RR 8·AR 12·SR 13·SAR 6·UR 3}` = 리스트와 완전 동일.
  - ✅ **#130–132 UR 정상**(DB=UR=리스트). **SV10은 UR 실제 사용 세트** — SV11B의 "UR 오적재"와 달리 여기 UR은 진짜. (M11: 세트별 UR 사용여부가 실제 다르다는 증거.)

### 열풍의 아레나 — `jp-sv-heatwave-arena` (SV9a, JP 92장, **동결**) ✅
- **★ JP 전용 대조(사용자 지시).** 5필드(명·번호·단계·타입·레어도) 전부 **0 불일치**(92/92, 1–92 연속, 누락·중복 0). EN링크 갭 2(JP단독).
- 레어도 분포 DB abbr `{C·U·R·RR·AR·SR·SAR·UR}` = 리스트와 완전 동일.
  - ✅ **#76–84 SR · #85–89 SAR · #90–92 UR 전부 정상**(DB=리스트). **SV9a는 SR·UR 둘 다 쓰는 정상 SV 체계** — DB가 이 세트는 SR/UR을 올바로 구분해 적재(SV11B의 UR 오적재와 대조 → M11 "세트별 개별 검증" 근거 보강).
- 트레이너 관(Ethan's/Cynthia's/Misty's/Arven's …) 카드명·Ogerpon 4가면폼 전부 정합.

### 스타터세트ex 다이고 — `jp-tcg-SVOD` (SVOD, JP, **동결 sv-decks**) ✅
- **★ JP 전용 대조.** DB 21 = 리스트 19장(#1–19) + 기본에너지 2장(#20–21: 基本超·基本鋼).
- #1–19 이름(JP↔EN: ダイゴ=Steven)·번호·단계·타입 전부 **0 불일치**. #19 시크릿 Steven's Beldum 포함.
- 🔧 #7 ダイゴのメタグロスex(Steven's Metagross ex) subtypes `["Stage 2","EX"]→["Stage 2","ex"]`.
- ⚠️ **DB 초과 2장(#20–21)**: 덱 동봉 기본E(초·강철). 공식 /018엔 없음 — "기본에너지 차이"(MA #44–51과 동일, 우선순위 낮음, 유지/삭제 결정 대기).

### 스타터세트ex 마리 — `jp-tcg-SVOM` (SVOM, JP, 동결 `sv-decks`) ✅
- **★ JP 전용 대조(EN 미조회).** DB 21 = 리스트 20장(#1–20) + 기본에너지 1장(#21: 基本悪).
- #1–20 이름(JP↔EN: マリィ=Marnie·オーロンゲ=Grimmsnarl·モルペコ=Morpeko·チョロネコ=Purrloin)·번호·단계·타입·레어도(전부 무레어도) **0 불일치**. #20 시크릿 マリィのモルペコ 포함.
- 🔧 #7 マリィのオーロンゲex(Marnie's Grimmsnarl ex) subtypes `["Stage 2","EX"]→["Stage 2","ex"]` 교정(동결 sv-decks 승인수정).
- ⚠️ **DB 초과 1장(#21)**: 덱 동봉 기본E(悪/Darkness). 공식 /019엔 없음 — "기본에너지 차이"(MA #44–51·SVOD #20–21과 동일, 우선순위 낮음, 유지/삭제 결정 대기).
- ※ 트윈 SVOD(다이고 메타그로스ex 스타터)와 완전 동일 패턴(#7 EX→ex + 동봉 기본E 초과).

### 강화박스 배틀파트너즈 — `jp-tcg-SVN` (SVN, JP, 동결 `sv-goods`) ✅
- **★ JP 전용 대조(EN 미조회).** "배틀 강화 BOX 「배틀파트너즈」". DB 53 = 리스트 45장(#1–45) + 기본에너지 8장(#46–53: 基本草~鋼).
- #1–45 이름(JP↔EN: ミュウ=Mew·キチキギス=Fezandipiti·ピジョット=Pidgeot·イキリンコ=Squawkabilly·ワザマシン=Technical Machine)·번호·단계·타입·레어도(전부 무레어도) **0 불일치**.
- 🔧 ex 4장 `EX→ex`: #1 ミュウex · #2 キチキギスex · #6 ピジョットex · #9 イキリンコex (동결 sv-goods 승인수정).
- ⚠️ **DB 초과 8장(#46–53)**: 덱 동봉 기본E(草~鋼). 공식 /045엔 없음 — "기본에너지 차이"(MA #44–51·SVOD·SVOM과 동일, 우선순위 낮음, 유지/삭제 결정 대기).

### 배틀파트너즈 — `jp-sv-journey-together` (SV9, JP 132장, **동결** `sv-journey-together`) ✅
- **★ JP 전용 대조.** 5필드(명·번호·단계·타입·레어도) 전부 **0 불일치**(132/132, 1–132 연속, 누락·중복 0). EN링크 갭 1(JP단독). **읽기 전용(변경 0).**
- 레어도 분포 abbr `{C·U·R·RR·AR·SR·SAR·UR}` = 리스트 완전 동일. **#113–123 SR · #124–129 SAR · #130–132 UR 전부 정상** — SV9도 SR·UR 둘 다 쓰는 정상 세트(DB 정확).
- 트레이너 관(N's·Iono's·Lillie's·Hop's·Brock's·Iris's) 카드명·Ogerpon 없음·#34 Mr. Mime 등 전부 정합. 옛 EX 0.

### 랜덤 스타트 덱 Generations — `jp-tcg-SVM` (SVM, JP, 동결 `sv-start-deck-generations`) ✅
- **★ JP 전용 대조(EN 미조회).** DB 183 = 리스트 175장(#1–175) + 기본에너지 8장(#176–183: 基本草~鋼).
- #1–175 이름(JP 스폿: ナゾノクサ=Oddish·バシャーモex=Blaziken ex·ザシアンex=Zacian ex·ルギアex=Lugia ex·からておうの稽古=Black Belt's Training·セラピーエネルギー=Therapeutic Energy)·번호·단계·타입·레어도(전부 무레어도) **0 불일치**. 중복카드(Black Belt's Training #143–151 ×9·Professor's Research #162–170 ×9)도 번호별 정합.
- ✅ **ex 전부 소문자 `ex` 정상 — EX→ex 불필요**(SVOD/SVOM/SVN과 달리 이 세트는 올바르게 수집됨). **읽기 전용(변경 0).**
- ⚠️ **DB 초과 8장(#176–183)**: 덱 동봉 기본E(草~鋼). 공식 /175엔 없음 — "기본에너지 차이"(MA·SVN·SVOD·SVOM과 동일, 우선순위 낮음, 유지/삭제 결정 대기).

### 테라스탈페스ex — `jp-sv-prismatic-evolutions` (SV8a, JP 237장, **동결** `sv-prismatic-evolutions`) ✅
- **★ JP 전용 대조. 하이클래스팩.** 5필드 전부 **0 불일치**(237/237, 1–237 연속, 누락·중복 0). **읽기 전용(변경 0).**
- 🔑 **레어도 — 본탄 비-ex 144장 = `None`(무레어도) 엔티티로 올바르게 적재**(M2a 드림ex식 가짜 C/U/R 버그 **없음**). 분포 `{None 144·RR 35·SAR 33·SR 12·ACE 8·UR 5}` = 리스트 "—"/RR/ACE/SR/SAR/UR 카운트 완전 동일.
- **이름검증 강화(종 CSV 폴백)**: EN링크 갭 101장 = 포켓몬 80 + 트레이너/E 21. 포켓몬 80장은 `pokedexNumbers`→`data/pokeapi/pokemon_species_names.csv`(lang1 ja-hrkt·9 en·3 ko)로 **EN명 80/80 해결 + 종-ja명⊆카드ja 자기검증 80/80 통과** → 이름 확정. 잔여 미검증은 **트레이너 21장**(종표 밖, Crispin·Janine's Secret Art 등 SR/SAR)뿐, 번호·등급 정합해 구조적 정상.
- ℹ️ EN RegionCard 링크 자체는 여전히 101장 비어 있음(영문명 폴백용) → 링크 보강은 별도 과제(M2). 단 **대조 검증은 종CSV로 충족**.

### 초전브레이커 — `jp-sv-surging-sparks` (SV8, JP 138장, 동결 `sv-surging-sparks`) ✅
- **★ JP 전용 대조(EN 미조회).** 5필드(명·번호·단계·타입·레어도) 전부 **0 불일치**(138/138, 1–138 연속, 누락·중복 0). **읽기 전용(변경 0).**
- 레어도 분포 DB `{C 52·U 34·R 9·RR 8·ACE 3·AR 12·SR 11·SAR 6·UR 3}` = 리스트 완전 동일. **ACE SPEC(#95·97·98)·UR(#136–138) 정상 적재**(SV11B식 UR 오류 없음).
- ex 전부 소문자 `ex` 정상(EX→ex 불필요). JP명 스폿: タマタマ=Exeggcute·ピカチュウex(RR/SR/SAR/UR 4종)·スクランブルスイッチ=Scramble Switch.

### 스타터세트 파라블레이즈ex — `jp-tcg-SVLS` (SVLS, JP, 동결 `sv-decks`) ✅
- **★ JP 전용 대조(EN 미조회).** "스타터 세트 테라스탈타입:스텔라 「파라블레이즈 ex」". DB 25 = 리스트 22장(#1–22) + 기본에너지 3장(#23–25: 基本炎·超·鋼).
- #1–22 이름(JP↔EN: ロコン=Vulpix·ソウブレイズ=Ceruledge·シンボラー=Sigilyph·パーフェクトミキサー=Brilliant Blender·アカマツ=Crispin)·번호·단계·타입·레어도(전부 무레어도) **0 불일치**.
- 🔧 #6 ソウブレイズex(Ceruledge ex) subtypes `["Stage 1","EX"]→["Stage 1","ex"]` 교정(동결 sv-decks 승인수정).
- ⚠️ **DB 초과 3장(#23–25)**: 덱 동봉 기본E(炎·超·鋼 = 덱 타입 3종). 공식 /022엔 없음 — "기본에너지 차이"(MA·SVN·SVOD·SVOM과 동일, 우선순위 낮음, 유지/삭제 결정 대기).
- ※ 스타터세트ex 계열(SVOD·SVOM)과 동일 패턴(#대표ex EX→ex + 동봉 기본E 초과).

### 스텔라미라클 — `jp-sv-stellar-crown` (SV7, JP 135장, 동결 `sv-stellar-crown`) ✅
- **★ JP 전용 대조(EN 미조회).** 5필드(명·번호·단계·타입·레어도) 전부 **0 불일치**(135/135, 1–135 연속, 누락·중복 0). **읽기 전용(변경 0).**
- 레어도 분포 DB `{C 48·U 34·R 9·RR 8·ACE 3·AR 12·SR 12·SAR 6·UR 3}` = 리스트 완전 동일. **ACE SPEC(#94·96·101)·UR(#133–135) 정상 적재**(SV11B식 UR 오류 없음).
- ex 전부 소문자 `ex` 정상(EX→ex 불필요). JP명 스폿: レディバ=Ledyba·テラパゴスex(RR/SR/SAR/UR 4종)·きらめく結晶=Sparkling Crystal.

### 나이트원더러 — `jp-sv-shrouded-fable` (SV6a, JP 94장, 동결 `sv-shrouded-fable`) 🔧
- **★ JP 전용 대조(EN 미조회).** 명·번호·단계·타입 **0 불일치**(94/94, 1–94 연속, 누락·중복 0). EX(대문자) 0. JP명 스폿: バチュル=Joltik·モモワロウex=Pecharunt ex(RR/SR/SAR/UR 4종).
- 🔧 **레어도 스왑 2장 교정**: #55 ポケバイタルA(Poké Vital A)=공식 **ACE SPEC**인데 DB가 `U`, #56 夜のタンカ(Night Stretcher)=공식 **Uncommon**인데 DB가 `ACE` → **둘이 뒤바뀜**. 카드명·위치는 정상, JP `RegionCard.rarityId`만 서로 스왑돼 있던 것 → 교정(승인수정). 나머지 ACE(#54·63)·UR(#92–94) 정상.
- ℹ️ DB의 ACE SPEC 레어도 엔티티(`yeo2gb`)는 code="ACE SPEC Rare"인데 category가 "Ultra Rare"(ultra_rare)로 묶임 — 전 ACE 카드 공통(전역 택소노미), 이 버그와 무관·미변경.

### 배틀마스터덱 테라스탈리자몽ex — `jp-tcg-SVJL` (SVJL, JP, 동결 `sv-decks`) ✅
- **★ JP 전용 대조(EN 미조회).** "배틀 마스터 덱 「테라스탈 리자몽 ex」". DB 22 = 리스트 21장(#1–21) + 기본에너지 1장(#22: 基本炎).
- #1–21 이름(JP↔EN: ヒトカゲ=Charmander·かがやくリザードン=Radiant Charizard·リザードンex=Charizard ex·アルセウスVSTAR=Arceus VSTAR)·번호·**단계(Arceus V=`Basic|V`·VSTAR 정상)**·타입·레어도(전부 무레어도) **0 불일치**.
- 🔧 #6 リザードンex(Charizard ex) subtypes `["Stage 2","EX"]→["Stage 2","ex"]` 교정(EX→ex 자동승인).
- ⚠️ **DB 초과 1장(#22)**: 덱 동봉 기본E(炎). 공식 /021엔 없음 — "기본에너지 차이"(MA·SVN·SVOD·SVOM·SVLS와 동일, 우선순위 낮음).

### 크림슨헤이즈 — `jp-sv-crimson-haze` (SV5a, JP 96장, 동결 `sv-crimson-haze`) 🔧
- **★ JP 전용 대조(EN 미조회).** "스칼렛&바이올렛 강화확장팩 「크림슨헤이즈」". 본탄 66 + 시크릿 30 = 96/96. JP명 확인(モンジャラ=Tangela·カイロス=Pinsir·ガチグマ アカツキex=Bloodmoon Ursaluna ex).
- 카드명(포켓몬 종CSV 양방향: EN리스트↔dex·dex↔JP자기검증 전부 통과)·번호·총장수·진화단계·타입 **0 불일치**. ex 표기도 전부 소문자 정상(EX→ex 불필요).
- 🔧 **ACE SPEC/Uncommon 오배정 4 LC 전 계층 교정**(M11): 실제 SV5a ACE SPEC은 #53 언페어스탬프·#55 하이퍼아로마·#59 서바이브깁스 3장. DB는 #53·#59를 U로, #58 러브볼·#60 럭키멧을 ACE로 뒤바꿔 적재 → `Card.rarity`+JP/EN/KR `RegionCard.rarity` 전부 교정. #55는 ACE 정상.
  - **3국 동일 오류**: EN(sv6 Twilight Masquerade)·KR도 같은 값이 틀려, SV11B/SV6a(JP만 오류)와 달리 전 계층 일괄. 두 동결팩(`sv-crimson-haze`+`sv-twilight-masquerade`) `--allow-protected`. 연결·번호·이름 불변, rarityId만.
  - KR(`kr-sv5a`)은 트레이너 번호가 가나다 재배열(KR#53=Enhanced Hammer=JP#54 등)이나 **LC 연결은 정체성 정확** — 번호 재배열은 정상.

### 스타터덱&빌드세트 미래의 미라이돈ex — `jp-tcg-SVHM` (SVHM, JP, 동결 `sv-decks`) 🔧
- **★ JP 전용 대조(EN 미조회), pack-list-check 스킬 첫 적용.** "スターターデッキ＆ビルドセット「未来のミライドンex」". DB 61 = 리스트 53(#1–53) + 동봉 기본E 8장(#54–61: 草炎水雷超闘悪鋼). JP명 확인(ネオラントV=Lumineon V·マナフィ=Manaphy·テツノカイナ=Iron Hands·ミライドンex).
- 카드명(포켓몬 종CSV 양방향)·번호·총장수·진화단계·타입 **0 불일치**. **덱 제품이라 전 카드 무레어도**(리스트 `—`=DB null, 일치).
- 🔧 #11 ミライドンex(Miraidon ex)·#14 ピジョットex(Pidgeot ex) subtypes `EX→ex`(자동승인).
- ⚠️ **DB 초과 8장(#54–61)**: 덱 동봉 기본E. "기본에너지 차이"(MA·SVN·SVOD·SVOM·SVLS·SVJL 동일, 우선순위 낮음).
- ℹ️ **엔진 보강**: 덱 리스트 전체 `—`(무레어도)에 대해 리스트 `—`/빈값 ↔ DB 양 계층 null을 "무레어도 일치"로 정규화하도록 `compare-list.ts` 갱신(허위 53건 방지). sv5a 회귀검증 0.

| # | 패턴 | 관측 | 해결방향 |
|---|---|---|---|
| M1 | **modern ex 가 옛 `EX` 로 라벨** | MP1·MBD·MBG·MA·SVOD·SVOM·SVN·SVLS·SVJL 15장 + **MC(SD100) 115장** = **10팩 130장**(전부 교정함, EX→ex는 자동승인) | 전 세트 일괄 스윕: SV/메가 + 이름 소문자 "ex"로 끝나는 카드 `EX→ex`(옛 진짜 EX 시대 제외) |
| M2 | **AR 시크릿 EN 정체성 링크 누락** | me3 #89 Tyrunt · M1L #68 Riolu | EN 페어 LC 연결(영문명 폴백 복구) |
| M3 | **JP 스타트덱/프로모 게임데이터 결측** | MP1(21/23 비었던 상태, 백필함) | 리스트/공식 기준 백필 |
| M4 | **프로모 그랩백 미수집** | M-P 70/123 | Limitless JP 수집 패스 |
| M5 | **덱/박스 동봉 기본에너지 초과수집** | MA #44–51 · SVN #46–53 · SVOD #20–21 · SVOM #21 · SVLS #23–25 · SVJL #22 · **SVHM #54–61** · SVM #176–183 | tcgcollector 미표시 동봉 기본E — 유지/삭제 정책 결정(우선순위 낮음) |
| M6 | **DB 진화단계(subtypes) 오류** | M1S Shedinja #43·#72 (Basic→Stage1, 이미지검증) | 개별 교정(동결이라 승인 후) |
| M7 | **리스트(tcgcollector JP) 단계값 오타** | M1S Kadabra·Alakazam(#37·#38·#71) Basic 오표시 | 리스트 측 오류 — DB 조치 없음, 대조 시 주의 |
| M8 | **시크릿 포켓몬 `types` 결측** | M5 어비스아이 25장(AR/SR ex/SAR/MUR) | 본탄에서 복제 백필(교정함). 닌자스피너(M4)는 정상 |
| M9 | **하이클래스팩 본탄에 가짜 레어도** | M2a 37장(`Card.rarity` 8 + `RegionCard.rarity=C` 29) | 무레어도화(교정함). **다른 MEGA 하이클래스팩 전반 의심** |
| M10 | **레어도는 RegionCard.rarity ?? Card.rarity 폴백** | M2a — RC=NULL이면 LC값이 표시(공유 LC라 지역별 다른 레어도 함정) | 인쇄본별은 RC.rarity, 수정 시 EN/KR RC.rarity 채워졌는지 확인 후 LC 손댐 |
| M11 | **레어도 오적재(세트 수집 오류)** | ① SV11B #159–166: 공식 SR인데 DB가 UR로 적재(리서치 검증완·교정, **JP만**). **트윈 SV11W는 SR 정상**. #174 BWR cosmetic. ② **SV6a #55↔#56 레어도 스왑**(Poké Vital A=ACE↔Night Stretcher=U 뒤바뀜·교정, **JP만**). ③ **SV5a ACE SPEC 4건 오배정**(#53·59 U→ACE, #58·60 ACE→U): **JP/EN/KR+Card 전부 동일오류** → 전 계층 교정. | 리스트+공식 대조로 건건 검증 후 교정. 오류 범위가 **JP만**(SV11B·SV6a)일 수도 **3국 전부**(SV5a)일 수도 있으니 RC 전 계층 확인. **SV 레어도 오류는 SV11B·SV6a·SV5a 3건**(나머지 SV7·SV8·SV8a·SV9·SV9a·SV10·SV11W 정상) |

---

## 부록: M-P 미수집 53장

> 리스트 자체도 052·077~084·128~130 결번. 목표 총량 123장.

- **#53–65 (13)** 트레이너/GX/특수E: Arven · Dedenne-GX · Spiritomb · Bunnelby · Special Charge · Trainers' Mail · Battle Compressor · VS Seeker · Field Blower · Float Stone · Plumeria · Parallel City · Double Dragon Energy
- **#87–94 (8)** 기본에너지 블록 (풀~강철) *(우선순위 낮음)*
- **#101–127 (27)** 스타터 포켓몬 프로모(1~9세대): Bulbasaur · Charmander · Squirtle · Chikorita · Cyndaquil · Totodile · Treecko · Torchic · Mudkip · Turtwig · Chimchar · Piplup · Snivy · Tepig · Oshawott · Chespin · Fennekin · Froakie · Rowlet · Litten · Popplio · Grookey · Scorbunny · Sobble · Sprigatito · Fuecoco · Quaxly
- **#131–132 (2)** Pikachu ex ×2
- **#500–502 (3)** Victory Symbol (No.500~502)

---

## 사용자 결정 대기
1. **M-P 53장 수집** 여부(또는 핵심 45만 / 워크리스트만).
2. **[M1] EX→ex 전수 스윕** 실행 여부(현재는 점검한 팩만 개별 교정).
3. **MP1 트레이너 세부 subtype** 채우기.
4. **[M2] AR EN링크 갭** 일괄 점검.
5. **[M5] MA 기본에너지 8장(#44–51)** 유지 vs 삭제.
6. ~~[M6] M1S Shedinja #43·#72 단계 교정~~ → ✅ 완료(이번 세션).
7. **[M9] 다른 MEGA 하이클래스팩 무레어도 점검** — M2a 같은 가짜 레어도(`Card.rarity`/`RegionCard.rarity=C`) 적재 여부 전수 확인.
8. **[M1] EX→ex 전수 스윕에 MC 포함** — SD100에서 115장 추가 확인됨(이미 교정). 잔여 세트 일괄 스윕 검토.
9. ~~[M11] SV11B #159–166 UR→SR 교정~~ → ✅ 완료(이번 세션, JP RegionCard 8장).
10. **[M11-BWR] BWR cosmetic 보류 중** — 사용자 지시로 미교정. 나중에 일괄: SV11B #174 abbr `R`→`BWR`, **SV11W #174는 category까지 `Holo Rare`→`Black White Rare`로 더 손봐야 함**.
