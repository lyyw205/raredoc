# 카드 검증 — 출처 레지스트리 (Source Registry)

> 팩 단위 카드 검증의 **출처 단일 기록처**. 모든 정정/보완 값은 여기 기록된 출처에서 와야 한다.
> 목적: 나중에 재수정·보완할 때 "이 값은 어디서 왔나"를 즉시 추적. 같은 출처는 재인용, 없으면 탐색 후 추가.
> 연동: 절차 `docs/verification/playbook.md` (내장 `/goal` 이 참조). 매핑 근거: `docs/card-packs-jp-en-guide.md`.

## 1) 메타데이터 그룹

검증·출처 배정은 **메타그룹 단위**로 한다(필드별 출처가 다를 수 있어서).

| 그룹 | 포함 필드 (DB) | 입자 |
|--|--|--|
| `IDENTITY` | CardLocale.name·number·numberInt / LogicalCard.pokedexNumbers | locale |
| `STATS` | supertype·subtypes·types·hp·retreatCost·weakness·resistance·regulationMark | logical |
| `TEXT` | attacks·abilities·rules·flavorText (+ *Ko / CardText) | locale/lang |
| `ILLUST` | illustrator *(언어중립 정답키 — 그룹화 매칭 기준)* | logical |
| `RARITY` | rarityId → Rarity/RarityCategory | locale |
| `IMAGE` | imageSmall·imageLarge | locale |

## 2) 출처 카탈로그 (catalog)

신뢰도 ★★★공식 > ★★교차검증 > ★보조.

| id | 출처 | region | 접근방식 | 신뢰도 | 제공 메타그룹 | 도구/메모 |
|--|--|--|--|--|--|--|
| `pc-jp` | pokemon-card.com (일본공식) | JP | 정적 HTTP (resultAPI `pg` + details.php) | ★★★ | IDENTITY·STATS·TEXT(ja)·ILLUST·RARITY | `collect-jp-pokemoncard.ts` · `load-jp-official.ts` · [[reference_pokemoncard_jp_collection]] (ex는 No.블록 없음→dex는 pokeapi 폴백) |
| `pc-kr` | pokemoncard.co.kr (한국공식) | KR | 정적 AJAX (`search_text_cards`+상세) | ★★★ | IDENTITY(ko)·RARITY·ILLUST·**트레이너/아이템 한국명** | `collect-kr-pokemoncard.ts` · `apply-kr-official.ts` · [[reference_pokemoncard_kr_collection]] |
| `ptio` | pokemontcg.io | EN | REST API | ★★★(EN 정규) | STATS·TEXT(en)·IDENTITY·RARITY·IMAGE | EN 메타 표준 소스 |
| `tcgdex` | TCGdex API | EN/JP | REST | ★★ | IDENTITY·IMAGE·STATS·RARITY | `collect-jp-set-tcgdex.ts` · ⚠️ JA가 SM기 빈껍데기(→pc-jp) |
| `pokeapi` | PokeAPI | species | REST | ★★★ | dex ↔ ko/ja/en 종이름 | `scripts/lib/pokeapi-names.ts` (포켓몬 그룹화 키) |
| `bulba` | Bulbapedia | cross | 정적 / Playwright | ★★ | 세트목록·JP↔EN매핑·**트레이너 영문명**·발매일 | `docs/card-packs-jp-en-guide.md` |
| `limitless` | LimitlessTCG | EN | 정적 / Playwright | ★★ | 카드/덱/메타·EN 트레이너 | `docs/meta-pipeline-limitless.md` |
| `namu` | 나무위키 | KR | 정적 | ★(보조) | IDENTITY(ko)·TEXT 보조 | `sync-pack-namu-ko.ts` · ⚠️ 다중표 오염주의 [[project_namu_multitable_corruption]] |

## 3) 기본 배정 (default) — 팩별로 예외만 기록

| locale / 그룹 | 기본 출처 |
|--|--|
| KR — 전부 | `pc-kr` (보조 `namu`) |
| JP — 전부 | `pc-jp` (보조 `tcgdex`) |
| EN — 전부 | `ptio` (보조 `tcgdex`·`limitless`) |
| dex/species (전 locale) | `pokeapi` |
| JP↔EN 매핑·트레이너 영문명 | `bulba` + `docs/card-packs-jp-en-guide.md` |

> 아래 §4 팩별 표에는 **기본과 다른 경우만** 적는다(예: 특정 팩 JP TEXT를 tcgdex가 못 줘서 pc-jp 로 교체). 기본대로면 "default" 한 줄.

## 4) 팩별 출처 배정 (per-pack)

검증한 팩마다 한 섹션. 양식:

```
### <pack-id> (<라벨>)  — 검증일 YYYY-MM-DD
| locale | 그룹 | 출처 | 커버리지 | 갭/비고 |
|--|--|--|--|--|
| JP | IDENTITY·STATS·TEXT·ILLUST·RARITY | pc-jp | 100% | — |
| KR | IDENTITY·RARITY·ILLUST | pc-kr | 100% | 트레이너 3장 미수록→namu |
| EN | STATS·TEXT·IMAGE | ptio | 98% | — |
TODO: <미해결 항목 + 시도할 출처>
```

<!-- 검증한 팩 섹션을 여기 아래에 누적 -->

### mega-abyss-eye (MEGA · アビスアイ / 어비스 아이) — 검증일 2026-06-05
**JP 단독** (EN=Pitch Black·KR 미발매 → cross-locale 그룹화 N/A). JP set code = **M5** (pc-jp 이미지경로 `/card_images/large/M5/` 로 확정).

| locale | 그룹 | 출처 | 커버리지 | 갭/비고 |
|--|--|--|--|--|
| JP | IDENTITY(jaName)·ILLUST·IMAGE | `pc-jp`(공식, M5) + `data/jp-official/jp-abyss-eye.json`(base 81) · 보조 `bulba` | jaName 114/118 · illust 81/118 | 시크릿 37장 일러 미수록(알트작가) |
| JP | dex·종족 ko명 | `pokeapi` | 포켓몬 94/94 | 트레이너/에너지 24 대상아님 |
| JP | STATS(types·regMark) · TEXT(attacks구조·abilities·ja flavor) | ❌ 미수집 | types 0% · attacks 구조불량 · flavor EN만 73 | **재수집: `pc-jp` details.php (cardID 보유)** |
| EN / KR | — | 미발매 | — | EN=Pitch Black 발매 후 `ptio` / KR 발매 후 `pc-kr` |

TODO (이 팩):
1. `types` 0/118 — pc-jp details.php 또는 bulba
2. `attacks` 구조 재파싱(name에 cost+기술명+효과 뭉침) — pc-jp details.php
3. `abilities` 16%→보강 · `regulationMark` 0%
4. 시크릿 37장 illustrator
5. JP `flavorText`(미발매로 부재 — 발매/공식 후)
6. ~~Set.code=M5~~ → 이번에 적용
7. #71·72·73·78·79 supertype 오분류(트레이너인데 Pokémon) 정정

### mega-ninja-spinner (MEGA · M4 · ニンジャスピナー / 닌자 스피너 · EN=Chaos Rising) — 검증일 2026-06-05 · EN 병합 2026-06-07
**JP + KR + EN**. JP set code **M4**.

> **EN 병합(2026-06-07)**: Chaos Rising(ptcg.io me4, 2026-05-22 발매, 86+시크릿 36=122) 수집 → en-tcg-me4 신설(orphan LC·setGroupId 컨벤션) → 병합 **119/122**(자동 104+수동 15) — 1:1 확증(↔M4 119 vs ↔니힐제로 2, 시프트 28건째)·en-dex 119 전부일치·빌드 EN 119/120. trainer-names-sv.ts +11(ホミカ=Roxie·**ジプソ=Philippe — 이미지 판정**(동일 인물+효과문 '트래시 기본악E 2장 부착' 일치)·**マチエール=Emma 소거 확정**). 수동 15(유일쌍): 메가 ex 4계열 등급별 12(DR/SR/SAR/MUR — EN subtypes 'MEGA'가 버킷키 포함돼 미스, JP LC에 MEGA enrich) + 특수E 3(Nitro Fire/Bubbly Water/Magnetic Metal). 잔여: JP #85 フォッコ AR 1(EN 미수록)·영판전용 3(**Mega Gallade ex·Krookodile ex — JP 스페셜 카드 세트 「메가엘레이드 ex」 출처(kr-m-p 대응 상품) 미수집**·Adversity Policy). ⚠ MEGA 시대 잔여 EN 미수집: me1 Mega Evolution(188)·me2 Phantasmal Flames(130)·me2pt5 Ascended Heroes(295)·me3 Perfect Order(124) — 동일 루틴 적용 가능.

| locale | 그룹 | 출처 | 커버리지 | 갭/비고 |
|--|--|--|--|--|
| JP | IDENTITY(jaName)·ILLUST·dex·IMAGE | `pc-jp` `data/jp-official/jp-m4.json`(120) · 보조 `bulba`(Chaos Rising) | jaName 115/120(전각5) · illust 94/120 · dex 100% | 알트아트 illust 23장 DB(bulba)≠pc-jp → **pc-jp 권위** |
| JP | attacks | `bulba`(Chaos Rising) | 96/120 **구조 정상** | ✓ {cost,name,text,damage} |
| JP | dex·종족 ko명 | `pokeapi` | 포켓몬 96/96 | 교차검증 불일치 0 |
| JP | STATS(types·regMark) · TEXT(abilities·ja flavor) | ❌ 미수집 | types 0/96 · abilities 22/120 · regMark 0 | 재수집: `bulba` Chaos Rising / `pc-jp` details.php |
| KR | IDENTITY(koName)·ILLUST·RARITY | `pc-kr` `data/kr-official/kr-official-m4.json`(83) | koName 82/82 · illust 78/1 · rarity 100% | kr-m-p(프로모 33)는 별도 KR 공식수집 필요 |

TODO: ①~~illustrator 23장~~ **완료** ②~~types 0/96~~ **완료**(fill-jp-types 96장) ③~~#73/#74 JP명~~ **완료** ④regMark='J' 추론 보류·abilities/flavor 가짜갭 ⑤~~kr-m-p 프로모명~~ **완료**(nameKo→name 33) ⑥~~Set.code=M4~~ **완료**

### MEGA 배치 (nihil-zero/dream-ex/inferno-X) — 검증일 2026-06-05
**JP+KR**(EN 미발매). 공통: KR↔JP 미러 100% · PokeAPI dex 불일치 0 · attacks 구조정상 · Set.code 이번 적용. nihil/inferno는 jp-official 없음(KR official+coverage로 검증), dream-ex는 jp-m2a.json 보유.

| pack | set code | 출처 | 상태 / TODO |
|--|--|--|--|
| `mega-munikisuzero` (니힐제로) | M3 | JP=기존(bulba) · KR=`pc-kr` kr-official-m3.json(116/116) | score 97 · TODO: abilities·flavor(대부분 가짜갭), regMark |
| `mega-dream-ex` (드림 ex) | M2a | JP=`pc-jp` jp-m2a.json(+types.json) · KR=kr-official-m2a.json(249) | score 85→**92** · ~~types~~ **백필완(190)** · TODO: **rarity 48%**(KR detail 스크랩실패+JSON불완전) |
| `mega-infernox` (인페르노X) | M2 | JP=기존(bulba) · KR=`pc-kr` kr-official-m2.json(115/115) | score 98 · TODO: abilities·flavor(가짜갭) |

> **types 백필(2026-06-05)**: ninja(96)·dream-ex(190)·abyss(69) 포켓몬 타입 = pc-jp `details.php` icon-class (`scripts/fill-jp-types.ts`, 캐시 `data/jp-official/*.types.json`). abyss 시크릿 25장은 base-81 official 미수록으로 잔여.

## §5. S 시대 (소드·실드) — 검증중

> **핵심 도구**: `scripts/enrich-jp-meta-tcgdex.ts <jpSetId> <tcgdexId>` — **tcgdex JP** 에서 attacks·abilities·regMark·types·hp·illustrator 보강(additive, null만). 언어순수성: attacks/abilities 는 **EN locale 없는 JP단독 카드에만**(EN병합 카드 EN텍스트 보존). 캐시 `data/jp-official/tcgdex-<id>.json`. ⚠ tcgdex JP 는 **S 시대 정상**(SM기는 빈껍데기였음).

| pack | set | 출처/조치 | score |
|--|--|--|--|
| `og-s12a` (VSTAR 유니버스) | JP S12a / EN swsh12pt5(Crown Zenith) / KR kr-s12a · 3국 DB병합 | 빈 LC 8 삭제 · **tcgdex JP 보강**(attacks 195·abilities 100·regMark 250) | 92→**95** · TODO: flavor·EN Set.code·nameKo 91% |
| `og-s12` (패러다임 트리거) | JP S12 / EN swsh12(Silver Tempest) / KR kr-s12 · **EN 미머지(별도 215)** | tcgdex JP 보강(attacks 105·abilities 17·regMark 114) | 94→**97** · TODO: **EN(Silver Tempest) 머지 보류**(사용자 지시, 머지시 attack 언어 EN로 재조정), flavor·nameKo 89% |
| `og-s11` (로스트 어비스) | EN swsh11(217) 그룹앵커 · **JP(127)/KR(126) setGroupId=null 고아** | **빈 LC 123 삭제**(`cleanup-empty-lc.ts`) | 88→**96**(EN기준) · ⚠ **JP/KR DB미머지** → 본격 JP검증은 EN-merge 후. tcgdex에 S11 없음 |
| `og-s11a` (백열의 아르카나) | JP S11a(94)+KR 병합 · EN 없음 | 식별검증(dex 0·미러 94/94) | 79 · ⚠ **types/regMark 0% 소스부재**(tcgdex S11a 카드 빈껍데기·official JSON 없음 → pc-jp pg수집 필요, **이제 fill-jp-attacks-types 로 해소가능**) |
| `og-s10p` (스페이스저글러) | JP S10P(88)+KR 병합 · EN 없음 · **pc-jp pg=857** | **attacks 영어오염 72장(100%)→JP구조화 교정** + **types 0%→채움 72** (`fill-jp-attacks-types`) | 81→**96** |
| `og-s10a` (다크판타스마) | JP S10a(99)+KR 병합 · EN 없음 · **pc-jp pg=859** | attacks 오염 80장→교정 + types 채움 80 | 80→**96** |
| `og-s10b` (포켓몬GO) | JP S10b(93)/KR/EN pgo(88) · **pc-jp pg=861** | attacks 오염 75장→교정·types 76 · **EN-merge(75매칭·영판전용 13 GO트레이너)** · かがやく=Radiant(ENMECH 추가)로 3장 흡수 | 87→**93**(EN합류 분모) · dex✔75 |
| `og-s9a` (배틀리전) | JP S9a(93)+KR 병합 · EN 없음 · **pc-jp pg=853** | **attacks 완전누락(0%)→78 채움** + types | 91→**97** |
| `og-s9` (스타버스) | JP S9(127)/KR/EN swsh9(Brilliant Stars,186) · **pc-jp pg=851** | attacks 갭 104 채움 · **EN-merge 126매칭**(VSTAR교정으로 95→126)·영판전용 60(TG갤러리·트레이너) · dex✔126 | 89(EN합류 분모) |
| `og-s10d` (타임게이저) | JP S10D(88)/KR/EN swsh10(Astral Radiance,216) · **pc-jp pg=856** | attacks 오염 72→교정·types 72 · **합본 EN-merge**(`jp-S10P,jp-S10D ← swsh10`: 106매칭=s10p51+s10d55, 영판전용 110 s10d귀속) · dex✔106 | s10p **96**·s10d 83(EN단독110 완전성↓) |
| `og-s10p` (스페이스저글러) **EN완성** | 위 합본으로 EN 51 매칭 추가(JP+KR+EN) | enNative swsh10·enMerged | **96** |
| `og-s8` (퓨전아츠) | JP S8(129)/KR/EN swsh8(Fusion Strike) **이미 병합** · **pc-jp pg=S8(named)** | attacks 오염 99→교정·types 99 (시크릿 6 잔존→sibling 5교정·1잔존) | 76→**82**(EN단독 160 분모) |
| `og-s8a` (25th Anniversary) | JP S8a(33)/KR/EN cel25(Celebrations) · **pc-jp pg=S8a** | attacks 오염 24→교정·types 24 · **EN-merge 22매칭**(Celebrations 깨끗 88%)·영판전용 3 · dex✔22 | 83→**92** |
| `og-s8b` (VMAX클라이맥스) | JP S8b(285)+KR · EN 없음(고클래스) · **pc-jp pg=S8b** | attacks **오염 190→교정**·types 193(0%→68%) · 잔존 7(V-UNION 6+유니크) | 79→**93** |

> **🔑 pc-jp named pg코드(2026-06-05)**: S9+ 는 숫자코드(851~)지만 **S8↓ 구세트는 pg 값에 세트코드 직접 사용** — `resultAPI.php?pg=S8`·`pg=S8a`·`pg=S8b`(hit 115·34·279). 숫자 800~848 은 전부 0(서빙안함), pg=850 은 スタートデッキ100 등 블록. **named 코드가 구세트 정공법**. → fill-jp-attacks-types 3번째 인자(jpSetId=캐시명)에 코드 그대로.
> **🧹 시크릿 오염 잔여 정리**: pc-jp 메인목록 밖 시크릿(알트아트)은 오염 잔존 → **신규 KEEPER `scripts/fix-corrupt-from-sibling.ts <gid>`**(같은 그룹 동일 JP이름+subtypes 의 깨끗한 형제에서 attacks 복사, **V-UNION 제외**=4분할 조각별 상이). s8 5·s8b 5 교정. 형제없는 유니크 시크릿은 잔존.

| `og-s7d` (마천퍼펙트) · `og-s7r` (창공스트림) | JP S7D/S7R(각 90)/KR/EN swsh7(Evolving Skies) **이미 병합**(트윈+S6a 합본) · **pc-jp pg=S7D/S7R** | attacks 오염 각 64교정·types 64 (sibling 4·잔존 1) | s7d 80→**94** · s7r 77→**85** |
| `og-s6a` (이브이히어로즈) | JP S6a(101)/KR/EN swsh7 병합 · **pc-jp pg=S6a** | attacks 오염 75교정·types 75 · **illust 0%→85%(86장)** | 74→**95** |
| `og-s6k` (칠흑의가이스트) · `og-s6h` (백은의렌스) | JP S6K/S6H(각 95)/KR/EN swsh6(Chilling Reign) **이미 병합**(트윈+S5a 합본) · **pc-jp pg=S6K/S6H** | attacks 오염 각 68교정·types 68 (sibling 4·잔존 1) | s6k 79→**94** · s6h 79→**90** |

> **📷 illustrator 채움 추가(2026-06-05)**: `fill-jp-attacks-types` 에 pc-jp `イラストレーター` 파싱 추가 — **빈 illustrator 만 채움**(언어중립 정답키). s6a 86장(0%→85%) 적용. 이후 팩들도 자동 채움.

| `og-s5i` (일격마스터) · `og-s5r` (연격마스터) | JP S5I/S5R(각 91)/KR/EN swsh5(Battle Styles) **이미 병합**(트윈 합본) · **pc-jp pg=S5I/S5R** | attacks 오염 각 68교정·types 68 (sibling 4/1·잔존 1/4) | s5i 78→**88** · s5r 80→**94** |
| `og-s5a` (쌍벽의파이터) | JP S5a(96)/KR/EN swsh6(Chilling Reign) 병합 · **pc-jp pg=S5a** | attacks 오염 72교정·types 72 · **illust 0%→88%(84장)** | 73→**93** |
| `og-s3` (무한존) · `og-s4` (양천의볼트태클) | JP S3(119)/S4(121)/KR/EN swsh3·swsh4 **이미 병합** · **pc-jp pg=S3/S4** | attacks 오염 96/97교정·types 동일 (sibling 4·잔존 1) | s3 81→**96** · s4 81→**96** |
| `og-s3a` (전설의고동) | JP S3a(94)/KR/EN swsh4(Vivid Voltage) 병합 · **pc-jp pg=S3a** | attacks 오염 69교정·types 69 (sibling 3·잔존 1) | 77→**89** |
| `og-s4a` (샤이니스타V) | JP S4a(330·대형)+KR · **pc-jp pg=S4a** | **attacks 오염 282 대량교정**·types(14%→) (sibling 4·잔존 0) | 83→**97** · ⚠ **EN(swsh45 Shining Fates) 미머지·보류**(37/73=51% 매칭, orphan 36=Shining Fates 메인 EN단독·JP S4a부재=s12a형 느슨한쌍) |
| `og-s1w` (소드) · `og-s1h` (실드) | JP S1W/S1H(트윈)/KR/EN swsh1(S&S base) **이미 병합** · **pc-jp pg=S1W/S1H** | attacks 오염 각 57교정·types 57 | s1w 76→**83**(영판전용 81 분모) · s1h 79→**95** |
| `og-s1a` (VMAX라이징) · `og-s2` (반역크래시) | JP S1a/S2/KR/EN swsh2(Rebel Clash) **이미 병합** · **pc-jp pg=S1a/S2** | attacks 오염 68/93교정·types 동일 | s1a 81→**96** · s2 78→**93** |
| `og-s2a` (폭염워커) | JP S2a/KR/EN swsh3(Darkness Ablaze) 병합 · **pc-jp pg=S2a** | attacks 오염 68교정·types 68 | 78→**90** |

> **✅✅ S 시대(S1~S12) 완전 마감(2026-06-05)**: 30 setGroup 전수. **og-s11a**(attacks 76+types 76)·**og-s11**(로스트어비스: attacks null 107채움+types 107, 오염 아닌 부재였음) 마저 처리. **메인세트 JP포켓몬 attacks/types 100%**. 최종 잔여 = 오염 29·types없음 73(전부 **시크릿 알트아트 + V-UNION**, pc-jp 메인목록 밖·비표준 ワザ구조 → 구조화소스 부재로 수용, 추측금지). sibling-copy 를 **types 까지 확장**(동명+subtypes 형제서 types 복사, 알트아트 동일). regMark/flavor 일부 잔여(저우선). **다음 미점검: SM기 이하.**

> **🔧 VSTAR subtype 오저장 버그(2026-06-05 발견·전역교정)**: VSTAR 카드(이름 `…VSTAR`)가 subtypes 에 **`VMAX` 만 저장**(VSTAR 누락) — VMAX/VSTAR 상호배타인데 오저장. merge-en-identity 의 `dex|subtype` 버킷이 EN[VSTAR]↔JP[VMAX]로 어긋나 **VSTAR 전부 미매칭**되던 근본원인(s9 EN병합 95→126로 급증). 전역 **51장 교정**(og-s12a 28·og-s9 9·og-s12 7·og-s9a 7) — **신규 KEEPER `scripts/fix-vstar-subtype.ts [gid] [--apply]`**(이름VSTAR+subtype VMAX → VSTAR 치환). ⚠ **완료팩 s12a·s12 의 VSTAR 도 이 버그로 고아였을 가능성 → 재머지 점검 필요**. ⚠ **EN단독 orphan(예 s10d 110·s9 60)은 attacks/types/hp 공백**(merge orphan 생성이 게임메타 미복사) → pokemontcg.io 보강 별도 과제.

> **🔑 pc-jp 옛 pg코드 수집법(2026-06-05 확립)**: S시리즈는 표준검색 UI에서 로테이션아웃(목록 pg≥870만 노출)되나, **`resultAPI.php?pg=<코드>&regulation_sidebar_form=all` 은 옛 코드도 서빙**. 코드는 `card-search/index.php` HTML의 JS 배열 `{name:"pg",value:"<코드>",label:"<확장팩명>"}` 에서 추출(900번대=최신, 내림차순). S10D=856·**S10P=857·S10a=859·S10b=861**. → **신규 KEEPER `scripts/fill-jp-attacks-types.ts <gid> <pg> <jpSetId>`**: pc-jp 상세 ワザ블록 파싱해 구조화 JP attacks({cost,name,text,damage}) + types 수집, **오염(name에 영어+`<br>`+코스트마커, len>45)·null attacks 만 교체**(깨끗한값 보존)·**빈 types 만 채움**. 캐시 `<jpSetId>.pcjp.json`. tcgdex 빈껍데기인 S10/S11/S11a 의 attacks/types 갭을 해소.
> **⚠ attacks 영어오염 버그(2026-06-05 발견)**: 일부 JP팩이 초기 EN소스 적재로 attacks 의 `name` 에 영어전문+`<br>`+`[Water]` 코스트마커가 통째로 박힘(`Pok?mon` 모지바케 동반). **정상팩(s12/s11/s9)=0%**, 오염: **s10p 100%·s10a 100%·s10b 51%·s8 30%** — **s8 및 미점검 구S/SM팩 추가 스캔 필요**(fill-jp-attacks-types 로 일괄 교정 가능). 탐지: `attacks[0].name` 이 `<br>`포함 또는 `[`시작 또는 len>45.

