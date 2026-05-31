// ── 타입 정의 ─────────────────────────────────────────────────────────────────

export type CardGameCard = {
  id: string;
  nameKo: string;
  nameJa: string;
  nameEn: string;
  type:
    | "grass"
    | "fire"
    | "water"
    | "lightning"
    | "psychic"
    | "fighting"
    | "darkness"
    | "metal"
    | "dragon"
    | "colorless"
    | "fairy";
  hp: number;
  rarity: "C" | "U" | "R" | "RR" | "AR" | "SR" | "SAR" | "UR" | "MUR";
  setId: string;
  setNameKo: string;
  cardNumber: string;
  illustrator: string;
  imageUrl: string;
  attacks?: { name: string; cost: string[]; damage?: number; text?: string }[];
  ability?: { name: string; text: string };
  weakness?: string;
  resistance?: string;
  retreat?: number;
  usageRate?: number;
  // ── 카드 기본 정보 (pokemontcg.io v2 스키마 기준) ──
  supertype?: "Pokémon" | "Trainer" | "Energy";
  /** 기본/1진화/2진화·ex·메가진화 또는 아이템/서포트/스타디움/특수에너지 등 */
  subtypes?: string[];
  evolvesFrom?: string;
  evolvesTo?: string[];
  /** 레귤레이션 마크 (예: "G", "H", "I") */
  regulationMark?: string;
  legalities?: {
    standard?: "Legal" | "Banned";
    expanded?: "Legal" | "Banned";
    unlimited?: "Legal" | "Banned";
  };
  /** 도감 설명 (카드 하단 플레이버 텍스트) */
  flavorText?: string;
  /** 전국도감 번호 (TAG TEAM 등은 복수) */
  nationalPokedexNumbers?: number[];
  /** ex/메가 룰 박스 텍스트 */
  rules?: string[];
};

export type CardGameSet = {
  id: string;
  nameKo: string;
  nameJa: string;
  code: string;
  jpReleaseDate: string;
  krReleaseDate: string;
  cardCount: number;
  heroImageUrl: string;
  description: string;
  newMechanic?: string;
};

export type DeckArchetype = {
  id: string;
  nameKo: string;
  tier: "S" | "A" | "B" | "C";
  regulation: "스탠다드" | "익스텐디드" | "殿堂";
  usageRate: number;
  winCount: number;
  avgRank: number;
  heroCardIds: string[];
  cardList: { cardId: string; count: number; role?: "✓" | "⚠" | "✗" }[];
  variants: { id: string; nameKo: string }[];
  strengths: string[];
  weaknesses: string[];
  counters: string[];
  description: string;
};

export type Tournament = {
  id: string;
  nameKo: string;
  date: string;
  region: "KR" | "JP" | "INTL";
  format: "스탠다드" | "익스텐디드";
  players: number;
  winnerArchetype?: string;
  status: "upcoming" | "completed";
};

export type PlayerRanking = {
  rank: number;
  name: string;
  csp: number;
  favArchetype: string;
  wins: number;
};

export type PullRateRow = {
  rarity: string;
  types: number;
  probability: number;
  perBox: string;
};

export type Ruling = {
  id: string;
  cardId?: string;
  question: string;
  answer: string;
  sourceUrl?: string;
};

export type GlossaryEntry = {
  term: string;
  definition: string;
  example?: string;
};

// ── 카드 데이터 ───────────────────────────────────────────────────────────────

