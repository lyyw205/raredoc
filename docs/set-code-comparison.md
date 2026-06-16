# JP / KR / EN 세트코드 전수 비교표

> 상태: **전수조사 완료(2026-06-16)**. DB 미수정. 개선 기준·체크리스트는 `docs/set-code-naming-diagnosis.md`.
> 방법론: DB(Supabase `Set`/`SetGroup`) 234 setGroup 전수 조회 · **EN real = `data/limitless-setmap.json` ptcgoCode 역매핑**(실측) · **JP real = 우리 jp-id 인코딩 코드**(+ SV NULL 14팩은 알려진 공식코드) · **KR real = JP real**(번역세트 — 리서치 확정).
> KR=JP 근거: `pokemonkorea.co.kr/SV3_tournament` URL이 "SV3" 사용 + namu「한국판 시리즈 일람」이 일본판과 동일 코드 명시. namu 본문은 WebFetch 403이라 KR base/suffix 세부는 "확인필요"로 표시.

## 요약

- 총 setGroup: **234**
- **JP**: DB 코드 보유 188 · real 산출 가능 202 (SV NULL 14팩 보충: SV3~SV10·SV2a 등)
- **KR**: KR Set 존재 157 · KR real = JP real. 실질 코드 불일치(대소문자 제외, 교정대상) **≈29건**
- **EN**: EN Set 존재 143 · ptcgo real 산출 143 · DB 코드 ∅인데 real 존재(**EN 미채움**) **90건** · `si1`(Southern Islands)만 표준 ptcgo 없음

범례: `우리DB` 칸 = `jp / kr / en` 저장값. `∅`=NULL, `—`=해당 지역 Set 없음. ⚠비고는 저장값이 real과 어긋나거나 미채움일 때만.

## SV (스칼렛&바이올렛)

| setGroup | 팩명 | JP(real) | KR(real=JP) | EN(real ptcgo) | 우리DB(jp/kr/en) | ⚠비고 |
|---|---|---|---|---|---|---|
| `sv-base` | 스칼렛 ex / Scarlet & Violet | SV1S | SV1S | SVI | SV1S / SV1S / SVI |  |
| `sv-triplet-beat` | 트리플렛비트 | SV1a | SV1a | — | SV1a / SV1a / — |  |
| `sv-violet-ex` | 바이올렛 ex | SV1V | SV1V | — | SV1V / SV1V / — |  |
| `sv-paldea-evolved` | 클레이버스트 / Paldea Evolved | SV2D | SV2D | PAL | SV2D / SV2D / PAL |  |
| `sv-151` | 포켓몬 카드 151 | SV2a | SV2a | MEW | ∅ / ∅ / MEW | JP·KR 코드 미채움 |
| `sv-snow-hazard` | 스노해저드 | SV2P | SV2P | — | SV2P / SV2P / — |  |
| `sv-obsidian-flames` | 흑염의 지배자 / Obsidian Flames | SV3 | SV3 | OBF | ∅ / SV3 / OBF | JP 코드 미채움 |
| `sv-raging-surf` | 레이징서프 | SV3a | SV3a | — | ∅ / SV3a / — | JP 코드 미채움 |
| `sv-paradox-rift` | 고대의 포효 / Paradox Rift | SV4K | SV4K | PAR | SV4K / SV4K / PAR |  |
| `sv-future-flash` | 미래의 일섬 | SV4M | SV4M | — | SV4M / SV4M / — |  |
| `sv-paldean-fates` | 샤이니트레저 ex / Paldean Fates | SV4a | SV4a | PAF | ∅ / SV4a / PAF | JP 코드 미채움 |
| `sv-temporal-forces` | 와일드포스 / Temporal Forces | SV5K | SV5K | TEF | SV5K / SV5K / TEF |  |
| `sv-crimson-haze` | 크림슨헤이즈 | SV5a | SV5a | — | ∅ / SV5a / — | JP 코드 미채움 |
| `sv-cyber-judge` | 사이버저지 | SV5M | SV5M | — | SV5M / SV5M / — |  |
| `sv-twilight-masquerade` | 변환의 가면 / Twilight Masquerade | SV6 | SV6 | TWM | ∅ / SV6 / TWM | JP 코드 미채움 |
| `sv-shrouded-fable` | 나이트원더러 / Shrouded Fable | SV6a | SV6a | SFA | ∅ / SV6a / SFA | JP 코드 미채움 |
| `sv-stellar-crown` | 스텔라미라클 / Stellar Crown | SV7 | SV7 | SCR | ∅ / SV7 / SCR | JP 코드 미채움 |
| `sv-paradise-dragona` | 낙원드래고나 | SV7a | SV7a | — | ∅ / SV7a / — | JP 코드 미채움 |
| `sv-surging-sparks` | 초전브레이커 / Surging Sparks | SV8 | SV8 | SSP | ∅ / SV8 / SSP | JP 코드 미채움 |
| `sv-prismatic-evolutions` | 테라스탈 페스타 ex / Prismatic Evolutions | SV8a | SV8a | PRE | ∅ / SV8a / PRE | JP 코드 미채움 |
| `sv-journey-together` | 배틀파트너즈 / Journey Together | SV9 | SV9 | JTG | ∅ / SV9 / JTG | JP 코드 미채움 |
| `sv-heatwave-arena` | 열풍의 아레나 | SV9a | SV9a | — | ∅ / SV9a / — | JP 코드 미채움 |
| `sv-destined-rivals` | 로켓단의 영광 / Destined Rivals | SV10 | SV10 | DRI | ∅ / SV10 / DRI | JP 코드 미채움 |
| `sv-black-bolt-white-flare` | 블랙볼트 / Black Bolt | — | SV11B | BLK | ∅ / SV11B / BLK | KR단독(JP 트윈 없음) — KR 자체코드 정상 |
| `sv-white-flare` | 화이트플레어 / White Flare | — | SV11W | WHT | ∅ / SV11W / WHT | KR단독(JP 트윈 없음) — KR 자체코드 정상 |

