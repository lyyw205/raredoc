# 레어리티(희귀도) 체계 재정립

> 상태: **Phase 1 적용 완료** · **Phase 2 준비 완료(DB push 대기)** — 2026-06

## 1. 문제 (현황 진단, 실측)

레어도가 두 계층으로 저장된다: 원본 `Rarity`(58종) + 묶음 `RarityCategory`. 시대마다 표기·구성이 달라 그대로 필터에 노출하면 너무 많아(소드실드 30종, SV 17종) 카테고리로 임의 묶음 처리해 둔 상태였고, 그 묶음에 오류가 있었다.

- **단축↔장문 중복(출처별)**: `C`↔`Common`, `U`↔`Uncommon`, `R`↔`Rare`, `Holo Rare`↔`Rare Holo` 가 각각 별도 행. PCG/NEO/BASE 는 한 시대 안에서도 둘 다 등장.
- **동의어 중복**: `Art Rare`(JP)↔`Illustration Rare`(EN) = AR, `Special Art Rare`↔`Special Illustration Rare` = SAR.
- **오분류**: `Rare Holo EX/GX/VMAX` → `double_rare`(❌), `Super Rare`(3343장) → `ultra_rare` 흡수(SR/UR 구분 소실), 메가 신규(`Mega Ultra Rare`) 분산.
- **인쇄본 NULL 15,234행** + `None` 1119장 → 레어도 미상 표면.
- 표시용 **약어 필드 없음**(어비스아이는 C/U/R/RR/AR/SAR/SR/MUR 로 보여야 함).

기준 세트 — MEGA **어비스아이**(`jp-mega-abyss-eye`, M5, 118장): C38·U27·R8·RR8·AR12·SAR6·SR18·MUR1 (공식 사이트와 일치, 골든 검증값).

## 2. 설계 — 2축 (printed × canonical)

원본(인쇄된 레어도)은 **절대 변경하지 않고** 그룹/표시 축을 얹는다.

```
Rarity.code (원본, 보존)
  ├─ canonicalCode : 시대무관 정규 그룹 키 (C↔Common, AR↔IllustrationRare … 통합)
  ├─ abbr          : 공식 JP식 표시 약어 (C/U/R/RR/AR/SAR/SR/UR/HR/MUR …)
  └─ category(RarityCategory) : 전역 필터 칩 (작게, ~12)
```

- **전역 `/dex` 필터** = RarityCategory(칩, 거칠게).
- **세트 상세 구성표** = canonicalCode/abbr(세밀) → 어비스아이가 C/U/R/RR/AR/SAR/SR/MUR 그대로 표시.

## 3. 사용자 결정 (2026-06-14)

1. **Phase 1 먼저** → 이후 Phase 2.  2. **SR 독립 칩**.  3. **AR·SAR 분리**.  4. 약어 **공식 JP식**.

## 4. Phase 1 — 카테고리 정리 (완료, DB 반영됨)

단일 출처 `scripts/seed-rarity-category.ts` 정정:

- `super_rare`(슈퍼레어) 카테고리 신설(11→12). `Super Rare`/`Super Rare Holo`/`Character Super Rare` 이관.
- `Rare Holo EX/GX/V/VMAX/VSTAR/LV.X` → `double_rare`에서 `ultra_rare`로 이관.
- `Mega Ultra Rare` → `hyper_rare`(DB가 seed와 어긋나 있던 것 정합).
- 카테고리 `order`/`tier` 오름차순 재정렬.

검증: 어비스아이 카테고리 구성이 공식과 일치(SR 18 분리됨). 가역 스냅샷 `tmp/rarity-phase0-baseline.json`.

## 5. Phase 2 — canonical 약어 레이어 (준비 완료)

**prod DB(Supabase)가 Prisma Migrate 미사용 → `prisma db push` 로 적용**(`migrate dev` 금지). 신규 테이블 없이 additive 컬럼만 추가해 저위험으로 간다.

- `prisma/schema.prisma` `Rarity`: `abbr String?`, `canonicalCode String?` + `@@index([canonicalCode])` (additive·nullable).
- `scripts/seed-canonical-rarity.ts`: 24개 canonical 그룹으로 58 원본 코드에 `abbr`+`canonicalCode` 백필(멱등). 동의어/단축장문 통합. 어비스아이 골든 검증 내장.

적용 순서:
```bash
npx prisma db push      # additive 컬럼 2개 + 인덱스 (데이터 무손실)
npx tsx scripts/seed-canonical-rarity.ts
```

읽기 경로 연결(다음): `dex-region.ts buildSetCards` 가 `abbr`/`canonicalCode` 노출 → 세트 상세 구성표/필터에서 약어 사용. `pickRarityLabel`(card-fields.ts)·`rarity.ts` 보조.

## 6. 남은 결정·이관 (Phase 2 검토)

- 애매한 매핑: `Triple Rare`(실제 RRR), `Amazing/Radiant/Prism`, `Character Rare`, `Secret Rare`↔`Rare Secret` 불일치, `Mega Attack Rare`.
- NULL(15,234)·`None`(1119) → `unknown`/`미상`(개수>0일 때만 노출). 대량 백필 불필요(`rc.rarity ?? card.rarity` 폴백 유지).
- 약어 충돌(KR UI): 홀로레어/시너 표기.
- 별개 이슈: 에라 미정규화(`Scarlet & Violet`↔SV, `Sun & Moon`↔SM, POP/NP/EX/Other ~500장).

## 7. 대안 — 풀 테이블 모델 (보류)

엄격 정규화를 원하면 `CanonicalRarity`(code/abbr/nameKo/order/chipCode) + `FilterChip` 신규 테이블 도입. 코드/마이그레이션 churn 이 커 prod 환경에선 컬럼 추가(5절)를 먼저 채택. 필요 시 승격.
