# 카드팩 검증 종합 (MEGA→LEGEND)

MEGA→LEGEND 팩단위 검증(기본정보 + 레어도구성)의 전 기록 종합.

- 소스: `docs/phase-a-verification-{7개시대}.md` + `docs/pack-audit/*-issues-log.md` + 시대별 메모리 + 세션 기록
- 대부분 항목은 이미 보완 완료 → 아래는 ① 진행 개요 ② 미수집 카드팩 ③ 체크·이월 항목에 집중

> ⚠️ 캐비엇: phase-a 문서는 2026-05-31 스냅샷이고 "완료" 다수는 그 이후 캠페인 메모리(시점 기록) 주장에 근거 — 라이브 DB 재검증은 안 된 항목이 섞여 있음.

---

## ① 시대별 개요

- **MEGA** — 검증 ✅ 11그룹 · 보완완료 28 · 미완보완 1(dream-ex JP레어도 113/250) · 미수집 5 · 이월/점검 23
- **SV** — 검증 ✅ 21그룹 · 보완완료 35 · 미완보완 없음 · 미수집 5 · 이월/점검 26
- **SWSH** — 검증 ✅ 39그룹 · 보완완료 47 · 미완보완 없음 · 미수집 0(시크릿 수집완) · 이월/점검 10 (+ EN전용 9팩 "건강")
- **SM** — 검증 ✅ 39그룹 · 보완완료 39 · 미완보완 없음 · 미수집 2 · 이월/점검 10
- **XY** — 검증 ✅ 22그룹 · 보완완료 22 · 미완보완 없음 · 미수집 0 · 이월/점검 4
- **BW** — 검증 ✅ 15그룹 · 보완완료 15 · 미완보완 없음 · 미수집 8 · 이월/점검 5
- **LEGEND/HGSS** — 검증 ✅ (LL 제외) · 보완완료 4 · 미완보완 없음 · 미수집 8 · 이월/점검 2

---

## ② 미수집 카드팩 (수집/보류 대상)

### BW
- **WAK** みんなのドキドキバトル — 55장 · 2012-11-16 — DB·로컬 전무
- **MDB** マスターデッキビルドBOX EX — 46장 · 2012-09-14 — 전무 (※ 2025 메가디안시 MBD와 무관)
- **HSZ** 全国版はじめてセット — 40장 · 2012-04-20 — 전무·무레어도
- **HS+** はじめてセット+ — 40장 · 2011-08-05 — 전무
- **HSP** はじめてセット ピカチュウ — 40장 · 2011-11-18 — 전무 (EN 'hsp'=HGSS프로모와 동명이팩 주의)
- **BTV** ビクティニ バトルテーマデッキ — 24장 · 2011-06-17 — 전무·무레어도
- **kr-bw8s** 스파이럴포스 KR 본체 — 58장 · 2013-05-01 — JP/KR 볼트너클은 있으나 KR 스파이럴포스 없음
- **jp-tcg-BWP** JP 프로모 본탄 — JP 프로모 미보유(EN/KR만 부분)

### LEGEND
- **LP** LEGEND Promos (L-P) — 91장 — 전무 (세션 확인)
- **CS1** たびだちのなかまたち — 9장 · 2010-09-18 — 전무·전량홀로
- **Steelix / Tyranitar** 構築스탠다드덱 — 각 19장 · 2010-02-11 — 전무·무레어도
- **Battle Starter Deck (B)** — Blastoise 10 / Magmortar 9 / Raichu 11 / Torterra 10 · 2009-11-20 — 전무
- **Leafeon vs Metagross Expert (E)** — 15 / 14장 — 전무
- DP/Pt 構築덱·LV.X컬렉션·기프트박스·엔트리팩 — 다발(미열거) — 예상 미수집군, 정책상 보류

### SV
- sv-destined-rivals JP 시크릿 — 정규 98만 — TCGdex 재임포트 대기
- **sv-paldean-fates JP** — 0장 — JP 데이터 전무, 임포트 대기
- **sv-temporal-forces JP** 合本 — 49/~190 — ~141 누락, 임포트 대기
- **sv-shrouded-fable JP** — 0장 — JP 데이터 전무
- svp EN 프로모 잔여 — #190~192·213~215·225·500 — pokemon.com 봇차단(218장 마감 권장)

### MEGA
- kr-m2 #116 메가리자몽Xex MUR — 1장 — KR 공식 미등재
- ninja-spinner KR 시크릿 #084~120 — 37장 — KR 공식 미등재
- kr-m-p KR단독 5장 — 5장 — JP M-P 트윈 미수집
- abyss-eye EN (Pitch Black) — EN 미발매 대기
- start-deck-100 #766 골드 리자몽Y ex — 1장 — KR 사이트 미게재

