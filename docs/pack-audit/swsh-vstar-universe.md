# 팩 점검 · 출처 기록 — VSTARユニバース (S12a) / VSTAR 유니버스 / Crown Zenith(EN)

> 점검 깊이: **감사 + 안전수정 + 이슈로그**. SWSH 시리즈 점검 #2 (최신→과거 역순).

- **setGroup**: `og-s12a` · era S (소드·실드) · 하이클래스팩 · 발매 2022-12-02
- **점검일**: 2026-05-31
- **특이점**: EN은 별제품 **Crown Zenith 본세트**(en-tcg-swsh12pt5, 160장)가 이 그룹에 매핑됨. 별도 EN 서브셋 Galarian Gallery는 `og-swsh12pt5gg`(→ swsh-crown-zenith-gg.md).

## 1. 세트 구성
| region | setId | loaded | cardCount | 비고 |
|---|---|---:|---:|---|
| JP | `jp-tcg-S12a` | 254 | 254 ✓ | |
| KR | `kr-s12a` | 252 | 252 ✓ | namu 정본화 252 |
| EN | `en-tcg-swsh12pt5` | 160 | 160 ✓ | Crown Zenith 본세트, 건강 |

primarySetId: jp-tcg-S12a(254)·en-tcg-swsh12pt5(160)·kr-s12a(8). **KR 244장이 JP LC에 그룹화** → namu 갱신이 JP에도 동시 반영.

## 2. 안전수정 (완료)
- **namu 「VSTAR 유니버스」 정본화**: kr-s12a 252장 ko명+레어도. 공유 LC 통해 JP rarity 30→246·ko 0→244 동시 정정. (단일표 분모 172, 오염 없음)
- 🔧 **RMAP 영구 확장**: `RRR→Triple Rare`(VMAX/VSTAR 17장), `K→Radiant Rare`(かがやく/찬란한 6장). SWSH era 전체 재사용.
- JP/KR cardCount는 이미 정상(254/252).

## 3. 남은 공백 (cross-cutting · 추후 패스)
- [P15/P5] **JP·KR 게임데이터 결손**: hp 0·attacks scalar(미구조화)·abilities 0·illustrator 0·flavor 0. → TCGdex 재임포트.
- [P2] **JP 시크릿 8장 누락** [251–258] (namu엔 존재) · **KR 10장 누락** [42,46,53,54,73,104,109,188,194,220].
- [P3] KR CardLocale.name = JP placeholder 잔존(표시는 CardText(ko) 오버레이로 정상).
- [P6] provenance(ExternalIdMapping) JP/KR 없음.
- EN: hp 123/160·illustrator 152/160·flavor 94 (V계열·트레이너 제외하면 사실상 완비), ja CardText 0.

## 4. 출처
| 데이터 | 출처 | 상태 |
|---|---|---|
| **KR/JP 한글명·레어도** | **나무위키 「VSTAR 유니버스」** | ✅ 2026-05-31 |
| EN 게임데이터·레어도·이미지 | pokemontcg.io | ✅ |
| JP/KR 게임데이터(hp/attacks/abilities) | TCGdex 재임포트 | ⏳ 미수집 |
