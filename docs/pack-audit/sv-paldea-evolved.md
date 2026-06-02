# 팩 점검 · 출처 기록 — スノーハザード+クレイバースト (SV2P/SV2D) / Paldea Evolved / 스노해저드+클레이버스트

> 점검 깊이: **감사 + 안전수정 + 이슈로그**.

- **setGroup**: `sv-paldea-evolved` · era SV (페어 확장팩)
- **점검일**: 2026-05-31
- **특이점**: SV2P(スノーハザード)+SV2D(クレイバースト) 동시발매 페어팩(BBWF류 정상 묶음). JP는 198 合本(SV2P 99+SV2D 99, 번호중복). EN(sv2)은 게임데이터 없음.

---

## 1. 지역별 세트 구성 (정리 후)

| region | setId | loaded | cardCount | 제품 | 비고 |
|---|---|---:|---:|---|---|
| JP | `jp-sv-paldea-evolved` | 198 | 198 ✓ | SV2P+SV2D 合本 | cardCount 0→198. rarity 142/198 |
| EN | `sv2` | 279 | 279 ✓ | Paldea Evolved | 게임데이터 0(hp 0, supertype 오분류 238) |
| KR | `kr-sv2p` | 99 | 99 | 스노해저드 | **namu 정본화 완료** |
| KR | `kr-sv2d` | 99 | 99 | 클레이버스트 | **namu 정본화 완료** |
| KR | `kr-svp2` | 12 | 12 | 프로모/스페셜 | placeholder名 "SVP2 N" |

### 삭제된 중복 세트
| setId | 사유 |
|---|---|
| `kr-sv-paldea-evolved` | 빈 껍데기(0/0). Set만 삭제. |

---

## 2. 이번 점검 안전수정 (2026-05-31)

| 항목 | 내용 |
|---|---|
| KR 한글명·레어도 | kr-sv2p 99 (namu「스노해저드」) + kr-sv2d 99 (namu「클레이버스트」), 각 0-noMatch |
| JP cardCount | 0 → 198 |
| 빈 껍데기 삭제 | kr-sv-paldea-evolved |

> namu 제목 주의: **「스노해저드」(공백 없음)** — "스노 해저드"/"스노우 해저드"는 0행.

---

## 3. 남은 공백 — 재수집/검증 대기

1. **EN `sv2` 게임데이터 0** [P1] — hp/attacks/abilities null.
2. **JP rarity 142/198** [P11] (56장 결측).
3. **kr-svp2 12장 placeholder名** [P9] — pokemoncard.co.kr 재수집.
4. cross-cutting [P4][P5][P6].

---

## 4. 출처
| 데이터 | 출처 | 상태 |
|---|---|---|
| JP 게임데이터 | TCGdex | ✅ (rarity 일부 결측) |
| EN | pokemontcg.io | ⚠ 게임데이터 없음 |
| **KR 한글명·레어도** | **나무위키 「스노해저드」/「클레이버스트」** | ✅ 2026-05-31 |