export const CARDS: Record<string, CardGameCard> = {
  "sv8-180": {
    id: "sv8-180",
    nameKo: "잠만보 ex",
    nameJa: "カビゴンex",
    nameEn: "Snorlax ex",
    type: "colorless",
    hp: 160,
    rarity: "SAR",
    setId: "sv8",
    setNameKo: "초승달의 섬",
    cardNumber: "180/172",
    illustrator: "Mitsuhiro Arita",
    imageUrl: "https://images.pokemontcg.io/sv8/180_hires.png",
    attacks: [
      {
        name: "먹고 자기",
        cost: ["colorless", "colorless"],
        damage: 60,
        text: "이 포켓몬의 HP를 30 회복한다.",
      },
      {
        name: "기가임팩트",
        cost: ["colorless", "colorless", "colorless", "colorless"],
        damage: 220,
        text: "다음 자신의 차례, 이 포켓몬은 공격할 수 없다.",
      },
    ],
    weakness: "fighting",
    retreat: 4,
    usageRate: 12,
  },
  "sv1-198": {
    id: "sv1-198",
    nameKo: "리자몽 ex",
    nameJa: "リザードンex",
    nameEn: "Charizard ex",
    type: "fire",
    hp: 330,
    rarity: "SAR",
    setId: "sv1",
    setNameKo: "스칼렛 & 바이올렛",
    cardNumber: "198/198",
    illustrator: "Mika Kojo",
    imageUrl: "https://images.pokemontcg.io/sv1/198_hires.png",
    attacks: [
      {
        name: "화염날개",
        cost: ["fire", "colorless"],
        damage: 60,
        text: "불꽃 에너지 1장을 패에서 이 포켓몬에 붙인다.",
      },
      {
        name: "불꽃폭풍",
        cost: ["fire", "fire", "colorless", "colorless"],
        damage: 330,
        text: "이 포켓몬에 붙어 있는 불꽃 에너지를 2장 버린다.",
      },
    ],
    ability: {
      name: "불꽃의 혼",
      text: "자신의 차례에, 패에서 불꽃 에너지를 원하는 만큼 이 포켓몬에 붙일 수 있다.",
    },
    weakness: "water",
    retreat: 2,
    usageRate: 34,
  },
  "sv3pt5-200": {
    id: "sv3pt5-200",
    nameKo: "리자몽 ex",
    nameJa: "リザードンex",
    nameEn: "Charizard ex",
    type: "fire",
    hp: 330,
    rarity: "SAR",
    setId: "sv3pt5",
    setNameKo: "포켓몬 151",
    cardNumber: "200/165",
    illustrator: "Atsushi Furusawa",
    imageUrl: "https://images.pokemontcg.io/sv3pt5/200_hires.png",
    attacks: [
      {
        name: "화염날개",
        cost: ["fire", "colorless"],
        damage: 60,
        text: "불꽃 에너지 1장을 패에서 이 포켓몬에 붙인다.",
      },
      {
        name: "불꽃폭풍",
        cost: ["fire", "fire", "colorless", "colorless"],
        damage: 330,
        text: "이 포켓몬에 붙어 있는 불꽃 에너지를 2장 버린다.",
      },
    ],
    ability: {
      name: "불꽃의 혼",
      text: "자신의 차례에, 패에서 불꽃 에너지를 원하는 만큼 이 포켓몬에 붙일 수 있다.",
    },
    weakness: "water",
    retreat: 2,
    usageRate: 29,
  },
  "sv3pt5-205": {
    id: "sv3pt5-205",
    nameKo: "뮤 ex",
    nameJa: "ミュウex",
    nameEn: "Mew ex",
    type: "psychic",
    hp: 180,
    rarity: "SAR",
    setId: "sv3pt5",
    setNameKo: "포켓몬 151",
    cardNumber: "205/165",
    illustrator: "Ryota Murayama",
    imageUrl: "https://images.pokemontcg.io/sv3pt5/205_hires.png",
    attacks: [
      {
        name: "유전자합성",
        cost: ["colorless"],
        damage: undefined,
        text: "덱에서 에너지 카드를 1장 찾아 이 포켓몬에 붙인다.",
      },
      {
        name: "테크노버스터",
        cost: ["psychic", "psychic", "colorless"],
        damage: 210,
        text: "이 포켓몬에 붙어있는 특수에너지 수 × 30 추가 데미지.",
      },
    ],
    ability: {
      name: "신비의 꼬리",
      text: "이 포켓몬이 배틀 포켓몬일 때, 상대의 공격에 의해 기절하지 않는다. (효과 무효는 계속 적용된다.)",
    },
    weakness: "darkness",
    retreat: 1,
    usageRate: 18,
  },
  "sv3pt5-207": {
    id: "sv3pt5-207",
    nameKo: "뮤츠 ex",
    nameJa: "ミュウツーex",
    nameEn: "Mewtwo ex",
    type: "psychic",
    hp: 340,
    rarity: "SAR",
    setId: "sv3pt5",
    setNameKo: "포켓몬 151",
    cardNumber: "207/165",
    illustrator: "Souichirou Gunjima",
    imageUrl: "https://images.pokemontcg.io/sv3pt5/207_hires.png",
    attacks: [
      {
        name: "사이코드라이브",
        cost: ["psychic", "colorless"],
        damage: 60,
        text: "상대 배틀 포켓몬에 붙어있는 에너지 수 × 20 추가 데미지.",
      },
      {
        name: "마인드제이커",
        cost: ["psychic", "psychic", "colorless", "colorless"],
        damage: 200,
        text: "상대는 패에서 카드를 3장 버린다.",
      },
    ],
    weakness: "darkness",
    retreat: 2,
    usageRate: 8,
  },
  "sv3pt5-215": {
    id: "sv3pt5-215",
    nameKo: "피카츄 ex",
    nameJa: "ピカチュウex",
    nameEn: "Pikachu ex",
    type: "lightning",
    hp: 190,
    rarity: "SAR",
    setId: "sv3pt5",
    setNameKo: "포켓몬 151",
    cardNumber: "215/165",
    illustrator: "Eri Yamaki",
    imageUrl: "https://images.pokemontcg.io/sv3pt5/215_hires.png",
    attacks: [
      {
        name: "빠른번개",
        cost: ["lightning"],
        damage: 30,
        text: "동전을 1번 던져 앞면이면, 상대 배틀 포켓몬을 마비 상태로 만든다.",
      },
      {
        name: "10만볼트",
        cost: ["lightning", "lightning", "colorless"],
        damage: 200,
        text: "이 포켓몬에게 에너지를 3장 버린다.",
      },
    ],
    weakness: "fighting",
    retreat: 1,
    usageRate: 21,
  },
  "sv4pt5-176": {
    id: "sv4pt5-176",
    nameKo: "아마루르가 ex",
    nameJa: "アマルルガex",
    nameEn: "Aurorus ex",
    type: "water",
    hp: 280,
    rarity: "SAR",
    setId: "sv4pt5",
    setNameKo: "파라다이스 드래고나",
    cardNumber: "176/184",
    illustrator: "Kouki Saitou",
    imageUrl: "https://images.pokemontcg.io/sv4pt5/176_hires.png",
    attacks: [
      {
        name: "프리즈 블라스트",
        cost: ["water", "colorless"],
        damage: 70,
        text: "동전을 1번 던져 앞면이면 상대 배틀 포켓몬을 잠재움 상태로 만든다.",
      },
      {
        name: "오로라 블리자드",
        cost: ["water", "water", "colorless"],
        damage: 160,
        text: "상대 벤치 포켓몬 전원에게 30 데미지.",
      },
    ],
    ability: {
      name: "냉기의 베일",
      text: "이 포켓몬이 배틀 포켓몬인 동안, 양 플레이어의 포켓몬은 특수 상태가 되지 않는다.",
    },
    weakness: "metal",
    retreat: 3,
    usageRate: 7,
  },
  "sv4pt5-182": {
    id: "sv4pt5-182",
    nameKo: "가이오가 ex",
    nameJa: "カイオーガex",
    nameEn: "Kyogre ex",
    type: "water",
    hp: 340,
    rarity: "SAR",
    setId: "sv4pt5",
    setNameKo: "파라다이스 드래고나",
    cardNumber: "182/184",
    illustrator: "Naoki Saito",
    imageUrl: "https://images.pokemontcg.io/sv4pt5/182_hires.png",
    attacks: [
      {
        name: "파도타기",
        cost: ["water", "colorless"],
        damage: 60,
        text: null as unknown as string,
      },
      {
        name: "오리진 오션",
        cost: ["water", "water", "water", "colorless"],
        damage: 300,
        text: "이 포켓몬에 붙어있는 물 에너지를 3장 버린다. 상대 벤치 포켓몬 전원에게 30 데미지.",
      },
    ],
    weakness: "lightning",
    retreat: 3,
    usageRate: 5,
  },
  "sv4pt5-191": {
    id: "sv4pt5-191",
    nameKo: "리자몽 ex",
    nameJa: "リザードンex",
    nameEn: "Charizard ex",
    type: "fire",
    hp: 330,
    rarity: "SAR",
    setId: "sv4pt5",
    setNameKo: "파라다이스 드래고나",
    cardNumber: "191/184",
    illustrator: "Sanosuke Sakuma",
    imageUrl: "https://images.pokemontcg.io/sv4pt5/191_hires.png",
    attacks: [
      {
        name: "화염날개",
        cost: ["fire", "colorless"],
        damage: 60,
        text: "불꽃 에너지 1장을 패에서 이 포켓몬에 붙인다.",
      },
      {
        name: "불꽃폭풍",
        cost: ["fire", "fire", "colorless", "colorless"],
        damage: 330,
        text: "이 포켓몬에 붙어 있는 불꽃 에너지를 2장 버린다.",
      },
    ],
    ability: {
      name: "불꽃의 혼",
      text: "자신의 차례에, 패에서 불꽃 에너지를 원하는 만큼 이 포켓몬에 붙일 수 있다.",
    },
    weakness: "water",
    retreat: 2,
    usageRate: 31,
  },
  "m5-118": {
    id: "m5-118",
    nameKo: "메가다크라이 ex",
    nameJa: "メガダークライex",
    nameEn: "Mega Darkrai ex",
    type: "darkness",
    hp: 220,
    rarity: "MUR",
    setId: "m5",
    setNameKo: "아비스아이",
    cardNumber: "118/100",
    illustrator: "Naoki Saito",
    imageUrl: "https://images.pokemontcg.io/sm12/65_hires.png",
    attacks: [
      {
        name: "다크 어비스",
        cost: ["darkness", "darkness"],
        damage: 80,
        text: "상대 배틀 포켓몬을 잠재움 상태로 만든다.",
      },
      {
        name: "다크 팬텀",
        cost: ["darkness", "darkness", "darkness"],
        damage: 180,
        text: "상대 포켓몬이 수면 상태이면 +100 데미지. 이 포켓몬에 에너지 카드를 1장 버린다.",
      },
    ],
    ability: {
      name: "나이트메어 씰",
      text: "이 포켓몬이 배틀 포켓몬인 동안, 상대는 서포트를 낼 수 없다.",
    },
    weakness: "fighting",
    resistance: "psychic",
    retreat: 2,
    usageRate: 23,
  },
  "m5-120": {
    id: "m5-120",
    nameKo: "드라파르트 ex",
    nameJa: "ドラパルトex",
    nameEn: "Dragapult ex",
    type: "dragon",
    hp: 300,
    rarity: "RR",
    setId: "m5",
    setNameKo: "아비스아이",
    cardNumber: "120/100",
    illustrator: "PLANETA Tsuji",
    imageUrl: "https://images.pokemontcg.io/sv5/200_hires.png",
    attacks: [
      {
        name: "드래곤 스톰",
        cost: ["fire", "psychic"],
        damage: 70,
        text: "이 포켓몬에 붙어있는 에너지를 원하는 만큼 상대 포켓몬에게 이동시킨다.",
      },
      {
        name: "판타즘 다이브",
        cost: ["fire", "psychic", "colorless"],
        damage: 190,
        text: "상대 벤치 포켓몬 2마리에게 50 데미지씩.",
      },
    ],
    weakness: "darkness",
    retreat: 1,
    usageRate: 19,
  },
  "m5-007": {
    id: "m5-007",
    nameKo: "다크파치",
    nameJa: "ダークパッチ",
    nameEn: "Dark Patch",
    type: "darkness",
    hp: 0,
    rarity: "U",
    setId: "m5",
    setNameKo: "아비스아이",
    cardNumber: "007/100",
    illustrator: "Ryo Ueda",
    imageUrl: "https://images.pokemontcg.io/bw2/117_hires.png",
    usageRate: 71,
  },
  "m5-061": {
    id: "m5-061",
    nameKo: "부스터에너지",
    nameJa: "ブースターエネルギー",
    nameEn: "Booster Energy",
    type: "colorless",
    hp: 0,
    rarity: "U",
    setId: "m5",
    setNameKo: "아비스아이",
    cardNumber: "061/100",
    illustrator: "Ryo Ueda",
    imageUrl: "https://images.pokemontcg.io/sv5/196_hires.png",
    usageRate: 45,
  },
  "m5-055": {
    id: "m5-055",
    nameKo: "마니아",
    nameJa: "マニア",
    nameEn: "Mania",
    type: "colorless",
    hp: 0,
    rarity: "R",
    setId: "m5",
    setNameKo: "아비스아이",
    cardNumber: "055/100",
    illustrator: "Hideki Ishikawa",
    imageUrl: "https://images.pokemontcg.io/sv5/186_hires.png",
    usageRate: 62,
  },
};

