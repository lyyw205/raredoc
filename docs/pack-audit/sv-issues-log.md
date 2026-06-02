# SV 시리즈 점검 — 이슈 집계 로그

> SV(스칼렛&바이올렛) 전 팩을 순차 점검하며 발견한 이슈를 누적 기록.
> 점검 정책: **감사 + 안전 in-DB 수정 + 이슈로그**. 대량 재수집(JP 시크릿·EN 게임데이터 등)은 여기 모아 **나중 전담 패스**로 처리.
> 각 팩 상세는 `docs/pack-audit/sv-*.md`. 진행 시작: 2026-05-31 (sv-destined-rivals부터).

---

## 0. 캠페인 요약 (2026-05-31 — SV 17팩 전수 완료)

**완료 17팩**: destined-rivals · base · 151 · paldea-evolved · obsidian-flames · paradox-rift · paldean-fates · temporal-forces · shrouded-fable · stellar-crown · surging-sparks · prismatic-evolutions · journey-together · crimson-haze · heatwave-arena · raging-surf · paradise-dragona.

**적용된 안전수정(전팩 공통)**: namu 한글명·레어도 정본화 · JP cardCount 0→실적재수 · 빈 KR 껍데기 17개 삭제 · 🔧 namu 파서 다중표 버그 수정 + 오염 7팩 재동기화.

### ⚠ 사용자 결정 대기 (재수집/구조 변경)
1. ~~**[P16] 이전 세션 namu 오염 → 타 시리즈 재점검**~~: ✅ **완료(2026-05-31) — MEGA 6팩·BBWF 전부 오염 없음.** KR nameKo를 JP 원본명과 1:1 대조 검증(이상해씨=フシギダネ, 뚜벅쵸=ナゾノクサ 등 일치). 해당 팩 namu 페이지는 단일표라 구 파서로도 정상. 추가 수정 불필요.
2. ~~**[P8] sv-base 과대 그룹화**~~: ✅ **해결(2026-05-31)** — 부속상품을 별 setGroup으로 분리(아래 P17). sv-base 등 본확장 그룹은 이제 JP+EN+KR 본세트만 보유.
3. **[P17] 서브제품 본세트 LC 오그룹화 + 별도 그룹화**: ✅ **2026-05-31 완료**
   - (a) **언그룹**: 오그룹 8종(kr-svf/svjp/svel/svjl/svn/svom/svod/svd) 238장을 전용 빈 LogicalCard로 분리 → 잘못된 본세트 카드명 표시 중단(이제 placeholder名). `scripts/ungroup-sv-subproducts.ts`.
   - (b) **별도 setGroup화**: 부속상품 17종을 타입별 신규 그룹 4개(era=`SV-SP`)로 이동 — `sv-starter-decks`/`sv-battle-decks`/`sv-battle-boxes`/`sv-special-sets`. `scripts/regroup-sv-subproducts.ts`. dex `ERA_FULL`에 "SV-SP" 라벨 추가.
   - **남은 일**: 제품별 실제 수록목록 재수집(pokemoncard.co.kr) 후 올바른 카드로 재매핑(이름·게임데이터). 현재는 placeholder名.
4. **[P14] 레어도 RMAP 확장**: S(샤이니)/SSR 등 미매핑 — SSR=Super/Ultra/Secret 의미 확정 후 일괄.
5. **[P2/P15] JP 데이터 결손 재수집**: paldean-fates(0)·temporal-forces(49)·destined-rivals(시크릿 없음) 등 TCGdex 재임포트.
6. **[P1] EN 게임데이터 재수집**: 다수 EN 세트가 rarity·image만(hp/attacks/abilities 없음).
7. **[P9] KR 스타터/박스 제품 pokemoncard.co.kr 재수집** (placeholder名).

---

## A. 반복되는 cross-cutting 패턴 (여러 팩 공통 예상)

> 새 팩에서 같은 패턴 발견 시 여기 카운트만 갱신하고 팩 문서에 한 줄 링크.