### SV · 특전/덱/프로모

| setGroup | 팩명 | JP(real) | KR(real=JP) | EN | 우리DB(jp/kr/en) | ⚠비고 |
|---|---|---|---|---|---|---|
| `sv-ex-start-deck` | ex 스타트 덱 | SVD | SVD | — | SVD / SVD / — |  |
| `sv-start-deck-generations` | 랜덤 스타트 덱 Generations | SVM | SVM | — | SVM / SVM / — |  |
| `sv-decks` | 배틀 마스터/스타터 덱 묶음 | SVAL,SVAM,SVAW,SVC,SVEL,SVEM,SVG,SVHK,SVHM,SVI,SVJL,SVJP,SVLN,SVLS,SVOD,SVOM | =JP | — | JP 16종 / KR 14종(`SVA` 합성·SVAL/SVAM/SVAW 누락) / — | 확인필요 |
| `sv-goods` | 배틀강화BOX/ex스페셜세트/트레이너박스 | SVB,SVF,SVK,SVN,SVP1 | =JP | — | JP 5종 / KR 6종(`SVP2` 추가) | KR 전용 SVP2 — 확인필요 |
| `og-kr-sv-promo` | SV 프로모 | — | SV-P | — | — / SV-P / — | KR단독 — 정상 |

## MEGA (메가진화)

| setGroup | 팩명 | JP(real) | KR(real=JP) | EN(real ptcgo) | 우리DB(jp/kr/en) | ⚠비고 |
|---|---|---|---|---|---|---|
| `mega-brave-symphonia` | 메가브레이브 / Mega Evolution | M1L | M1L | MEG | M1L / M1L / `me1` | EN DB가 id(`me1`) 저장 → ptcgo `MEG`로 교정 권장 |
| `mega-symphonia` | 메가심포니아 | M1S | M1S | — | M1S / M1S / — |  |
| `mega-infernox` | 인페르노X / Phantasmal Flames | M2 | M2 | PFL | M2 / M2 / `me2` | EN DB가 id(`me2`) 저장 → ptcgo `PFL`로 교정 권장 |
| `mega-dream-ex` | MEGA 드림 ex / Ascended Heroes | M2a | M2a | ASC | M2a / M2a / `me2pt5` | EN DB가 id 저장 → ptcgo `ASC`로 교정 권장 |
| `mega-munikisuzero` | 니힐제로 / Perfect Order | M3 | M3 | POR | M3 / M3 / `me3` | EN DB가 id 저장 → ptcgo `POR`로 교정 권장 |
| `mega-ninja-spinner` | 닌자스피너 / Chaos Rising | M4 | M4 | CRI | M4 / M4 / ∅ | EN 미채움 — real `CRI` 존재 |
| `mega-abyss-eye` | 아비스아이 | M5 | — | — | M5 / — / — |  |

### MEGA · 특전/덱/프로모

| setGroup | 팩명 | JP | KR | EN | 우리DB(jp/kr/en) | ⚠비고 |
|---|---|---|---|---|---|---|
| `mega-start-deck-100` | 스타트 덱 100 배틀컬렉션(+코로차오판) | MC,MP1 | MC | — | MC,MP1 / MC / — | KR은 MP1(코로차오판) 미발매 추정 |
| `og-jp-mega-promo` | MEGA 프로모 / 메가엘레이드 ex | M-P | M-P | — | M-P / M-P / — |  |
| `mega-decks` | 스타터 세트 MEGA(디안시/팬텀) | MBD,MBG | MBD,MBG | — | =JP | |
| `mega-goods` | MEGA 프리미엄 트레이너 박스 | MA | MA | — | MA / MA / — |  |

## S (소드·실드)

