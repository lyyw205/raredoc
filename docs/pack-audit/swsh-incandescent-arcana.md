# 팩 점검 · 출처 기록 — 白熱のアルカナ (S11a) / 백열의 아르카나

> 점검 깊이: **감사 + 안전수정 + 이슈로그**. SWSH #6. ⚠ **심각한 구조 문제 동반 그룹**.

- **setGroup**: `og-s11a` · era S (소드·실드) · 강화확장팩 · 발매 2022-09-02
- **점검일**: 2026-05-31

## 1. 세트 구성 (⚠ 혼재)
| region | setId | name | loaded | cardCount | 그룹화 | 비고 |
|---|---|---|---:|---:|---|---|
| JP | `jp-tcg-S11a` | 白熱のアルカナ | 94 | 140 | (본 LC) | ✅ 백열의 아르카나 본체. 46 누락 |
| KR | `kr-s11a` | 백열의 아르카나 | 89 | 89 ✓ | →jp-tcg-S11a | ✅ 정상, namu 적용 |
| KR | `kr-s11` | **로스트어비스(Lost Abyss)** | 123 | 123 | →jp-tcg-S11a + en-tcg-swsh12 | ❌ **별 확장팩이 오편입** |
| EN | `en-tcg-swsh12` | **Silver Tempest** | 215 | 215 ✓ | (본 LC) | ❌ **Paradigm Trigger(og-s12)에 가야 함** |

## 2. 안전수정 (완료)
- **namu 「백열의 아르카나」 정본화**: kr-s11a 89장 ko명+레어도. 공유 LC 통해 JP s11a ko 0→89 동시.
- 🔧 **RMAP 확장**: `CSR→Character Super Rare` (SWSH era 반복).

## ✅ 구조 정리 완료 (2026-06-01)
아래 1~3 이슈는 **구조 정리 S1~S3로 전부 해결**: kr-s11(로스트어비스)은 신설 `og-s11`로 이전·언머지·namu 재적용, en-tcg-swsh12(Silver Tempest)는 `og-s12`로 이전. → **현재 og-s11a = 백열의 아르카나(JP s11a + KR s11a)만 남은 클린 그룹.** 상세 [swsh-lost-abyss-origin.md](./swsh-lost-abyss-origin.md).

## 3. (구) 구조 이슈 — 해결됨 (이력 보존)
1. **[P8] kr-s11(로스트어비스)이 og-s11a에 오편입**: 로스트어비스(JP s11)는 백열의 아르카나(s11a)와 **다른 확장팩**. "S11 N" placeholder 123장이 jp-tcg-S11a·en-tcg-swsh12 LC에 번호로 흩어져 그룹화 → kr-s11a namu 적용 후 **kr-s11도 백열/실버템페스트 한글명으로 오표시**(ko 32→118 오염).
2. **[누락 setGroup] 로스트어비스(s11)·로스트오리진 본세트 그룹 부재**: og-swsh11tg(Lost Origin TG 서브셋)만 존재. JP `jp-tcg-S11`(ロストアビス)·EN Lost Origin 본세트가 별 setGroup으로 없음 → kr-s11이 갈 곳이 없어 og-s11a에 흡수된 것으로 추정.
3. **[P7] EN Silver Tempest(en-tcg-swsh12)가 og-s11a에 매핑**: EN Silver Tempest = JP Paradigm Trigger(s12) 대응이므로 `og-s12`로 이동 검토.
   → **해결: 로스트어비스/로스트오리진 setGroup 신설 + kr-s11 un-merge·이전 + EN swsh12 재배치** (사용자 결정).

## 4. 남은 공백 (cross-cutting)
- [P2] JP s11a 46장 누락(loaded 94 / cardCount 140) · KR 누락 kr-s11a[3,6,58,86,92].
- [P15/P5] JP·KR 게임데이터 부분 결손(attacks 미구조화 다수·illustrator·flavor 0) · [P6] provenance 부분 · [P10] KR releaseDate epoch.

## 5. 출처
| 데이터 | 출처 | 상태 |
|---|---|---|
| **KR/JP 한글명·레어도(백열의 아르카나)** | **나무위키 「백열의 아르카나」** | ✅ 2026-05-31 |
| EN Silver Tempest 게임데이터 | pokemontcg.io | ✅ (단 그룹 위치 오류) |
| 로스트어비스(kr-s11) 정본 | 구조 정리 후 namu 「로스트어비스」 | ⏳ 보류 |
