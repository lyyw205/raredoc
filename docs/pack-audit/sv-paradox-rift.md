# 팩 점검 · 출처 기록 — 古代の咆哮+未来の一閃 (SV4K/SV4M) / Paradox Rift / 고대의 포효+미래의 일섬

> 점검 깊이: **감사 + 안전수정 + 이슈로그**.

- **setGroup**: `sv-paradox-rift` · era SV (페어 확장팩)
- **점검일**: 2026-05-31
- **특이점**: SV4K(古代の咆哮)+SV4M(未来の一閃) 페어팩. JP 190 合本(각 95, 번호중복). EN(sv4) 게임데이터 없음.

---

## 1. 지역별 세트 구성 (정리 후)

| region | setId | loaded | cardCount | 제품 | 비고 |
|---|---|---:|---:|---|---|
| JP | `jp-sv-paradox-rift` | 190 | 190 ✓ | SV4K+SV4M 合本 | cardCount 0→190. supertype #59 Trainer/hp120 오류 |
| EN | `sv4` | 266 | 266 ✓ | Paradox Rift | 게임데이터 0(supertype 오분류 222) |
| KR | `kr-sv4k` | 91 | 91 | 고대의 포효 | **namu 정본화 완료** |
| KR | `kr-sv4m` | 92 | 92 | 미래의 일섬 | **namu 정본화 완료** |
| KR | `kr-svhk` | 59 | 59 | 스타터 덱&강화 세트(고대의 코라이돈 ex) | 자체번호 1–61 |
| KR | `kr-svhm` | 60 | 60 | 스타터 덱&강화 세트(미래의 미라이돈 ex) | 자체번호 1–61 |

### 삭제된 중복 세트
| setId | 사유 |
|---|---|
| `kr-sv-paradox-rift` | 빈 껍데기(0/0). Set만 삭제. |

---

## 2. 이번 점검 안전수정 (2026-05-31)

| 항목 | 내용 |
|---|---|
| KR 한글명·레어도 | kr-sv4k 91 (namu「고대의 포효」95행) + kr-sv4m 92 (namu「미래의 일섬」95행) |
| JP cardCount | 0 → 190 |
| 빈 껍데기 삭제 | kr-sv-paradox-rift |

스폿체크: kr-sv4k#1 야나프(C) / kr-sv4m#1 비구술(C) ✓

---

## 3. 남은 공백 — 재수집/검증 대기

1. **kr-svhk/kr-svhm 스타터덱&강화세트** — 자체번호 1–61, 본세트 namu와 불일치 [P13] → pokemoncard.co.kr.
2. **EN `sv4` 게임데이터 0** [P1].
3. **JP supertype #59 Trainer/hp120** (양 서브셋, 데이터 오류).
4. **KR 누락**: kr-sv4k[8,10,46,68] · kr-sv4m[22,55,84] · kr-svhk[2,14] · kr-svhm[13].
5. cross-cutting [P4][P5][P6][P11].

---

## 4. 출처
| 데이터 | 출처 | 상태 |
|---|---|---|
| JP 게임데이터 | TCGdex | ✅ |
| EN | pokemontcg.io | ⚠ 게임데이터 없음 |
| **KR 한글명·레어도** | **나무위키 「고대의 포효」/「미래의 일섬」** | ✅ 2026-05-31 |
