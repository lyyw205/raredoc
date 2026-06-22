---
name: en-binding-check
description: 영문판(EN) 카드팩을 하나 받아서, 그 팩의 EN 카드가 (1) 번호상 빠짐없이 수집됐는지, (2) 각 EN 카드가 JP 앵커에 묶였는지 점검하고, 안 묶인(orphan) EN 카드는 관계있는 JP/KR 카드팩을 리서치로 확정한 뒤 그 범위 안에서 매칭을 찾아 수집·합치기(필요시)까지 하는 스킬. 사용자가 EN 팩/세트를 주며 "영문판 안 묶인 카드 점검", "이 EN팩 JP/KR 연결 확인", "EN 카드 완전성 채워줘", "영문판 필터에 안 묶인 것들 봐줘", "<enSetId> 묶기" 같이 요청하면 이 스킬을 쓴다. card-check(단건 존재 조회)·pack-list-check(리스트 6필드 대조)·merge-en-identity(세트 전체 재머지)와 다르다 — 이쪽은 **EN 팩 1개의 미묶임 EN 카드만 골라, 팩관계를 먼저 확정하고, 그 범위에서만 외과적으로 붙이는** 작업이다. 활성화되면 아래 파이프라인·금지·가드를 글자 그대로 따른다.
---

# en-binding-check — EN 팩 미묶임 카드 점검 + 팩관계 기반 합치기

지금 DB 는 **JP 를 앵커로 EN/KR 을 한 `Card`(LogicalCard)에 묶는** 구조다. JP 기준 묶음은 전수 매핑 + 1회 검증이 끝나 **동결**됐다. 이 스킬은 그 동결 묶음은 손대지 않고, **EN 쪽에 아직 JP 앵커에 안 붙은 카드(orphan)** 만 골라서, 실제로 붙을 JP/KR 카드가 있는지 확인해 채운다. EN 팩 **한 개씩** 처리한다.

데이터 모델 요약: EN 카드 = `RegionCard(region="EN")` 1행 → 자기 `Card` 에 매달림. 그 `Card` 에 JP `RegionCard` 형제가 있으면 "묶임"(=동결 대상), 없으면 **orphan**(미묶임). 묶기 = orphan EN 의 `RegionCard.cardId` 를 **기존 JP Card 로 재지정(repoint)**. 떼어내기는 없다.

> **이 스킬의 존재 이유**: "안 묶인 EN 채우기"는 한 끗 잘못하면 *동결된 JP-앵커 묶음을 깨거나*(merge 통째 재실행), *관계없는 팩에서 억지로 끌어다 붙이는* 사고로 이어진다. 그래서 **팩관계 확정 → orphan만 → 외과적 repoint** 순서를 고정한다. 절차를 "개선"·"효율화"하지 말 것 — 바꿀 필요가 보이면 사용자에게 먼저 말한다.

## 동반 실행 (en-metadata-check 와 함께)

**사용자가 EN 팩 하나를 점검 요청하면 이 스킬과 `en-metadata-check`(메타데이터 완전성·정확성)를 모두 진행한다.** 둘 중 무엇으로 진입했든 양쪽 다 돈다.
- **감사(읽기 전용)는 병렬**: `audit-en-pack.ts`(묶임/번호/팩관계)와 `en-metadata-check/scripts/audit-en-metadata.ts`(메타 EMPTY/MISMATCH)를 동시에 돌려 결과를 모은다.
- **수정은 직렬·전건 확인**: 바인딩 repoint 와 메타 채움/교정은 각각 dry-run→확인→apply. 같은 동결 체크포인트(`--allow-protected`) 공유.
- **보고/로그는 합쳐서**: 묶임 결과 + 메타 완전성/정확성을 한 번에 제시하고 `docs/en-binding-log.md` 한 곳에 기록.
- 역할 분담: 이 스킬=**정체성/연결**(orphan→JP 앵커), 메타 스킬=**카드 내용**(hp·attack·rarity·이미지 등, 연결 무관하게 채움/교정).

## 확정된 설계 결정 (사용자 승인)

1. **한 EN 팩씩** 받아 처리.
2. **EN 미수집 카드(번호 갭)도 수집까지** 진행한다 — EN 완전성이 목표.
3. **JP 없이 KR 만 매칭되는 경우 → 보류 + 리포트.** EN↔KR 직접 묶기는 하지 않는다.
4. **모든 수집·합치기는 전건 확인.** 자동 적용 없음(EX→ex 같은 자동규칙 없음).