| setGroup | 팩명 | JP(real) | KR(real=JP) | EN(real ptcgo) | 우리DB(jp/kr/en) | ⚠비고 |
|---|---|---|---|---|---|---|
| `og-s12a` | VSTAR 유니버스 | S12a | S12a | CRZ | S12a / S12a / ∅ | EN 미채움 |
| `og-s12` | 패러다임트리거 | S12 | S12 | SIT | S12 / S12 / ∅ | EN 미채움 |
| `og-s11` | 로스트어비스 | S11 | S11 | LOR | S11 / S11 / ∅ | EN 미채움 |
| `og-s11a` | 백열의 아르카나 | S11a | S11a | — | S11a / S11a / — |  |
| `og-s10b` | Pokémon GO | S10b | S10b | PGO | S10b / S10b / ∅ | EN 미채움 |
| `og-s10a` | 다크판타스마 | S10a | S10a | — | S10a / S10a / — |  |
| `og-s10d` | 타임게이저 | S10D | S10D | ASR | S10D / **S10** / ∅ | KR base코드 → JP `S10D`로 교정 / EN 미채움 |
| `og-s10p` | 스페이스저글러 | S10P | S10P | — | S10P / S10P / — |  |
| `og-s9a` | 배틀리전 | S9a | S9a | — | S9a / S9a / — |  |
| `og-s9` | 스타버스 | S9 | S9 | BRS | S9 / S9 / ∅ | EN 미채움 |
| `og-s8b` | VMAX 클라이맥스 | S8b | S8b | — | S8b / S8b / — |  |
| `og-s8a` | 25th ANNIVERSARY COLLECTION | S8a | S8a | CEL | S8a / S8a / ∅ | EN 미채움 |
| `og-s8a-g` | 25th GOLDEN BOX | S8a-G | S8a-G | — | S8a-G / S8a-G / — |  |
| `og-s8` | 퓨전아츠 | S8 | S8 | FST | S8 / S8 / ∅ | EN 미채움 |
| `og-s7d` | 마천퍼펙트 | S7D | S7D | — | S7D / **S7** / — | KR base코드 → JP `S7D`로 교정 |
| `og-s7r` | 창공스트림 | S7R | S7R | EVS | S7R / S7R / ∅ | EN 미채움 |
| `og-s6a` | 이브이 히어로즈 | S6a | S6a | — | S6a / S6a / — | (KR 카드명 JP가나 오염 별건 — project_kr_jpname_trainer_cross) |
| `og-s6h` | 백은의 랜스 | S6H | S6H | CRE | S6H / **S6** / ∅ | KR base코드 → JP `S6H`로 교정 / EN 미채움 |
| `og-s6k` | 칠흑의 가이스트 | S6K | S6K | — | S6K / S6K / — |  |
| `og-s5a` | 쌍벽의 파이터 | S5a | S5a | — | S5a / S5a / — |  |
| `og-s5i` | 일격마스터 | S5I | S5I | BST | S5I / **S5** / ∅ | KR base코드 → JP `S5I`로 교정 / EN 미채움 |
| `og-s5r` | 연격마스터 | S5R | S5R | — | S5R / S5R / — |  |
| `og-s4a` | 샤이니스타 V | S4a | S4a | SHF | S4a / S4a / ∅ | EN 미채움 |
| `og-s4` | 앙천의 볼트태클 | S4 | S4 | — | S4 / S4 / — |  |
| `og-s3a` | 전설의 고동 | S3a | S3a | VIV | S3a / S3a / ∅ | EN 미채움 |
| `og-s3` | 무한존 | S3 | S3 | — | S3 / S3 / — |  |
| `og-s2a` | 폭염워커 | S2a | S2a | DAA | S2a / S2a / ∅ | EN 미채움 |
| `og-s2` | 반역크래시 | S2 | S2 | RCL | S2 / S2 / ∅ | EN 미채움 |
| `og-s1a` | VMAX라이징 | S1a | S1a | — | S1a / S1a / — |  |
| `og-s1h` | 실드 | S1H | S1H | — | S1H / S1H / — |  |
| `og-s1w` | 소드 | S1W | S1W | SSH | S1W / S1W / ∅ | EN 미채움 |
| `og-swshp` | SWSH Black Star Promos | — | — | PR-SW | — / — / ∅ | EN 미채움 |
| `og-swsh35` | Champion's Path | — | — | CPA | — / — / ∅ | EN 미채움 |
| `og-swsh45sv` | Shining Fates: Shiny Vault | — | — | SHF-SV | — / — / ∅ | EN 미채움(변형셋) |
| `og-cel25c` | Celebrations: Classic Collection | — | — | CEL-CC | — / — / ∅ | EN 미채움(변형셋) |
| `og-swsh9tg` | Brilliant Stars Trainer Gallery | — | — | BRS-TG | — / — / ∅ | EN 미채움(변형셋) |
| `og-swsh10tg` | Astral Radiance Trainer Gallery | — | — | ASR-TG | — / — / ∅ | EN 미채움(변형셋) |
| `og-swsh11tg` | Lost Origin Trainer Gallery | — | — | LOR-TG | — / — / ∅ | EN 미채움(변형셋) |
| `og-swsh12tg` | Silver Tempest Trainer Gallery | — | — | SIT-TG | — / — / ∅ | EN 미채움(변형셋) |
| `og-swsh12pt5gg` | Crown Zenith Galarian Gallery | — | — | CRZ-GG | — / — / ∅ | EN 미채움(변형셋) |

### S · 특전/덱/프로모

