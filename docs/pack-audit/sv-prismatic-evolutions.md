# 팩 점검 · 출처 기록 — テラスタルフェスex (SV8a) / Prismatic Evolutions / 테라스탈 페스타 ex

> 점검 깊이: **감사 + 안전수정 + 이슈로그**.

- **setGroup**: `sv-prismatic-evolutions` · era SV (이브이 강화 확장팩)
- **점검일**: 2026-05-31
- **특이점**: kr-sv8a 이전 세션 다중표 namu 오염(#50 디그다→오거폰 ex 정정). 전 지역 **supertype 오분류**: #93+ Pokémon ex가 Trainer로 잘못 분류(hp 보유).

---

## 1. 지역별 세트 구성 (정리 후)

| region | setId | loaded | cardCount | 비고 |
|---|---|---:|---:|---|
| JP | `jp-sv-prismatic-evolutions` | 237 | 237 ✓ | cardCount 0→237 |
| EN | `sv8pt5` | 180 | 180 ✓ | 게임데이터 부분 |
| KR | `kr-sv8a` | 231 | 231 ✓ | 테라스탈 페스타 ex. **namu 재동기화로 오염 정정**. rarity 89/231(namu 표 레어도 셀 다수 공백) |

### 삭제된 중복 세트
| setId | 사유 |
|---|---|
| `kr-sv-prismatic-evolutions` | 빈 껍데기(0/0). Set만 삭제. |

---

## 2. 이번 점검 안전수정 (2026-05-31)

| 항목 | 내용 |
|---|---|
| 🔧 kr-sv8a 오염 정정 | 「테라스탈 페스타 ex」 재동기화 231장. #2 리피아/#50 오거폰 우물의 가면 ex/#150 포켓몬 회수 사이클론(ACE) ✓ |
| JP cardCount | 0 → 237 |
| 빈 껍데기 삭제 | kr-sv-prismatic-evolutions |

---

## 3. 남은 공백 — 재수집/검증 대기

1. **supertype 오분류** [P18] — #93+ Pokémon ex가 전 지역 Trainer로 분류(hp 보유). 공유 LC 데이터 오류.
2. **KR rarity 89/231** — namu 표 레어도 셀 공백(시크릿/SAR 구간). 보강 필요.
3. **EN 게임데이터 부분** [P1].
4. **KR 누락 [1,39,51,52,129,209]**.
5. cross-cutting [P4][P5][P6].

---

## 4. 출처
| 데이터 | 출처 | 상태 |
|---|---|---|
| JP/KR 게임데이터 | TCGdex | ✅ (supertype 오류 있음) |
| EN | pokemontcg.io | ⚠ 부분 |
| **KR 한글명·레어도** | **나무위키 「테라스탈 페스타 ex」** (재동기화) | ✅ 2026-05-31 (rarity 89/231) |
