# 카드팩 검증 배치 — MEGA + SV (2026-06-05)

> 절차 `docs/verification/playbook.md` · 도구 `scripts/verify-pack.ts`(DB 점검) + 워크플로(적대검증) · 출처 `source-registry.md`.
> 범위: MEGA 4팩(abyss-eye 기검증 + ninja-spinner/nihil-zero/dream-ex/inferno-X) + SV 20팩.

## 적용한 수정 (safe, 출처확정)
| 수정 | 대상 | 출처 |
|--|--|--|
| `Set.code` null→채움 | M5(abyss) M4(ninja) M3(nihil) M2a(dream) M2(inferno) | pc-jp/pc-kr 이미지경로·KR set code |
| illustrator 23장 교정 | ninja-spinner #77,84-96,104,107,110,114-119 | **pc-jp 권위**(워크플로 적대검증 confirmed) |
| JP 카드명 교정 | ninja #73 大漁ネット·#74 変化の書 + 전각ＡＺ→AZ 3장 | pc-jp(jp-m4.json) |
| **types 백필 355장** | ninja 96 + dream-ex 190 + abyss 69 포켓몬 | **pc-jp details.php icon-class** (`scripts/fill-jp-types.ts`, 순수 fill) |
| **kr-m-p 프로모명 33장** | ninja "M-P N"→뿔충이/독침붕 ex 등 | `LogicalCard.nameKo`(기존) → CardLocale.name 복사 |

## 팩별 점수 (verify-pack SCORE = 완전성40+구조30+식별30)
> ⚠ SCORE는 **DB-merge 상태** 기준. SV 7팩(아래 B)은 렌더 JSON은 완전하나 DB는 EN-only라 **점수가 과소평가**됨.

| pack | score | 상태 |
|--|--|--|
| **MEGA** | | |
| mega-infernox (M2) | 98 | 양호 (types 84%, dex/rarity/regMark 100%) |
| mega-munikisuzero/nihil (M3) | 97 | 양호 (types 78%, regMark 100%) |
| mega-ninja-spinner (M4) | 87→**96** | illustrator 교정완 · types 백필완 · kr-m-p 프로모명 해결완 |
| mega-dream-ex (M2a) | 85→**92** | **types 백필완** · **rarity 48%**(잔여) |
| mega-abyss-eye (M5) | 68→**92** | **types 백필완**(시크릿25 잔여) · attacks 구조불량(기검증) |
| **SV — DB 완전병합(8+5)** | | |
| sv-151 / paradise-dragona / crimson-haze / raging-surf / heatwave-arena | 96·97·97·97·97 | 양호 |
| sv-prismatic-evolutions / triplet-beat / stellar-crown | 95·95·94 | 양호 |
| sv-obsidian-flames / journey-together | 91·91 | 양호 |
| sv-base | 89 | attacks jammed 36 |
| **SV — DB EN-only(렌더는 JSON 완전, B 참조)** | | |
| black-bolt-white-flare | (98) | JSON: anchors 완전 |
| destined-rivals / paldean-fates / twilight-masquerade / temporal-forces | 86·86·86·86 | JSON: krMatched 100% |
| surging-sparks | 87 | JSON 완전 |
| shrouded-fable | 80 | JSON 완전 |
| paradox-rift / paldea-evolved | 85·85 | DB병합완(점수는 rarity/attacks 갭) |

---

# 과정에서 발견된 문제 요약

## A. 시스템적 필드 갭 (재수집 필요)
1. ~~**MEGA `types` 0%**~~ → **해결(2026-06-05)**: ninja 96·dream-ex 190·abyss 69 포켓몬 타입 백필 완료(`scripts/fill-jp-types.ts`, pc-jp details.php icon-class). 잔여: **abyss 시크릿레어 25장**(base-81 official 미수록 → 더 넓은 소스 필요).
2. **`regulationMark`** — MEGA 다수 0%. 'J' 일괄은 **Bulbapedia EN 기반 추론**이라 권위 출처 아님(I-마크는 EN≠JP 넘버링이라 번호이식 시 오염) → **보류**(추측값 생성 금지).
3. **dream-ex `rarity` 48%** — **특수레어도(RR+)는 이미 DB 보유**. 잔여 129장 = **C/U/R 코먼**인데 깨끗한 소스 부재: KR은 RR+만 코드노출(C/U/R 공백), JP 상세 rarity 아이콘(`ic_rare_X.gif`)이 jp-m2a 코먼엔 없음(jp-m4 코먼엔 있는데 set별 차이). → **보류**(추측값 생성 금지). 도구 `fill-jp-rarity.ts`(아이콘 self-learning) 구축완 — 아이콘 있는 팩엔 동작.
4. **`abilities`/`flavorText` 낮음은 대부분 가짜 갭** — ex/트레이너/에너지는 설계상 무특성·무플레이버 (워크플로 확정). 실질 결손 아님.