---

## 🚫 절대 금지 (HARD STOP — 어기면 중단·되돌림)

1. **기존 JP-앵커 EN/KR 묶음을 절대 해제/이동하지 않는다.** 이미 JP 형제가 있는 EN 카드는 대상이 아니다(`bind-en-orphan.ts` 가 입력으로 받으면 거부). 작업은 "orphan EN → JP Card 붙이기" **한 방향**뿐.
2. **`merge-en-identity.ts` 를 이 목적에 통째로 재실행하지 않는다.** 그건 EN 세트 *전체*를 버킷 재매칭해서 이미 붙은 카드의 배정까지 바꿀 수 있다 = 동결 훼손 위험. 미묶임 카드만 `bind-en-orphan.ts` 로 개별 처리한다.
3. **관계없는 팩에서 억지로 끌어오지 않는다.** 붙이기 전에 "이 EN 팩과 관계있는 JP/KR 팩"을 먼저 확정하고(`references/pack-relationship.md` §A), **그 소스 팩 범위 안에서만** 매칭한다. 발매일이 동떨어진 무관한 팩에서 동명 카드를 끌어다 붙이는 것 = 금지.
4. **이름·번호 일치로 매칭하지 않는다.** EN/JP 는 팩명·구성·번호 체계가 다를 수 있다. 매칭은 정체성(포켓몬=dex집합+subtypes / 트레이너=EN이름+사전 / 에너지=타입)으로 한다(§B).
5. **불확실하면 유지한다.** 매칭 근거(정체성+팩관계)가 확실치 않으면 붙이지 않고 orphan 으로 둔다. 원칙은 **미연결 > 오연결**.
6. **동결팩 가드를 우회하지 않는다.** DB 변경은 `assertWritable()` 를 거친다(`bind-en-orphan.ts` 내장). 동결 영향 시 dry-run 확인 → 사용자 확인 → `--apply --allow-protected`. 즉석 prisma/SQL 금지.

---

## 파이프라인 (순서 불변)

### 0. 대상 EN 팩 확정
사용자가 준 EN 세트/팩을 감사한다(읽기 전용):
```bash
npx tsx .claude/skills/en-binding-check/scripts/audit-en-pack.ts --set <enSetId>
#   또는  --pack <cardPackId>   (그 그룹의 EN 세트들)
```
출력에서 `enSet`(팩명·코드·cardCount·발매일)을 사용자에게 한 줄로 확인하고 시작한다.

### 1. 팩 관계 확정 (orphan 매칭보다 먼저 — 핵심)
`audit` 의 `packRelationship` 을 읽고 **`references/pack-relationship.md` §A** 절차로 이 EN 팩의 **소스 JP/KR 팩(들)** 을 확정한다.
- `siblingSetsInSameCardPack` / `cardPackLinks` 에 이미 관계가 있으면 1차 후보.
- 없거나 불완전하면 발매일 근접성 + 세트 대응 출처로 리서치(§A2). EN 오리지널 컴필레이션(Generations/Celebrations/...)은 **부분 대응**이라는 점에 주의 — EN 단독 서브셋은 붙일 곳이 없는 게 정상.
- 확정 결과("소스 팩 = JP `<setId>` …")를 적는다. 이게 매칭 허용 범위다. **관계 확정 전에는 §3 으로 넘어가지 않는다.**

