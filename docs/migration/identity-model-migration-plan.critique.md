All structural claims verified. I now have a critical finding the plan glosses over: **`TierEntry` already has `@@unique([logicalCardId, setId])` (line 92)**, and the plan wants to change this to `[gameCardId, setId]` (§1.8). Since multiple LogicalCards roll up into one GameCard, two TierEntries that were unique under `[logicalCardId, setId]` can collide under `[gameCardId, setId]` — a hard constraint violation at migration time, not a soft concern. Also `Rarity` is per-region in display (`nameJa/nameKo/nameEn` + `toRow` picks by region), which contradicts treating `rarityId` as clean print-level art-meta. I have enough to write the adversarial review.

---

# 적대적 검토 결과 — raredoc 4계층 이행 계획서

검증 완료: schema 955줄, build-group 1402줄, GroupCards 174 import / 206 JSON, CardLocale `@@unique` 없음, `toRow`(1083-1088) 비대칭, dual `setGroupId`(Set:23 / LogicalCard:754 / ExternalIdMapping:938) — 모두 초안 주장대로 실재. 아래는 그 위에서 발견한 **결함**이다. 번호는 심각도순(C=치명/순서·가역 붕괴, H=높음, M=중간).

---

## C1. TierEntry `@@unique([logicalCardId, setId])` → `[gameCardId, setId]` 전환은 **제약 충돌로 마이그레이션이 실패한다** (§1.8, §3.2)

실측: schema:92에 `@@unique([logicalCardId, setId])`가 **이미 존재**. GameCard는 N개 LogicalCard를 1개로 roll-up하는 게 설계 목적(P3). 그러므로 같은 `setId`에 속한 서로 다른 logicalCard 2장이 한 gameCard로 묶이는 순간, `[gameCardId, setId]` 유니크가 **충돌**한다. 이건 "before≤after" sanity(I4)로 잡히는 게 아니라 **DDL/백필 시점에 unique violation으로 트랜잭션이 깨지는** 사건이다. DeckCard `@@unique([archetypeId, logicalCardId])`(564) → `[archetypeId, gameCardId]`도 동일 — 한 덱이 같은 oracle의 두 인쇄본(예: 다른 팩 기본에너지/재판)을 row로 들고 있으면 충돌.

**수정요구 C1:** P7 재배선 PR에 **"unique 재정의 전 충돌행 사전 집계 + 합산 머지(채용률·카운트 SUM, take 합산)" 단계를 명문화**하라. `[gameCardId, setId]` 전환 직전 `GROUP BY gameCardId, setId HAVING count>1` 결과가 0이 아니면 **머지 로직(어느 행을 살리고 어느 수치를 합칠지)**을 먼저 적용. DeckCard도 동일. 이걸 "I4 게이트"가 아니라 **별도 선행 마이그레이션 스텝**으로 격리하라(읽기전환 PR 안에 숨기면 롤백 단위가 오염된다).

---

## C2. `MarketStat.cardId`는 **CardLocale.id가 아니라 LogicalCard.id를 가리킬 가능성**이 있는데, 계획은 무검증으로 "localeId FK 명시화"로 확정한다 (§1.8, §3.1, S12)

실측: `MarketStat.cardId`는 FK 없는 평문 String(729) + `@@unique([cardId, date])`(741). 초안은 이를 "CL.id 참조 → localeId로 FK 명시화"라고 §3.1·S12에서 **단정**한다. 그러나 `MarketStat`이 *시세 통계*라면 정체성 단위(LogicalCard)로 집계됐을 수도 있고, MEMORY의 price-collector 설계상 "지역판별 시세"면 CL일 수도 있다 — **둘 다 가능하고 초안은 데이터로 확인하지 않았다.** 만약 LogicalCard.id를 가리키는 상태에서 무조건 `localeId → CardLocale` FK를 걸면, P5에서 logicalCardId→printCardId로 id 의미가 승계되는 와중에 **FK가 존재하지 않는 행을 가리켜 제약 추가가 실패**한다.

