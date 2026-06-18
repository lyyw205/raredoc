# SWSH(소드·실드) 시리즈 점검 — 이슈 집계 로그

> 소드·실드 era(`S (소드·실드)`, 39 setGroup)를 **최신→과거 역순**으로 순차 점검하며 발견한 이슈를 누적 기록.
> 점검 정책(SV와 동일): **감사 + 안전 in-DB 수정 + 이슈로그**. 대량 재수집(JP 게임데이터·EN 게임데이터 등)은 모아 **나중 전담 패스**.
> EN 전용 서브셋/프로모도 본확장과 동일 깊이로 점검(나무위키는 한국 발매팩에만 적용).
> 각 팩 상세는 `docs/pack-audit/swsh-*.md`. 진행 시작: 2026-05-31 (Crown Zenith GG부터).
> SV 시리즈 cross-cutting 패턴 정의는 [sv-issues-log.md](./sv-issues-log.md) 참조 (P1~P18 동일 적용).

---

## 진행 현황
| # | setGroup | 팩 | 상태 | 문서 |
|--:|---|---|---|---|
| 1 | og-swsh12pt5gg | Crown Zenith Galarian Gallery (EN전용) | ✅ 건강(safe fix 불필요) | [swsh-crown-zenith-gg.md](./swsh-crown-zenith-gg.md) |
| 2 | og-s12a | VSTAR 유니버스 / Crown Zenith(EN) | ✅ namu 정본화 | [swsh-vstar-universe.md](./swsh-vstar-universe.md) |
| 3 | og-swsh12tg | Silver Tempest Trainer Gallery (EN전용) | ✅ 건강(safe fix 불필요) | [swsh-silver-tempest-tg.md](./swsh-silver-tempest-tg.md) |
| 4 | og-s12 | 패러다임트리거 | ✅ namu 정본화 (+kr-so [P17]) | [swsh-paradigm-trigger.md](./swsh-paradigm-trigger.md) |
| 5 | og-swsh11tg | Lost Origin Trainer Gallery (EN전용) | ✅ 건강(safe fix 불필요) | [swsh-lost-origin-tg.md](./swsh-lost-origin-tg.md) |
| 6 | og-s11a | 백열의 아르카나 | ⚠ namu 정본화(kr-s11a) + **구조문제** | [swsh-incandescent-arcana.md](./swsh-incandescent-arcana.md) |
| 7 | og-swsh10tg | Astral Radiance Trainer Gallery (EN전용) | ✅ 건강 | [swsh-astral-radiance-tg.md](./swsh-astral-radiance-tg.md) |
| 8 | og-s10b | Pokémon GO | ✅ namu 정본화(92) | [swsh-pokemon-go.md](./swsh-pokemon-go.md) |
| 9 | og-s10a | 다크판타스마 | ✅ namu 정본화(95) | [swsh-dark-phantasma.md](./swsh-dark-phantasma.md) |
| 10 | og-s10d | 타임게이저 | ✅ namu 정본화(88, +kr-sj [P17]) | [swsh-time-gazer.md](./swsh-time-gazer.md) |
| 11 | og-s10p | 스페이스저글러 (JP단독) | ✅ namu 정본화(88) | [swsh-space-juggler.md](./swsh-space-juggler.md) |
| 12 | og-swsh9tg | Brilliant Stars Trainer Gallery (EN전용) | ✅ 건강 | [swsh-brilliant-stars-tg.md](./swsh-brilliant-stars-tg.md) |
| 13 | og-s9a | 배틀리전 | ✅ namu 정본화(87) | [swsh-battle-region.md](./swsh-battle-region.md) |
| 14 | og-s9 | 스타버스 | ✅ namu 정본화(125, +서브 3종 [P17]) | [swsh-star-birth.md](./swsh-star-birth.md) |
| 15 | og-s8b | VMAX 클라이맥스 | ✅ namu 정본화(270) | [swsh-vmax-climax.md](./swsh-vmax-climax.md) |
| 16 | og-s8a | 25th ANNIVERSARY / Celebrations(EN) | ✅ namu 정본화(23) | [swsh-25th-anniversary.md](./swsh-25th-anniversary.md) |
| 17 | og-cel25c | Celebrations: Classic Collection (EN전용) | ✅ 건강(22/25) | [swsh-celebrations-classic.md](./swsh-celebrations-classic.md) |
| 18 | og-s8 | 퓨전아츠 | ✅ namu 정본화(129, +kr-sp5 [P17]) | [swsh-fusion-arts.md](./swsh-fusion-arts.md) |
| 19 | og-s7r | 창공스트림 (KR없음) | ✅ namu 정본화(90) | [swsh-blue-sky-stream.md](./swsh-blue-sky-stream.md) |
| 20 | og-s7d | 마천퍼펙트 | ✅ namu 정본화(90) | [swsh-skyscraping-perfect.md](./swsh-skyscraping-perfect.md) |
| 21 | og-s6a | 이브이 히어로즈 | ✅ namu 정본화(101) | [swsh-eevee-heroes.md](./swsh-eevee-heroes.md) |
| 22 | og-s6k | 칠흑의 가이스트 (KR없음) | ✅ namu 정본화(95) | [swsh-jet-black-spirit.md](./swsh-jet-black-spirit.md) |
| 23 | og-s6h | 백은의 랜스 / Chilling Reign(EN) | ✅ namu 정본화(95) | [swsh-silver-lance.md](./swsh-silver-lance.md) |
| 24 | og-s5a | 쌍벽의 파이터 | ✅ namu 정본화(96, +RMAP ASR/AHR) | [swsh-matchless-fighters.md](./swsh-matchless-fighters.md) |
| 25 | og-swsh45sv | Shining Fates: Shiny Vault (EN전용) | ✅ 매우 건강(122/122) | [swsh-shining-fates-sv.md](./swsh-shining-fates-sv.md) |
| 26 | og-s5r | 연격 마스터 (KR없음) | ✅ namu 정본화(91) | [swsh-rapid-strike-master.md](./swsh-rapid-strike-master.md) |
| 27 | og-s5i | 일격 마스터 / Battle Styles(EN) | ✅ namu 정본화(91) | [swsh-single-strike-master.md](./swsh-single-strike-master.md) |
| 28 | og-s4a | 샤이니 스타 V / Shining Fates(EN) | ✅ namu 정본화(330, +RMAP A/S/SSR, ⚠kr-sc 오편입) | [swsh-shiny-star-v.md](./swsh-shiny-star-v.md) |
| 29 | og-swsh35 | Champion's Path (EN전용) | ✅ 건강(80/80) | [swsh-champions-path.md](./swsh-champions-path.md) |

