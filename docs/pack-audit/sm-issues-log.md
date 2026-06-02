# SM(썬·문) 시리즈 점검 — 이슈 집계 로그

> 썬·문 era(`SM (썬·문)`, ~40 setGroup)를 **최신→과거 역순**으로 순차 점검(태그올스타즈부터).
> 점검 정책(SV/SWSH 동일): **감사 + 안전 in-DB 수정(나무위키 정본화·cardCount·빈껍데기) + 이슈로그**. 대량 재수집(JP/EN 게임데이터)은 모아 나중 전담 패스.
> cross-cutting 패턴 정의는 [sv-issues-log.md](./sv-issues-log.md) 참조 (P1~P18 동일 적용). 부속상품은 이미 `sm-decks`로 분리 완료(sv-product-classification.md).
> 각 팩 상세는 `docs/pack-audit/sm-*.md`. 진행 시작: 2026-06-01.

---

## 진행 현황
| # | setGroup | 팩 | 상태 | 문서 |
|--:|---|---|---|---|
| 1 | og-sm12a | TAG TEAM GX 태그올스타즈 (하이클래스, 컴필레이션) | ✅ namu 정본화(ko 210, rarity 31) | [sm-tag-all-stars.md](./sm-tag-all-stars.md) |
| 2 | og-sm12 | 얼터제네시스 (확장팩 제12탄) | ✅ namu 정본화(ko 108, rarity 101) | [sm-alter-genesis.md](./sm-alter-genesis.md) |
| 3 | og-sn11 | 미라클트윈 (SM11) | ✅ namu 정본화(ko 105, rarity 101) | [sm-miracle-twin.md](./sm-miracle-twin.md) |
| 4 | og-smp2 | 명탐정 피카츄 (영화 스페셜팩) | ✅ namu 정본화(ko 24, rarity 24) | [sm-detective-pikachu.md](./sm-detective-pikachu.md) |
| 5 | og-sm10b | 스카이레전드 (강화확장팩) | ✅ namu 정본화(ko 62, rarity 58) | [sm-sky-legend.md](./sm-sky-legend.md) |
| 6 | og-sn10a | GG엔드 (강화확장팩 SM10a) | ✅ namu 정본화(ko 62, rarity 58) | [sm-gg-end.md](./sm-gg-end.md) |
| 7 | og-sm10 | 더블블레이즈 (확장팩) | ✅ namu 정본화(ko 107, rarity 103) | [sm-double-blaze.md](./sm-double-blaze.md) |
| 8 | og-sm9b | 풀메탈월 (강화확장팩) | ✅ namu 정본화(ko 62, rarity 58) | [sm-full-metal-wall.md](./sm-full-metal-wall.md) |
| 9 | og-sm9a | 나이트유니즌 (강화확장팩) | ⚠ namu 정본화(ko 70/103) — #71~103 namu 미수록 | [sm-night-unison.md](./sm-night-unison.md) |
| 10 | og-sm9 | 태그볼트 (확장팩) | ✅ namu 정본화(ko 109, rarity 105) | [sm-tag-bolt.md](./sm-tag-bolt.md) |
| 11 | og-sm8b | GX울트라샤이니 (하이클래스, 샤이니) | ✅ namu 정본화(ko 243, rarity 101) | [sm-ultra-shiny-gx.md](./sm-ultra-shiny-gx.md) |
| 12 | og-sm8a | 다크오더 (강화확장팩) | ⚠ namu 정본화(ko 65/97) — #66~97 정체미상 | [sm-dark-order.md](./sm-dark-order.md) |
| 13 | og-sm8 | 버스트임팩트 (확장팩 제8탄) | ✅ namu 정본화(ko 103, rarity 100) | [sm-burst-impact.md](./sm-burst-impact.md) |
| 14 | og-sm7b | 페어리라이즈 (강화확장팩) | ⚠ namu 정본화(ko 63/94) [SM-A] | [sm-fairy-rise.md](./sm-fairy-rise.md) |
| 15 | og-sm7a | **플라스마 스파크** (강화확장팩) | ✅ **해결**: namu「플라스마 스파크」(KR 공식명) ko 60/60, rarity 58. #1 쁘사이저=JP카이로스 ✓ | [sm-thunderclap-spark.md](./sm-thunderclap-spark.md) |
| 16 | og-sm7 | 창공의 카리스마 (확장팩 제7탄) | ✅ namu 정본화(ko 104, rarity 101) | [sm-charisma-of-the-sky.md](./sm-charisma-of-the-sky.md) |
| 17 | og-sm6b | 챔피언로드 (강화확장팩) | ⚠ namu 정본화(ko 86/127) [SM-A] | [sm-champion-road.md](./sm-champion-road.md) |
| 18 | og-sm6a | 드래곤스톰 (강화확장팩) | ⚠ namu 정본화(ko 72/108) [SM-A], #1 미파싱 | [sm-dragon-storm.md](./sm-dragon-storm.md) |
| 19 | og-sm6 | 금단의 빛 (확장팩 제6탄) | ✅ namu 정본화(ko 102/102, rarity 99) | [sm-forbidden-light.md](./sm-forbidden-light.md) |
| 20 | og-sm5+ | 울트라포스 (강화확장팩) | ⚠ namu 정본화(ko 63/103) [SM-A] | [sm-ultra-force.md](./sm-ultra-force.md) |
| 21 | og-sm5s | 울트라썬 (확장팩 제5탄) | ✅ namu 정본화(ko 72/72, rarity 69) | [sm-ultra-sun-moon.md](./sm-ultra-sun-moon.md) |
| 22 | og-sm5m | 울트라문 (확장팩 제5탄) | ✅ namu 정본화(ko 72/72, rarity 69) | [sm-ultra-sun-moon.md](./sm-ultra-sun-moon.md) |
| 23 | og-sm4+ | GX배틀부스트 (강화확장팩) | ✅ namu 정본화(ko 119/120, rarity 21) | [sm-gx-battle-boost.md](./sm-gx-battle-boost.md) |
| 24 | og-sm4s | 각성의 용사 (확장팩 제4탄) | ✅ namu 정본화(ko 55/55, rarity 55) | [sm-awakened-invader.md](./sm-awakened-invader.md) |
| 25 | og-sm4a | 초차원의 침략자 (확장팩 제4탄) | ✅ namu 정본화(ko 55/55, rarity 55) | [sm-awakened-invader.md](./sm-awakened-invader.md) |
| 26 | og-sm3+ | 빛나는 전설 (강화확장팩) | ✅ namu 정본화(ko 82/86, rarity 73) | [sm-shining-legends.md](./sm-shining-legends.md) |
| 27 | og-sm3h | 어둠을 밝힌 무지개 (확장팩 제3탄) | ✅ namu 정본화(ko 57/57, rarity 57) | [sm-rainbow-darkness.md](./sm-rainbow-darkness.md) |
| 28 | og-sm3n | 빛을 삼킨 어둠 (확장팩 제3탄) | ✅ namu 정본화(ko 57/57, rarity 57) | [sm-rainbow-darkness.md](./sm-rainbow-darkness.md) |
| 29 | og-sm2+ | 새로운 시련에 직면 (강화확장팩) | ⚠ namu 정본화(ko 66/109) [SM-A] | [sm-new-trial.md](./sm-new-trial.md) |
| 30 | og-sm2k | 알로라의 햇빛 (확장팩 제2탄) | ✅ namu 정본화(ko 54/54, rarity 54) | [sm-alola-sun-moon.md](./sm-alola-sun-moon.md) |
| 31 | og-sm2l | 알로라의 달빛 (확장팩 제2탄) | ✅ namu 정본화(ko 55/55, rarity 50) | [sm-alola-sun-moon.md](./sm-alola-sun-moon.md) |
| 32 | og-sm1+ | 썬&문 강화확장팩 | ⚠ namu 정본화(ko 68/111) [SM-A], JP 결손 | [sm-sun-moon-plus.md](./sm-sun-moon-plus.md) |
| 33 | og-sm1s | 썬 컬렉션 (확장팩 제1탄) | ✅ namu 정본화(ko 66/66, rarity 56) | [sm-sun-moon-collection.md](./sm-sun-moon-collection.md) |
| 34 | og-sm1m | 문 컬렉션 (확장팩 제1탄) | ✅ namu 정본화(ko 66/66, rarity 66) | [sm-sun-moon-collection.md](./sm-sun-moon-collection.md) |
| 35 | og-sm0 | 피카츄와 새로운 친구들 | ◽ JP 4장 단독, KR 없음 → namu 비대상 | [sm-promos-and-specials.md](./sm-promos-and-specials.md) |
| 36 | og-smp | SM Black Star Promos (EN전용) | ✅ 건강(ko 247 기존) | [sm-promos-and-specials.md](./sm-promos-and-specials.md) |
| 37 | og-sma | Hidden Fates(EN전용) | ✅ kr-smxy(THE BEST OF XY) **신 setGroup `sm-best-of-xy`로 분리 완료**(P8 해결, LC 186). og-sma=en-tcg-sma만 | [sm-promos-and-specials.md](./sm-promos-and-specials.md) |
| 39 | sm-best-of-xy | THE BEST OF XY (하이클래스, 신설) | ✅ namu 정본화(ko 186) · og-sma에서 분리 | [sm-promos-and-specials.md](./sm-promos-and-specials.md) |
| 38 | og-kr-sm-promo | KR SM 프로모 (258장) | ⛔ namu 부재 → ko 보류 | [sm-promos-and-specials.md](./sm-promos-and-specials.md) |

