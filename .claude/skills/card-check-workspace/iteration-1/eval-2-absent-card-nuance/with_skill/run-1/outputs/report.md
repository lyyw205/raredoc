# 어비스아이에 메가리자몽ex 들어있어? — 확인 결과

## 결론

**아니요, 어비스아이(Abyss Eye)에는 메가리자몽 ex가 들어있지 않습니다.** 다만 카드 자체는 실존하며 **다른 팩에 수록**되어 있습니다 — "그 팩에는 없음, 다른 팩에 있음(✅ DB 있음 × 실존함)" 케이스입니다.

추가 뉘앙스: "메가리자몽 ex"라는 단독 명칭 카드는 없고, 실존 카드는 **메가리자몽X ex**와 **메가리자몽Y ex** 두 변형뿐입니다. 둘 다 어비스아이에는 없습니다.

## 근거 1 — 어비스아이 내부 확인 (DB + JP 공식 교차검증)

| 소스 | 결과 |
|---|---|
| 프로젝트 DB (`mega-abyss-eye` setGroup, 앵커 118장) | 리자몽 계열 0건, 도감 #6 0건 |
| `src/data/group-mega-abyss-eye.json` (전문 문자열 검색: 리자몽/リザードン/Charizard) | 0건 |
| JP 공식 pokemon-card.com (`resultAPI.php?pg=954`, 시크릿 포함 117장 전수, NFC 정규화) | リザードン 0건 |

어비스아이에 수록된 메가진화 ex는 다음 4종이 전부입니다:
**메가샹델라ex(メガシャンデラex), 메가제라오라ex(メガゼラオラex), 메가다크라이ex(メガダークライex), 메가몰드류ex(メガドリュウズex)**

DB 앵커 수(118)와 JP 공식 수집 수(117)가 사실상 일치해, "DB 수집 누락 때문에 안 보이는" 상황이 아님을 확인했습니다.

## 근거 2 — 메가리자몽 ex가 실제로 들어있는 팩 (DB 보유 현황)

| 카드 | 세트그룹 | 번호 | 레어도 | logicalCardId |
|---|---|---|---|---|
| 메가리자몽X ex (メガリザードンXex / Mega Charizard X ex) | 인페르노X (JP M2 / EN me2 / KR M2) | JP 013 · EN 13 | Double Rare | lc-cg-mega-infernox-n13 |
| 메가리자몽X ex | 인페르노X | JP 094 · EN 109 | Super Rare | lc-cg-mega-infernox-n94 |
| 메가리자몽X ex | 인페르노X | JP 110 · EN 125 | Special Art Rare | lc-cg-mega-infernox-n110 |
| 메가리자몽X ex | 인페르노X | JP 116 | (시크릿) | lc-cg-mega-infernox-n116 |
| 메가리자몽X ex | MEGA 드림 ex (M2a, 하이클래스팩) | 223 | Mega Attack Rare | lc-orphan-jp-mega-dream-ex-223 |
| 메가리자몽Y ex (メガリザードンYex) | 스타트 덱 100 배틀컬렉션 (MC) | 085 | — | lc-jp-tcg-MC-085 |

## 검색 과정 메모

- 1차 DB 검색 "메가리자몽ex"(붙여쓰기) 0건 → 표기 변형 "메가리자몽"으로 6건 매치 (DB 저장 표기는 **"메가리자몽X ex" / "메가리자몽Y ex"** — X/Y 표기 + ex 앞 공백).
- 매치된 setGroup이 전부 어비스아이가 아니므로, 어비스아이 내부를 set 필터(`--set mega-abyss-eye`) + dex #6 검색 + JP 공식 팩 전수로 3중 확인.

## 다음 액션

없음 — 데이터 정상, 수집 누락 아님. 어비스아이에서 리자몽을 찾으셨다면 인페르노X(메가리자몽X ex) 또는 MEGA 드림 ex 쪽을 보시면 됩니다.
