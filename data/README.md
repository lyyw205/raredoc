# `data/` — 데이터 레이크 안내

이 폴더는 **빌드타임 `scripts/`(수집·적재·집계)의 입력·캐시**다. 외부 공식 사이트·스크래퍼에서 긁은 덤프가 DB 적재 스크립트의 소스로 쓰인다.

> **런타임 의존은 단 하나** — `data/tier-lists/`만 프로덕션 번들에 들어간다(`src/lib/tier.ts` → `/tier-list/[setCode]`). **나머지 전부 빌드타임 전용**이라 프로덕션과 무관하다.

---

## 디렉터리 지도

| 디렉터리 | 한 파일 = 무엇 | 출처 | 생성 스크립트 | 주요 소비처 | git |
|---|---|---|---|---|---|
| **jp-official/** | 세트당 1 JSON — JP 카드 권위(번호·이름·기술·일러) | pokemon-card.com (+tcgdex 2개) | `collect-jp-pokemoncard.ts` | `load-jp-official.ts`·`fill-jp-*`·`apply-*` 외 14+ | **추적** |
| **kr-official/** | 세트당 1 JSON — KR 권위(한글명·공식번호·이미지·detailId) | pokemoncard.co.kr | `collect-kr-pokemoncard.ts` | `apply-kr-official.ts`·`verify-kr-mapping.ts` | **추적** |
| **pokeapi/** | 종(Species) 도감명 CSV 5종 | PokeAPI/veekun (`.pinned-commit` 고정) | `refresh-pokeapi-names.ts` | `lib/pokeapi-names.ts`·`fill-pack-pokeapi.ts` 외 | **추적** (자체 README 有) |
| **tier-lists/** | 세트당 시세/투자 티어 큐레이션 | 수기 | (수동) | ★`src/lib/tier.ts` (런타임) | **추적** |
| **collect/** | 보조수집 스테이징(2계열, 아래) | Limitless + 수동 | `collect-jp-limitless.ts`·`collect-pack.ts` + 수동 | `load-jp-collect-packs.ts` 외 | **추적**(수동분 보호) |
| **en-ptcg/** | 세트당 1 JSON — EN 풀스펙 | pokemontcg.io | `fill-en-orphan-meta.ts` | `build-limitless-setmap.ts` | **ignore**(재생성) |
| **pokedata/** | 대회×디비전당 standings | pokedata.ovh ⚠️취약 | `collect-majors-pokedata.ts` | 동(영구캐시·재조회금지) | **ignore**(백업주의) |
| **limitless-web/** | 대회 HTML 원본(보통 2/대회) | limitlesstcg.com | `lib/limitless-web-parse.ts` | `collect-majors-pokedata.ts` 외 | **ignore** |
| **deck-codes/kr/** | 덱코드당 해석된 카드리스트 | pokemoncard.co.kr | `enrich-koreanleague-kr.ts` | 동 | **ignore** |
| **kr-league/** | `menu700.html` 1개(코리안리그 메뉴) | pokemonkorea.co.kr ⚠️라이브 | `enrich-koreanleague-kr.ts` | 동 | **ignore**(스냅샷주의) |

### `collect/` 2계열
- `jp-*.json` — Limitless JP DB 등에서 긁은 JP 팩(`collect-jp-limitless.ts` 산출, 재생성 가능).
- `sp-hunt-*.json`·`sp-raw-wikitext.txt`·`extra-reg-mapping.json`·`jp-s-p-supplement*` 등 — **수작업/다출처 교차 산출물(생성 스크립트 없음 = 재생성 불가)**.
- `sv-base/{en,jp,kr}.json` — 한 세트의 3국 트리오(`collect-pack.ts`).

---

## 최상위 파일

| 파일 | 무엇 | 생성 / 소비 | git |
|---|---|---|---|
| `limitless-setmap.json` | Limitless 세트코드 → 내부 setId 매핑(en/jp 블록) | `build-limitless-setmap.ts` / `lib/resolve-card.ts` | 추적 |
| `major-registry.json` | 공식 정본(pokedata) ↔ 보강(limitless-web) 대회 조인 키 | `collect-majors-pokedata.ts` / `enrich-majors-limitless.ts` | 추적 |
| `kr-secret-collect.json`·`-3packs`·`-5packs`·`kr-s5a-names.json` | SWSH 시크릿/이름 **수작업 매핑(재생성 불가)** | `scripts/archive/` 일회성 소비 | **커밋 보존** |

---

## git 추적 정책

전체 91MB 중 **18MB만 추적**한다. 기준:

- ✅ **추적**: 공식 권위 덤프(`jp-official`·`kr-official`), 레지스트리 2종, `pokeapi`, `tier-lists`, `collect/`(수동분 보호 목적 전체).
- 🚫 **ignore**(재생성 가능 외부 캐시 — `.gitignore` 참조): `en-ptcg`·`limitless-web`·`pokedata`·`kr-league`·`deck-codes`. 파일은 디스크에 남고 추적만 제외. 캐시 미스 시 생성 스크립트가 자동 재페치.
- ⚠️ **반드시 커밋**(재생성 불가 수동자산): `collect/`의 `sp-hunt-*`·`sp-raw-wikitext.txt`·`extra-reg-mapping.json`·`jp-s-p-supplement*`, 그리고 최상위 `kr-secret-collect*`·`kr-s5a-names.json`. **생성 스크립트가 없어 `git clean` 시 영구 소실** — 정리 전 반드시 커밋 또는 백업.
- ⚠️ **출처 취약**: `pokedata`(개인 .ovh, 재조회 금지)·`kr-league`(라이브 스냅샷)는 ignore이지만 삭제 전 백업 권장.

---

## 알려진 부채 (의도적 미수정)

- **`jp-official/` 명명 4갈래 혼재** — 같은 폴더에 `S9.pcjp.json`(대문자+`.pcjp`) / `jp-s9.json`(소문자+`jp-`) / `jp-tcg-XY10.pcjp.json`(접두) / `tcgdex-S12.json`(출처박힘)이 공존하고 대소문자도 섞임. `kr-official/`(250개 단일 규칙)·`en-ptcg/`(소문자코드 단일)이 모범. **14+개 소비 스크립트가 이 경로를 직접 참조**하므로 일괄 rename은 고위험 — 건드릴 땐 소비처 전수 점검 필수.