## ✅ SM 시리즈 전수 점검 완료 (2026-06-01)
- **본확장·강화확장팩 namu 정본화**: 제1~12탄 + 페어팩 전부 ko/rarity 채움(태그올스타즈·GX울트라샤이니 등 하이클래스 포함).
- **보류분 해결(2026-06-01 후속)**:
  - ✅ **og-sm7a**: "번개 스파크"가 아니라 **KR 공식명 「플라스마 스파크」**(DB Set.name 기준)였음 → namu 정본화 완료(ko 60/60). **교훈: namu 제목은 KR Set.name(공식 현지화명) 기준으로 시도할 것.**
  - ✅ **kr-smxy 오그룹[P8]**: THE BEST OF XY를 신 setGroup `sm-best-of-xy`로 분리.
  - ⛔ **잔존(pokemoncard.co.kr 필요)**: [SM-A] 강화확장팩 KR>JP 초과분(#N placeholder, 약 7팩) + og-kr-sm-promo(258장). 이 카드들은 **JP/EN 형제·도감번호·namu 모두 부재**, KR 원천(pokemoncard.co.kr) 카드 데이터가 JS/AJAX 로드라 정적 curl 불가. → **전용 pokemoncard.co.kr 스크레이퍼 필요**(README cross-cutting TODO와 동일). 별도 집중 작업 권장.
- **부속상품**(스타터/덱/박스 11종)은 이전 작업에서 `sm-decks`로 분리 완료.

## ⚠ 누적 구조/재수집 대기
- (없음 — 누적 시 기재)

## 신규/주목 학습 (SM 고유)
- 🔧 **파서 헤더인식 개선(sync-pack-namu-ko.ts, 2026-06-01)**: 구세대(SM) namu 표는 (a)컬렉션넘버에 슬래시 공백(`001 / 095`) (b)컬럼순서 상이(이름이 cells[1], 분류 셀 존재)라 기존 파서(슬래시 무공백·name=cells[2] 가정)가 **0행** 추출. → **헤더행(카드명/레어도/넘버) 읽어 컬럼 매핑 + 슬래시 공백 허용**으로 수정. SV/SWSH(태그올스타즈 포함) 회귀 없음 확인. **SM 전 팩·구세대 공통 적용.**
- **컴필레이션 rarity 불안정**: 태그올스타즈 등 하이클래스 컴필레이션은 namu 표 레어도 컬럼이 희소 → rarity 추출률 낮음(이름은 정상). 별도 보강 대상.
- **[SM-A] KR>JP 카드수 초과 패턴**: 일부 KR 강화확장팩이 JP·namu 본표보다 카드수 많음(나이트유니즌 103>70, 다크오더 97>65). namu 본표만큼만 ko 채워지고 나머지 #N은 placeholder. 정체 미상(KR 추가 시크릿/promo 흡수 or 데이터 과다) → 별도 출처 검증 대상.

## ✅ 서브제품 [P17] 언머지 (2026-06-01, 전역 패스 일부)
SM 서브제품(sm-decks) 11개가 본세트(다른 그룹) LC에 물려 본세트 한글명 오표시 → 자체 orphan LC로 분리:
kr-sma·kr-sme·kr-sm30a(SM1S계) · kr-smc·kr-smi·kr-sm60a(SM3H계) · kr-sm60b(SM4S) · kr-smk(SM7) · kr-sml_(SM9) · kr-smm(SM11a) · kr-smn(SM11b). (kr-smd는 SM제품이나 sv-decks 라벨 — SM9에서 언머지.)
효과: placeholder 정직표시, 실데이터 재수집 대기[P9]. 상세 기록: [swsh-issues-log.md](./swsh-issues-log.md) 전역 언머지 항목.
