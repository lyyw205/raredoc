const POKEMON_NAME_KO: Record<string, string> = {
  // Gen 1
  Bulbasaur: "이상해씨", Ivysaur: "이상해풀", Venusaur: "이상해꽃",
  Charmander: "파이리", Charmeleon: "리자드", Charizard: "리자몽",
  Squirtle: "꼬부기", Wartortle: "어니부기", Blastoise: "거북왕",
  Caterpie: "캐터피", Metapod: "단데기", Butterfree: "버터플",
  Weedle: "뿔충이", Kakuna: "딱충이", Beedrill: "독침붕",
  Pidgey: "구구", Pidgeotto: "피죤", Pidgeot: "피죤투",
  Rattata: "꼬렛", Raticate: "레트라",
  Spearow: "깨비참", Fearow: "깨비드릴조",
  Ekans: "아보", Arbok: "아보크",
  Pikachu: "피카츄", Raichu: "라이츄",
  Sandshrew: "모래두지", Sandslash: "고지",
  "Nidoran♀": "니드런♀", Nidorina: "니드리나", Nidoqueen: "니드퀸",
  "Nidoran♂": "니드런♂", Nidorino: "니드리노", Nidoking: "니드킹",
  Clefairy: "삐삐", Clefable: "픽시",
  Vulpix: "식스테일", Ninetales: "나인테일",
  Jigglypuff: "푸린", Wigglytuff: "푸크린",
  Zubat: "주뱃", Golbat: "골뱃",
  Oddish: "뚜벅초", Gloom: "냄새꼴", Vileplume: "라플레시아",
  Paras: "파라스", Parasect: "파라섹트",
  Venonat: "콘팡", Venomoth: "도나리",
  Diglett: "디그다", Dugtrio: "닥트리오",
  Meowth: "나옹", Persian: "페르시온",
  Psyduck: "고라파덕", Golduck: "골덕",
  Mankey: "망키", Primeape: "성원숭",
  Growlithe: "가디", Arcanine: "윈디",
  Poliwag: "발챙이", Poliwhirl: "슈륙챙이", Poliwrath: "강챙이",
  Abra: "캐이시", Kadabra: "윤겔라", Alakazam: "후딘",
  Machop: "알통몬", Machoke: "근육몬", Machamp: "괴력몬",
  Bellsprout: "모다피", Weepinbell: "우츠동", Victreebel: "우츠보트",
  Tentacool: "왕눈해", Tentacruel: "독파리",
  Geodude: "꼬마돌", Graveler: "데구리", Golem: "딱구리",
  Ponyta: "포니타", Rapidash: "날쌩마",
  Slowpoke: "야돈", Slowbro: "야도란",
  Magnemite: "코일", Magneton: "레어코일",
  "Farfetch'd": "파오리", Doduo: "두두", Dodrio: "두트리오",
  Seel: "쥬쥬", Dewgong: "쥬레곤",
  Grimer: "질퍽이", Muk: "질뻐기",
  Shellder: "셀러", Cloyster: "파르셀",
  Gastly: "고오스", Haunter: "고우스트", Gengar: "팬텀",
  Onix: "롱스톤", Drowzee: "슬리프", Hypno: "슬리퍼",
  Krabby: "크랩", Kingler: "킹크랩",
  Voltorb: "찌리리공", Electrode: "붐볼",
  Exeggcute: "아라", Exeggutor: "나시",
  Cubone: "탕구리", Marowak: "텅구리",
  Hitmonlee: "시라소몬", Hitmonchan: "홍수몬",
  Lickitung: "내루미", Koffing: "도가스", Weezing: "또가스",
  Rhyhorn: "뿔카노", Rhydon: "코뿌리",
  Chansey: "럭키", Tangela: "덩쿠리", Kangaskhan: "캥카",
  Horsea: "쥬만타", Seadra: "시드라",
  Goldeen: "콘치", Seaking: "왕콘치",
  Staryu: "별가사리", Starmie: "아쿠스타",
  "Mr. Mime": "마임맨", Scyther: "스라크", Jynx: "루주라",
  Electabuzz: "에레브", Magmar: "마그마", Pinsir: "쁘사이저",
  Tauros: "켄타로스", Magikarp: "잉어킹", Gyarados: "갸라도스",
  Lapras: "라프라스", Ditto: "메타몽",
  Eevee: "이브이", Vaporeon: "샤워", Jolteon: "쥬피썬더",
  Flareon: "부스터", Porygon: "폴리곤",
  Omanyte: "암나이트", Omastar: "암스타",
  Kabuto: "투구", Kabutops: "투구푸스",
  Aerodactyl: "프테라", Snorlax: "잠만보",
  Articuno: "프리져", Zapdos: "썬더", Moltres: "파이어",
  Dratini: "미뇽", Dragonair: "신뇽", Dragonite: "망나뇽",
  Mewtwo: "뮤츠", Mew: "뮤",
  // Gen 2
  Chikorita: "치코리타", Bayleef: "베이리프", Meganium: "메가니움",
  Cyndaquil: "브케인", Quilava: "마그케인", Typhlosion: "블레이범",
  Totodile: "리아코", Croconaw: "엘리게이", Feraligatr: "엘리게이블",
  Pichu: "피츄", Espeon: "에브이", Umbreon: "블래키",
  Leafeon: "리피아", Glaceon: "글레이시아",
  Suicune: "스이쿤", Raikou: "라이코", Entei: "앤테이",
  Lugia: "루기아", "Ho-Oh": "칠색조", Celebi: "세레비",
  // Gen 3
  Treecko: "나무지기", Grovyle: "나무돌이", Sceptile: "나무킹",
  Torchic: "아차모", Combusken: "영치코", Blaziken: "번치코",
  Mudkip: "물짱이", Marshtomp: "늪짱이", Swampert: "대짱이",
  Gardevoir: "가디안", Absol: "앱솔",
  Latias: "라티아스", Latios: "라티오스",
  Kyogre: "가이오가", Groudon: "그란돈", Rayquaza: "레쿠쟈",
  Jirachi: "지라치", Deoxys: "데옥시스",
  // Gen 4
  Turtwig: "모부기", Grotle: "토대기", Torterra: "토대부기",
  Chimchar: "불꽃숭이", Monferno: "파이숭이", Infernape: "고우캥",
  Piplup: "팽도리", Prinplup: "팽태자", Empoleon: "엠페르트",
  Lucario: "루카리오", Garchomp: "한카리아스",
  Dialga: "디아루가", Palkia: "펄기아", Giratina: "기라티나",
  Darkrai: "다크라이", Arceus: "아르세우스",
  Togekiss: "토게키스",
  // Gen 5
  Snivy: "주리비얀", Servine: "샤비", Serperior: "쟈로다",
  Tepig: "뚜꾸리", Pignite: "채오름", Emboar: "염무왕",
  Oshawott: "수댕이", Dewott: "쌍검자비", Samurott: "대검귀",
  Reshiram: "레시라무", Zekrom: "제크로무", Kyurem: "큐레무",
  Victini: "비크티니", Zoroark: "조로아크", Zorua: "조로아",
  // Gen 6
  Chespin: "도치마론", Fennekin: "푸호", Froakie: "개굴이",
  Greninja: "개굴닌자",
  "Mega Charizard X": "메가리자몽X", "Mega Charizard Y": "메가리자몽Y",
  "Mega Mewtwo X": "메가뮤츠X", "Mega Mewtwo Y": "메가뮤츠Y",
  "Mega Charizard": "메가리자몽", "Mega Mewtwo": "메가뮤츠",
  "Mega Gardevoir": "메가가디안", "Mega Gengar": "메가팬텀",
  "Mega Gyarados": "메가갸라도스", "Mega Blastoise": "메가거북왕",
  "Mega Venusaur": "메가이상해꽃",
  Sylveon: "님피아",
  Xerneas: "제르네아스", Yveltal: "이벨타르", Zygarde: "지가르데",
  // Gen 7
  Rowlet: "나몰빠기", Incineroar: "어흥염", Primarina: "리리배",
  Solgaleo: "솔가레오", Lunala: "루나아라", Necrozma: "네크로즈마",
  Marshadow: "마샤도",
  "Tapu Koko": "카푸꼬꼭코", "Tapu Lele": "카푸나비나",
  "Tapu Bulu": "카푸브루루", "Tapu Fini": "카푸느지느",
  // Gen 8
  Grookey: "따분이", Scorbunny: "이어롭", Sobble: "울머기",
  Cinderace: "에이스번", Inteleon: "인텔리레온", Rillaboom: "고릴타",
  Zacian: "자시안", Zamazenta: "자마젠타", Eternatus: "무한다이노",
  Urshifu: "우라오스", Calyrex: "버드렉스",
  // Gen 9 / SV
  Sprigatito: "스피리가토", Floragato: "플로가토", Meowscarada: "마스카니아",
  Fuecoco: "불꽃숭이 (후에코코)", Crocalor: "코코파스", Skeledirge: "노래뱀장어",
  Quaxly: "꽥스", Quaxwell: "꽥퀄", Quaquaval: "웨이드래쉬",
  Koraidon: "코라이돈", Miraidon: "미라이돈",
  "Roaring Moon": "홀로우문", "Iron Valiant": "아이언발리언트",
  "Iron Leaves": "아이언리브스", "Walking Wake": "워킹웨이크",
  Terapagos: "테라파고스", Ogerpon: "오거폰",
  "Gouging Fire": "게이징파이어", "Raging Bolt": "레이징볼트",
  "Iron Crown": "아이언크라운", "Iron Boulder": "아이언볼더",
  "Ting-Lu": "딩루", "Chien-Pao": "치유파오", "Wo-Chien": "우첸", "Chi-Yu": "치위",
};