// ── 카드 기본 정보 보강 (pokemontcg.io v2 스키마 기준) ──────────────────────────
// 진화 라인·서브타입·레귤레이션·도감 설명 등 시세 외 메타데이터. CARDS 에 병합.
const EX_RULE = "포켓몬 ex의 룰: 이 포켓몬이 기절하면 상대는 프라이즈 카드를 2장 가져갑니다.";
const MEGA_RULE = "메가포켓몬의 룰: 이 포켓몬이 기절하면 상대는 프라이즈 카드를 3장 가져갑니다.";
const ALL_LEGAL = { standard: "Legal", expanded: "Legal", unlimited: "Legal" } as const;

const CARD_DETAIL_EXTRA: Record<string, Partial<CardGameCard>> = {
  "sv8-180": {
    supertype: "Pokémon", subtypes: ["기본", "ex"], regulationMark: "H",
    legalities: ALL_LEGAL, nationalPokedexNumbers: [143], rules: [EX_RULE],
    flavorText: "한 번 잠들면 어지간한 일로는 깨어나지 않는다. 배 위에서 노는 아이들도 있다.",
  },
  "sv1-198": {
    supertype: "Pokémon", subtypes: ["2진화", "ex"], evolvesFrom: "리자드", regulationMark: "G",
    legalities: ALL_LEGAL, nationalPokedexNumbers: [6], rules: [EX_RULE],
    flavorText: "거대한 불꽃을 뿜어 무엇이든 태운다. 강한 상대를 찾아 하늘 높이 날아오른다.",
  },
  "sv3pt5-200": {
    supertype: "Pokémon", subtypes: ["2진화", "ex"], evolvesFrom: "리자드", regulationMark: "G",
    legalities: ALL_LEGAL, nationalPokedexNumbers: [6], rules: [EX_RULE],
    flavorText: "거대한 불꽃을 뿜어 무엇이든 태운다. 강한 상대를 찾아 하늘 높이 날아오른다.",
  },
  "sv3pt5-205": {
    supertype: "Pokémon", subtypes: ["기본", "ex"], regulationMark: "G",
    legalities: ALL_LEGAL, nationalPokedexNumbers: [151], rules: [EX_RULE],
    flavorText: "모든 포켓몬의 유전자를 지녔다고 전해진다. 평소엔 모습을 감추고 있다.",
  },
  "sv3pt5-207": {
    supertype: "Pokémon", subtypes: ["기본", "ex"], regulationMark: "G",
    legalities: ALL_LEGAL, nationalPokedexNumbers: [150], rules: [EX_RULE],
    flavorText: "유전자 조작으로 만들어진 포켓몬. 그 마음에는 한 줌의 자비도 없다.",
  },
  "sv3pt5-215": {
    supertype: "Pokémon", subtypes: ["기본", "ex"], regulationMark: "G",
    legalities: ALL_LEGAL, nationalPokedexNumbers: [25], rules: [EX_RULE],
    flavorText: "볼의 전기 주머니에 전기를 모은다. 놀라거나 화가 나면 단숨에 방전한다.",
  },
  "sv4pt5-176": {
    supertype: "Pokémon", subtypes: ["1진화", "ex"], evolvesFrom: "아마루스", regulationMark: "H",
    legalities: ALL_LEGAL, nationalPokedexNumbers: [699], rules: [EX_RULE],
    flavorText: "혹독한 추위의 고대에 살았다. 영하의 냉기를 뿜어 주위를 얼려 버린다.",
  },
  "sv4pt5-182": {
    supertype: "Pokémon", subtypes: ["기본", "ex"], regulationMark: "H",
    legalities: ALL_LEGAL, nationalPokedexNumbers: [382], rules: [EX_RULE],
    flavorText: "큰비를 부른다고 전해지는 전설의 포켓몬. 태고에 바다를 넓혔다고 한다.",
  },
  "sv4pt5-191": {
    supertype: "Pokémon", subtypes: ["2진화", "ex"], evolvesFrom: "리자드", regulationMark: "H",
    legalities: ALL_LEGAL, nationalPokedexNumbers: [6], rules: [EX_RULE],
    flavorText: "거대한 불꽃을 뿜어 무엇이든 태운다. 강한 상대를 찾아 하늘 높이 날아오른다.",
  },
  "m5-118": {
    supertype: "Pokémon", subtypes: ["메가진화", "ex"], evolvesFrom: "다크라이 ex", regulationMark: "I",
    legalities: ALL_LEGAL, nationalPokedexNumbers: [491], rules: [MEGA_RULE],
    flavorText: "메가진화로 칠흑의 힘이 폭주한다. 닿는 모든 것을 끝없는 악몽 속으로 끌어들인다.",
  },
  "m5-120": {
    supertype: "Pokémon", subtypes: ["2진화", "ex"], evolvesFrom: "드라꼰", regulationMark: "I",
    legalities: ALL_LEGAL, nationalPokedexNumbers: [887], rules: [EX_RULE],
    flavorText: "드메기리를 뿔 속에 품고 시속 300km로 쏘아 보낸다. 부모 자식의 유대가 깊다.",
  },
  "m5-007": {
    supertype: "Trainer", subtypes: ["아이템"], regulationMark: "I", legalities: ALL_LEGAL,
  },
  "m5-061": {
    supertype: "Energy", subtypes: ["특수 에너지"], regulationMark: "I", legalities: ALL_LEGAL,
  },
  "m5-055": {
    supertype: "Trainer", subtypes: ["서포트"], regulationMark: "I", legalities: ALL_LEGAL,
  },
};