**수정요구 C2:** P0에 **"MarketStat.cardId 실측 1행" 진단 스텝**을 추가하라 — `SELECT count(*) FROM MarketStat ms WHERE NOT EXISTS (SELECT 1 FROM CardLocale cl WHERE cl.id=ms.cardId)`가 0인지 먼저 확인. 0이 아니면 cardId는 LogicalCard/혼합 참조이고, FK 대상은 PC여야 한다. **이 진단 전에는 §1.8의 "localeId → CL"·S12 시점/대상을 확정으로 적지 마라**(현재 U6에서 "랭킹 roll-up" 운운하는 걸 보면 PC 집계일 개연성이 오히려 높다).

---

## C3. P4(art메타 복제)와 P5(cross-pack 병합)의 **순서가 가역성을 깬다** — "복제 후 이동"이 아니라 "이동 후엔 복제가 거짓말"이 된다 (§2 P4/P5, §1.4)

초안 핵심 안전논리: "P4는 복제라 locale 이동 0, 완전 가역". 맞다. 하지만 P5(b) cross-pack 병합에서 **여러 print-family의 locale을 한 PrintCard로 이동**시킨다. 그런데 P4에서 art메타(rarityId·subtypes)를 **각 locale에 그 부모 LogicalCard 값으로 복제**해 두었다. P5에서 서로 다른 부모를 가졌던 locale들이 한 PC 밑으로 모이면, 그 locale들의 복제된 art메타가 **서로 다를 수 있다**(특히 rarity: `toRow`가 region별로 다른 rarity 표시를 뽑는 걸 봤듯, EN "Ultra Rare" vs JP rank차). 이 자체는 "CL이 인쇄본별로 다른 rarity를 갖는다"는 설계와 정합하므로 OK다. **문제는 가역성이다.** P5 `--revert`로 병합을 되돌릴 때, locale을 원래 부모 PC로 돌려보내는 건 conservation 스냅샷으로 가능하지만, **P4에서 복제한 art메타가 "원본 LogicalCard 스칼라"와 동기화돼 있다는 보장이 P5 이후 사라진다** — P5에서 사람이 rarity 정정(§P4 수동검증 "region별 정정 필요분 플래그")을 가하면 원본 스칼라와 CL 복제본이 갈라지고, 그 시점 이후 P5 revert는 "데이터를 P4 직후 상태로" 못 돌린다.

**수정요구 C3:** (a) P4 수동검증의 "region별 rarity 정정"을 **P4 안에서 하지 마라** — P4는 순수 기계적 복제로 묶고, region별 rarity 정정은 **P5 이후 별도 스텝(P5.5)**으로 분리해 "정정 전 CL.rarity 스냅샷"을 남겨라. (b) 가역성 표(§ 가역성 요약)의 P4 "컬럼 DROP(완전 가역)"은 **"P5 이전 한정 완전 가역, P5 진입 후엔 art메타 정정분만큼 비가역"**으로 정직하게 강등 표기하라. 현재 "P1~P8 전부 가역"이라는 0.2.5/8.3의 한 줄 슬로건은 **거짓**이다.

---

## C4. P3에서 oracle 스칼라를 GameCard로 **복제**하지만, P3~P6 기간 동안 **GameCard와 LogicalCard 원본이 dual-write 없이 갈라지는 윈도우**가 무방비다 (§2 P3, P6)

P3은 "oracle 스칼라 복사만, 원본 잔류, 읽기 무중단". P6은 효과 형제회복분을 **GameCard 기준으로** 복사한다("회복 단위가 GameCard"). 즉 P6 이후 GameCard.attacks/abilities에는 **LogicalCard 원본에 없는 회복분이 들어간다.** 그런데 P7 전까지 읽기는 여전히 `LogicalCard.*`. 결과: **P6~P7 구간에 "GC는 효과를 회복했는데 화면은 여전히 빈 효과"** 라는 상태가 정상으로 존재. 이건 버그는 아니나, 이 구간에 만약 **재수집/교정 스크립트가 LogicalCard 원본을 건드리면**(커밋 로그상 "감사 N건 교정"이 일상) GC와 LC가 **양방향으로 갈라지고**, P7 읽기전환 시 어느 쪽이 권위인지 충돌한다.