| # | 패턴 | 근본원인(가설) | 해결방향 | 관측 팩 |
|---|---|---|---|---|
| P1 | **EN 세트 게임데이터 없음** (hp/attacks/abilities null, rarity·illustrator·image만) → supertype 오분류 다수 | EN은 pokemontcg.io에서 시세/이미지 위주 수집, 게임데이터 미수집 | EN 게임데이터 재수집 or 이름기반 EN↔JP 그룹화 | sv-destined-rivals |
| P2 | **JP 시크릿 레어 미수집** (정규세트만 적재) | TCGdex JP 임포트가 정규 번호까지만 | TCGdex 재임포트(시크릿 포함) | sv-destined-rivals |
| P3 | **KR CardLocale.name placeholder** ("SV10 N" 등) | KR 초기 수집이 번호만, 이름 미수집 | namu 정본화는 CardText(ko)/nameKo만 갱신 → 표시는 OK(옵션 C), 원본 placeholder 잔존 | sv-destined-rivals |
| P4 | **pokedexNumbers 희소** | 수집 시 미채움 | PokeAPI 보강(`fill-pack-pokeapi.ts`) | sv-destined-rivals |
| P5 | **abilities 0 · flavorText 0 · CardText(ja) 0** (전 지역) | 미수집 | TCGdex/Bulbapedia 보강 | sv-destined-rivals |
| P6 | **provenance(ExternalIdMapping) 거의 없음** | sync 시 출처ID 미기록 | 출처별 매핑 백필 | sv-destined-rivals |
| P7 | **EN↔JP 번호체계 불일치** (EN 알파벳순 자체번호) | EN 세트 독립 번호 | 이름기반 매칭 필요(numberInt 그룹화 금지) | sv-destined-rivals |
| P8 | **과대 그룹화** (본확장 + KR 스타터/스페셜 제품 동거) | 초기 number-merge로 별제품 흡수 | 별 setGroup 분리 (사용자 결정 필요) | sv-base |
| P9 | **KR 스타터/스페셜 제품 placeholder名** ("SVD N") | namu 표 부재, 공식 미수집 | **pokemoncard.co.kr 공식 재수집** | sv-base |
| P10 | **KR releaseDate epoch(1970)** | 초기 수집 시 날짜 미입력 | 권위 출처로 일괄 정정 | sv-base |
| P11 | **JP rarity 부분 결측** | TCGdex 일부 카드 rarity 없음 | TCGdex/이미지 보강 | sv-base(156/216)·sv-151(183/210)·paldea-evolved(142/198)·obsidian(111/141) |
| P12 | **namu 다중표 페이지 오염** (본세트+서브표 같은번호 → 덮어쓰기) | 파서가 모든 표의 <tr> 수집 | **🔧 해결됨**: `sync-pack-namu-ko.ts` 최대 분모 행만 채택 | obsidian-flames(흑염) |
| P13 | **KR 배틀강화BOX/서브제품 자체번호** (본세트 namu 번호와 불일치) | 박스/덱 제품 독립 넘버링 | pokemoncard.co.kr 별도 수집 | obsidian(kr-svf)·paradox(svhk/svhm) |
| P14 | **namu 레어도코드 미매핑** (S/SSR 등 샤이니·신규) | RMAP 미수록 | **수집 후 일괄 RMAP 확장**(SSR 의미 확정 필요) | paldean-fates(S,SSR) |
| P15 | **JP 세트 데이터 전무** (0장, placeholder만) | TCGdex JP 임포트 누락 | TCGdex 임포트 | paldean-fates·shrouded-fable |
| P16 | **⚠ 이전 세션 namu 동기화 다중표 오염** (P12 버그 적용 전 동기화된 팩) | 구 파서로 동기화된 기존 ko 데이터 (오염 시 #1이 "이상해씨/디그다..." 식 도감표로 치환됨) | 수정 파서로 재동기화(스폿체크로 탐지) | shrouded-fable·stellar-crown·surging-sparks·prismatic-evolutions·journey-together(잔재)·crimson-haze — **타 시리즈(MEGA/BBWF 등)도 재점검 권장** |
| P18 | **supertype 오분류: Pokémon ex가 Trainer로** (hp 보유한 Trainer) | TCGdex 소스 분류 오류 | supertype 재판정 | prismatic-evolutions(#93+) |
| P17 | **서브제품 본세트 LC 오그룹화** (덱/박스가 numberInt로 본세트 LC 흡수 → 본세트 카드명 잘못 표시) | 초기 number-merge | ✅ 언그룹 임시조치 완료(238장, `ungroup-sv-subproducts.ts`). 남은: 제품별 재수집 후 재매핑 | shrouded-fable·stellar-crown·journey-together·obsidian·base(svf/svjp/svel/svjl/svn/svom/svod/svd) |

---

## B. 팩별 이슈

### sv-destined-rivals (ロケット団の栄光 / Destined Rivals / 로켓단의 영광) — 2026-05-31
상세: [sv-destined-rivals.md](./sv-destined-rivals.md)

**안전수정 완료**: namu 한글명/레어도 129장 · JP cardCount 0→98 · kr-sv10 releaseDate epoch→2025-06-20 · 빈 껍데기 `kr-sv-destined-rivals` 삭제.

**남은 이슈(재수집/검증 대기)**:
- [P2] JP 시크릿 미수집 (정규 098만; EN 244·namu 132에 시크릿 존재)
- [P1] EN `sv10` 게임데이터 0 (242 LC hp/attacks null; supertype 오분류 208)
- [P7] EN↔JP 번호 불일치로 EN 그룹화 보류
- **KR 누락 [41,42,85]** — namu 132행 중 3장 DB 부재 (KR 전용/번호공백 여부 확인 필요)
- **KR 시크릿 34장 → EN(sv10) 그룹 매핑 정확성 미검증**
- [P3][P4][P5][P6] cross-cutting 해당

### sv-base (스칼렛 ex/바이올렛 ex + KR 스타터 7종) — 2026-05-31
상세: [sv-base.md](./sv-base.md)

**안전수정 완료**: namu 한글명/레어도 kr-sv1s 107 + kr-sv1v 105 · JP cardCount 0→216 · 빈 껍데기 `kr-sv-base` 삭제.

**남은 이슈**:
- [P8] **과대 그룹화** — KR 스타터/스페셜 7종(svd/svg/svb/sva/svc/svem/svp1) 동거 → 별 setGroup 분리 검토 (**사용자 결정 대기**)
- [P9] KR 스타터 7종 placeholder名 → pokemoncard.co.kr 재수집
- [P10] KR 전 세트 releaseDate epoch
- [P11] JP rarity 156/216 (60장 결측)
- [P1] EN sv1 게임데이터 0 (supertype 오분류 209)
- 누락번호: kr-svd[56]·kr-sv1v[36,68,85]·kr-svg[4,23]·kr-sv1s[37]·kr-svem[8]
- [P4][P5][P6] cross-cutting 해당

### sv-151 (ポケモンカード151 / 151 / 포켓몬 카드 151) — 2026-05-31
상세: [sv-151.md](./sv-151.md)

**안전수정 완료**: namu 한글명/레어도 210장(0-noMatch) · JP cardCount 0→210. (KR이 JP LC 그룹화 상태라 JP ko도 동시 채워짐)

**남은 이슈**:
- KR 이미지 8장 결측(202/210)
- supertype 오분류 #154–156 전 지역 (Trainer인데 hp60 — 데이터 오류)
- [P11] JP rarity 183/210
- [P4][P5][P6] cross-cutting

### sv-paldea-evolved (스노해저드+클레이버스트) — 2026-05-31
상세: [sv-paldea-evolved.md](./sv-paldea-evolved.md)

**안전수정 완료**: namu kr-sv2p 99「스노해저드」+ kr-sv2d 99「클레이버스트」(각 0-noMatch) · JP cardCount 0→198 · 빈 껍데기 `kr-sv-paldea-evolved` 삭제.
**namu 제목 함정**: 「스노해저드」 공백 없음만 적중.

**남은 이슈**:
- [P1] EN sv2 게임데이터 0 (supertype 오분류 238)
- [P11] JP rarity 142/198
- [P9] kr-svp2 12장 placeholder名
- [P4][P5][P6] cross-cutting

### sv-obsidian-flames (黒炎の支配者 / 흑염의 지배자) — 2026-05-31
상세: [sv-obsidian-flames.md](./sv-obsidian-flames.md)

**안전수정 완료**: namu kr-sv3 136(「흑염의 지배자」, 파서 수정 후 141행 5-noMatch) · JP cardCount 0→141 · 빈 껍데기 `kr-sv-obsidian-flames` 삭제 · **🔧 sync-pack-namu-ko.ts 다중표 버그 수정[P12]**.

**남은 이슈**:
- [P13] kr-svf 배틀강화BOX 자체번호 → 별도 수집
- [P1] EN sv3 게임데이터 0 (supertype 오분류 202)
- [P11] JP rarity 111/141
- KR 누락 [42,45,58,93,113]
- [P4][P5][P6] cross-cutting

### sv-paradox-rift (고대의 포효+미래의 일섬) — 2026-05-31
상세: [sv-paradox-rift.md](./sv-paradox-rift.md)

**안전수정 완료**: namu kr-sv4k 91「고대의 포효」+ kr-sv4m 92「미래의 일섬」 · JP cardCount 0→190 · 빈 껍데기 `kr-sv-paradox-rift` 삭제.

**남은 이슈**:
- [P13] kr-svhk/kr-svhm 스타터덱&강화세트 자체번호 → 별도 수집
- [P1] EN sv4 게임데이터 0
- JP supertype #59 Trainer/hp120 데이터 오류
- KR 누락: sv4k[8,10,46,68]·sv4m[22,55,84]·svhk[2,14]·svhm[13]
- [P4][P5][P6][P11] cross-cutting

### sv-paldean-fates (シャイニートレジャーex / 샤이니트레저 ex) — 2026-05-31
상세: [sv-paldean-fates.md](./sv-paldean-fates.md)

**안전수정 완료**: namu kr-sv4a 344「샤이니트레저 ex」(360행, rarity 205/344) · 빈 껍데기 `kr-sv-paldean-fates` 삭제. (JP placeholder는 유지)

**남은 이슈**:
- [P15] **JP 데이터 전무** (jp-sv-paldean-fates 0장)
- [P14] KR rarity 미매핑 S/SSR (205/344)
- [P1] EN·KR 게임데이터 0
- KR 누락 16장
- [P4][P5][P6] cross-cutting

### sv-temporal-forces (와일드포스+사이버저지) — 2026-05-31
상세: [sv-temporal-forces.md](./sv-temporal-forces.md)

**안전수정 완료**: namu kr-sv5k 98「와일드포스(포켓몬 카드 게임)」+ kr-sv5m 97「사이버저지」 · JP cardCount 0→49(불완전) · 빈 껍데기 `kr-sv-temporal-forces` 삭제.
**namu 제목 함정**: 와일드포스는 디스앰비그 접미어 「(포켓몬 카드 게임)」 필수.

**남은 이슈**:
- [P2] **JP 合本 심각 불완전** (49장, ~141 누락)
- [P1] EN sv5 게임데이터 0
- KR 누락: sv5k[6,56]·sv5m[34,58,59]
- [P4][P5][P6][P11] cross-cutting

### sv-shrouded-fable (ナイトワンダラー / 나이트원더러) — 2026-05-31
상세: [sv-shrouded-fable.md](./sv-shrouded-fable.md)

**안전수정 완료**: 🔧 **kr-sv6a 이전세션 오염 정정**(다중표 namu, #1 이상해씨→파쪼옥) 수정파서 재동기화 93장 · 빈 껍데기 `kr-sv-shrouded-fable` 삭제.

**남은 이슈**:
- [P16] **이전 세션 namu 오염 발견** → MEGA/BBWF 등 기존 완료팩도 재점검 권장
- [P17] kr-svjp(덱) 본세트 LC 오그룹화 → un-merge + 재수집
- [P15] JP 데이터 전무
- [P1] EN sv6pt5 게임데이터 0
- KR 누락 [29]
- [P4][P5][P6] cross-cutting

### sv-stellar-crown (ステラミラクル / 스텔라미라클) — 2026-05-31
상세: [sv-stellar-crown.md](./sv-stellar-crown.md)

**안전수정 완료**: 🔧 **kr-sv7 이전세션 오염 정정**(#1 이상해씨→레디바) 재동기화 130 · JP cardCount 0→135 · 빈 껍데기 `kr-sv-stellar-crown` 삭제.

**남은 이슈**:
- [P17] kr-svel/kr-svjl 본세트 LC 오그룹화
- [P1] EN sv7 게임데이터 부분 결측
- KR 누락 [2,18,85,103,116]
- [P4][P5][P6] cross-cutting

### sv-surging-sparks (超電ブレイカー / 초전브레이커) — 2026-05-31
상세: [sv-surging-sparks.md](./sv-surging-sparks.md)

**안전수정 완료**: 🔧 **kr-sv8 이전세션 오염 정정**(#1 이상해씨→아라리) 재동기화 138(0-noMatch) · JP cardCount 0→106 · 빈 껍데기 `kr-sv-surging-sparks` 삭제.

**남은 이슈**:
- [P1] EN sv8 게임데이터 부분 결측
- [P4][P5][P6] cross-cutting

### sv-prismatic-evolutions (テラスタルフェスex / 테라스탈 페스타 ex) — 2026-05-31
상세: [sv-prismatic-evolutions.md](./sv-prismatic-evolutions.md)

**안전수정 완료**: 🔧 **kr-sv8a 이전세션 오염 정정**(#50 디그다→오거폰 ex) 재동기화 231 · JP cardCount 0→237 · 빈 껍데기 `kr-sv-prismatic-evolutions` 삭제.

**남은 이슈**:
- [P18] supertype 오분류 #93+ (Pokémon ex→Trainer)
- KR rarity 89/231 (namu 표 레어도 공백)
- [P1] EN 게임데이터 부분
- KR 누락 [1,39,51,52,129,209]
- [P4][P5][P6] cross-cutting

### sv-journey-together (バトルパートナーズ / 배틀파트너즈) — 2026-05-31
상세: [sv-journey-together.md](./sv-journey-together.md)

**안전수정 완료**: namu kr-sv9 127「배틀파트너즈」(#1 이상해씨 잔재→캐터피) · JP cardCount 0→132 · 빈 껍데기 `kr-sv-journey-together` 삭제.

**남은 이슈**:
- [P13/P17] kr-svn/svom/svod 서브제품 검증·재수집
- [P1] EN sv9 게임데이터 0
- KR 누락 [27,41,42,81,105]
- [P4][P5][P6] cross-cutting

### sv-crimson-haze (クリムゾンヘイズ / 크림슨헤이즈) — 2026-05-31 (JP/KR전용)
상세: [sv-crimson-haze.md](./sv-crimson-haze.md)

**안전수정 완료**: 🔧 kr-sv5a 오염 정정(#1 이상해씨→덩쿠리) 재동기화 96(0-noMatch) · JP cardCount 0→96 · 빈 껍데기 삭제.
**남은 이슈**: [P4][P5][P6] cross-cutting만.

### sv-heatwave-arena (熱風のアリーナ / 열풍의 아레나) — 2026-05-31 (JP/KR전용)
상세: [sv-heatwave-arena.md](./sv-heatwave-arena.md)

**안전수정 완료**: 🔧 kr-sv9a 오염 정정(#1 이상해씨→심향의 쁘사이저) 재동기화 87 · JP cardCount 0→92 · 빈 껍데기 삭제.
**남은 이슈**: KR 누락 [36,44,80,87,91] · [P4][P5][P6] cross-cutting.

### sv-raging-surf (レイジングサーフ / 레이징서프) — 2026-05-31 (JP/KR전용)
상세: [sv-raging-surf.md](./sv-raging-surf.md)

**안전수정 완료**: 🔧 kr-sv3a 오염 정정(#1 이상해씨→눈여아 ex) 재동기화 90 · JP cardCount 0→92 · 빈 껍데기 삭제.
**남은 이슈**: KR 누락 [7,64] · [P4][P5][P6] cross-cutting.

### sv-paradise-dragona (楽園ドラゴーナ / 낙원드래고나) — 2026-05-31 (JP/KR전용)
상세: [sv-paradise-dragona.md](./sv-paradise-dragona.md)

**안전수정 완료**: 🔧 kr-sv7a 오염 정정(#1 이상해씨→아라리) 재동기화 91 · JP cardCount 0→94 · 빈 껍데기 삭제.
**남은 이슈**: KR 누락 [6,18,67] · [P4][P5][P6] cross-cutting.

## ✅ 서브제품 [P17] 전역 점검 결과 (2026-06-01)
전역 크로스-그룹 머지 스캔 결과 **SV 서브제품(kr-svln/svls/svk 등)은 같은 sv-decks/sv-goods 그룹 내 정당한 JP쌍** → 오그룹 아님, 무수정. (단 kr-smd는 SM 제품이 sv-decks로 라벨됨 → SM9 LC에서 언머지함, sm-decks 정정 권장.) 상세: [swsh-issues-log.md](./swsh-issues-log.md) 전역 언머지 항목.