for (const [id, extra] of Object.entries(CARD_DETAIL_EXTRA)) {
  if (CARDS[id]) Object.assign(CARDS[id], extra);
}

// ── 확장팩 데이터 ──────────────────────────────────────────────────────────────

export const SETS: CardGameSet[] = [
  {
    id: "m5",
    nameKo: "아비스아이",
    nameJa: "アビスアイ",
    code: "M5",
    jpReleaseDate: "2025-01-24",
    krReleaseDate: "2025-02-28",
    cardCount: 100,
    heroImageUrl: "https://images.pokemontcg.io/sv8/logo.png",
    description:
      "심해의 어둠을 배경으로 메가다크라이 ex와 드라파르트 ex가 주역. 새로운 MUR 레어리티와 나이트메어 메카닉 도입.",
    newMechanic: "나이트메어 메카닉 — 배틀 포켓몬 잠재움 시 추가 효과 발동",
  },
  {
    id: "m4",
    nameKo: "닌자스피너",
    nameJa: "ニンジャスピナー",
    code: "M4",
    jpReleaseDate: "2024-10-18",
    krReleaseDate: "2024-11-29",
    cardCount: 96,
    heroImageUrl: "https://images.pokemontcg.io/sv7/logo.png",
    description:
      "카미츠오로치 ex와 루카리오 ex를 중심으로 한 닌자 테마 확장팩. 고속 에너지 가속 덱이 환경을 지배했던 시즌.",
    newMechanic: "급습 메카닉 — 첫 턴 선공 공격 가능 조건 완화",
  },
  {
    id: "m3",
    nameKo: "메가몰드",
    nameJa: "メガモールド",
    code: "M3",
    jpReleaseDate: "2024-07-19",
    krReleaseDate: "2024-08-30",
    cardCount: 88,
    heroImageUrl: "https://images.pokemontcg.io/sv5/logo.png",
    description:
      "야도킹과 대형 포켓몬 위주의 컨트롤 환경. UR 희귀도 최초 도입 시즌.",
    newMechanic: "UR 희귀도 — 기존 SAR 위에 새로운 최상위 레어 등급 추가",
  },
  {
    id: "m2",
    nameKo: "메가다크나이트",
    nameJa: "メガダークナイト",
    code: "M2",
    jpReleaseDate: "2024-04-26",
    krReleaseDate: "2024-06-07",
    cardCount: 82,
    heroImageUrl: "https://images.pokemontcg.io/sv4pt5/logo.png",
    description:
      "어둠 타입 메가 포켓몬 특집. 지금도 현역인 다크파치 트레이너 카드가 처음 수록된 팩.",
    newMechanic: "메가진화 — 특정 조건 달성 시 포켓몬 ex가 메가 폼으로 변신",
  },
];