| setGroup | 팩명 | JP(real) | KR | EN | 우리DB(jp/kr/en) | ⚠비고 |
|---|---|---|---|---|---|---|
| `swsh-start-deck-100` | 스타트 덱 100(피카츄V&이브이V) | SI,SN | SI,SN | — | =JP | |
| `swsh-decks` | VMAX/VSTAR 스타터·하이클래스 덱 묶음 | SA,SD,SEF,SEK,SGG,SGI,SH,SJ,SLD,SLL,SO,SPD,SPZ | =JP | — | JP 13종 / KR 8종(base코드 `SE`·`SG`·`SL`·`SP`) | KR base코드 → JP suffix(SEF/SEK/SGG/SGI/SLD/SLL/SPD/SPZ)로 교정 |
| `swsh-goods` | VMAX/VSTAR 스페셜 세트 묶음 | SB,SP1~SP6 | =JP | — | JP 7종 / KR 8종(`SD` 추가) | 확인필요 |
| `og-kr-swsh-promo` | 카드샵 구입 특전 S-P | — | S-P | — | — / S-P / — | KR단독 — 정상 |

## SM (썬·문)

| setGroup | 팩명 | JP(real) | KR(real=JP) | EN(real ptcgo) | 우리DB(jp/kr/en) | ⚠비고 |
|---|---|---|---|---|---|---|
| `og-sm12a` | 태그올스타즈 | SM12a | SM12a | — | SM12a / SM12a / — |  |
| `og-sm12` | 얼터제네시스 | SM12 | SM12 | CEC | SM12 / SM12 / ∅ | EN 미채움 |
| `og-sm11b` | 드림리그 | SM11b | SM11b | — | SM11b / SM11b / — |  |
| `og-sm11a` | 리믹스바우트 | SM11a | SM11a | UNM | SM11a / SM11a / ∅ | EN 미채움 |
| `og-sn11` | 미라클트윈 | SM11 | SM11 | — | SM11 / SM11 / — |  |
| `og-sm10b` | 스카이레전드 | SM10b | SM10b | — | SM10b / SM10b / — |  |
| `og-smp2` | 명탐정 피카츄 | SMP2 | SMP2 | DET | SMP2 / SMP2 / ∅ | EN 미채움 |
| `og-sn10a` | GG엔드 | SM10a | SM10a | — | `sn10a` / SM10a / — | 표기 동일·정상 |
| `og-sm10` | 더블블레이즈 | SM10 | SM10 | UNB | SM10 / SM10 / ∅ | EN 미채움 |
| `og-sm9b` | 풀메탈월 | SM9b | SM9b | — | SM9b / SM9B / — | 대소문자만 — 동일 |
| `og-sm9a` | 나이트유니슨 | SM9a | SM9a | — | SM9a / SM9A / — | 대소문자만 — 동일 |
| `og-sm9` | 태그볼트 | SM9 | SM9 | TEU | SM9 / SM9 / ∅ | EN 미채움 |
| `og-sm8a` | 다크오더 | SM8a | SM8a | — | SM8a / SM8A / — | 대소문자만 — 동일 |
| `og-sm8b` | GX 울트라샤이니 | SM8b | SM8b | HIF,SHF-SV | SM8b / SM8B / ∅ | 대소문자만 / EN 미채움(HIF 모셋+sma 샤이니볼트) |
| `og-sm8` | 버스트임팩트 | SM8 | SM8 | LOT | SM8 / SM8 / ∅ | EN 미채움 |
| `og-sm7a` | 플라스마 스파크 | SM7a | SM7a | — | SM7a / SM7A / — | 대소문자만 — 동일 |
| `og-sm7b` | 페어리라이즈 | SM7b | SM7b | — | SM7b / SM7B / — | 대소문자만 — 동일 |
| `og-sm7` | 창공의 카리스마 | SM7 | SM7 | CES | SM7 / SM7 / ∅ | EN 미채움 |
| `og-sm6b` | 챔피언로드 | SM6b | SM6b | — | SM6b / SM6B / — | 대소문자만 — 동일 |
| `og-sm6a` | 드래곤스톰 | SM6a | SM6a | DRM | SM6a / SM6A / ∅ | 대소문자만 / EN 미채움 |
| `og-sm6` | 금단의 빛 | SM6 | SM6 | FLI | SM6 / SM6 / ∅ | EN 미채움 |
| `og-sm5+` | 울트라포스 | SM5+ | SM5+ | — | SM5+ / SM5+ / — |  |
| `sm-best-of-xy` | THE BEST OF XY | SMXY | SMXY | — | SMXY / SMXY / — |  |
| `og-sm5m` | 울트라문 | SM5M | SM5M | — | SM5M / SM5M / — |  |
| `og-sm5s` | 울트라썬 | SM5S | SM5S | UPR | SM5S / SM5S / ∅ | EN 미채움 |
| `og-sm4+` | GX 배틀부스트 REMASTER | SM4+ | SM4+ | — | SM4+ / SM4+ / — |  |
| `og-sm4a` | 초차원의 침략자 | SM4A | SM4A | — | SM4A / SM4A / — |  |
| `og-sm4s` | 각성의 용사 | SM4S | SM4S | CIN | SM4S / SM4S / ∅ | EN 미채움 |
| `og-sm3+` | 빛나는 전설 | SM3+ | SM3+ | SLG | SM3+ / SM3+ / ∅ | EN 미채움 |
| `og-sm3h` | 어둠을 밝힌 무지개 | SM3H | SM3H | BUS | SM3H / SM3H / ∅ | EN 미채움 |
| `og-sm3n` | 빛을 삼킨 어둠 | SM3N | SM3N | — | SM3N / SM3N / — |  |
| `og-sm2+` | 새로운 시련 | SM2+ | SM2+ | — | SM2+ / SM2+ / — |  |
| `og-sm2k` | 알로라의 햇빛 | SM2K | SM2K | GRI | SM2K / SM2K / ∅ | EN 미채움 |
| `og-sm2l` | 알로라의 달빛 | SM2L | SM2L | — | SM2L / SM2L / — |  |
| `og-sm1+` | 강화 「썬&문」 | SM1+ | SM1+ | — | SM1+ / SM1+ / — |  |
| `og-sm1m` | 문 컬렉션 | SM1M | SM1M | — | SM1M / SM1M / — |  |
| `og-sm1s` | 썬 컬렉션 | SM1S | SM1S | SUM | SM1S / SM1S / ∅ | EN 미채움 |
| `og-sm0` | 피카츄와 새로운 친구들 | SM0 | — | — | SM0 / — / — |  |
| `og-smp` | SM Black Star Promos | — | — | PR-SM | — / — / ∅ | EN 미채움 |

