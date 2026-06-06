# 카드 검증 플레이북 (per-pack)

> 내장 `/goal` 완료조건이 참조하는 **절차 문서**. 한 실행 = 한 팩.
> ⚠️ `/goal` 평가자는 **transcript(대화)만** 읽고 도구를 실행하지 않는다 → 각 단계 결과·증거를 **반드시 대화에 출력**할 것 (마지막 §Transcript 증거).
> 연동: 출처 `docs/verification/source-registry.md` · 매핑 `docs/card-packs-jp-en-guide.md` · ERD(`LogicalCard`/`CardLocale`/`CardText`).

## Phase 0 — 입력·범위
- `TARGET_PACK` 확정. 그 팩의 모든 CardLocale/LogicalCard 로드. `card-packs-jp-en-guide.md`에서 이 팩의 JP↔EN 매핑·1:1/2→1·EN단독/JP단독 확인.
- 이 팩의 DB 스냅샷(locale별 카드수·필드 커버리지)을 떠서 대화에 출력.

## Phase A — 출처 확정·기록 → `source-registry.md`
1. locale×메타그룹별로 §3 기본배정 / §4 기존 팩에 검증된 출처가 있으면 **그대로 인용**.
2. 없거나 그 출처가 이 팩에서 해당 메타그룹을 못 주면, 신뢰도순(공식>교차>보조)으로 **다른 출처 탐색** → §2 카탈로그(필요시)+§4 이 팩 표에 기입. 메타그룹별 출처가 다르면 **그룹 단위 분리 기입**.
3. 산출물: 이 팩의 (locale × 메타그룹 → 출처 + 커버리지 + 갭) 표.

## Phase B — 개별 카드 Locale 메타 검증·정정·보완
1. 카드별 **배정 출처 값 ↔ DB 값** 대조: 불일치=정정, null=채움.
2. **교차신호 정확성 확인**: dex↔`pokeapi-names` 종이름, `illustrator` 3국 동일, number 연속성·중복, supertype/subtypes 일관성 (`verify-kr-mapping.ts` 패턴).
3. 기존 출처로 못 채우는 갭 → 다른 출처 탐색 → 채움 + 출처 기록(§4 + TODO).
4. 적용은 스크립트 경유(`load-jp-official.ts`/`apply-kr-official.ts`/`fill-jp-meta-official.ts`/`backfill-jp-rarity-kr.ts`). **출처 없는 값 생성 금지.**

## Phase C — Locale 교차 정체성 그룹화 (LogicalCard)
1. **같은 팩 내 → 매핑된 JP↔EN 팩** 순으로, 도감번호 달라도 **비-번호 속성(종이름/illustrator/supertype/subtypes/attacks/rarity tier)이 대부분 일치**하면 동일 정체성 → 1 LogicalCard.
2. 엔진 재사용: `build-group.ts <pack>` → `merge-group-dryrun.ts` → `merge-group-apply.ts`, EN은 `merge-en-identity.ts`. 포켓몬은 `pokeapi-names` + KR 번호미러 / EN 교차.
3. 단독 발매(EN/JP/KR 한정)는 묶지 말고 분리 팩에 단일 locale 유지.

## Phase D — 트레이너·아이템 매핑 (취약 지점)
1. 종 매핑표가 없으므로 지역별 트레이너/아이템 출처 탐색(KR 한국명=`pc-kr`, EN=`ptio`/`limitless`/`bulba`, JP=`pc-jp`) → `scripts/lib/trainer-names-<era>.ts` 표 확장(`trainer-names-sm.ts`·`-sv.ts` 패턴).
2. 표 기반 자동매핑(이름+illustrator+rarity tier+subtypes) 우선.
3. 어떤 출처에도 없으면: 직접 번역 또는 크롤링/Playwright. **직접(수동) 매핑은 이 실행에서 최대 3회.** 초과분은 미연결로 두고 §4 TODO 이월. 단독 발매는 대상 아님.

## Phase E — 검증·기록
- `pack_verification_score`(0~100) 산출(필요시 `verify-<pack>.ts`). `verify-kr-mapping.ts` 식 **독립 교차검증**으로 정정 결과 재확인.
- 갱신: `source-registry.md` §4(배정·갭·TODO), 검증 로그 `docs/verification/<pack>.md`, 미해결 TODO.

## Guardrails (불변)
- 추측 금지 — 확신 없으면 미연결.
- 파괴적 작업은 **dry-run 먼저**, 참조가드 통과 후 `--apply`.
- `illustrator` = 언어중립 정답키.
- **직접(수동) 매핑 ≤ 3 / 실행.**
- 모든 채움·정정은 **출처 기록 필수**. 출처 없는 값 생성 금지.
- 단독 발매 카드 강제 cross-locale 매핑 금지.

## Transcript 증거 (필수 — /goal 평가자가 읽는 유일한 것)
실행 종료 전 아래를 대화에 출력한다:
```
PACK: <id>
정정 N · 보완 N · 그룹화 N · 트레이너매핑 N · 미연결(TODO) N
source-registry §4 갱신: yes
검증 로그: docs/verification/<id>.md
pack_verification_score: <0-100>
```
- 완료 시 마지막 줄: `GOAL-DONE: <id> score=<0-100>`
- turn 한도 도달 등 중단 시: `GOAL-STOP: <id> (사유) 남은:<요약>`