**수정요구 C4:** P3~P7 구간 동안 **"oracle 스칼라 freeze" 운영 규칙**을 명문화하라 — 이 구간엔 LogicalCard의 oracle 컬럼(761,764-775) 직접 UPDATE 금지, 교정은 GameCard에만. 또는 P3에서 oracle 스칼라를 **복사가 아니라 즉시 generated/trigger 또는 애플리케이션 dual-write**로 묶어라(초안은 §6.5 Phase C에서야 dual-write를 언급 — 너무 늦다, dual-write는 **복제하는 순간(P3)부터** 필요하다). 현재 "복사만" 설계는 갈라짐 윈도우를 6주 열어둔다.

---

## C5. 형제매칭 엣지케이스 — **"JP단독 + 같은 지역 복수 인쇄본"** 조합이 `pickByImage`/conservation에서 무한 양가성을 만든다 (§5.3, §4.4)

`pickByImage`(§5.3)는 `byHash.length===1`일 때만 자동 매칭, 아니면 `null`("미연결>오연결"). 그런데 **같은 그림이 같은 지역에서 복수 팩에 재수록**되면(초안이 §1.4에서 명시적으로 허용한 "같은 지역 복수 인쇄본") `byHash.length===2+`가 정상 상태가 되어 **JP↔EN 매칭이 영구히 null로 떨어진다.** 이건 엣지가 아니라 SV 재수록·하이클래스 합본에서 **흔한 케이스**(MEMORY의 sv2·sv3 합본 재병합 이력). 동시에 §4.4 `pickRepresentative`는 representative를 고르지만, `pickByImage`는 representative를 안 쓰고 raw pool에 hash매칭하므로 **두 함수가 같은 다중성에 다른 정책**을 쓴다.

**수정요구 C5:** `pickByImage`의 `byHash.length>1` 분기를 명시하라 — 같은 PC(`printCardId` 일치)로 이미 묶인 복수 locale은 **1개의 후보로 접은 뒤(PC 단위로 collapse)** 매칭하라. 즉 매칭 입력을 "locale 리스트"가 아니라 "PC 리스트(대표 locale 동반)"로 바꿔야 한다. 안 그러면 가장 흔한 재수록 패턴이 전부 미연결로 빠져 "89% 효과회복"·"cross-pack 시세통합" KPI가 재수록 카드에서 구조적으로 실패한다.

---

## C6. `rarityId`를 "art메타로 CL 하강"으로 분류했으나, `toRow`(1085-1087)는 rarity를 **region별로 다른 표시**로 뽑는다 — 이건 art-불변이 아니라 region-가변이다 (§1.3 매핑표, §0.2 원칙1)

실측: `toRow`는 같은 `logicalCard.rarity` 객체에서 region에 따라 `nameJa`(JP)/`nameKo`(KR)/`nameEn`(EN)을 선택(1085-1087). 즉 현 구조에서도 rarity는 **"같은 그림 = 모든 지역 동일"이 아니다**(같은 rarityId라도 region별 표시가 다름). 초안 원칙1은 rarity를 "인쇄본마다 갈리는 메타 → CL 하강"으로 옳게 분류했으나, §1.3 매핑표 근거 "SR↔SAR·메커니즘 평행"은 **다른 rarityId를 갖는 케이스**만 설명하고, **같은 rarityId의 region별 표시차**(진짜 CL 하강 이유)는 누락했다. 더 중요한 함정: rarity 하강 후 `Rarity.cards LogicalCard[]`(887) → `localeCards CardLocale[]`(S13)로 바꾸면, **rarity별 카드수 집계·정렬이 LogicalCard 기준(아트 1장)에서 CardLocale 기준(인쇄본 N장)으로 폭증**한다. dex 사이드바/검색의 rarity 필터가 "아트 1장"을 세던 곳이면 카운트가 region배수로 부풀어 회귀.