// ── 덱 아키타입 ───────────────────────────────────────────────────────────────

export const ARCHETYPES: DeckArchetype[] = [
  {
    id: "mega-darkrai",
    nameKo: "메가다크라이ex",
    tier: "S",
    regulation: "스탠다드",
    usageRate: 23,
    winCount: 47,
    avgRank: 3.2,
    heroCardIds: ["m5-118", "m5-007", "m5-055", "m5-061"],
    cardList: [
      { cardId: "m5-118", count: 3, role: "✓" },
      { cardId: "m5-007", count: 4, role: "✓" },
      { cardId: "m5-055", count: 2, role: "✓" },
      { cardId: "m5-061", count: 3, role: "✓" },
      { cardId: "sv3pt5-207", count: 1, role: "⚠" },
    ],
    variants: [
      { id: "mega-darkrai-turbo", nameKo: "터보 다크라이" },
      { id: "mega-darkrai-control", nameKo: "컨트롤 다크라이" },
    ],
    strengths: ["나이트메어 씰로 서포트 봉쇄", "다크파치 4장 에너지 가속", "수면 시너지"],
    weaknesses: ["격투 타입 약점", "에너지 제거에 취약", "초기 손패 의존"],
    counters: ["kamichu-cobra", "slowking"],
    description:
      "메가다크라이 ex의 특성 '나이트메어 씰'로 상대 서포트를 봉쇄하면서 다크파치로 에너지를 빠르게 가속하는 S 티어 덱. 수면 상태에서 대미지가 폭발적으로 늘어난다.",
  },
  {
    id: "dragapult",
    nameKo: "드라파르트ex",
    tier: "A",
    regulation: "스탠다드",
    usageRate: 19,
    winCount: 31,
    avgRank: 4.1,
    heroCardIds: ["m5-120", "m5-061", "sv3pt5-205", "m5-055"],
    cardList: [
      { cardId: "m5-120", count: 4, role: "✓" },
      { cardId: "sv3pt5-205", count: 2, role: "⚠" },
      { cardId: "m5-055", count: 2, role: "✓" },
      { cardId: "m5-061", count: 2, role: "✓" },
    ],
    variants: [
      { id: "dragapult-mew", nameKo: "드라파르트+뮤ex" },
    ],
    strengths: ["벤치 스프레드 딜링", "에너지 이동 융통성", "선공 가능"],
    weaknesses: ["어둠 타입 약점", "단일 기절이 느림", "특성 의존"],
    counters: ["mega-darkrai", "slowking"],
    description:
      "판타즘 다이브로 벤치까지 스프레드 대미지를 주며 상대 자원을 고갈시키는 A 티어 덱. 부스터에너지로 한방 데미지도 보완한다.",
  },
  {
    id: "mega-lucario",
    nameKo: "메가루카리오ex",
    tier: "A",
    regulation: "스탠다드",
    usageRate: 15,
    winCount: 24,
    avgRank: 4.8,
    heroCardIds: ["sv3pt5-215", "m5-007", "sv3pt5-207", "m5-055"],
    cardList: [
      { cardId: "sv3pt5-215", count: 3, role: "✓" },
      { cardId: "m5-007", count: 3, role: "✓" },
      { cardId: "m5-055", count: 2, role: "✓" },
    ],
    variants: [
      { id: "mega-lucario-ex", nameKo: "순정 루카리오" },
      { id: "mega-lucario-spread", nameKo: "루카리오+피카츄" },
    ],
    strengths: ["격투 타입 폭발력", "다크라이 카운터", "안정적인 가속"],
    weaknesses: ["에스퍼 약점", "벤치 폭이 좁음"],
    counters: ["mega-darkrai"],
    description:
      "격투 타입의 높은 기본 화력으로 어둠 타입 덱을 카운터하는 A 티어. 특히 메가다크라이 대전에서 약점 2배를 활용한다.",
  },
  {
    id: "kamichu-cobra",
    nameKo: "카미츠오로치ex",
    tier: "B",
    regulation: "스탠다드",
    usageRate: 11,
    winCount: 16,
    avgRank: 6.2,
    heroCardIds: ["sv4pt5-176", "sv4pt5-182", "m5-007", "m5-055"],
    cardList: [
      { cardId: "sv4pt5-176", count: 2, role: "✓" },
      { cardId: "sv4pt5-182", count: 2, role: "✓" },
      { cardId: "m5-007", count: 3, role: "✓" },
      { cardId: "m5-055", count: 2, role: "✓" },
    ],
    variants: [
      { id: "kamichu-pure", nameKo: "순정 카미츠" },
    ],
    strengths: ["독 + 화상 콤보", "내구력 높음", "상태이상 시너지"],
    weaknesses: ["느린 셋업", "특성 의존", "대구경 원킬 취약"],
    counters: ["dragapult"],
    description:
      "독과 화상 상태이상을 중첩해 지속 대미지로 승리하는 B 티어 컨트롤 덱.",
  },
  {
    id: "slowking",
    nameKo: "야도킹",
    tier: "C",
    regulation: "스탠다드",
    usageRate: 6,
    winCount: 8,
    avgRank: 8.5,
    heroCardIds: ["sv8-180", "sv3pt5-205", "m5-055", "m5-061"],
    cardList: [
      { cardId: "sv8-180", count: 3, role: "✓" },
      { cardId: "sv3pt5-205", count: 2, role: "⚠" },
      { cardId: "m5-055", count: 2, role: "✓" },
      { cardId: "m5-061", count: 2, role: "✓" },
    ],
    variants: [
      { id: "slowking-turbo", nameKo: "잠만보 터보" },
    ],
    strengths: ["상대 덱 밀기", "패 압박"],
    weaknesses: ["느린 템포", "화력 부족", "환경 불리"],
    counters: ["mega-darkrai", "dragapult", "mega-lucario", "kamichu-cobra"],
    description:
      "상대 덱과 패를 지속적으로 압박하는 컨트롤 전략이지만 현 스탠다드 환경에서 C 티어에 머물고 있다.",
  },
];