### SM
- **og-sm3h** JP HR/UR 시크릿 #58-64 — 7장 — 공식·집계 전부 자동수집 벽
- og-kr-sm-promo — 258장(#1~94 placeholder) — 잔여 미수집

---

## ③ 체크하고 넘어가야 할 것 (이월 백로그)

### A. 구조·정체성·코드 (우선순위 높음)
- **BW / BGR 코드 버그군** — kr-gbd·sbd·bgr·bw3h·bw3p·bgrex code(일부 id)가 'BGR' 오박힘 → 최종점검 때 세트별 일괄교정
- **BW / BW2 발매일 충돌** — namu 11-24 vs 공식 11-01 (공식 적용, namu 플래그)
- **BW / GK(거북왕+큐레무)** — 'K+K' 기점검 기록이나 미재검
- **SWSH / og-s6k 흑마버드렉스** — KR #037/#075 cardId가 VMAX레인보우 LC에 오연결(별건, 미수정)
- **SWSH / og-s8b #278-285** — JP 골드VMAX UR vs KR 기본에너지 지역차 — KR 미표시·레어도 미교정
- **SWSH / og-s7r JP base C/U** — 29C/21U(DB) vs 30C/20U(트래커) — 공식 스캔 최종체크
- **SWSH / og-s6a · og-s5r** — s6a 메인 JP미러 이름 미점검 · s5r #83/84 우라오스VMAX 일러 미대조
- **SM / og-sm8a 다크오더** — kr-sm8a 97장 비대(공식 ~56장) 구조오류 의심, 미감사
- **SM / SR↔Rainbow · EN 오병합** — sm3+ ライチュウ·ゾロアークGX 미수집 의심 · SM4+/SM5+/SM6b EN 오병합 systemic 의심
- **SM / sm-decks · sn 오타ID** — SMI/095 정체불명·sm60a/b 발매일·smi#1-8 미게재 / sn10a·sn11 'sn' 오타ID(현상유지)
- **SV / BBWF 특수카드 EN 일러 드리프트** — 블랙볼트/화이트플레어 IR/SAR EN이 번호-zip로 artist 어긋남(동결·별건)
- **SV / kr-sv11b-167** — JP 이미지 임시폴백 — 한국공식 수정 시 한국판 복원
- **MEGA / kr-bs1~10 (DP KR 460장)** — 'DP KR 미발매' 결론과 모순 — 점검 대기
- **MEGA / og-jp-mega-promo · jp-mp-extra-sets** — 사이트 미렌더(CONFIG 미등재) / M-P 동거 23장 소세트 정체미상
- **MEGA / 무니키스제로 정식명** — '니힐제로' vs DB '무니키스제로' 검증
- **LEGEND / jp-tcg-LL Lost Link** — 레어도 split/Prime/cardCount 미검증 — **다음 차례**

### B. 데이터 완성도 (저우선, 일괄 보강)
- **전 SV** — EN 게임데이터 없음[P1] · pokedex/abilities/flavorText/CardText/provenance 결손[P4/5/6] · namu 레어도 RMAP 미매핑[P14] · KR 트레이너 블록 일괄감사 미점검(sv5k/5m/3a/3/2/1 등)
- **MEGA** — JP flavorText/abilities/CardText/provenance 0 · KR name 영문잔존 · abyss-eye 임시번역 13(한국판 발매시 교체) · dream-ex supertype 5장 의심
- **SWSH** — JP imageSmall 599 null + 시크릿 이미지 백필 미실행 · SetGroup nameKo 38개 미설정
- **SM** — supertype null 5214 · illustrator <50% 다수 · EN/JP 인덱스 갭
- **XY** — EN/JP 이미지 HTTP 실패 4건(xy11-036·xy5-127·XY5a-79/80) · CP그룹 illustrator <50% · XY-decks 발매일 미상
- **LEGEND/HGSS** — JP L세트 supertype null 282 · JP rarity placeholder · EN col1/hgss1-4 JP imageSmall 429 null + ID갭 · EN 이미지 2건(hgss2-019·hsp-HGSS18)
- **공통** — 각 팩 KR 누락 소수 번호(미발매/수집누락 확인 필요)

---

## 가장 시급한 실행 후보
- **LL(로스트링크) 레어도 검증** — 검증 캠페인의 유일한 미완 본탄
- **BGR 코드 버그군 일괄교정**
