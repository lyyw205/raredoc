# 후속 PR 계획 (Follow-up Plans)

이 파일은 현재 PR 범위 밖이지만 다음에 해결해야 할 작업들을 모음.  
완료되면 해당 섹션 삭제 (history 는 git log 로).

---

## 1. PMCG5/6 이미지 재매핑 🔴 P1

**상태:** 모든 이미지 데이터 초기화 완료 (NULL). 깨진 이미지 노출은 없지만 회색 placeholder 상태.  
2026-05-29 에 `cleanup-pmcg56-images.ts` 실행 — Bulbapedia 매핑 176 건 삭제, CardLocale.imageSmall/Large 194건 NULL, LogicalCard.illustrator 194건 NULL.

### 보존된 데이터 (정확함)
- LogicalCard: hp / types / attacks / abilities / pokedexNumbers / rarity / supertype / **nameKo** / 기타 메타
- CardLocale: id / name(일본어, JP 정식명) / setId / number

### 손상 원인
이전 자동 fix 시 매핑 카오스 발생:
- 18 카드에 4중 매핑 (한 cardLocaleId 에 ExternalIdMapping row 4개)
- 다수 카드의 매핑이 다른 카드로 옮겨짐 (PMCG5-004 등)
- Supabase 의 파일 이름과 cardLocaleId 어긋남

### 정확한 fix 전략
- PMCG5: `Gym_Heroes_(TCG)` 의 `Leaders'_Stadium` 섹션
- PMCG6: `Gym_Challenge_(TCG)` 의 `Challenge_from_the_Darkness` 섹션
- 각 row 에서 **영문 슬러그 + 일본어 카드명** 동시 추출 (인덱스 매칭 금지)
- 일본어 이름으로 우리 DB CardLocale 매칭 → 정확한 cardLocaleId 획득
- 이미지 재다운로드 → Supabase 업로드 → DB URL 갱신

### 추가 미해결
- 18장 (PMCG5: 002,003,005,010,017,018,024,025,037,039,046,047; PMCG6: 008,015,062,063,067,068) 은 같은 종이 두 번 등장. tcgdex 데이터 오류일 수도, 진짜 다른 카드일 수도. 진단 필요.