// ── 대회 데이터 ───────────────────────────────────────────────────────────────

export const TOURNAMENTS: Tournament[] = [
  {
    id: "kr-private-001",
    nameKo: "서울 사설 오픈 #1",
    date: "2026-05-10",
    region: "KR",
    format: "스탠다드",
    players: 64,
    winnerArchetype: "mega-darkrai",
    status: "completed",
  },
  {
    id: "kr-private-002",
    nameKo: "부산 챌린저스컵",
    date: "2026-05-03",
    region: "KR",
    format: "스탠다드",
    players: 48,
    winnerArchetype: "dragapult",
    status: "completed",
  },
  {
    id: "kr-private-003",
    nameKo: "대전 홀리데이컵",
    date: "2026-04-26",
    region: "KR",
    format: "익스텐디드",
    players: 32,
    winnerArchetype: "mega-lucario",
    status: "completed",
  },
  {
    id: "kr-city-001",
    nameKo: "서울 시티리그 스프링",
    date: "2026-05-17",
    region: "KR",
    format: "스탠다드",
    players: 128,
    winnerArchetype: "mega-darkrai",
    status: "completed",
  },
  {
    id: "kr-city-002",
    nameKo: "부산 시티리그 스프링",
    date: "2026-05-18",
    region: "KR",
    format: "스탠다드",
    players: 96,
    winnerArchetype: "dragapult",
    status: "completed",
  },
  {
    id: "kr-city-003",
    nameKo: "대구 시티리그 스프링",
    date: "2026-06-07",
    region: "KR",
    format: "스탠다드",
    players: 80,
    status: "upcoming",
  },
  {
    id: "kr-city-004",
    nameKo: "인천 시티리그 스프링",
    date: "2026-06-14",
    region: "KR",
    format: "스탠다드",
    players: 64,
    status: "upcoming",
  },
  {
    id: "kr-cl-001",
    nameKo: "CL 서울 2026 스프링",
    date: "2026-04-19",
    region: "KR",
    format: "스탠다드",
    players: 512,
    winnerArchetype: "mega-darkrai",
    status: "completed",
  },
  {
    id: "jp-cl-001",
    nameKo: "CL 오사카 2026",
    date: "2026-03-15",
    region: "JP",
    format: "스탠다드",
    players: 1024,
    winnerArchetype: "mega-darkrai",
    status: "completed",
  },
  {
    id: "jp-pjcs-001",
    nameKo: "포켓몬 저팬 챔피언십 2026",
    date: "2026-06-28",
    region: "JP",
    format: "스탠다드",
    players: 2048,
    status: "upcoming",
  },
];

// ── 플레이어 랭킹 ─────────────────────────────────────────────────────────────

export const PLAYER_RANKINGS: PlayerRanking[] = [
  { rank: 1,  name: "박재현",   csp: 2840, favArchetype: "메가다크라이ex", wins: 12 },
  { rank: 2,  name: "Yamamoto", csp: 2710, favArchetype: "드라파르트ex",   wins: 10 },
  { rank: 3,  name: "이민준",   csp: 2630, favArchetype: "메가다크라이ex", wins: 9  },
  { rank: 4,  name: "Tanaka",   csp: 2580, favArchetype: "카미츠오로치ex", wins: 8  },
  { rank: 5,  name: "김도윤",   csp: 2490, favArchetype: "메가루카리오ex", wins: 7  },
  { rank: 6,  name: "최서연",   csp: 2340, favArchetype: "드라파르트ex",   wins: 7  },
  { rank: 7,  name: "Sato",     csp: 2210, favArchetype: "메가다크라이ex", wins: 6  },
  { rank: 8,  name: "정유진",   csp: 2180, favArchetype: "야도킹",         wins: 5  },
  { rank: 9,  name: "Kobayashi",csp: 2050, favArchetype: "메가루카리오ex", wins: 5  },
  { rank: 10, name: "한지우",   csp: 1980, favArchetype: "드라파르트ex",   wins: 4  },
];

// ── 팩 당김 확률 ──────────────────────────────────────────────────────────────

export const PULL_RATES: Record<string, PullRateRow[]> = {
  m5: [
    { rarity: "C",   types: 46, probability: 58.20, perBox: "~20.9장" },
    { rarity: "U",   types: 28, probability: 22.30, perBox: "~8.0장"  },
    { rarity: "R",   types: 18, probability: 10.10, perBox: "~3.6장"  },
    { rarity: "RR",  types: 8,  probability:  4.80, perBox: "~1.7장"  },
    { rarity: "AR",  types: 6,  probability:  2.40, perBox: "~0.9장"  },
    { rarity: "SR",  types: 4,  probability:  1.20, perBox: "~0.4장"  },
    { rarity: "SAR", types: 4,  probability:  0.70, perBox: "~0.3장"  },
    { rarity: "UR",  types: 2,  probability:  0.25, perBox: "~0.09장" },
    { rarity: "MUR", types: 1,  probability:  0.05, perBox: "~0.02장" },
  ],
  m4: [
    { rarity: "C",   types: 42, probability: 59.10, perBox: "~21.3장" },
    { rarity: "U",   types: 26, probability: 22.80, perBox: "~8.2장"  },
    { rarity: "R",   types: 16, probability:  9.80, perBox: "~3.5장"  },
    { rarity: "RR",  types: 7,  probability:  4.50, perBox: "~1.6장"  },
    { rarity: "AR",  types: 5,  probability:  2.20, perBox: "~0.8장"  },
    { rarity: "SR",  types: 3,  probability:  1.00, perBox: "~0.4장"  },
    { rarity: "SAR", types: 3,  probability:  0.55, perBox: "~0.2장"  },
    { rarity: "UR",  types: 1,  probability:  0.05, perBox: "~0.02장" },
  ],
};

