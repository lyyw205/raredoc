# 검증 로그 — mega-abyss-eye (アビスアイ / 어비스 아이)

검증일 2026-06-05 · 절차 `docs/verification/playbook.md` · 출처 `docs/verification/source-registry.md` §4
(이전 점검 `docs/pack-audit/mega-abyss-eye.md` 와 연속 — 이번은 독립 교차검증 + Set.code 정정)

## 결과 요약
- **팩**: `mega-abyss-eye` · era MEGA · **JP 단독** (EN=Pitch Black·KR 미발매) · 118장 · JP set code **M5**(이번 확정)
- **Phase C/D (cross-locale 그룹화·트레이너 매핑): N/A** — locale 이 JP 하나뿐이라 묶을 대상 없음(playbook: 단독발매 강제매핑 금지).

## Phase 0 — DB 스냅샷 (118 LogicalCard)
| 필드 | 커버리지 | | 필드 | 커버리지 |
|--|--|--|--|--|
| supertype | 100% | | illustrator | 69% (81/118) |
| subtypes | 100% | | pokedexNumbers | 80% (94/118, 포켓몬) |
| rarityId | 100% | | hp | 80% (94/118, 포켓몬) |
| nameKo | 100% | | attacks | 80% **but 구조불량** |
| imageSmall | 100% | | abilities | 16% |
| **types** | **0%** | | **regulationMark** | **0%** |

## Phase B — 검증 + 정정
**독립 교차검증** (DB ↔ 공식 `pc-jp` `data/jp-official/jp-abyss-eye.json`, base 81장):
- jaName **81/81 일치** · illustrator **81/81 일치** · dex **61/61 일치** · 불일치 **0**
- → DB base 데이터(Bulbapedia 로드분)가 공식과 100% 일치 = **검증됨**.

**정정 1건**: `Set.code` `null → M5` (출처: pc-jp 이미지경로 `/card_images/large/M5/`). dry-run→apply, 가드(null일 때만).

## pack_verification_score: 68 / 100
- 식별 정확성(base 81 교차검증 100%) 높음, but 필드 완전성에 큰 구멍(types 0·attacks 구조불량·abilities·regMark) → 미완.

## 남은 TODO (재수집 필요 — `pc-jp` details.php, cardID 보유)
1. `types` 0/118 — 에너지 타입 전무
2. `attacks` 구조 재파싱 — name 에 cost+기술명+효과 뭉침(94장)
3. `abilities` 16%·`regulationMark` 0% 보강
4. 시크릿레어 37장 illustrator (Bulbapedia 미수록)
5. JP `flavorText` (미발매로 부재)
6. #71·72·73·78·79 supertype 오분류(트레이너→Pokémon) 정정
7. EN(Pitch Black)·KR 발매 시 세트 추가 + 그룹화

> 위 1~3·6 은 details.php 재수집 1회로 대부분 해결 가능(별 작업 단위). 본 실행(3 turn)에서는 식별 검증 + 안전 정정(M5)까지 수행.
