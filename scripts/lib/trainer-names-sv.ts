/**
 * SV 트레이너/스타디움 JP→EN 이름 사전 (merge-en-identity 트레이너 매칭용).
 * 일러스트레이터는 같은 일러에 여러 카드가 섞여 스크램블되므로, 트레이너의 정체성은 *이름*으로 잡는다.
 * 세트마다 어휘가 반복되므로 누적 확장한다. 스크립트가 사전 미등록 JP명을 경고로 출력하니 그때 추가.
 */
export const TR_JP2EN: Record<string, string> = {
  // ── 서포트(인물) ──
  "ペパー": "Arven",
  "ジニア": "Jacq",
  "ボタン": "Penny",
  "カエデ": "Katy",
  "ミモザ": "Miriam",
  "ネモ": "Nemona",
  "スター団のしたっぱ": "Team Star Grunt",
  "ジャッジマン": "Judge",
  "タンパン小僧": "Youngster",
  "サワロ": "Saguaro",       // 아카데미 수학교사
  "ナンジャモ": "Iono",        // 전기 체육관장
  "グルーシャ": "Grusha",      // 얼음 체육관장
  "ピーニャ": "Giacomo",       // 스타단 보스(일러 교차검증으로 확정 — Dendra 아님)
  "センリ": "Norman",          // 호엔 체육관장(주인공 아빠)
  "メロコ": "Mela",            // 스타단 파이어크루 보스
  "ヒョウタ": "Roark",         // 신오 돌 체육관장
  "リップ": "Tulip",           // 사천왕
  "オーリム博士の気迫": "Professor Sada's Vitality",   // 고대 박사
  "フトゥー博士のシナリオ": "Professor Turo's Scenario", // 미래 박사
  "オモダカ": "Geeta",         // 톱 챔피언
  "ライム": "Ryme",            // 고스트 체육관장
  "オルティガ": "Ortega",       // 스타단 포이즌크루 보스
  "ポピー": "Poppy",           // 사천왕
  "コルサ": "Brassius",        // 풀 체육관장
  "タロ": "Lacey",             // 블루베리 사천왕(페어리)
  "ハイダイ": "Kofu",          // 물 체육관장
  "アカマツ": "Crispin",        // 블루베리 사천왕(불꽃)
  "ブライア": "Briar",          // 블루베리학원 교수
  "タケシのスカウト": "Brock's Scouting",       // 타케시=Brock
  "アイリスの闘志": "Iris's Fighting Spirit",    // 아이리스=Iris
  "アオキの手際": "Larry's Skill",              // 아오키=Larry
  "アンズの秘技": "Janine's Secret Art",         // 안즈=Janine
  "ゼイユ": "Carmine",         // 인디고디스크
  "ネリネ": "Amarys",          // 인디고디스크
  "ビワ": "Eri",              // 스타단 다크크루 보스
  "タイム": "Tyme",            // 아카데미 교사
  "レホール": "Raifort",        // 아카데미 역사교사
  "スグリ": "Kieran",          // 인디고디스크
  "カキツバタ": "Drayton",       // 블루베리 사천왕(드래곤)
  "暗号マニアの解読": "Ciphermaniac's Codebreaking",
  "探検家の先導": "Explorer's Guidance",
  "パルデアの仲間たち": "Friends in Paldea",
  "怖いお兄さん": "Ruffian",
  "ホップのバッグ": "Hop's Bag",
  "ホップのこだわりハチマキ": "Hop's Choice Band",
  "リーリエのしんじゅ": "Lillie's Pearl",        // 리리에=Lillie
  "Nのポイントアップ": "N's PP Up",
  "Nの城": "N's Castle",
  // ── 아이템 ──
  "ともだちてちょう": "Pal Pad",
  "ネストボール": "Nest Ball",
  "ハイパーボール": "Ultra Ball",
  "モンスターボール": "Poké Ball",
  "ふしぎなアメ": "Rare Candy",
  "学習装置": "Exp. Share",
  "ゴツゴツメット": "Rocky Helmet",
  "岩のむねあて": "Rock Chestplate",
  "まけんきハチマキ": "Defiance Band",
  "げんきのハチマキ": "Vitality Band",
  "エレキジェネレーター": "Electric Generator",
  "ピクニックバスケット": "Picnic Basket",
  "ポケギア3.0": "Pokégear 3.0",
  "ポケモンキャッチャー": "Pokémon Catcher",
  "ポケモンいれかえ": "Switch",
  "キズぐすり": "Potion",
  "クラッシュハンマー": "Crushing Hammer",
  "エネルギーサーチ": "Energy Search",
  "エネルギーつけかえ": "Energy Switch",
  "エネルギー回収": "Energy Retrieval",
  "スーパーエネルギー回収": "Superior Energy Retrieval",
  "すごいつりざお": "Super Rod",
  "おとどけドローン": "Delivery Drone",
  "勇気のおまもり": "Bravery Charm",
  "ファイトオレ": "Fighting Au Lait",
  "こだわりベルト": "Choice Belt",
  "カウンターキャッチャー": "Counter Catcher",
  "カビゴンドール": "Snorlax Doll",
  "大地の器": "Earthen Vessel",
  "まけんきチョッキ": "Defiance Vest",
  "ゴージャスマント": "Luxurious Cape",
  "テクノレーダー": "Techno Radar",
  "のろいのはたき": "Cursed Duster",
  "ブーストエナジー 古代": "Ancient Booster Energy Capsule",
  "ブーストエナジー 未来": "Future Booster Energy Capsule",
  "ワザマシンデヴォリューション": "Technical Machine: Devolution",
  "ワザマシン エヴォリューション": "Technical Machine: Evolution",
  "パトロールキャップ": "Patrol Cap",
  "リベンジパンチ": "Vengeful Punch",
  "はげましのてがみ": "Letter of Encouragement",
  "ガラスのラッパ": "Glass Trumpet",
  "重力玉": "Gravity Gemstone",
  "きらめく結晶": "Sparkling Crystal",
  "デラックスボム": "Deluxe Bomb",
  "偉大な大樹": "Grand Tree",
  "古びたふたの化石": "Antique Cover Fossil",
  "古びたねっこの化石": "Antique Root Fossil",
  "オッカのみ": "Occa Berry",
  "ウタンのみ": "Payapa Berry",
  "いいきずぐすり": "Super Potion",
  "とりかえチケット": "Redeemable Ticket",
  "鬼の仮面": "Ogre's Mask",
  "なかよしポフィン": "Buddy-Buddy Poffin",
  "プライムキャッチャー": "Prime Catcher",
  "ポケモン回収サイクロン": "Scoop Up Cyclone",
  "くさりもち": "Binding Mochi",
  "ハバンのみ": "Haban Berry",
  "マキシマムベルト": "Maximum Belt",
  "トレジャーガジェット": "Treasure Tracker",
  "緊急ボード": "Rescue Board",
  "つりざおMAX": "Max Rod",
  "むしとりセット": "Bug Catching Set",
  // ── 스타디움 ──
  "ビーチコート": "Beach Court",
  "テーブルシティ": "Mesagoza",
  "災いの荒野": "Calamitous Wasteland",
  "災いの雪山": "Calamitous Snowy Mountain",
  "ポケモンリーグ本部": "Pokémon League Headquarters",
  "タウンデパート": "Town Store",
  "ボウルタウン": "Artazon",
  "ゼロの大空洞": "Area Zero Underdepths",
  "ハッコウシティ": "Levincia",
  "ハロンタウン": "Postwick",
  "お祭り会場": "Festival Grounds",

  // ── 검증캠페인 사전보강(2026-06-05, 후보대조 검증) ──
  "改造ハンマー": "Crushing Hammer",
  "パルデアの学生": "Paldean Student",
  "マツバの確信": "Morty's Conviction",
  "ベルのまごころ": "Bianca's Devotion",
  "ネルケ": "Clive",
  "セイジ": "Salvatore",
  "ジャミングタワー": "Jamming Tower",
  "夜のタンカ": "Night Stretcher",
  "アクロマの執念": "Colress's Tenacity",
  "カシオペア": "Cassiopeia",
  "シトロンの機転": "Clemont's Quick Wit",
  "ミカンのまなざし": "Jasmine's Gaze",
  "ロケット団のサカキ": "Team Rocket's Giovanni",
  "ロケット団のアテナ": "Team Rocket's Ariana",
  "Nの筋書き": "N's Plan",
  "トウコ": "Hilda",
  "キャンデラ": "Candela",
  "スパーク": "Spark",
  "ブランシェ": "Blanche",
  "ボスの指令": "Boss's Orders",
  "ハッサク": "Hassel",
  "ニュートラルセンター": "Neutralization Zone",
  "クセロシキのたくらみ": "Xerosic's Machinations",
  "力の砂時計": "Powerglass",
  "シアノ": "Cyrano",
  "グラビティーマウンテン": "Gravity Mountain",
  "シュウメイ": "Atticus",
  "ロケット団のランス": "Team Rocket's Petrel",
  "ロケット団のアポロ": "Team Rocket's Archer",
  "ロケット団のラムダ": "Team Rocket's Proton",
  "ふうせん": "Air Balloon",
  "マコモ": "Fennel",
  "クラウン": "Harlequin",
  "ツールスクラッパー": "Tool Scrapper",
  "ふかそうち": "Egg Incubator",
  "ルアーモジュール": "Lure Module",
  "ネモのリュック": "Nemona's Backpack",
  "大きなふうせん": "Big Air Balloon",
  "ガチガチバンド": "Rigid Band",
  "たべのこし": "Leftovers",
  "ワザマシン かじばのいっぱつ": "Technical Machine: Crisis Punch",
  "クラベル": "Clavell",
  "レッスンスタジオ": "Practice Studio",
  "サカキのカリスマ": "Giovanni's Charisma",
  "おとりよせボックス": "Boxed Order",
  "リブートポッド": "Reboot Pod",
  "ハンドトリマー": "Hand Trimmer",
  "フルメタルラボ": "Full Metal Lab",
  "危険な密林": "Perilous Jungle",
  "ヒーローマント": "Hero's Cape",
  "ヘビーバトン": "Heavy Baton",
  "覚醒のドラム": "Awakening Drum",
  "おはやし笛": "Accompanying Flute",
  "シークレットボックス": "Secret Box",
  "ハンディサーキュレーター": "Handheld Fan",
  "デンジャラス光線": "Dangerous Laser",
  "ポケバイタルA": "Poké Vital A",
  "夜のアカデミー": "Academy at Night",
  "推理セット": "Deduction Kit",
  "リリバのみ": "Babiri Berry",
  "エキサイトスタジアム": "Lively Stadium",
  "スクランブルスイッチ": "Scramble Switch",
  "希望のアミュレット": "Amulet of Hope",
  "のんびりじゃらし": "Chill Teaser Toy",
  "ミラクルインカム": "Miracle Headset",
  "ナモのみ": "Colbur Berry",
  "ワザマシン フローライト": "Technical Machine: Fluorite",
  "ワザマシン デヴォリューション": "Technical Machine: Devolution",
  "スイレンのお世話": "Lana's Aid",
  "月明かりの丘": "Moonlit Hill",
  "テラスタルオーブ": "Tera Orb",
  "ロケット団のおじゃまロボ": "Team Rocket's Bother-Bot",
  "ロケット団のスーパーボール": "Team Rocket's Great Ball",
  "ロケット団のびっくりボム": "Team Rocket's Venture Bomb",
  "ロケット団の監視塔": "Team Rocket's Watchtower",
  "ロケット団のファクトリー": "Team Rocket's Factory",
  "ロケット団のレシーバー": "Team Rocket's Transceiver",
  "古びたはねの化石": "Antique Plume Fossil",
  "エネルギーコイン": "Energy Coin",
  "ブレイブバングル": "Brave Bangle",
  "チェレン": "Cheren",
  "ポケストップ": "PokéStop",
  "ティエルノ": "Tierno",
  // ── MEGA 닌자스피너(en-tcg-me4 Chaos Rising, 2026-06-07 orphan 대조검증) ──
  // 인명: ホミカ=Roxie · ジプソ=Philippe(이미지 판정: 동일 인물+효과문 일치) · マチエール=Emma(소거 확정)
  "ジプソ": "Philippe",
  "マチエール": "Emma",
  "アンジュフラエッテ": "Ange Floette",
  "スペシャルレッドカード": "Special Red Card",
  "大漁ネット": "Great Haul Net",
  "変化の書": "Transformation Tome",
  "AZの安らぎ": "AZ's Tranquility",
  "ホミカの演奏": "Roxie's Performance",
  "プリズムタワー": "Prism Tower",
  "ジャンボアイス": "Jumbo Ice Cream",
  "なみのりビーチ": "Surfing Beach",
  // ── MEGA 니힐제로(en-tcg-me3 Perfect Order, 2026-06-07 orphan 대조검증) ──
  // 인명 소거: SAR 2장(メイのはげまし·ユカリ) ↔ EN SIR 2장(Rosa's Encouragement·Jacinthe), メイ=Rosa 기확립 → ユカリ=Jacinthe → 잔여 1:1 ピュール=Naveen
  "エネはたき": "Energy Swatter",
  "古びたアゴの化石": "Antique Jaw Fossil",
  "古びたヒレの化石": "Antique Sail Fossil", // 화석 2종 닫힌 집합: アゴ=Jaw 직역 확정 → 소거로 ヒレ=Sail
  "ポケパッド": "Poké Pad",
  "ミアレガレット": "Lumiose Galette",
  "コアメモリ": "Core Memory",
  "タラゴン": "Tarragon",
  "ピュール": "Naveen",
  "メイのはげまし": "Rosa's Encouragement",
  "ユカリ": "Jacinthe",
  "ミアレシティ": "Lumiose City",
  "ワンダーパッチ": "Wondrous Patch",
  "せいなるはい": "Sacred Ash",
  "エネルギーリサイクル": "Energy Recycler",
  "活力の森": "Forest of Vitality",
};

// 博士の研究(Professor's Research)은 세트별 박사(Sada=고대/스칼렛 · Turo=미래/바이올렛)로 EN명이 갈린다.
// Sada(고대) 측 JP 세트 ID 목록 — 분할 세트 그룹에서 확인해 추가.
export const SADA_SETS = new Set<string>([
  "jp-tcg-SV1S", // 스칼렛ex (sv-base)
]);
export function profResearchEn(setId: string): string {
  return SADA_SETS.has(setId)
    ? "Professor's Research (Professor Sada)"
    : "Professor's Research (Professor Turo)";
}