// Set name keyword (lowercase) → Bunjang search hint
const SET_KEYWORD: Record<string, string> = {
  "pokemon card 151": "151",
  "151": "151",
  "scarlet & violet": "SV",
  "paldea evolved": "SV2",
  "obsidian flames": "흑염화",
  "paradox rift": "역설의 가면",
  "temporal forces": "고대의 고동",
  "twilight masquerade": "가면의 왕",
  "shrouded fable": "어두운 웅얼거림",
  "stellar crown": "별의 왕관",
  "surging sparks": "전파의 탐험",
  "prismatic evolutions": "프리즘의 진화",
  "sword & shield": "검방",
  "evolving skies": "이볼빙스카이",
  "fusion strike": "퓨전아츠",
  "brilliant stars": "스타버스",
  "astral radiance": "배틀리전",
  "pokemon go": "포켓몬GO",
  "lost origin": "로스트어비스",
  "silver tempest": "실버템페스트",
  "crown zenith": "크라운제니스",
  "paldean fates": "팰디언페이츠",
  "champions path": "챔피언로드",
  "celebrations": "쥬빌리",
  "base set": "기본판",
};

const RARITY_ABBR: Record<string, string> = {
  "Special Illustration Rare": "SAR",
  "Illustration Rare": "IR",
  "Hyper Rare": "HR",
  "Ultra Rare": "UR",
  "Secret Rare": "SR",
  "Double Rare": "RR",
  "Rare VSTAR": "VSTAR",
  "Rare VMAX": "VMAX",
  "Rare V": "V",
};

