# 팩 점검 · 출처 기록 — 黒炎の支配者 (SV3) / Obsidian Flames / 흑염의 지배자

> 점검 깊이: **감사 + 안전수정 + 이슈로그**.

- **setGroup**: `sv-obsidian-flames` · era SV
- **점검일**: 2026-05-31
- **특이점**: namu 「흑염의 지배자」 페이지가 **다중 표**(본세트 /108 + 서브표 /038)라 파서가 #1~38을 오염시킴 → `sync-pack-namu-ko.ts` 파서 수정(최대 분모 채택) 후 정정.

---

## 1. 지역별 세트 구성 (정리 후)

| region | setId | loaded | cardCount | 제품 | 비고 |
|---|---|---:|---:|---|---|
| JP | `jp-sv-obsidian-flames` | 141 | 141 ✓ | 黒炎の支配者 | cardCount 0→141. rarity 111/141 |
| EN | `sv3` | 230 | 230 ✓ | Obsidian Flames | 게임데이터 0(hp 8, supertype 오분류 202) |
| KR | `kr-sv3` | 136 | 136 | 흑염의 지배자(본확장) | **namu 정본화 완료** |
| KR | `kr-svf` | 46 | 46 | 배틀 강화 BOX 흑염의 지배자 | 자체번호 1–46(본세트 namu와 불일치) |

### 삭제된 중복 세트
| setId | 사유 |
|---|---|
| `kr-sv-obsidian-flames` | 빈 껍데기(0/0). Set만 삭제. |

---

## 2. 이번 점검 안전수정 (2026-05-31)

| 항목 | 내용 |
|---|---|
| KR 한글명·레어도 | kr-sv3 136장 (namu「흑염의 지배자」141행, 5-noMatch) → CardText(ko)+nameKo+rarity |
| JP cardCount | 0 → 141 |
| 빈 껍데기 삭제 | kr-sv-obsidian-flames |
| **🔧 스크립트 수정** | `sync-pack-namu-ko.ts` 다중표 오염 버그 수정(분모 최대값 행만 채택). 흑염의 지배자 #1 "찬란한 리자몽"(오염)→"뚜벅쵸"(정정) |

> **검증**: 기존 동기화 완료 팩(kr-sv10/sv1s/sv1v/sv-151/sv2p/sv2d)은 수정 파서로 재-dry-run 시 행수 불변 → 단일표, 오염 없음 확인.

---

## 3. 남은 공백 — 재수집/검증 대기

1. **kr-svf 배틀 강화 BOX** — 자체번호 1–46이라 본세트 namu와 매칭 불가. pokemoncard.co.kr 또는 별도 처리 [P9].
2. **EN `sv3` 게임데이터 0** [P1].
3. **JP rarity 111/141** [P11].
4. **KR 누락 [42,45,58,93,113]**.
5. cross-cutting [P4][P5][P6].

---

## 4. 출처
| 데이터 | 출처 | 상태 |
|---|---|---|
| JP 게임데이터 | TCGdex | ✅ (rarity 일부 결측) |
| EN | pokemontcg.io | ⚠ 게임데이터 없음 |
| **KR 한글명·레어도** | **나무위키 「흑염의 지배자」** (파서 수정 후) | ✅ 2026-05-31 |