// ── 룰 & 재정 ─────────────────────────────────────────────────────────────────

export const RULINGS: Ruling[] = [
  {
    id: "r001",
    cardId: "m5-118",
    question: "나이트메어 씰 특성이 적용 중일 때, 상대가 이미 패에 있는 서포트를 낼 수 없나요?",
    answer:
      "그렇습니다. 나이트메어 씰은 서포트 카드를 내는 행위 자체를 금지합니다. 메가다크라이 ex가 배틀 포켓몬인 동안 상대는 서포트를 내는 효과를 사용할 수 없습니다.",
    sourceUrl: "https://www.pokemon-card.com/rules/",
  },
  {
    id: "r002",
    cardId: "m5-118",
    question: "다크 팬텀 공격 시, 수면 상태 판정은 대미지 계산 전인가요 후인가요?",
    answer:
      "대미지 계산 전에 판정합니다. 공격 선언 시점에 상대 배틀 포켓몬이 수면 상태면 +100 보너스가 적용됩니다.",
    sourceUrl: "https://www.pokemon-card.com/rules/",
  },
  {
    id: "r003",
    cardId: "sv3pt5-205",
    question: "신비의 꼬리 특성과 나이트메어 씰 특성이 동시에 적용되면 어떻게 되나요?",
    answer:
      "나이트메어 씰은 서포트 사용을 금지하고, 신비의 꼬리는 공격에 의한 기절을 방지합니다. 두 효과는 독립적으로 적용됩니다. 단, 뮤 ex가 배틀 포켓몬일 때는 나이트메어 씰이 적용되지 않습니다(메가다크라이가 배틀이 아니므로).",
    sourceUrl: "https://www.pokemon-card.com/rules/",
  },
  {
    id: "r004",
    cardId: "m5-007",
    question: "다크파치는 자신의 차례에 몇 번이나 낼 수 있나요?",
    answer:
      "트레이너(아이템) 카드이므로 한 차례에 여러 장 낼 수 있습니다. 단, 각 장마다 효과가 발동되므로 에너지가 충분히 버려져 있어야 합니다.",
    sourceUrl: "https://www.pokemon-card.com/rules/",
  },
  {
    id: "r005",
    cardId: "m5-120",
    question: "드래곤 스톰으로 에너지를 이동할 때, 특수 에너지도 이동 가능한가요?",
    answer:
      "네, 특수 에너지도 이동 가능합니다. 단, 이동된 에너지가 붙는 포켓몬의 에너지 조건과 무관하게 붙습니다.",
  },
  {
    id: "r006",
    question: "같은 턴에 포켓몬 ex가 기절한 경우 프라이즈 카드는 몇 장 가져가나요?",
    answer:
      "포켓몬 ex가 기절하면 상대방은 프라이즈 카드를 2장 가져갑니다. 메가 포켓몬 ex도 동일하게 2장입니다.",
  },
  {
    id: "r007",
    cardId: "sv4pt5-176",
    question: "냉기의 베일 특성은 자신의 포켓몬에게도 적용되나요?",
    answer:
      "네, 냉기의 베일은 양 플레이어의 모든 포켓몬에게 적용됩니다. 아마루르가 ex를 사용하는 플레이어도 자신의 포켓몬을 특수 상태로 만들 수 없습니다.",
  },
  {
    id: "r008",
    question: "레귤레이션 마크 'F' 카드는 스탠다드 포맷에서 사용 가능한가요?",
    answer:
      "현재 스탠다드 포맷 사용 가능 레귤레이션 마크는 G, H, I 입니다. F 마크 카드는 익스텐디드 포맷에서만 사용 가능합니다.",
  },
  {
    id: "r009",
    question: "부스터에너지는 포켓몬 ex에 붙일 수 있나요?",
    answer:
      "아니요, 부스터에너지는 진화 전 포켓몬(베이직) 또는 1진화 포켓몬에게만 붙일 수 있습니다. 포켓몬 ex는 별도의 규칙이 적용됩니다. 카드 텍스트를 반드시 확인하세요.",
  },
  {
    id: "r010",
    question: "대전 중 덱 셔플은 언제 할 수 있나요?",
    answer:
      "서치 효과나 덱 관련 카드 사용 후 셔플이 필요할 때 공개적으로 진행합니다. 임의로 덱을 확인하거나 셔플하는 행위는 규정 위반입니다.",
  },
];

// ── 용어 사전 ─────────────────────────────────────────────────────────────────

