# 팩 점검 · 출처 기록 — スカーレットex+バイオレットex (SV1S/SV1V) / Scarlet & Violet / 스칼렛 ex+바이올렛 ex

> 형식: [sv-black-bolt-white-flare.md](./sv-black-bolt-white-flare.md). 점검 깊이: **감사 + 안전수정 + 이슈로그**.

- **setGroup**: `sv-base` · era SV (시리즈 첫 확장팩)
- **점검일**: 2026-05-31
- **특이점**: **과대 그룹화** — SV 본확장(스칼렛 ex/바이올렛 ex) + KR 스타터/스페셜 제품 7종이 한 setGroup에 묶임. JP는 SV1S(1–108)+SV1V(1–108) 合本 216장(번호중복).

---

## 1. 지역별 세트 구성 (정리 후)

| region | setId | loaded | cardCount | 제품 | 비고 |
|---|---|---:|---:|---|---|
| JP | `jp-sv-base` | 216 | 216 ✓ | SV1S+SV1V 合本 | cardCount 0→216 수정. 번호 1–108 중복 |
| EN | `sv1` | 258 | 258 ✓ | Scarlet & Violet | 자체번호. 게임데이터 0 |
| KR | `kr-sv1s` | 107 | 107 | 스칼렛 ex | **namu 정본화 완료** |
| KR | `kr-sv1v` | 105 | 105 | 바이올렛 ex | **namu 정본화 완료** |
| KR | `kr-svd` | 146 | 146 | ex 스타트 덱 | placeholder 名. 39장만 데이터 |
| KR | `kr-svg` | 53 | 53 | 스페셜 덱 세트(이상해꽃·리자몽·거북왕) | placeholder 名 |
| KR | `kr-svb` | 36 | 36 | 프리미엄 트레이너 박스 ex | placeholder 名 |
| KR | `kr-sva` | 25 | 25 | 스타터 세트 ex(꾸왁스&따라큐) | placeholder 名 |
| KR | `kr-svc` | 22 | 22 | 스타터 세트 ex(피카츄 스페셜) | placeholder 名 |
| KR | `kr-svem` | 20 | 20 | 스타터 세트 테라스탈(뮤츠 ex) | placeholder 名 |
| KR | `kr-svp1` | 7 | 7 | ex 스페셜 세트 | placeholder 名 |

### 삭제된 중복 세트
| setId | 사유 |
|---|---|
| `kr-sv-base` | 빈 껍데기(CardLocale 0 · LC 0). Set만 삭제. |

---

## 2. 이번 점검 안전수정 (2026-05-31)

| 항목 | 내용 |
|---|---|
| 한글명·레어도 | kr-sv1s 107장 (namu「스칼렛 ex」) + kr-sv1v 105장 (namu「바이올렛 ex」) → CardText(ko)+nameKo+rarity |
| JP cardCount | 0 → 216 |
| 빈 껍데기 삭제 | kr-sv-base |

**스크립트**: `sync-pack-namu-ko.ts kr-sv1s "스칼렛 ex"` / `... kr-sv1v "바이올렛 ex"`

---

## 3. 남은 공백 — 재수집/검증 대기

1. **[구조] 과대 그룹화** — KR 스타터/스페셜 7종(svd/svg/svb/sva/svc/svem/svp1)이 `sv-base`에 동거. 별도 setGroup 분리 검토 필요(사용자 결정).
2. **KR 스타터 7종 placeholder名** — "SVD 1" 등. namu 표 부재 가능 → **pokemoncard.co.kr 공식 재수집** 필요(스타트덱100/스타터덱과 동류).
3. **JP rarity 156/216** — 60장 레어도 결측.
4. **EN `sv1` 게임데이터 0** — hp 0, attacks scalar 258, supertype 오분류 209.
5. **KR releaseDate 전부 epoch(1970)** — 정확한 KR 발매일 미상 → 권위 출처로 일괄 정정 필요.
6. **누락 번호**: kr-svd[56] · kr-sv1v[36,68,85] · kr-svg[4,23] · kr-sv1s[37] · kr-svem[8].
7. cross-cutting: pokedexNumbers 희소 · abilities 0 · flavorText 0 · CardText(ja) 0 · provenance 0.

---

## 4. 출처
| 데이터 | 출처 | 상태 |
|---|---|---|
| JP 게임데이터 | TCGdex | ✅ (rarity 일부 결측) |
| EN | pokemontcg.io | ⚠ 게임데이터 없음 |
| **KR 본확장 한글명·레어도** | **나무위키 「스칼렛 ex」/「바이올렛 ex」** | ✅ 2026-05-31 |
| KR 스타터 7종 | 미수집(placeholder) | ❌ → pokemoncard.co.kr |
