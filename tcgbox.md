# TCGBOX 분석

> URL: tcgbox.co.kr (→ 리다이렉트: skylook8624.cafe24.com/shop2)
> 분석일: 2026-05-13

---

## 1. 기본 정보

| 항목 | 내용 |
|------|------|
| 플랫폼 | Cafe24 기반 쇼핑몰 |
| 대표 | HAN HYE JEONG |
| 이메일 | tcgnu@naver.com |
| 사업자등록 | 475-59-00124 |
| 통신판매업 | 제2016-서울도봉-0058호 (개설 2016년) |
| 주소 | 서울특별시 성북구 오패산로 16가길 40 |
| 고객센터 | 070-8262-0805 (AM10~PM5) |
| 서비스 성격 | 일본어판 포켓몬 TCG 단카드 판매 전문 쇼핑몰 |

---

## 2. 서비스 성격 요약

- **일본판 포켓몬 TCG 단카드** 개별 판매가 핵심
- 전 세계 국제배송 지원 (195개국 이상)
- 가격 이중 표시: **USD + KRW** 동시 노출
- 결제: 신용카드(Visa/MC/Amex/Discover), PayPal
- 시세 조회/정보 플랫폼이 아닌 **판매 쇼핑몰**
- API 미제공

---

## 3. 카테고리 구조

### 3-1. 포켓몬 TCG 단카드

시리즈별로 세분화, 팩 단위로 카테고리 구성

#### SV 시리즈 (스칼렛&바이올렛, 현행)
| 코드 | 이름 |
|------|------|
| SV-Promo | 프로모 카드 (88장) |
| sv1S / sv1V | Scarlet ex / Violet ex (각 109장) |
| sv1a | Triplet Beat (104장) |
| svc | Pikachu Special Set (26장) |
| sv2P / sv2D | Snow Hazard / Clayburst (각 100장) |
| sv2a | Pokémon Card 151 (211장) |
| sv2am | Pokémon Card 151 Mirror Card (166장) |
| sv3 | The Ruler of Black Salt (142장) |
| sv3a | Raging Surf (93장) |
| sv4k / sv4m | Ancient Roaring / Island of the Future (각 96장) |
| sv4a | Shiny Treasure ex (SAR/S/AR/SR 고레어 별도 카테고리) |
| sv5m / sv5k | Cyber Jersey / Wild Force |
| sv5a | Crimson Haze |
| sv6 / sv6a | Mask of Transformation / Nightwinder |
| sv7a | Paradise Dragona |
| sv8 / sv8a | Super Brake / Terrastal Festa |
| sv8a-m | Terrastal Festa Mirror Card |
| sv9 | Battle Partners (현재 판매 중) |
| sv9a | Arena of Fever |
| sv10 | Team Rocket's Glory |
| sv11W / sv11B | White Flare / Black Bolt |

#### SS 시리즈 (소드&실드)
- SS Single Card 카테고리

#### SM 시리즈 (썬&문)
SM1부터 SM12a까지 세분화, Mirror Card 별도 카테고리
- smA, SM1(Sun/Moon Collection), SM1+, SM2(Moonlight/Sunshine of Alola), SM3, SM4a/4s, SM4+, SM5s/5m, SM5+, SM6/6a/6b, SM7/7a/7b, SM8/8a/8b, SM9/9a/9b, SM10/10a/10b, SM11/11a/11b, SM12/12a 등

#### XY 시리즈
- SR/UR 카드, RR 카드(EX/BREAK), 트레이너/에너지, 일반카드(R/U/C), 프로모, 구축덱, Best of XY

#### DP&BW 시리즈
- SR/UR 카드 별도

### 3-2. 봉탕/덱 판매

| 상품 | 가격 |
|------|------|
| SV 스타터 세트 (Metang&Metagross ex) | $9.25~$11.57 (약 ₩11,000~15,000) |
| SV 스타터 세트 (Koraidon ex / Miraidon ex) | $9.25 (약 ₩11,997) |
| SS VSTAR&VMAX 하이클래스 덱 | $15.42~$19.28 (약 ₩25,000) |
| SS 확장팩 [배틀리전] 1팩 (5팩 제한) | $1.54 (약 ₩1,997) |
| SS 확장팩 [무한존] 1팩 | $0.77 (약 ₩998) |
| MEGA 확장팩 1박스 | $23.13 (약 ₩29,999) |

### 3-3. 한국 독자 TCG (비포켓몬)