**수정요구 C6:** (a) §1.3 매핑표 rarity 근거에 **"region별 표시 분기(toRow:1085-1087) + 인쇄본별 rarity 상이"** 둘 다 명기. (b) S13(`Rarity.cards` → `localeCards`) 전환 시 **rarity 집계 소비처가 PC 단위인지 CL 단위인지 전수 확인**을 P7 체크리스트에 추가. "PC당 1 rarity가 정상인데 CL N개가 같은 rarity"라면 `groupBy`에 `distinct printCardId`를 강제. (현재 §3.4에서 `cl.rarity`로 무심코 바꾸는 줄들이 카운트 폭증 위험.)

---

## C7. P9 "정리"가 **여전히 CONFIG·build-group을 P9에서 죽이지만, G0 골든이 그 build-group 산출(JSON)에 의존**한다 — 골든 기준선이 폐기대상과 운명공동체 (§4.5, §6.4, §7.3 Zone4)

§6.4 G0: "이행 전 206 JSON을 golden/dex-pre/에 동결". §7.3: build-group·JSON은 P9 폐기. 문제: **골든은 회귀 비교의 기준인데, 그 기준을 만든 파이프라인을 같은 시퀀스에서 죽인다.** P7~P9 사이에 "골든이 잘못 동결됐다(32 드리프트 오판 등)"가 발견되면 **재생성 수단(build-group)이 이미 1회용 강등/폐기 경로**라 골든을 다시 못 굽는다. 특히 §4.5의 "32개 드리프트(206 JSON − 174 import) 렌더 의도를 P7 동결 전 확정"은 **사람 판단이 필요한 작업인데**, 확정 실패 시 골든 자체가 오염된 채 동결된다.

**수정요구 C7:** (a) G0 동결을 **"JSON 파일 + build-group 소스 + 입력 DB 스냅샷" 3종 세트로 태그**해서 P9 이후에도 **재현 가능한 패키지로 아카이브**하라(단순 _archive 이동이 아니라 "이 커밋+이 DB덤프로 골든 재생성 가능" 보장). (b) 32 드리프트 확정을 **P7이 아니라 Week 0(P0와 함께)**로 앞당겨라 — 골든 동결 자체가 Week 0 항목(착수순서 4번)인데 드리프트 확정은 §4.5에서 "P7 전"으로 모호하게 밀려 있어, 골든을 드리프트 미해결 상태로 동결할 위험.

---

## H8. P0.2(스테일 트윈 삭제)가 **P2(PackCorrespondence 추출)의 입력인 CONFIG보다 먼저 파괴**된다 — 추출 왕복 동등성 검증이 깨진다 (§2 P0.2, P2)

P0.2는 bare-EN 세트·LC·CardLocale을 **삭제**(Week 0, 1번 그룹). P2는 `build-group.ts:29-1067` CONFIG를 행으로 추출하고 **"기존 CONFIG로 group-*.json 굽고 추출테이블과 deep-equal"**로 왕복 검증(§2 P2). 그런데 CONFIG는 삭제된 bare-EN 세트를 **여전히 참조**할 수 있고(트윈 45쌍이 CONFIG에 enNative/krMirror로 등장하면), P0.2가 그 세트의 데이터를 지운 뒤 CONFIG로 JSON을 구우면 **"CONFIG는 가리키는데 데이터 없음"** 상태에서 왕복 동등성이 깨진다(빈 그룹 산출 vs 추출테이블 행 존재).

**수정요구 H8:** P2 왕복 동등성 검증의 골든을 **P0.2 삭제 *전* CONFIG 산출로 동결**하거나, P0.2에서 삭제하는 45쌍이 **CONFIG에 등장하는지 먼저 grep**하고 등장분은 CONFIG에서도 동시 제거(코드+데이터 원자적)하라. 현재 순서(P0.2 삭제 → P2 추출/검증)는 "데이터는 지웠는데 CONFIG는 남은" 비대칭을 만든다. 최소한 P2 선행조건에 적힌 "P0.2"가 **"P0.2가 CONFIG 정합까지 포함"**임을 명시하라.