### 2. EN 번호 완전성 보강 (수집)
`audit` 의 `numberCompleteness.missing`(1..cardCount 중 빠진 번호) = EN 미수집 의심. 결정 #2 대로 **수집 대상**이다.
- `references/pack-relationship.md` §D3 으로 해당 EN 카드를 수집한다(`card-collector` 에이전트 / pokemontcg.io·tcgdex). 수집도 사용자 확인 후(결정 #4).
- 수집했으면 `audit` 를 다시 돌려 갭이 줄었는지 확인하고, 새로 들어온 EN 카드도 §3 orphan 목록에 포함.
- `extrasAboveCount`(시크릿 초과번호)·`nonNumeric`(TG/GG/프로모)·`duplicates`(평행팩)는 정상일 수 있으니 갭으로 오인하지 않는다.

### 3. orphan 매칭 리서치 (소스 팩 범위 안에서만)
`audit` 의 `orphans`(JP·KR 둘 다 없는 EN 카드) 각각에 대해, **§1 에서 확정한 소스 팩 범위 안에서** 매칭 JP(또는 KR) 카드를 찾는다. 절차·정체성 기준·실존 확인은 `references/pack-relationship.md` §B.
- `bucketKey`(dex|subtypes)로 소스 JP 세트에서 같은 정체성 카드를 찾는다(`card-check/scripts/search-card.ts --dex`·`--set` 재사용 가능).
- 애매하면 공식 사이트·이미지로 확정(§C, card-check reference 재사용).
- 판정: **JP 매칭 확정 → §4 bind 후보** / **KR 만 매칭 → 보류+리포트(결정 #3)** / **범위 내 매칭 없음 또는 불확실 → orphan 유지.**
- `krOnly` 목록(KR 형제만 있는 EN)도 보고에 함께 싣는다(붙이지 않음).

### 4. 합치기 (전건 확인 · dry-run → 확인 → apply)
매칭 확정된 JP 카드에 대해서만:
- **DB 에 JP 카드 있음** → `bind-en-orphan.ts` 로 repoint.
- **DB 에 JP 카드 없음** → 먼저 수집(§D2) 후 bind.

DB 변경 직전 로케일 보존 스냅샷, 직후 비교(필수):
```bash
npx tsx .claude/skills/card-check/scripts/check-locale-conservation.ts --save
# 매칭 1건씩(또는 검증된 묶음) — 먼저 dry-run 으로 보여주고 사용자 확인:
npx tsx .claude/skills/en-binding-check/scripts/bind-en-orphan.ts --en <enRegionCardId> --to <targetJpCardId>
# 확인되면 적용(동결 영향 시 --allow-protected):
npx tsx .claude/skills/en-binding-check/scripts/bind-en-orphan.ts --en <enRegionCardId> --to <targetJpCardId> --apply
npx tsx .claude/skills/card-check/scripts/check-locale-conservation.ts --compare --target <작업 cardPackId>
```
- 여러 건은 `--pairs "<enId>=<lcid>,<enId>=<lcid>"` 로 묶어도 되지만, **각 매칭은 사용자에게 근거 제시 후 확인**받는다(결정 #4).
- `bind-en-orphan.ts` 의 자동 거부(EN 이미 JP 보유 / 타깃 JP 없음 / 타깃 EN 이미 보유)는 매칭이 틀렸다는 신호 — 무시하고 우회하지 말고 매칭을 재검토한다.

### 5. 재검증
- `audit-en-pack.ts` 를 다시 돌려 `bindingCounts.orphan` 이 의도대로 줄고, `bound` 가 늘었는지 확인.
- 보존 검사 `--compare` 에서 작업 대상 외 그룹 손실 0 확인.
- bind 한 EN 카드를 `search-card.ts` 로 재조회해 어느 JP 와 연결됐는지 최종 확인(스크립트 출력만 믿지 않는다).

### 6. 로그 + 보고
- 작업 내역을 `docs/` 에 한 줄 누적 기록(EN 팩 / 확정 소스 팩 / 수집 N / bind N / 보류(krOnly) N / 잔여 orphan N).
- 사용자에게 한국어로: 확정한 팩 관계, 번호 갭 수집 결과, bind 한 매칭(근거 포함), 보류한 KR-only, 잔여 orphan(붙일 곳 없음 사유), 보존 검사 결과. 코드·세트명 원문 유지.

#### 6-1. 결과·보류를 사용자가 알아듣게 설명한다 (필수)

보고의 핵심은 숫자가 아니라 **"이게 정상인지, 내가 신경 쓸 게 남았는지"** 를 사용자가 바로 알게 하는 것이다. `orphan`·`보류` 같은 단어는 *실패처럼 보이지만 대부분 정상*이다 — 반드시 아래 5분류로 갈라서, 각 카드가 **왜** 거기 들어갔는지 한 줄로 풀어 쓴다.

**① 묶음 완료 (bound)** — orphan EN 카드를 JP 앵커에 붙였다. = 이제 이 EN 카드가 일·한판과 *같은 카드*로 인식돼 도감·시세가 합쳐진다. 카드마다 근거를 한 줄로: `EN #116 Gardevoir-EX → JP XY11a#059 (사나이트EX UR 풀아트, 일러스트 일치 확인)`.

**② 보류 — 한국판만 있음 (krOnly)** — 붙일 JP 앵커가 없고 KR 형제만 있어서 *일부러 안 붙였다*(결정 #3, EN↔KR 직접 묶기 금지). → "지금은 못 붙임, 나중에 해당 JP 가 수집되면 그때 연결" 이라고 명시. 사용자가 할 일: 없음(추적만).

**③ 잔여 orphan — 붙일 곳 없음.** 이건 셋으로 더 갈라야 한다(뭉뚱그리면 사용자가 "왜 안 붙였냐"고 오해한다):
  - **(a) EN 단독이 정상** — Trainer/Galarian Gallery, EN 전용 프로모, EN 컴필레이션 단독 서브셋 등 *원래 JP/KR 대응이 없는* 카드. → "영구적으로 안 붙는 게 맞음" 이라고 못박는다. 사용자가 할 일: 없음.
  - **(b) EN 재판 / 다른 소스 의심** — 이 팩의 *확정 소스 범위*엔 없지만 본체가 다른 JP 세트에 있을 수 있는 카드. → "지금 팩 범위 밖이라 보류, 그 세트 처리할 때 연결" 이라고 적고 의심 세트를 같이 쓴다. 사용자가 할 일: 없음(후속 팩에서 해결).
  - **(c) 불확실 — 미연결로 둠** — 후보 JP 는 있으나 이미지/정체성 확증을 못 해 안 붙인 카드(미연결 > 오연결). → 무엇이 애매했는지(일러스트 미확인 등) 한 줄. 사용자가 할 일: 판단 도와줄 수 있으면 도움.

**④ 수집 (번호 갭)** — 빠져 있던 EN 카드를 새로 채운 수. 연결과 별개.

**⑤ 메타데이터** — 연결과 무관하게 채운 빈값 N · 교정한 값 N(en-metadata-check 몫). "카드 *내용*(hp·일러·레어도·이미지)을 채운 것이지 *연결*과는 별개" 라고 구분해 준다.

보고 한 줄 요약은 이 틀로: **`bound A→B (+N) · 보류 K(krOnly) · 잔여 orphan M (정상 X / 의심 Y / 불확실 Z) · 수집 C · 메타 빈값 P+교정 Q`**. 그리고 끝에 **"사용자가 더 볼 게 있는 항목"**(③c 불확실, 의심 세트 후속) 만 따로 모아 "남은 일" 로 적는다 — ①②③a③b④⑤ 는 "정상/완료" 로 묶어 안심시킨다.

---

## 유의사항 (반복 함정)

- **orphan LC 흔적**: merge 가 못 붙인 EN 은 `Card.id = lc-orphan-<enSet>-<번호>` 로 자체 LC 를 갖는다(`audit` 의 `isOrphanLc`). bind 로 비면 `bind-en-orphan.ts` 가 정리(삭제)한다.
- **EN 오리지널 서브셋은 orphan 이 정상.** Trainer/Galarian Gallery, EN 단독 프로모, 미발매분 등은 붙일 JP/KR 가 없다 — 억지로 채우지 말고 "EN 단독"으로 보고.
- **번호 갭 ≠ 항상 미수집.** 비수치 번호(TG/GG)·평행팩 중복·시크릿 초과는 `audit` 가 분리해 준다. `missing`(1..cardCount 결손)만 수집 대상.
- **타깃은 반드시 JP 앵커.** KR 만 있는 카드로는 붙이지 않는다(결정 #3, 스크립트가 거부).
- **보존 검사는 비대칭 손실을 잡는다.** EN 로케일은 unique 제약이 없어 한 곳에 붙이면 다른 곳에서 빠질 수 있다 — 그래서 전후 비교가 필수.
- 스크립트 실행은 **레포 루트에서**(dotenv 가 루트 `.env` 로드).

## 자산
- `scripts/audit-en-pack.ts` — 감사 엔진(번호완전성·묶임상태·팩관계). 읽기 전용. **재작성 금지, 그대로 사용.**
- `scripts/bind-en-orphan.ts` — 외과적 repoint(가드 내장). DB 변경 유일 경로.
- `references/pack-relationship.md` — 팩관계 확정 + 매칭 + 수집/보존 절차. 새 출처·방식은 여기만 고친다.
- 재사용: `card-check/references/research-sources.md`(실존 리서치), `card-check/scripts/{search-card,check-locale-conservation}.ts`, `scripts/lib/protected-groups.ts`(가드), `scripts/lib/trainer-names-*.ts`(트레이너 사전).