### SM · 특전/덱/프로모

| setGroup | 팩명 | JP | KR | EN | 우리DB(jp/kr/en) | ⚠비고 |
|---|---|---|---|---|---|---|
| `sm-decks` | 스타터/덱대전/프리미엄트레이너 묶음 | SMA,SMC,SMD,SME,SMH,SMI,SMJ,SMK,SML,SMM,SMN | =JP | — | JP 11종 / KR 12종(`SML_`·KR전용 SM60A/SM60B·SMJ 누락) | 확인필요 |
| `og-kr-sm-promo` | SM 프로모 | — | PROMO | — | — / PROMO / — | KR단독 — 정상 |

## XY

| setGroup | 팩명 | JP(real) | KR(real=JP) | EN(real ptcgo) | 우리DB(jp/kr/en) | ⚠비고 |
|---|---|---|---|---|---|---|
| `og-cp6` | 20th BASE PACK | CP6 | CP6 | EVO | CP6 / CP6 / ∅ | EN 미채움 |
| `og-cp5` | 환상 전설 드림 컬렉션 | CP5 | CP5 | — | CP5 / CP5 / — |  |
| `og-xy11b` | 타오르는 투사 | XY11b | XY11b | — | XY11b / **XY11** / — | KR base코드(xy11a와 충돌) → `XY11b`로 교정 |
| `og-xy11a` | 냉혹한 반역자 | XY11a | XY11a | STS | XY11a / **XY11** / ∅ | KR base코드 충돌 → `XY11a`로 교정 / EN 미채움 |
| `og-cp4` | 프리미엄 챔피언팩 EX×M×BREAK | CP4 | CP4 | — | CP4 / CP4 / — |  |
| `og-xy10` | 초능력의 제왕 | XY10 | XY10 | FCO | XY10 / XY10 / ∅ | EN 미채움 |
| `og-cp3` | 포켓심쿵 컬렉션 | CP3 | CP3 | — | CP3 / CP3 / — |  |
| `og-xy9` | 천공의 분노 | XY9 | XY9 | BKP | XY9 / XY9 / ∅ | EN 미채움 |
| `og-xy8a` | 푸른 충격 | XY8a | XY8a | BKT | XY8a / **XY8** / ∅ | KR base코드(xy8b와 충돌) → `XY8a`로 교정 / EN 미채움 |
| `og-xy8b` | 붉은 섬광 | XY8b | XY8b | — | XY8b / **XY8** / — | KR base코드 충돌 → `XY8b`로 교정 |
| `og-cp2` | 레전드 컬렉션 | CP2 | CP2 | — | CP2 / CP2 / — |  |
| `og-xy7` | 밴디트링 | XY7 | XY7 | AOR | XY7 / XY7 / ∅ | EN 미채움 |
| `og-xy6` | 에메랄드 브레이크 | XY6 | XY6 | ROS | XY6 / XY6 / ∅ | EN 미채움 |
| `og-cp1` | 더블 크라이시스 | CP1 | CP1 | DCR | CP1 / CP1 / ∅ | EN 미채움 |
| `og-xy5` | 가이아 볼케이노 | XY5 | XY5 | — | XY5 / ∅ / — | KR 코드 미채움 |
| `og-xy5a` | 타이달스톰 | XY5a | XY5a | PRC | XY5a / **XY5** / ∅ | KR base코드 → `XY5a`로 교정 / EN 미채움 |
| `og-xy4` | 팬텀게이트 | XY4 | XY4 | PHF | XY4 / XY4 / ∅ | EN 미채움 |
| `og-xy3` | 라이징피스트 | XY3 | XY3 | FFI | XY3 / XY3 / ∅ | EN 미채움 |
| `og-xy2` | 와일드 블레이즈 | XY2 | XY2 | FLF | XY2 / XY2 / ∅ | EN 미채움 |
| `og-xy1a` | X컬렉션(콜렉션 X) | XY1a | XY1a | XY | XY1a / **XY1** / ∅ | KR base코드(xy1b와 충돌) → `XY1a`로 교정 / EN 미채움 |
| `og-xy1b` | Y컬렉션 | XY1b | XY1b | — | XY1b / **XY1** / — | KR base코드 충돌 → `XY1b`로 교정 |
| `og-xyp` | XY Black Star Promos | — | — | PR-XY | — / — / ∅ | EN 미채움 |
| `og-g1` | Generations | — | — | GEN | — / — / ∅ | EN 미채움 |