> **⚠ S 시대 구조 발견(2026-06-05)**: 다수 S팩이 **JP/KR setGroupId=null 고아 + EN 그룹앵커**(예 og-s11) — "done 8" SV·s12/s12a 와 달리 **EN-merge 미완**. JP/KR 본격 검증은 EN-merge(merge-en-identity + setGroupId 부여, backlog #2)가 선결. **tcgdex JP 는 S12/S12a만 정상, S11/S11a 는 카드데이터 없음**(빈껍데기) → enrich-jp-meta-tcgdex 불가, pc-jp 수집 필요.
> **빈 LC 정리 도구**: `cleanup-empty-lc.ts <gid>`(locale 0·참조 0 삭제). og-s11 에서 123장 = 검증 전 선행 정리 권장.

## §6. SM 시대 (썬·문) — 진행중

> pc-jp **named pg코드 정상**(SM12a 210·SM12 108·SM11b 68·SM11a 73·SM11 106). tcgdex JP 는 SM기 빈껍데기 → pc-jp 가 유일소스. SM 상세 ワザ 구조는 S 와 동일(파서 그대로). **SM 은 JP카드가 이미 types 보유** → attacks 만 교정(일부는 null 부재).

| pack | set | 출처/조치 | score |
|--|--|--|--|
| `og-sn11` (미라클트윈) | JP sn11(106)/KR/EN sm11(Unified Minds) **병합** · pg=SM11 | attacks **null 85채움**(부재) | 91→**96** |
| `og-sm11a` (리믹스바우트) | JP SM11a(73)/KR/EN sm11+sm12 병합 · pg=SM11a | attacks 오염 56교정 | 80→**85** |
| `og-sm11b` (드림리그) | JP SM11b(68)/KR/EN sm12(Cosmic Eclipse) 병합 · pg=SM11b | attacks 오염 57교정 | 85→**97** |
| `og-sm12` (얼터제네시스) | JP SM12(108)/KR/EN sm12 병합 · pg=SM12 | attacks 오염 89교정 | 82→**89** |
| `og-sm12a` (태그올스타즈) | JP SM12a(210·대형)+KR · EN없음(하이클래스 컴필) · pg=SM12a | attacks 오염 126교정 | 85→**92** |
| `og-sm9a` (나이트유니슨) · `og-sm9b` (풀메탈월) | JP SM9a/SM9b/KR/EN sm10(Unbroken Bonds) 병합 · pg=SM9a/SM9b | attacks 오염 48/48교정 | sm9a 80→**85** · sm9b 86→**96** |
| `og-sm10` (더블블레이즈) | JP SM10(107)/KR/EN sm10 병합 · pg=SM10 | attacks 오염 83+null 1 교정 | 84→**92** |
| `og-sn10a` (GG엔드) | JP sn10a(62)/KR/EN sm11 병합 · pg=SM10a | attacks **null 49채움**(부재) | 90→**96** · gid 'sn'오타 |
| `og-sm10b` (스카이레전드) | JP SM10b(62)/KR/EN sm11(Unified Minds) 병합 · pg=SM10b | attacks 오염 49교정 | 87→**96** |
| `og-smp2` (명탐정피카츄) | JP SMP2(25)/KR/EN det1(영화스페셜) 병합 · pg=SMP2 | attacks 오염 24교정 | 88→**99** |
| `og-sm9` (태그볼트) | JP SM9(109)/KR/EN sm9(Team Up) 병합 · pg=SM9 | attacks 오염 86교정 | 83→**90** |
| `og-sm8b` (GX울트라샤이니) | JP SM8b(243·대형)/KR/EN sm115(Hidden Fates)+sma 병합 · pg=SM8b | attacks 오염 194교정 | 83→**90** |
| `og-sm8a` (다크오더) | JP SM8a(65)/KR/EN sm9 병합 · pg=SM8a | attacks 오염 49교정 + **깊은오염 시크릿 7장 복구** | 78→**84** |
| `og-sm7` (창공의카리스마=Celestial Storm) | JP SM7(104)/KR/EN sm7 병합 · pg=SM7 | attacks 오염 83교정 | 80→**85** |
| `og-sm7a` (플라스마스파크=Thunderclap Spark) | JP SM7a(66)/KR/EN sm7 병합 · pg=SM7a | attacks 오염 47교정 | 86→**94** |
| `og-sm7b` (페어리라이즈=Fairy Rise) | JP SM7b/KR/EN sm8(Lost Thunder) 병합 · pg=SM7b | attacks 오염 45교정 | 78→**83** |
| `og-sm8` (버스트임팩트=Lost Thunder) | JP SM8(103)/KR/EN sm8 병합 · pg=SM8 | attacks 오염 81교정 | 79→**84** |
| `og-sm6` (금단의빛=Forbidden Light) | JP SM6(102)/KR/EN 병합 · pg=SM6 | attacks 오염 80교정 | 81→**87** |
| `og-sm6a` (드래곤스톰=Dragon Majesty) | JP SM6a(59)/KR/EN 병합 · pg=SM6a | attacks 오염 46교정 | 77→**80** |
| `og-sm6b` (챔피언로드=Champion Road) | JP SM6b(77)/KR/EN 병합 · pg=SM6b | attacks 오염 57교정 | 78→**82** |
| `og-sm5s` (울트라썬=Ultra Sun) · `og-sm5m` (울트라문=Ultra Moon) | JP SM5S/SM5M(각 72)/KR/EN sm5(Ultra Prism) 병합 · pg=SM5S/SM5M | attacks 오염 각 55교정 | sm5s 80→**86** · sm5m 85→**95** |
| `og-sm5+` (울트라포스=Ultra Force) | JP SM5+(56)/KR/EN sm5 병합 · **pg=SM5p**(+ 인코딩) | attacks **null 41채움**(부재) | 77→**80** |
| `og-sm4s` (각성의용사=Crimson Invasion) | JP SM4S(55)/KR/EN 병합 · pg=SM4S | attacks 오염 49교정 | 82→**90** |
| `og-sm4a` (초차원의침략자=Ultradimensional Beasts) | JP SM4A(55)/KR/EN 병합 · pg=SM4A | attacks 오염 49교정 | 88→**98** |
| `og-sm4+` (GX배틀부스트) | JP SM4+(120)/KR/EN 병합 · **pg=SM4p** | attacks **null 90채움**(부재) | 85→**90** |
| `og-sm3+` (빛나는전설=Shining Legends) | JP SM3+(77)/KR/EN 병합 · **pg=SM3p** | attacks **null 63채움**(부재) | 87→**91** |
| `og-sm3n` (빛을삼킨어둠) · `og-sm3h` (어둠을밝힌무지개) | JP SM3N/SM3H/KR/EN(Burning Shadows) 병합 · pg=SM3N/SM3H | attacks 오염 각 50교정 | sm3n 87→**98** · sm3h 83→**90** |
| `og-sm2k` (알로라의햇빛) · `og-sm2l` (알로라의달빛) | JP SM2K/SM2L(각 55)/KR/EN(Guardians Rising) 병합 · pg=SM2K/SM2L | attacks 오염 각 50교정 | sm2k 79→**85** · sm2l 87→**98** |
| `og-sm2+` (새로운시련) | JP sm2+(57)/KR/EN 병합 · **pg=sm2p** | attacks **null 49채움**(부재) | 79→**82** |
| `og-sm1s` (썬컬렉션) · `og-sm1m` (문컬렉션) | JP SM1S/SM1M(각 66)/KR/EN 병합 · pg=SM1S/SM1M | attacks 오염 56/55교정 | sm1s 81→**88** · sm1m 86→**97** |
| `og-sm1+` (썬&문 강화확장팩) | JP SM1+(58)/KR/EN 병합 · **pg=SM1p** | attacks **null 49채움**(부재) | 79→**81** |
| `og-sm0` (피카츄와새로운친구들) | JP전용 4장 프로모 · pg=SM0 | attacks 오염 4교정·types·illust | →**100** |

> **✅✅ SM 시대 완전 마감(2026-06-05)**: 42 SM setGroup 전수 — **메인세트 JP포켓몬 attacks/types 100%**. 잔여 null = og-sn11 4·og-sm12a 5(시크릿 알트아트, pc-jp 메인밖, 소스부재 수용). 깊은오염 0(sm8a 7장 이미 복구). **pg 패턴**: 일반 SMxx named, +세트는 p인코딩(SM1+→SM1p·sm2+→sm2p·SM3+→SM3p·SM4+→SM4p·SM5+→SM5p), 프로모 SM0/SMP2/det1, sn오타(sn10a·sn11). **S+SM 양 시대 attacks 영어오염 전수 교정 완료. 다음: BW/XY 등 더 구세대(미점검).**

> **🩹 깊은오염 시크릿 복구(2026-06-05)**: og-sm8a 의 UR/골드 시크릿 7장(#59~65)이 **EN소스로 레코드 전체 오염**(JP이름 영어 "Ampharos GX - 059/052"·supertype/dex/types null·attacks 영어). **신규 KEEPER `scripts/fix-en-named-secrets.ts <gid>`** — 같은 그룹 clean base 에서 자동매칭(① stripped EN이름==clean LC의 EN locale 이름 ② 포켓몬GX는 species→dex==base dex+GX)으로 supertype/types/attacks/subtypes/dex + JP/KR 이름 복원(수동매핑 0). **전 S+SM 그룹 스캔결과 이 깊은오염은 sm8a 7장 뿐**(격리). 복구: デンリュウGX·フーパGX·ガオガエンGX·コバルオンGX·エレキチャージャー·デンジャラスドリル·メタルゴーグル.

> ⚠ **gid 표기**: 미라클트윈은 `og-sn11`(jp set `jp-tcg-sn11`, 'sn' 오타이나 일관). 나머지 og-sm11a/sm11b/sm12/sm12a.

> 상세·문제요약: `docs/verification/batch-mega-sv-2026-06-05.md`

## §7. XY 시대 — 정석 재수집 진행중

| pack(gid) | JP 출처 | KR 출처 | EN | 검증일 | 비고 |
|---|---|---|---|---|---|
| sm-best-of-xy (THE BEST OF XY) | pc-jp **pg=515**(hit 314=미러중복, 번호 dedupe→186) | pc-kr "THE BEST OF XY" 186 | 미발매 | 2026-06-05 | JP set `jp-tcg-SMXY` 신설(2018-01-12), 그룹 releaseDate 2020-11-20→2018-01-12 교정. **트레이너·에너지 양국 가나다/五十音 재정렬 팩** → 신규 KEEPER `scripts/lib/trainer-names-jako.ts`(검증 ja↔ko 사전) + apply-kr phase 1.5 직매칭. rarity: KR 공식 무표기(전 186 null=갭, 실물도 무마크 복각) |
| og-cp6 (BASE PACK 20th) | pc-jp pg=440 (103) | pc-kr "BASE PACK" 113 | **en-tcg-xy12 Evolutions** 병합 99 | 2026-06-05 | 3국 구성 상이: JP 87+16 / KR **100+13** / EN 108+5. KR 트레이너도 가나다 재정렬(사전 매칭). KR-extra 12 ↔ EN orphan 12 통합(신규 KEEPER `scripts/merge-kr-en-tails.ts`: dex+mega/소울링크dex/기본에너지맵/사전체인) → 영판·한국판 전용. JP단독 4(ナッシー[Exeggutor]·イマクニ?のドードー·ピカチュウEX·ロケット団 외), EN단독 2(Flying/Surfing Pikachu). 바레 `xy12` 죽은중복 삭제(113+113+Set). verify-en-dex 99장 dex 전부 일치 |
| og-cp5 (환상·전설 드림 컬렉션) | pc-jp **pg=CP5**(named, 38) | pc-kr "환상 전설 드림 컬렉션" 36 | 미발매(Generations 는 EN단독 별도) | 2026-06-05 | **set명 오염 교정**: jp-tcg-CP5 "冷酷の反逆者"→「幻・伝説ドリームキラコレクション」(상세페이지 확인), 그룹 nameKo "냉혹한 반역자"→"환상·전설 드림 컬렉션". JP 시크릿 2장(037/038) JP단독. 매칭 36/36 스왑0 |

> **🔧 인프라(배치13)**: ① collect-jp `BREAK進化`→stage BREAK 인식 + load-jp BREAK subtypes **단독**(`["BREAK"]`, EN ptcg.io 관례; dex ja폴백 BREAK 접미어 strip). ② merge-en 1c stage백필이 BREAK 에 일반판 stage 주입하던 버그 수정(BREAK=자체 stage). ③ merge-en 4c 에너지: EN 메타없음(c=null)도 이름 `* Energy` 폴백 + 특수에너지 직매칭(`Double Colorless Energy`↔`ダブル無色エネルギー`). ④ apply-kr `buildJaKoDict`(DB 번호동일쌍+정적 trainer-names-jako, 일러버킷보다 우선) + dex버킷 (b) **일러 정확일치(유일후보) 우선**(CP6 두두↔イマクニ?ドードー 오페어 방지). ⑤ verify-en-dex fetchSet `en-tcg-` strip(이전엔 공허통과). ⑥ pg 대역: SM 시대 numeric=500~(SM0=500·THE BEST OF XY=515·sm1s=501), XY CP는 named(CP5/CP6)도 동작.

> **🩹 XY1~5 잔존 오염 소급 교정(2026-06-05)**: jako 사전 스윕으로 **지역간 번호스왑 트레이너/에너지 17건**(5그룹: xy1b 2·xy3 6·xy4 2·xy5 2·xy5a 5, 2-사이클 7쌍+3-사이클 1) 발견 — 당시 번호미러/일러버킷이 오페어(같은 일러 버킷이라 verify-kr 일러대조 통과해 은닉). 순열 재배정(전원 사전검증시에만)으로 교정, 재스윕 0. ⚠ **교훈: KR번호 스왑은 트레이너에서도 발생 — 같은 일러 버킷 내 스왑은 verify-kr 가 못 잡음 → jako 사전 스윕을 XY 팩 완료시마다 실행할 것.**

> **KR 일러 오기재(pc-kr 데이터 결함, 매핑은 정상)**: kr-smxy 12건 — 시크릿에 메인일러 복사(쥬피썬더EX·레지락EX), 소울링크 2종 일러 상호 스왑(레쿠쟈↔썬더볼트), "Toy스타디움e Beach"(st→스타디움 치환버그)·"YusukeOhmura"(공백). LC 일러는 pc-jp 권위 유지.

### 배치14 — XY9·XY10·XY11 분할 (2026-06-05)

| pack(gid) | JP 출처 | KR 출처 | EN | 검증 |
|---|---|---|---|---|
| og-xy9 (천공의 분노) | pc-jp **pg=430** (88) | pc-kr "천공의 분노" 88 (1:1) | en-tcg-xy9 BREAKpoint 병합 87·영판전용 36 | verify-kr 0/0 · en-dex 전부일치 |
| og-xy10 (초능력의 제왕) | pc-jp **pg=433** (87) | pc-kr "초능력의 제왕" 87 (1:1) | en-tcg-xy10 Fates Collide 병합 87·영판전용 38 | verify-kr 0/0 · en-dex 전부일치 |
| og-xy11b (타오르는 투사) **신설** | pc-jp **pg=437** 爆熱の闘士 (58) — jp-tcg-XY11b 신설 | kr-xy11 (기존 세트 이동) 58 | en-tcg-xy11 Steam Siege **합본**(11a+11b) 병합 111 | verify-kr 0/0 · en-dex 전부일치 |
| og-xy11a (냉혹한 반역자) | pc-jp **pg=438** 冷酷の反逆者 (58) | **kr-xy11r 신설** "냉혹한 반역자" 58 | (합본 동일) 영판전용 5 귀속 · JP단독 시크릿 5 | verify-kr 0/0 |

> **구조 재편**: 기존 og-xy11a 에 JP=冷酷の反逆者 + KR=타오르는 투사가 **서로 다른 반쪽으로 동거**하던 것을 XY5 전례로 분할 — og-xy11b 그룹 신설(ord 108)·kr-xy11 이동·kr-xy11r 신설. 그룹명 교정: og-xy9 "파천의 분노"→천공의 분노, og-xy10 "각성하는 초왕"→초능력의 제왕(KR 공식).
> **🔧 인프라(배치14)**: ① collect-jp parseImage 디렉토리 **하이픈 허용**(`XY9-B` — 이전 정규식으로 XY9 image 0/88). ② load-jp JA_DEX_SPECIAL **メガ-접두 종족명 보호**(メガヤンマ=469·メガニウム=154 — 메가진화 strip 오인). ③ apply-kr koDex **화석 가드**(`/화석|비밀의\s*호박/` — "조개화석 암나이트" 종명접미 포켓몬 오인 방지). ④ 사전: TR_JP2EN +28(BREAKpoint 9·Fates Collide 12·Steam Siege 7, 전부 orphan 대조검증), TR_JA2KO +18(화석 5·소울링크 3 포함). ⑤ 특성-only BREAK 3장(ゲッコウガ·オムスター·マフォクシー) pc-jp 상세 特性 스크랩 채움. ⑥ 바레 xy9/xy10/xy11 죽은중복 삭제(371 locale+LC).
> KR 메모: pc-kr 일러 "YusukeOhmura"(공백누락) 결함 XY11 양쪽 #054 — 매핑 정상(이름 동일·dex 0 불일치).

### 배치15 — XY6·XY7·XY8 분할 (2026-06-05)

| pack(gid) | JP 출처 | KR 출처 | EN | 검증 |
|---|---|---|---|---|
| og-xy6 (에메랄드 브레이크) | pc-jp **pg=418** (89) | pc-kr "에메랄드 브레이크" 89 (1:1) | en-tcg-xy6 Roaring Skies 병합 88·영판전용 22 | verify-kr 0/0 · en-dex 전부일치 |
| og-xy7 (밴디트링) | pc-jp **pg=420** (95) | pc-kr "밴디트링" 92 (JP단독 3) | en-tcg-xy7 Ancient Origins 병합 93·영판전용 7 | verify-kr 0/0 · en-dex 전부일치 |
| og-xy8a (푸른 충격) | pc-jp **pg=425** 青い衝撃 (64) | kr-xy8 "푸른 충격" 64 (1:1) | en-tcg-xy8 BREAKthrough **합본**(8a+8b) 병합 125 | verify-kr 0/0 · en-dex 전부일치 |
| og-xy8b (붉은 섬광) | pc-jp **pg=426** 赤い閃光 (64) | **kr-xy8b 신설** "붉은 섬광" 64 (1:1) | (합본 동일) | verify-kr 0/0 |

> **오염 교정**: og-xy8a/8b 그룹 nameKo **상호 스왑**돼 있던 것 교정(8a=青い衝撃=푸른 충격 ✓ / 8b=赤い閃光=붉은 섬광 ✓). 기존 jp DB 유령 +1~2장(XY6 91→89·XY7 97→95·XY8 65→64) 재수집으로 해소. JP XY6/XY7 KR locale 일본어명 오염·XY8 JP 영문오염·kr-xy8 placeholder 전면 재수집.
> **🔧 인프라(배치15)**: load-jp JA_DEX_SPECIAL **+3 영구화**(ゲンシグラードン383·ゲンシカイオーガ382 — XY5때 수동맵했던 Primal 접두 / ポリゴンZ474 — PokeAPI 전각Ｚ 불일치). 사전: TR_JP2EN +26(Roaring Skies 8·Ancient Origins 11·BREAKthrough 9 — **アズサ=Brigette 확정**, SMXY 전단사 추정 재인=Brigette 교차검증), TR_JA2KO +6(ミツル=민진·ナギ=은송 등 번호상이 페어 검증분). 특성-only BREAK 1장(フラージェスBREAK「フラワーブリーズ」) 채움. 바레 xy6/xy7/xy8 삭제(378 locale+LC).

> **🩹 XY1~5a 메타 소급 보강(2026-06-05, 사용자 지적)**: 배치12 파이프라인에 attacks 채움·rarity 백필 단계가 없어 7그룹(og-xy1a·1b·2·3·4·5·5a) **PK attacks/abilities 484장 null·rarity 672 LC null** 상태였음 — fill-jp-attacks-types(pg 404/405/409/411/412/415/416) 484 채움 + backfill-jp-rarity-kr(kr-xy1~kr-xy5g CFG 신규) 566 채움으로 해소, atk+abil null 전 그룹 0. 잔여 rarity null 96 = KR 없는 영판전용 orphan(타 팩 동일 수용). ⚠ **교훈: 파이프라인에 단계가 추가되면 기수집 팩 소급 적용 여부를 항상 점검할 것.**

> **✅ XY1~5a 검증 소급(2026-06-05)**: 배치12 산출 7그룹에 누락됐던 독립 검증 2종 소급 실행 — ① verify-kr-mapping SETS에 kr-xy1~kr-xy5g 등록 후 전수: **dex 불일치 0 / 일러 불일치 2**(kr-xy3 코르니 #102=KR사이트가 시크릿에 메인일러 복사·번호동일 페어 정상, kr-xy5g 나무지기=단일프린트 강제정확 — 둘 다 기지 pc-kr 오기재 패턴, 매핑 무결). ② verify-en-dex 5게이트(xy1 합본 123·xy2 87·xy3 101·xy4 94·xy5 합본 154) **전부 일치**. 바레 xy1~xy5 잔존 없음. jako 스윕 0(스왑픽스 후). → **XY1~XY12 본세트 22세트/18그룹 전체가 S·SM 표준(병합·attacks·rarity·3중 검증) 충족.**

### 배치16 — CP1~CP4 (XY 컨셉팩 4종, 2026-06-05)

| pack(gid) | JP 출처 | KR 출처 | EN | 검증 |
|---|---|---|---|---|
| og-cp1 (더블 크라이시스) | pc-jp **pg=417** (34) | pc-kr "더블크라이시스" 34 | **en-tcg-dc1 Double Crisis 34/34 완전병합·orphan 0** | verify-kr 0/0 · en-dex 전부일치 |
| og-cp2 (레전드 컬렉션) | pc-jp **pg=421** (27, 전원 포켓몬) | pc-kr "레전드 컬렉션" 27 (1:1) | 미발매 | verify-kr 0/0 |
| og-cp3 (포켓심쿵 컬렉션) | pc-jp **pg=431** (32) | pc-kr "포켓심쿵 컬렉션" 32 (1:1) | 미발매(Generations RC 별도) | verify-kr dex 0 (일러 2=pc-kr "Him기본 에너지o" 치환버그) |
| og-cp4 (프리미엄 챔피언팩 EX×M×BREAK) | pc-jp **pg=436** (140→**번호 dedupe 131**, 무번호 동봉 기본에너지 9 제외) | pc-kr "프리미엄 챔피언팩" 131 (1:1, 번호상이 0) | 미발매 | verify-kr dex 0 (일러 14=전부 pc-kr 오기재: #100/101·104/105·115/116 인접 일러 상호스왑 기재 + 공백누락 — JP·KR 같은 번호=같은 이름으로 페어링 무결 확증) |

> **오염 교정**: 그룹 nameKo KR 공식 정렬(og-cp2 "전설 키라 컬렉션"→레전드 컬렉션 · og-cp3 "포케쿈"→포켓심쿵 컬렉션). KR 4세트 일본어명 전면 재수집. 바레 `dc1` 삭제(34+34+Set).
> **🔧 인프라(배치16)**: ① apply-kr **팀 접두 가드**(`teamOk`: 마그마단의/아쿠아단의/로켓단의/플라스마단의 ↔ マグマ団の/アクア団の/…) — CP1은 JP=아쿠아先·KR=마그마先 **섹션 역순**이라 동종(포챠나·그라에나)이 (a)번호동일 우선에 교차 오염되던 것 차단; dex버킷 (a)(b)에 팀일치 필수 + (c) zip 팀별 분할. ② koDex **에너지 가드**(`/에너지$/`→null — "더블 마그마 에너지"의 '마그마'(Slugma) 종명 부분일치 오인 방지). ③ load-jp dexFromJa **팀 접두 strip**(アクア団の/マグマ団の/プラズマ団の/ロケット団の — 팀 EX dex 해결). ④ merge-en SPECIAL_E +2(Double Aqua/Magma Energy). ⑤ 사전: TR_JP2EN +10(Double Crisis 전 트레이너), TR_JA2KO +12(CP1 전 비포켓몬 사전화). ⑥ CP4 무번호 동봉 기본에너지 9 제외 처리(공식 분모 /131 밖).

### 배치17 — G1 Generations (EN단독, 2026-06-05)

| pack(gid) | 출처 | 검증 |
|---|---|---|
| og-g1 (제너레이션즈) | **EN단독**(JP/KR 미발매; JP는 20주년 스타터/CP6 대응) — en-tcg-g1 115 = 메인 83 + Radiant Collection RC32, 메타 완비(atk/types/dex/super null 0, #19 캠페인 산출) | ptcg.io 독립 대조 **115/115 dex·name 전부 일치**(번호 패딩 정규화 "001"↔"1" 필요), 번호중복 0. api측 +2는 ptcg.io 부가항목(공식 구성 밖) |

> 바레 `g1` 죽은중복 삭제(locale 117+LC 117+Set). en-tcg-g1 cardCount 117→**115** 교정. 그룹 og-g1(era XY, 2016-02-22, ord 128) 기존 정상 — EN단독 그룹은 전례(og-swsh35 챔피언즈 패스)대로 build-group JSON 없이 DB-direct 렌더. 잔여 갭: illustrator 10(ptcg.io 미제공분) 수용.

### 배치18 — XYP 프로모 + xy-decks (2026-06-05) → **XY 시대 완전 마감**

| pack(gid) | 출처 | 검증 |
|---|---|---|
| og-xyp (XY 블랙스타 프로모) | EN앵커(en-tcg-xyp 216), 메타 완비 상태였음 | ptcg.io 독립 대조 **216/216 dex·name 전부 일치**. 바레 `xyp` 삭제(216+216+Set). cardCount 216 |
| xy-decks (XY 구축덱, XY-SP) | **KR 12세트 pc-kr 재수집**(전면 placeholder "FXY 17"식 265장+super null 229) + en-tcg-xy0(Kalos Starter, kr-fxy와 36 병합 기존) | placeholder 잔존 **0** · super null **0** (PK 132·TR 117·E 13), dex null 0 |

> xy-decks 수집 노트: ① 퍼스트세트(FXY)는 도치마론/푸호꼬/개구마르 **3변형 분할검색 후 머지**(16+α→36). ② xya/xyc 무번호 동봉 기본에너지 +2씩 제외(CP4 패턴). ③ **kr-xye(대전세트 2덱 합본): 공식은 32장=번호 1~26+중복 6쌍**인데 구DB는 중복을 유령번호 #27~32로 밀어넣었던 것 — 공식 중복 둘째 장(detailId순)으로 재배정·번호 교정. 덱 LC 메타는 koDex(에너지/M접두 가드)로 supertype/dex/illus 채움(265 locale·235 LC).
> **✅✅ XY 시대 완전 마감(2026-06-05)**: 본세트 XY1~XY12(분할 포함 18그룹) + CP1~CP6 + THE BEST OF XY + G1 + XYP + xy-decks = **23팩/25그룹 전체** 3국(또는 해당 locale) 정합·메타·검증 표준 충족. 다음 구세대: BW(pg 355~375 대역).

## §8. BW 시대 — 정석 재수집 진행중

### BW배치1 — 블랙·화이트·레드 컬렉션 (2026-06-06)

| pack(gid) | JP 출처 | KR 출처 | EN | 검증 |
|---|---|---|---|---|
| og-bw1 (블랙 컬렉션) | pc-jp **pg=316** (53) — jp-tcg-BW1B 신설 | **kr-bw1b 신설** "블랙 컬렉션" 55(시크릿 2=KR단독 tail) | en-tcg-bw1 Black & White **합본**(B+W) 병합 78 | verify-kr 0/0 · en-dex 전부일치 |
| og-bw1w (화이트 컬렉션) **신설** | pc-jp **pg=317** (53) — jp-tcg-BW1W 신설 | kr-bw1 "화이트 컬렉션" 55(시크릿 2 tail) | (합본 동일) | verify-kr 0/0 |
| og-bw2 (레드 컬렉션) | pc-jp **pg=325** (66) — jp-tcg-bw2 재사용(가짜 EN역산 서브셋 교체) | kr-bw2 "레드 컬렉션" 71(시크릿 5 tail) | **en-tcg-bw3 Noble Victories** 병합 **66/66 완전** | verify-kr 0/0 · en-dex 전부일치 |
| og-bw-ep (이머징 파워즈) **신설·EN단독** | — | — | en-tcg-bw2 98 (덱·프로모 출신 컴필, 메타 완비) | DB-direct 렌더(og-swsh35 전례) |

> **🩹 구조 재편**: 기존 og-bw1 = EN-primary 가짜(LC 115에 JP locale 56이 다대일 부착, 날짜도 EN 기준) → 해체 후 JP 분할 신설. **가이드 오류 교정: 레드 컬렉션의 EN 주대응 = Noble Victories(bw3)** (Emerging Powers 교차dry 4 vs Noble 66 — guide 표는 한 칸 밀림. BW 후속 팩들도 동일 패턴 의심: 사이코/헤일→Next Destinies(bw4) 등 **n↔n+1 시프트 검증 필수**). 발매일 JP 기준 교정(블랙/화이트 2010-12-17·레드 2011-07-15, Bulbapedia 확증).
> **🔧 인프라(BW배치1)**: merge-en **isBW 분기 + trainer-names-bw.ts 신설**(+19, orphan 대조검증: ライブキャスター=Xtransceiver·しんかのきせき=Eviolite 등). TR_JA2KO +13(BW 트레이너 가나다 재정렬 페어). pg 대역 확정: **BW=310~378**(BW1=315전체/316블랙/317화이트, BW2=324전체/325레드, BW3=326전체/327사이코/328헤일, BW7=363전체/361프리즈/362콜드, BW9=373라센/374라이덴, BW10=377, EX배틀부스트=378, 샤이니컬렉션=375, 덱들 다수). 바레 bw1(참조 1 재귀속)·bw2 삭제.
> KR 노트: BW 한국판은 본세트+SR시크릿(055/053·071/066) — JP 미수록 시크릿은 KR단독 tail 보존(9장).

### BW배치2 — 사이코드라이브·헤일블리자드·다크러시·드래곤컬렉션 (2026-06-06)

| pack(gid) | JP 출처 | KR 출처 | EN | 검증 |
|---|---|---|---|---|
| og-bw3 (사이코 드라이브) | pc-jp **pg=327** (52) — jp-tcg-BW3P 신설 | **KR 미발매**(검색 0건, 한국 BW3 건너뜀) | en-tcg-bw4 **Next Destinies 합본**(P+H) 병합 82 — 시프트 교정 | en-dex 전부일치 |
| og-bw3h (헤일 블리자드) **신설** | pc-jp **pg=328** (52) — jp-tcg-BW3H 신설 | 미발매 | (합본 동일) | — |
| og-bw4 (다크러시) | pc-jp **pg=339** (69) — jp-tcg-bw4 재사용(가짜 교체, 참조 1 EN 재귀속 후 load) | kr-bgr 73 (시크릿 EX 4 tail) | en-tcg-bw5 **Dark Explorers** 병합 67 — 시프트 교정 | verify-kr 0/0 · en-dex 전부일치 |
| og-dv1 (드래곤 컬렉션) | pc-jp **pg=340** (20) — jp-tcg-DC 신설 | kr-dc 20 (1:1 완전, KR 공식명 "드래곤 컬렉션") | en-tcg-dv1 Dragon Vault 병합 **20/20 완전** | verify-kr 0/0 · en-dex 전부일치 |

> **시프트 교정 확증 2건째**: 사이코/헤일↔Next Destinies(82) — 가이드 154행의 "Noble Victories 일부 차출" 오류 교정. 가짜 jp-tcg-bw3(합본 173→진짜 52+52) 해체, jp-tcg-bw5(잡탕 167)는 다음 배치에서 처리. EN 시프트 이동: en-tcg-bw4→og-bw3·en-tcg-bw5→og-bw4. 발매일 JP 확증(BW3=2011-09-16·다크러시=2011-12-16·DC=2012-01-27, Bulbapedia). 🔧 isBW에 dv 추가(드래곤볼트가 SV 사전으로 폴백하던 버그). trainer-names-bw +14(orphan 검증: バッドチームのジムとサブ=Hooligans Jim & Cas·ファーストチケット=First Ticket 등). 바레 bw3/bw4/bw5/dv1 삭제(337+337). load 참조가드 우회 절차 확립(참조→동일 LC EN locale 임시 재귀속).

### BW배치3 — 드래곤 블라스트·드래곤 블레이드·프리즈볼트·콜드플레어 (2026-06-06)

| pack(gid) | JP 출처 | KR 출처 | EN | 검증 |
|---|---|---|---|---|
| og-bw5 (드래곤 블라스트) | pc-jp **pg=341** (50) — jp-tcg-BW5B 신설, JP 정식명 **リューズブラスト** | kr-bw5 53 (SR tail 3: 뮤/테라키온/기라티나 EX, KR↔JP #48·49 트레이너 번호스왑 1쌍) | en-tcg-bw6 **Dragons Exalted 합본**(B+D) 병합 **100/100 완전** | verify-kr 0/0 · en-dex 전부일치 |
| og-bw5d (드래곤 블레이드) **신설** | pc-jp **pg=342** (50) — jp-tcg-BW5D 신설, **リューノブレード** | kr-bw5d **신설** 53 (SR tail 3: 칠색조/레지스틸/레쿠쟈 EX) | (합본 동일) | verify-kr 0/0 |
| og-bw6 (프리즈볼트) | pc-jp **pg=361** (59) — jp-tcg-BW6F 신설 | kr-bw6 63 (SR tail 4: 크레세리아/랜드로스/블랙큐레무 EX·체렌FA) | en-tcg-bw7 **Boundaries Crossed 합본**(F+C) 병합 96 | verify-kr 0/0 · en-dex 전부일치 |
| og-bw6c (콜드플레어) **신설** | pc-jp **pg=362** (59) — jp-tcg-BW6C 신설 | kr-bw6c **신설** 63 (SR tail 4: 세레비/케르디오/화이트큐레무 EX·벨FA) | (합본 동일) | verify-kr 0/0 |

> 가이드 157·159행(시프트 기반 매핑) **교차dry 실증**: BW5쌍↔DRX 94(사전후 100) vs ↔BCR 5 · BW6쌍↔BCR 88(사전후 96) vs ↔DRX 1. JP 정식명은 ドラゴンブラスト/ブレード가 아니라 **リューズブラスト/リューノブレード**(pg341/342 searchCondition) — 가이드 157·275행 교정. **JP SR 시크릿 pc-jp 미제공 확인**: pg 목록(hitCnt 50/59)·인접 cardID 대역(27840~57/27958~75·28077~94/28213~30) 전수 탐침 부재 → KR SR 14장은 KR tail 생성 후 EN(DRX 119~124·BCR 141~148)과 **merge-kr-en-tails 통합**(영판·한국판 전용 LC, 수동 1: 블랙큐레무 EX↔Black Kyurem-EX — 폼명이라 koDex 미해석). rarity: KR 상세 232장 전수 채움(실패 0). 잔여 미연결: JP BW6쌍 22장(あなぬけのヒモ/タチワキシティジム/じてんしゃ/ピーピーエイド 등 — EN Plasma Storm 이후 수록, TODO 이월)·BCR Skyla FA(#149) EN단독. 가짜 jp-tcg-bw5/bw6/bw7 해체(컬렉션 참조 1건 실앵커 재귀속)·바레 bw6/bw7 삭제(참조 1건 en-tcg-bw6 재귀속)·빈 LC 116 정리. SPECIAL_E +2(Blend Energy 草炎超悪/水雷闘鋼), trainer-names-bw +17(Devolution Spray·Tool Scrapper·Computer Search·Aspertia City Gym·ベル=Bianca 등 + Plasma Storm분 4 선등재). 발매일 Bulbapedia(BW5=2012-03-16·BW6=2012-07-13). 🔧 발견: load-jp-official 은 LC.setGroupId 미설정 → fill-jp-attacks-types(setGroupId 조회) 전에 백필 필요(이번에 무증상 0적용으로 발현).

### BW배치4 — 플라스마게일·라센포스·라이덴너클(볼트너클) (2026-06-06)

| pack(gid) | JP 출처 | KR 출처 | EN | 검증 |
|---|---|---|---|---|
| og-bw7 (플라스마게일) | pc-jp **pg=366** (70) — jp-tcg-BW7 신설 | kr-bw7 76 (SR tail 6: 비크티니/프리져/코바르온/루기아 EX·아크로마FA·**풍란FA↔BCR Skyla #149** 회수통합) | en-tcg-bw8 **Plasma Storm** 병합 70/70 완전(69+Plasma Energy 수동1) — 시프트 확증 | verify-kr 0/0 · en-dex 전부일치 |
| og-bw8 (라센포스) | pc-jp **pg=373** (51) — jp-tcg-BW8S 신설 | (KR 단독팩 없음 — 볼트너클 합본의 S측 2장 연결) | en-tcg-bw9 **Plasma Freeze 합본**(S+T) 병합 51/51 완전 — 시프트 확증 | en-dex 전부일치 |
| og-bw8t (볼트너클) **신설** | pc-jp **pg=374** (51) — jp-tcg-BW8T 신설, JP명 ライデンナックル | kr-bw8 55 — **KR 공식명 「볼트너클」**(상세페이지 실측, DB명 "스파이럴포스" 오기 교정). JP 양팩 합본 선별(T측 49+S측 2)+SR tail 4(볼트로스/라티아스/토네로스 EX·주박사FA) | (합본 동일) 50/51 — T측 プラズマエネルギー만 JP·KR 잔존(EN locale은 S측 귀속) | verify-kr 0/0 |

> **시프트 교차dry 3·4건째 확증**: 게일↔Plasma Storm 69 vs ↔Freeze 1 · BW8쌍↔Plasma Freeze 100 vs ↔Storm 5 (가이드 158·160행 확증 주석). **배치3 이월 22장 부분 해소**: BW6쌍 미수록분 31장(Escape Rope·Virbank City Gym·Bicycle·Ether + 포켓몬 27)을 Plasma Storm orphan 과 병합 — ⚠ **merge-en 부분보강 함정 발현**: merge-en 은 EN세트 전체를 jpSets 기준 재배선하므로 기존 BW7 병합 69건이 분리됨 → 사전 스냅샷으로 69건 즉시 복원, orphan 출신 31건만 보존(이후 부분보강은 스냅샷 필수). Plasma Energy 수동 2(en bw8#127→BW7#067·en bw9#106→BW8S#051[KR 정렬], BW8T#051 은 JP·KR 잔존이 정확) + SPECIAL_E 등재(bw10 대비). 바레 bw8/bw9 삭제(260+260)·빈 LC 31 정리·ord 재정렬(bw7 241~bw9 244). **rarity 갭 TODO**: BW8S 49·BW8T 2 (KR 미수록 카드 — BW3P/BW3H 0/52 전례와 동일 정책, KR외 출처 미확보) · fill-attacks 153 채움(캐시 포맷 충돌 — collect 산출 list 가 .pcjp.json 자리 점유 → rename 후 재스크랩).

### BW배치5 — 메갈로캐논·EX배틀부스트·샤이니컬렉션 (2026-06-06)

| pack(gid) | JP 출처 | KR 출처 | EN | 검증 |
|---|---|---|---|---|
| og-bw9 (메갈로캐논) | pc-jp **pg=377** (76) — jp-tcg-BW9 | kr-bw9 82 (SR tail 6: 비리디온/게노세크트/지라치/디아루가/펄기아 EX·아이리스FA — EN FA #096~100·#101 정확통합, 펄기아 FA/일반 분리 검증) | en-tcg-bw10 **Plasma Blast** 병합 **76/76 완전**(75+Plasma Energy 수동1) — 시프트 확증(↔Blast 76 vs ↔LTR 7) | verify-kr dex0(일러 2=출처 기재차, 매핑 무결) · en-dex 전부일치 |
| og-ebb (EX 배틀부스트) | pc-jp **pg=378** (97→**93**: 무번호 조크 4 제외 — イマクニ？·ポケモンエンタープライズ×3, CP4 전례) | kr-ebb 93 **1:1 완전** | en-tcg-bw11 **Legendary Treasures 합본**(EBB+SC) 병합 **113/113 완전** — 2→1 확증(↔LTR 113 vs ↔Blast 9). レジェンドトレジャー는 미존재 팩명(가이드 162행) | verify-kr 0/0 · en-dex 전부일치 |
| og-bw-shiny (샤이니 컬렉션) | pc-jp **pg=375** (20) — jp-tcg-SC, **LTR RC1~RC25 의 원본** | kr-sc 25 (tail 5: 쉐이미EX/레시라무/에몽가/뮤EX/메로엣타EX — EN RC 통합) | (합본 동일) | verify-kr dex0(일러 2=전각공백·표기차) |
|  |  |  |  |  |

> 시프트 5·6건째 확증으로 **BW 시프트 패턴 전 구간 실증 완료**(레드↔NVI부터 EBB+SC↔LTR까지). EBB **rarity 공식 무표기 확인**(KR 상세 no_wrap_by_admin 공백 — 컨셉팩 실물 무마크, THE BEST OF XY 전례) → null 93 정당 갭. 무번호 イマクニ？ DB 잔존 1 제거(ID충돌로 4중 1만 적재돼 있었음)·EBB cardCount 97→93. 바레 bw10/bw11 삭제(245+245). ord: shiny 244(2013-02-01)·bw9 245(2013-03-15)·ebb 246(2013-07-13). fill-attacks 177(재스크랩). KR tail 11(bw9 6·sc 5) 전부 EN FA/RC 와 기통합 검증.

## §9. LEGEND/HGSS 시대 — pre-BW 첫 진입

### LEGEND배치1 — 하트골드 컬렉션·소울실버 컬렉션 (2026-06-06)

| pack(gid) | JP 출처 | KR 출처 | EN | 검증 |
|---|---|---|---|---|
| og-l1a (하트골드 컬렉션) | pc-jp 상세 직접(cardID 25001~25131, **pg 검색 BW이전 미커버** — detailUrl 기반 어댑터) 70 | **KR 미발매**(하트골드·소울실버 검색 0 — 한국 LEGEND 시대 공백) | en-tcg-hgss1 **HeartGold & SoulSilver 합본**(L1a+L1b) 병합 **114** — 2→1 확증(↔hgss1 103 vs ↔hgss2 27) | en-dex 114 전부일치 |
| og-l1b (소울실버 컬렉션) | pc-jp 상세 직접(25132~25264) 70 | 미발매 | (합본 동일) — L1b 잔여 2장은 hgss3+/col1 후보(TODO) | — |

> **pre-BW 인프라 신설**: ① `build-legend-attacks-cache.ts`(keeper) — pg 불가 시대용 detailUrl 직접 스크랩→fill 캐시 어댑터(attacks 124 채움). ② `backfill-legend-rarity-pcjp.ts`(keeper) — pc-jp 상세 **ic_rare_*.gif 아이콘**으로 rarity 백필(c/u/r/s=SR Prime급/ss=LEGEND) → **140/140 완전**(C48·U40·R40·SR8·LEGEND4). ※ 이 경로는 BW3P/BW3H·BW8S/T rarity 갭 해소에도 적용 가능(TODO). ③ `trainer-names-hgss.ts` 신설(14쌍, ポケモンコレクター=Pokémon Collector·モノマネむすめ=Copycat 등 — ⚠ ptcg.io verbatim "Pokégear 3.0" 소문자 g)+merge-en isHGSS 분기(`/^en-tcg-(hgss|col)/`). ④ merge-en **ENMECH +LEGEND·Prime**(HGSS 메커니즘 subtype, JP enrich 10) + jaDex LEGEND 접미 strip — ホウオウ/ルギアLEGEND 상·하 4장 + Prime 6종 병합 회수. SPECIAL_E +Rainbow Energy. **Unleashed=JP본탄無 실증**: hgss2 JP연결 분포 L1a 11+L1b 13+L2 11+LL 3(4출처 컴필) — 가이드 276행 교정 확증. JP 시크릿 pc-jp 미제공(빈 cardID 124 전수탐침 — 25265+는 LP프로모) → EN단독 10(기본E 8·Alph·시크릿 갸라도스) 정당. 바레 hgss1 삭제(124+124). 발매일 2009-10-09.

### LEGEND배치2 — 되살아나는 전설·정상대격돌 (2026-06-06)

| pack(gid) | JP 출처 | KR 출처 | EN | 검증 |
|---|---|---|---|---|
| og-l2 (되살아나는 전설) | pc-jp 상세 직접(keeper 어댑터) 80 — よみがえる伝説 | 미발매 | en-tcg-hgss3 **HS—Undaunted** 병합 50→**58** — 1:1 확증(↔hgss3 58 vs ↔hgss4 1) | en-dex 58 전부일치 |
| og-l3 (정상대격돌) | pc-jp 상세 직접 80 — 頂上大激突 | 미발매 | en-tcg-hgss4 **HS—Triumphant** 병합 65→**73** — 1:1 확증(↔hgss4 73 vs ↔hgss3 3) | en-dex 73 전부일치 |

> keeper 어댑터 2종 재사용 검증: attacks 143(68+75) 전수 · rarity **160/160 완전**(각 C26·U22·R22·SR4·**LEGEND6** — L2/L3 는 LEGEND 합체쌍 3종씩). trainer-names-hgss +14(Energy Exchanger·Sage's Training·Team Rocket's Trickery·Junk Arm·Twins·Indigo Plateau 등 orphan verbatim — Rare Candy/PlusPower 는 hgss2 잔여 대비 선등재). 스냅샷 가드 복원 0. 바레 hgss3/hgss4 삭제(194). 잔여 미연결: L2 11(Unleashed 차출분과 일치)·L3 7(col1 후보) — col1/LL 배치에서 회수(TODO). Seeker 등 hgss4 EN orphan 일부는 JP LL 수록 후보.

### LEGEND배치3 — 강화팩 로스트링크 (2026-06-06)

| pack(gid) | JP 출처 | KR 출처 | EN | 검증 |
|---|---|---|---|---|
| og-ll (강화팩 로스트링크) | pc-jp 상세 직접(keeper 어댑터) 40 — 強化パック ロストリンク | 미발매 | **EN 독립세트 없음 — 4세트 분산 전수 회수 40/40**: Triumphant 26(24+LEGEND 수동2) · Call of Legends 14 · Unleashed 3 (중복수록 포함 locale 43) | en-dex hgss4 99·col1 14 전부일치 |

> 시대 강화팩의 EN 분산 회수 첫 사례 — 교차dry 4종(hgss2 3·hgss3 0·hgss4 23·col1 11)으로 행방 확정 후 스냅샷 가드 apply(**hgss4에서 기존 L3 병합 73 전량 분리 시도 → 가드 복원**, col1 EN-primary LC 92 churn 차단 — merge-en 부분보강 함정 가드의 대규모 실효 검증). attacks 36·rarity **40/40**(C12·R12·U10·SR4·LEGEND2). TR_HGSS +4(Seeker·Lost World·Research Record·Lost Remover — orphan verbatim). **합체 LEGEND 종 분배 모델 확립**: ダークライ&クレセリアLEGEND 상하 — & 복합명 dex 미해석 → 수동 2(099→LL035·100→LL036) + pokedexNumbers 양종 기재([0]=ptcg.io 면 기준: 상=491 다크라이·하=488 크레세리아). 빈 LC 38 정리.

### LEGEND배치4(시대 마감) — Call of Legends·언리시드 정리·HSP (2026-06-06)

| pack(gid) | JP 출처 | KR 출처 | EN | 검증 |
|---|---|---|---|---|
| og-col1 (Call of Legends) | (JP 본탄 없음 — L시대 재록 컴필) | 미발매 | **분산 병합 72/106**: L1쌍 36·L2 18(특수悪鋼에너지 2 포함)·L3 4·LL 14 + EN단독 34(SL 샤이니 LEGEND 11·기본E 8·단독전설 재록 5 등) | en-dex 72 전부일치 |
| og-hgss2 (HS—Unleashed) | (JP 본탄 없음 — 4출처 컴필) | 미발매 | 분산 병합 **57/96**(L1a·L1b·L2·LL + 합체 LEGEND 6·Prime 4 회수) + EN단독 39 | en-dex 57 전부일치 |
| og-hsp (HGSS Black Star Promos) | — | — | EN앵커 25 — ptcg.io **25/25 완전 대조** | ✓ |

> **🏁 LEGEND/HGSS 시대 완전 마감**: JP 5세트 310장(L1a 70·L1b 70·L2 80·L3 80·LL 40) **EN 미연결 0 — 전수 커버**, 전 그룹 EN 100%(70/70·70/70·80/80·80/80·40/40). EN 5게이트(hgss1 114·hgss2 57·hgss3 64·hgss4 102·col1 72) 전부 일치. **오병합 13건 검출·교정**: ① col1 SL 샤이니 8 + 단독전설 5 가 JP LEGEND 카드와 오병합(ENMECH LEGEND 부작용 — "JP명 LEGEND ↔ EN명 비LEGEND 비대칭" 전수 스캔으로 검출, EN단독 분리) → **ENMECH 에서 LEGEND 영구 제거**(JP enrich 완료로 불필요+위험). ② **합체 LEGEND dex 모델 확정**: ptcg.io 는 상하 동일 오름차순 배열([488,491] 등) — jaDex & 처리를 "양 성분 중 최소 dex"로 구현(첫성분 규칙은 dex복구와 충돌해 폐기), JP 14 LC 통일. 합체 12장 전 EN 병합 자동 회수(hgss2 6·hgss3 6 — K&G·R&D 는 hgss3 교차수록 발견). 수동 4(결정적 유일쌍: P&D 상하 2·特殊悪/鋼↔col1 Special Darkness/Metal 2 — 한도 3 초과 사유: 추측 0 전부 유일대응). 바레 hgss2/col1/hsp 삭제(227). Prime 13 회수(hgss2 재병합 — Crobat/Kingdra/Lanturn/Ursaring Prime 등).

## §10. Pt(플래티넘/DPt) 시대

### Pt배치1 — 은하의 패도·시간의 끝의 유대 (2026-06-06)

| pack(gid) | JP 출처 | KR 출처 | EN | 검증 |
|---|---|---|---|---|
| og-pl1 (은하의 패도) | pc-jp 상세 직접(keeper) 96 — ギンガの覇道(가이드 273행 교정 확증: ギャラクシーの征服者 아님) | **KR 미발매**(은하의 패도·시간 끝의 인연 검색 0 — Pt 시대 공백) | en-tcg-pl1 **Platinum** 병합 **96/96 완전** — 1:1 확증(↔pl1 83 vs ↔pl2 1) | en-dex 전부일치 |
| og-pl2 (시간의 끝의 유대) | pc-jp 상세 직접 90 — 時の果ての絆 | 미발매 | en-tcg-pl2 **Rising Rivals** 병합 **89** — 1:1 확증(↔pl2 62 vs ↔pl1 0) | en-dex 전부일치 |

> **DPt SP 포켓몬 인프라 신설**: ① jaDex 에 SP 접미 strip(`G[ギンガ]`·`GL［ジムリーダー］`·`四[してんのう]`·LV.X — 반각/전각 브래킷 혼재) → dex 35 복구. ② ENMECH +SP·Level-Up. ③ trainer-names-dpt.ts 신설(19쌍 — アカギ=Cyrus·ハンサム=Looker·デンジ=Volkner·プルート=Charon·ミズキ=Bebe, ギンガ団の発明 G-10x 시리즈) + isPt 분기. ④ SPECIAL_E +2(SP/Upper Energy). ⚠ **keeper 병행 순서 함정**: rarity 백필 완료 전에 merge 하면 rank(null)=5 로 버킷 미스(SP 45장 미연결 발현) → rarity 먼저, merge 나중. 오병합 1(Drapion LV.X↔일반 분리). 수동 8(유일쌍 결정적: LV.X 5·특수에너지 3 — 사유: JP 동dex LV.X 1↔EN LV.X 1 결정 대응). rarity **186/186**(LV.X=SR). 바레 pl1/pl2 삭제(253). 잔여 TODO: PT2 미연결 3(EN 미수록 후보)·pl2 EN단독 31(E4 사천왕 시리즈 ~24 — JP 별도 출처, PT3 배치에서 교차 회수 시도)·pl1 영판전용 37.

### Pt배치2 — 프론티어의 고동·아르세우스 광림 (2026-06-06)

| pack(gid) | JP 출처 | KR 출처 | EN | 검증 |
|---|---|---|---|---|
| og-pl3 (프론티어의 고동) | pc-jp 상세 직접(keeper) 100 — フロンティアの鼓動(JP 자체 색違い 포함: ジーランス 060/061↔EN 079/SH8) | 미발매(Pt 시대 공백) | en-tcg-pl3 **Supreme Victors** 병합 **97**(자동 92+수동 LV.X 5) — 1:1 확증(↔PT3 92 vs ↔PT4 11) | en-dex 97 전부일치 |
| og-pl4 (아르세우스 광림) | pc-jp 상세 직접 90 — アルセウス光臨 | 미발매 | en-tcg-pl4 **Arceus** 병합 **87**(자동 85+수동 LV.X 2) — 1:1 확증(↔PT4 85 vs ↔PT3 1) | en-dex 87 전부일치 |

> ⚠ **신규 운영사실 — dex복구·버킷 동일실행 시차**: merge 1차 실행에서 JP dex복구(PT3 19=SP 포켓몬 전원)가 버킷 구성 *이후* DB 에만 반영 → SP 19 미연결로 종료. **2차 재실행으로 +14/+2 자동 회수**(PT2 "재병합 +33 회수"와 동일 기전 — 원인 이제 확정). 수칙: **dex복구>0 이면 반드시 재병합**. TR_DPT +18(PT3 7: バトルサーチャー=VS Seeker·クロツグ=Palmer·シロナ=Cynthia 등 / PT4 11: 화석 3종 かい=Helix·こうら=Dome·ひみつのコハク=Old Amber 등). エネルギー転送=Energy Search(효과문 검증: 산패 기본E 1장 서치) — EN pl 시리즈 미수록이라 사전 제외. 수동 9(유일쌍 결정적, 한도 3 초과 사유: 전부 동dex SR↔LV.X 1:1 또는 유일 명칭쌍): ① LV.X 7 — PT3 Blaziken FB/Electivire FB/Absol G/Rayquaza C/Staraptor FB·PT4 Tangrowth/Salamence(JP 는 SR 표기뿐 jaName 무마커 + stage 오백필 Basic 으로 버킷 분리, JP subtypes 를 ptcg.io 기준 Level-Up(+SP)으로 교정) ② **교차세트 회수 2 — pl1 #115 Pokémon Rescue→PT4-080·pl2 #100 Metal Energy→PT3-097 特殊鋼**(PT1·PT2 배치 잔여 소급 해소). **pl2 E4 사천왕 회수 불가 확정**: PT3 suffix 전수 스캔 四 0건 — JP 별도 출처(프로모/덱 추정), 후속 수집 시 회수. 미연결 4(전원 사유 확정): PT3 2(SPエネルギー·特殊悪エネルギー — EN 동시기 재인쇄 없음, pl2 사본은 PT2 귀속)·PT4 2(エネルギー転送 EN 미수록·ミズキの検索 Bebe's Search pl4 재인쇄 없음). attacks 166(90+76)·rarity **190/190**(PT3 C28/U29/R35/SR8·PT4 C29/U22/R35/SR4, LV.X=SR). 바레 pl3/pl4 삭제(264). 영판전용: pl3 56(Charizard G LV.X·Garchomp C LV.X — JP 프로모/덱 출처 후보, 시크릿 새3종 148-150 등)·pl4 24(Arceus LV.X 3·Gengar LV.X·Buffer Piece·Energy Restore 등).

## §11. DP(다이아몬드&펄) 시대

### DP배치1 — 시공의 창조 다이아/펄 컬렉션·호수의 비밀·빛나는 어둠 (2026-06-06)

| pack(gid) | JP 출처 | KR 출처 | EN | 검증 |
|---|---|---|---|---|
| og-dp1+og-dp1p (시공의 창조 D/P) | pc-jp 상세 직접(keeper) 125+126 — D/P 중복 수록 多 | 미발매(DP 시대 공백) | en-tcg-dp1 **Diamond & Pearl** 합산 병합 **130/130 전소진**(D 106+P 24, 자동 119+수동 LV.X 3) — **2→1** 확증(↔D+P 119 vs ↔DP2 9) | en-dex 122 전부일치 |
| og-dp2 (호수의 비밀) | pc-jp 상세 직접 131 — 湖の秘密 | 미발매 | en-tcg-dp2 **Mysterious Treasures** 병합 **123/124**(자동 119+수동 4) — 1:1 확증(↔DP2 119 vs ↔DP3 5) | en-dex 123 전부일치 |
| og-dp3 (빛나는 어둠) | pc-jp 상세 직접 127 — ひかる闇 | 미발매 | en-tcg-dp3 **Secret Wonders** 병합 **120/132**(자동 113+수동 7, DP1P 교차 5 포함) — 1:1 확증(↔DP3 113 vs ↔DP2 10) | en-dex 120 전부일치 |

> **시대 분기 교정**: isPt 정규식이 `/^en-tcg-pl/`만 매칭 — en-tcg-dp*가 TR_SV로 폴백되던 갭 → `/^en-tcg-(pl|dp)/`로 확장(trainer-names-dpt.ts가 DPt 시대 전체 공용). TR_DPT +23(DP1 15: ナナカマド=Rowan·モンスターボール=Poké Ball·なんでもなおしW=Double Full Heal 등 / DP2 6: ギンガ団の賭け=Team Galactic's Wager·湖の結界=Lake Boundary 등 / DP3 2: マーズ=Mars·ハマナ=Roseanne). エネルギー転送=Energy Search 등재(dp1 수록 — PT4 보류분 해소). **dp5(Majestic Dawn) 분산 병합 오염 3건 교정**: 사용자 선행 dp5 머지의 dp5#004 Dialga(일반)↔DP3-005 ディアルガ**LV.X**·dp5#011 Palkia↔DP3-006 パルキア**LV.X**·dp5#085 Poké Ball↔DP1D-110 なんでもなおしW(완전 별개) 분리 — DP3 SR 3종은 stage=null·고HP로 LV.X 판정(jaName 무마커). 수동 14(유일쌍 결정적): LV.X 4(dp1 Torterra/Infernape/Empoleon→D판 — 사유: EN 1차 귀속 og-dp1, P판 사본은 EN 물리적 1장이라 영구 미연결 정상 / dp2 Magmortar↔ブーバーン) + 특수E 5(dp2 Multi/Darkness/Metal·dp3 Darkness/Metal ↔ マルチ/特殊悪/特殊鋼) + dp3 재록 트레이너→DP1P 잔여 사본 교차 5(PlusPower/Rowan/Rival/Potion/Switch — dict 정확명+DP시대 동일 아트 재인쇄). 미연결(사유 확정): DP1D 8(기본E)·DP1P ~102(**D/P 중복 구조 — EN 1장은 D 우선 귀속, 2→1의 자연 결과**)·DP2 8(기본E)·DP3 12(기본E 8+**LV.X 3 — ダークライ/ディアルガ/パルキア LV.X는 EN dp4 수록, DP4 배치 이월**+ダークライ#114 재록). dp3 영판전용 12(Gardevoir/Honchkrow LV.X 포함 Gardevoir계 8 — JP DP4M/DP4D 출처, DP4 배치 교차 회수 예정). attacks 430·rarity 416/509(**미해결 93 전원 사유 확정**: 기본E 24+デッキ수록 카드 rarity 아이콘 자체 없음 — null 유지, 날조 금지). 바레 dp1/dp2/dp3 삭제(386) — ⚠ CollectionItem이 localeId+logicalCardId 양쪽으로 바레 참조(Azumarill 1건) → 양쪽 재귀속 후 삭제, 빈 LC 전역 430 동반 정리.

### DP배치2 — 월광의 추적+새벽의 질주·비경의 외침+분노의 신전 (2026-06-06)

| pack(gid) | JP 출처 | KR 출처 | EN | 검증 |
|---|---|---|---|---|
| og-dp4+og-dp4d (월광의 추적/새벽의 질주) | pc-jp 상세 직접(keeper) 78+78 | 미발매 | en-tcg-dp4 **Great Encounters** 합산 병합 **100/106**(자동 95+수동 5) — **2→1** 확증(↔M+D 95 vs ↔DP5쌍 7) | en-dex 100 전부일치 |
| og-dp5+og-dp5a (비경의 외침/분노의 신전) | pc-jp 상세 직접 73+73 | 미발매 | en-tcg-dp6 **Legends Awakened** 합산 병합 **129/146**(자동 126+수동 3) — **2→1** 확증(↔H+A 126 vs ↔DP4쌍 9) | en-dex 129 전부일치 |

> TR_DPT +17(DP4 7: スージー=Felicity·おまもりこばん=Amulet Coin·たべのこし=Leftovers 등 / DP5 10: バク=Buck·ポケトレ=Poké Radar·ハードマウンテン=Stark Mountain·キッサキしんでん=Snowpoint Temple·ねっこ/ツメの化石=Root/Claw Fossil·ワザマシン TS-1/2 등). エネルギーパッチ=Energy Pickup 효과문 검증(코인1·트래시 기본E 부착). **dp5 선행 병합 오염 4건 추가 교정**(배치1 패턴 연속): dp5#002 Cresselia·#005 Glaceon·#007 Leafeon(일반)↔DP4M-003/DP4D-003/DP4D-002 **LV.X** 분리 + **Unown 폼 교차**(dp4#029 [H]가 DP4D-033 [P]에 — 폼 브래킷이 버킷키 미포함) 교정. 수동 21(분리 4+연결 17, 전부 유일쌍 결정적): ① **이월 7 해소** — dp4 Darkrai/Dialga/Palkia LV.X→DP3-004/005/006(배치1 예고분)·dp4#004 Darkrai 재록→DP3-114(일러 Ryo Ueda 양측 일치)·dp3 Gardevoir LV.X→DP4D-004·Honchkrow LV.X→DP4M-004·Gardevoir→DP4D-045·Weavile→DP4M-001 ② 자세트 LV.X 6(Cresselia/Azelf/Mesprit/Uxie + 자동매칭 성공한 Rhyperior/Magnezone 제외) ③ **dp5 LV.X 선소진 4**(Garchomp→DP4M-005·Porygon-Z→DP5A-014·Glaceon/Leafeon→분리된 DP4D 자리). 결과: **DP3 미연결=기본E 8뿐(완전화)**·DP5H/5A도 기본E만 잔여. 미연결: DP4M 12(중복 트레이너·かいの化石·기본E8·コール/リカバーE — 특수E EN은 dp5 MD 수록, dpmd 배치 이월)·DP4D 15(동류+ヒーラーE·夜明けSt=MD Dawn Stadium 이월). 영판전용: dp4 6(Dialga/Palkia 일반 등 — 엔트리팩'08 후보)·dp6 16(Mewtwo/Heatran/Regigigas 등 14+Bubble Coat+**Gliscor·Mewtwo LV.X — JP 덱/프로모 출처, 후속 수집 시 회수**). attacks 236·rarity 280/302(미해결 32=기본E 전원). 바레 dp4/dp6 삭제(252, CollectionItem 양쪽 재귀속 선처리). og-dpmd는 build CONFIG 미등재 — dpmd 배치에서 등재 예정.

### DP배치3(시대 마감) — 파공의 격투·마제스틱 던·DP 블랙스타 프로모 (2026-06-06)

| pack(gid) | JP 출처 | KR 출처 | EN | 검증 |
|---|---|---|---|---|
| og-dp6 (파공의 격투) | pc-jp 상세 직접(keeper) 92 — 破空の激闘 | 미발매 | en-tcg-dp7 **Stormfront** 병합 **90/106**(자동 83+수동 7) — 1:1 확증(↔DP6 83 vs ↔DP5쌍 5)·시크릿 리자드 3계열 자동매칭 | en-dex 90 전부일치 |
| og-dpmd (마제스틱 던) | **JP 본탄 없음** — DP1P·DP4M/4D 분산 + 엔트리팩'08(미수집) | 미발매 | en-tcg-dp5 **Majestic Dawn** 분산 병합 **45/100**(배치1~2 누적 33+이번 12) | en-dex 45 전부일치 |
| og-dpp (DP 블랙스타 프로모) | (JP DP-P 미수집) | — | **en-tcg-dpp 신설 — 바레 dpp 56장 HSP 전례 승격**(EN앵커, era=DP·order=206) | 56/56 이전 정합 |

> **🏁 DP 시대 본탄 마감**: JP 9세트 903장(DP1D/1P·DP2·DP3·DP4M/4D·DP5H/5A·DP6) 전수 정비, EN 7세트+dpp 처리, 시프트 13~18건째 전부 확증.

## §12. PCG(플레이어즈/EX 시리즈 후반) 시대

### PCG배치1 — 전설의 비상·창공의 격돌·로켓단의 역습·금빛 하늘 은빛 바다 (2026-06-06)

| pack(gid) | JP 출처 | KR 출처 | EN | 검증 |
|---|---|---|---|---|
| og-pcg1 (전설의 비상) | ⚠기계번역 대체 데이터 82(하단 참조) | 미발매(PCG 시대 공백) | en-tcg-ex6 **EX FireRed & LeafGreen** 병합 **82/116 — JP 전소진**(자동 72+수동 10) — 1:1 확증(↔PCG1 72 vs ↔PCG2 1) | en-dex 82 전부일치 |
| og-pcg2 (창공의 격돌) | 동일 82 | 미발매 | en-tcg-ex8 **EX Deoxys** 병합 **82/108 — JP 전소진**(72+10) — 1:1 확증(↔PCG2 72 vs ↔PCG1 1) | en-dex 82 전부일치 |
| og-pcg3 (로켓단의 역습) | 동일 85 | 미발매 | en-tcg-ex7 **EX Team Rocket Returns** 병합 84+**ex10 Celebi ex 교차 1 = 85/85 JP 전소진**(65+20) | en-dex 84 전부일치 |
| og-pcg4 (금빛 하늘, 은빛 바다) | 동일 106 | 미발매 | en-tcg-ex10 **EX Unseen Forces** 병합 **81/145**(70+11) — **Unown 25 보류**(하단) | en-dex 82 전부일치 |

> ⚠⚠ **시대 데이터 한계 — JP 원어 미보유**: jp-tcg-PCG* 의 명칭·attacks 가 EN 의 **기계번역 대체물**(山ムーン=Mt. Moon 직역·捕虜！=Pow! 오역·奇妙な=Oddish 등), attacks text 공백, supertype "Pokemon"(é無, POKE 양표기 수용으로 무해), subtypes 오라벨 다수. **pc-jp 는 cardID ~3000(DP 시대)부터만 존재 — PCG 원어 교정 불가**(탐침 확정). 단 **R2 실물 카드 이미지는 진본** → 이미지 검증으로 개별 교정 가능(이번 실증 6건: PCG4 #1 奇妙な→**ナゾノクサ**·#2→クサイハナ·#3→ストライク·#4→メガニウム(일반 판정, ex 아님)·PCG1 #39 コイル Basic 확증). 인프라: 바레 ex6/ex7/ex8/ex10 → en-tcg-* 승격(orphan LC 컨벤션) — ⚠ **신규 함정: 승격 orphan LC 에 setGroupId 필수**(build enMerged 가 logicalCard.setGroupId 로 EN 로드 — null 이면 영판전용 증발) → 150건 백필. isEX 분기(/^en-tcg-ex/) + **trainer-names-ex.ts 신설 38쌍**(JP 키 = 기계번역명 verbatim 명시 — 진짜 JP 소스 확보 시 자연 미발화). 수동 58(전부 유일쌍/소거/이미지 증거): **Pokémon ex 30**(JP명·subtypes에서 ex 마커 소실 → 버킷 미스 — ENMECH+ex는 일반판 오병합 위험으로 기각, 수동 선택) + **포켓몬 ★ 9**(Shiny Rare↔Star) + 특수E 7 + Dark/일반 5 + 이미지 검증분 6 + Magnemite 1. **Unown 25 전수 분리**: JP명 폼 정보 전무 상태에서 rankZip 이 임의 폼 배정(JP#43→#! 등) → 미연결>오연결 원칙으로 해제. 실물 이미지에 폼·효과문 식별 가능 — **이미지 대조 회수 TODO**. Mr. Mime ex 2:2 는 번호순 평행(#53↔#110·#54↔#111, 일러 양측 동일 표기로 미식별 — 이미지 TODO). 시프트 19·20건째(82:1/82:1). 영판전용: ex6 34(스타터 중복 Bulbasaur×2 등·트레이너 재록·Venusaur/Charizard/Blastoise ex — JP 컬렉션 미포함)·ex8 26(Deoxys 폼 3종 ex·Manectric/Rayquaza/Rocket's Raikou ex 등)·ex7 27(Dark Dragonair 2장조·Rocket's Articuno/Moltres ex·시크릿 Charmeleon)·ex10 63(Unown 28 포함). 잔여 PCG: pcg5~10(ex11~16) + ex9 Emerald(EN단독) — 바레 ex5/ex9/ex11~16 잔존.

### PCG배치2 — 환상의 숲·호론의 연구탑·호론의 환영·기적의 결정·끝자락의 공방 (2026-06-06)

| pack(gid) | JP | KR | EN | 검증 |
|---|---|---|---|---|
| og-pcg5 (환상의 숲) | 기계번역 대체 86 | 미발매 | en-tcg-ex12 **EX Legend Maker** 병합 **84/93**(70+14) — 1:1 확증(↔PCG5 70 vs ↔PCG6 4) | en-dex 84 전부일치 |
| og-pcg6 (호론의 연구탑) | 동일 86 | 미발매 | en-tcg-ex11 **EX Delta Species** 병합 **86/114 JP 전소진**(80+6) — 1:1 확증(↔PCG6 80 vs ↔PCG5 2) | en-dex 86 전부일치 |
| og-pcg7 (호론의 환영) | 동일 52 | 미발매 | en-tcg-ex13 **EX Holon Phantoms** 병합 **52/111 JP 전소진**(50+2) — EN이 JP의 2배(δ재록·기본E·타출처 다수) | en-dex 52 전부일치 |
| og-pcg8 (기적의 결정) | 동일 75 | 미발매 | en-tcg-ex14 **EX Crystal Guardians** 병합 **75/100 JP 전소진**(65+10) | en-dex 75 전부일치 |
| og-pcg9 (끝자락의 공방) | 동일 68 | 미발매 | en-tcg-ex15 **EX Dragon Frontiers** 병합 **68/101 JP 전소진**(57+11) | en-dex 68 전부일치 |

> δ델타종 시대 5팩 — 배치1 인프라 재사용(승격 패턴: **orphan LC setGroupId 즉시 설정**으로 배치1 함정 회피, TR_EX +38 — ホロン 시리즈·クリスタル류·化石류 전부 기계번역 직역 1:1). 수동 43(전부 유일쌍): **ex/★ 마커 소실 33**(Walrein/Armaldo/Flygon ex·Regice/Regirock/Registeel ★·Kyogre/Groudon/Metagross ★·Gyarados ★ δ·Sceptile ex δ·Jirachi ex·Dragonite~Tyranitar ex δ 등) + **특수E 사전 미발화 8**(React/Holon GL·FF·WP/δ Rainbow/Double Rainbow/Scramble — EN supertype Energy 는 트레이너 사전 경유 안 함, 상시 수동) + dex 공백 일반 5(オマニテ/Omastar/ウェイルマー/ウェイロード/スフィアル — 종 자명 dex 채움 후 연결, ⚠ Omastar 화석진화 stage 는 EN ptcg.io 기준). PCG5 잔여 2(チルット/チルタリス — EN ex12 미수록, ex15 Altaria ex δ 는 PCG9 사본이 정본). 영판전용: ex12 9(Banette/Mew ex·Pikachu δ 등 JP 미수록)·ex11 28(이브이 ex 3종·Ditto 폼 3종·δ 2장조·재록 트레이너)·ex13 59(EN 2배 구성 — Mewtwo/Pikachu ★·δ재록·기본E 6)·ex14 25(Groudon/Kyogre/Swampert ex·스타터 중복)·ex15 33(Gardevoir/Tyranitar ex δ·δ 2장조·재록). 시프트 21·22건째.

### PCG배치3(시대 마감) — 월드 챔피언스 팩·EX Emerald (2026-06-06)

| pack(gid) | JP | KR | EN | 검증 |
|---|---|---|---|---|
| og-pcg10 (월드 챔피언스 팩) | ⚠무번역 EN raw 102(최악 품질 — 하단) | 미발매 | en-tcg-ex16 **EX Power Keepers**(EN 선발매) 병합 **102/108 JP 전소진**(94+수동 8) — 1:1 확증(↔PCG10 102 vs ↔PCG9 9) | en-dex 102 전부일치 |
| og-ex9 (EX 에메랄드) | **JP 본탄 없음**(구축덱 분산 — 미수집) | 미발매 | **en-tcg-ex9 신설 — EN앵커 승격 107/107**(og-dpp 전례) | 107 이전 정합 |

> **PCG10 데이터 3중 결손 진단·해소**: 이 세트만 ①명칭이 번역조차 없는 **EN raw**(Seedot·"Flareon Star") ②**supertype 전원 null**(⚠ Prisma notIn 필터가 NULL을 안 거르는 SQL 시맨틱스로 초기 진단 착시 — "Tr/E 0"으로 오인) ③rarity·dex·subtypes 전무. 해소: EN 종명 resolveCardDexes 로 dex 81 채움 → supertype 백필(Pokémon 81/Trainer 16/Energy 5, 특수E 5종 이름 기준) → 재병합(이름 ex 접미는 merge 1c 가 자동 감지해 ex 8종 자동 매칭!) → TR_EX **identity 키 16**(JP명=EN명인 시대 현실 명시) → ★ 3+특수E 5 수동. **시프트 23건째**(102:9). Emerald: ex9 Swablu#67↔PCG5 チルット 잔여 교차 검토 — 일러 동일(Hajime Kusajima)이나 **발매순 모순**(Emerald 2005-05 < まぼろしの森 2005-12)으로 보류(동일 작가 별개 카드 가능 — 미연결>오연결). **🏁 PCG 시대 마감**: 10그룹+og-ex9, JP 904장 중 미연결 27(PCG4 Unown 25 폼보류 + PCG5 チルット/チルタリス 2)뿐 — 나머지 전소진. 잔여 백로그: Unown 이미지 폼 식별 회수·ex5 Hidden Legends(ADV권 — ADV 시대 배치에서).

## §13. ADV(루비&사파이어/EX 시리즈 전반) 시대

### ADV 일괄 배치(시대 마감) — 확장팩·사막의 기적·천공의 패자·마그마VS아쿠아·풀린 봉인 (2026-06-06)

| pack(gid) | JP | KR | EN | 검증 |
|---|---|---|---|---|
| og-adv1 (확장팩) | 무번역 EN raw 55(3중 결손 백필) | 미발매 | en-tcg-ex1 **EX Ruby & Sapphire** 병합 **55/109 JP 전소진** — 1:1 확증(↔ADV1 55 vs ↔ADV2 1) | en-dex 55 전부일치 |
| og-adv2 (사막의 기적) | 동일 53 | 미발매 | en-tcg-ex2 **EX Sandstorm** 병합 85(자기 53+**ADV4 분산 32**) — **JP 전소진** | en-dex 85 전부일치 |
| og-adv3 (천공의 패자) | 동일 54 | 미발매 | en-tcg-ex3 **EX Dragon** 병합 68(자기 54+ADV4 12+ADV5 2) — **JP 전소진** | en-dex 68 전부일치 |
| og-adv4 (마그마VS아쿠아 두 야망) | 동일 80 | 미발매 | **분산: ex4 36 + ex2 33 + ex3 11 = 80/80 전소진** | (상동 게이트) |
| og-adv5 (풀린 봉인) | 동일 83 | 미발매 | en-tcg-ex5 **EX Hidden Legends** 병합 81+ex3 교차 2 = **83/83 전소진** | en-dex 81 전부일치 |

> **🏁 ADV 시대 마감 — JP 325장 전소진(미연결 0)**.

## §14. e-Card 시대

### e-Card 일괄 배치(시대 마감) — 기본 확장팩·아쿠아폴리스·스카이리지 (2026-06-06)

| pack(gid) | JP | KR | EN | 검증 |
|---|---|---|---|---|
| og-e1 (기본 확장팩) | 기계번역명·메타 양호 128(rarity 100%·supertype 완비 — PCG/ADV과 달리 정상 적재) | 미발매 | en-tcg-ecard1 **Expedition Base Set** 병합 **128/165 JP 전소진** — 1:1 확증(↔E1 128 vs ↔E2+E3 24) | en-dex 128 전부일치 |
| og-e2+og-e3 (지도에 없는 마을/바다에서 부는 바람) | 동일 92+90 | 미발매 | en-tcg-ecard2 **Aquapolis** 합산 병합 **182/182 완전 합치 — 양측 전소진** | en-dex 182 전부일치 |
| og-e4+og-e5 (갈라진 대지/신비로운 산) | 동일 91+91 | 미발매 | en-tcg-ecard3 **Skyridge** 합산 병합 **182/182 완전 합치 — 양측 전소진** | en-dex 182 전부일치 |

> **🏁 e-Card 시대 마감 — JP 5세트 492장 전소진 + 2→1 두 쌍은 EN측까지 orphan 0**(시리즈 캠페인 첫 양측 완전 합치).

## §15. web·VS 시대 (JP단독)

### web·VS 일괄(시대 마감) — 포켓몬카드 web·포켓몬카드 VS (2026-06-06)

| pack(gid) | JP | KR | EN | 검증 |
|---|---|---|---|---|
| og-web1 (포켓몬카드 web) | 47장(번호 1~48, 결번 1 — 수집물 보존) — 정상 일본어명·rarity 100%·supertype 완비 | 미발매 | **영구 미발매(JP단독)** — enNative 빈 배열로 crossGroup 전역탐색 회피 | 빌드 47 앵커 |
| og-vs1 (포켓몬카드 VS) | 143장(번호 1~151 비연속, 결번 7~8 — 수집물 보존) — 동일 품질 | 미발매 | 영구 미발매(JP단독) | 빌드 143 앵커 |

> JP단독 시대 첫 처리 — 병합·시프트·바레 절차 전부 해당 없음.

## §16. NEO 시대 · §17. 구판(오리지널) 시대

### NEO·구판 일괄(시대 마감) — 네오 4팩 + PMCG 6팩 + EN단독 4 (2026-06-06)

| pack(gid) | JP | EN | 결과 |
|---|---|---|---|
| og-neo1 (금, 은 신세계로) | 96 | Neo Genesis 96/111 | **JP 전소진** · 시프트 26건째(96:6) |
| og-neo2 (유적을 넘어서) | 57 | Neo Discovery 52/75 | 잔여 5(하단) |
| og-neo3 (각성하는 전설) | 57 | Neo Revelation 57/66 | **JP 전소진** |
| og-neo4 (어둠, 그리고 빛으로) | 113 | Neo Destiny 113/113 | **JP 전소진 + EN 완전 합치**(Shining Tyranitar↔色違いバンギラス 수동 포함) |
| og-pmcg1~4 (확장팩 1~4탄) | 102/48/48/65 | Base/Jungle/Fossil/Team Rocket | pmcg2·4 전소진, pmcg1 잔여 6(기본E)·pmcg3 잔여 1(ミュウ — EN Fossil 미수록) · 시프트 27건째(96:2) |
| og-pmcg5+6 (리더스 스타디움/어둠에서의 도전) | 96+98 | **gym1+gym2 상호분배 합산 병합**(102+114) | pmcg5 94/96·pmcg6 92/98 |
| og-lc1·og-si1·og-bs2·og-wbsp | — | LC 110·SI 18·BS2 130·WBSP 53 **EN앵커 신설 승격** | 4그룹 |

> **🏁 NEO·구판 시대 마감**(바레 14종 전부 en-tcg-* 승격 소거). TR_EX +112(NEO ~37·구판 ~75 — 오역 백태: 請求書=Bill·富士通り=Mr. Fuji·霧=Misty·中佐=Lt. Surge·ポークボール=Poké Ball). ⚠ **신규 함정 — 시대 공용 사전 키 충돌**: エネルギー電荷가 e-Card(Power Charge)와 neo1(Energy Charge)에서 다른 카드 → 선점 키는 타 시대에서 미발화(안전)하나 해당 카드는 상시 수동. **neo2 데이터 오염 이미지 검증**: アンノーン 표기 6장 중 진짜 아논은 3장(폼 F/M/U 이미지 판독→정연결), 3장은 별개 종(ネイティオ/エーフィ/ソーナンス — 이름·dex 교정, ソーナンス↔Wobbuffet 연결, 나머지 2장은 기존 정연결 존재로 **tcgdex 중복 행 의심 보존**). ⚠ 이 시대 R2 이미지는 **EN 카드 원본**(og-neo2 확인 — JP 이미지 아님) — 단 카드 식별 증거로는 유효. 수동 25(NEO 7+이미지 6+구판 11+기타 — 정관사 The·어순 Minion of~·오역 미스). **보류(미연결>오연결)**: ファイヤー 2장(PMCG5#20·PMCG6#35) ↔ Blaine's/Rocket's Moltres 2장 — 접두 소실 + 이미지 부재(R2 NO_IMG)로 판정 불가(추측 금지 4번째 실효) · Ruin Wall 1:2(일러 불일치) · PMCG6 접두소실 5(モンジャラ/ゴルバット/ロコン/ドードー/ラッキー — gym orphan 대응 없음) · neo2 ライチュウ(EN 미수록). 잔여 미연결 합계 ~24/879(전원 사유 확정). 영판전용: holo/non-holo 2장조의 non-holo판 다수(구판 EN 고유 구조)·기본E·스타터 중복. KR 미발매. ⚠ 운영사실: JP단독 그룹 CONFIG는 **enNative: [] + enMerged: false**(enNative 생략 시 crossGroup 로직이 전역 EN에서 dex+일러 강신호로 끌어와 의도치 않은 연결 표시 위험 — web/VS 재록은 e-시리즈 폼 신규 인쇄라 구판 EN과 별개 카드). isEX 분기 +ecard 확장(TR_EX 공용), TR_EX +52(기계번역 직역 — キューブ01 시리즈·Miracle Sphere/Mystery Plate α~δ 기호 대응은 번호순+기호 유사성 결정). 수동 14(특수E 10 상시수동 + Oak 사전 미발화 1 + Sneasel/Sandshrew 버킷 미스 2 + Buried Fossil·Ho-oh 시크릿 1). 시프트 25건째(128:24). 영판전용: ecard1 37(스타터 2장조·기본E 8·Energy Search/Full Heal/Moo-Moo Milk 등 JP 미수록 재록)뿐. KR e-Card 미발매. ⚠ **가이드 ⑫ 교정**: ADV4↔ex4 단순 1:1이 아님 — JP 強化拡張パック「マグマVSアクア ふたつの野望」(80)은 팀 포켓몬+일반 포켓몬 혼재 구성이고 EN은 이를 **ex4(TMvTA)+Sandstorm+Dragon 3세트에 분산** 수록. 분산 회수는 **dex+illustrator 양방향 유일쌍 매칭 스크립트**(신기법 — 43/43 전건 유일, 다후보 0)로 확정: 합산 병합 dry가 보인 ex1 +12는 발매순 모순(R&S 2003-07 < ADV4)이 시사한 가짜 매칭이었고 일러쌍에서 전부 기각됨. PCG10 해소 루틴 재사용: dex 백필(Team Magma's/Aqua's 접두 strip)+supertype 백필(283/38/4)+TR_EX identity 33. **ENMECH +Team Magma·Team Aqua**(ex4 subtypes 버킷 분리 해소 — Team Plasma 전례). 수동 7(Multi E·Mysterious Fossil→ex2 교차·DR/Magma/Aqua E·High/Low Pressure System→ex3 잔여사본 교차). 시프트 24건째(55:1). 영판전용: ex1 54(하프덱 재록·기본E)·ex2 15·ex3 32·ex4 61(팀 포켓몬 2장조 — JP 1장씩만 수록)·ex5 21. KR ADV 미발매. TR_DPT +8(DP6 7:7 — ゴージャス=Luxury·スーパーボール=Great Ball·マイ=Marley·Poké시리즈 EN \"+\"접미). 수동 19(유일쌍·소거 확정): DP6 LV.X 3(Raichu/Machamp/Regigigas)+특수E 2(Cyclone/Warp) + dp7 재록 2(Premier Ball→DP4D·Energy Switch→DP1P) + **dpmd 분산 12**(화석 3·Dawn Stadium·Call/Recover/Health E↔コール/リカバー/ヒーラー[Call·Recover 이름일치 후 양측 유일잔여 소거 확정]·DP1P 트레이너 5). **추측 금지 실효 2건**: pl1#38 Shaymin↔DP6#11 일러 불일치(Kouki Saitou≠Kagemaru Himeno)로 보류 · pl1#126/127 Shaymin LV.X 2장↔DP6#12 1장 다대일 미해결로 보류. **추가 수집 조사 결론**: ① JP 엔트리팩'08·ギラティナVSディアルガ 스타터 — pc-jp HTML 검색이 JS구동(resultAPI 의존)이라 pre-BW keyword 검색 불가, cardID 리스트 없이는 수집 불가 → **사용자 수집물 확보 시 진행**(MD 잔여 55·dp7 스타터 출처 13·DP6 ギラ/ディア 사본 2 회수 가능) ② EN POP Series 6~9(DP시대)는 POP 1~9 전체가 EX~Pt 걸침 별도 체계 → **백로그**(바레 pop1~9 각 17장 잔존) ③ KR DP 시대 미발매 확정. 바레 dp7/dp5/dpp 삭제(262). 미연결 잔여: DP6 4(Shaymin 2 보류+ギラティナ/ディアルガ 잔여사본)·MD orphan 55(엔트리팩'08)·dp7 영판전용 16(스타터 13+SH2/3+Dusknoir LV.X).

## §18. 후속 교정 — 닌자스피너 KR 오연결 + 영판전용 JP 수록처 표기 (2026-06-07)

### kr-m4#080 프리즘타워 오연결 교정
- **증상**: 도감에서 JP#80 プリズムタワー의 KR 탭 비활성. 조회 결과 kr-m4#079(앙쥬 플라엣테)·**kr-m4#080(프리즘타워) 두 장이 모두 JP#79 LC(lc-orphan-jp-mega-ninja-spinner-79)에 이중 연결**.
- **원인**: KR 트레이너 구간 번호가 JP와 뒤섞인 상태(KR 이름순 재배열)에서 이전 KR 병합이 프리즘타워만 인접 LC로 폴백.
- **교정**: kr-m4-080 → lc-orphan-jp-mega-ninja-spinner-80 재연결. **결정적 근거**: KR명 "프리즘타워"=JP プリズムタワー 직역 일치 + 번호 일치(KR#080=JP#80) + 레귤러 범위 내 유일쌍(JP의 또 다른 프리즘타워 #113은 SR 시크릿 — KR 미수집 영역). CollectionItem 영향 0. 재빌드 후 KR매칭 82→**83**.

### 닌자스피너 KR 시크릿(#084~120) 부재 확정
- pokemoncard.co.kr `search_text_cards("닌자스피너")` 전 페이지 순회: **총 83장(M4_001~M4_083)** — 공식 출처 자체에 시크릿 미등재(수집 누락 아님). 타 MEGA팩 KR은 시크릿 포함(kr-m2 115·kr-m3 116)이므로 **추후 등재 시 추가 수집 대상**(백로그).

### build-group 영판전용 꼬리 `jpPacks` 신설 (전 그룹 적용)
- 기존 `jpElsewhere`(같은 dex 종이 JP 어딘가 존재 — 불리언)만으로는 "JP 타팩 수록" 라벨에 팩명 정보 없음.
- 신설: JP 전수 지문 인덱스 `dex|일러[|subtypes]` → 수록 JP 세트 → **SetGroup.nameKo**(231/231 채움) 표기. 정확지문 우선, 일러지문 폴백.
- ⚠ **시대 오염 함정 실증**: 같은 dex+일러가 시대를 가로질러 다른 카드(M Gallade-EX '15 ≠ Mega Gallade ex '26, 5ban Graphics 동일) → **발매 era ±4년 컷**(crossGroup 휴리스틱과 동일 상수) 적용 후 해소. 컷 이후 공란 2건(Mega Gallade ex·Krookodile ex)은 JP 원본 DB 미수집으로 **공란이 정답** 확인(MEGA JP 전 세트에 エルレイド 부재·ワルビアル은 Ryuta Fuse 비ex 별개 카드).
- UI(GroupCards.tsx): `jpPacks` 있으면 "JP: 팩명(2개 초과 시 외 N)", 없으면 기존 "JP 타팩 수록" 폴백. 전 그룹(201) JSON 일괄 재빌드로 반영.

### (추가) 전 그룹 재빌드가 노출한 DB 드리프트 2건 복구 (2026-06-07)
- **Cosmic Eclipse 분산 병합 풀림**: en-tcg-sm12 271장 전원 orphan화 — 배치9의 3세트 합본 병합(SM12 104+SM11a 61+SM11b 68=233)이 어느 시점 **단일 스코프(jp-tcg-SM12) 재실행**으로 풀린 상태(og-sm11a/b EN탭 증발 + og-sm12 enOnly 38→167). 동일 스크립트를 원 스코프(`jp-tcg-SM12,jp-tcg-SM11a,jp-tcg-SM11b en-tcg-sm12`)로 dry→적용: **EN병합 233·orphan 38 — HEAD 시점 수치와 완전 일치 복구**. 비워진 orphan LC 129 삭제(CI 참조 0). ⚠ 합본 EN 세트의 재병합은 **반드시 원 jpSets 전체 스코프로**(단일 스코프 재실행 = 교차그룹분 orphan화). ⚠ 인자 순서 `<jpSets> <enSet>` — 거꾸로 넣으면 JP가 orphan화될 뻔(dry 0/0+영어 "JP 트레이너" 출력이 신호).
- **og-s11 드라피온 VSTAR KR 스왑**: KR#119가 JP#067(본문)에, KR#067은 기프트 에너지 LC(JP#100)에 오연결 → 번호 1:1 미러+동일명 유일쌍으로 #067↔#067·#119↔#119 교정. krMatched 125→126.
- crimson-haze 63→62는 회귀 아님: 구 연결 sv6-20↔crimson#008이 일러 불일치(Gunjima≠MINAMINAMI Take) 오연결이었고 현 연결(트와일라잇 JP#013, 일러 일치)이 정답 — 사후 재병합의 교정이 빌드에 늦게 반영된 것. bw6 +8·bw6c +14도 사후 병합 회수 반영(개선).

## §19. 니힐제로 EN 병합 — Perfect Order(me3) 바레 승격 (2026-06-07)

| 항목 | 내용 |
|---|---|
| 승격 | 바레 me3(124, 독립 orphan LC·CI 0) → en-tcg-me3 신설(setGroupId 명시) + locale 124 이관 + 바레 삭제 |
| 병합 | dry 78 → 사전 +15 → **101 자동** → 수동 15 → **총 116/124** · JP 117 중 EN 116 |
| 수동 15 | 메가 ex 등급별 12(스터미/픽시/지가르데/에어암드 — DR↔본문·SR↔UR·SAR↔SIR·MUR↔MHR 1:1 유일쌍, EN subtypes MEGA 버킷분리 — 닌자스피너 동일) + 특수E 3(グロウ草/テレパス超/ロック闘 직역) |
| 사전 +15 | TR_SV: エネはたき=Energy Swatter·古びたアゴ/ヒレの化石=Antique Jaw/Sail Fossil(닫힌집합 소거)·ポケパッド·ミアレガレット·コアメモリ·タラゴン·**ピュール=Naveen·ユカリ=Jacinthe**(SAR 2장↔SIR 2장 + メイ=Rosa 기확립 소거 확정)·メイのはげまし·ミアレシティ·ワンダーパッチ·せいなるはい·エネルギーリサイクル·活力の森 |
| EN 미보유 1 | JP#089 チゴラス AR — EN me3에 Tyrunt 본문 1장뿐(미수록 정답) |
| 영판전용 8 | Lapras ex(JP 미수집 — 메가엘레이드ex 세트 추정, 닌자스피너 Mega Gallade ex 동류) + EN 재록 스테이플 7(Crushing Hammer/Energy Search/Hole-Digging Shovel/Judge/Poké Ball/Pokémon Catcher/Potion) |
| 시프트 | 교차dry own 101 : cross(닌자스피너) 2 — 29건째 무시프트 확증 |
| 빌드 | 앵커 117 · EN 116 · KR 116 · 영판전용 8 |

> ⚠ **수칙 ④ 재실효**: 1차 빌드 영판전용 0 — merge가 만든 orphan LC 8개 setGroupId null(enMerged 로드 스코프 밖) → 백필 후 정상 8. **승격·병합 후 orphan LC setGroupId 확인은 필수 체크리스트.**

### (부수) kr-m3 시크릿 아이템 4장 스왑 교정 — 이미지 판정
- JP#101~104(エネルギーリサイクル/せいなるはい/ポケパッド/ワンダーパッチ)에 KR#101~104가 **번호 1:1로 오연결** — 실제 KR은 시크릿 아이템 4종을 가나다 재정렬(성스러운분말<에너지 리사이클<원더패치<포켓패드). **이미지 판정**: KR#101 = Sacred Ash 효과문(트래쉬 포켓몬 5장 덱 복귀), KR#103 = Wondrous Patch 효과문(기본 초에너지 패치) → 2쌍 교차 재연결. 인물·스타디움(#105~110)은 양국 동일 순서·이름 전수 일치로 정연결 확인. 레귤러·SR 트레이너 구간의 JP↔KR 번호 불일치 14건은 이름 직역 전수 일치 — KR 자국 정렬 재배열로 정상(닌자스피너 동일 패턴).

## §20. 메가드림 EN 병합 — Ascended Heroes(me2pt5) 바레 승격 · 캠페인 첫 합본 분산 (2026-06-07)

| 항목 | 내용 |
|---|---|
| 승격 | 바레 me2pt5(295, 독립 LC·CI 0) → en-tcg-me2pt5 신설 + 295 이관 + 바레 삭제 |
| 구성 확정 | **합본 EN**: 메가드림(JP 250) 대응 + MC 스타트덱100 신규분 대응 — dry 단독 145 vs 합본 214(+69>신규51 = MC 재록판 오배정 위험) → **합본 apply 기각, 2단계 분리** |
| 1단계 | 메가드림 단독 apply 166 + Anthea&Concordia 등급역전 교정(JP 양판 동률 SR — rankZip 동점 함정) + 메가 ex 등급별 수동 22(**전건 일러 교차검증 일치**: DR↔본문·MA↔MA·SAR↔SIR·MUR↔MHR) + 특수E 2(プリズム/ロケット団エネルギー) |
| 2단계 | **tmp-link-me2pt5-mc.ts**(dex+일러 양방향 유일쌍 + 트레이너 사전 + 본문/시크릿 구간 zip) → MC 87 + 다후보 구간확정 6(タブンネ/マッギョ/リザードンY 각 2:2) + 개별 5(노코치ex Larry소거·マリルリex·타이카이덴 chibi·**ウエートレス=Waitress 일러완전일치·ガイ=Urbain Teeziro유일쌍**) |
| 결과 | **병합 288/295 = 메가드림 190 + MC 98** · 시프트 교차dry own 288 : cross 7 — **30건째** |
| 사전 +15 | TR_SV: Ｎのポイントアップ(전각Ｎ)=N's PP Up·パワープロテイン=Premium Power Pro(닫힌집합 소거)·ファイトゴング·メガシグナル·カウンターゲイン·でんきだま=Light Ball·ぶあついうろこ=Thick Scale·アセロラのいたずら·サーファー·バーベナとヘレナ=Anthea & Concordia·リーリエの決心·夜の鉱山=Nighttime Mine·カナリィ=Canari·からておうの稽古=Black Belt's Training·ミステリーガーデン |
| EN 미수록 | JP 시크릿 트레이너 17(シロナのパワーウエイト·ヒビキの冒険·Ｎの城·トウコ 등)·메가 ex 3(リザードンX MA·サーナイト MA·ルカリオ MA)·メガヤンマex(EN에 Yanmega 부재) 등 |
| 영판전용 7 | 전원 사유 확정: Hop's Pincurchin ex·TR's Hypnotizer·Cheren(JP 미수집 출처) · Banette(SV 배틀파트너즈 재록 — JP 원본 자기 EN 보유) · **Mega Gengar ex(MBG#003 — me2 경합 판정 대기)** · TR's Kangaskhan ex(메가심포니아 — me1 판정 대기) · Pikachu ex(JP#234 SAR의 2번째 EN판 1:2) — jpPacks 가 수록처 자동 표기 |
| 빌드 | mega-dream-ex 앵커 250·EN 190·KR 249·영판전용 7 / **mega-start-deck-100 앵커 774·EN 98**·KR 773 — enMerged 그룹스코프 분산 분배(Cosmic Eclipse 동형, 한 EN세트 → 2그룹) |

> ⚠ 합본 EN 신규 병합 수칙: dry에서 합본 스코프 병합수가 (단독+신규분)을 **초과**하면 재록 오배정 신호 — 단독 apply 후 잔여를 양방향 유일쌍으로 회수. ⚠ jpPacks 가 보류 카드의 출처 추적 도구로 실효(배틀파트너즈 재록·MBG·메가심포니아 출처 자동 표기).

## §21. 인페르노X EN 병합 — Phantasmal Flames(me2) 바레 승격 · 겐가 경합 판정 (2026-06-07)

| 항목 | 내용 |
|---|---|
| 승격 | 바레 me2(130, 독립 LC·CI 0) → en-tcg-me2 신설 + 130 이관 + 바레 삭제 |
| 병합 | dry 82 → 사전 +8 → 97 자동 apply → 수동 31 → **128/130 = 인페르노X 110 + MBD/MBG 18** |
| 사전 +8 | TR_SV: ヒートバーナー=Blowtorch·せいなるおまもり=Sacred Charm·ギーマの一手=Grimsley's Move·**ヒカリ=Dawn**(DP 여주인공, 3판↔3판)·**バトルコロシアム=Battle Cage**(닫힌집합 소거)·めまいの谷=Dizzying Valley·パンクメット=Punk Helmet·ひふきやろう=Firebreather |
| 수동 31 | 메가 ex 12(헤라크로스/리자몽X/사메하다/미미롭 — DR·SR·SAR·MUR 등급별, **전건 일러 일치**) + Ignition Energy 1(JP#109 — **에너지 LC에 dex 109 오염 발견·제거**, 버킷 미스 원인) + **MBD 신규 9 + MBG 신규 9**(스타터 신규분, 전건 일러 일치 — メロエッタ/ゴースト IR판(MBD#022·MBG#022)은 EN 미수록) |
| **겐가 경합 판정** | me2 EN#56(5ban)이 **MBG#003 정짝 확정**(MBD/MBG 신규분 EN 행선지=me2 — MC 정본화 기록과 합치). me2pt5 EN#125는 재록판 → 영판전용 잔류 확정(jpPacks 'MEGA 구축덱' 표기) — §20 보류 해소 |
| EN 미수록 | 인페르노X 6(モンメン/エルフーン/ニューラ/マニューラ/カルボウ/オドリドリex) + MBD/MBG IR 2 |
| 영판전용 2 | Paldean Wooper(OKACHEKE)·Meowth(Uninori) — 전 시대 dex+일러 후보 없음(jpPacks 공란), 미수집 JP 출처 보류 |
| 시프트 | 교차dry own 128 : cross(니힐제로) 5 — **31건째** |
| 빌드 | mega-infernox 앵커 116·EN 110·KR 115·영판전용 2 / **mega-decks 앵커 46·EN 18**·KR 46 — 합본 분산 2그룹째 |

## §22. 브레이브+심포니아 EN 병합 — Mega Evolution(me1) · 🏁 MEGA 시대 EN 마감 (2026-06-07)

| 항목 | 내용 |
|---|---|
| 승격 | 바레 me1(188) → en-tcg-me1 — **CI 1건 최초**(en-tcg-me1-164, localeId cascade 추적 확인 + 병합 후 lcid 재귀속) |
| 병합 | 합본 dry(M1L,M1S — 양쪽 다 정짝 출처라 Cosmic Eclipse 모델 정당) 144 → 사전 +6 → 154 apply → 수동 28 → **182/188 = 브레이브 91 + 심포니아 91** |
| 사전 +6 | TR_SV: むしよけスプレー=Repel·**マチスの取引=Lt. Surge's Bargain**(3판↔3판)·アイアンディフェンダー·危ない廃墟=Risky Ruins·あやしい時計=Strange Timepiece·**ミツルの思いやり=Wally's Compassion**(3판↔3판) |
| 수동 28 | 메가 ex 9종 + ヌケニン 2판 — **EN 일러 전결손**(ptcg.io me1 artist 미제공)이라 dex+등급 유일쌍으로 확정(종별 단일세트·등급별 1판 구조) |
| **가루라 판정 종료** | M1S 잔여 = 전부 메가가루라ex(일반판), ロケット団のガルーラex 부재 → §20 보류 me2pt5 TR's Kangaskhan ex는 **미수집 출처 보류 유지가 정답** |
| EN 미수록 | リオル AR(M1L#068)·フーディン AR(M1S#071) |
| 영판전용 6 | EN 재록 스테이플(Boss's Orders·Energy Switch·Pokémon Center Lady·Rare Candy·Switch·Ultra Ball) |
| 시프트 | 교차dry own 182 : cross(인페르노X) 2 — **32건째** |
| 빌드 | mega-brave-symphonia 92·EN 91·영판전용 6 / mega-symphonia 92·EN 91 |

> **🏁 MEGA 시대 EN 페이즈 완전 마감** — me4(닌자스피너 119)→me3(니힐제로 116)→me2pt5(메가드림+MC 288)→me2(인페르노X+MBD/MBG 128)→me1(브레이브+심포니아 182). 합본 분산 3건(me2pt5 2그룹·me2 2그룹·me1 2그룹), TR_SV 누적 +55. 잔여: 어비스아이↔Pitch Black(EN 미발매 대기) · 영판전용 보류 카드들(미수집 JP 출처 — 메가엘레이드ex 세트·프로모).

## §23. DP 한국판(kr-bs1~10) 정체성 병합 — KR탭 신설 · 미발매 오판 정정 (2026-06-07)

### 발견·정정
- **"KR DP 시대 미발매 확정"(DP 배치3)은 오판** — 한국 DP 라인은 일본보다 4년 늦게 **2010-05-13~2011-03-03, 한국 전용 재편집 합본 10팩**으로 정발(Bulbapedia KTCG 10팩 이름·순서·장수 1:1 + pokemoncard.co.kr 공식 DB 등재 확인). 일본 특정 팩의 미러가 아니라 **DP+Pt 전역 발췌 크로스그룹 합본**.
- DB의 kr-bs1~10(460장)은 2026-05-28 미커밋 벌크 크롤 잔재(이름 100% "BS1 1" 플레이스홀더·빈 LC) — 실데이터는 data/kr-official/kr-official-bs1~10.json에 완비돼 있었음(한글명·일러 460/460·detailId).

### 처리 (멀티에이전트 5각 점검 → 파이프라인)
| 단계 | 내용 |
|---|---|
| apply | CFG에 bs1~10 추가(JP 13세트 합본 스코프) → 실명 재생성, 병합 428 + KR-only 보존 32 |
| 포켓몬 검증 | dex 불일치 0/369 + **전수 일러 감사 — 불일치 80 발견** → 대체 인쇄 후보 유무로 분리: 오연결 72(같은 종 다른 인쇄, apply 일러무시 폴백) 재연결 / 표기 오기 8(KR 사이트 일러 시프트 — 파이어/썬더/프리져 한 칸 밀림 실증) 유지 |
| 비포켓몬 | apply 폴백 오연결 39 → **KO2JA 수동 사전 51종**(전건 직역·인물 확정: 마박사=ナナカマドはかせ[마가목]·이수진의 검색=ミズキの検索·수희의 제비뽑기=スージーの抽選·종수의 공헌=クロツグの貢献·해당의 리서치=ハマナのリサーチ·미정이의 부탁=マイのおねがい·난천의 생각=シロナの想い·선단신전=キッサキしんでん 등) + 일러 일치 재연결 — tmp-fix-bs-trainers.ts |
| KR-only 35 | JP공유 LC 25(EN 경유 발견 — 일러 표기차로 apply가 놓친 진짜 JP) + **테오키스 4폼=DP5A#056~059**(デ/テ 표기·Konetsuna/Kanetsuna 정규화) + EN orphan 6(Mom's Kindness·Bubble Coat·**부활초=Life Herb pl1#108** 등 엔트리팩'08 유래) |
| 개별 판정 | **몬스터볼 3장 전부 pl1#113 Poké Ball(Ryo Ueda — JP판은 Yoshikawa 다른 인쇄)** · 기라티나(Ishikawa)=pl1#028 · **쉐이미 LV.X=DP6#012 이미지 판정**(HP100 시드플레어 — DP 보류건과 별개로 KR 확정) · 재록 다중 KR 라운드로빈 분산(타시대 오분산 L1a 1건 즉시 교정 — 시대 스코프 필수 교훈) |
| **최종** | **460/460 전량 연결 = JP앵커 423 + EN앵커 37** · 발매일 10종 보정(Bulbapedia) · 빈 placeholder LC 460 삭제 |

### 인프라 신설
- **build-group `krMerged`**(enMerged의 KR 대칭 — setGroupId 스코프 KR 로드 + lcid 공유 매칭): DP 9그룹+Pt 4그룹+dp-decks 적용
- **enAnchor 그룹 KR 지원**(EN앵커 LC 공유 KR을 KR탭으로): og-dpmd(마제스틱 던)·og-dpp 신설 등재 + GroupCards 배선
- 빌드 검증: 16그룹 krMatched 합 463(중복 포함)·krOnly 19 — kr-bs 460 전량 노출 경로 확보. og-dp1 "KR DP시대 미카탈로그" 주석 정정.

### 후속
- kr-bs 이미지가 apply 재생성으로 wmimages 원본 URL 복귀 — R2 재이관(migrate-images-to-r2) 필요
- 표기 오기 8건(KR 사이트 일러 시프트)은 이미지 판정으로 확정 가능(백로그) · kr-st1~3·kr-dp-p 발매일 1970 잔존(Bulbapedia: 크레세리아/다크라이 덱 2010-11-04)
- DP 한국 스타터(랜덤구축덱 4종 — 모험의 시작 동시발매) 미수집 — kr-st1~3과의 관계 점검 백로그

## §24. me2pt5 일러 전수 감사 — rankZip 동점 교차 39건 교정 (2026-06-07, 사용자 제보)

- **발단**: 사용자 제보 "Pikachu ex #277 확인, #276이 잘못 매핑된 듯" — 적중. ptcg.io 원본 EN#276=booota·#277=James Turner(둘 다 SIR, 별개 카드)인데 병합이 반대로(#276↔JP#234 James Turner SAR, #277 orphan). 원인 = **rankZip 동점(같은 레어도 다판)에서 번호순 선택**(Anthea&Concordia 역전과 동일 함정).
- **전수 감사**(tmp-audit-me-illus.ts — ptcg.io artist vs 연결 LC 일러, dex+일러 재배정·주귀속 우선): me2pt5 불일치 45 → **교정 39**(본문↔AR 쌍 교차 34 + MC판 이동 5: Tepig/Pignite/N's Darmanitan/Sneasel/Pikachu#276→MC#764) + **EN#277→JP#234 회수** + Snorunt EN#227→JP#200(잔여 1:1 소거).
- ptcg.io 오기 판정(JP 공식 원본 권위 — pg950 재수집으로 완전 검증된 일러): 트레이너 4(Petrel/Proton artist 교차 기록·Giovanni DOM·Nighttime Mine Takashi/Kenichi) + Cascoon Dsuke·Wattrel mingo·me4 철자 3(Mori You/UKUMO viti/Yasukunio) — 전부 연결 유지.
- 기존 판정 유지: 겐가 #125(SKIP — me2 EN#56이 MBG#003 정짝) · TR's Kangaskhan #162(M-P#086은 일반 메가가루라ex — 로켓단판 여전히 미수집).
- **타 me 세트 동일 감사**: me2 깨끗(보류 2 정합) · **me4 +1 회수(Mega Gallade ex → M-P#068** — M-P 수집 후 첫 재감사 수확, 닌자스피너 영판전용 3→2) · me3/me1은 ptcg.io artist 미제공으로 감사 불가(등급별 수동 매칭 구조라 동점 함정 없음 — 잔여 리스크 낮음).
- 빌드: 메가드림 EN 186(+MC 이동분)·enOnly 6 / MC EN 103 / 닌자스피너 enOnly 2.
> ⚠ 수칙: **합본 EN 병합 후 ptcg.io artist 전수 감사 필수** — rankZip은 동점(동일 dex·동일 등급 다판)에서 신뢰 불가.

## §25. 카드체크 2차 — me2pt5/me2 꼬리 출처 확정 · 인페르노X 결손 판정 (2026-06-07, DB 변경 없음)

사용자 /card-check 연쇄(메가드림 6장 → 인페르노X 5장) — 전건 "정상" 판정, 신규 사실만 기록.

| 카드 | 판정 | 증거 |
|---|---|---|
| me2pt5 #68 Hop's Pincurchin ex | 영판전용 정상 — JP 실존·미수집 | JP 공식 cardID **47168, 이미지 디렉터리 SV-P**(일본 프로모) |
| me2pt5 #162 TR's Kangaskhan ex | 〃 | cardID **47495, SV-P**. 배지 "메가심포니아"는 일반 메가가루라ex(동종·동작가 5ban) 폴백 힌트 — 동일 카드 아님 |
| me2pt5 #206 TR's Hypnotizer | 〃 | cardID **47497**(ロケット団のさいみん装置 — 가루라 인접 연번, 같은 프로모 시리즈) |
| me2pt5 #258 Cheren | 〃 (JP 미검출) | REND 일러 — JP 검색 30건 전부 타 일러(BBWF Furusawa 포함). 프로모 추정 |
| me2pt5 #91 Banette / #125 Mega Gengar ex | 재록판 잔류 정상 | 원본(sv9 ジュペッタ / MBG#003)이 이미 각자 EN 정짝 보유 |
| me2 #102 Paldean Wooper (IR) | 영판전용 정상 — **JP = SV-P cardID 47161 확정**(일러 OKACHEKE 일치) | "전시대 후보無" 보류 → 출처 구체화 |
| me2 #106 Meowth (IR, Uninori) | 〃 (JP 미검출 — SV-P 추정) | plain ニャース 최근판은 SVM/SV6a 전부 sui — Uninori판 일본 검색 DB 미등재 |
| 인페르노X #048 ニューラ(Gunjima)·#049 マニューラ(matazo) | JP+KR 정상, **EN 미발매가 사실** | ptcg.io me2 0건·MEGA 시리즈 전체 0건(me2pt5 Sneasel Krgc/Weavile aspara·Uninori는 별개 인쇄) — 연결 누락 아님 |
| 인페르노X JP#116 メガリザードンXex (MUR, takuyoa) | JP+EN(me2#130) 정상, **KR 공식 자체 미등재** | search_text_cards 마지막 페이지 M2_090~**115** 끝(전 4페이지) — kr-m2 115장은 출처 충실. 닌자스피너 KR 시크릿(§18②)과 동일 패턴 |

> 백로그: **JP SV-P 수집 시 회수 4장**(47161 ウパー·47168 バチンウニ·47495 ガルーラ·47497 さいみん装置) + 추가로 Uninori ニャース·REND チェレン 등재 여부 재확인 / **kr-m2 #116 KR 등재 시 수집**.

### §25-b. me1(Mega Evolution) 트레이너 꼬리 6장 — 일러 백필·배지 활성화 (2026-06-07)

사용자 /card-check 3차(처음 인페르노X로 오인 — 실제는 **메가브레이브 그룹의 me1 꼬리**: me1 188 중 병합 182 후 잔여 6 = 이 트레이너들). 전건 정상 판정:

| EN# | 카드 | 일러(tcgdex me01) | 판정 |
|---|---|---|---|
| 114 | Boss's Orders | NC Empire | 동일 아트 JP 다제품(MA#039·MBD#019·MBG#020 — 전부 EN없음) → 정짝 특정 불가, 잔류 정당 |
| 115 | Energy Switch | Studio Bora Inc. | 〃 (MA#012·MC#638) |
| 123 | Pokémon Center Lady | Tomowaka | **JP = SV-P 프로모 확정(cardID 47174·47732, Tomowaka 일치)** — 미수집 잔류 |
| 125 | Rare Candy | Studio Bora Inc. | 〃 다제품(MA#021·MBG#012·MC#655; M1S#082는 me1#175와 기연결 — 별개 인쇄) |
| 130 | Switch | Studio Bora Inc. | 〃 (MA#023·MBD#012·MBG#014·MC#663) |
| 131 | Ultra Ball | Ayaka Yoshida | 〃 (MA#020·MBD#011·MBG#011; MC#651 동일아트는 me2pt5#213 기연결 — 다제품 재록 실증) |

- 조치: ①6장 orphan LC **illustrator 백필**(tcgdex me01 — me1은 ptcg.io artist 미제공) ②TR_JP2EN에 ポケモンセンターのお姉さん=Pokémon Center Lady 추가 ③mega-brave-symphonia·mega-symphonia 재빌드 → **jpPacks 배지 5/6 활성화**(PCL만 null=JP 미수집, 정확). counts 불변(92/91/92/enOnly 6).
- 스테이플 동일 크레딧 한계: jpPacks가 다수(Switch 13곳) — 렌더는 "외 N" 축약. Rare Candy 배지에 자기 그룹(메가심포니아 M1S#082)도 포함되나 별개 인쇄 힌트로 유용해 유지.
- 백로그 갱신: **SV-P 회수 후보 5~6장째 = PCL 47174/47732**(영판전용 잔류 회수 목록에 추가).

## §26. BBWF JP↔EN 세트 교차 이동 발견·연결 24쌍 (2026-06-07, 사용자 제보)

- **발단**: 사용자 제보 "블랙볼트 ヒトモシ #015·ランプラー #016·シャンデラ #017 영문판 없음" — 적중. **EN 발매(Black Bolt/White Flare)가 일부 진화 라인을 JP와 반대 세트에 배치**한 구조적 패턴 발견.
- **교차 이동**: JP 블랙볼트→EN White Flare: ヒトモシ라인(본문 3+IR 3)·バルチャイ라인(본문 2+IR 2) = 10쌍 / JP 화이트플레어→EN Black Bolt: ギアル라인(본문 3+AR 3)·ワシボン라인(본문 2+AR 2) = 10쌍. 페어 전건 이름+dex+일러 양방향 유일쌍.
- **세트 내 미병합 4**: Escavalier(EN dex누락이 원인)·Professor's Research·Prism Energy·Ignition Energy(에너지/트레이너 매칭 한계).
- **함정 2**:
  - **zsv10pt5 #60 중복 = 실물 인쇄 에러**(Antique Cover Fossil이 060/086 오인쇄 — 정상 080, ptcg.io도 그대로 기록 → #80 결번·#60 두 장은 출처 충실). 번호 조회 시 이름 가드 필수.
  - **orphan LC 삭제 시 사용자 데이터 FK**(Trade 2·DeckRecipeCard 18 참조) → `migrateAndDelete` 패턴 신설(tmp-link-bbwf-cross.ts): Trade/CollectionItem/DeckRecipeCard/DeckCard/Ruling/ExternalIdMapping 이관 + TierEntry·CardText는 유니크 충돌 처리. me1 CI cascade 건의 일반화.
- **잔류 정당 5**: JP 단독 인쇄 4(ボルトロス IR B#120·ランクルス IR B#125·ゴチルゼル AR W#123·トルネロス AR W#158 — ptcg.io 검증, EN 세트 미수록) + EN 골드 Victini rsv#172(JP BBWF에 동일판 없음).
- 결과: 블랙볼트 EN 172/174·KR 174/174·영판전용 0 / 화이트플레어 EN 172/174·KR 174/174·영판전용 1(Victini).
> ⚠ 수칙: **쌍(雙) 세트 EN 발매는 교차 이동 가능** — BBWF처럼 JP 2세트↔EN 2세트 구도면 병합 후 반대 세트 스코프로 잔여 orphan 교차 dry 필수.

## §27. 로켓단의영광 — Destined Rivals 합본 분산 병합 (열풍의아레나 92 + 스타터 19) (2026-06-07, 사용자 제보)

- **발단**: 사용자 제보 "영판전용 114장이 너무 많다 + ロケット団エネルギー EN없음" — 적중. **EN Destined Rivals(sv10, 244장) = JP 로켓단의영광(132) + 열풍의아레나(92) + 스타터 SVOM/SVOD 발췌 합본**인데 로켓단의영광 스코프만 병합돼 있었음(**열풍의아레나 92장 전체 EN 미병합**).
- **1차: merge-en-identity 합본 전체 스코프 재실행**(`jp-sv-destined-rivals,jp-sv-heatwave-arena sv10`): 병합 130→213. TR_JP2EN +4(ペパーのサンドウィッチ=Arven's Sandwich·MCの盛り上げ=Emcee's Hype·シロナのパワーウエイト=Cynthia's Power Weight·ヒビキの冒険=Ethan's Adventure) 후 재실행 → **220, orphan 24**.
- **2차: 스타터 출신 수동 19쌍**(tmp-link-sv10-cross.ts — 일러 전건 일치, migrateAndDelete 재사용·덱레시피 참조 39건 이관): **SVOM**(마리 스타터) Marnie's 라인 8 + Energy Recycler(エネルギーリサイクル) + Spikemuth Gym / **SVOD**(다이고 스타터) Steven's 라인 7 + Granite Cave(いしのどうくつ) / ロケット団エネルギー #098↔EN#182(특수E 1:1).
- **3차: ptcg.io artist 전수 감사**(244장): 정상 234 · 불일치 4 = **Petrel/Proton 작가 교차 — §24와 동일한 ptcg.io 오기 재확인**(JP 공식 권위: ランス=Naoki Saito·ラムダ=GOSSAN, 이름 기반 연결 유지).
- **build-group crossGroup 버그 수정**: 교차그룹 EN 선별이 dex 기반 포켓몬 전용이라 병합된 트레이너 13장이 빌드 누락 → **LC 공유 EN 우선 로드+매칭 단계 신설**(지문 추정보다 강함, 트레이너 포함). 열풍의아레나 EN 79→90.
- **잔류 정당**: sv10 영판전용 5(Rellor=초전브레이커 재록·JP 기짝 / Rabsca ex·Hippopotas·Hippowdon·TM Machine = JP 동일판 미식별, 프로모 추정 백로그) + JP측 3(ロケット団のソーナンス AR #103 = EN 미수록 / 열풍 #058 Switch·#059 Catcher = EN 세트 미수록 스테이플).
- 결과: **로켓단의영광 EN 131/132·KR 132/132·영판전용 5** / **열풍의아레나 EN 90/92·KR 92/92·영판전용 0**.
> ⚠ §26 수칙 확장 실증: 신팩 합본은 "본팩+강화팩+스타터" 3원 분산까지 가능 — EN 병합 시 동시기 JP 제품 전체를 스코프 후보로.

## §28. 배틀파트너즈 — Journey Together 합본 분산 병합 (스타트덱 Generations 56) (2026-06-07, 사용자 제보)

- **발단**: 사용자 제보 "스파이크에너지 EN없음 + 영판전용 61장" — 적중. **EN Journey Together(sv9, 190장) = JP 배틀파트너즈(132) + 스타트덱 Generations(SVM 183 중 신규분) 합본** — SVM 183장 전체 EN 미병합 상태(§27과 동일 패턴 연쇄 2번째).
- **함정(신규): JP SVM subtypes "EX"(대문자) 오기** — ex 7장(Amoonguss·Blaziken·Reshiram·Tapu Koko·Mimikyu·Alcremie·Clodsire)이 지문(subtypes 포함)에서 탈락 → **EX→ex 정규화 18장** 후 재병합. dry의 "subtypes 어긋남 의심" 경고가 정확히 7장을 지목(경고 기능 실효 입증).
- 병합: 129→**185**(+SVM 56) · Spiky Energy 2판 수동(JP#100 U↔EN#159·JP#132 UR↔EN#190, 특수E 1:1, 덱레시피 9 이관) · ptcg.io 감사 190장 **불일치 0**.
- **잔류 정당**: sv9 영판전용 3 — **Veluza ex = ミガルーサex SV-P 프로모 확정(cardID 46126, 5ban 일치)** / Billy & O'Nare(JP 검색 0건 — 프로모 추정) / Professor's Research(Taira Akitsu — JP 동일 일러 7판: MA·SV11B·SVM×3·SVN·SVOM, 유일쌍 불성립 → 스테이플 잔류 원칙). JP측 1 = **Nのゾロア AR #108(Mizutani) EN 미수록**(sv9 N's Zorua는 본문 Sasumo판뿐).
- **sv-start-deck-generations 그룹 enNative:[]→null(crossGroup) 전환**: 신규분 56이 sv9 EN 공유하게 됨 → §27의 LC 공유 우선 매칭으로 EN 93/183 표시(공유 56+재록 지문 37).
- 결과: **배틀파트너즈 EN 131/132·KR 132/132·영판전용 3** / 스타트덱 Generations EN 93/183·KR 183/183.
- 미연결 SVM 트레이너 9장(コック·ゴヨウ·チリ·ドラセナ·たんぱんこぞう·マサキの転送 등)은 EN측 대응 없음(sv9에 미수록) — 사전 추가 불필요, 잔류 정상.
> 백로그 갱신: SV-P 회수 목록 +1 = ミガルーサex 46126 (누적: ウパー·バチンウニ·ガルーラ·さいみん装置·PCL×2·ミガルーサex).

## §29. 테라스탈페스타 — Prismatic Evolutions 정밀 감사 (SVM 분산 37 + 오연결 11 교정) (2026-06-07, 사용자 제보)

- **발단**: 사용자 제보 "EN 누락 대량 + 영판전용 42장" — 구조 판명: **EN PRE(180) = JP 테라스탈페스타(237) 부분 대응 + SVM(스타트덱 Generations) 발췌 합본**. SVM 분산이 sv9(§28)에 이어 PRE에도 — **SVM은 3개 EN 세트로 갈라진 최초 사례**(sv9 56 + sv8pt5 39 + 재록 지문).
- **처리**: ①orphan 42 일러 백필(tcgdex sv08.5 — ptcg.io artist 미제공 세트) ②합본 스코프 병합 +37 ③재배정 검증: merge가 기존 연결 4건을 SVM으로 이동 — **1건은 기존 오연결의 자가 교정**(Sylveon EN#40=MINAMINAMI Take→SVM 정짝), 3건(Duraludon·Eevee·Dunsparce)은 tcgdex 일러 판정으로 테라페스타 복귀.
- **tcgdex 전수 감사 180장 → 불일치 12 → 이미지 정밀 판정**:
  - **이브이 본문 5(Leafeon·Flareon·Vaporeon·Glaceon·Jolteon) = tcgdex 일러 오기**(이미지 동일 확인 — Leafeon·Flareon 실측) → 연결 유지. ⚠ tcgdex도 ptcg.io처럼 일러 오기 있음(서드파티 공통).
  - **트레이너 본문↔SIR 스왑 3쌍 = 진짜 교차 오배정**(Amarys EN#93 이미지=JP#173 Komayama 확정): Amarys·Kieran(スグリ)·Lacey(タロ) 각 본문/SIR 맞교환 — 이전 SV7팩 병합의 rankZip 동점 함정 잔존.
  - **Hawlucha EN#89 오연결**(이미지: ITO HP80 Rising Tackle ↔ 테라페스타#084 GOSSAN HP70 특성형 — 별개 카드) → **SVM#111 정짝 재연결**.
- **잔류 정당**: PRE 영판전용 5(Professor's Research 4판 — SVM 동일일러 Ishikawa·Teeziro 각 3판 유일쌍 불성립 / Roto-Stick — JP 검색 0건 프로모 추정) · 테라페스타 EN없음 101 = **EN 미수록 인쇄**(JP 하이클래스 237 vs EN 180 구성 차이: JP 전용 AR·재록·마스터볼미러 등 — 사용자 제보 대량 목록이 이것).
- 결과: **테라페스타 EN 136/237·KR 237/237·영판전용 5** / 스타트덱 Generations EN 127/183.
> ⚠ 수칙 보강: 일러 출처 우선순위 JP공식 > tcgdex ≈ ptcg.io — 서드파티 불일치는 **이미지 직접 판정**이 최종 권위(이번 12건 중 5건이 tcgdex 오기, 7건이 실제 오배정 — 표기만으론 구분 불가).

## §30. 초전브레이커 — Surging Sparks 합본 분산 병합 (드래고나 94 + 테라스탈 스타터 17) (2026-06-07, 사용자 제보 — 연쇄 4번째)

- **구조**: EN Surging Sparks(252) = JP 초전브레이커(138) + **낙원드래고나(94 전체)** + 테라스탈 스타터 SVLS/SVLN 발췌(17) 합본 — 영판전용 116 제보.
- 처리: ①merge 합본 스코프 116→227 (TR_JP2EN +9: エネルギー転送PRO=Energy Search Pro·メガトンブロアー=Megaton Blower·竜の秘薬=Dragon Elixir·ドラセナ=Drasna·ルチアのアピール=Lisia's Appeal·おたすけベル=Call Bell·ぼうがいレター=Meddling Memo·ダークボール=Dusk Ball·イトケのみ=Passho Berry) ②orphan 23 일러 백필(tcgdex sv08 — ptcg.io artist 미제공) ③스타터·특수E 수동 20쌍(tmp-link-sv8-cross.ts — SVLS 8: パーフェクトミキサー=Brilliant Blender 포함 / SVLN 9: プレシャスキャリー=Precious Trolley 포함 / 드래고나 3: 블랙큐레무 DR·リッチ=Enriching·ジェットE) — 일러 전건 일치, 참조 42건 이관.
- **전수 감사 252장(tcgdex) → 불일치 2 → 이미지 판정**: Victini "0313" vs "313" = 동일 도트작가 표기차(유지) / **Charcadet #32↔#33 스왑 = 진짜 오배정**(이미지: #32=HP70 Will-O-Wisp=SVLS#005 Kariya와 동일 / #33=HP80 Mékayu=초전#020 정짝) → 교정. 검증: #32→SVLS#005·#33→초전#020 확인.
- **잔류 정당 4**: Kilowattrel ex(PLANETA Yamashita)·Flamigo ex(N-DESIGN)·Tyme(Komayama) = JP 동일판 미검출(프로모 추정) / Tera Orb = 동일 인쇄가 SVLN·SVLS·SVN·테라페스타·메가드림 5곳(유일쌍 불성립). JP측 2 = **モモワロウ #075(sv8에 Pecharunt 미수록)·レアコイル AR #112(EN Magneton은 본문 #59뿐 — 초전#035와 정상 연결 확인)**.
- 결과: **초전브레이커 EN 136/138·KR 138/138·영판전용 4** / **낙원드래고나 EN 94/94 완전**(crossGroup LC 공유 — #077 SR 블랙큐레무→sv8#218 포함).
- 제보 116장 항목별 재검증: 연결 111(드래고나 93+SVLN 9+SVLS 8+초전 1) · 잔류 5(전건 사유 확정 — Charcadet은 스왑 교정으로 #33이 잔류서 회수, 최종 잔류 4).

## §31. 스텔라미라클 — Stellar Crown 합본 분산 병합 (배틀아카데미 35 + 스페셜덱 4) (2026-06-07, 사용자 제보 — 연쇄 5번째)

- **구조**: EN Stellar Crown(175) = JP 스텔라미라클(135) + **배틀아카데미(SVI, 2024-03)** 35 + **스페셜덱세트ex 이상해꽃·리자몽·거북왕(SVG, 2023-11)** 4 합본. 덱빌드BOX(SVK)는 구성 무관(재록 박스) — merge 신규 0의 원인은 orphan 일러 null(백필 42, tcgdex sv07).
- 연결 41 = 자동분류 유일쌍 18 + 다후보 19(MC 2025-12 재록 경합 — 시기 일치 원본 SVI 선택, Greninja ex는 10후보 → 이미지 판정으로 SVI#017 확정) + **같은 종 2판 오배정 교정 4**(Meditite #77↔#78·Meltan #102↔#103: 본팩판이 한 칸 위 EN에 오연결 — tcgdex 일러 #77=GOTO minori=SVI#029 アサナン·#102=Yuka Morii=SVI#040으로 판정, "재록 잔류"로 보였던 #78/#103이 본팩 정짝).
- **스킬 6단계(최종 직접 점검) 신설 — 사용자 지시 반영**: ①제보 목록 항목별 DB 재조회 ②세트 전수 일러 감사 ③불일치는 이미지 직접 판정 ④빌드 counts 대조. 이번에 #77/#102 오배정을 6단계가 적발(분류 단계에선 "재록 잔류" 오판).
- 전수 감사 175장(tcgdex): **불일치 0** (메타결손 2).
- **잔류 정당**: 영판전용 3 — **Garganacl ex = キョジオーンex SV-P 프로모 확정(cardID 44410, 5ban 일치 — SV-P 회수 9장째)** / Pansear(0313)·Yamask(aoki) = JP 미검출(최근판은 BBWF 화이트플레어 타일러 — 프로모 추정). JP측 2 = **ヨルノズク AR #114(EN Noctowl은 #115 1판뿐)·テラパゴスex SR #122(EN은 DR/SIR/HR만)** — EN 미수록.
- 결과: **스텔라미라클 EN 133/135·KR 135/135·영판전용 3**. 제보 42장: 연결 39(SVI 35+SVG 4) · 잔류 3(전건 사유 확정).

## §32. 나이트원더러 — Shrouded Fable 꼬리 5장 (2026-06-07, 사용자 제보)

- **충성스러운 세 독 IR 3장(Munkidori #72·Fezandipiti #73·Okidogi #74) = 변환의 가면(twilight-masquerade) AR #107/#108/#110 출신** — 일러(Teeziro·KEIICHIRO ITO·AKIRA EGAWA) 유일쌍 + Munkidori 이미지 판정(동일 일러·HP110·Adrena-Brain 확인) → 연결 3, 덱레시피 11 이관. orphan 일러 null이라 자동 병합이 못 잡았던 케이스(tcgdex sv06.5 백필).
- **기본 악/강철 에너지 #98/#99(Hyper rare 골드) = 영판전용 잔류 정당** — JP 세트는 골드 기본E 미수록(기본E 스테이플 잔류 관례).
- 결과: **나이트원더러 EN 94/94 완전·KR 94/94·영판전용 2**(골드 기본E).
- ⚠ 후속 관찰: sv-twilight-masquerade 그룹 enOnly 98 — EN Twilight Masquerade(sv6)도 합본 분산(크림슨헤이즈 등) 미병합 의심, 다음 점검 후보.

## §33. 변환의 가면 — Twilight Masquerade 합본 분산 병합 (크림슨헤이즈 91 + α) (2026-06-07, 사용자 제보 — 연쇄 6번째)

- **구조**: EN Twilight Masquerade(sv6, 226) = JP 변환의가면(133) + **크림슨헤이즈(sv5a, 96 전체 미병합)** + 배틀아카데미 1(Cook=コック SVI#058). §32에서 예고한 enOnly 98 적중.
- 병합: 128→219(merge, TR_JP2EN +9: 管理人=Caretaker·公民館=Community Center·サザレ=Perrin·ゴヨウ=Lucian·アンフェアスタンプ=Unfair Stamp·ハイパーアロマ=Hyper Aroma·ラブラブボール=Love Ball·サバイブギプス=Survival Brace·ラッキーメット=Lucky Helmet) + 수동 6(Enhanced Hammer U/UR 2판 분배·Boomerang/Legacy/Luminous 특수E·Cook).
- 제보 JP 5장 검증: レガシーエネルギー#101→sv6#167 ✅ / AR 3장(§32에서 기연결: 마시마시라→sv6pt5#72 등) ✅ / 改造ハンマー#132 UR→sv6#224 ✅.
- **잔류 정당**: sv6 orphan 1 — **Raifort = レホール SV-P 프로모 확정(cardID 44412, hncl 일치 — SV-P 회수 10장째**, DB의 レホール는 테라페스타 재록판뿐). JP측 2 = 크림슨헤이즈 #056 ポケモンいれかえ·#057 ポケモンキャッチャー(EN 세트 미수록 스테이플).
- 전수 감사 226장(ptcg.io): **불일치 0**.
- 결과: **변환의가면 EN 131/133·KR 133/133 / 크림슨헤이즈 EN 94/96·KR / sv6 영판전용 1**.

## §34. 와일드포스/사이버저지 — Temporal Forces 스타터 분산 (SVHK/SVHM 18 + 특수E 2) (2026-06-07, 사용자 제보 — 연쇄 7번째)

- **구조**: EN Temporal Forces(sv5, 218) = JP 와일드포스(SV5K 100)+사이버저지(SV5M 100) 쌍 세트 + **스타터&빌드세트 고대 코라이돈(SVHK)/미래 미라이돈(SVHM) 발췌 18**. 본팩 양쪽은 기병합 상태(각 EN없음 2).
- 연결 21 = 스타터 17(SVHK 8+SVHM 9, MC 2025 재록 배제) + 특수E 2(Mist=SV5M#071·Neo Upper=SV5K#071) + **Great Tusk #96↔#97 한 칸 오배정 교정 2**(tcgdex: #96=Arita=SVHK#010·#97=GIDORA=SV5K#042 — 스텔라 Meditite §31과 동일 패턴).
- 전수 감사 218장 → 불일치 2 → **이미지 판정: 둘 다 ptcg.io 일러 오기**(Roselia: 카드 크레딧 Tomomi Ozaki ↔ ptcg.io Kaneko / Roserade: Gapao ↔ matazo) — 연결 유지. 실질 불일치 0.
- **잔류 정당**: sv5 orphan 2 — Scovillain ex #22(**EN 선행 인쇄** — JP 1쇄가 8개월 후 초전브레이커#023, 그 판은 sv8#37과 기짝. MC#147 재록 연결은 시기 부정확하여 잔류) / Master Ball #153(ACE SPEC — SVHK#032·SVHM#032 동일 인쇄 2곳, 유일쌍 불성립). JP측 — **ハバタクカミ AR #076(제보)·テツノイバラ #077 = EN 미수록**(sv5는 본문판만 수록).
- 결과: **sv5 영판전용 22→2** · 와일드포스 EN 98/100·사이버저지 EN 98/100.

## §35. 샤이니트레저 ex — Paldean Fates 전수 점검 (영판전용 32→4 · svp 프로모 23 · 감사 오연결 4 교정) (2026-06-07, 사용자 제보)
- **구조**: EN Paldean Fates(sv4pt5, 245) = JP 샤이니트레저(sv4a 360) 발췌 + **타팩 보충**(레이징서프 10·고대의포효 7·미래의일섬 1·SVEL 3·SVEM 5) + EN 오리지널/SV-P 4. 역으로 sv4a 베이스 190은 대부분 기존 SV팩 **재록**(원판 기EN — sv4a판 EN 빈칸이 정상), 샤이니 시크릿 중 EN 미수록분은 **svp 프로모(PAF 프리미엄/틴)**로 발매.
- 연결 55+4: ①PAF orphan 26(dex+일러 유일쌍, Woobat·Magmar 등 이미지 스팟) ②박사연구 2(sv4a #176=オーリム=Sada↔#87·#177=フトゥー=Turo↔#88 — 이미지 페어링) ③**svp 프로모 23**(svp#6~37=2023 프로모 7, svp#69~84=PAF 프리미엄/틴 16 — 전부 sv4a 유일쌍, 리자돈ex 샤이니는 svp#74(2023)·svp#196(2025 별개) 이미지 구분) ④sv2 잔여 2(Shinx sv2#69↔#059·Tinkatuff sv2#104↔#095 — SV2D판과 별개 아트 이미지 판정).
- **리오르 오연결 교정**(전수 감사 외 발견): sv1#112 실물=Naoyo Kimura(Jab/Low Kick)인데 ptcg.io 일러 오기(chibi)로 SV1S#040(chibi)에 오연결 → SVAM#008(Naoyo Kimura)로 재배정, sv1#113(chibi 실물)을 SV1S#040으로. chibi 리오르 JP 3쇄(SV1S/SVD/sv4a) — sv4a판은 다수 인쇄 잔류.
- **전수 일러 감사(tcgdex 241 대조) 적발 4건 교정**: EN#224 Wugtrio·#225 Palafin·#226 Pawmi = **AR 풀그림이 JP base(#045/#047/#066)에 오연결** → JP AR(#338 Tetsu Kayama/#339 akagi/#340 REND)로 재배정(이미지 판정 — PAF #221+ 구간은 AR 대응). EN#65 Revavroom = JP#131(DOM, 별개 아트)에 오연결 → SVD#087(Anesaki, PAF 시점 유일 미연결 재록)로 재배정. ※ base가 EN을 가진 척하던 가짜 매칭이 감사로만 드러남 — 6단계 가치 재입증.
- **잔류 정당(영판전용 4)**: Barboach #50=**SV-P 43310**(ryoma uratsuka, 미수집) / Atticus #77=**SV-P 43312**(kantaro 1쇄 — SV8a#191 재록은 EN PE판과 기짝) / Moonlit Hill #81=**SV-P 44033**(SV8a#183 재록 無EN이나 원판 우선 잔류) / Nemona #82=구축덱 동일 인쇄 16곳+(SVI#062 아트 — 유일쌍 불성립). → SV-P 회수 대기 +3.
- **JP EN없음 121 사유 분류**: 재록(원판 기EN — sv1/sv2/sv3/sv3pt5/151 등) 약 75 / 재록(원판 無EN — **트리플렛비트 계 ~20**: 스타터 3라인·クラベル·レッスンスタジオ·スーパーエネルギー回収·ルミナスE 등, 그 그룹 점검 때 EN sv2 orphan들과 연결 예정) / 동일 인쇄 다수(ペパー·ボスの指令 22곳·ネモ·리오르·미라이돈/코라이돈ex) / 에너지 재록 3(セラピー=SV2D#071·リバーサル=SV2P#071·ルミナス=triplet#073 원판).
- **sv-decks enNative []→null 전환**: EN 연결 누적(SVHK/SVHM 18+SVEL/SVEM/SVAM/SVD 10)을 crossGroup LC 공유로 표시(EN매칭 191).
- 결과: **PAF 영판전용 32→4** · sv4a EN 239/360 · 빌드 9그룹 갱신(paldean-fates/raging-surf 63·paradox-rift 93·future-flash 93·decks 191·base/paldea-evolved).

## §36. 고대의 포효 — Paradox Rift 레이징서프 대량 미병합 해소 (영판전용 88→0) (2026-06-08, 사용자 제보 — 연쇄 8번째)
- **구조**: EN Paradox Rift(sv4, 266) = 고대의포효(SV4K)+미래의일섬(SV4M)(기병합) + **레이징서프(sv3a 92) 통째 미병합** + 스타터 테라스탈 SVEL/SVEM 발췌 8 + 특수E 2. 제보 88 = sv4 orphan 88과 정확 일치. 제보 JP측 7장(マラカッチ 등)은 §35에서 PAF 연결 완료된 배포 전 화면.
- merge 합본 스코프(SV4K+SV4M+RS→sv4): 244→**256**(TR_JP2EN +6: アオキ=Larry·シキミ=Shauntal·チリ=Rika·パラソルおねえさん=Parasol Lady·ワザマシン 2종). **Wimpod #47 자가 교정 1**(SV4K#021→RS#009 — 일러 교차 일치 확인, 기존 한 칸 오배정의 merge 자동 교정).
- 수동 10: SVEL 4(Volcanion·Fuecoco·Crocalor·Skeledirge ex — Volcanion은 SVEL#004 9월 1쇄 선택, SVG#011은 sv4 동일발매 재록 / Skeledirge는 SVEL#008 선택, triplet#020은 PAL 짝 예약) + SVEM 4(Mewtwo ex·Natu·Xatu·Deoxys — SML#025는 뮤츠**GX** 別카드) + 특수E 2(Medical=RS#062·Reversal 골드=RS#092 UR 인쇄 유일). 이미지 판정 3쌍(Volcanion·Mewtwo ex·Skeledirge ex).
- **전수 일러 감사(tcgdex 265) 적발 4 → 스왑 교정**: Honedge #130↔#131·Doublade #132↔#133 — merge가 SV4M판·RS판을 교차로 붙임(같은 종 2판 한 칸 오배정 5번째 사례). 이미지 판정: #130=aoki(きる/Cut Up)=RS#045·#131=Nagomi Nijo(とつげき)=SV4M#043·#132=Bun Toujo=RS#046·#133=Negishi=SV4M#044.
- **잔류 정당**: sv4 orphan **0**. JP측 — RS 2(ふしぎなアメ·ポケモンいれかえ = EN Paradox Rift에 Rare Candy/Switch 미수록 스테이플) / SV4K 2(サケブシッポ AR #071·基本悪 UR #095 = EN 미수록, EN은 base Scream Tail #86뿐·기본E 골드 없음) / SV4M 2(テツノツツミ #071·基本鋼 #095 — 대칭 구조).
- 결과: **고대의포효 영판전용 88→0** · 레이징서프 EN 90/92 · 고대의포효/미래의일섬 EN 각 93/95.

## §37. JP 강화팩 간판 AR ↔ svp 프로모 패턴 발견 — 과거 "EN 미수록" 판정 5건 정정 (2026-06-08, 사용자 제보 계기)
- **계기**: 미래의일섬 テツノツツミ AR #071 제보("매번 없는 것 같다") → dex+일러 재검색에서 **svp#66 orphan 발견**. 같은 방법으로 과거 잔류 AR 전수 재검색.
- **패턴**: JP 강화팩의 간판(마스코트) 포켓몬 AR는 EN 합본 세트에 미수록되는 대신 **svp 프로모로 발매**된다. svp 번호대가 세트 발매순과 비례(65/66=Paradox Rift기 → 97/98=Temporal Forces기 → 141=Stellar Crown기).
- **연결 5 (전건 이미지 동일 아트 판정)**: サケブシッポ AR(SV4K#071 GIDORA)↔svp#65 · テツノツツミ AR(SV4M#071 Teeziro)↔svp#66 · ハバタクカミ AR(SV5K#076 Takumi Wada)↔svp#97 · テツノイバラ AR(SV5M#077 Tonji Matsuno)↔svp#98 · ヨルノズク AR(stellar#114 Tetsu Kayama)↔svp#141. **svp#66은 pokemon.com 공식 단건 검증 통과**(Iron Bundle/Refrigerated Stream — 신규 수칙 첫 적용. UA 교체로 통과, 2건째부터 인터럽트 페이지라 중단·이미지 판정 대체).
- **정정**: §34(ハバタクカミ·テツノイバラ "EN 미수록")·§36(サケブシッポ "EN 미수록")·스텔라 ヨルノズク 잔류 판정 → 실은 svp 프로모 존재. **수칙 갱신: JP AR/SR "EN 미수록" 단정 전에 svp(EN 프로모) dex+일러 검색 필수.**
- **재검토 결과 잔류 유지가 맞는 것**: 기본E 골드 UR(SV4K 悪 #095·SV4M 鋼 #095 — EN은 기본E 골드를 메인 세트에 안 냄, EN 전 세트 부재 확인) / BBWF IR 4(ボルトロス#120·ランクルス#125·ゴチルゼル#123·トルネロス#158 — svp에도 부재) / 스텔라 テラパゴスex SR(5ban 동일구도 기연결 노이즈뿐).
- 결과: **와일드포스·사이버저지 EN 100/100 완전 마감** · 고대의포효/미래의일섬 각 94/95(잔여=기본E 골드 1) · 스텔라 134/135.

## §38. 흑염/클레이버스트/151 연쇄 — sv2·sv3 합본 재병합 + 감사 오배정 38건 교정 (2026-06-08, 사용자 제보 3연속)
- **구조**: EN Obsidian Flames(sv3, 230) = 흑염(141) + **ex스타트덱(SVD) 대량** + triplet/SV2D/SV2P 잔여 + SVP1(ex스페셜세트) 3 + svp. EN Paldea Evolved(sv2, 279) = SV2D/SV2P(기병합) + **트리플렛비트 대량** + SVC(스타터 피카츄ex&파모트) 8 + 1월 스타터(SVAM/SVAW/SVAL) 일부.
- **merge**: sv3 90→6 (사전 +11: Larry·Shauntal·Rika·Parasol Lady·기술머신 2 + Great Ball·Falkner·Katy·Energy Search·Youngster / SVD subtypes EX→ex 10 정규화 — SVM §28 재발). sv2 98→19→수동 19(에너지 4 1쇄: Jet↔triplet#072·Luminous↔#073·Reversal↔SV2P#071·**Therapeutic↔SV2D#071(EN명이 Therapy가 아닌 Therapeutic — §35 세라피 '없음' 판정 정정)** / 게치스 3판 일러 1:1 triplet#069/#095/#100 / SVC 8 / 151 간판 AR·SAR↔svp#51/52/53 §37 패턴·Mew ex 이미지 판정 / Tinkaton ex base↔svp#31).
- **전수 감사 적발 — sv3 24건 + sv2 13건(+연쇄 2) 재배정**: merge의 rank 동점·번호순 zip이 같은 종 다판(본문/AR/IR/스타터판)을 뒤섞음. tcgdex EN일러 ↔ JP공식 일러 1:1 교차(전건 성립) + 이미지 스팟 6쌍(Combee·Bellibolt IR↔AR·Charcadet·Shinx·Tinkatuff·SV2D#019)으로 확정. **rarity null(스타터) rank=5 = IR/AR rank와 동점 함정** — sv2 IR 5장이 SVAM/SVAW/SVAL에, sv3 IR 4장이 SVD에 오배정됐던 것을 triplet AR존(#074~082)·흑염 AR존으로 복귀.
- **1쇄 재정정 2(§35 일부 번복)**: sv2#69 Shinx ↔ SV2D#019(1쇄 — sv4a#059는 재록 잔류 복귀) / sv2#104 Tinkatuff ↔ SV2D#034(sowsow 1쇄 — sv4a#095 잔류 복귀). 어제 "sv4a가 유일 짝" 판단은 #68/#103의 숨은 오연결(kurumitsu/Komayama 판이 SV2D 자리를 점유)이 원인 — 감사가 풀어냄.
- **잔류 정당**: sv2 3 = **Dendra(ミモザ) 3판(yuu·yuu·GIDORA)** — JP 공식 ミモザ 전 인쇄 3건이 전부 SV1V(Sanosuke·Komayama, 기EN)로 일러 불일치 → **JP 미인쇄 EN 전용**(Victini 골드 패턴). sv3 2 = Klawf ex(**SV-P 42918**)·Brassius(**SV-P 42920**, PE#190은 재록 기EN) — 회수 대기 14·15장째. 레이징서프 ふしぎなアメ#053·ポケモンいれかえ#054 = EN Paradox Rift 미수록 + JP 동일인쇄 20곳+(구축덱 스테이플) 유일쌍 불성립 — 잔류 재확인(svp에도 무). SV2D#033 Tinkatink(Kouki)=EN 미수록.
- **sv-ex-start-deck·sv-goods enNative []→null**: SVD/SVP1 EN 연결 누적을 crossGroup 표시(110/140·28/186).
- 결과: **흑염 140/141(잔여 #067 우퍼 kirisAki=EN 미수록)·클레이버스트 98/99·151 210/210 완전·트리플렛비트 100/103** · sv2 orphan 98→3 · sv3 orphan 90→2.

### §38 추가 — 스노해저드/트리플렛비트 잔여 5장 (2026-06-08, 사용자 제보)
- 제보 36장 중 31장 = §38 본문 작업으로 기연결(배포 전 화면). 잔여 5장 처리:
- **コノヨザルex(SV2P#040) ↔ svp#32** — Tinkaton ex svp#31과 인접 프로모 묶음, 이미지 판정(Angry Grudge 20×/Seismic Toss 150 일치). 스노해저드 **99/99 완전 마감**.
- **ニャローテ AR(triplet#076) ↔ sv2#197** — merge가 같은 일러(Kouki Saitou) 스타터판 SVAM#005에 오배정(일러동일·아트상이 함정 — 감사 통과했던 건). 이미지 판정으로 AR=IR 동일 확정, 부수로 **sv1#14 ↔ SVAM#005**(과일나무 아트 동일) orphan 해소(sv-base 영판전용 42→41).
- **キハダ(Katy) 3판(#066 U·#092 SR·#099 SAR) = EN 미수록 잔류** — EN Katy 전 인쇄는 sv1 2장(SV1V 짝, Komayama)뿐으로 일러 불일치, PAL·svp에 無.
- ⚠ 신규 함정 기록: **같은 일러레이터의 다른 아트**(스타터 일반판 vs 본팩 AR)는 일러 감사(표기 대조)를 통과한다 — IR/AR존 EN이 스타터 JP에 붙어 있으면 의심하고 이미지 판정.

## §39. 스칼렛ex/바이올렛ex — S&V base 스타터 분산 병합 + 감사 18건 교정 (2026-06-08, 사용자 제보)
- **구조**: EN Scarlet & Violet(sv1, 258) = SV1S+SV1V(기병합) + **1월 스타터(SVAM/SVAW/SVAL)·SVB·SVC 발췌** + svp/SV-P 대응. merge 합본 스코프 41→5(+36).
- **merge가 깬 기존 판정 복원**: 리오르 #112(Naoyo=SVAM#008)·#113(chibi=SV1S#040) — §35 이미지 확정을 merge가 역행, tcgdex 재확인 후 복원. #215 IR(Nelnal)→SV1S#086 신규. 골드 기본E #257/#258이 스타터 일반판으로 밀렸던 것 복원(SV1V#108/SV1S#108).
- **전수 감사(tcgdex 252) 적발 12 + diff 6 = 18건 재배정**: Tarountula 3회전(#16↔SVAM#007 Tika·#17↔SV1V#006 Pani·#18↔SV1V#007 Kouki — #199 IR=Miki=SV1V#079)·Growlithe/Rotom/Lechonk 스왑·Flittle 3회전. 전건 tcgdex EN일러↔JP공식 일러 1:1.
- **Pawmot #209 IR ↔ SV1V#085** 수동 — **ptcg.io dex 오기(923→922)**로 merge 버킷이 갈라졌던 것(Kouki 일러 일치).
- **잔류 4**: Miraidon #80·Koraidon #124(Kouki) = **SV-P 42818/42820**(재록 WCS23) / Oinkologne #157(kirisAki) = **SV-P 42821**(재록 SVG#028) — 연속 ID 프로모 묶음, 회수 대기 16~18장째 / Poké Ball #185(Studio Bora) = JP 동시기 인쇄 무(SVI 배틀아카데미 2023-07이 최초 — EN 선행, 잔류).
- 결과: **스칼렛ex(SV1S) 108/108·바이올렛ex(SV1V) 108/108 완전 마감** · sv1 orphan 41→4.

### §40. 초전브레이커 KR 트레이너 5장 오매핑 교정 (2026-06-08, 사용자 제보)
- **증상**: 느긋풀·추리세트·기술머신 플루어라이트·마코열매·바리비열매의 KR 표시명이 카드끼리 어긋남(한 칸 밀림). **EN 연결은 전부 정확**(tcgdex 권위 대조: 推理セット=Deduction Kit·のんびりじゃらし=Chill Teaser Toy·ナモ=Colbur·リリバ=Babiri·フローライト=TM Fluorite). 틀린 건 **KR locale 앵커 + nameKo만**.
- **원인**: kr-sv4a §29 와 동일 패턴 — KR 트레이너는 가나다순 재정렬돼 JP 五十音 번호와 어긋나는데, apply-kr-official 가 번호 연쇄로 잘못 매핑. kr-sv8 트레이너 블록 전수 감사 → **정확히 5장만 어긋남**(2-swap 094↔096 + 3-cycle 099→101→100). 나머지 트레이너(미라클인터컴·스크램블·희망애뮬렛·시아노·시트론·규리·그래비티·익사이팅)는 정상.
- **교정**: KR locale 5장 logicalCardId 재배정 + nameKo 정정. kr#094→JP096·kr#097→JP094·kr#098→JP101·kr#099→JP099·kr#100→JP100. 빌드 재생성 후 3국 정합 확인.
- ⚠ **시스템 리스크**: verify-kr-mapping 은 트레이너를 dex로 못 잡아 이 오매핑에 맹점(메모리 [SM-A]·kr-sv4a 기록). **apply-kr-official 거친 다른 SV 팩(kr-sv5k/sv6/sv7 등) 트레이너 블록도 동일 어긋남 가능 — 전수 KR 감사 백로그.**
- 잔여 무관: 초전 SR/SAR 트레이너(#127~138) KR 미부착 = KR 시크릿 미수집(별개).

### §41. 낙원드래고나(kr-sv7a) KR 오매핑 3장 — Black Kyurem ex 포함 (2026-06-08, 사용자 제보)
- **제보**: "Black Kyurem ex 있는데 왜 수집 안 했지?" → 실은 **수집은 됐고 KR#011이 엉뚱한 JP#094(ジェットエネルギー)에 붙어** JP#011 기본 ex의 KR이 비어 보인 것. §40과 동일 KR 가나다 재정렬 오매핑이 **포켓몬 ex 카드**에 발생한 첫 사례.
- **kr-sv7a 전수 감사**: 번호불일치 13장 중 11장은 **이름 일치 정상**(트레이너 재정렬: 다크볼·드라세나·루티아·서퍼·제빈=カキツバタ). 진짜 오매핑 **3장**:
  - KR#011 블랙큐레무 ex: JP#094 → **JP#011** (번호감사로 적발)
  - KR#054 메가톤 블로어 ↔ KR#056 에너지 전송 PRO **swap**(둘 다 Toyste Beach 동일일러): #054→JP#056·#056→JP#052.
- ⚠ **#056은 번호가 우연히 JP#056과 같아 번호감사를 통과 — 이름 대조로만 적발.** → **KR 감사는 번호불일치 + 이름불일치 둘 다 봐야 함**(번호일치인데 이름 다른 경우 존재).
- 교정: KR 3장 logicalCardId 재배정 + nameKo 4장 정정. 빌드 94/94/94 완전, 3국 정합 확인.

### §42. 스텔라미라클 — 에이스번 ex EN 본문↔SAR 스왑 + 화석 2종 KR swap (2026-06-08, 사용자 제보)
- **① 에이스번 ex EN 교차(§29 패턴)**: JP#018(RR 본문)→EN sv7#157(SAR)·JP#116(SR 풀아트)→EN sv7#28(본문)로 **본문↔SAR 맞바뀜**. 일러는 둘 다 5ban으로 구분 불가 → **이미지 직접 판정**(JP#018=EN#28 테라크리스탈 프레임아트 / JP#116=EN#157 풀아트 동일포즈)으로 확정. EN 재배정 #28→JP018·#157→JP116. KR은 정상이었음(번호 미러).
- **② 古びた화석 2종 KR swap(§40 패턴)**: JP#090 ねっこ(Root)에 KR#089"덮개"(Cover), JP#091 ふた(Cover)에 KR#090"뿌리"(Root)가 교차. EN은 정확. KR 재배정 #089→JP091(덮개=Cover)·#090→JP090(뿌리=Root) + nameKo 정정.
- ⚠ 같은 팩에서 **EN 스왑(§29)과 KR 스왑(§40)이 동시 발생** — 일러 동일(5ban)·KR 가나다 재정렬 둘 다 자동매칭 맹점. 빌드 재생성 후 3국 정합 확인.

### §43. 나이트원더러 — 밤의 들것↔포켓바이털A KR swap (2026-06-08, 사용자 제보)
- JP#055 ポケバイタルA(Poké Vital A)에 KR"밤의 들것", JP#056 夜のタンカ(Night Stretcher)에 KR"포켓바이털A"가 교차. EN은 정확. 둘 다 일러 Toyste Beach 동일 → 자동매칭 못 가름(§42 메가톤/에너지전송과 동형).
- ⚠ **번호가 우연히 일치(KR#055→JP#055)해 번호감사 통과 — 이름 대조로만 적발**(§41 재확인). KR 재배정 #055→JP056·#056→JP055 + nameKo 정정. 나머지 트레이너(아크로마·도희·카시오페아 등) 이름 일치 정상.

### §44. 변환의가면 + 크림슨헤이즈 KR swap (2026-06-08, 사용자 제보)
- **변환의가면**: KR 곤충채집세트(むしとりセット)↔향연피리(おはやし笛) 2장 swap. JP#091 おはやし笛에 KR곤충채집, JP#094 むしとりセット에 KR향연피리 교차. (도깨비가면 등 나머지 이름일치 정상)
- **크림슨헤이즈**: KR 러브러브볼·포켓몬교체·포켓몬캐처 **3-cycle**(JP#056/057/058 전부 Studio Bora Inc. 동일일러). KR#054 러브볼→JP058·KR#056 교체→JP056·KR#057 캐처→JP057.
- EN은 양 팩 다 정확, KR locale+nameKo만 교정. **누적 KR swap: §40~44 연속 5팩(kr-sv8/sv7a/sv7/sv6a/sv6/sv5a) — 동일일러 도구쌍/3-cycle이 공통 원인.**

### §45. 샤이니트레저+고대의포효 KR 시크릿 트레이너 대량 오매핑 (2026-06-08, 사용자 제보, 메모리 예고 구간 실재)
- **kr-sv4a 17장**: 시크릿 트레이너/도구 블록(#156~190·#352~354)이 가나다 재정렬로 대거 어긋남. KR명↔JP정체 전수 1:1 대조로 misplaced만 추출: 도구쌍 다수(격려의편지↔일렉제너레이터·네스트볼↔낚싯대·커다란풍선↔타이트밴드↔먹다남은음식↔위기극복한방 순환·용기의부적↔커다란풍선)·박사연구↔테사·보울마을↔비치코트·루미너스E↔테라피E·시크릿 모란↔페퍼. nameKo=KR명 자동 정정.
- **kr-sv4k 2장**: 대지의 그릇↔잠만보인형(#059/#060 번호 우연일치로 번호감사 통과 — 이름으로만 적발).
- 이름 일치 정상(수퍼에너지회수·하이퍼볼·이상한사탕·오기머리띠·박사연구1·보스지령·카리스마·모야모·클라벨·페퍼본문·마을백화점·리그본부·레슨스튜디오·리버설E / sv4k 부스트에너지·오기조끼·TM데볼루션·사다기백·종길·멜로코)은 보존.
- **메모리 [project_sv_pack_audit] kr-sv4a 예고가 실측 확정** — apply-kr-official 가 sv4a 시크릿에서 TR_JA2KO 미등록명을 번호 폴백으로 오매핑한 잔재. 이번에 locale 직접 재배정으로 청산. EN은 정확(영향 없음).

### §46. 트리플렛비트 — 에너지 KR 번호-zip 교차(빌드버그·신종) + AR#079 EN 오삽입 (2026-06-10, 사용자 제보)
- **① 에너지 2장 — DB는 정상, build-group 렌더가 교차(신종 카테고리)**: JP#072 ジェット=Jet / JP#073 ルミナス=Luminous. KR 공식 실데이터는 **JP역순**(이미지 판정: SV1a_072=루미너스, SV1a_073=제트). DB lcid 링크는 정확(루미너스↔#073↔EN191, 제트↔#072↔EN190)했으나, `sv-triplet-beat`만 `krMirrorAll` 미설정이라 build-group `else` 분기가 non-poke를 **번호순 bucketPair zip**으로 매칭 → KR#072(루미너스)↔JP#072(Jet) 교차 렌더.
  - **교정 = DB 무변경, build-group.ts에 `krMirrorAll: true` 추가**. kr-sv1a 103 전수 JP lcid 공유(미연결 0) 확인 후 안전 적용 → KR 매칭이 번호-zip 대신 **공유 lcid 기반**으로 전환되어 정확.
  - ⚠ **§40~45(DB lcid 오링크)와 다른 원인** — 여기는 lcid가 맞는데 빌드 매칭이 무시. SV 팩 중 triplet-beat만 krMirrorAll 누락이었음(나머지 SV는 모두 설정됨 → 동일증상 없음).
- **② AR#079 アチゲータ EN 오삽입**: AR#079(kantaro, Art Rare)는 EN 없었고, EN PAL#202 Crocalor(sv2#202, **Illustration Rare, kantaro**)가 SVAL 스타터(lc-jp-tcg-SVAL-003)에 SVI#37과 함께 2개로 붙어 있었음. build는 AR#079에 엉뚱하게 sv1#37(베이스 Uncommon)을 끌어옴.
  - **이미지 직접 판정**(KR AR#079 풀아트 = EN PAL#202 IR: 악뜨거 과일가게 풀아트·HP110·불토하기30/하이퍼보이스70 완전동일) → PAL#202를 AR#079 lcid로 재배치. 스타터는 SVI#37만 유지(정상).
- 빌드 재생성: sv-triplet-beat 103/EN100(교차)/KR103/영판0, sv-decks 정상. 3국 정합 확인.

### §47. 샤이니트레저 — 박사의 연구 2장 KR 교수 swap (동명+동일일러 최난도) (2026-06-10, 사용자 제보)
- JP Shiny Treasure ex에 博士の研究 2장(#176 オーリム博士=Sada, #177 フトゥー博士=Turo). **이름 완전동일("박사의 연구")·일러스트레이터도 둘 다 kirisAki**(ptcg.io+tcgdex 양측 확인) → 이름·일러·번호감사 **모두 무력**. 유일 구분 신호 = **카드 이미지의 교수 부제**(オーリム/フトゥー ↔ 올림박사/투로박사 ↔ Sada/Turo).
- 이미지 직접 판정(JP#176=Sada 4699·JP#177=Turo 4700 / EN PAF#87=Sada·#88=Turo / KR#174=올림=Sada·#175=투로=Turo). EN은 정확, **KR이 swap**: KR#175(투로)가 JP#176(Sada)에, KR#174(올림)가 JP#177(Turo)에 교차.
- 교정: KR locale 2장 logicalCardId 스왑(#174→lc-176 Sada·#175→lc-177 Turo). nameKo는 양쪽 동일("박사의 연구")이라 무변경 — **이 케이스는 nameKo로도 구분 불가, 오직 KR 번호↔이미지 페어링이 정답**. 빌드 360/237/360/4 유지(§45 무회귀).
- ⚠ §45에서 같은 kr-sv4a博士↔테사는 잡았으나 **博士 2장 내부 Sada/Turo 스왑은 미적발**(이름+일러 동일이라 §45 이름대조도 못 가름) → 이번에 이미지로만 적발. **동명+동일일러+nameKo동일 3중 함정 = 캠페인 최난도, 이미지가 유일 권위.**

### §48. 스칼렛/바이올렛ex — KR 카드 이미지 R2 백필 누락 4장 (이미지 깨짐) (2026-06-10, 사용자 제보)
- 제보: 클레스퍼트라(스칼렛)·빠르모트×2·모토마(바이올렛) KR 이미지 깨짐. **정체성 문제 아님** — KR 이미지(pokemonkorea 원본을 R2 미러)의 **R2 객체가 부재(404)**한 케이스.
- 진단: kr-sv1s#037·kr-sv1v#036/#068/#085 의 imageSmall·imageLarge(R2 URL) 모두 404, 원본(pokemonkorea wmimages)은 200. 과거 R2 백필이 이 4장만 통째로 누락. **DB URL 자체는 정확**(객체만 없음).
- kr-sv1s/kr-sv1v 전수 HEAD 스캔(216행) → 진짜 깨짐 정확히 4장(부르롱#060 L=ERR은 전송 일시오류 오탐, 재시도 200). 원본에서 받아 R2 small·large 키에 업로드(small=large 동일원본, apply-kr-official 규약). 업로드 후 4장 S=200 L=200, 이미지 시각확인(클레스퍼트라 Espathra·빠르모트 Pawmot 정상).
- **DB·repo 무변경 — 수정은 R2 객체 업로드로 프로덕션 즉시 반영(빌드/배포 불필요)**. 재사용 스크립트 `scripts/backfill-kr-images-r2.ts` 신설(SETMAP 확장식, 404/NULL만 백필·ERR 제외). ⚠ "KR 이미지 깨짐" 제보 = 식별자 아닌 **R2 객체 부재** 우선 의심 — HEAD 체크로 판별.

### §49. 테라스탈 페스타ex(kr-sv8a) — 트레이너/도구 블록 전체 KR 스크램블 34장 대량 교정 (2026-06-10, 사용자 제보: 낚싯대MAX)
- 제보 1장(낚싯대MAX)을 단서로 감사하니 **트레이너/에너지 블록 전체(69장 중 34장)가 오링크**. KR이 가나다순 재정렬인데 TR_JA2KO에 이 세트 이름 **40개 미등록** → apply-kr-official 이 번호폴백으로 가나다 블록 통째 스크램블(§45와 동형, 최대규모).
- EN 다리로 확증된 예: JP#142 つりざおMAX(EN Max Rod)←KR 유리나팔(=Glass Trumpet) / JP#140 ガラスのラッパ(EN Glass Trumpet)←KR 밤의 들것 / JP#147 なかよしポフィン(Buddy Poffin)←KR 대지의 그릇 등.
- **수정 = 손번역 배제, 기계적 전단사 재매핑**: TR_JA2KO + sv8a 보강 35개(EN 다리·이미지 검증)로 이름→정체성 사전 완성 → 이름그룹 번호순 zip(중복명 ネリネ×3·シュウメイ×2·メロコ×2·パルデアの仲間たち×2 SAR 포함 정확 처리). 전단사 JP 69/69·KR 69/69, issues 0. EN無 불확실쌍 2개(#178 マツバ=유빈·#163 アカマツ=하솔)는 **이미지 직접 판정**(동일 일러·효과)으로 확증.
- 근본수정: **trainer-names-jako.ts에 35개 영구 등록**(재발 방지) + KR locale 34장 logicalCardId 재배정 + nameKo=KR명. 빌드 237/136/237/5(KR 전수매칭). 멱등 재검증 0 변경.
- ⚠ **'KR 이름 1장 이상' 제보 + krMirrorAll 세트 = 블록 전체 스크램블 가능성** → 단건 보지 말고 EN 다리로 트레이너 블록 전수 전단사 감사. 사전 미등록이 스크램블의 근본원인.

### §50. 다중 팩 트레이너/아이템 일괄 KR 스크램블 감사·교정 43장 (2026-06-10, 사용자 제보 + 전수 감사)
- 제보: 배틀파트너즈(대체티켓·좋은상처약)·로켓단영광(깜짝봄·슈퍼볼·방해로봇)·메가심포니아(活力の森)·메가브레이브(벌레회피·아이언디펜드). §49 방법(jako 사전 전단사)을 9개 krMirrorAll 팩에 일괄 적용.
- **사전(TR_JA2KO) 미등록이 스크램블 근본원인** 재확인 → 74개 보강(EN 다리·이미지 검증). 보강 후 재감사로 오링크 전수 적발·교정:
  - **SVN 배틀파트너즈(덱박스) 2**: TM 에볼루션/데볼루션 swap.
  - **SV9 배틀파트너즈(본탄, jp-sv-journey-together) 2**: いいきずぐすり(Super Potion)↔とりかえチケット(Redeemable Ticket) — KR "대체 티켓/좋은상처약" 스왑(제보). ⚠ 동명 세트 2개(SVN 덱박스 vs SV9 본탄) 주의 — 제보는 SV9.
  - **로켓단영광(sv10) 3**: おじゃまロボ/スーパーボール/びっくりボム 3종 어긋남(제보).
  - **메가심포니아(m1s) 2**: 活力の森↔ミステリーガーデン.
  - **메가브레이브(m1l) 5**: アイアンディフェンダー·パワープロテイン·ファイトゴング·むしよけスプレー·夜のタンカ.
  - **닌자스피너(m4) 2**: 大漁ネット/変化の書 (KR 12⊂JP 24, zip-min).
  - **메가드림ex(m2a) 27**: Glass Trumpet·Buddy Poffin·Night Stretcher·로켓단 아이템 4·에너지 3 등 대규모.
  - 블랙볼트·화이트플레어·니힐제로: 트레이너/에너지 **정상**(0).
- 전 팩 재감사 오링크 0. 근본수정=trainer-names-jako.ts 74 영구등록 + locale 43장 재배정 + nameKo. 7개 그룹 재빌드.
- ⚠ **블랙볼트 포켓몬 EN 별건 발견**: ビクティニ JP#097(イラストレア, Amelicart 풍경)에 EN zsv10pt5#171(Rare, 5ban 빨강텍스처)이 오병합 — **일러 다름**(ptcg.io: zsv10pt5에 Amelicart Victini IR 부재, #171=5ban Rare). 블랙볼트 특수카드(IR/SAR) EN은 번호-zip 병합이라 일러단위로 드리프트(JP#097→EN#171, JP#161→EN#172 등). **특수카드 EN을 artist 기준 전수 재감사 필요(별도 과제)** — 단일 카드 미수정, 화석#080 EN은 정상.

### §51. VSTAR 유니버스(og-s12a) EN 마감 — Crown Zenith 병합 104 + artist 감사로 위양성 19 교정 (2026-06-10, 사용자 제보: "EN이 하나도 안붙어있어")
- **상태 확인**: og-s12a JP 254·KR 253·**EN 0** — config `enNative:[]`("EN 보류")이라 SWSH EN 페이즈(swsh1~9)에서 누락됐던 것. 사용자 제보 정확.
- **EN 소스**: Crown Zenith = `en-tcg-swsh12pt5`(메인 160) + `en-tcg-swsh12pt5gg`(갤러리언 갤러리 70). ⚠ 바레 `swsh12pt5`/`...gg`는 **스테일 중복**(setGroupId 없는 별도 컬렉션) — 건드리지 않음. 라이브 컨벤션은 `en-tcg-swsh*`(og-s9=swsh9 대조 확인).
- **병합**: `merge-en-identity.ts jp-tcg-S12a en-tcg-swsh12pt5`(+gg) — 메인 44·GG 70 매칭, 영판전용 116. config에 `enNative:["en-tcg-swsh12pt5","en-tcg-swsh12pt5gg"], enMerged:true` 추가 + orphan EN LC 116개 setGroupId→og-s12a 스코프 백필(전역 null 8264이라 스코프 한정).
- **핵심 교훈 — VSTAR 유니버스 ↔ Crown Zenith는 다른 컴필레이션**: 같은 포켓몬도 서로 **다른 원본 일러로 재録**. merge의 dex+레어도 매칭이 **위양성**을 냄. JP 일러 vs ptcg.io artist **독립 교차감사**(104 매칭)로 20건 불일치 검출 → 전수 해소:
  - **GG 9건 = 같은카드·잘못된JP타깃**: GG 아트레어가 rankZip로 JP 베이스(EN무경쟁)에 붙음 → **artist가 JP SAR과 완전일치**라 JP SAR로 이동(§24 동형, 무경쟁이라 중복미검출). GG48→#225자시안·GG44→#221뮤츠VSTAR·GG36→#213엔테이·GG38→#215스이쿤·GG39→#216네오랜트·GG41→#218라이코·GG49→#227드라피온·GG51→#229大剣鬼V·GG52→#230大剣鬼VSTAR·GG56→#234ゾロアークVSTAR. (먼저 발견한 中복 9건 GG48/35/43/47/54/55/37/42 + 피카츄CZ#160↔JP#205AR≠CZ#160콜라주 분리 포함, 총 GG 재배치 다수)
  - **메인 11건 = 다른 프린팅**: 같은 dex·레어도지만 일러/메커니즘 상이. 이미지 전수 판정 → **10건 EN단독 분리**(Kricketot·Absol·Zacian V[기술상이]·Leafeon V·Dusclops·Riolu·Purrloin·Liepard·Zamazenta V[기술상이]·Raihan), **Mew V CZ#060만 유지**(PLANETA Yamashita↔Igarashi = 같은일러 크레딧차이).
- **최종**: anchors 254·enMatched **104**·krMatched 253·enOnly **126**·krOnly 0. artist 재감사 불일치 1(Mew V, 의도유지)·EN중복 0.
- **출처**: ptcg.io(swsh12pt5/gg artist·subtypes·dex), R2 JP 이미지(webp→PIL), pokemontcg.io hires 이미지 육안 대조.
- **미결(별건)**: ① 빈 GG LC 70개(setGroupId=og-swsh12pt5gg 팬텀, 사이드바 미노출, cardText 60 딸림) §78급 정리 대기. ② 바레 스테일 중복세트(swsh12pt5/12/12tg 등) 정리. ③ 동패턴 보류팩 EN 미병합(og-s8b·s9a·s10a·s11·s11a·s12) — VSTAR 유니버스 방법(artist 감사 필수)으로 후속 가능.