const SUFFIX_RE = /\s+(ex|EX|V|VMAX|VSTAR|GX)$/;
const EXCLUDE_KW = ["박스", "PSA", "BGS", "미개봉", "봉인", "세트", "팩 뜯기", "경매"];

function buildBunjangQuery(
  cardName: string,
  setName: string,
  rarity?: string | null
): string | null {
  const suffixMatch = cardName.match(SUFFIX_RE);
  const suffix = suffixMatch ? suffixMatch[1] : null;
  const baseName = suffixMatch ? cardName.slice(0, suffixMatch.index) : cardName;

  const koName = POKEMON_NAME_KO[baseName];
  if (!koName) return null;

  const parts: string[] = [koName];
  if (suffix) parts.push(suffix === "EX" ? "ex" : suffix);

  const setLower = setName.toLowerCase();
  for (const [key, kw] of Object.entries(SET_KEYWORD)) {
    if (setLower.includes(key)) {
      parts.push(kw);
      break;
    }
  }

  if (rarity && RARITY_ABBR[rarity]) {
    parts.push(RARITY_ABBR[rarity]);
  }

  return parts.join(" ");
}

interface BunjangItem {
  name: string;
  price: string;
  status?: string;
}

interface BunjangApiResponse {
  list?: BunjangItem[];
}

async function fetchBunjangItems(query: string, n = 40): Promise<number[]> {
  try {
    const url = `https://api.bunjang.co.kr/api/1/find_v2.json?q=${encodeURIComponent(query)}&order=date&n=${n}&status=2`;
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const json: BunjangApiResponse = await res.json();
    return (json.list ?? [])
      .filter((item) => !EXCLUDE_KW.some((kw) => (item.name ?? "").includes(kw)))
      .map((item) => parseInt(item.price, 10))
      .filter((p) => !isNaN(p) && p > 1000);
  } catch {
    return [];
  }
}

function iqrFilter(prices: number[]): number[] {
  if (prices.length < 4) return prices;
  const sorted = [...prices].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  const iqr = q3 - q1;
  return prices.filter((p) => p >= q1 - 1.5 * iqr && p <= q3 + 1.5 * iqr);
}

export interface BunjangPrices {
  avg: number;
  min: number;
  max: number;
  count: number;
  query: string;
}

export async function getBunjangCardPrices(
  cardName: string,
  setName: string,
  rarity?: string | null
): Promise<BunjangPrices | null> {
  const query = buildBunjangQuery(cardName, setName, rarity);
  if (!query) return null;

  const raw = await fetchBunjangItems(query);
  if (!raw.length) return null;

  const filtered = iqrFilter(raw);
  if (!filtered.length) return null;

  const avg = Math.round(filtered.reduce((s, p) => s + p, 0) / filtered.length);
  return {
    avg,
    min: Math.min(...filtered),
    max: Math.max(...filtered),
    count: filtered.length,
    query,
  };
}