| 30 | og-s4 | 앙천의 볼트태클 | ✅ namu 정본화(121) | [swsh-volt-tackle.md](./swsh-volt-tackle.md) |
| 31 | og-s3a | 전설의 고동 / Vivid Voltage(EN) | ✅ namu 정본화(94) | [swsh-legendary-heartbeat.md](./swsh-legendary-heartbeat.md) |
| 32 | og-s3 | 무한존 | ✅ namu 정본화(119) | [swsh-infinity-zone.md](./swsh-infinity-zone.md) |
| 33 | og-s2a | 폭염워커 / Darkness Ablaze(EN) | ✅ namu 정본화(86) | [swsh-explosive-walker.md](./swsh-explosive-walker.md) |

| 34 | og-s2 | 반역크래시 / Rebel Clash(EN) | ✅ namu 정본화(115) | [swsh-rebellion-crash.md](./swsh-rebellion-crash.md) |
| 35 | og-s1a | VMAX라이징 | ✅ namu 정본화(86) | [swsh-vmax-rising.md](./swsh-vmax-rising.md) |
| 36 | og-s1h | 실드 | ✅ namu 정본화(75) | [swsh-shield.md](./swsh-shield.md) |
| 37 | og-s1w | 소드 / S&S Base(EN) | ✅ namu 정본화(75, +kr-sd [P17]) | [swsh-sword.md](./swsh-sword.md) |
| 38 | og-swshp | SWSH Black Star Promos (EN전용) | ✅ 건강(304) | [swsh-black-star-promos.md](./swsh-black-star-promos.md) |
| 39 | og-kr-swsh-promo | KR 소드&실드 프로모 | ⚠ 정본화 불가(전용 재수집) | [swsh-kr-promo.md](./swsh-kr-promo.md) |

**🎉 SWSH 39팩 전수 점검 완료 (2026-06-01).**

