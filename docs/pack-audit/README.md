# 카드팩 점검·정본화 파이프라인 (PACK AUDIT PIPELINE)

> 카드팩(setGroup) 단위로 메타데이터를 점검하고, 부족·오류를 정본 출처로 채우는 작업.
> **다른 로컬에서 이어받을 때 이 문서 + `docs/pack-audit/*.md`(팩별 기록) + `scripts/`를 읽고 시작.**
> DB는 **원격 Supabase**(`.env`의 `DATABASE_URL`)라 모든 로컬이 같은 데이터를 본다.

## 전제
- `npm install` 후 `npx prisma generate`. `.env`에 `DATABASE_URL`(Supabase, 5432 direct) 필요(.gitignore라 git에 없음 → 수동 생성).
- 스크립트 실행: `npx tsx scripts/X.ts`.

## 표준 점검 항목 (inspect-pack.ts가 전부 점검)
세트구성/primarySetId · 카드수↔Set.cardCount·번호무결성 · 언어↔region 정합성 · 게임데이터(hp/rarity/attacks/abilities/pokedexNumbers) · attacks/abilities JSON 구조품질 · 일러스트·flavorText · CardText(ko/ja) · 이미지호스팅 · supertype 오분류 · 한글명 정확성 · provenance(ExternalIdMapping).

## 절차
1. `npx tsx scripts/inspect-pack.ts <setGroupId|setId>` — 현황 파악(읽기전용).
2. 부족 항목별 **최적 출처를 그때그때 리서치/선택** (고정 금지).
3. 채움(쉬운것부터, `--dry-run` 먼저).
4. inspect-pack 재실행 검증.
5. `docs/pack-audit/<setGroupId>.md`에 결과+선택 출처 기록.

## 핵심 출처 & 도구
| 데이터 | 출처 | 스크립트 |
|---|---|---|
| 도감번호·한글명(영문명 세트) | PokeAPI | `fill-pack-pokeapi.ts <setId>` |
| 한글명 정확성 검증·정정(도감기준) | PokeAPI | `fix-pack-ko-from-dex.ts <setId>` (TCGdex 팩은 stale-ko 빈발 → --dry-run 먼저) |
| JP명·일러스트·구조화 attacks·abilities | **Bulbapedia** (리다이렉트 추적, 트레이너/에너지 인포박스, supertype 교정) | `sync-pack-bulbapedia-jp.ts <setId> --bulbaSet="<EN세트명>"` |
| **한국 발매팩 한글명·레어도 정본** | **나무위키**(브라우저 UA 필수, WebFetch는 403) | `sync-pack-namu-ko.ts <setId> <namuTitle>` |
| KR↔JP 카드 그룹화 | 번호+이름 매칭 | `group-kr-merge.ts`, 합본팩은 `group-m1-kr.ts`/`group-sv11-kr-en.ts` 패턴(id 접두사 서브셋) |

## 중요 학습(함정)
- **TCGdex 신팩 레어도/세트명 부정확**: 세트명 placeholder(예 ムニキスゼロ=실제 ニヒルゼロ/니힐제로), 레어도도 틀릴 수 있음. **카드 이미지(imageLarge)가 ground truth.**
- **지역별 레어도 다름**: 예 메가다크라이 = 일본판 MUR(Mega Ultra Rare) / 미국판 Mega Hyper Rare. 우리는 일본판 기준. `Mega Ultra Rare`는 hyper_rare 카테고리로 재배치함.
- **PokeAPI ko = 종족명만**(메가/ex 누락) + 트레이너 미커버 → **한국 발매팩은 나무위키가 정본**(메가지가르데 ex 등 정식 카드명·트레이너명·레어도).
- **stale-ko 버그**: 과거 "카드번호=도감번호" 오매핑으로 한글명이 틀린 TCGdex 팩 다수. `fix-pack-ko-from-dex --dry-run`으로 탐지.
- **합본/컴필레이션 팩**: 합본 JP는 id 접두사(M1L/M1S, SV11B/SV11W)로 서브셋 구분, numberInt 중복. Bulbapedia는 원본세트로 리다이렉트. 스타트덱100/스타터덱 등 별제품이 number-merge로 잘못 묶이면 별도 setGroup 분리.
- **CardLocale.name이 영문/일어로 남아도** CardText(ko)로 표시 대체(옵션 C 설계).

## 진행 현황 (2026-05-31)
- **MEGA 시리즈 6팩 완료**: M1 brave-symphonia / M2 infernox / M2a dream-ex(스타트덱100=kr-mc 재수집 잔여) / M3 munikisuzero(니힐제로) / M4 ninja-spinner / M5 abyss-eye. (각 `docs/pack-audit/mega-*.md`)
- **SV 완료**: `sv-black-bolt-white-flare`(블랙볼트+화이트플레어) — 중복 3세트 삭제, EN/KR 682장 JP 그룹화, 나무위키 정본화. 남은공백: JP 이미지 0/348·pokedexNumbers 0·ko 11장 누락.

## 남은 cross-cutting 작업
1. 스타터덱·스타트덱100(kr-mc, kr-starter-m1) pokemoncard.co.kr 재수집.
2. abilities 0 (TCGdex 팩) Bulbapedia 보강.
3. flavorText·CardText(ja)·provenance(ExternalIdMapping) 전반 미수집.
4. dream-ex rarity 113/250(Namu 표 없음).

## 옵션 C (CardText 오버레이) 배경
`LogicalCard.nameKo/*Ko` → `CardText{logicalCardId, language, name, attacks, abilities, rules, flavorText, source}` 로 일반화 중. 한국 사이트라 ko 우선 표시. 읽기경로 이관(step C)·*Ko 컬럼 제거(step E)는 미완.
