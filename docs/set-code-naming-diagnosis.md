# 세트 코드(`Set.code`) 전수조사 & 개선안

상태: **전수조사 완료 + 개선안 확정, DB 수정 보류** (2026-06-16). 착수 결정 시 §6 체크리스트대로 진행.
기준(합의): **지역별 공식 코드** — 각 지역의 실제 코드를 존중(같은 팩이라도 지역별 코드가 다른 건 정상).
근거: 메인 루프의 전수 DB 실측 + `data/limitless-setmap.json`/`data/en-ptcg/*` 출처 검증.

---

## 0. 한 줄 요약

`Set.code`는 **표시·매칭용 메타데이터**(앱 소비처는 `/packs` 갤러리 pill 1곳뿐, FK 아님)인데
**EN 62%가 NULL, region 내 중복 코드 다수(KR `BGR`이 6개 세트에 중복), KR 일부 코드가 깨져 있음**.
→ `code` 컬럼만 교정하면 저위험으로 정합 가능(82/115 EN은 기존 데이터로 자동, id(PK) 표준화는 고위험이라 보류).

---

## 1. 현재 구조 — 세트 식별 3계층

- **`id`** (PK) — 행 고유 식별자. `RegionCard.setId`, `Card.primarySetId`, `ExternalIdMapping.setId`, `Price`, `CardPackLink` 등이 FK로 참조. **변경 = 고위험**.
- **`code`** (`String?`) — 지역 팩 코드. 주석: "EN ptcgoCode / JP / KR 사이트ID". **메타데이터, 수정 안전**.
- **`cardPackId`** (= setGroupId) — 3지역을 묶는 논리 팩(setGroup).

예시 — **흑염의 지배자**: JP `jp-sv-obsidian-flames`(code **NULL**) · KR `kr-sv3`(code `SV3`) · EN `sv3`(code **NULL**, ptcgoCode=OBF).

---

## 2. 전수조사 결과 (실측 717 Set)

### 2.1 `code` 채움률 (region별)
| region | total | code 채움 | NULL | 비고 |
|---|---|---|---|---|
| EN | 186 | 71 (38%) | **115 (62%)** | 절반 이상 NULL — 주요 본탄 다수(BW·XY·SM·SWSH 전체) |
| JP | 282 | 266 (94%) | 16 | NULL=전부 신규 `jp-sv-*`/`jp-tcg-SV11*` 수집분 |
| KR | 249 | 247 (99%) | 2 | 대부분 채움, 단 품질 문제(↓) |

### 2.2 `id` 접두 스킴 (한 region 내 혼재)
- **EN**: `en-tcg-`(128) + **접두 없는 bare**(58: `svp`·`cel25c`·`pop1`·`mcd11`·`swsh45sv`…)
- **JP**: `jp-tcg-`(262) + `jp-sv-`(15) + `jp-mega-`(5) — 3종 혼재
- **KR**: `kr-`(249) — **유일하게 일관**

### 2.3 ★region 내 중복 `code` (식별자로 못 쓸 정도)
같은 region에 같은 code가 2개 이상 — `code`가 사실상 깨진 상태:
| region | code | 중복수 | ids |
|---|---|---|---|
| **KR** | **BGR** | **6** | kr-bgr, kr-bgrex, kr-bw3h, kr-bw3p, kr-gbd, kr-sbd |
| KR | SVA | 3 | kr-sva, kr-sval, kr-svam |
| KR | PROMO | 3 | kr-bw-p, kr-dp-p, kr-promo |
| KR | SG·SL·SP·SE·XY1·XY8·XY11·XY30·BW1·BW5·BW6 | 각 2 | (강화/변형 세트가 base 코드로 붕괴) |
| JP | BG | 3 | jp-tcg-BGC, jp-tcg-BGT, jp-tcg-BGV |
| JP | BW1 | 2 | jp-tcg-BW1B, jp-tcg-BW1W |

### 2.4 ★`Set.code` 사용처 감사 (위험도 확정)
- **앱(src) 소비처 = 단 1곳**: `dex-region.ts`가 `RegionPack.code`로 실어 **`/packs` 갤러리 pill** 표시(`PackGallery.tsx:41`). dex 사이드바·상세·정렬·필터는 `code` 미사용.
  - (`grep '.code'` 의 다른 src 히트는 전부 `Rarity.code`·`PriceSource.code`·`ExternalSource.code` — `Set.code` 아님.)