---

## H9. `flavorText` 거주지가 **PC와 CL에 동시 배정**되어 단일권위가 깨진다 (§1.3, §1.4, §1.7)

§1.3 PrintCard: `flavorText String?`(현 776, "EN 폴백"). §1.4 CardLocale: `flavorText String?`(현 813 "인쇄본별 플레이버" 유지). §1.7 CardText: `flavorText`(다언어). **세 곳에 flavorText.** 초안은 "PC=EN폴백, CL=인쇄본별, CardText=다언어"로 정당화하지만, 이는 **읽기 시 우선순위 사다리(CardText > CL > PC?)가 명세되지 않은 채 3중 저장**이다. 현 schema는 LogicalCard.flavorText(776)와 CardLocale.flavorText(813)가 **이미 둘 다 존재**하므로 이건 신규 문제가 아니라 **기존 이중성을 정리 안 하고 3중으로 늘리는** 퇴행이다.

**수정요구 H9:** flavorText 읽기 우선순위를 **명시적 사다리로 §3.4에 박아라**(예: CardText[lang].flavorText → CL.flavorText → PC.flavorText 폴백). 그리고 PC.flavorText를 정말 둘 거면 "EN 대표 1개"라는 invariant(PC당 1개)를 §1.3 주석에 적고, CL.flavorText와의 중복 시 어느 쪽이 권위인지 확정하라. 안 그러면 §6.1 I2(메타 무손실 체크섬)가 **어느 flavorText를 검증해야 하는지 모호**해진다.

---

## H10. `link-en-orphans-by-art.ts`를 "PC 입양 1차 도구로 승격(select만 교체)"한다는 게 **과소평가** — 이 도구는 lc-orphan+JP-less 한정인데 P5 cross-pack 병합은 비-orphan 전체가 대상 (§2 P5 보존가드, §6.6)

§6.6: `link-en-orphans-by-art.ts`를 "select만 교체"로 PC 입양 승격. 그러나 이 도구는 이름대로 **orphan(lc-orphan-*) + JP-less 한정** 동작이다(MEMORY·초안 P0.1에서 lc-orphan 출처 1819건 언급). P5(b) cross-pack 병합은 **정상 LogicalCard 전체**를 같은 GameCard 아래 이미지로 묶는 작업 — 적용 모집단이 한 자릿수 배 다르다. "select만 교체"로는 orphan 전용 휴리스틱(JP-less 가정 등)이 정상 카드에 오작동할 수 있다.

**수정요구 H10:** §6.6의 `link-en-orphans-by-art.ts` "1차 도구 승격"을 **"orphan 입양에 한정 존속, cross-pack 병합 본체는 신규 `merge-printcard-by-art.ts`로 분리"**로 정정하라. 기존 도구의 orphan 가정(JP-less)을 정상 카드에 전이하지 마라. P5 보존가드 문장의 "PC 입양 1차 도구로 승격"도 동일 수정.

---

## H11. P8(`*Ko`→CardText)의 FK 분기 — **카드명은 PC, 효과텍스트는 GC**로 갈라야 하는데 unique 두 개가 같은 행에 공존 불가 (§1.7, §2 P8)

§1.7 CardText: `@@unique([gameCardId, language])` **and** `@@unique([printCardId, language])`. §2 P8: "카드명(CardText.name, printCardId)과 종명/효과 이원화". 즉 한 CardText 행이 **gameCardId 또는 printCardId 중 하나만** 채워야 한다(U7에서 "정확히 하나"를 앱검증으로 인정). 그런데 현 `*Ko`는 한 LogicalCard에 **nameKo(표시명) + attacksKo/abilitiesKo/rulesKo(효과)가 한 묶음**으로 들어있다(780-784). 이걸 CardText로 옮기면 **표시명은 printCardId 행, 효과는 gameCardId 행으로 쪼개져 한 LogicalCard가 2개 CardText 행**을 낳는다. 초안은 이 1→2 분열을 "이원화"라 부르지만, **백필 카운트·검증("nameKo↔CardText 불일치 0")이 1:1을 가정**하면 깨진다.

