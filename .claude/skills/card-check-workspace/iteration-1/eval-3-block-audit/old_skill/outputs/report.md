# card-check 보고 — 메가드림ex(M2a)「유리나팔」연결 점검

## 결론 (한 줄)

✅ **정상 — 유리나팔은 엉뚱한 카드에 연결돼 있지 않다.** 메가드림ex(JP M2a / KR M2a / EN me2pt5)의 「유리나팔」 2장(베이스·SR)은 JP·KR·EN 3개 로케일이 모두 같은 카드(ガラスのラッパ / 유리나팔 / Glass Trumpet)로 정확히 연결돼 있고, 공식 KR·JP·tcgdex 권위 소스와 전부 일치한다. **4분면 위치: DB 있음 × 실존함 = ✅ 정상.** READ-ONLY 점검이며, 교정할 항목 없음 → DB 변경 불필요.

제보 정황상 의심될 수 있는 "이웃 트레이너와 KR 번호가 swap" 가능성도 베이스 아이템 블록(KR 152~160) + SR 블록(KR 215~217)을 공식 KR 상세로 전수 대조해 **swap 없음**을 확인했다.

---

## 대상 카드 (DB 현황)

| logicalCardId | 레어도 | JP(M2a) | KR(M2a) | EN(me2pt5) | 일러스트 |
|---|---|---|---|---|---|
| `lc-orphan-jp-mega-dream-ex-149` | (base) | 149 ガラスのラッパ | **154 유리나팔** | 189 Glass Trumpet | Toyste Beach |
| `lc-orphan-jp-mega-dream-ex-215` | Super Rare | 215 ガラスのラッパ | **216 유리나팔** | 260 Glass Trumpet | Toyste Beach |

setGroup: `mega-dream-ex` (era MEGA). KR 세트명 "MEGA 하이클래스팩 「MEGA 드림 ex」", JP "MEGAドリームex", EN "Ascended Heroes".