export const GLOSSARY: GlossaryEntry[] = [
  {
    term: "포켓몬 ex",
    definition:
      "스칼렛&바이올렛 시리즈부터 등장한 강력한 포켓몬 카드. 기절 시 상대에게 프라이즈 카드 2장을 준다.",
    example: "리자몽 ex, 뮤 ex, 메가다크라이 ex",
  },
  {
    term: "메가 포켓몬 ex",
    definition:
      "포켓몬 ex의 메가진화 형태. MUR(메가 울트라 레어) 희귀도로만 등장하며 강력한 특성과 기술을 보유.",
    example: "메가다크라이 ex",
  },
  {
    term: "특성",
    definition:
      "배틀 중 자동으로 발동되거나 조건부로 사용할 수 있는 포켓몬 고유 능력. 같은 이름의 특성은 중복 발동되지 않는 경우가 많다.",
    example: "나이트메어 씰, 불꽃의 혼",
  },
  {
    term: "서포트",
    definition:
      "트레이너 카드의 한 종류. 강력한 드로우·서치 효과를 갖지만 한 턴에 1장만 낼 수 있다.",
    example: "마니아, 박사의 연구",
  },
  {
    term: "아이템",
    definition:
      "트레이너 카드의 한 종류. 한 턴에 제한 없이 여러 장 사용 가능한 트레이너 카드.",
    example: "다크파치, 네스트볼",
  },
  {
    term: "스탠다드 포맷",
    definition:
      "최근 3개 시즌의 레귤레이션 마크 카드만 사용 가능한 공식 대회 포맷. 현재 G·H·I 마크 허용.",
  },
  {
    term: "익스텐디드 포맷",
    definition:
      "스탠다드보다 더 많은 과거 카드를 허용하는 포맷. 강력한 구 카드들이 환경을 지배한다.",
  },
  {
    term: "殿堂(전당) 포맷",
    definition:
      "카드별 포인트 상한을 두고 덱을 구성하는 포맷. 강력한 카드일수록 높은 포인트가 부여된다.",
  },
  {
    term: "MUR",
    definition:
      "메가 울트라 레어. 가장 높은 희귀도 등급으로 박스당 평균 0.02장 수록. 메가 포켓몬 ex 전용.",
    example: "메가다크라이 ex MUR",
  },
  {
    term: "SAR",
    definition:
      "스페셜 아트 레어. 일러스트가 카드 전체를 가득 채우는 고급 사양 카드. 박스당 평균 0.3장.",
  },
  {
    term: "에너지 가속",
    definition:
      "기본 1장/턴 에너지 부착 규칙을 우회해 추가 에너지를 붙이는 전략. 다크파치 같은 카드 활용.",
    example: "다크파치, 엘레사의 전기치료",
  },
  {
    term: "프라이즈 카드",
    definition:
      "게임 시작 시 덱 상단에서 6장을 엎어두는 카드. 상대 포켓몬을 기절시킬 때마다 1장(ex는 2장) 가져온다.",
  },
  {
    term: "티어",
    definition:
      "덱 아키타입의 강도 분류. S > A > B > C 순서이며 S는 환경 최상위, C는 비주류를 의미한다.",
    example: "메가다크라이ex는 현재 S 티어",
  },
  {
    term: "CSP",
    definition:
      "Championship Series Points. 공식 대회 성적에 따라 부여되는 포인트. 월드 초대 기준으로 활용.",
  },
  {
    term: "레귤레이션 마크",
    definition:
      "카드에 인쇄된 알파벳 기호(A~I). 스탠다드 포맷 사용 가능 여부를 결정한다.",
    example: "현재 스탠다드: G, H, I",
  },
  {
    term: "CL",
    definition:
      "Champions League. 국가 규모의 대형 공식 대회. 한국·일본 각지에서 개최되며 CSP가 대량 부여된다.",
    example: "CL 서울, CL 오사카",
  },
  {
    term: "시티리그",
    definition:
      "도시 단위 소규모 공식 대회. CL보다 규모가 작지만 지역 선수들이 CSP를 쌓는 중요 무대.",
  },
  {
    term: "벤치",
    definition:
      "배틀 포켓몬 뒤에 최대 5마리까지 놓을 수 있는 대기 구역. 일부 공격이 벤치 포켓몬에도 대미지를 준다.",
  },
  {
    term: "후퇴비",
    definition:
      "배틀 포켓몬을 벤치로 이동하고 벤치 포켓몬과 교체할 때 필요한 에너지 코스트.",
    example: "잠만보 ex의 후퇴비는 4개",
  },
];

// ── 티어 트렌드 ───────────────────────────────────────────────────────────────

export const TIER_TREND: { week: string; archetypeId: string; usage: number }[] = [
  // 메가다크라이ex
  { week: "3/29", archetypeId: "mega-darkrai",  usage: 14 },
  { week: "4/5",  archetypeId: "mega-darkrai",  usage: 16 },
  { week: "4/12", archetypeId: "mega-darkrai",  usage: 18 },
  { week: "4/19", archetypeId: "mega-darkrai",  usage: 20 },
  { week: "4/26", archetypeId: "mega-darkrai",  usage: 21 },
  { week: "5/3",  archetypeId: "mega-darkrai",  usage: 22 },
  { week: "5/10", archetypeId: "mega-darkrai",  usage: 23 },
  { week: "5/17", archetypeId: "mega-darkrai",  usage: 23 },
  // 드라파르트ex
  { week: "3/29", archetypeId: "dragapult",     usage: 22 },
  { week: "4/5",  archetypeId: "dragapult",     usage: 21 },
  { week: "4/12", archetypeId: "dragapult",     usage: 20 },
  { week: "4/19", archetypeId: "dragapult",     usage: 20 },
  { week: "4/26", archetypeId: "dragapult",     usage: 19 },
  { week: "5/3",  archetypeId: "dragapult",     usage: 19 },
  { week: "5/10", archetypeId: "dragapult",     usage: 18 },
  { week: "5/17", archetypeId: "dragapult",     usage: 19 },
  // 메가루카리오ex
  { week: "3/29", archetypeId: "mega-lucario",  usage: 12 },
  { week: "4/5",  archetypeId: "mega-lucario",  usage: 13 },
  { week: "4/12", archetypeId: "mega-lucario",  usage: 14 },
  { week: "4/19", archetypeId: "mega-lucario",  usage: 15 },
  { week: "4/26", archetypeId: "mega-lucario",  usage: 15 },
  { week: "5/3",  archetypeId: "mega-lucario",  usage: 15 },
  { week: "5/10", archetypeId: "mega-lucario",  usage: 14 },
  { week: "5/17", archetypeId: "mega-lucario",  usage: 15 },
  // 카미츠오로치ex
  { week: "3/29", archetypeId: "kamichu-cobra", usage: 14 },
  { week: "4/5",  archetypeId: "kamichu-cobra", usage: 13 },
  { week: "4/12", archetypeId: "kamichu-cobra", usage: 12 },
  { week: "4/19", archetypeId: "kamichu-cobra", usage: 12 },
  { week: "4/26", archetypeId: "kamichu-cobra", usage: 11 },
  { week: "5/3",  archetypeId: "kamichu-cobra", usage: 11 },
  { week: "5/10", archetypeId: "kamichu-cobra", usage: 10 },
  { week: "5/17", archetypeId: "kamichu-cobra", usage: 11 },
  // 야도킹
  { week: "3/29", archetypeId: "slowking",      usage: 9  },
  { week: "4/5",  archetypeId: "slowking",      usage: 8  },
  { week: "4/12", archetypeId: "slowking",      usage: 7  },
  { week: "4/19", archetypeId: "slowking",      usage: 7  },
  { week: "4/26", archetypeId: "slowking",      usage: 6  },
  { week: "5/3",  archetypeId: "slowking",      usage: 6  },
  { week: "5/10", archetypeId: "slowking",      usage: 6  },
  { week: "5/17", archetypeId: "slowking",      usage: 6  },
];