### 검증된 mismatch 예시 (PMCG6)
| DB ID | DB tcgdex name | 실제 매핑된 Bulbapedia | 진단 |
|---|---|---|---|
| PMCG6-076 | ブレインのギャンブル (Blaine's Gamble) | Brock's Dugtrio | ❌ 완전 다른 카드 |
| PMCG6-077 | ゴミ交換 (Trash Exchange) | Giovanni's Machamp | ❌ 다른 카드 |
| PMCG6-078~081 | サブリナの視線, 透明な壁, ワープポイント, ブレインの最後の手段 | undefined (매핑 없음) | ⚠ 이미지 누락 |
| PMCG6-082 | ブレインのクイズ3 | Blaine's Doduo | ❌ 다른 카드 |

### 원인
- 두 출처(tcgdex, Bulbapedia JP 섹션)가 같은 카드 집합을 **다른 순서**로 나열
- 초기 스크래퍼가 row index 매칭 가정 → 줄줄이 misalignment
- 1차 fix: dexId 로 Pokemon 은 잡았지만 Trainer 는 식별자 없어 부정확
- ExternalIdMapping 의 `cardLocaleId` 와 실제 카드가 다른 카드 가리킴

### 정확한 fix 전략 (다음 PR)
Bulbapedia 의 JP 섹션 테이블 row 안에는 **영문 슬러그 + 일본어 카드명** 둘 다 적혀있음.

```
1. https://bulbapedia.bulbagarden.net/wiki/Gym_Heroes_(TCG)  section "Leaders'_Stadium"
2. https://bulbapedia.bulbagarden.net/wiki/Gym_Challenge_(TCG)  section "Challenge_from_the_Darkness"
3. 각 row 에서 (english_slug, japanese_name) 쌍 동시 추출
4. japanese_name 으로 우리 DB CardLocale 검색 → 정확한 cardLocaleId 획득
5. ExternalIdMapping + CardLocale.imageSmall/imageLarge + Supabase 파일명 모두 재할당
6. Pokemon 카드는 이미 정확하므로 건너뜀 (혹은 verify only)
```

### 차선책 (긴급 시)
- Trainer/Stadium 카드의 imageSmall, imageLarge, illustrator, ExternalIdMapping 모두 NULL/delete 로 초기화 → 깨진 이미지 노출 차단
- 단점: 53장 (PMCG5: 30 + PMCG6: 23) 카드가 이미지 없는 상태로 표시

### 영향 받는 카드 ID 범위
- PMCG5: supertype = "Trainer" 또는 NULL 인 30장
- PMCG6: supertype = "Trainer" 또는 NULL 인 23장

---

## 2. Trainer/Energy JP 이름 품질 🟡 P2

**상태:** tcgcsv/tcgdex 가 1996 시대 Trainer/Energy 카드 일본어 이름을 부분 번역으로 가짐.

### 예시
- "Sabrina's esp" (소문자 esp 그대로) → 정식 "サブリナのサイキックESP"
- "ビードル" 만 있고 "コガのウィードル" 의 "コガの" 접두사 누락
- "金星" (= 금성, 오번역) → "フシギバナ" (이미 Pokemon 은 PokeAPI 로 fix 했지만 Trainer 는 미해결)

### 해결 출처
- Bulbapedia JP 섹션의 일본어 이름 컬럼 (위 1번 작업과 동시 처리 가능)
- 또는 일본 위키 (wiki.pokemonwiki.com, Cloudflare 우회 필요)
- 또는 수동 입력

---

## 3. PMCG2~6 EN 교차검증 🟢 P3

**상태:** Phase A 검증 리포트에서 PMCG1 만 pokemontcg.io base1 과 교차 검증 완료. 나머지 5세트는 미실시.

### 작업
- PMCG2 → pokemontcg.io "base2" (Jungle, 64 cards)
- PMCG3 → "base3" (Fossil, 62 cards)
- PMCG4 → "base5" (Team Rocket, 83 cards)
- PMCG5 → "gym1" (Gym Heroes, 132 cards)
- PMCG6 → "gym2" (Gym Challenge, 132 cards)

각 세트의 Pokemon 카드 (dex# 보유) 에 대해 우리 DB 의 hp / attacks count 와 pokemontcg.io EN 데이터 비교.

### 기대 결과
PMCG1 의 결과 (69/69 일치) 가 다른 세트에서도 재현되는지 확인. 신뢰도 검증용.

---

## 4. AI 번역으로 기술/특성 한글 텍스트 보완 🟢 P4

**상태:** LogicalCard.attacksKo / abilitiesKo / rulesKo / flavorTextKo 가 모두 비어있음 (스키마만 있음).

### 접근
1. **모던 카드 (DP1 = 2006 이후)** — pokemoncard.co.kr 공식 한국어 데이터 (배치 API 제한이지만 cron 으로 천천히)
2. **구판 (PMCG1~6 등 한국 미발매)** — GPT/Claude API 로 영문 attacks → 한글 번역. 검수 UI 만들어 커뮤니티 기여.

### 우선순위
모던 카드 먼저 — 한국 유저가 실제로 게임에 쓰는 카드. 구판은 collector 정보용.

---

## 5. modern 출처 sync 스크립트 재작성 (Phase 5 후속 1번) 🟢 P3

**상태:** Phase 5 마이그레이션으로 20개 sync 스크립트 폐기됨. modern 카드 신팩 sync 가 막혀있음.

### 작업
- 새 ERD (LogicalCard + CardLocale + ExternalIdMapping) 에 직접 write 하는 sync 작성
- 출처별 1개씩:
  - pokemontcg.io (EN) — 가장 신뢰도 높음, modern 우선
  - tcgcsv (JP) — modern 신팩 빠르게 들어옴
  - pokemoncard.co.kr (KR) — 이미지·한글명만
- ExternalIdMapping 으로 다출처 매핑 추적

### 트리거
새 확장팩 발매 시점에 raredoc 카탈로그 비어있는 게 보일 때 → 한 번 만들면 자동화 가능.

---

## 6. 다출처 충돌 검증 (Phase 5 후속 3번) 🟢 P4

**상태:** ExternalIdMapping 으로 출처별 식별자 매핑은 가능. 같은 카드의 hp, name 등 **서로 다른 값** 출처별 추적은 미지원.

### 신설할 모델
```prisma
model AttributeObservation {
  subjectType   String   // "CardLocale" | "LogicalCard" | "Set"
  subjectId     String
  attribute     String   // "name_ja" | "hp" | "rarity" 등
  value         Json
  sourceId      String
  observedAt    DateTime
  // ...
}
```

### 트리거
같은 카드를 2개 이상 출처에서 받기 시작해 충돌이 실제로 발생할 때. 미리 만들면 오버엔지니어링.

---

## 7. GradedCopy (PSA 등 등급 추적, Phase 5 후속 5번) 🟢 P5

**상태:** CollectionItem 은 자가등급 (NM/LP/HP) 만 지원. PSA10/9 같은 외부 등급은 별도 모델 없음.

### 트리거
마켓플레이스에 "PSA10 시세", "PSA10 컬렉션 가치" 등 본격 거래 기능 도입 시점.

---

## 8. 수집/분석 에이전트 Fleet 구축 🟡 P2

**상태:** 5개 도메인 에이전트가 기획됐으나 2개만 구현. 나머지 3개 미구현.  
원본 제안: 세션 `61bf62e0` (2026-05-26). 배경 리서치: 세션 `a5f8dfe3` (2026-05-23, 사이트 25곳 실측).  
설계 문서: `docs/design/BACKEND_ARCHITECTURE.md §6.3`.

### 에이전트 5종 현황

| 에이전트 | 담당 테이블 | 역할 | 상태 |
|---|---|---|---|
| **set-collector** | Set | 신팩·세트 메타 | card-collector 에 흡수됨 |
| **card-collector** | CardLocale/LogicalCard | 카드 기본정보·한글명 | ✅ 구현 (`.claude/agents/card-collector.md`) |
| **card-grouper** | LogicalCard 묶기 | EN/JP/KR 같은 논리카드 연결 | ⚠️ 정의됨, 단 **옛 CardGroup ERD 기준 → LogicalCard/CardLocale 신 ERD로 개정 필요** |
| **price-collector** | Price, Trade, MarketStat | 다출처 시세·거래·매입가 | ❌ 미구현 |
| **deck-collector** | DeckArchetype, DeckCard, ArchetypeTrend | 메타 덱·티어·사용률 | ❌ 미구현 |
| **meta-collector** | Tournament, PlayerRanking, Ruling, GlossaryEntry, PullRate | 대회·룰·용어·봉입률 | ❌ 미구현 (`scripts/sync-meta.ts` 스텁만 존재) |

### 설계 원칙 (이미 합의됨)
- **N개 에이전트 ≠ 정확도.** 같은 사이트에 여러 에이전트 = 같은 오류 N번. 교차검증은 **독립 출처**가 일치할 때만 가치.
- **구조화 API (pokemontcg.io 등) = 결정적 스크립트** (에이전트 불필요).
- **LLM 에이전트는 (a) SPA/비정형 파싱, (b) 신팩·사이트 변경 모니터링, (c) 애매한 그룹 매핑 심판 에만.**
- robots.txt / 약관 준수 필수.

### 사이트 선정 — 끝난 것 ✅
`memory/reference_pokemon_tcg_sites.md` 에 한·일 25곳 실측 카탈로그 완성. 카테고리별 1·2순위 출처 매핑표 존재.

| 에이전트 | 1순위 출처 | 2순위 | 접근성 |
|---|---|---|---|
| deck-collector | ポケカ飯, ポケカブック(알고리즘 Tier표) | ポケキョー | ✅ ポケカ飯/ブック 접근가능, ❌ ポケカジラ 봇차단 |
| meta-collector | ポケカ飯(대회), pokemon-card.com `/rules`, **ポケゲト(봉입률 독점)** | ポケキョー 用語集 | ✅ 대부분, 봉입률은 ポケゲト 사실상 독점 |
| price-collector | magi(실거래), ポケキョー, houhou-news | 5ch 高騰스레 | ⚠️ magi 약관점검, ❌ 5ch 일본IP 필요 |
| (한국 시장 시세) | 디시 포카 마갤, ICU(미검증) | 카드몬스터(미검증) | ⚠️ 디시 Playwright, ❌ ICU ClaudeBot차단 |

### 사이트 선정 — 남은 결정 ❌
1. **에이전트별 출처 확정** — 후보 1·2순위만 있고 "deck-collector 는 ポケカ飯+ブック 둘만, 충돌 시 ブック 우선" 같은 확정 규칙 미정
2. **차단 사이트 대응** — ICU/ポケカジラ/나무위키 (ClaudeBot 차단) → Playwright 우회 / 제휴 / 포기 미결정. **ポケカジラ 는 명시적 봇차단이라 사용 금지/제휴만**
3. **5ch 일본 IP 제약** — 高騰스레 일본외 IP 차단 → 프록시 vs ikioi.jp 통계 우회 미정
4. **한국 시세 출처 약함** — ICU 미검증+차단이라 사실상 디시 마갤만. 추가 발굴 필요
5. **컴플라이언스 최종 체크** — 실제 크롤링 전 robots/약관 재확인 (magi 약관, CC BY-NC-SA 등)

### 구현 순서 제안
1. **card-grouper 개정** (신 ERD) — modern(EN/JP/KR 3판) 진입 직전 필수
2. **meta-collector** (대회·룰·봉입률) — `/cardgame` 페이지가 mock 이라 실데이터 가치 큼
3. **deck-collector** (덱·티어) — 2번과 출처 겹침(ポケカ飯/ブック), 같이 가능
4. **price-collector** — 한국 시세 출처 약해서 가장 나중. 일본 시세부터.

### 트리거
modern 카드 진입 (EN/JP/KR 3판 묶기 필요) 또는 `/cardgame` 실데이터화 착수 시.

---

## 메모: 우선순위 가이드

- 🔴 **P1** — 사용자 체감 즉시, 데이터 손상 진행형
- 🟡 **P2** — 즉시 체감 있음, 미해결 시 신뢰도 저하
- 🟢 **P3~P5** — 가치 있지만 트리거 와야 시작 (오버엔지니어링 회피)

---

## ADV/PCG 파이프라인 후속 (2026-05-29)

### 1. ADV1~5 supertype 전체 null 🟡 P2

**현황:** ADV1~5 전체 325장의 LogicalCard.supertype 이 null.  
**원인:** tcgdex /v2/ja 에 ADV 카드 데이터가 없어 메타 보강이 전혀 이루어지지 않음.  
**대응:** Bulbapedia 일러스트레이터 스크래퍼에서 각 카드 페이지의 supertype(카테고리 정보)을 추가 추출하거나, tcgdex EN 엔드포인트(`/v2/en/sets/ADV1`)에서 메타를 가져와 JP DB에 적용하는 별도 스크립트 작성 필요.  
`scripts/enrich-adv-meta-tcgdex-en.ts` (미작성) — tcgdex EN locale 카드 데이터를 ADV1~5 LogicalCard에 적용.

### 2. PCG9-068 이미지 누락 (スクランブルエネルギー) 🟡 P2

**현황:** jp-tcg-PCG9-068 (Scramble Energy) 이미지가 tcgplayer-cdn 다운로드 실패 + Bulbapedia 테이블에서도 누락 (EX_Dragon_Frontiers "Offense_and_Defense_of_the_Furthest_Ends" 섹션이 67장만 추출, 68장 기대).  
**대응:** Bulbapedia 직접 검색 또는 `Scramble_Energy_(Offense_and_Defense_of_the_Furthest_Ends_68)` 등 페이지 직접 curl 후 이미지 업로드.  
또는 PCG9-068 cardLocale을 imageSmall null 상태로 유지하고 placeholder 처리.

### 3. PCG2/3/4/5/7 Bulbapedia 카드 수 불일치 (Secret Rares) 🟢 P3

**현황:** Bulbapedia 테이블 추출 수 vs DB 카드 수 불일치:
- PCG2: 79/82 (3장 미추출)
- PCG3: 83/85 (2장 미추출)
- PCG4: 103/106 (3장 미추출)
- PCG5: 85/86 (1장 미추출)
- PCG9: 67/68 (1장 미추출)

**원인:** Secret Rare 또는 특수 포맷 카드(ex. δ포켓몬, Full Art)는 Bulbapedia 테이블에 `/wiki/SLUG_(SUFFIX)` 링크 대신 다른 형식 사용 → 기존 정규식이 미추출.  
**대응:** 해당 카드들의 illustrator는 NULL 상태. 카드 슬러그를 수동 확인 후 개별 fetch 또는 정규식 확장.

---

## L+HGSS 후속 작업 (2026-05-31)

### 1. JP L set tcgdex 카드 데이터 미보유 🟡 P2

**현황:** tcgdex `/v2/ja/sets/L1a` 등은 set 메타만 반환하고 `cards` 배열이 항상 빈 배열.  
L era (L1a, L1b, L2, LL, L3) 의 LogicalCard 메타(hp, types, attacks, abilities, rarity 등)를 tcgdex 에서 채울 수 없었음.

**해결책:** tcgdex 에 GitHub issue 제보 또는 다른 소스(tcgcsv / Bulbapedia 카드 페이지 개별 스크랩) 사용.  
현재 illustrator 만 Bulbapedia 에서 수집 완료 (~278건).

### 2. JP L set 잔여 tcgplayer-cdn 이미지 4건 🟡 P2

**현황:** L1a 2건, L1b 1건, L3 1건이 여전히 tcgplayer-cdn URL (403).  
Bulbapedia HeartGold_Collection / SoulSilver_Collection / Clash_at_the_Summit 섹션에 해당 카드 링크 없음.

**해결책:** 해당 카드 번호를 개별 Bulbapedia 검색으로 이미지 URL 수동 취득.

### 3. HGSS JP CardLocale imageSmall 누락 429건 🟡 P2

**현황:** jp-tcg-hgss1~hgss4, jp-tcg-col1 의 CardLocale 에 imageSmall 없음.  
이는 Bulbapedia EN set 페이지의 JP 섹션에서 이미지 URL을 수집하지 않았기 때문.

**해결책:** `sync-hgss-bulbapedia-jp.ts` 확장 — 각 JP 카드 페이지를 개별 방문해 이미지 + illustrator 수집 (dp+pt 패턴).

### 4. HGSS EN-JP 카드 수 불일치 (partial overlay) 🟡 P3

**현황:** Bulbapedia HGSS EN 페이지의 JP 섹션은 전체 카드 목록이 아닌 일부만 표시.  
hgss1 124장 중 106장만 JP overlay. hsp 0장 (프로모, JP 없음).

**해결책:** 각 JP L set 의 개별 카드 페이지에서 EN hgss LogicalCard 와 이름 기반으로 교차 연결. 또는 별도 JP-EN 매핑 테이블 구축.

---

## N. BW JP 이름 품질 개선 🟡 P2 (2026-05-31 추가)

**현황:** `sync-bw-bulbapedia-jp.ts` 가 Bulbapedia JP 섹션에서 EN 카드명을 그대로 가져옴 (title 속성이 EN). `fix-jpname-pokeapi.ts` 가 1,133건의 Pokemon 카드 JP 이름을 PokeAPI 정식 일본명으로 교체했으나 Trainer/Energy 는 미대상.

**미해결:** BW Trainer/Energy 카드 JP 이름이 EN 그대로 (예: "Professor Juniper", "N", "Bianca" 등). Bulbapedia 개별 카드 페이지나 별도 JP 위키에서 일본명 수집 필요.

**영향:** `jp-tcg-bw*` CardLocale 중 supertype=Trainer/Energy 인 카드 약 200~300건.

---

## N+1. BW bw1 JP overlay 보완 🟡 P2 (2026-05-31 추가)

**현황:** bw1 (Black & White) JP 매칭이 56건에 그침. Black Collection + White Collection 이 EN bw1 과 번호 체계가 달라 deduplicate 후 EN 115장 중 56장만 JP 연결.

**해결책:** Black Collection (BW1a), White Collection (BW1b) 을 별도 JP Set 으로 분리 등록하고 개별 JP 번호 체계로 관리. 또는 Bulbapedia 개별 카드 페이지에서 EN↔JP 번호 매핑 직접 추출.

---

## N+2. XY 에라 동기화 🟢 P3 (2026-05-31 추가) — 완료됨

**현황:** `sync-xy-pokemontcgio.ts` 실행 완료. XY 16 EN 세트 등록.

---

## N+3. XY JP orphan LogicalCard ↔ EN LogicalCard 연결 🟡 P2 (2026-05-31 추가)

**현황:** JP XY 카드는 `lc-orphan-jp-tcg-XY*` LogicalCard 에 있고, EN XY 카드는 `lc-en-tcg-xy*` 별도 LogicalCard 에 있음. 두 SetGroup 내 같은 번호의 EN/JP 카드가 서로 다른 LogicalCard 로 분리돼 있음 (Phase 3 defer).

**영향:** SetGroup 내 EN+JP 카드 두 LogicalCard — 검색/티어 기능에서 중복 노출 가능.

**해결책:** 같은 SetGroup 내 EN와 JP CardLocale 를 number 기준으로 매칭 → JP CardLocale 의 logicalCardId 를 EN LogicalCard 로 이전하고 lc-orphan 행 삭제. xy1↔XY1a/XY1b, xy8↔XY8a/XY8b 분할 케이스는 번호 범위 기준 처리.

---

## N+4. XY CP-only 세트 tcgdex 메타 보강 🟡 P2 (2026-05-31 추가)

**현황:** CP1~CP6 는 EN 대응 세트가 없어 tcgdex EN 엔드포인트 매핑 불가. Phase A verify 결과 CP2/CP3/CP4/CP5 illustrator 0%, supertype null 다수.

**해결책:** tcgdex `/ja/cards/CP1-N` 엔드포인트가 현재 404이나, Bulbapedia Double_Crisis_(TCG) 등 개별 페이지에서 일러스트레이터 스크래핑. `scrape-xy-illustrator-bulbapedia.ts` 에 CP 세트 추가.

---

## N+5. XY JP 이미지 Supabase 업로드 완료 확인 🟡 P2 (2026-05-31 추가)

**현황:** `upload-xy-images-supabase.ts` 실행 중 (2026-05-31 기준 진행 중). 1052 JP XY + 365 JP CP 장 업로드 대상.

**해결책:** 업로드 완료 후 `phase-a-verify-xy.ts` 재실행하여 이미지 liveness 섹션 A 재확인. tcgplayer URL 잔존 카드 있으면 재실행.

---

## N+6. SV JP imageSmall 누락 2623건 Supabase 업로드 🟡 P2 (2026-05-31 추가)

**현황:** `phase-a-verify-sv.ts` 결과 JP imageSmall null 2623/3631건. EN은 모두 정상 (0/3614).

**원인:** SV JP 카드 대부분의 이미지가 아직 Supabase에 업로드되지 않았음.

**해결책:** `upload-sv-images-supabase.ts` 스크립트 작성 → tcgdex JP 이미지 URL에서 다운로드 → R2/Supabase 업로드 → CardLocale.imageSmall 갱신.

---

## N+7. SV JP supertype null 카드 보강 🟡 P2 (2026-05-31 추가)

**현황:** `enrich-sv-meta-tcgdex.ts` 실행 중이나 일부 JP 세트 (sv-crimson-haze, sv-raging-surf, sv-heatwave-arena, sv-paradise-dragona, sv-temporal-forces 일부 등) supertype 0%.

**원인:** 해당 JP 세트 LogicalCard가 EN CardLocale와 아직 연결되지 않은 순수 JP orphan이며 tcgdex에서 supertype을 가져오는 중.

**해결책:** `enrich-sv-meta-tcgdex.ts` 완료 후 `phase-a-verify-sv.ts` 재실행으로 coverage 확인.

---

## N+8. MEGA era supertype null 카드 보강 (mega-dream-ex, ninja-spinner, abyss-eye) 🟡 P2 (2026-05-31 추가)

**현황:** mega-dream-ex(250), mega-ninja-spinner(120), mega-abyss-eye(118) 는 tcgdex 미수록. 3개 세트 합계 488장 supertype=null.

**원인:** 이 MEGA 세트들은 TCGPlayer/pokemontcg.io에서 수집한 EN 이름 카드이나 tcgdex JP에 없음. 신규 MEGA 포맷(2024~) 으로 아직 대형 카탈로그에 미등재.

**해결책 옵션:**
1. pokemontcg.io에서 해당 EN 카드 번호로 supertype fetch (EN API 존재 확인 필요)
2. 수동 bulk UPDATE: imageSmall URL 패턴으로 카드 분류 후 일괄 supertype 설정
3. 카드 이름 기반 규칙: "ex", "V", "VMAX" 접미사 → Pokémon, 그 외 → Trainer/Energy

---

## N+9. SV KR 카드 sync 🟢 P3 (2026-05-31 추가)

**현황:** SV era KR 세트 대부분이 0 카드 (kr-sv-base, kr-sv-paldea-evolved 등).

**해결책:** pokemoncard.co.kr 또는 tcgcsv KR 출처에서 SV KR 카드 sync 스크립트 작성.

---

## N+10. SwSh JP-only SetGroup supertype 정확도 개선 🟡 P2 (2026-05-31 추가)

**현황:** `enrich-swsh-jp-supertype.ts` 가 og-s1h/s1a/s3/s4/s5r/s5a/s6k/s6a/s7d/s8b/s9a/s10p/s12 (13개 JP-only 그룹, ~1,500장) 에 name-based heuristic 으로 supertype 적용 완료. 정확도는 약 90%+.

**미해결:** 일부 Trainer 카드가 "짧은 JP 이름 = 포켓몬" 오분류. 대표 예:
- ウールー(50)/バイウールー(51) 등 set 내 순서 경계선 근처 실제 포켓몬 명칭이 Trainer 로 오분류될 수 있음
- 경계 근처의 JP Trainer 아이템(ふしぎなアメ, メタルソーサー 등) 이 포켓몬으로 오분류될 수 있음

**해결책:** tcgdex JP SwSh 엔드포인트에서 개별 카드 `/ja/cards/{set}-{num}` 접근이 현재 404. 향후 tcgdex 가 SwSh JP 카드 데이터를 활성화하면 `enrich-swsh-jp-supertype.ts` 를 API 기반으로 교체. 현재로선 supertype 정확도 ~90% 유지.

---

## N+11. SwSh EN-linked SetGroup supertype (enrich-swsh-meta-tcgdex.ts) 미완료 🟡 P2 (2026-05-31)

**현황:** og-s4a (シャイニースターV, 403장), og-s8b (VMAXクライマックス, 555장), og-s12a (VSTARユニバース, 666장) 등 EN-linked SwSh SetGroups 에서 supertype null 카드 다수. `enrich-swsh-meta-tcgdex.ts` 실행 중이나 API 호출 속도 제한으로 완료까지 수십 분 소요.

**해결책:** 스크립트가 완료될 때까지 대기 후 phase-a-verify-swsh.ts 재실행.

---

## N+12. SV nameKo 미채움 카드 (Trainer/Energy, 비포켓몬) 🟡 P2 (2026-05-31)

**현황:** enrich-nameko-pokeapi.ts 실행 후 SV 포켓몬 카드 ~2,531건 nameKo 채움. 그러나 SV LogicalCard 총 5,666장 중 nameKo 있는 것은 ~2,211장.  
미채움: Trainer/Energy 카드(pokedexNumbers 없음)의 nameKo.

**해결책:** SV Trainer/Energy 카드 nameKo 는 공식 번역명 확보 필요. pokemoncard.co.kr KR 세트가 sync 완료되면 KR CardLocale.name 에서 자동 복사 가능. N+9(SV KR sync) 완료 선행 필요.

---

## N+13. MEGA era nameKo 미채움 (mega-dream-ex, mega-ninja-spinner, mega-abyss-eye) 🟡 P2 (2026-05-31)

**현황:** mega-brave-symphonia(152/184), mega-infernox(116/116), mega-munikisuzero(117/117) 는 PokeAPI 로 nameKo 완료. mega-dream-ex(0/250), mega-ninja-spinner(0/120), mega-abyss-eye(0/118) 는 0%.

**원인:** 이 3 세트는 pokedexNumbers 가 없어 PokeAPI 매칭 불가 (tcgdex 미수록).

**해결책:** 카드 이름(EN) 에서 포켓몬 이름 추출 → PokeAPI 한글명 매칭 스크립트 작성. 예: "Charizard ex" → "Charizard" → PokeAPI → "리자몽". Trainer/Energy 는 수동 번역 또는 skip.

---

## KR SetGroup 미매핑 잔여 (link-kr-setgroups.ts, 2026-05-31)

다음 KR Set 들은 자동 매핑 실패. 사람이 검토 후 EXPLICIT_MAP에 추가 필요.

| Set ID | code | 카드수 | 이름 | 매핑 후보 |
|---|---|---|---|---|
| kr-bgr | BGR | 73 | BW 확장팩 제4탄 「다크러시」 | 없음 |
| kr-bs4 | BS4 | 40 | DP 확장팩 또 다른 세계 | 없음 |
| kr-bs10 | BS10 | 40 | DP 확장팩 고대의 수호자 | 없음 |
| kr-kd | KD | 15 | BW 「케르디오 덱」 | 없음 |
| kr-temp | temp | 6 | 썬&문 강화 확장팩 「플라스마 스파크」 | og-sm1+(썬&문 강화 확장팩 「썬&문」), og-sm10b(썬&문 강화 확장팩 「스카이레전드」), og-sm11a(썬&문 강화 확장팩 「리믹스바우트」) |
| kr-bs7 | BS7 | 40 | DP 확장팩 보이지 않는 힘 | 없음 |
| kr-bd | BD | 13 | BW 「볼트로스 덱」 | 없음 |
| kr-pd | PD | 17 | BW 「플라스마단 파워 덱」 | 없음 |
| kr-bgw | BGW | 18 | BW 「배틀 강화 60장 덱 - 화이트큐레무 EX」 | 없음 |
| kr-st1 | ST1 | 55 | DP 랜덤 구축덱 | 없음 |
| kr-bs2 | BS2 | 40 | DP 확장팩 불꽃 튀는 대결 | 없음 |
| kr-bs5 | BS5 | 40 | DP 확장팩 7개의 신비 | 없음 |
| kr-bw6 | BW6 | 63 | BW 확장팩 제6탄 「프리즈볼트」 | 없음 |
| kr-bgb | BGB | 18 | BW 「배틀 강화 60장 덱 - 블랙큐레무 EX」 | 없음 |
| kr-bs9 | BS9 | 40 | DP 확장팩 호수의 기적 | 없음 |
| kr-bw8 | BW8 | 55 | BW 확장팩 제8탄 「스파이럴포스」 | 없음 |
| kr-bw1 | BW1 | 55 | BW 확장팩 제1탄 「화이트 컬렉션」 | 없음 |
| kr-st2 | ST2 | 15 | DP 펄기아 덱 | 없음 |
| kr-bs3 | BS3 | 60 | DP 확장팩 시공의 격돌 | 없음 |
| kr-mg | MG | 17 | 포켓몬 카드 게임 BW 「30장 덱 대전 set 뮤츠VS게노세크트」 | 없음 |
| kr-bw9 | BW9 | 82 | BW 확장팩 제9탄 「메갈로캐논」 | 없음 |
| kr-bg_terrakion | BG_terrakion | 14 | BW 「배틀 강화덱 - 테라키온 덱」 | 없음 |
| kr-fs | FS | 34 | BW 「퍼스트 세트 - 풀의 진화」 | 없음 |
| kr-bgz | BGZ | 18 | BW 「배틀 강화 60장 덱 - 제크로무 EX」 | 없음 |
| kr-ebb | EBB | 93 | BW 확장팩 「EX 배틀 부스트」 | 없음 |
| kr-bw5 | BW5 | 53 | BW 확장팩 제5탄 「드래곤 블라스트」 | 없음 |
| kr-td | TD | 13 | BW 「토네로스 덱」 | 없음 |
| kr-bw2 | BW2 | 71 | BW 확장팩 제2탄 「레드 컬렉션」 | 없음 |
| kr-bs8 | BS8 | 40 | DP 확장팩 화려한 전설 | 없음 |
| kr-st3 | ST3 | 12 | DP 크레세리아덱 | 없음 |
| kr-pss | PSS | 16 | BW 「플라스마단 덱」 | 없음 |
| kr-bg_cobalon | BG_cobalon | 14 | BW 「배틀 강화덱 - 코바르온 덱」 | 없음 |
| kr-dc | DC | 20 | BW 확장팩 「드래곤 컬렉션」 | 없음 |
| kr-bs1 | BS1 | 60 | DP 확장팩 모험의 시작 | 없음 |
| kr-g+k | G+K | 18 | BW 최강 폭류 60장 덱 「거북왕 + 큐레무 EX」 | 없음 |
| kr-bs6 | BS6 | 60 | DP 확장팩 암흑의 초승달 | 없음 |
| kr-bg_virizion | BG_virizion | 14 | BW 「배틀 강화덱 - 비리디온 덱」 | 없음 |
| kr-bw7 | BW7 | 76 | BW 확장팩 제7탄 「플라스마게일」 | 없음 |


---

## rarityId 미보강 잔여 — pokemontcg.io (fill-rarity-from-pokemontcg.ts, 2026-05-31)

pokemontcg.io 에서 rarity 텍스트를 가져왔으나 Rarity 마스터 매칭 실패 (신규 row 생성 금지 정책).
수동 검토 후 Rarity 마스터에 row 추가하거나 코드 매핑에 추가 필요.

| LogicalCard ID | EN CardLocale | era | rarity 텍스트 |
|---|---|---|---|
| lc-en-tcg-xy0-003 | en-tcg-xy0-003 | XY | (없음) |
| lc-en-tcg-dv1-018 | en-tcg-dv1-018 | BW | (없음) |
| lc-en-tcg-xy0-023 | en-tcg-xy0-023 | XY | (없음) |
| lc-en-tcg-xy0-006 | en-tcg-xy0-006 | XY | (없음) |
| lc-en-tcg-xy0-012 | en-tcg-xy0-012 | XY | (없음) |
| lc-en-tcg-xy0-021 | en-tcg-xy0-021 | XY | (없음) |
| lc-en-tcg-xy0-014 | en-tcg-xy0-014 | XY | (없음) |
| lc-en-tcg-xy0-011 | en-tcg-xy0-011 | XY | (없음) |
| lc-en-tcg-xy0-019 | en-tcg-xy0-019 | XY | (없음) |
| lc-en-tcg-xy0-008 | en-tcg-xy0-008 | XY | (없음) |
| lc-en-tcg-xy0-025 | en-tcg-xy0-025 | XY | (없음) |
| lc-en-tcg-dv1-019 | en-tcg-dv1-019 | BW | (없음) |
| lc-en-tcg-xy0-022 | en-tcg-xy0-022 | XY | (없음) |
| lc-en-tcg-xy0-007 | en-tcg-xy0-007 | XY | (없음) |
| lc-en-tcg-xy0-015 | en-tcg-xy0-015 | XY | (없음) |
| lc-en-tcg-xy0-017 | en-tcg-xy0-017 | XY | (없음) |
| lc-en-tcg-dv1-021 | en-tcg-dv1-021 | BW | (없음) |
| lc-en-tcg-xy0-024 | en-tcg-xy0-024 | XY | (없음) |
| lc-en-tcg-xy0-013 | en-tcg-xy0-013 | XY | (없음) |
| lc-en-tcg-xy0-035 | en-tcg-xy0-035 | XY | (없음) |
| lc-en-tcg-xy0-027 | en-tcg-xy0-027 | XY | (없음) |
| lc-en-tcg-xy0-031 | en-tcg-xy0-031 | XY | (없음) |
| lc-en-tcg-xy0-033 | en-tcg-xy0-033 | XY | (없음) |
| lc-en-tcg-xy0-038 | en-tcg-xy0-038 | XY | (없음) |
| lc-en-tcg-xy0-036 | en-tcg-xy0-036 | XY | (없음) |
| lc-en-tcg-xy0-032 | en-tcg-xy0-032 | XY | (없음) |
| lc-en-tcg-xy0-034 | en-tcg-xy0-034 | XY | (없음) |
| lc-en-tcg-xy0-039 | en-tcg-xy0-039 | XY | (없음) |
| lc-en-tcg-xy0-005 | en-tcg-xy0-005 | XY | (없음) |
| lc-en-tcg-xy0-026 | en-tcg-xy0-026 | XY | (없음) |
| lc-en-tcg-xy0-029 | en-tcg-xy0-029 | XY | (없음) |
| lc-en-tcg-xy0-002 | en-tcg-xy0-002 | XY | (없음) |
| lc-en-tcg-xy0-028 | en-tcg-xy0-028 | XY | (없음) |
| lc-en-tcg-xy0-030 | en-tcg-xy0-030 | XY | (없음) |
| lc-en-tcg-xy0-004 | en-tcg-xy0-004 | XY | (없음) |
| lc-en-tcg-xy0-001 | en-tcg-xy0-001 | XY | (없음) |
| lc-en-tcg-xy0-016 | en-tcg-xy0-016 | XY | (없음) |
| lc-en-tcg-xy0-009 | en-tcg-xy0-009 | XY | (없음) |
| lc-en-tcg-xy0-020 | en-tcg-xy0-020 | XY | (없음) |

