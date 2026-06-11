/**
 * Limitless deck.id → 한글 아키타입명 사전.
 *
 * - 키: Limitless standings 의 `deck.id` (정본 아키타입 키, 예: "dragapult-ex")
 * - 값: 포켓몬 한국 정식명 기준 덱 한글명 (편집 자산)
 *
 * aggregate-meta.ts 가 DeckArchetype.nameKo 를 채울 때 이 사전을 우선 적용한다.
 * 사전에 없으면 nameEn(=deck.name) 으로 폴백하고 미번역 로그를 남긴다.
 * 신규 덱은 미번역 로그를 보고 여기에 수동 추가한다.
 *
 * 시드 출처: 2026-06-01 Limitless 상위 사용률 STANDARD 덱 실데이터.
 * 정식 한글명이 불확실한 항목은 TODO 주석으로 표기하고 영문 유지.
 */
export const ARCHETYPE_KO: Record<string, string> = {
  // ── 상위 메타 (사용률 高) ──
  "dragapult-ex": "드래펄트ex",
  "mega-greninja-ex": "메가 개굴닌자ex",
  "slowking-scr": "야도킹",
  "alakazam-dudunsparce": "후딘 노고치",
  "beedrill-ex-cri": "독침붕ex",
  "dragapult-dusknoir": "드래펄트 야느와르몽",
  "ogerpon-meganium-hydrapple": "오거폰 메가니움 과미르",
  "starmie-dusknoir": "메가 별가사리 야느와르몽",
  "lucario-hariyama": "메가 루카리오 노보청",
  "festival-lead": "페스티벌 리드", // 디퍼 + 옹마르(thwackey) 선공 덱
  "n-zoroark": "N의 조로아크",
  "archaludon-dudunsparce": "브리두라스 노고치",
  "dragapult-blaziken": "드래펄트 번치코",
  "raging-bolt-ogerpon": "다투랍번개 오거폰",
  "rockets-honchkrow": "로켓단의 돈크로우",
  "greninja-ex": "개굴닌자ex",
  "crustle-dri": "암멍게",
  "rocket-mewtwo-ex": "로켓단의 뮤츠",

  // ── 중위 메타 ──
  "cynthia-garchomp-ex": "시로나의 한카리아스ex",
  "basic-box-m": "베이직 박스", // 오거폰 + 삐삐 메가 박스
  "metagross-cri": "메타그로스",
  "grimmsnarl-froslass": "오롱털 눈여아",
  "diancie-dusknoir": "메가 디안시 야느와르몽",
  "lopunny-dudunsparce": "메가 이어롭 노고치",
  "dragapult-dudunsparce": "드래펄트 노고치",
  "starmie-froslass": "메가 별가사리 눈여아",
  "ethan-typhlosion": "Ethan의 블레이범", // TODO: KR 공식명 미확인 (sv10 KR=로켓단 분할팩이라 Ethan 계열 미수록) — 수록 팩 KR 수집 후 교정
  "okidogi-barbaracle": "이야후개 거북손",
  "mega-lucario-ex": "메가 루카리오ex",
  "mega-starmie-ex": "메가 별가사리ex",
  "mega-venusaur-ex": "메가 이상해꽃ex",
  "stevens-metagross": "성호의 메타그로스",
  "mega-dragonite-ex": "메가 망나뇽ex",

  // ── 하위 / 테크 덱 ──
  "joltik-box": "전기왕 박스", // joltik = 전기왕
  "hop-zacian": "호프의 자시안",
  "ceruledge-ex": "파라블레이즈ex", // KR 공식 "파라블레이즈 ex" 확인(2026-06-06, KR RegionCard) — 덱명 컨벤션상 붙여씀
  "clefairy-ogerpon": "삐삐 오거폰",
  "kangaskhan-bouffalant": "메가 캥카 들소밸로",
  "froslass-munkidori": "눈여아 무쿠리",
  "mega-abomasnow-ex": "메가 눈설왕ex",
  "mega-diancie-ex": "메가 디안시ex",
  "mega-charizard-x-ex": "메가 리자몽 Xex",
  "mamoswine-ex": "맘모꾸리ex",
  "alakazam-meg": "후딘",
  "ursaluna-lunatone": "땃따부리 루나톤",
  "mega-feraligatr-ex": "메가 장크로다일ex",
  "manectric-eelektrik": "메가 썬더볼트 저리어",
  "mega-absol-box": "메가 앱솔 박스",
  "flareon-noctowl": "부스터 야부엉",
  "doublade-por": "쌍검귀",
  "palafin-ex": "돌핀맨ex", // palafin hero form
  "dudunsparce-control": "노고치 컨트롤",
  "bronzong-tef": "동탁군",
  "feraligatr-tef": "장크로다일",
  "reging-bolt-bellibolt": "다투랍번개 찌리배기", // Limitless 오타 키(reging) 그대로 유지
  "raging-bolt-bellibolt": "다투랍번개 찌리배기",

  // ── 2026-06-01 집계 미번역 보강 ──
  "hops-trevenant": "호프의 대로트",
  "ogerpon-meganium": "오거폰 메가니움",
  "ogerpon-meganium-arboliva": "오거폰 메가니움 올리르바",
  "mega-froslass-ex": "메가 눈여아ex",
  "mega-froslass-dudunsparce": "메가 눈여아 노고치",
  "jellicent-dusknoir": "탱탱겔 야느와르몽",
  "decidueye-ex": "모크나이퍼ex",
  "yanmega-ex": "메가얌마ex",
  "tera-box": "테라스탈 박스",
  "heatran-metang": "히드런 메탕",
  "mega-lopunny-ex": "메가 이어롭ex",
  "lillie-clefairy": "릴리에의 삐삐",

  // ── 특수 ──
  other: "기타", // Limitless 의 미분류 묶음
};