### XY · 특전/덱/프로모

| setGroup | 팩명 | JP | KR | EN | 우리DB(jp/kr/en) | ⚠비고 |
|---|---|---|---|---|---|---|
| `og-kr-xy-promo` | XY 프로모 | — | XY-P | — | — / XY-P / — | KR단독 — 정상 |
| `xy-decks` | BREAK 진화팩/메가배틀 덱 묶음 | RBD,UBD,XY0,XY30,XY30B,XYA~XYH | =JP | KSS | JP 13종 / KR 12종(KR전용 `FXY`·XY0/XY30B 누락) | 확인필요. EN=KSS(Kalos Starter Set, en=∅) |

## BW (블랙·화이트)

| setGroup | 팩명 | JP(real) | KR(real=JP) | EN(real ptcgo) | 우리DB(jp/kr/en) | ⚠비고 |
|---|---|---|---|---|---|---|
| `og-bwp` | BW Black Star Promos | — | — | PR-BLW | — / — / ∅ | EN 미채움 |
| `og-bw1` | 블랙 컬렉션 | BW1 | BW1 | BLW | BW1 / BW1 / ∅ | EN 미채움 |
| `og-bw1w` | 화이트 컬렉션 | BW1 | BW1 | — | BW1 / BW1 / — |  |
| `og-bw2` | 레드 컬렉션 | BW2 | BW2 | NVI | BW2 / BW2 / ∅ | EN 미채움 |
| `og-bw-ep` | Emerging Powers | — | — | EPO | — / — / ∅ | EN 미채움 |
| `og-bw3` | 사이코 드라이브 | BW3P | BW3P | NXD | BW3P / **BGR** / ∅ | KR 충돌코드 `BGR` → `BW3P`로 교정 / EN 미채움 |
| `og-bw3h` | 헤일 블리자드 | BW3H | BW3H | — | BW3H / **BGR** / — | KR 충돌코드 `BGR` → `BW3H`로 교정 |
| `og-bw4` | 다크러시 | BW4 | BW4 | DEX | BW4 / **BGR** / ∅ | KR `BGR`(6중 충돌) → `BW4`로 교정 / EN 미채움 |
| `og-dv1` | 드래곤 컬렉션 | DC | DC | DRV | DC / DC / ∅ | EN 미채움 |
| `og-bw5` | 드래곤 블라스트 | BW5B | BW5B | DRX | BW5B / **BW5** / ∅ | KR base코드(bw5d와 충돌) → `BW5B`로 교정 / EN 미채움 |
| `og-bw5d` | 드래곤 블레이드 | BW5D | BW5D | — | BW5D / **BW5** / — | KR base코드 충돌 → `BW5D`로 교정 |
| `og-bw6` | 프리즈볼트 | BW6F | BW6F | BCR | BW6F / **BW6** / ∅ | KR base코드(bw6c와 충돌) → `BW6F`로 교정 / EN 미채움 |
| `og-bw6c` | 콜드플레어 | BW6C | BW6C | — | BW6C / **BW6** / — | KR base코드 충돌 → `BW6C`로 교정 |
| `og-bw7` | 플라스마게일 | BW7 | BW7 | PLS | BW7 / BW7 / ∅ | EN 미채움 |
| `og-bw8` | 스파이럴포스 | BW8S | — | PLF | BW8S / — / ∅ | EN 미채움 |
| `og-bw8t` | 볼트너클 | BW8T | BW8T | — | BW8T / **BW8** / — | KR base코드 → `BW8T`로 교정 |
| `og-bw-shiny` | 샤이니 컬렉션 | SC | SC | — | SC / SC / — |  |
| `og-bw9` | 메갈로캐논 | BW9 | BW9 | PLB | BW9 / BW9 / ∅ | EN 미채움 |
| `og-ebb` | EX 배틀 부스트 | EBB | EBB | LTR | EBB / EBB / ∅ | EN 미채움 |

### BW · 특전/덱/프로모

| setGroup | 팩명 | JP | KR | EN | 우리DB(jp/kr/en) | ⚠비고 |
|---|---|---|---|---|---|---|
| `og-kr-bw-promo` | BW 프로모 | — | PROMO | — | — / PROMO / — | KR단독 — 정상 |
| `bw-decks` | 배틀강화/구축 덱 묶음 | BD,BG,BGB,BGR,BGW,BGZ,FS,G+K,GBD,KD,MG,PD,PSS,SBD,TD | =JP | — | JP 15종 / KR(`BG`를 BG_cobalon/terrakion/virizion 합성 3분할·GBD/SBD 누락) | 정합화 필요 |