> 참고: 같은 「유리나팔」이 SV 세트에도 재록돼 있음(테라스탈 페스타 SV8a #144 / 스텔라미라클 SV7 #091). 이번 제보 세트(M2a)와 무관한 부가 정보.

---

## 권위 소스 검증 결과 (3개 로케일 전부 일치)

| 로케일 | DB 값(베이스 / SR) | 공식 확인 | 출처 |
|---|---|---|---|
| **KR** | M2a 154 / 216 = 유리나팔 | M2a_154.png=유리나팔, M2a_216.png=유리나팔 ✓ | pokemoncard.co.kr (검색 + 상세 BS2025015154 / BS2025015216) |
| **JP** | M2a 149 / 215 = ガラスのラッパ | cardID 48671·49975 둘 다 M2a 폴더 ガラスのラッパ ✓ | pokemon-card.com resultAPI + details |
| **EN** | me2pt5 189 / 260 = Glass Trumpet | me02.5-189·me02.5-260 = Glass Trumpet ✓ | tcgdex (보조, EN 대량검증용) |

KR 공식 상세 page_num: 154/193(베이스, 레귤 H), 216/193(SR) — DB 번호와 정확히 일치.

---

## 트레이너 블록 swap 감사 (스킬의 트레이너/아이템 정합 분기)

제보가 "엉뚱한 카드에 연결"이라 한 장만 보지 않고, 유리나팔 주변 KR 번호를 공식 KR 상세로 전수 대조 → **전부 일치, swap 0건.**

| KR # | 공식 KR 명 | DB nameKo(동일 KR#) | 일치 |
|---|---|---|---|
| 152 | 성스러운분말 | 성스러운분말 | ✓ |
| 153 | 에너지 리사이클 | 에너지 리사이클 | ✓ |
| **154** | **유리나팔** | **유리나팔** | **✓** |
| 155 | 절친 포핀 | 절친 포핀 | ✓ |
| 156 | 테라스탈오브 | 테라스탈오브 | ✓ |
| 157 | 툴스크래퍼 | 툴스크래퍼 | ✓ |
| 158 | 파워프로틴 | 파워프로틴 | ✓ |
| 159 | 파이팅공 | 파이팅공 | ✓ |
| 160 | 호브의 가방 | 호브의 가방 | ✓ |
| 215 | 로켓단의 리시버 | 로켓단의 리시버 | ✓ |
| **216** | **유리나팔** | **유리나팔** | **✓** |
| 217 | 하이퍼볼 | 하이퍼볼 | ✓ |

추가로 DB 내부 정합성: `mega-dream-ex` 트레이너 59행 전체에서 **KR 번호 중복(collision) 0건** — 한 KR 번호가 두 로지컬 카드에 붙은 케이스 없음. JP↔KR는 이 세트가 원래 번호 순서가 다르게 배열돼 있어(예: JP149→KR154, JP157→KR148) 번호가 어긋나 보이지만, 이는 공식 KR 발매 번호 그대로이며 오류가 아니다.

---

## 실행한 명령 / 스크립트

> 번들 스크립트 scripts/search-card.ts는 스냅샷 경로가 더 깊어 상대 import ../../../../src/lib/prisma 가 깨져 그대로는 실행 불가(MODULE_NOT_FOUND). 동일 로직을 레포 루트에 임시 read-only 래퍼(.tmp-*.ts, findMany 전용·DB 무변경)로 복제해 실행했고, 점검 후 전부 삭제했다. 어떤 기존 파일도 수정·커밋하지 않음.

1. DB 1차 검색 (이름 다국어 부분일치):
   npx tsx .tmp-card-check-search.ts "유리나팔" --limit 30
   npx tsx .tmp-card-check-search.ts "ガラスのラッパ" --limit 30
   → M2a 베이스#149(KR154)·SR#215(KR216) 2장 확인. 3개 로케일 이름 모두 동일 아이템.

2. 트레이너 블록 전수 덤프 + JP→KR 매핑/충돌 검사 (.tmp-trainer-audit.ts, .tmp-krmap.ts):
   → 트레이너 59행, KR 번호 중복 0건.

3. KR 공식 (pokemoncard.co.kr) — 검색 + 상세:
   curl -s -X POST "https://pokemoncard.co.kr/v2/ajax2_dev2" -H "X-Requested-With: XMLHttpRequest" \
     -H "Referer: https://pokemoncard.co.kr/cards" -H "Origin: https://pokemoncard.co.kr" \
     -H "User-Agent: Mozilla/5.0" -F "action=search_text_cards" -F "search_text=유리나팔" \
     -F "search_params=all" -F "limit=0"
   # → M2a_154.png, M2a_216.png (+ SV8a_144, SV7_091)
   curl -s "https://pokemoncard.co.kr/cards/detail/BS2025015154"  # → 유리나팔 154/193
   curl -s "https://pokemoncard.co.kr/cards/detail/BS2025015216"  # → 유리나팔 216/193
   # 이웃 트레이너 152,153,155~160,215,217 상세도 전수 대조 → 전부 DB와 일치

4. JP 공식 (pokemon-card.com):
   curl -s "https://www.pokemon-card.com/card-search/resultAPI.php?keyword=<ガラスのラッパ 인코딩>&regulation_sidebar_form=all&sm_and_keyword=true"
   # → hitCnt 4: M2a cardID 48671·49975 (+ SV8a, SV7). NFC 정규화 후 이름 ガラスのラッパ 확인

5. EN 보조 (tcgdex):
   curl -s "https://api.tcgdex.net/v2/en/cards?name=Glass%20Trumpet"
   # → me02.5-189, me02.5-260 = Glass Trumpet (+ sv08.5-110, sv07-135)

---

## 다음 액션 제안

- **교정 불필요.** 유리나팔(M2a 베이스 #149/KR154, SR #215/KR216) 및 인접 트레이너 블록의 JP↔KR↔EN 연결은 모두 공식 권위 소스와 일치. 데이터 변경 없음.
- 사용자가 본 "엉뚱함"은 (a) JP 번호(149)와 KR 번호(154)가 달라 보이는 것을 오류로 오인했을 가능성 — 이는 KR 공식 발매 번호 그대로의 정상 차이, 또는 (b) 동일 「유리나팔」이 SV7/SV8a에도 재록돼 다른 세트 카드와 혼동했을 가능성. 어느 쪽이든 M2a 연결 자체는 정확하다.
