<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# 매핑 잠금(mapping-lock) — 정체성 매핑 변경 보호 (2026-06-26 재정의)

**옛 모델 폐기:** 특정 cardPack 의 *모든* DB 변경을 막던 "동결" 방식은 폐기. 이제 카드의 **'정체성 매핑'을 바꾸는 작업만** 잠그고, 게임 메타데이터(hp·attacks 등)는 **어느 팩이든 자유롭게 수정 가능**. **잠금 범위 = 완료·검증된 시대(MEGA·SV·SWSH·SM·XY·BW·LEGEND[L+HGSS]·Pt)의 JP팩 200개**(`PROTECTED_GROUPS`). 그 외 진행중 시대(NEO·PCG·ADV·DP·구판 등)는 **매핑도 자유**. (KR 프로모 `og-kr-*-promo` 5팩은 'JP판'이라 제외. DP/DP-SP 는 아직 미동결.)

**잠금(LOCKED) — 잠금 시대 팩의 아래 변경 시 `--allow-protected`(또는 `--allow-mapping`) 필요:**
- `RegionCard.cardId` (어떤 이미지가 어떤 논리카드/정체성에 묶이는가)
- `RegionCard.name` (카드명)
- `RegionCard.imageLarge` / `imageSmall` (이미지 — 같은 카드 더 나은/올바른 스캔 교체도 포함)
- `Card.pokedexNumbers` / `CardSpecies` (종·도감번호 연결)
- 위 매핑을 만들/지우는 RegionCard·Card·CardSpecies create/delete

**★region 범위 — 잠금은 'JP 카드의 정체성'만:** `og-*` setGroup 은 JP·EN·KR 세트가 cardPackId 를 공유한다. 따라서 **RegionCard 단위 변경(cardId/name/image)은 그 RegionCard 가 JP 일 때만 잠금**. **EN/KR RegionCard 의 이미지·이름·cardId 변경은 자유**(JP 행은 안 바뀜). 단 **공유 `Card.pokedexNumbers`/`CardSpecies` 변경은 JP 표현에도 영향 → 잠금 유지**. 가드 호출 시 바뀌는 RegionCard 의 region 을 `assertMappingWritable(packIds, { regions:[...] })` 로 넘긴다(전부 EN/KR → 통과, JP 포함·생략 → 잠금 검사).

**자유(FREE) — 가드 불필요:**
- `Card`: hp, attacks, abilities, types, weakness, resistance, retreatCost, illustrator, rarityId, subtypes, supertype, legalities, nameKo
- `RegionCard`: rarityId, legalities · `Set`.*(로고·발매일·코드·팩명·packType 등) · `Species`.*(이름)

규칙:
- 단일 출처는 `scripts/lib/protected-groups.ts`(`PROTECTED_GROUPS`=잠금 150팩). 매핑/이미지를 바꾸는 스크립트는 **영향 cardPackId 들과 함께** `assertMappingWritable(packIds, { regions:[바뀌는 RegionCard region들], allow: hasAllowProtectedFlag(), dryRun, tool, what })` 를 호출한다 — 그중 잠금 시대 JP팩이 있으면 차단(EN/KR 단독 변경은 `regions` 로 통과)(적용됨: `merge-en-identity`·`merge-logical-cards`·`bind-en-orphan`·`audit-kr-trainers`·`apply-en-metadata`[필드+시대 인지]·`fill-*-batch`·`untangle-*`·`detach-*`). 메타데이터만 바꾸는 스크립트는 가드를 호출하지 않는다(자유). `assertWritable()`(구 팩기반)은 no-op — 신규 코드는 `assertMappingWritable` 사용.
- 의도적 매핑 변경일 때만 `--allow-protected` 플래그로 통과(= 확인 체크포인트). 즉석 prisma 수정·raw SQL 로 우회하지 않는다 — 그 경우에도 먼저 확인한다.
- 시대가 추가로 완료되면(예: NEO 검증 끝) 그 era 의 JP팩을 `protected-groups.ts` 의 `PROTECTED_GROUPS` 에 더한다(재생성법은 파일 주석).
- ★예외(2026-06-23 사용자 사전승인): **`card-merge` 스킬**로 **이미지로 "같은 그림" 확정한 병합**은 매번 안 묻고 `--allow-protected` 적용해도 된다 — 게이트는 *이미지 확정*. 이 사전승인은 card-merge 한정. **그 외 이미지 미확정 매핑 변경은 건건 확인.**
