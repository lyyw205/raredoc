# 카드 실존 리서치 소스 레시피 (실측 검증: 2026-06-07)

카드가 DB에 없을 때 실존 여부와 정식 식별자(명칭·세트·번호)를 확인하는 방법.
조회는 카드당 소스별 1~2회면 충분하다. 결과에서 챙길 것: 정식 명칭(언어별), 세트코드, 콜렉션 번호, 레어도, 도감번호.

## 1. KR 공식 — pokemoncard.co.kr (한국어 이름일 때 1순위)

목록 검색은 AJAX만 동작한다 (정적 GET은 기본팩만 반환):

```bash
curl -s -X POST "https://pokemoncard.co.kr/v2/ajax2_dev2" \
  -H "X-Requested-With: XMLHttpRequest" \
  -H "Referer: https://pokemoncard.co.kr/cards" \
  -H "Origin: https://pokemoncard.co.kr" \
  -H "User-Agent: Mozilla/5.0" \
  -F "action=search_text_cards" -F "search_text=<카드명 또는 팩명>" \
  -F "search_params=all" -F "limit=0"
```

- 응답: `{count, limit(다음페이지), result:{N:{CardNum, feature_image}}}` — 페이지당 30장, `limit` 증가시키며 반복.
- `feature_image` 경로의 `{세트코드}_{번호}`가 식별자 (예 `MEGA/M4/M4_001.png`).
- 상세는 정적 HTML: `https://pokemoncard.co.kr/cards/detail/{CardNum}` — 한글명(`card-hp title`), 번호/레어도(`p_num`), 레귤마크(symbol/J.png), 도감번호, 일러스트레이터까지 나옴.
- 검색 0건 = 한국판 미발매일 가능성. 같은 종의 다른 카드를 검색해 교차 확인.

## 2. JP 공식 — pokemon-card.com (일본어 이름·최종 권위)

```bash
# 키워드 검색 (카드명 URL인코딩)
curl -s "https://www.pokemon-card.com/card-search/resultAPI.php?keyword=<인코딩된이름>&regulation_sidebar_form=all&sm_and_keyword=true" -H "User-Agent: Mozilla/5.0"
# 팩 단위는 pg 코드: resultAPI.php?pg=<코드>&regulation_sidebar_form=all&page=N
```

- 응답 `{hitCnt, cardList:[{cardID, cardNameViewText, cardThumbFile}]}`. 썸네일 경로의 세트폴더(`/M5/`)로 수록 세트 확인.
- 상세: `details.php/card/{cardID}/regu/all` — 번호(005/081), 레어도 아이콘(`ic_rare_*.gif`, **대문자 코드 존재** 예 MUR), 도감 No., 일러스트.
- ⚠️ **NFD 분해 가나**를 서빙한다(ビ=ヒ+탁점). 파이썬 `unicodedata.normalize('NFC', ...)` 후 비교할 것. grep으로 일본어 직접 매칭하면 조용히 실패한다.
- pg 코드 찾기: `/card-search/` HTML 안의 `{ name: "pg", value: "954", label: "拡張パック「アビスアイ」" }` (NFC 정규화 후 검색).
- ⚠️ **신팩 시크릿 지연 등재**: 발매 직후엔 hitCnt가 베이스 수만 나올 수 있다. 같은 시대 타 팩 hitCnt와 비교하고, 특설페이지 `https://www.pokemon-card.com/ex/{세트소문자}/assets/json/cardlist.json`(공개 카드 number/rarity 목록)도 확인.

## 3. EN 공식 — pokemon.com (영어 이름일 때)

- 상세가 정적 HTML: `https://www.pokemon.com/us/pokemon-tcg/pokemon-cards/series/{시리즈}/{번호}/` (예 me03/1). 목록 페이지는 JS 렌더라 못 쓴다.
- ⚠️ **Incapsula 봇차단**: 단건은 정상(50KB+), 연속 요청 4~5건째부터 HTTP 200인데 1KB대 차단 스텁. **응답 크기 <5KB = 차단**으로 판단하고 즉시 중단, 보조 소스로 폴백. 요청 사이 수 초 간격.
- ★ **역할: EN 개별 최종 검증의 1순위 권위** — 연결 확정·오연결 교정 등 단건 판정은 여기(공식)로 한다. 대량 스윕(전수 감사)만 ptcg.io/tcgdex 사용. 서드파티끼리 표기가 엇갈리면 공식이 심판.

## 4. 보조 소스 (공식에서 못 찾을 때 — 구세대·프로모·영문 세트명에 유리)

```bash
# tcgdex — 다국어 카드 API (en/ja/ko 등). 이름 부분일치
curl -s "https://api.tcgdex.net/v2/en/cards?name=<이름>" | head -c 2000
curl -s "https://api.tcgdex.net/v2/ja/cards?name=<이름>" | head -c 2000
# 카드 상세: /v2/{lang}/cards/{cardId}  ·  세트: /v2/{lang}/sets/{setId}
```

- tcgdex는 일부 팩이 불완전하니(예: 샤이니트레저 누락 다수) "없음"의 근거로는 약하고 "있음"의 근거로만 쓴다.
- limitlesstcg.com — JP/EN 세트·카드 DB가 충실. `https://limitlesstcg.com/cards?q=<이름>` (HTML).
- 그래도 못 찾으면 WebSearch로 카드명+"pokemon card"를 검색해 단서를 얻는다.

## 판정 가이드

- **실존 확정**: 공식 사이트 어느 하나에서 카드 페이지/검색 결과 확인.
- **실존 부정**: 공식 JP+KR 모두 0건 + 보조 소스에도 없음 + 검색에서 유사명만 나옴 → "존재하지 않거나 이름 오기" 판정, 가장 가까운 실존 카드를 함께 제시.
- **불명**: 차단/오류로 확인 자체가 안 된 경우 — 솔직히 "확인 불가"로 보고.

## JP↔KR 번호·이름 함정 (DB 2차 검색 시)

- KR 콜렉션 번호는 JP와 **스왑/순환**될 수 있다 (실측: M4에서 3장 순환 + 2장 스왑). 번호보다 **도감번호+일러스트레이터**가 강한 식별자.
- 같은 일러스트레이터의 트레이너스 2장이 맞바뀐 사례도 있으니, 트레이너스는 이름 번역·룰 텍스트로 대조.
- KR 팩명 검색은 정확한 공식 표기를 써야 한다 (예: "아비스아이"≠"어비스아이" — 사이트 표기 확인).