**수정요구 H11:** P8 백필을 **"행 1개 이관"이 아니라 "표시축 행(printCardId, name/flavorText) + 효과축 행(gameCardId, attacks/abilities/rules) 2행 생성"**으로 명시하고, 완료판정 "불일치 0"을 **축별로(name은 printCard축, attacks는 gameCard축) 분리 측정**하라. 또 효과축은 **GameCard당 1행으로 dedup**되어야 하므로(N LogicalCard→1 GC), `migrate-nameko-to-cardtext.ts`가 **GC 단위로 attacks를 머지(형제 중 권위 1개 선택)**하는 로직이 필요 — 현 스크립트의 부분실행(11,442)은 logicalCard 단위라 GC 머지를 안 했을 것. 재작성 범위를 "완주"가 아니라 "GC축 재설계"로 키워라.

---

## H12. `getCardPrices`의 PC 묶음 전환이 **시세 폭증 → 의미 변질**을 명세하지 않음 (§3.1, §6.5)

§3.1: `getCardPrices`를 `findMany({where:{printCardId}})`로 바꿔 cross-pack Price 자동통합. §6.5 Phase B: "printCardId 묶음이 가격행 *늘면* 정상". 맞다 — 하지만 **늘어난 가격행을 어떻게 집계해 단일 시세로 보여줄지**가 없다. 같은 PC 아래 JP/EN/KR + 복수 팩 가격이 다 섞이면, 기존 "logicalCardId 1개 = 시세 1세트"였던 UI가 **region·팩 혼합 시세 다발**을 받는다. region별 분리(§3.1 "region 동반")는 적었지만 **같은 region 내 복수 팩**(재수록) 가격 처리는 누락. deck-pricing은 "최저가/대표가"를 골라야 하는데 그 선택 정책이 없다.

**수정요구 H12:** §3.1에 **시세 집계 정책**을 박아라 — `getCardPrices`/`deck-pricing` 출력이 (region, pack) 그리드인지, region별 대표 1가인지, 전체 최저가인지. `pickRepresentative`(§4.4)와 **동일한 우선순위 함수를 시세 쪽에도 재사용**하라(이미지 대표와 가격 대표가 다르면 UI 불일치). Phase B 섀도비교의 "늘면 정상"은 **"늘되 집계 후 단일 표시값은 이전과 동등 범위"**로 게이트를 강화하라.

---

## M13~M17 (중간 심각도, 묶음)

**M13 — Species 시드 11,261행 vs 카드 dex 매핑 권위 충돌 (§1.1, P1):** PokeAPI dex로 Species를 시드하지만, `pokedexNumbers[]`(760)는 **카드 저장값**이고 MEMORY의 "도감 매핑 감사"에서 SV 카드번호 오저장 1293건이 있었다. P1 조인이 그 오저장 dex를 그대로 끌어오면 잘못된 Species에 붙는다. → **P1 선행조건에 "pokedexNumbers 오저장 정합성 확인" 추가**(P0에 dex 정규화 스텝 없음 — supertype만 정규화).

**M14 — `artFingerprint` `@@unique([gameCardId, artFingerprint])`에서 NULL distinct 의존이 위험 (§1.3):** "NULL distinct → 미해시 공존" 주석은 Postgres에서 맞지만, 이는 **미해시 PC가 무제한 중복 생성 가능**을 뜻한다. P5에서 이미지 해시 실패분(작은 이미지·결측 imageLarge)이 전부 NULL이면 dedup이 **아예 안 걸린다**. → 미해시 PC는 `gameCardId + illustrator + dexKey` 폴백 유니크를 별도로 강제하거나, 미해시를 **명시적 sentinel 해시**로 채워라.