## 구세대 (DP · Pt · LEGEND/HGSS · PCG · ADV · e카드 · 네오 · 구판) — KR 없음(JP·EN만)

| setGroup | 팩명 | JP(real) | EN(real ptcgo) | 우리DB(jp/en) | ⚠비고 |
|---|---|---|---|---|---|
| `og-pmcg1` | Base / 확장팩 제1탄 | PMCG1 | BS | PMCG1 / BS |  |
| `og-pmcg2` | Jungle / 포켓몬 정글 | PMCG2 | JU | PMCG2 / JU |  |
| `og-pmcg3` | Fossil / 화석의 비밀 | PMCG3 | FO | PMCG3 / FO |  |
| `og-pmcg4` | Team Rocket / 로켓단 | PMCG4 | TR | PMCG4 / TR |  |
| `og-pmcg5` | Gym Heroes / 리더스 스타디움 | PMCG5 | G1 | PMCG5 / G1 |  |
| `og-pmcg6` | Gym Challenge / 어둠에서의 도전 | PMCG6 | G2 | PMCG6 / G2 |  |
| `og-bs2` | Base Set 2 | — | B2 | — / B2 |  |
| `og-neo1` | Neo Genesis / 금,은 신세계로 | neo1 | N1 | neo1 / N1 |  |
| `og-neo2` | Neo Discovery / 유적을 넘어서 | neo2 | N2 | neo2 / N2 |  |
| `og-neo3` | Neo Revelation / 각성하는 전설 | neo3 | N3 | neo3 / N3 |  |
| `og-neo4` | Neo Destiny / 어둠 그리고 빛으로 | neo4 | N4 | neo4 / N4 |  |
| `og-lc1` | Legendary Collection | — | LC | — / LC |  |
| `og-si1` | Southern Islands | — | —(없음) | — / ∅ | 표준 ptcgo 없음 — ∅ 정상 |
| `og-wbsp` | Wizards Black Star Promos | — | PR | — / PR |  |
| `og-e1` | Expedition / 기본 확장팩 | E1 | EX | E1 / EX |  |
| `og-e2` | Aquapolis / 지도에 없는 마을 | E2 | AQ | E2 / AQ |  |
| `og-e3` | 바다에서의 바람 | E3 | — | E3 / — |  |
| `og-e4` | Skyridge / 갈라진 대지 | E4 | SK | E4 / SK |  |
| `og-e5` | 신비한 산 | E5 | — | E5 / — |  |
| `og-vs1` | 포켓몬카드 VS | VS1 | — | VS1 / — |  |
| `og-web1` | 포켓몬카드 web | web1 | — | web1 / — |  |
| `og-adv1` | ADV / Ruby & Sapphire | ADV1 | RS | ADV1 / RS |  |
| `og-adv2` | Sandstorm / 사막의 기적 | ADV2 | SS | ADV2 / SS |  |
| `og-adv3` | Dragon / 천공의 패자 | ADV3 | DR | ADV3 / DR |  |
| `og-adv4` | Team Magma vs Aqua | ADV4 | MA | ADV4 / MA |  |
| `og-adv5` | Hidden Legends / 풀린 봉인 | ADV5 | HL | ADV5 / HL |  |
| `og-ex6`(pcg1) | FireRed & LeafGreen / 전설의 비상 | PCG1 | RG | PCG1 / RG |  |
| `og-pcg2` | Deoxys / 창공의 격돌 | PCG2 | DX | PCG2 / DX |  |
| `og-pcg3` | Team Rocket Returns / 로켓단의 역습 | PCG3 | TRR | PCG3 / TRR |  |
| `og-pcg4` | Unseen Forces / 금빛하늘 은빛바다 | PCG4 | UF | PCG4 / UF |  |
| `og-pcg5` | Legend Maker / 환상의 숲 | PCG5 | LM | PCG5 / LM |  |
| `og-pcg6` | Delta Species / 호론의 연구탑 | PCG6 | DS | PCG6 / DS |  |
| `og-pcg7` | Holon Phantoms / 호론의 환영 | PCG7 | HP | PCG7 / HP |  |
| `og-pcg8` | Crystal Guardians / 기적의 결정 | PCG8 | CG | PCG8 / CG |  |
| `og-pcg9` | Dragon Frontiers / 끝없는 공방 | PCG9 | DF | PCG9 / DF |  |
| `og-pcg10` | Power Keepers / 월드 챔피언스 팩 | PCG10 | PK | PCG10 / PK |  |
| `og-ex9` | Emerald | — | EM | — / EM |  |
| `og-dp1` | 다이아몬드&펄 / 시공의 창조 D | DP1D | DP | DP1D / ∅ | EN 미채움 |
| `og-dp1p` | 시공의 창조 펄 | DP1P | — | DP1P / — |  |
| `og-dp2` | 신비한 보물 / 호수의 비밀 | DP2 | MT | DP2 / ∅ | EN 미채움 |
| `og-dp3` | 비밀의 경이 / 빛나는 어둠 | DP3 | SW | DP3 / ∅ | EN 미채움 |
| `og-dp4` | 월광의 추적 / 위대한 만남 | DP4M | GE | DP4M / ∅ | EN 미채움 |
| `og-dp4d` | 새벽의 질주 | DP4D | — | DP4D / — |  |
| `og-dp5` | 각성한 전설 / 비경의 외침 | DP5H | LA | DP5H / ∅ | EN 미채움 |
| `og-dp5a` | 분노의 신전 | DP5A | — | DP5A / — |  |
| `og-dpmd` | 장엄한 새벽(Majestic Dawn) | — | MD | — / ∅ | EN 미채움 |
| `og-dp6` | 파공의 격투 / 폭풍전선 | DP6 | SF | DP6 / ∅ | EN 미채움 |
| `og-dpp` | DP Black Star Promos | — | PR-DPP | — / PR-DPP |  |
| `og-pl1` | 은하의 패도 / 플래티넘 | PT1 | PL | PT1 / ∅ | EN 미채움 |
| `og-pl2` | 라이벌의 등장 / Rising Rivals | PT2 | RR | PT2 / ∅ | EN 미채움 |
| `og-pl3` | 최고의 승자 / Supreme Victors | PT3 | SV | PT3 / ∅ | EN 미채움 |
| `og-pl4` | 아르세우스 / Arceus | PT4 | AR | PT4 / ∅ | EN 미채움 |
| `og-l1a` | HGSS / 하트골드 컬렉션 | L1a | HS | L1a / ∅ | EN 미채움 |
| `og-l1b` | 소울실버 컬렉션 | L1b | — | L1b / — |  |
| `og-l2` | HS Unleashed / 되살아나는 전설 | L2 | UL | L2 / ∅ | EN 미채움 |
| `og-l3` | HS Undaunted / 정상대격돌 | L3 | UD | L3 / ∅ | EN 미채움(UL/UD 매핑 재확인) |
| `og-ll` | 로스트링크 | LL | — | LL / — |  |
| `og-hsp` | HGSS Black Star Promos | — | PR-HS | — / ∅ | EN 미채움 |
| `og-hgss2` | HS Undaunted/Unleashed | — | — | — / ∅ | EN 미채움(HGSS 변형 매핑 재확인) |
| `og-col1` | Call of Legends / 전설의 부름 | — | CL | — / ∅ | EN 미채움 |