## B. 그룹화 상태 (DB merge vs 렌더 JSON)
- **SV 7팩**(black-bolt-white-flare·destined-rivals·surging-sparks·shrouded-fable·twilight-masquerade·temporal-forces·paldean-fates): DB LogicalCard는 **EN-only** 병합이나, `src/data/group-*.json` 은 JP앵커 + KR/EN 표시매칭으로 **완전**(예 destined-rivals anchors 132·krMatched 132·enMatched 111). → **카드 그리드 렌더 정상**. 단 **per-card 언어탭(getCardDetail, DB LC 기반)은 EN만** 나올 수 있음 → `merge-en-identity.ts` 로 DB 병합 시 해소(EN 페이즈 잔여분).
- 나머지 SV: 8팩 DB완전병합 + 5팩(JP+KR 강화확장팩) 완전.

## C. KR 프로모/이름 누수 → ✅ 해결
- ~~**ninja-spinner `kr-m-p`(프로모 33장)** KR name 플레이스홀더~~ → **해결(2026-06-05)**: 실제 한글명이 이미 `LogicalCard.nameKo`에 있어 CardLocale.name 으로 복사(33장, 네트워크 불필요).

## D. 식별 정합 — 전반 양호 ✅
- **전 24팩 PokeAPI dex 불일치 0** (KR/JP 이름→종족 dex == LC.pokedexNumbers).
- attacks 구조 정상(triplet-beat 16·sv-base 36 jammed 제외). 이미지 누락 0. KR↔JP 번호미러 100%.

## E. 환경 제약 (도구)
- **정정(2026-06-05)**: 내 Bash `curl`은 **pokemoncard.co.kr(KR)·pokemon-card.com(JP) 둘 다 접근 가능**(앞 "차단" 추정은 오인). `backfill-jp-rarity-kr`의 `코드추출실패`는 **차단이 아니라 HTML 구조**(KR 상세 `no_wrap_by_admin`이 코먼엔 공백 — RR+만 코드노출). → 네트워크 수집은 직접 curl 로 가능, 단 **rarity는 KR로 C/U/R 구분 불가**.
- verify-pack.ts 는 DB-merge 상태만 측정 → 표시매칭 팩은 과소평가(B). 렌더 검증은 group JSON 확인 병행 필요.

---

# 남은 작업 (remediation backlog, 우선순위)
1. ~~**MEGA types 백필**~~ ✅ **완료(2026-06-05)** — `scripts/fill-jp-types.ts` (355장). 잔여: abyss 시크릿 25장.
2. **SV 7팩 DB EN-merge**: `merge-en-identity.ts <jp> <en> --apply` → per-card 언어탭 완성. (EN 페이즈 잔여) ← **다음 우선순위**
3. ~~**ninja kr-m-p 프로모명**~~ ✅ **완료(2026-06-05)** — nameKo→CardLocale.name (33장).
4. **dream-ex rarity** — RR+ 완료(기존). 잔여 C/U/R 코먼 129장은 깨끗한 소스 부재로 **보류**(위 A3). 더 넓은 JP 재수집 or 카드 스캔 필요.
5. (낮음) regulationMark: 권위 JP 소스(카드 스캔/JP위키 단일문자 마크) 확보 후. flavorText(JP)·attacks jammed(triplet/sv-base) 정리. abyss 시크릿 types 25장.

> 본 배치는 **검증 + 안전정정**까지 수행. types/EN-merge/프로모명/rarity 는 네트워크 수집 잡으로 분리(위 backlog).