- **스크립트 소비처**: limitless 매칭 계열(`resolve-card.ts`·`build-limitless-setmap.ts`·`collect-*limitless*`·`fix-sm11`). 단 이들은 주로 `data/limitless-setmap.json`(별도 파일)을 봄.
- **결론**: `Set.code` 변경의 런타임 영향 = **/packs pill 표기 1곳**. FK 영향 0. → 교정 **저위험**(진단 §3 재확인).

### 2.5 KR 미러 분석 (코드가 JP 미러인가?)
KR 247 채움 중 JP twin 보유 230건: **165 미러일치(JP=KR), 65 불일치**. 불일치 65는 두 종류:
- **(A) 정당한 KR-native 코드** — KR이 JP 분할판을 1세트로 합쳐 발매 → KR 자체 코드가 맞음. 예: `kr-s5`=S5(JP S5I), `kr-s6`=S6(JP S6H), `kr-s7`=S7(JP S7D), `kr-s10`=S10(JP S10D). **기준상 정상, 유지.**
- **(B) 진짜 깨진 코드** — 교정 필요:
  - `kr-bgr`=**BGR**(JP BW4 다크러시), `kr-bw3h`·`kr-bw3p`=**BGR**(JP BW3H/BW3P) — BGR이 잘못 들러붙어 6중 충돌.
  - `kr-bg_cobalon/terrakion/virizion`=**BG_cobalon…**(id 파생 합성코드, JP BG)
  - `kr-bw5`·`kr-bw5d`=둘 다 **BW5**(JP BW5B/BW5D), `kr-bw6`·`kr-bw6c`=둘 다 **BW6**(JP BW6F/BW6C) — 2종 발매를 한 코드로 붕괴.

### 2.6 잔여 NULL 상세
- **JP 16 NULL**: `jp-sv-{obsidian-flames,stellar-crown,shrouded-fable,twilight-masquerade,crimson-haze,raging-surf,paldean-fates,paradise-dragona,prismatic-evolutions,surging-sparks,heatwave-arena,journey-together,destined-rivals,151}` + `jp-tcg-SV11B`·`jp-tcg-SV11W`. → 전부 JP 공식 코드 알려짐(SV3·SV7·SV6a…), KR twin이 이미 보유.
- **KR 2 NULL**: `kr-xy5g`(가이아 볼케이노), `kr-sv-151`(포켓몬 카드 151).

---

## 3. 개선안 — 지역별 공식 코드 채움/교정 (`code` 한정, `id` 불변)

### 3.1 EN — ptcgoCode 채움 (115 NULL)
**출처 결정성 확보**: `data/limitless-setmap.json`의 `en{ptcgoCode→setId}`를 역매핑(+ `en-tcg-` 접두 정규화)하면:
- **82건 자동** — DP·MT·SW·GE·MD·LA·SF / PL·RR·SV·AR / HS·UL·UD·TM·CL / BLW·EPO·NVI·NXD·DEX·DRX·BCR·PLS·PLF·PLB·LTR·DRV / KSS·XY·FLF·FFI·PHF·PRC·ROS·AOR·BKT·BKP·FCO·STS·EVO·DCR·GEN / SUM·GRI·BUS·SLG·CIN·UPR·FLI·CES·DRM·LOT·TEU·UNB·UNM·HIF·CEC·DET / SSH·RCL·DAA·CPA·VIV·SHF·BST·CRE·EVS·FST·PGO·CEL·CRZ·CRI + 프로모 PR-HS/PR-BLW/PR-XY/PR-SM/PR-SW (전부 정식 ptcgoCode)
- **~12건 파생** — 변형셋만 매핑돼 base가 미싱: `swsh9`→BRS·`swsh10`→ASR·`swsh11`→LOR·`swsh12`→SIT·`swsh12pt5`→CRZ·`swsh45`→SHF·`cel25`→CEL·`sma`(Hidden Fates SV)→HIF. (변형셋 swsh9tg/…/12pt5gg는 base와 구분코드 부여: 예 BRS-TG)
- **~21건 표준 ptcgoCode 없음** — `pop1~9`·`mcd11~22`·`tk1a/b`·`tk2a/b`·`ru1`(Rumble)·`si1`(Southern Islands). → **정책 결정 필요**(§7-Q1): NULL 유지 vs 비공식 코드(POP1·MCD11·TK-Latias…) 부여.