### 구세대 · 특전/덱

| setGroup | 팩명 | JP | KR | 우리DB(jp/kr) | ⚠비고 |
|---|---|---|---|---|---|
| `og-kr-dp-promo` | DP 프로모 | — | PROMO | — / PROMO | KR단독 — 정상 |
| `dp-decks` | DP 구축덱(크레세리아/펄기아) | ST1 | ST1,ST2,ST3 | ST1 / ST1,ST2,ST3 | KR 덱 3종 분리 — 확인필요 |

## 핵심 결론

1. **KR = JP 확정.** 한국판은 일본판 코드를 그대로 쓰는 번역 세트(pokemonkorea.co.kr SV3 URL·namu 한국판 일람 동일코드). 따라서 "KR이 JP를 미러"하는 건 **오염이 아니라 정상**. KR 단독 상품(`S-P`·`SV-P`·`XY-P`·KR 덱)만 자체 코드.
2. **EN은 전부 ptcgo로 채울 수 있음** — `si1`(표준 ptcgo 없음) 1건만 예외. DB EN 코드 ∅이지만 real 존재 = **90건**(SWSH/SM/XY/BW/DP/Pt/L 본탄·갤러리·하이클래스). MEGA 4팩은 DB가 id(me1/me2/me2pt5/me3)를 EN 코드칸에 저장 → ptcgo(MEG/PFL/ASC/POR)로 교정.
3. **KR 깨진 코드(우리 오류, 교정 필요):** `BGR` 6중 충돌(og-bw3·bw3h·bw4 가 KR `BGR`) · `BW5`/`BW6`/`BW8` base붕괴 · `S5`/`S6`/`S7`/`S10`(I/H/D suffix 누락) · `XY1`/`XY5`/`XY8`/`XY11`(a/b·suffix 누락) · `bw-decks` BG 합성 3분할·GBD/SBD 누락 · 덱/굿즈 묶음 KR 세트수 불일치. ★KR이 실제 base단일 발매였는지 한국 공식(pokemonkorea/namu, 현재 fetch 차단) 재확인 권장.
4. **JP SV NULL 14팩 보충** — 흑염=SV3·레이징=SV3a·151=SV2a·샤이니트레저=SV4a·크림슨=SV5a·변환의가면=SV6·나이트원더러=SV6a·스텔라=SV7·낙원=SV7a·초전=SV8·프리즈매틱=SV8a·배틀파트너즈=SV9·열풍=SV9a·로켓단영광=SV10.
5. **동결팩 주의** — SV 18·MEGA·블랙볼트 등 EN/KR 연결 동결(AGENTS.md). 위 교정은 `code` 메타 정정(연결 무변경)이라 별개지만, 적용 시 `protected-groups.ts`/`assertWritable` 가드 확인.