## 구조 정리 진행 (2026-06-01)
- ✅ **S1 해결**: `og-s11`(로스트어비스/오리진) setGroup 신설 (nameJa ロストアビス/nameEn Lost Origin/nameKo 로스트어비스, releaseDate 2022-07-15). 상세 [swsh-lost-abyss-origin.md](./swsh-lost-abyss-origin.md).
- ✅ **S2 해결**: kr-s11 og-s11a→og-s11 이전 + **언머지**(jp-tcg-S11a/en-tcg-swsh12 LC → 자체 orphan LC) + namu 「로스트어비스」 123장 정본화. 오염 해소(#1 콘팡 ✓).
- ✅ **S3 해결**: en-tcg-swsh12(Silver Tempest) og-s11a→og-s12 이전(LC 215 setGroupId 동기화). en-tcg-swsh11(Lost Origin) og-s10a→og-s11 이전(LC 217). → **og-s11a=백열의아르카나 클린, og-s10a=다크판타스마 클린, og-s12=패러다임+실버템페스트.**
- ✅ **S4 해결 (2026-06-01)**: 서브제품 18개 **언머지 완료**(본세트 LC → 자체 orphan LC `lc-orphan-<set>-*`). Set 그룹 이전 포함:
  - swsh-decks: kr-si(스타트덱100, 209/409 물림)·kr-sn·kr-sl·kr-sj·kr-so·kr-sa·kr-se·kr-sg(og-s9→이전)
  - swsh-goods: kr-s8a-g·kr-sb·kr-sp1·kr-sp2·kr-sp3·kr-sp4·kr-sp6·kr-sp5(og-s8→이전)·kr-sd(og-s1w→이전)
  - sv-decks: kr-svm(SV Generations, SWSH 베이스 교차오염 180장 언머지)
  - **kr-sc(BW 샤이니 컬렉션)**: `og-bw-shiny` 신설 후 이전 + 언머지(og-s4a 교차오염 해소).
  - 검증: SWSH 전 본세트(jp-tcg-S1W~S12a·en-tcg-swsh*)에 비정상 게스트 0. 본 KR세트(kr-s9 등)는 정당한 JP 공유 유지.
  - 효과: 서브제품들이 본세트 한글명 오표시 대신 placeholder("SO 1" 등)로 정직 표시. 실데이터는 [P9] pokemoncard.co.kr 재수집 대기.

> **참고(SWSH 범위 밖)**: 동일 [P17] 패턴이 SM/SV/XY/MEGA era 서브제품에도 존재 → **✅ 2026-06-01 전역 일괄 해소(아래)**.

### ✅ 전역 서브제품 [P17] 일괄 언머지 (2026-06-01, 全 era)
탐지기 **"CardLocale.set.setGroup ≠ LC.primarySet.setGroup"**(=서브제품이 타 그룹 본세트 LC에 물림)로 전역 스캔 → **25개 서브제품·927장** 자체 orphan LC로 분리. (같은 그룹 내 정당한 지역쌍 JP↔KR/EN은 미해당, 무영향.)
- **MEGA(mega-decks/goods)**: kr-mc(스타트덱100 배틀컬렉션 241)·kr-ma(프리미엄 박스 48).
- **XY(xy-decks)**: kr-xya/xyb/xyc/xyd/xye/xyf/xyg/xyh(60장덱)·kr-xy30(제르네아스덱)·kr-rbd(라이츄BREAK)·kr-ubd(음번BREAK).
- **SM(sm-decks)**: kr-sma/sme/sm30a(SM1S계)·kr-smc/smi/sm60a(SM3H계)·kr-sm60b(SM4S)·kr-smk(SM7)·kr-sml_(SM9)·kr-smm(SM11a)·kr-smn(SM11b)·kr-smd(SM9, 현 sv-decks 라벨).
- 검증: 재스캔 결과 크로스-그룹 머지 **0**. 효과: 본세트 한글명 오표시 → placeholder 정직표시. 실데이터 pokemoncard.co.kr 재수집 대기[P9].
- (참고) kr-smd는 SM 제품이나 setGroup이 sv-decks로 라벨됨 — 경미, 추후 sm-decks 정정 권장.

---

## 신규/주목 학습 (SWSH 고유)
- 🔧 **RMAP 확장**: `RRR→Triple Rare`(VMAX/VSTAR), `K→Radiant Rare`(かがやく/찬란한 포켓몬). SWSH era 전 팩 공통 — `sync-pack-namu-ko.ts`에 영구 반영.
- **EN Crown Zenith ↔ JP/KR VSTAR 유니버스 대응**: 서양 컴필레이션 Crown Zenith 본세트는 `og-s12a`(VSTAR 유니버스)에, Galarian Gallery는 `og-swsh12pt5gg`에 매핑됨. JP/KR엔 Crown Zenith 독립 제품 없음 → 해당 EN전용 그룹엔 namu 비적용.
- **JP/KR 게임데이터 결손 광범**: SWSH JP/KR 세트 다수가 hp 0·attacks scalar(미구조화)·abilities 0 (TCGdex 임포트가 메타 최소). EN은 pokemontcg.io로 비교적 충실. → 대량 재수집 패스 필요.

---

## 팩별 이슈

### og-swsh12pt5gg — Crown Zenith Galarian Gallery (EN전용) — 2026-05-31
상세: [swsh-crown-zenith-gg.md](./swsh-crown-zenith-gg.md)
- **건강**: 70/70 · 번호 GG01~70 · hp/attacks/abilities/rarity/illustrator/이미지 완비 · supertype 0 · flavor 34(= V계열·트레이너 제외 전부, 결손 아님).
- 한국·일본 미발매(EN전용) → namu 비적용. 남은 공백: 트레이너 10장 ko명·V계열 ko 접미어(→ VSTAR 유니버스 그룹화 시 통합), ja CardText 0 [P5].

### og-s12a — VSTAR 유니버스 / Crown Zenith(EN) — 2026-05-31
상세: [swsh-vstar-universe.md](./swsh-vstar-universe.md)
- **안전수정**: namu 「VSTAR 유니버스」 252장 ko명+레어도(공유 LC로 JP rarity 30→246·ko 0→244 동시). 🔧 RMAP RRR/K 확장.
- **남은 이슈**: [P15/P5] JP·KR 게임데이터 결손(hp 0·attacks scalar·abilities 0) · [P2] JP 시크릿 8장 누락[251–258]·KR 10장 누락 · [P3] KR name placeholder(표시 OK) · [P6] provenance 없음.

### og-swsh12tg — Silver Tempest Trainer Gallery (EN전용) — 2026-05-31
상세: [swsh-silver-tempest-tg.md](./swsh-silver-tempest-tg.md)
- **건강**: 30/30 · TG01~30 · hp 24·rarity 30·illustrator 30·attacks 24 완비 · supertype 0 · flavor 11(일반 포켓몬만, 결손 아님).
- 한국·일본 미발매(EN전용) → namu 비적용. 남은 공백: 트레이너 6장 ko명·V계열 ko 접미어, ja CardText 0 [P5].

### og-s12 — 패러다임트리거 — 2026-05-31
상세: [swsh-paradigm-trigger.md](./swsh-paradigm-trigger.md)
- **안전수정**: namu 「패러다임트리거」 kr-s12 120장 ko명+레어도(공유 LC로 JP rarity 94→123·ko 0→120 동시).
- ⚠ **[P17]+[P8] kr-so 스페셜 덱**(「리자몽 VSTAR VS 레쿠쟈 VMAX」, 32장)이 본세트 jp-tcg-S12 #1~32 LC 공유 → namu 후 패러다임트리거 한글명으로 오표시. **un-merge+별 setGroup+재수집 필요(사용자 결정, S4)**.
- **남은 이슈**: [P15/P5] JP·KR 게임데이터 결손 · [P2] KR 누락 5장[28,32,34,74,115] · [P3] name placeholder · [P6] provenance · [P10] releaseDate epoch.

### og-swsh11tg — Lost Origin Trainer Gallery (EN전용) — 2026-05-31
상세: [swsh-lost-origin-tg.md](./swsh-lost-origin-tg.md)
- **건강**: 30/30 · TG01~30 · hp 24·rarity 30·illustrator 30 완비 · supertype 0 · flavor 12. namu 비적용(미발매).

### og-s11a — 백열의 아르카나 — 2026-05-31 ⚠ 구조문제
상세: [swsh-incandescent-arcana.md](./swsh-incandescent-arcana.md)
- **안전수정**: namu 「백열의 아르카나」 kr-s11a 89장(JP s11a 공유 LC로 ko 0→89). 🔧 RMAP `CSR→Character Super Rare` 확장.
- ⚠ **구조 이슈 S1/S2/S3**(위 누적 결정 대기 참조): kr-s11(로스트어비스) 오편입·오염, 로스트어비스/오리진 그룹 부재, EN Silver Tempest 위치 오류.
- **남은 이슈**: [P2] JP 46장 누락(94/140)·KR 누락 5장 · [P15/P5] 게임데이터 부분결손 · [P6][P10].

### og-swsh10tg — Astral Radiance Trainer Gallery (EN전용) — 2026-05-31
상세: [swsh-astral-radiance-tg.md](./swsh-astral-radiance-tg.md) — 건강 30/30, namu 비적용.

### og-s10b — Pokémon GO — 2026-06-01
상세: [swsh-pokemon-go.md](./swsh-pokemon-go.md)
- **안전수정**: namu 「Pokémon GO(포켓몬 카드 게임)」 kr-s10b 92장(JP 공유 LC로 ko 0→92). 구조 클린.
- **남은 이슈**: [P2] JP 시크릿 3장(93/96)·KR #33+시크릿 8장 · [P15/P5][P6][P10].

### og-s10a — 다크판타스마 — 2026-06-01
상세: [swsh-dark-phantasma.md](./swsh-dark-phantasma.md)
- **안전수정**: namu 「다크판타스마」 kr-s10a 95장(JP 공유 LC로 ko 0→95). namu 2단 중복행이나 동일값이라 무해(검증).
- **구조**: EN swsh11(Lost Origin)이 이 그룹에 매핑(EN 한 칸 어긋남, S3 계열). [P2] JP 49장 누락(99/148)·KR 4장 · [P15/P5][P6][P10].

### og-s10d — 타임게이저 — 2026-06-01
상세: [swsh-time-gazer.md](./swsh-time-gazer.md)
- **안전수정**: namu 「타임게이저」 jp-tcg-S10D 88장 직접(공유 LC로 kr-s10 ko 0→86). EN Astral Radiance는 별 LC라 무오염.
- ⚠ **[P17]+[P8] kr-sj 스페셜 덱**(「자시안·자마젠타 VS 무한다이노」)이 본세트 #1~32 LC 공유 → 오표시(S4 계열).
- [P15/P5][P6][P10].

### og-s10p — 스페이스저글러 (JP단독) — 2026-06-01
상세: [swsh-space-juggler.md](./swsh-space-juggler.md)
- **안전수정**: namu 「스페이스 저글러」(공백 제목) jp-tcg-S10P 88장 ko명+레어도.
- **이슈**: supertype #59 Trainer/hp100 데이터 오류 · [P9] KR 스페이스저글러 세트 미수집 · [P15/P5][P6].

### og-swsh9tg — Brilliant Stars Trainer Gallery (EN전용) — 2026-06-01
상세: [swsh-brilliant-stars-tg.md](./swsh-brilliant-stars-tg.md) — 건강 30/30, namu 비적용. (TG 시리즈 최초)

### og-s9a — 배틀리전 — 2026-06-01
상세: [swsh-battle-region.md](./swsh-battle-region.md)
- **안전수정**: namu 「배틀리전」 kr-s9a 87장(JP 공유 LC로 ko 0→87). 구조 클린. namu 2단 중복 무해.
- **남은 이슈**: KR 누락 6장 · [P15/P5] 게임데이터 전무 · [P6][P10].

### og-s9 — 스타버스 — 2026-06-01
상세: [swsh-star-birth.md](./swsh-star-birth.md)
- **안전수정**: namu 「스타버스」 kr-s9 125장(JP 공유 LC로 ko 0→125).
- ⚠ **[P17]+[P9] 서브제품 3종**: kr-sl(루카리오 VSTAR 스타터)·kr-sg(인텔리레온 VMAX 하이클래스덱)·kr-sp6(VSTAR 스페셜세트)이 본세트 jp-tcg-S9 LC 공유 → 오표시. un-merge+재수집(S4 계열).
- **남은 이슈**: KR 누락 kr-s9[11,37] · [P15/P5][P6][P10].

### og-s8b — VMAX 클라이맥스 — 2026-06-01
상세: [swsh-vmax-climax.md](./swsh-vmax-climax.md)
- **안전수정**: namu 「VMAX 클라이맥스」 kr-s8b 270장(JP 공유 LC로 ko 0→270). 구조 클린.
- **남은 이슈**: [P2] JP 시크릿 110장 누락(285/395)·KR 15장 · [P15/P5][P6][P10].

### og-s8a — 25th ANNIVERSARY COLLECTION / Celebrations(EN) — 2026-06-01
상세: [swsh-25th-anniversary.md](./swsh-25th-anniversary.md)
- **안전수정**: namu 「25th Anniversary Collection」(대소문자 정확) kr-s8a 23장. EN Celebrations 별 LC 건강.
- **남은 이슈**: [P2] JP 17장·KR V-UNION/시크릿 8장 미수록 · 25th GOLDEN BOX는 swsh-goods 분리됨 · [P15/P5][P6][P10].

### og-cel25c — Celebrations: Classic Collection (EN전용) — 2026-06-01
상세: [swsh-celebrations-classic.md](./swsh-celebrations-classic.md) — EN 클래식 복각 22/25, 번호=원본번호(누락 아님), namu 비적용.

### og-s8 — 퓨전아츠 — 2026-06-01
상세: [swsh-fusion-arts.md](./swsh-fusion-arts.md)
- **안전수정**: namu 「퓨전아츠」 jp-tcg-S8 129장 직접(공유 LC로 kr-s8 ko 0→97).
- ⚠ **[P17] kr-sp5 「자시안 V-UNION」 스페셜세트**(4장) 본세트 LC 공유 → 오표시. un-merge+재수집(S4).
- KR 누락 13장 · [P15/P5][P6][P10].

### og-s7r — 창공스트림 (KR 세트 없음) — 2026-06-01
상세: [swsh-blue-sky-stream.md](./swsh-blue-sky-stream.md)
- **안전수정**: namu 「창공스트림」 jp-tcg-S7R 90장. EN Evolving Skies(s7r+s7d 합본) 별 LC 건강.
- [P9] KR 창공스트림 세트 미수집 · [P15/P5][P6].

### og-s7d — 마천퍼펙트 — 2026-06-01
상세: [swsh-skyscraping-perfect.md](./swsh-skyscraping-perfect.md)
- **안전수정**: namu 「마천퍼펙트」 jp-tcg-S7D 90장(공유 LC로 kr-s7 ko 0→79). 구조 클린.
- [P15/P5][P6][P10].

### og-s6a — 이브이 히어로즈 — 2026-06-01
상세: [swsh-eevee-heroes.md](./swsh-eevee-heroes.md)
- **안전수정**: namu 「이브이 히어로즈」 jp-tcg-S6a 101장(공유 LC로 kr-s6a ko 0→87). VMAX 스페셜세트(kr-sp4)는 swsh-goods 분리. [P15/P5][P6][P10].

### og-s6k — 칠흑의 가이스트 (KR 세트 없음) — 2026-06-01
상세: [swsh-jet-black-spirit.md](./swsh-jet-black-spirit.md)
- **안전수정**: namu 「칠흑의 가이스트」 jp-tcg-S6K 95장. [P9] KR 미수집 · [P15/P5][P6].

### og-s6h — 백은의 랜스 / Chilling Reign(EN) — 2026-06-01
상세: [swsh-silver-lance.md](./swsh-silver-lance.md)
- **안전수정**: namu 「백은의 랜스」 jp-tcg-S6H 95장(공유 LC로 kr-s6 ko 0→83). EN Chilling Reign 별 LC 건강. [P15/P5][P6][P10].

### og-s5a — 쌍벽의 파이터 — 2026-06-01
상세: [swsh-matchless-fighters.md](./swsh-matchless-fighters.md)
- **안전수정**: namu 「쌍벽의 파이터」 jp-tcg-S5a 96장(공유 LC로 kr-s5a ko 0→70). 🔧 RMAP `ASR→Super Rare`·`AHR→Hyper Rare`(알터아트, 기존 데이터 일치 확인). [P15/P5][P6][P10].

### og-swsh45sv — Shining Fates: Shiny Vault (EN전용) — 2026-06-01
상세: [swsh-shining-fates-sv.md](./swsh-shining-fates-sv.md) — 매우 건강 122/122 전 항목 완비, namu 비적용.

### og-s5r — 연격 마스터 (KR 세트 없음) — 2026-06-01
상세: [swsh-rapid-strike-master.md](./swsh-rapid-strike-master.md)
- **안전수정**: namu 「연격마스터」 jp-tcg-S5R 91장. EN Battle Styles(s5i+s5r 합본) 별 LC. [P9] KR 미수집 · [P15/P5][P6].

### og-s5i — 일격 마스터 / Battle Styles(EN) — 2026-06-01
상세: [swsh-single-strike-master.md](./swsh-single-strike-master.md)
- **안전수정**: namu 「일격마스터」 jp-tcg-S5I 91장(공유 LC로 kr-s5 ko 0→81). EN Battle Styles 별 LC 건강. [P15/P5][P6][P10].

### og-s4a — 샤이니 스타 V / Shining Fates(EN) — 2026-06-01
상세: [swsh-shiny-star-v.md](./swsh-shiny-star-v.md)
- **안전수정**: namu 「샤이니스타 V」 jp-tcg-S4a 330장 ko명(전수). 🔧 RMAP `A→Amazing Rare`·`S→Shiny Rare`·`SSR→Shiny Secret Rare`(SV [P14] 해소).
- ⚠ **[P17/구조] kr-sc=BW 「샤이니 컬렉션」**(타 era 제품)이 og-s4a 오편입 + S4a #1~25 LC 공유 → BW그룹 이전 필요(S 계열).
- rarity 163장 None(namu 샤이니행 레어도공백, [P11]) · [P2] JP 124장 누락(330/454) · [P15/P5][P6].

### og-swsh35 — Champion's Path (EN전용) — 2026-06-01
상세: [swsh-champions-path.md](./swsh-champions-path.md) — 건강 80/80, namu 비적용.

### og-s4 — 앙천의 볼트태클 — 2026-06-01
상세: [swsh-volt-tackle.md](./swsh-volt-tackle.md) — namu 「앙천의 볼트태클」 jp-tcg-S4 121장(kr-s4 ko 0→111). 클린. [P15/P5][P6][P10].

### og-s3a — 전설의 고동 / Vivid Voltage(EN) — 2026-06-01
상세: [swsh-legendary-heartbeat.md](./swsh-legendary-heartbeat.md) — namu 「전설의 고동」 jp-tcg-S3a 94장(kr-s3a ko 0→84). EN 별 LC 건강. [P15/P5][P6][P10].

### og-s3 — 무한존 — 2026-06-01
상세: [swsh-infinity-zone.md](./swsh-infinity-zone.md) — namu 「무한존」 jp-tcg-S3 119장(kr-s3 ko 0→110). 클린. [P15/P5][P6][P10].

### og-s2a — 폭염워커 / Darkness Ablaze(EN) — 2026-06-01
상세: [swsh-explosive-walker.md](./swsh-explosive-walker.md) — namu 「폭염워커」 jp-tcg-S2a 86장(kr-s2a ko 0→78). 스타터「이상해꽃」(kr-se)는 swsh-decks 정상 분리. [P15/P5][P6][P10].

### og-s2 — 반역크래시 / Rebel Clash(EN) — 2026-06-01
상세: [swsh-rebellion-crash.md](./swsh-rebellion-crash.md) — namu 「반역크래시」 jp-tcg-S2 115장(kr-s2 ko 0→106). EN 별 LC 건강. [P15/P5][P6][P10].

### og-s1a — VMAX라이징 — 2026-06-01
상세: [swsh-vmax-rising.md](./swsh-vmax-rising.md) — namu 「VMAX라이징」 jp-tcg-S1a 86장(kr-s1a ko 0→78). 클린. [P15/P5][P6][P10].

### og-s1h — 실드 — 2026-06-01
상세: [swsh-shield.md](./swsh-shield.md) — namu 「실드(포켓몬 카드 게임)」 jp-tcg-S1H 75장(kr-s1h ko 0→68). 클린. [P15/P5][P6][P10].

### og-s1w — 소드 / S&S Base(EN) — 2026-06-01
상세: [swsh-sword.md](./swsh-sword.md) — namu 「소드(포켓몬 카드 게임)」 jp-tcg-S1W 75장(kr-s1w ko 0→68). ⚠ [P17] kr-sd「확장팩 세트 V」 본세트 LC 공유. EN S&S Base 별 LC 건강. [P15/P5][P6][P10].

### og-swshp — SWSH Black Star Promos (EN전용) — 2026-06-01
상세: [swsh-black-star-promos.md](./swsh-black-star-promos.md) — 건강 304장 전 항목 완비, namu 비적용.

### og-kr-swsh-promo — KR 소드&실드 프로모 — 2026-06-01
상세: [swsh-kr-promo.md](./swsh-kr-promo.md) — kr-s-p 182장 placeholder·게임데이터 0·번호 비연속. namu 단일표 부재로 정본화 불가 → [P9] pokemoncard.co.kr 전용 프로모 재수집 필요.

---

## 🎉 캠페인 완료 요약 (2026-06-01 — SWSH 39팩 전수)
- **namu 정본화 적용 27팩**(JP+KR 본확장/하이클래스/강화확장). 공유 LC 통해 JP·KR 동시 ko명+레어도 채움.
- **EN 전용 건강 9팩**(Trainer Gallery ×4, Crown Zenith GG, Shining Fates SV, Champion's Path, Celebrations CC, Black Star Promos): 감사만, 안전.
- 🔧 **RMAP SWSH 표준 영구확장**: RRR=Triple Rare, K=Radiant Rare, CSR=Character Super Rare, ASR=Super Rare(알터아트), AHR=Hyper Rare(알터아트), A=Amazing Rare, S=Shiny Rare, SSR=Shiny Secret Rare (SV [P14] 해소).
- **미적용 1팩**: og-kr-swsh-promo(프로모 그랩백, 전용 재수집 대기).

### 구조 정리 (S1~S4) — ✅ 전부 완료 (2026-06-01)
- **S1/S2 ✅**: `og-s11`(로스트어비스/오리진) 신설 + kr-s11 이전·언머지·namu 정본화.
- **S3 ✅**: en-tcg-swsh11→og-s11, en-tcg-swsh12→og-s12 재배치(LC setGroupId 동기화). og-s11a·og-s10a 클린화.
- **S4 ✅**: 서브제품 18개 + kr-svm + kr-sc(→og-bw-shiny 신설) 언머지. SWSH 본세트 비정상 게스트 0 검증.

### 남은 재수집 패스 (데이터 — 구조 아님)
- [P2] JP 시크릿 다수 누락 · [P1/P15] JP·KR 게임데이터(hp/attacks구조/abilities) 결손 · [P9] **언머지된 서브제품 18개 + KR 미발매분(창공/연격/칠흑)·프로모 pokemoncard.co.kr 재수집** · [P11] 샤이니스타V rarity 163 None · JP Lost Abyss(jp-tcg-S11) 임포트.
- **타 era 구조**: SM·SV era 서브제품에도 동일 [P17] 잔존(위 참고).

---

## 🔧 수동 교정 로그 (개별 카드)

### swsh-decks / kr-sgg — 하이클래스 덱 「팬텀 VMAX」 — 2026-06-16
- **퀵볼 ↔ 진화향로 KR 매핑**: 검증 결과 이미 정상(퀵볼 #009→`lc-jp-tcg-SGG-009`, 진화향로 #008→`lc-jp-tcg-SGG-010`). 조치 없음.
- **ゲンガーVMAX SR(특별 일러스트, 020/019) KR 신규 수집**: KR 공식 CDN/DB는 시크릿 SR 티어를 체계적으로 누락(`SGG_021+` 404) → 부재가 미발매 근거 아님. 마켓 증거로 KR 발매 확인됨. `lc-jp-tcg-SGG-020` 에 KR 카드 `kr-sgg-020-sr`(#020, "팬텀 VMAX") 신규 생성.
- **번호 정렬**: KR 카탈로그는 SR을 건너뛰고 기본 악 에너지를 #020 으로 압축했었음 → JP 앵커 정렬 위해 기본 악 에너지(`kr-sgg-020`, `lc-jp-tcg-SGG-021`)를 #020→**#021** 로 교정. 결과 KR도 JP와 동일(020=SR, 021=에너지).
- **⚠ TODO(이미지 임시 fallback)**: `kr-sgg-020-sr` 의 `imageSmall`/`imageLarge` 는 **JP 공식 이미지**(`pokemon-card.com/.../044975_P_GENGAVMAX.jpg`)로 임시 대체. 클린 KR 텍스트 스캔을 네이버 블로그/카페/쇼핑·tcgbox(워터마크) 등에서 확보 못함. **클린 KR 스캔 확보 시 R2 재호스팅 후 교체할 것.**

### swsh-decks / kr-sg — 하이클래스 덱 「인텔리레온 VMAX」 (SGG 트윈) — 2026-06-16
- **퀵볼 ↔ 진화향로 KR cardId 교차 교정**: KR 번호 체계가 JP와 달라(KR 진화향로=#012, 퀵볼=#013 / JP クイックボール=012, しんかのおこう=013) 수집 시 번호로 LC를 단순매칭해 정체성이 꼬임. 일러스트 실물 확인(SGI_012=인센스, SGI_013=볼)으로 이름·번호·이미지는 정확 확인 → cardId만 스왑(`kr-sg-012`→`lc...SGI-013`, `kr-sg-013`→`lc...SGI-012`).
- **마리 ↔ 코르니의 기합 KR cardId 교차 교정**: 동일 패턴(KR 마리=#016, 코르니=#020 / JP コルニ=016, マリィ=020). 일러스트 확인(SGI_016=마리, SGI_020=코르니) → cardId 스왑(`kr-sg-016`→`lc...SGI-020`, `kr-sg-020`→`lc...SGI-016`).
- **インテレオンVMAX SR(특별 일러스트, 023/022) KR — 발매 확정·신규 수집**: 하이클래스 덱은 고정 구성품(SR 보장 동봉). KR 덱 정식 발매(pokemoncard.co.kr/card/369·KREAM·11번가·G마켓, 2021-07-07) → SR도 KR 배포됨. KR 공식 CDN은 `SGI_024+` 404로 SR 누락(부재≠미발매). `lc-jp-tcg-SGI-023` 에 KR 카드 `kr-sg-023-sr`(#023, "인텔리레온 VMAX") 신규 생성.
- **번호 정렬**: KR 카탈로그가 SR 건너뛰고 기본 물 에너지를 #023 으로 압축 → JP 앵커 정렬 위해 기본 물 에너지(`kr-sg-023`, `lc-jp-tcg-SGI-024`)를 #023→**#024** 교정. 결과 KR도 JP 동일(023=SR, 024=에너지).
- **⚠ TODO(이미지 임시 fallback)**: `kr-sg-023-sr` 의 `imageSmall`/`imageLarge` 는 **JP 공식 이미지**(`pokemon-card.com/.../044976_P_INTEREONVMAX.jpg`)로 임시 대체(SGG 선례 동일). **클린 KR 스캔 확보 시 R2 재호스팅 후 교체할 것.**

### og-s4a / Shining Fates(en-tcg-swsh45) — EN 오병합 + 이미지 오류 — 2026-06-16
- **배경**: EN swsh45(Shining Fates, 73장)는 JP S4a(샤이니스타V)와 **다른 구성의 컴필레이션 세트**. 73장 중 **23장이 `lc-orphan-jp-tcg-S4a-*` LC에 dex번호+종 기반으로 오병합**됨(50장은 정상 `lc-en-tcg-swsh45-*` 고아). V카드 등 동일 일러는 정상이나, commons는 JP 프로모/타세트 재판이라 **일러가 달라 별개 카드**.
- **6장 commons EN 오병합 교정(분리)**: 일러스트 실물 대조 + 일러스트레이터 대조로 별개 카드 확정 → EN RegionCard 를 **원래부터 살아있던 EN 고아 LC로 복귀**(신규생성 불필요). 결과 JP S4a LC는 JP+KR 만 남음(샤이니스타V 카드는 Shining Fates EN 대응 없음=정상):
  | EN 카드 | 작가(EN) | 작가(JP S4a) | from LC | to LC |
  |---|---|---|---|---|
  | Dartrix #007 | AKIRA EGAWA | Mitsuhiro Arita | S4a-2 | swsh45-007 |
  | Decidueye #008 | Ryota Murayama | Souichirou Gunjima | S4a-3 | swsh45-008 |
  | Rillaboom #013 | Anesaki Dynamic | Kouki Saitou | S4a-8 | swsh45-013 |
  | Frosmoth #030 | Kagemaru Himeno | kirisAki | S4a-48 | swsh45-030 |
  | Spinarak #043 | sowsow | Kyoko Umemoto | S4a-106 | swsh45-043 |
  | Cufant #049 | 0313 | Akira Komayama | S4a-133 | swsh45-049 |
- **Indeedee V #039 — 병합은 정상, 이미지가 오류**: EN/JP/KR 모두 동일 regular "Watch Over"(5ban Graphics, HP180) = 같은 카드라 병합 유지. 단 우리 DB의 EN #039 이미지가 **pokemontcg.io의 청록 오이미지**(다른 일러)였음 → 정본(SWSH base #091)·tcgcollector·limitless 대조로 진짜 #039는 자홍 정면임을 확인 → **limitless 클린본을 R2 재호스팅**(`og-s4a/en/{small,large}/en-tcg-swsh45/039.png`)하고 DB 이미지 교체. pokemontcg.io large 핫링크도 R2로 전환.
- **⚠ 잔여(systematic)**: 같은 og-s4a 에서 **나머지 ~16장(23−7)도 EN 오병합 의심**(commons는 분리, V/동일일러는 유지). 요청분 7장만 처리. 추후 23장 전수 대조 필요. pokemontcg.io swsh45 이미지 오류도 타카드 존재 가능 → EN 이미지 점검 시 유의.
