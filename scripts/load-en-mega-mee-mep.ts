/**
 * EN Mega Evolution 누락 세트 2개 적재
 *   en-tcg-mee  Mega Evolution Energy   (TCGdex: mee, 8장, 2025-09-25)
 *   en-tcg-mep  MEP Black Star Promos   (TCGdex: mep, 52장, 2025-09-26)
 *
 * - cardPackId = null (EN 단독 등재, 그룹 연결은 별도 작업)
 * - packType: mee=box_set, mep=promo
 * - 1차 출처: TCGdex EN API (image=null이라 imageLarge/imageSmall 모두 null)
 * - RegionCard.id 컨벤션: <setId>-<number> (예: en-tcg-mee-001)
 *
 * 실행:
 *   dry-run:  npx tsx scripts/load-en-mega-mee-mep.ts
 *   적용:     npx tsx scripts/load-en-mega-mee-mep.ts --apply
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";

const APPLY = process.argv.includes("--apply");

// ─── MEE 카드 데이터 (TCGdex EN mee, 2025-09-25 수집) ───
const MEE_SET = {
  id: "en-tcg-mee",
  name: "Mega Evolution Energy",
  series: "Mega Evolution",
  releaseDate: new Date("2025-09-25T00:00:00Z"),
  cardCount: 8,
  region: "EN" as const,
  code: "MEE",
  packType: "box_set",
  titleCleanEn: "Mega Evolution Energy",
  cardPackId: null as null,
};

const MEE_CARDS = [
  { number: "001", name: "Grass Energy",     supertype: "Energy", subtypes: ["Basic"], energyType: "Normal" },
  { number: "002", name: "Fire Energy",      supertype: "Energy", subtypes: ["Basic"], energyType: "Normal" },
  { number: "003", name: "Water Energy",     supertype: "Energy", subtypes: ["Basic"], energyType: "Normal" },
  { number: "004", name: "Lightning Energy", supertype: "Energy", subtypes: ["Basic"], energyType: "Normal" },
  { number: "005", name: "Psychic Energy",   supertype: "Energy", subtypes: ["Basic"], energyType: "Normal" },
  { number: "006", name: "Fighting Energy",  supertype: "Energy", subtypes: ["Basic"], energyType: "Normal" },
  { number: "007", name: "Darkness Energy",  supertype: "Energy", subtypes: ["Basic"], energyType: "Normal" },
  { number: "008", name: "Metal Energy",     supertype: "Energy", subtypes: ["Basic"], energyType: "Normal" },
];

// ─── MEP 카드 데이터 (TCGdex EN mep, 2025-09-26 수집) ───
// TCGdex official=0, holo=71, total=52 → official count 0은 데이터 부재 표시,
// 실제 카드 레코드는 52장 존재. 번호 046~063은 TCGdex 미수록.
const MEP_SET = {
  id: "en-tcg-mep",
  name: "MEP Black Star Promos",
  series: "Mega Evolution",
  releaseDate: new Date("2025-09-26T00:00:00Z"),
  cardCount: 52,
  region: "EN" as const,
  code: "MEP",
  packType: "promo",
  titleCleanEn: "MEP Black Star Promos",
  cardPackId: null as null,
};

type Atk = { name: string; cost: string[]; damage: string | number | null; effect?: string };
type Abi = { type: string; name: string; effect: string };
type Card = {
  number: string; name: string; supertype: string;
  subtypes: string[]; stage?: string | null; hp?: number | null;
  types?: string[]; dexId?: number | null; retreat?: number | null;
  weakness?: string | null; illustrator?: string | null; rarity?: string | null;
  attacks?: Atk[]; abilities?: Abi[];
};

const MEP_CARDS: Card[] = [
  { number:"001", name:"Meganium",          supertype:"Pokémon", subtypes:["Stage2"], stage:"Stage2", hp:160, types:["Grass"],    dexId:154, retreat:2, illustrator:"Uninori",          attacks:[{name:"Solar Beam",cost:["Grass","Grass","Colorless","Colorless"],damage:140}], abilities:[{type:"Ability",name:"Wild Growth",effect:"Each Basic {G} Energy attached to all of your Pokémon provides {G}{G} Energy. The effect of Wild Growth doesn't stack."}] },
  { number:"002", name:"Inteleon",           supertype:"Pokémon", subtypes:["Stage2"], stage:"Stage2", hp:150, types:["Water"],    dexId:818, retreat:1, illustrator:"Kazumasa Yasukuni",attacks:[{name:"Bring Down",cost:["Water"],damage:null,effect:"Choose a Pokémon in play (yours or your opponent's) that has the least HP remaining, except for this Pokémon, and it is Knocked Out."},{name:"Water Shot",cost:["Water"],damage:110,effect:"Discard an Energy from this Pokémon."}] },
  { number:"003", name:"Alakazam",           supertype:"Pokémon", subtypes:["Stage2"], stage:"Stage2", hp:140, types:["Psychic"],  dexId:65,  retreat:1, illustrator:"cochi8i",          attacks:[{name:"Powerful Hand",cost:["Psychic"],damage:null,effect:"Place 2 damage counters on your opponent's Active Pokémon for each card in your hand."}], abilities:[{type:"Ability",name:"Psychic Draw",effect:"Once during your turn, when you play this Pokémon from your hand to evolve 1 of your Pokémon, you may use this Ability. Draw 3 cards."}] },
  { number:"004", name:"Lunatone",           supertype:"Pokémon", subtypes:["Basic"],  stage:"Basic",  hp:110, types:["Fighting"],  dexId:337, retreat:1, illustrator:"Ounishi",          attacks:[{name:"Power Gem",cost:["Fighting","Fighting"],damage:50}], abilities:[{type:"Ability",name:"Lunar Cycle",effect:"Once during your turn, if you have Solrock in play, you may discard a Basic {F} Energy card from your hand in order to use this Ability. Draw 3 cards. You can't use more than 1 Lunar Cycle Ability each turn."}] },
  { number:"005", name:"Drifloon",           supertype:"Pokémon", subtypes:["Basic"],  stage:"Basic",  hp:70,  types:["Psychic"],   dexId:425, retreat:1, illustrator:"Shimaris Yukichi", attacks:[{name:"Pull",cost:["Psychic"],damage:null,effect:"Flip a coin. If heads, switch 1 of your opponent's Benched Pokémon with their Active Pokémon."}] },
  { number:"006", name:"Drifblim",           supertype:"Pokémon", subtypes:["Stage1"], stage:"Stage1", hp:110, types:["Psychic"],   dexId:426, retreat:1, illustrator:"Shimaris Yukichi", attacks:[{name:"Disruptive Wind",cost:["Psychic"],damage:null,effect:"Your opponent's Active Pokémon is now Confused."},{name:"Balloon Return",cost:["Psychic","Psychic"],damage:110,effect:"Put this Pokémon and all attached cards into your hand."}] },
  { number:"007", name:"Psyduck",            supertype:"Pokémon", subtypes:["Basic"],  stage:"Basic",  hp:70,  types:["Water"],      dexId:54,  retreat:1, illustrator:"Jiro Sasumo",      attacks:[{name:"Collision",cost:["Colorless","Colorless"],damage:20}], abilities:[{type:"Ability",name:"Damp",effect:"Pokémon in play (both yours and your opponent's) lose all Abilities that require those Pokémon to be Knocked Out."}] },
  { number:"008", name:"Golduck",            supertype:"Pokémon", subtypes:["Stage1"], stage:"Stage1", hp:120, types:["Water"],      dexId:55,  retreat:1, illustrator:"Jiro Sasumo",      attacks:[{name:"Hydro Pump",cost:["Colorless","Colorless","Colorless"],damage:"60+",effect:"This attack does 20 more damage for each {W} Energy attached to this Pokémon."}], abilities:[{type:"Ability",name:"Damp",effect:"Pokémon in play (both yours and your opponent's) lose all Abilities that require those Pokémon to be Knocked Out."}] },
  { number:"009", name:"Alakazam",           supertype:"Pokémon", subtypes:["Stage2"], stage:"Stage2", hp:140, types:["Psychic"],   dexId:65,  retreat:1, illustrator:"Aya Kusube",       attacks:[{name:"Powerful Hand",cost:["Psychic"],damage:null,effect:"Place 2 damage counters on your opponent's Active Pokémon for each card in your hand."}], abilities:[{type:"Ability",name:"Psychic Draw",effect:"Once during your turn, when you play this Pokémon from your hand to evolve 1 of your Pokémon, you may use this Ability. Draw 3 cards."}] },
  { number:"010", name:"Riolu",              supertype:"Pokémon", subtypes:["Basic"],  stage:"Basic",  hp:80,  types:["Fighting"],   dexId:447, retreat:2, illustrator:"GOSSAN",           attacks:[{name:"Accelerating Stab",cost:["Fighting"],damage:30,effect:"During your next turn, this Pokémon can't use Accelerating Stab."}] },
  { number:"011", name:"Mega Latias ex",     supertype:"Pokémon", subtypes:["Basic","ex"], stage:"Basic", hp:280, types:["Dragon"],  dexId:380, retreat:1, illustrator:"5ban Graphics",    attacks:[{name:"Strafe",cost:["Colorless"],damage:40,effect:"You may switch this Pokémon with 1 of your Benched Pokémon."},{name:"Illusory Impulse",cost:["Fire","Psychic","Colorless"],damage:300,effect:"Discard all Energy from this Pokémon."}] },
  { number:"012", name:"Mega Lucario ex",    supertype:"Pokémon", subtypes:["Stage1","ex"], stage:"Stage1", hp:340, types:["Fighting"], dexId:448, retreat:2, illustrator:"5ban Graphics", attacks:[{name:"Aura Jab",cost:["Fighting"],damage:130,effect:"Attach up to 3 Basic {F} Energy cards from your discard pile to your Benched Pokémon in any way you like."},{name:"Mega Brave",cost:["Fighting","Fighting"],damage:270,effect:"During your next turn, this Pokémon can't use Mega Brave."}] },
  { number:"013", name:"Mega Venusaur ex",   supertype:"Pokémon", subtypes:["Stage2","ex"], stage:"Stage2", hp:380, types:["Grass"],  dexId:3,   retreat:4, illustrator:"5ban Graphics",   attacks:[{name:"Jungle Dump",cost:["Grass","Grass","Grass","Grass"],damage:240,effect:"Heal 30 damage from this Pokémon."}], abilities:[{type:"Ability",name:"Solar Transfer",effect:"As often as you like during your turn, you may use this Ability. Move a Basic {G} Energy from 1 of your Pokémon to another of your Pokémon."}] },
  { number:"014", name:"Ceruledge",          supertype:"Pokémon", subtypes:["Stage1"], stage:"Stage1", hp:140, types:["Fire"],       dexId:null,retreat:2, rarity:"Uncommon", illustrator:"Anesaki Dynamic",attacks:[{name:"Infernal Slash",cost:["Fire"],damage:220,effect:"Discard 4 Basic {R} Energy cards from your hand. If you can't discard 4 cards in this way, this attack does nothing."}] },
  { number:"015", name:"Zacian",             supertype:"Pokémon", subtypes:["Basic"],  stage:"Basic",  hp:130, types:["Psychic"],   dexId:null,retreat:2, rarity:"Rare",     illustrator:"Shiburingaru",     attacks:[{name:"Limit Break",cost:["Psychic","Colorless"],damage:"50+",effect:"If your opponent has 3 or fewer Prize cards remaining, this attack does 90 more damage."}] },
  { number:"016", name:"Flygon",             supertype:"Pokémon", subtypes:["Stage2"], stage:"Stage2", hp:150, types:["Fighting"],  dexId:null,retreat:1, illustrator:"Oswaldo KATO",     attacks:[{name:"Cutting Wind",cost:["Fighting","Fighting"],damage:130}], abilities:[{type:"Ability",name:"Sandy Flapping",effect:"Once during your turn, when you play this Pokémon from your hand to evolve 1 of your Pokémon, you may use this Ability. You may also use this Ability if this Pokémon is in the Active Spot and is Knocked Out by damage from an attack from your opponent's Pokémon. Discard the top 2 cards of your opponent's deck."}] },
  { number:"017", name:"Toxtricity",         supertype:"Pokémon", subtypes:["Stage1"], stage:"Stage1", hp:140, types:["Darkness"],  dexId:null,retreat:2, rarity:"Rare", illustrator:"Krgc",             attacks:[{name:"Gentle Slap",cost:["Darkness","Darkness","Colorless"],damage:100}], abilities:[{type:"Ability",name:"Sinister Surge",effect:"Once during your turn, you may use this Ability. Search your deck for a Basic {D} Energy card and attach it to 1 of your Benched {D} Pokémon. Then, shuffle your deck. If you attached Energy to a Pokémon in this way, place 2 damage counters on that Pokémon."}] },
  { number:"018", name:"Cottonee",           supertype:"Pokémon", subtypes:["Basic"],  stage:"Basic",  hp:60,  types:["Psychic"],   dexId:546, retreat:1, illustrator:"Kariya",           attacks:[{name:"Collect",cost:["Colorless"],damage:null,effect:"Draw a card."}] },
  { number:"019", name:"Whimsicott",         supertype:"Pokémon", subtypes:["Stage1"], stage:"Stage1", hp:90,  types:["Psychic"],   dexId:547, retreat:1, illustrator:"Yuka Tanaka",      attacks:[{name:"Healing Fluff",cost:["Colorless"],damage:null,effect:"Heal all damage from 1 of your Benched Pokémon."},{name:"U-turn",cost:["Psychic"],damage:50,effect:"Switch this Pokémon with 1 of your Benched Pokémon."}] },
  { number:"020", name:"Sneasel",            supertype:"Pokémon", subtypes:["Basic"],  stage:"Basic",  hp:70,  types:["Darkness"],  dexId:215, retreat:1, illustrator:"Souichirou Gunjima",attacks:[{name:"Dig Claws",cost:["Darkness"],damage:10},{name:"Scratch",cost:["Darkness","Darkness"],damage:30}] },
  { number:"021", name:"Weavile",            supertype:"Pokémon", subtypes:["Stage1"], stage:"Stage1", hp:90,  types:["Darkness"],  dexId:461, retreat:1, illustrator:"matazo",           attacks:[{name:"Retaliatory Claw",cost:["Darkness","Darkness"],damage:"20+",effect:"If this Pokémon's remaining HP is 50 or less, this attack does 170 more damage."},{name:"Cut",cost:["Darkness","Darkness"],damage:60}] },
  { number:"022", name:"Charcadet",          supertype:"Pokémon", subtypes:["Basic"],  stage:"Basic",  hp:70,  types:["Fire"],      dexId:935, retreat:2, illustrator:"Teeziro",          attacks:[{name:"Gather Strength",cost:["Fire"],damage:null,effect:"Search your deck for up to 2 Basic Energy cards, reveal them, and put them into your hand. Then, shuffle your deck."},{name:"Chop",cost:["Fire"],damage:10}] },
  { number:"023", name:"Mega Charizard X ex",supertype:"Pokémon", subtypes:["Stage2","ex"], stage:"Stage2", hp:360, types:["Fire"], dexId:6,  retreat:2, illustrator:"Saboteri",         attacks:[{name:"Inferno X",cost:["Fire","Fire"],damage:"90×",effect:"Discard any amount of [R] Energy from among your Pokémon, and this attack does 90 damage for each card you discarded in this way."}] },
  { number:"024", name:"Oricorio ex",        supertype:"Pokémon", subtypes:["Basic","ex"], stage:"Basic", hp:190, types:["Fire"],   dexId:741, retreat:1, illustrator:"Shinji Kanda",    attacks:[{name:"Fire Wing",cost:["Fire","Fire","Colorless"],damage:110}], abilities:[{type:"Ability",name:"Excited Turbo",effect:"As often as you like during your turn, if you have any {R} Mega Evolution Pokémon ex in play, you may use this Ability. Attach a Basic {R} Energy card from your hand to 1 of your Benched {R} Pokémon."}] },
  { number:"025", name:"Mega Kangaskhan ex", supertype:"Pokémon", subtypes:["Basic","ex"], stage:"Basic", hp:300, types:["Colorless"],dexId:115,retreat:3, illustrator:"5ban Graphics",   attacks:[{name:"Rapid-Fire Combo",cost:["Colorless","Colorless","Colorless"],damage:"200+",effect:"Flip a coin until you get tails. This attack does 50 more damage for each heads."}], abilities:[{type:"Ability",name:"Run Errand",effect:"Once during your turn, if this Pokémon is in the Active Spot, you may use this Ability. Draw 2 cards. You can't use more than 1 Run Errand Ability each turn."}] },
  { number:"026", name:"Meloetta",           supertype:"Pokémon", subtypes:["Basic"],  stage:"Basic",  hp:90,  types:["Psychic"],   dexId:648, retreat:1, illustrator:"Keisin",           attacks:[{name:"Soothing Melody",cost:["Psychic"],damage:null,effect:"Heal 120 damage from 1 of your Benched {P} Pokémon."},{name:"Magical Shot",cost:["Psychic","Colorless"],damage:50}] },
  { number:"027", name:"Haunter",            supertype:"Pokémon", subtypes:["Stage1"], stage:"Stage1", hp:100, types:["Darkness"],  dexId:93,  retreat:1, illustrator:"Arai Kiriko",      attacks:[{name:"Spooky Shot",cost:["Darkness"],damage:40}] },
  { number:"028", name:"Celebratory Fanfare",supertype:"Trainer", subtypes:["Stadium"],hp:null,types:[],dexId:null,retreat:null, illustrator:"Yuu Nishida" },
  { number:"029", name:"Mega Charizard X ex",supertype:"Pokémon", subtypes:["Stage2","ex"], stage:"Stage2", hp:360, types:["Fire"], dexId:6,  retreat:2, weakness:"Water", illustrator:"takuyoa",          attacks:[{name:"Inferno X",cost:["Fire","Fire"],damage:"90×",effect:"Discard any amount of [R] Energy from among your Pokémon, and this attack does 90 damage for each card you discarded in this way."}] },
  { number:"030", name:"Mega Charizard Y ex",supertype:"Pokémon", subtypes:["Stage2","ex"], stage:"Stage2", hp:360, types:["Fire"], dexId:6,  retreat:1, weakness:"Water", illustrator:"Ultimateinudog",   attacks:[{name:"Explosion Y",cost:["Fire","Fire","Colorless"],damage:null,effect:"Discard 3 Energy from this Pokémon, and this attack does 280 damage to 1 of your opponent's Pokémon. (Don't apply Weakness and Resistance for Benched Pokémon.)"}] },
  { number:"031", name:"N's Zekrom",         supertype:"Pokémon", subtypes:["Basic"],  stage:"Basic",  hp:130, types:["Dragon"],     dexId:644, retreat:2, illustrator:"Bun Toujo",        attacks:[{name:"Shred",cost:["Colorless","Colorless","Colorless"],damage:70,effect:"This attack's damage isn't affected by any effects on your opponent's Active Pokémon."},{name:"Rampaging Thunder",cost:["Fire","Lightning","Lightning","Colorless"],damage:250,effect:"During your next turn, this Pokémon can't use attacks."}] },
  { number:"032", name:"Mega Gardevoir ex",  supertype:"Pokémon", subtypes:["Stage2","ex"], stage:"Stage2", hp:360, types:["Psychic"],dexId:282,retreat:2, weakness:"Darkness", illustrator:"Saboteri",        attacks:[{name:"Overflowing Wishes",cost:["Psychic"],damage:null,effect:"For each of your Benched Pokémon, search your deck for a Basic {P} Energy card and attach it to that Pokémon. Then, shuffle your deck."},{name:"Mega Symphonia",cost:["Psychic"],damage:"50×",effect:"This attack does 50 damage for each {P} Energy attached to all of your Pokémon."}] },
  { number:"033", name:"Mega Lucario ex",    supertype:"Pokémon", subtypes:["Stage1","ex"], stage:"Stage1", hp:340, types:["Fighting"],dexId:448,retreat:2, weakness:"Psychic", illustrator:"5ban Graphics",   attacks:[{name:"Aura Jab",cost:["Fighting"],damage:130,effect:"Attach up to 3 Basic {F} Energy cards from your discard pile to your Benched Pokémon in any way you like."},{name:"Mega Brave",cost:["Fighting","Fighting"],damage:270,effect:"During your next turn, this Pokémon can't use Mega Brave."}] },
  { number:"034", name:"Mega Meganium ex",   supertype:"Pokémon", subtypes:["Stage2","ex"], stage:"Stage2", hp:360, types:["Grass"],  dexId:154, retreat:2, weakness:"Fire",    illustrator:"5ban Graphics",   attacks:[{name:"Giant Bouquet",cost:["Colorless","Colorless","Colorless"],damage:"70+",effect:"This attack does 50 more damage for each {G} Energy attached to this Pokémon."}] },
  { number:"035", name:"Mega Emboar ex",     supertype:"Pokémon", subtypes:["Stage2","ex"], stage:"Stage2", hp:380, types:["Fire"],   dexId:500, retreat:4, weakness:"Water",   illustrator:"5ban Graphics",   attacks:[{name:"Crimson Blast",cost:["Fire","Fire","Colorless"],damage:320,effect:"This Pokémon also does 60 damage to itself."}] },
  { number:"036", name:"Mega Feraligatr ex", supertype:"Pokémon", subtypes:["Stage2","ex"], stage:"Stage2", hp:370, types:["Water"],  dexId:160, retreat:3, weakness:"Lightning",illustrator:"5ban Graphics",  attacks:[{name:"Mortal Crunch",cost:["Water","Water","Colorless"],damage:"200+",effect:"If your opponent's Active Pokémon already has any damage counters on it, this attack does 200 more damage."}] },
  { number:"037", name:"Bulbasaur",          supertype:"Pokémon", subtypes:["Basic"],  stage:"Basic",  hp:80,  types:["Grass"],      dexId:1,   retreat:2, illustrator:"Saboteri",         attacks:[{name:"Leech Seed",cost:["Grass"],damage:10,effect:"Heal 10 damage from this Pokémon."}] },
  { number:"038", name:"Charmander",         supertype:"Pokémon", subtypes:["Basic"],  stage:"Basic",  hp:80,  types:["Fire"],       dexId:4,   retreat:2, illustrator:"Saboteri",         attacks:[{name:"Ember",cost:["Fire"],damage:30,effect:"Discard an Energy from this Pokémon."}] },
  { number:"039", name:"Squirtle",           supertype:"Pokémon", subtypes:["Basic"],  stage:"Basic",  hp:80,  types:["Water"],      dexId:7,   retreat:2, illustrator:"Saboteri",         attacks:[{name:"Bubble",cost:["Water"],damage:10,effect:"Flip a coin. If heads, your opponent's Active Pokémon is now Paralyzed."}] },
  { number:"040", name:"Turtwig",            supertype:"Pokémon", subtypes:["Basic"],  stage:"Basic",  hp:90,  types:["Grass"],      dexId:387, retreat:3, illustrator:"Saboteri",         attacks:[{name:"Razor Leaf",cost:["Grass","Grass","Colorless"],damage:60}] },
  { number:"041", name:"Chimchar",           supertype:"Pokémon", subtypes:["Basic"],  stage:"Basic",  hp:60,  types:["Fire"],       dexId:390, retreat:1, illustrator:"Saboteri",         attacks:[{name:"Fury Swipes",cost:["Colorless","Colorless"],damage:"20×",effect:"Flip 3 coins. This attack does 20 damage for each heads."}] },
  { number:"042", name:"Piplup",             supertype:"Pokémon", subtypes:["Basic"],  stage:"Basic",  hp:70,  types:["Water"],      dexId:393, retreat:1, illustrator:"Saboteri",         attacks:[{name:"Peck",cost:["Water"],damage:20}] },
  { number:"043", name:"Rowlet",             supertype:"Pokémon", subtypes:["Basic"],  stage:"Basic",  hp:70,  types:["Grass"],      dexId:722, retreat:1, illustrator:"Saboteri",         attacks:[{name:"Tackle",cost:["Colorless","Colorless"],damage:20}] },
  { number:"044", name:"Litten",             supertype:"Pokémon", subtypes:["Basic"],  stage:"Basic",  hp:70,  types:["Fire"],       dexId:725, retreat:1, illustrator:"Saboteri",         attacks:[{name:"Fire Fang",cost:["Fire","Fire"],damage:20,effect:"Your opponent's Active Pokémon is now Burned."}] },
  { number:"045", name:"Popplio",            supertype:"Pokémon", subtypes:["Basic"],  stage:"Basic",  hp:70,  types:["Water"],      dexId:728, retreat:1, illustrator:"Saboteri",         attacks:[{name:"Disarming Voice",cost:["Water","Water"],damage:20,effect:"Your opponent's Active Pokémon is now Confused."}] },
  { number:"064", name:"Serperior",          supertype:"Pokémon", subtypes:["Stage2"], stage:"Stage2", hp:160, types:["Grass"],      dexId:497, retreat:2, weakness:"Fire",    illustrator:"LINNE",            attacks:[{name:"Regal Command",cost:["Grass"],damage:"20×",effect:"This attack does 20 damage for each of your Pokémon in play."},{name:"Solar Coiling",cost:["Grass","Grass","Grass"],damage:"100+",effect:"If Rosa's Encouragement is in your discard pile, this attack does 150 more damage."}] },
  { number:"065", name:"Barbaracle",         supertype:"Pokémon", subtypes:["Stage1"], stage:"Stage1", hp:130, types:["Fighting"],   dexId:689, retreat:2, weakness:"Grass",   illustrator:"Hasuno",           attacks:[{name:"Hammer In",cost:["Fighting","Fighting","Colorless"],damage:80}], abilities:[{type:"Ability",name:"Stone Arms",effect:"Once during your turn, you may use this Ability. Attach a Basic {F} Energy card from your hand to 1 of your {F} Pokémon."}] },
  { number:"066", name:"Tyrantrum",          supertype:"Pokémon", subtypes:["Stage2"], stage:"Stage2", hp:180, types:["Fighting"],   dexId:697, retreat:3, weakness:"Grass",   illustrator:"Nisota Niso",      attacks:[{name:"Wreak Havoc",cost:["Fighting","Colorless"],damage:160,effect:"Flip a coin until you get tails. For each heads, discard the top card of your opponent's deck."}], abilities:[{type:"Ability",name:"Tyrannically Gutsy",effect:"If this Pokémon has any Special Energy attached, it gets +150 HP."}] },
  { number:"067", name:"Doublade",           supertype:"Pokémon", subtypes:["Stage1"], stage:"Stage1", hp:100, types:["Metal"],      dexId:680, retreat:2, weakness:"Fire",    illustrator:"Yukihiro Tada",    attacks:[{name:"Weaponized Swords",cost:["Colorless","Colorless"],damage:"60×",effect:"Reveal any number of Honedge, Doublade, and Aegislash from your hand, and this attack does 60 damage for each card you revealed in this way."}] },
  { number:"068", name:"Makuhita",           supertype:"Pokémon", subtypes:["Basic"],  stage:"Basic",  hp:80,  types:["Fighting"],   dexId:296, retreat:2, weakness:"Psychic", illustrator:"Takeshi Nakamura", attacks:[{name:"Corkscrew Punch",cost:["Fighting"],damage:10},{name:"Confront",cost:["Fighting","Fighting"],damage:30}] },
  { number:"069", name:"Chikorita",          supertype:"Pokémon", subtypes:["Basic"],  stage:"Basic",  hp:70,  types:["Grass"],      dexId:152, retreat:1, weakness:"Fire",    illustrator:"Makura Tami",      attacks:[{name:"Razor Leaf",cost:["Grass"],damage:20}] },
  { number:"070", name:"Tyrunt",             supertype:"Pokémon", subtypes:["Stage1"], stage:"Stage1", hp:100, types:["Fighting"],   dexId:696, retreat:3, weakness:"Grass",   illustrator:"Shimaris Yukichi", attacks:[{name:"Get Angry",cost:["Fighting","Colorless"],damage:"20×",effect:"This attack does 20 damage for each damage counter on this Pokémon."}] },
];

// ─── 헬퍼 ───
function toInt(n: string): number { return parseInt(n.replace(/\D/g, ""), 10) || 0; }
function fmtAtks(atks?: Atk[]): any { if (!atks?.length) return undefined; return atks.map(a => ({ name: a.name, cost: a.cost, damage: a.damage != null ? String(a.damage) : null, ...(a.effect ? { effect: a.effect } : {}) })); }
function fmtAbis(abis?: Abi[]): any { if (!abis?.length) return undefined; return abis; }

// ─── 적재 ───
async function upsertSet(s: typeof MEE_SET | typeof MEP_SET) {
  await prisma.set.upsert({
    where: { id: s.id },
    create: {
      id: s.id, name: s.name, series: s.series, releaseDate: s.releaseDate,
      cardCount: s.cardCount, region: s.region, code: s.code,
      packType: s.packType, titleCleanEn: s.titleCleanEn, cardPackId: s.cardPackId,
    },
    update: {
      name: s.name, series: s.series, releaseDate: s.releaseDate,
      cardCount: s.cardCount, code: s.code, packType: s.packType,
      titleCleanEn: s.titleCleanEn, cardPackId: s.cardPackId,
    },
  });
}

async function upsertCards(setMeta: typeof MEE_SET | typeof MEP_SET, cards: Card[]) {
  let ok = 0;
  for (const c of cards) {
    const rcId = `${setMeta.id}-${c.number}`;
    const dex = c.dexId != null ? [c.dexId] : [];
    // Card(LogicalCard) upsert
    await prisma.card.upsert({
      where: { id: rcId },
      create: {
        id: rcId,
        primarySetId: setMeta.id,
        primaryNumber: c.number,
        primaryNumberInt: toInt(c.number),
        supertype: c.supertype ?? null,
        subtypes: c.subtypes ?? [],
        types: c.types ?? [],
        pokedexNumbers: dex,
        hp: (c as any).hp ?? null,
        retreatCost: c.retreat ?? null,
        weakness: c.weakness ?? null,
        illustrator: c.illustrator ?? null,
        attacks: fmtAtks((c as any).attacks) ?? null,
        abilities: fmtAbis((c as any).abilities) ?? null,
        evolvesTo: [],
        rules: [],
      },
      update: {
        supertype: c.supertype ?? null,
        subtypes: c.subtypes ?? [],
        types: c.types ?? [],
        pokedexNumbers: dex,
        hp: (c as any).hp ?? null,
        retreatCost: c.retreat ?? null,
        weakness: c.weakness ?? null,
        illustrator: c.illustrator ?? null,
        attacks: fmtAtks((c as any).attacks) ?? null,
        abilities: fmtAbis((c as any).abilities) ?? null,
      },
    });
    // RegionCard upsert
    await prisma.regionCard.upsert({
      where: { id: rcId },
      create: {
        id: rcId, cardId: rcId, language: "en", region: "EN",
        setId: setMeta.id, number: c.number, numberInt: toInt(c.number),
        name: c.name, imageLarge: null, imageSmall: null,
      },
      update: {
        name: c.name, imageLarge: null, imageSmall: null,
      },
    });
    ok++;
  }
  return ok;
}

async function main() {
  console.log(`\n${APPLY ? "APPLY" : "DRY-RUN"} — EN Mega Evolution 누락 세트 적재\n`);

  // ── MEE dry-run 출력 ──
  console.log(`[MEE] Set: ${MEE_SET.id} | "${MEE_SET.name}" | region=${MEE_SET.region} | packType=${MEE_SET.packType} | cardPackId=null`);
  console.log(`  releaseDate: ${MEE_SET.releaseDate.toISOString().slice(0,10)} | cardCount: ${MEE_SET.cardCount}`);
  console.log(`  cards(${MEE_CARDS.length}):`);
  for (const c of MEE_CARDS) console.log(`    ${c.number} ${c.name.padEnd(20)} supertype=${c.supertype} subtypes=[${c.subtypes.join(",")}]`);

  console.log(`\n[MEP] Set: ${MEP_SET.id} | "${MEP_SET.name}" | region=${MEP_SET.region} | packType=${MEP_SET.packType} | cardPackId=null`);
  console.log(`  releaseDate: ${MEP_SET.releaseDate.toISOString().slice(0,10)} | cardCount: ${MEP_SET.cardCount}`);
  console.log(`  cards(${MEP_CARDS.length}): 번호 ${MEP_CARDS[0].number}~${MEP_CARDS[MEP_CARDS.length-1].number} (046~063 TCGdex 미수록)`);
  for (const c of MEP_CARDS) {
    const dex = (c as any).dexId != null ? `dex=${(c as any).dexId}` : "dex=null";
    console.log(`    ${c.number} ${c.name.padEnd(22)} supertype=${c.supertype} hp=${(c as any).hp ?? "-"} ${dex} artist=${c.illustrator ?? "-"}`);
  }

  if (!APPLY) {
    console.log(`\n적용: npx tsx scripts/load-en-mega-mee-mep.ts --apply`);
    await prisma.$disconnect();
    return;
  }

  // ── 실제 적재 ──
  console.log("\n세트 upsert...");
  await upsertSet(MEE_SET);
  console.log(`  OK: ${MEE_SET.id}`);
  await upsertSet(MEP_SET);
  console.log(`  OK: ${MEP_SET.id}`);

  console.log("\nMEE 카드 upsert...");
  const meeOk = await upsertCards(MEE_SET, MEE_CARDS as any);
  console.log(`  MEE: ${meeOk}/${MEE_CARDS.length}장`);

  console.log("MEP 카드 upsert...");
  const mepOk = await upsertCards(MEP_SET, MEP_CARDS);
  console.log(`  MEP: ${mepOk}/${MEP_CARDS.length}장`);

  // 검증
  const meeCount = await prisma.regionCard.count({ where: { setId: MEE_SET.id } });
  const mepCount = await prisma.regionCard.count({ where: { setId: MEP_SET.id } });
  console.log(`\n완료: ${MEE_SET.id} = ${meeCount}장, ${MEP_SET.id} = ${mepCount}장`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error("FAIL:", e?.message ?? e); process.exit(1); });