### 3.2 JP — 16 NULL 채움
같은 setGroup의 JP-미러 KR sibling 코드(또는 id 내장 코드)로 결정적 백필:
`jp-sv-obsidian-flames`→**SV3**, `jp-sv-stellar-crown`→**SV7**, `jp-sv-paldean-fates`→**SV4a**, … `jp-tcg-SV11B`→**SV11B**, `jp-tcg-SV11W`→**SV11W**. (16건 전부 deterministic)

### 3.3 KR — 깨진 코드만 교정 (native 코드는 유지)
- **유지(정당)**: s5/s6/s7/s10 등 KR-native 합본 코드.
- **교정(깨짐)**: BGR 6중 충돌 → 각 세트의 실제 코드로 분리(kr-bw3h→BW3H, kr-bw3p→BW3P, kr-bgr→해당 BW 코드…), `kr-bg_*` 합성코드 → 실제 BG 덱 코드, `kr-bw5/bw5d`·`kr-bw6/bw6c` 붕괴 → 분리. (세트별 정본 코드 확인 후 — §6)
- **2 NULL**: kr-xy5g·kr-sv-151 채움.

### 3.4 보류 — `id`(PK) 표준화 (고위험)
`jp-tcg`/`jp-sv`/`jp-mega` 통일, EN bare→`en-tcg-` 통일은 **다수 FK 마이그레이션 동반** → 당장 안 함. (별도 결정)

---

## 4. 기대 결과
- code 채움률: EN 38%→~95%(코드 있는 세트 100%, codeless 21만 정책대상), JP 94%→100%, KR 99%→100% + 중복 0.
- `/packs` 갤러리에서 모든 본탄에 정확한 ptcgoCode pill 노출(현재 EN 본탄 절반이 코드 없음).

---

## 5. 위험도
- `code` 수정 = **저위험**(앱 소비처 /packs pill 1곳, FK 영향 0). EN 82건은 기존 출처라 사실상 무위험.
- KR 깨진코드 교정 = **중위험**(세트별 정본 코드 확인 필요, 동결팩 다수 영향이나 code는 연결 무관 → assertWritable + --allow-protected).
- `id` 표준화 = **고위험**(보류).

---

## 6. 실행 체크리스트 (착수 시 — `code` 한정, `id` 불변)
1. **백필 스크립트** `scripts/backfill-set-code.ts`(미작성): EN=limitless-setmap 역매핑+파생, JP=setGroup sibling, KR=교정표(override). dry-run 전수 리뷰 우선.
2. **동결 가드**: 영향 cardPackId로 `assertWritable(..., {allow, dryRun})`. code는 연결 FK 무변경이라 동결 위반 아니나 규약상 호출 + 사용자 확인 후 `--apply --allow-protected`.
3. **검증** `scripts/verify-set-code.ts`: region별 채움률·region 내 중복 0 점검.
4. **codeless 21건 정책 적용**(§7-Q1 결정 반영).
5. **id 표준화는 미착수**.

---

## 7. 미결 결정 사항
- **Q1. EN codeless 21건**(POP·McDonald's·Trainer Kit·Rumble·Southern Islands): NULL 유지 vs 비공식 코드 부여.
- **Q2. KR 코드 정책**: native(s5/s6/s7) 유지 확정 + 깨진 코드(BGR 등)만 교정 — 동의 여부.
- **Q3. EN 변형셋 코드**(swsh9tg 등 Trainer Gallery): base와 같은 코드 vs `-TG` 접미 구분.
- **Q4. `id`(PK) 표준화**: 고위험, 현재 보류 — 장기 과제로 둘지.
- **Q5. 외부 매핑용 canonical 코드 컬럼** 신설 여부(현재 limitless-setmap.json로 충분 → 안 함).
