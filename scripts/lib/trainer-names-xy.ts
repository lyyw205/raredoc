/**
 * XY(엑스·와이) 트레이너/스타디움 JP→EN 이름 사전 (merge-en-identity 트레이너 매칭용).
 * JP명은 jp-tcg-XY1a/XY1b 등 일본공식(pokemon-card.com) 재수집 로케일명.
 * EN명은 pokemontcg.io(set.id:xy1 등) name verbatim. 배치마다 추가.
 */
export const TR_JP2EN: Record<string, string> = {
  // ── en-xy1 그룹(XY1a 콜렉션X + XY1b 콜렉션Y) ──
  // 아이템/도구/스타디움
  "げんきのかたまり": "Max Revive",
  "シンカソーダ": "Evosoda",
  "ローラースケート": "Roller Skates",
  "ちからのハチマキ": "Muscle Band",
  "いいきずぐすり": "Super Potion",
  "はかせのてがみ": "Professor's Letter",
  "レッドカード": "Red Card",
  "かたいおまもり": "Hard Charm",
  // 서포트(인물)
  "プラターヌ博士": "Professor Sycamore",
  "フレア団のしたっぱ": "Team Flare Grunt",
  "クロケア": "Cassius",
  "ティエルノ": "Tierno", // EN xy1엔 미수록(Shauna만) → 후속 XY세트용 등록

  // ── en-xy2 그룹(XY2 와일드 블레이즈 / Flashfire) ──
  // 아이템/도구/스타디움
  "いたずらスコップ": "Trick Shovel",
  "せいなるはい": "Sacred Ash",
  "びっくりメガホン": "Startling Megaphone",
  "炎のトーチ": "Fiery Torch",
  "プロテクトキューブ": "Protection Cube",
  "磁気嵐": "Magnetic Storm",
  // 서포트(인물)
  "フラダリ": "Lysandre",
  "ポケモンセンターのお姉さん": "Pokémon Center Lady",
  "ポケモンだいすきクラブ": "Pokémon Fan Club",

  // ── en-xy3 그룹(XY3 라이징 피스트 / Furious Fists) ──
  // 아이템/도구/스타디움
  "ツールストリップ": "Tool Retriever",
  "メンテナンス": "Maintenance",
  "アゴの化石": "Jaw Fossil",
  "ヒレの化石": "Sail Fossil",
  "輝くガウン": "Sparkling Robe",
  "きあいのタスキ": "Focus Sash",
  "トレーニングセンター": "Training Center",
  "ファイティングスタジアム": "Fighting Stadium",
  "マウンテンリング": "Mountain Ring",
  // 서포트(인물)
  "化石研究員": "Fossil Researcher",
  "コルニ": "Korrina",
  "バトルレポーター": "Battle Reporter",

  // ── en-xy4 그룹(XY4 팬텀 게이트 / Phantom Forces) ──
  // 아이템/도구/스타디움 (플레어단 기어·소울링크 등)
  "ターゲットホイッスル（フレア団ギア）": "Target Whistle Team Flare Gear",
  "バトルコンプレッサー（フレア団ギア）": "Battle Compressor Team Flare Gear",
  "みがわりロボ（フレア団ギア）": "Robo Substitute Team Flare Gear",
  "ライボルトソウルリンク": "Manectric Spirit Link",
  "ジャミングネット（フレア団ハイパーギア）": "Jamming Net Team Flare Hyper Gear",
  "ヘッドノイザー（フレア団ハイパーギア）": "Head Ringer Team Flare Hyper Gear",
  "次元の谷": "Dimension Valley",
  // 서포트(인물)
  "AZ": "AZ",
  "クセロシキ": "Xerosic",
  "フラダリの奥の手": "Lysandre's Trump Card",

  // ── en-xy5 그룹(XY5 가이아볼케이노 + XY5a 타이달스톰 / Primal Clash) ──
  // 아이템/도구/스타디움
  "ダートじてんしゃ": "Acro Bike",
  "ふしぎなアメ": "Rare Candy",
  "リピートボール": "Repeat Ball",
  "じゃくてんほけん": "Weakness Policy",
  "グラードンソウルリンク": "Groudon Spirit Link",
  "ボスゴドラソウルリンク": "Aggron Spirit Link",
  "記憶のほこら": "Shrine of Memories",
  "灼熱の大地": "Scorched Earth",
  "あなぬけのヒモ": "Escape Rope",
  "おいしいみずセット": "Fresh Water Set",
  "ダイブボール": "Dive Ball",
  "学習装置": "Exp. Share",
  "カイオーガソウルリンク": "Kyogre Spirit Link",
  "サーナイトソウルリンク": "Gardevoir Spirit Link",
  "うねりの大海": "Rough Seas",
  "サイレントラボ": "Silent Lab",
  // 서포트(인물)
  "センパイとコウハイ": "Teammates",
  "マツブサの隠し玉": "Maxie's Hidden Ball Trick",
  "アオギリの切り札": "Archie's Ace in the Hole",
  "オダマキ博士の観察": "Professor Birch's Observations",
  // ── CP1 Double Crisis(en-tcg-dc1, 2026-06-05 orphan 대조검증) ──
  "アクア団のスーパーボール": "Team Aqua's Great Ball",
  "マグマ団のスーパーボール": "Team Magma's Great Ball",
  "アクアディフューザー": "Aqua Diffuser",
  "マグマポインター": "Magma Pointer",
  "アクア団の幹部": "Team Aqua Admin",
  "アクア団のしたっぱ": "Team Aqua Grunt",
  "マグマ団の幹部": "Team Magma Admin",
  "マグマ団のしたっぱ": "Team Magma Grunt",
  "アクア団の秘密基地": "Team Aqua's Secret Base",
  "マグマ団の秘密基地": "Team Magma's Secret Base",
  // ── XY6 Roaring Skies(en-tcg-xy6, 2026-06-05 orphan 대조검증) ──
  "トレーナーズポスト": "Trainers' Mail",
  "メガターボ": "Mega Turbo",
  "こうかくレンズ": "Wide Lens",
  "エルレイドソウルリンク": "Gallade Spirit Link",
  "ラティオスソウルリンク": "Latios Spirit Link",
  "ナギ": "Winona",
  "ミツル": "Wally",
  "スカイフィールド": "Sky Field",
  // ── XY7 Ancient Origins(en-tcg-xy7, 2026-06-05 orphan 대조검증) ──
  "エコアーム": "Eco Arm",
  "ペンキローラー": "Paint Roller",
  "レベルボール": "Level Ball",
  "ラッキーメット": "Lucky Helmet",
  "ジュカインソウルリンク": "Sceptile Spirit Link",
  "デンリュウソウルリンク": "Ampharos Spirit Link",
  "バンギラスソウルリンク": "Tyranitar Spirit Link",
  "エリートトレーナー": "Ace Trainer",
  "オカルトマニア": "Hex Maniac",
  "色の消えた町": "Faded Town",
  "巨大植物の森": "Forest of Giant Plants",
  // ── XY8 BREAKthrough(en-tcg-xy8 합본, 2026-06-05 orphan 대조검증) ──
  "かるいし": "Float Stone",
  "オニゴーリソウルリンク": "Glalie Spirit Link",
  "ミュウツーソウルリンク": "Mewtwo Spirit Link",
  "アズサ": "Brigette",
  "パラレルシティ": "Parallel City",
  "ヘビーボール": "Heavy Ball",
  "とつげきチョッキ": "Assault Vest",
  "ヘルガーソウルリンク": "Houndoom Spirit Link",
  "サカキの計画": "Giovanni's Scheme",
  // ── XY9 BREAKpoint(en-tcg-xy9, 2026-06-05 orphan 대조검증) ──
  "時のパズル": "Puzzle of Time",
  "ピーピーマックス": "Max Elixir",
  "炸裂バルーン": "Bursting Balloon",
  "闘魂のまわし": "Fighting Fury Belt",
  "ギャラドスソウルリンク": "Gyarados Spirit Link",
  "ハッサムソウルリンク": "Scizor Spirit Link",
  "こわいおねえさん": "Delinquent",
  "サイキッカーの心眼": "Psychic's Third Eye",
  "リバースバレー": "Reverse Valley",
  // ── XY10 Fates Collide(en-tcg-xy10, 2026-06-05 orphan 대조검증) ──
  "化石採掘キット": "Fossil Excavation Kit",
  "メガキャッチャー": "Mega Catcher",
  "かいの化石 オムナイト": "Helix Fossil Omanyte",
  "こうらの化石 カブト": "Dome Fossil Kabuto",
  "ひみつのコハク プテラ": "Old Amber Aerodactyl",
  "エネルギーポーチ": "Energy Pouch",
  "ねじれたスプーン": "Bent Spoon",
  "チルタリスソウルリンク": "Altaria Spirit Link",
  "フーディンソウルリンク": "Alakazam Spirit Link",
  "N": "N",
  "ロケット団の工作": "Team Rocket's Handiwork",
  "カオスタワー": "Chaos Tower",
  // ── XY11 Steam Siege(en-tcg-xy11 합본, 2026-06-05 orphan 대조검증) ──
  "たての化石 タテトプス": "Armor Fossil Shieldon",
  "ツメの化石 アノプス": "Claw Fossil Anorith",
  "スペシャルチャージ": "Special Charge",
  "欲張りダイス": "Greedy Dice",
  "ハガネールソウルリンク": "Steelix Spirit Link",
  "ニンジャごっこ": "Ninja Boy",
  "ポケモンレンジャー": "Pokémon Ranger",
  // ── CP6 BASE PACK 20th(en-tcg-xy12 Evolutions, 2026-06-05 orphan 대조검증) ──
  "エネルギー回収": "Energy Retrieval",
  "きずぐすり": "Potion",
  "げんきのかけら": "Revive",
  "退化スプレー": "Devolution Spray",
  "なんでもなおし": "Full Heal",
  "ポケモンいれかえ": "Switch",
  "ポケモン図鑑": "Pokédex",
  "カメックスソウルリンク": "Blastoise Spirit Link",
  "ピジョットソウルリンク": "Pidgeot Spirit Link",
  "フシギバナソウルリンク": "Venusaur Spirit Link",
  "リザードンソウルリンク": "Charizard Spirit Link",
  "オーキド博士のヒント": "Professor Oak's Hint",
  "カスミのやる気": "Misty's Determination",
  "タケシのガッツ": "Brock's Grit",
  "ロケット団参上!": "Here Comes Team Rocket!",
};
