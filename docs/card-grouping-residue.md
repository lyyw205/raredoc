# 카드 그룹화 잔여 리포트 (2단계 리서치용)

생성일: 2026-05-27 / 도구: `scripts/group-cards.ts` (번호 일치 + artist 교차검증, 추측 연결 금지)

이 문서는 **결정적 그룹화로 연결하지 못한 카드**를 그룹별로 정리한다. 모든 미연결은
"근거 불충분 → 추측 금지" 원칙에 따른 의도된 결과다. 2단계(리서치/번역 기반 매칭)에서
처리할 대상이다.

## 요약: 미연결 원인 3종

1. **번호중복 (합본 그룹)** — JP 합본 세트(예 SV1S+SV1V)를 DB Set 한 행에 합치면서
   두 절반이 같은 번호(1..N)를 공유 → 모든 번호가 모호. EN 은 절반을 별도 Set 으로 가짐.
2. **번호스킴 불일치 (EN↔JP)** — pokemontcg.io(EN) 의 세트 번호와 TCGdex(JP) 의 세트 번호가
   "같은 번호 = 같은 카드" 가 아님. 예: 흑염의지배자 JP #8=オーロット(Phantump) ↔ EN #8=Combee.
   번호로 묶을 수 없음(artist 도 당연히 충돌). **이름/일러스트 기반 매칭 필요(번역 리서치)**.
3. **TCGdex/KR 데이터 부재** — 소스에 카드 자체가 없어 비교 불가.

## 미연결 Top 그룹 (대표 예시 포함)

### 합본 그룹 — 원인 ①(번호중복)

이 그룹들은 JP 카드가 전량 미연결이다. 해결책: JP 합본을 EN 처럼 **두 Set 행**으로 분리하거나,
번호에 절반 식별자를 붙여 EN 의 합본 번호 순서와 정렬 매칭(리서치 필요).

| 그룹 | EN | JP | 미연결 JP | 비고 |
|---|---|---|---|---|
| sv-base | 258 | 216 (SV1S+SV1V) | 216 | 번호 1..108 중복 |
| sv-paldea-evolved | 279 | 198 (SV2P+SV2D) | 198 | 번호 1..99 중복 |
| sv-paradox-rift | 266 | 190 (SV4K+SV4M) | 190 | 번호 1..95 중복 |
| sv-black-bolt-white-flare | 345 | 348 (SV11B+SV11W) | 348 | 번호 중복 + EN 도 2팩 |
| mega-brave-symphonia | 0 | 184 (M1L+M1S) | 184 | EN 없음 + 번호중복 |

### 단일 세트인데 EN↔JP 번호스킴 불일치 — 원인 ②

번호로는 못 묶음. **JP↔EN 카드명 번역 후 (이름+일러스트+도감번호) 매칭**이 2단계 과제.

| 그룹 | EN | JP | 연결(ok) | artist충돌(미연결) | 대표 예시 |
|---|---|---|---|---|---|
| sv-obsidian-flames | 230 | 141 | 9 | 132 | JP#8 オーロット ↔ EN#8 Combee |
| sv-twilight-masquerade | 226 | 101 | 1 | 100 | JP#86 エイパム ↔ EN#86 Flabébé |
| sv-journey-together | 190 | 132 | 7 | 125 | JP#44 ウリムー ↔ EN#44 Alolan Geodude |
| sv-destined-rivals | 244 | 98 | 2 | 96 | JP#87 ロケット団のおじゃまロボ ↔ EN#87 Team Rocket's Mimikyu |
| sv-temporal-forces | 218 | 49 | — | 49 | 합본(SV5K)만 일부 + 번호불일치 |

### 잘 연결된 단일 세트 (참고 — 번호스킴 일치)

번호가 EN↔JP 1:1 로 맞는 그룹은 깔끔히 묶임(추가 작업 불필요):
sv-stellar-crown(135), sv-surging-sparks(106), sv-prismatic-evolutions(180), sv-151(3지역 170).

## 데이터 부재로 비어있는 세트 — 원인 ③

### JP 미수집 (수집 단계에서 확정)

| 그룹/세트 | 사유 |
|---|---|
| sv-triplet-beat (SV1a) | TCGdex ja `cards[]` 비어있음 |
| sv-temporal-forces 일부 (SV5M 사이버저지) | TCGdex ja `cards[]` 비어있음 (SV5K 49장만 수집) |
| sv-shrouded-fable (SV6a) | TCGdex ja `cards[]` 비어있음 |
| sv-paldean-fates (シャイニートレジャーex) | TCGdex ja 세트 목록에 없음 |
| mega-dream-ex (MEGAドリームex) | TCGdex ja 세트 목록에 없음 (KR 에는 M4 존재 — 아래) |
| mega-ninja-spinner (ニンジャスピナー) | TCGdex ja 세트 목록에 없음 |
| mega-abyss-eye (アビスアイ) | TCGdex ja 세트 목록에 없음 |

> TCGdex 오염 데이터: "レイジングサーフ" 가 SV3a(정상 62)·SV4a(190, 카드가 인페르노X와 동일한 오염)
> 두 ID 로 노출됨 → SV3a 만 사용. SV4a 는 의도적으로 배제.

### KR 미수집 (151 외 19개 SV 세트 전부)

KR 은 pokemoncard.co.kr 공식만 사용 가능. 세트별 카드리스트 페이징 API
(`POST /v2/ajax2_dev2`, `action=get_more_cards`)가 **서버측 SQL 오류**(`CardTypeNumArray` 미정의 →
`ajax2_dev2.php:402` 구문오류)로 동작하지 않아, 세트별 `BS` id 접두사를 결정적으로 열거할 수 없다.
정적 `/cards` 첫 페이지에는 **최신 세트만** 노출(현재 M4=`BS2026003`, 이미지폴더 `MEGA/M4`).

- 수집 완료: **kr-sv-151** (`BS2023014`, 208장) — 기존 확정 접두사.
- 카드 상세 페이지(`/cards/detail/BS<접두사><3자리번호>`)는 정상 동작하므로,
  **각 세트의 `BS` 접두사만 확보하면** `scripts/sync-cards-kr.ts` 의 `SET_CONFIGS` 에
  한 줄 추가로 즉시 수집 가능. 2단계에서 접두사 확보(공식 채널/수동 확인)가 과제.
- MEGA(M4 등)는 KR 에 발매됐으나 DB 에 `kr-mega-*` Set 행이 없음(seed 가 SV 만 생성).
  KR MEGA 명 확정 후 seed-set-groups 보강 필요.

## 2단계 권장 처리 순서

1. **JP 합본 분리**: JP 합본 그룹의 카드 번호에 절반 식별자 반영 → EN 합본 번호와 정렬 매칭.
2. **EN↔JP 이름 매칭기**: JP 카드명 → EN(또는 도감번호) 사전을 만들어 번호불일치 그룹 연결.
3. **KR `BS` 접두사 수집**: 19개 SV KR 세트 접두사 확보 후 `SET_CONFIGS` 확장 → 재수집·재그룹.