- **Cookie Run Bravers** - 쿠키런 브레이버스 카드
- **MEGA 시리즈** - 한국 자체 TCG 브랜드
  - MEGA-P, M1L(Megabrave), M1S(Mega Symphonia), MBG(Starter Set Mega Phantom EX)
  - MBD(Starter Set Megadiancy EX), M2(InfernoX), M2A(메가드림ex), M3, M4(Ninja Spinner)

### 3-4. 기타 상품

- **Foreign Version Single Card** - 영어판, 기타 외국판 카드
- **Card Supplies** - Dragon Shield 슬리브 등 카드 용품
- **Pokemon Card Coins** - 포켓몬 코인
- **Special Price Product (Event)** - 이벤트 할인 상품

---

## 4. 상품 상세 구조

### 상품명 형식
```
한국어명 (팩코드 카드번호)
예: 캐터피 (sv9 001)
```

### 상품 페이지 필드
| 필드 | 예시 |
|------|------|
| Product Name | 캐터피 (sv9 001) |
| Price | $0.23 ￦298 |
| Reward Points | $0 (1%) |
| Seller Product Code | sv9 001 |
| Minimum Order | 1개 이상 |

---

## 5. 가격대 분석

| 등급 | 예시 | USD | KRW |
|------|------|-----|-----|
| C/U (일반) | 캐터피, 단데기 | $0.23 | ₩298 |
| R (레어) | 버터풀, 마라카치 | $0.39~$0.46 | ₩505~596 |
| 고레어 (Shiny) | sv4a S/AR/SR 계열 | $2.31~$4.24 | ₩2,996~5,499 |
| 스타터 세트 | SV 스타터 | $9.25~$11.57 | ₩11,997~15,006 |
| 하이클래스 덱 | VSTAR&VMAX | $15.42~$19.28 | ₩25,006 |
| 1박스 (일반) | MEGA 확장팩 | $23.13 | ₩29,999 |

> SAR/UR 카드는 "Shineet Leisureex" 별도 카테고리: $2~5 수준

---

## 6. 게시판/커뮤니티

| 게시판 | 내용 |
|--------|------|
| Notice | 공지사항 |
| News and Events | 뉴스/이벤트 |
| FAQ | 자주 묻는 질문 |
| Product Review | 상품 후기 |
| Product Q&A | 상품 문의 |
| General Discussion Forum | 자유게시판 (현재 게시물 없음) |
| General Discussion Forum2 | 자유게시판2 |
| Gallery | 갤러리 |
| Data | 데이터 자료실 (현재 게시물 없음) |

> 커뮤니티 기능은 존재하나 실질적 활동 없음

---

## 7. 운영 정책

- **배송**: 해외 배송 전용, 무게별 요금, 5-8일 소요
- **결제**: 신용카드 4종 + PayPal
- **환불**: 수령 후 7일 이내 교환/반품 가능
- **리워드**: 주문 금액의 1% 포인트 적립 (20일 대기 후 사용 가능)
- **쿠폰**: 회원가입 시 $2 쿠폰 제공
- **다국어**: 한국어/영어 지원, 기준 통화 KRW(￦) 선택 가능

---

## 8. 기술 스택

- 플랫폼: **Cafe24** (skylook8624.cafe24.com/shop2)
- 자체 DB 없음, Cafe24 기본 상품 관리
- API 없음 (크롤링 불가)
- 언어 전환: 한국어/영어 선택

---

## 9. 경쟁력 / raredoc 관점 분석

### TCGBOX 강점
- 2016년부터 운영, 일본판 포켓몬 단카드 재고 방대
- SM 시리즈부터 SV 최신 시리즈까지 전 라인 커버
- 국제배송 완비, 글로벌 고객 기반
- USD/KRW 이중 가격 표시

### TCGBOX 약점
- UI가 구식 (Cafe24 기본 템플릿)
- **검색/필터 기능 미흡** (팩 내 등급 필터, 이름 검색 없음)
- **시세 추이/차트 없음** - 가격 변동 이력 불가
- **개인 간 거래 없음** - 쇼핑몰 판매만 가능
- API 미제공
- 커뮤니티 사실상 비활성
- 봉탕 EV 계산, 풀률 정보 없음

### raredoc 차별화 포인트
| 기능 | TCGBOX | raredoc |
|------|--------|---------|
| 단카드 판매 | ✅ | ❌ (거래 플랫폼) |
| 시세 정보 | 현재가만 | 시세 추이, 차트 |
| 개인간 거래 | ❌ | ✅ |
| 봉탕 EV/풀률 | ❌ | ✅ (예정) |
| 카드 DB/검색 | 부족 | 체계적 DB |
| API | ❌ | 개발 가능 |
| KRW 시세 | ✅ (판매가) | ✅ (시장가) |
