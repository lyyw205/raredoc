# 팩 점검 · 출처 기록 — シャイニートレジャーex (SV4a) / Paldean Fates / 샤이니트레저 ex

> 점검 깊이: **감사 + 안전수정 + 이슈로그**.

- **setGroup**: `sv-paldean-fates` · era SV (하이클래스, 색違い 컬렉션)
- **점검일**: 2026-05-31
- **특이점**: **JP 세트 전무**(jp-sv-paldean-fates 0장 — JP 임포트 자체 없음). 실데이터는 EN(sv4pt5 245)·KR(kr-sv4a 344)에만. 전 지역 게임데이터 없음.

---

## 1. 지역별 세트 구성 (정리 후)

| region | setId | loaded | cardCount | 비고 |
|---|---|---:|---:|---|
| JP | `jp-sv-paldean-fates` | **0** | 0 | **JP 데이터 전무** — 빈 placeholder 유지(JP 슬롯, 임포트 대기) |
| EN | `sv4pt5` | 245 | 245 ✓ | 게임데이터 0(supertype 오분류 219) |
| KR | `kr-sv4a` | 344 | 344 ✓ | 본 KR 세트. **namu 정본화 완료**. 게임데이터 0(supertype 오분류 215) |

### 삭제된 중복 세트
| setId | 사유 |
|---|---|
| `kr-sv-paldean-fates` | 빈 껍데기(0/0, kr-sv4a와 중복). Set만 삭제. |

> ⚠ `jp-sv-paldean-fates`는 **삭제하지 않음** — 유일한 JP 슬롯이며 데이터 임포트 대기 상태.

---

## 2. 이번 점검 안전수정 (2026-05-31)

| 항목 | 내용 |
|---|---|
| KR 한글명·레어도 | kr-sv4a 344장 (namu「샤이니트레저 ex」360행, 16-noMatch). rarity 205/344 |
| 빈 껍데기 삭제 | kr-sv-paldean-fates (kr-sv4a와 중복) |

스폿체크: #1 뚜벅쵸(C) / #190 테라피 에너지(C) / #360 코라이돈 ex(UR) ✓
namu 제목: **「샤이니트레저 ex」(공백 없음)**.

---

## 3. 남은 공백 — 재수집/검증 대기

1. **JP 데이터 전무** — jp-sv-paldean-fates 0장. TCGdex SV4a 임포트 필요 [P2 심화].
2. **KR rarity 205/344** — namu 레어도코드 **S / SSR 미매핑**(샤이니/색違い). RMAP 확장 결정 필요(SSR=Super/Ultra/Secret 모호) [P14].
3. **EN·KR 게임데이터 0** [P1] (hp/attacks/abilities).
4. **KR 누락 16**: [68,70,76,77,85,138,164,249,251,255,262,305,327,334,335,347].
5. cross-cutting [P4][P5][P6].

---

## 4. 출처
| 데이터 | 출처 | 상태 |
|---|---|---|
| JP | — | ❌ 전무 |
| EN | pokemontcg.io | ⚠ rarity·image만 |
| **KR 한글명·레어도** | **나무위키 「샤이니트레저 ex」** | ✅ 2026-05-31 (rarity 205/344) |