**M15 — `numberInt` 파싱이 `toRow`(1081)에 인라인인데 CL로 art메타 내릴 때 안 따라감 (§1.4):** `toRow`는 `numInt`를 `parseInt(l.number.replace(/\D/g,""))` 폴백으로 계산. CardLocale.numberInt(811)는 nullable이라 **결측 시 정렬이 깨진다**. art메타 하강 시 number는 챙겼는데 numberInt 백필 정책이 §P4에 없음. → P4 백필에 numberInt 재계산 포함.

**M16 — Conversation.sourceCardId / Message.attachedCardId 약참조를 "주석 강화"로만 둠 (§3.6, S 표 외):** 이들은 "CL.id 가정" 평문(435/451). P5에서 id 의미가 logicalCard→printCard로 바뀌는 와중에 **이것들이 CL.id인지 LogicalCard.id인지 미확인**. C2(MarketStat)와 같은 함정. → P0 진단에 이 두 컬럼 참조 대상 실측 포함.

**M17 — `enMerged`/`krMerged`/`enCrossFallback`을 "테이블 미수록(PC 정체성이 흡수)"로 처리하는데, 흡수가 **P5에서야 일어남** (§2 P2):** P2에서 이 플래그들을 버리지만, 그것들이 표현하던 병합상태는 P5 cross-pack 병합이 **완료돼야** DB에 반영된다. P2~P5 사이엔 "CONFIG는 병합을 알지만 PC는 아직 안 묶인" 공백. P2 왕복 동등성 검증이 이 플래그를 무시하면 **검증이 실제보다 느슨**. → P2 동등성 검증에서 enMerged류는 "P5 후 재검증" 디퍼드 항목으로 명시.

---

## 종합 우선순위

| 즉시 차단(이 순서 안 고치면 마이그레이션 실패) | C1(TierEntry/DeckCard unique 충돌), C2(MarketStat 참조 실측), H8(P0.2↔P2 순서) |
| 가역성 거짓말 정정 | C3(P4/P5 정정분 비가역), C4(P3~P7 갈라짐 윈도우 dual-write) |
| 형제매칭 구조결함 | C5(복수인쇄본 pickByImage null), H10(orphan도구 오전용), H11(GC축 머지) |
| 카운트/시세 의미변질 | C6(rarity 집계 폭증), H12(시세 집계정책), H9(flavorText 3중) |
| 골든·종 시드 | C7(골든↔build-group 운명공동체), M13(dex 오저장) |

**가장 위험한 단일 결함은 C1** — `[gameCardId, setId]`/`[archetypeId, gameCardId]` 유니크는 GameCard roll-up의 **존재 이유와 정면충돌**하는데 계획서 어디에도 충돌 머지 스텝이 없다. 이것 하나로 P7이 트랜잭션 레벨에서 깨진다. 그다음이 **C3의 가역성 슬로건** — "P1~P8 전부 가역"은 P5 진입 후 art메타 정정이 들어가는 순간 사실이 아니며, 이 계획서의 핵심 안전 서사 전체가 그 한 줄에 의존하므로 정직하게 강등돼야 한다.

검증에 사용한 근거(절대경로): `/home/lyyw205/repos/raredoc/prisma/schema.prisma`(TierEntry unique:92, DeckCard unique:564, MarketStat cardId:729/unique:741, CardText FK:843-857, Trade:100-113, CollectionItem:195-212, Rarity nameJa/Ko/En:866-867+880-882, ExternalIdMapping:935-952) · `/home/lyyw205/repos/raredoc/scripts/build-group.ts`(toRow region별 rarity:1083-1088, pickByImage 모티프 bucketPair:1107-1117) · `/home/lyyw205/repos/raredoc/src/lib/actions/getCardPrices.ts`(31-36) · `/home/lyyw205/repos/raredoc/src/lib/services/deck-pricing.ts`(55-122).