/**
 * SM(썬·문) 트레이너/스타디움 JP→EN 이름 사전 (merge-en-identity 트레이너 매칭용).
 * 일러스트레이터는 같은 일러에 여러 카드가 섞여 스크램블되므로, 트레이너의 정체성은 *이름*으로 잡는다.
 * EN명은 pokemontcg.io(set.id:sm1 / sm2) 의 name 문자열을 verbatim 으로 사용(버킷 일치 필수).
 * JP명은 data/jp-official/jp-sm1s·sm1m·sm1plus·sm2k·sm2l.json 의 jaName, 일러스트레이터 매칭으로 정렬.
 */
export const TR_JP2EN: Record<string, string> = {
  // ── en-sm1 그룹(SM1S/SM1M/SM1+) ──
  // 아이템
  "クラッシュハンマー": "Crushing Hammer",      // Yoshinobu Saito
  "タイマーボール": "Timer Ball",                // Toyste Beach
  "むしよけスプレー": "Repel",                   // Yoshinobu Saito
  "ロトム図鑑": "Rotom Dex",                     // 5ban Graphics
  "学習装置": "Exp. Share",                      // Toyste Beach (Pokémon Tool)
  "エネルギー回収": "Energy Retrieval",          // Toyste Beach
  "おおきいマラサダ": "Big Malasada",            // 5ban Graphics
  "ネストボール": "Nest Ball",                   // Toyste Beach
  "ポケモンいれかえ": "Switch",                  // Ryo Ueda
  "どくバリ": "Poison Barb",                     // Toyste Beach (Pokémon Tool)
  "エネルギーリサイクル": "Energy Recycler",     // Toyste Beach (EN은 sm2 수록)
  "改造ハンマー": "Enhanced Hammer",             // Yoshinobu Saito (EN은 sm2 수록)
  "ハイパーボール": "Ultra Ball",                // Ryo Ueda
  "ふしぎなアメ": "Rare Candy",                  // Toyste Beach
  "マルチつけかえ": "Multi Switch",              // Toyste Beach (EN은 sm2 수록)
  "まんたんのくすり": "Max Potion",              // Toyste Beach (EN은 sm2 수록)
  "こだわりハチマキ": "Choice Band",             // Eske Yoshinob (Pokémon Tool, EN은 sm2 수록)
  // 서포트(인물)
  "イリマ": "Ilima",                             // Ken Sugimori / Sanosuke Sakuma
  "ククイ博士": "Professor Kukui",               // Ken Sugimori / Megumi Mizutani
  "スカル団のしたっぱ": "Team Skull Grunt",      // Ken Sugimori / Sanosuke Sakuma
  "リーリエ": "Lillie",                          // Ken Sugimori / Megumi Mizutani
  // 스타디움
  "月輪の祭壇": "Altar of the Moone",            // 5ban Graphics (EN은 sm2 수록)
  "日輪の祭壇": "Altar of the Sunne",            // 5ban Graphics (EN은 sm2 수록)

  // ── en-sm2 그룹(SM2K/SM2L) ──
  // 아이템
  "エネくじ": "Energy Loto",                     // Yoshinobu Saito
  "フィールドブロアー": "Field Blower",          // Toyste Beach
  "アクアパッチ": "Aqua Patch",                  // Toyste Beach
  "レスキュータンカ": "Rescue Stretcher",        // Yoshinobu Saito
  // 서포트(인물)
  "ハラ": "Hala",                                // Ken Sugimori / Naoki Saito
  "マオ": "Mallow",                              // Ken Sugimori / Megumi Mizutani
  // 스타디움
  "エーテルパラダイス保護区": "Aether Paradise Conservation Area", // 5ban Graphics
  "せせらぎの丘": "Brooklet Hill",               // 5ban Graphics

  // ── en-sm3 그룹(SM2+/SM3N/SM3H, Burning Shadows) ──
  // 아이템
  "あなぬけのヒモ": "Escape Rope",               // Toyste Beach (jp-sm2+ #044)
  "じゃくてんほけん": "Weakness Policy",          // Ayaka Yoshida (Pokémon Tool, jp-sm2+ #045)
  "ねがいのバトン": "Wishful Baton",             // Toyste Beach (Pokémon Tool, jp-sm2+ #046)
  "いちゃもんスプレー": "Tormenting Spray",       // Toyste Beach (jp-sm3n #047)
  "スーパーポケモン回収": "Super Scoop Up",       // Toyste Beach (jp-sm3n #048 / sm3+ #062)
  "ロトム図鑑 ポケファインダーモード": "Rotom Dex Poké Finder Mode", // 5ban Graphics (jp-sm3h #047)
  "ムキムキダンベル": "Bodybuilding Dumbbells",   // Eske Yoshinob (Pokémon Tool, jp-sm3h #048)
  // 서포트(인물)
  "アセロラ": "Acerola",                          // Ken Sugimori / Megumi Mizutani (jp-sm2+ #047/#056)
  "マーマネ": "Sophocles",                        // Ken Sugimori / Sanosuke Sakuma (jp-sm2+ #048/#057, sm3+ #069)
  "ライチ": "Olivia",                             // Ken Sugimori (Akala 섬킹, jp-sm2+ #049) — ※スイレン=Lana 별개
  "グズマ": "Guzma",                              // Ken Sugimori / Masakazu Fukuda (jp-sm3n #049/#056)
  "ビッケ": "Wicke",                              // take / Naoki Saito (jp-sm3n #050/#057)
  "カキ": "Kiawe",                                // Ken Sugimori / Naoki Saito (jp-sm3h #049/#056)
  "プルメリ": "Plumeria",                         // Ken Sugimori / Sanosuke Sakuma (jp-sm3h #050/#057)
  // 스타디움
  "ポータウン": "Po Town",                        // 5ban Graphics (jp-sm3n #051)
  "ラナキラマウンテン": "Mount Lanakila",          // 5ban Graphics (jp-sm3h #051)

  // ── en-sm35 그룹(SM3+, Shining Legends) ──
  // 아이템
  "スーパーボール": "Great Ball",                 // Ryo Ueda (jp-sm3+ #061)
  "ダメージムーバー": "Damage Mover",             // Toyste Beach (jp-sm3+ #063)
  "ポケモンキャッチャー": "Pokémon Catcher",       // Toyste Beach (jp-sm3+ #066)
  // 서포트(인물)
  "ハウ": "Hau",                                  // Ken Sugimori (jp-sm3+ #067)
  "ポケモンブリーダー": "Pokémon Breeder",         // Kanako Eo / Sanosuke Sakuma (jp-sm3+ #068/#077)

  // ── en-sm4 그룹(SM4S/SM4A, Crimson Invasion) ──
  // 아이템
  "カウンターキャッチャー": "Counter Catcher",     // Toyste Beach (jp-sm4s #046)
  "のぞきみレッドカード": "Peeking Red Card",       // Toyste Beach (jp-sm4s #047)
  "ダッシュポーチ": "Dashing Pouch",               // Eske Yoshinob (Pokémon Tool, jp-sm4a #046)
  // 포켓몬 도구(메모리)
  "サイキックメモリ": "Psychic Memory",             // 5ban Graphics (Pokémon Tool, jp-sm4s #048)
  "ファイトメモリ": "Fighting Memory",             // 5ban Graphics (Pokémon Tool, jp-sm4s #049)
  // 서포트(인물)
  "グラジオ": "Gladion",                           // Ken Sugimori #050 / TOKIYA #055 (jp-sm4s)
  "ルザミーネ": "Lusamine",                        // take #047 / Megumi Mizutani #055 (jp-sm4a)
  // 스타디움
  "虚ろの海": "Sea of Nothingness",                // Ryo Ueda (jp-sm4a #048)
  "喰いつくされた原野": "Devoured Field",           // 5ban Graphics (jp-sm4a #049)

  // ── en-sm5 그룹(SM5S/SM5M, Ultra Prism — Sinnoh) ──
  // 아이템
  "きずぐすり": "Potion",                          // Toyste Beach (jp-sm5s #053; EN은 베이스셋 공용 — sm5 트레이너서브셋엔 없음)
  "ともだちてちょう": "Pal Pad",                    // Toyste Beach (jp-sm5s #054 → EN #132)
  "なぞの化石": "Unidentified Fossil",              // Toyste Beach (jp-sm5s #055 / sm6 #078 → EN sm5 #134 / sm6 #116)
  "ミッシングクローバー": "Missing Clover",          // Toyste Beach (jp-sm5s #058 → EN #129)
  "おとりよせパッド": "Order Pad",                  // Eske Yoshinob (jp-sm5m #053 → EN #131)
  "ハンサムホイッスル": "Looker Whistle",            // Toyste Beach (jp-sm5m #057 → EN #127)
  "エスケープボード": "Escape Board",               // Toyste Beach (Pokémon Tool, jp-sm5m #060 → EN #122)
  // 서포트(인물)
  // ⚠ Prism Star(◇) JP명은 DB 에 HTML span 접미사 포함 저장 → 그 형태로 키 등록(plain 키는 미스)
  'アカギ<span class="pcg pcg-prismstar"></span>': "Cyrus ◇", // Masakazu Fukuda (Prism Star, jp-sm5s #059 → EN #120)
  "ナタネ": "Gardenia",                            // Ken Sugimori / You Iribi (jp-sm5s #060/#070 → EN #124/#149)
  "ポケモンだいすきクラブ": "Pokémon Fan Club",      // Sanosuke Sakuma (jp-sm5s #061/#071 → EN #133/#155)
  "マーズ": "Mars",                                // Ken Sugimori / kodama (jp-sm5s #062/#072 → EN #128/#154)
  "シロナ": "Cynthia",                             // Ken Sugimori / nagimiso (jp-sm5m #061/#070 → EN #119/#148)
  "デンジ": "Volkner",                             // Ken Sugimori / TOKIYA (jp-sm5m #062/#071 → EN #135/#156)
  "ハンサム": "Looker",                            // Ken Sugimori / Hitoshi Ariga (jp-sm5m #063/#072 → EN #126/#152)
  "マキシ": "Lana",                                // Ken Sugimori / Naoki Saito (jp-sm5+ #046/#056 → EN sm5 #150) ※스이렌=Lana
  "ウルトラ調査隊": "Ultra Recon Squad",            // Megumi Mizutani (jp-sm5+ #044/#055, sm6 #114/#131)
  // 스타디움
  "テンガン山": "Mt. Coronet",                     // Ryo Ueda (jp-sm5s #064 → EN #130)
  "ウルトラスペース": "Ultra Space",                // 5ban Graphics (jp-sm5+ #047, EN은 sm6 #115)
  // 포켓몬 도구
  "鋼鉄のフライパン": "Metal Frying Pan",           // Toyste Beach (Pokémon Tool, jp-sm5+ #042, EN은 sm6 #112)
  "ビーストリング": "Beast Ring",                   // Toyste Beach (jp-sm5+ #041, EN은 sm6 #102)

  // ── en-sm6 그룹(SM6, Forbidden Light — Kalos) ──
  // 아이템
  "エネポーター": "Eneporter",                      // Toyste Beach (jp-sm6 #076 → EN #106/#142)
  "化石発掘マップ": "Fossil Excavation Map",         // Yoshinobu Saito (jp-sm6 #077 → EN #107)
  "ミステリートレジャー": "Mysterious Treasure",     // Eske Yoshinob (jp-sm6 #083 → EN #113)
  // 서포트(인물)
  "おじょうさま": "Lady",                          // Yusuke Ohmura / Kanako Eo (jp-sm6 #085/#100 → EN #109)
  "カルネ": "Diantha",                             // Ken Sugimori / nagimiso (jp-sm6 #086/#101 → EN #105/#130)
  "ジャッジマン": "Judge",                         // Sanosuke Sakuma (jp-sm6 #087, sm7a #057/#066 → EN sm6 #108)
  'フラダリ<span class="pcg pcg-prismstar"></span>': "Lysandre ◇", // Hitoshi Ariga (Prism Star, jp-sm6 #089 → EN #110)
  "ユリーカ": "Bonnie",                            // Hideki Ishikawa (jp-sm6 #090/#102 → EN #103/#128)
  // 스타디움
  "フラダリラボ": "Lysandre Labs",                  // Ryo Ueda (jp-sm6 #092 → EN #111)

  // ── en-sm75 그룹(SM6a, Dragon Majesty — 자체 EN) ──
  // 아이템
  "いれかえフロート": "Switch Raft",                // Yoshinobu Saito (jp-sm6a #044 → EN #62/#77)
  "火打石": "Fiery Flint",                         // Eske Yoshinob (jp-sm6a #045 → EN #60/#76)
  "竜の鉤爪": "Dragon Talon",                       // Toyste Beach (Pokémon Tool, jp-sm6a #046 → EN #59/#75)
  // 서포트(인물)
  "カツラの一発勝負": "Blaine's Last Stand",         // Ken Sugimori / Mitsuhiro Arita (jp-sm6a #048/#058 → EN #58/#69)
  "ヒガナ": "Zinnia",                              // Megumi Mizutani / Hideki Ishikawa (jp-sm6a #049/#059 → EN #64/#70)
  'ワタル<span class="pcg pcg-prismstar"></span>': "Lance ◇", // kodama (Prism Star, jp-sm6a #050 → EN #61)
  // 스타디움
  "ヴェラ火山公園": "Wela Volcano Park",            // 5ban Graphics (jp-sm6a #051 → EN #63)

  // ── en-sm7 그룹(SM7, Celestial Storm — Hoenn) ──
  // 아이템
  "ギリギリポーション": "Last Chance Potion",        // Ayaka Yoshida (jp-sm7 #079 → EN #135)
  "ダートじてんしゃ": "Acro Bike",                  // Toyste Beach (jp-sm7 #080 → EN #123)
  "レインボーブラシ": "Rainbow Brush",              // Eske Yoshinob (jp-sm7 #085 → EN #141/#182)
  "ハッスルベルト": "Hustle Belt",                  // Yoshinobu Saito (Pokémon Tool, jp-sm7 #087 → EN #134/#179)
  // 서포트(인물)
  "ダイゴの決断": "Steven's Resolve",               // Hitoshi Ariga (jp-sm7 #088/#102 → EN #145/#165)
  "釣り人": "Fisherman",                           // Masakazu Fukuda (jp-sm7 #089 → EN #130)
  "フウとラン": "Tate & Liza",                      // Megumi Mizutani / Hideki Ishikawa (jp-sm7 #091/#103 → EN #148/#166)
  "ルチア": "Lisia",                               // Megumi Mizutani / Naoki Saito (jp-sm7 #093/#104 → EN #137/#164)
  // 스타디움
  "戒めの祠": "Shrine of Punishment",              // 5ban Graphics (jp-sm7 #094 → EN #143)
  "そらのはしら": "Sky Pillar",                     // Ryo Ueda (jp-sm7 #095 → EN #144)

  // ── en-sm7 보조: SM7 본문에 EN짝 있으나 사전 미등록이던 잔여(SM6b/SM7a 출신 동명) ──
  // 아이템
  "エネルギー循環装置": "Energy Recycle System",     // Zu-Ka (jp-sm6b #052 → EN sm7 #128)
  "エネルギーつけかえ": "Energy Switch",            // Ken Ikuji / Ryo Ueda (jp-sm6b #053, sm7a #045 → EN sm7 #129)
  "フレンドボール": "Friend Ball",                  // Katsura Tabata (jp-sm6b #057 → EN sm7 #131)
  "ポケナビ": "PokéNav",                           // Katsura Tabata (jp-sm6b #058 → EN sm7 #140/#181)
  "ルアーボール": "Lure Ball",                      // Katsura Tabata (jp-sm6b #060 → EN sm7 #138)
  // 서포트(인물)
  "地底探険隊": "Underground Expedition",           // Kagemaru Himeno (jp-sm6b #061/#073 → EN sm7 #150/#168)
  "TVレポーター": "TV Reporter",                    // Ken Sugimori / nagimiso (jp-sm6b #062/#074 → EN sm7 #149/#167)
  "ぼんぐり職人": "Apricorn Maker",                 // Kagemaru Himeno (jp-sm6b #063/#075 → EN sm7 #124/#161)
  "マサキのメンテナンス": "Bill's Maintenance",      // Ken Sugimori / Sanosuke Sakuma (jp-sm6b #064/#076 → EN sm7 #126/#162)
  "モノマネむすめ": "Copycat",                      // Ken Sugimori / Megumi Mizutani (jp-sm6b #065/#077 → EN sm7 #127/#163)
  "かんこうきゃく": "Hiker",                        // Naoki Saito (jp-sm7a #056 → EN sm7 #133)

  // ── en-sm8 예약: SM7a/SM7b EN짝이 Lost Thunder(sm8)로 가는 트레이너(이번 SM7 배치엔 미병합, 향후 sm8용) ──
  // SM7a 발(SM7a 는 SM7 배치에 포함되지만 이 트레이너들의 EN 은 sm8 수록 → sm7 병합엔 미사용)
  "エレキパワー": "Electropower",                   // Eske Yoshinob (jp-sm7a #046 → EN sm8 #172)
  "ミックスハーブ": "Mixed Herbs",                  // Toyste Beach (jp-sm7a #052 → EN sm8 #184)
  "カウンターゲイン": "Counter Gain",               // Toyste Beach (Pokémon Tool, jp-sm7a #053 → EN sm8 #170)
  "カスタムキャッチャー": "Custom Catcher",          // Toyste Beach (jp-sm7a #047 → EN sm8 #171)
  "カヒリ": "Kahili",                              // Ken Sugimori / Megumi Mizutani (jp-sm7a #055/#065 → EN sm8 #179/#210)
  'サンダーマウンテン<span class="pcg pcg-prismstar"></span>': "Thunder Mountain ◇", // 5ban Graphics (Prism Star, jp-sm7a #058 → EN sm8 #191)
  // SM7b 발(SM7b 는 SM7 배치 제외 — EN 전량 sm8)
  "ネットボール": "Net Ball",                       // Ryo Ueda (jp-sm7b #042 → EN sm8)
  "ぼうけんのカバン": "Adventure Bag",              // Yoshinobu Saito (jp-sm7b #043 → EN sm8)
  "のろいのおふだ": "Spell Tag",                    // Ayaka Yoshida (Pokémon Tool, jp-sm7b #044 → EN sm8)
  "フェアリーチャーム超": "Fairy Charm Psychic",     // Toyste Beach (Pokémon Tool, jp-sm7b #045 → EN sm8)
  "フェアリーチャーム闘": "Fairy Charm Fighting",    // Toyste Beach (Pokémon Tool, jp-sm7b #046 → EN sm8)
  "フェアリーチャームドラゴン": "Fairy Charm Dragon", // Toyste Beach (Pokémon Tool, jp-sm7b #047 → EN sm8)
  "マツバ": "Morty",                               // Ken Sugimori / Sanosuke Sakuma (jp-sm7b #048/#055 → EN sm8)
  "マツリカ": "Mina",                              // Ken Sugimori / You Iribi (jp-sm7b #049/#056 → EN sm8)
  'ライフフォレスト<span class="pcg pcg-prismstar"></span>': "Life Forest ◇", // 5ban Graphics (Prism Star, jp-sm7b #050 → EN sm8)

  // ── en-sm8 그룹(SM8, Lost Thunder — Johto): SM8 본문 트레이너 ──
  // 아이템
  "あとだしハンマー": "Wait and See Hammer",        // Yoshinobu Saito (jp-sm8 #077 → EN #192/#236)
  "ロストミキサー": "Lost Blender",                 // 5ban Graphics (jp-sm8 #083 → EN #181/#233)
  "モーモーミルク": "Moomoo Milk",                  // Ayaka Yoshida (jp-sm8 #082 → EN #185)
  "フェアリーチャーム草": "Fairy Charm Grass",       // Toyste Beach (Pokémon Tool, jp-sm8 #086 → EN #174)
  "こだわりメット": "Choice Helmet",                // Eske Yoshinob (Pokémon Tool, jp-sm8 #085 → EN #169/#229)
  // 서포트(인물)
  "アカネ": "Whitney",                             // Ken Sugimori / Sanosuke Sakuma (jp-sm8 #087/#101 → EN #193/#214)
  "ウツギ博士のレクチャー": "Professor Elm's Lecture", // Hideki Ishikawa (jp-sm8 #088/#102 → EN #188/#213)
  "ザオボー": "Faba",                              // take (jp-sm8 #089/#103 → EN #173/#208)
  'ルザミーネ<span class="pcg pcg-prismstar"></span>': "Lusamine ◇", // nagimiso (Prism Star, jp-sm8 #092 → EN #182)
  // 스타디움
  'ヒートファクトリー<span class="pcg pcg-prismstar"></span>': "Heat Factory ◇", // 5ban Graphics (Prism Star, jp-sm8 #093 → EN #178)

  // ── en-sm9 그룹(SM8a, Team Up — SM8a 발 트레이너의 EN 은 sm9 수록; sm8 병합엔 미사용) ──
  // 아이템
  "エレキチャージャー": "Electrocharger",           // Eske Yoshinob (jp-sm8a #046 → EN sm9 #139/#193)
  "デンジャラスドリル": "Dangerous Drill",           // Toyste Beach (jp-sm8a #048 → EN sm9 #138/#192)
  "メタルゴーグル": "Metal Goggles",                // Yoshinobu Saito (Pokémon Tool, jp-sm8a #049 → EN sm9 #148/#195)
  'ブラックマーケット<span class="pcg pcg-prismstar"></span>': "Black Market ◇", // 5ban Graphics (Prism Star, jp-sm8a #052 → EN sm9 #134)
  // 서포트(인물)
  "クチナシ": "Nanu",                              // Ken Sugimori / Hitoshi Ariga (jp-sm8a #050/#057 → EN sm9 #150/#179)
  "ミカン": "Jasmine",                             // Ken Sugimori / Hideki Ishikawa (jp-sm8a #051/#058 → EN sm9 #145/#177)

  // ── en-sm9 그룹(SM9, Tag Bolt — タッグボルト) ──
  // 아이템/도구
  "ジャッジマンホイッスル": "Judge Whistle",         // Ayaka Yoshida (Item, jp-sm9 #078 → EN sm9 #146/#194)
  "ポケモン通信": "Pokémon Communication",          // Ayaka Yoshida (Item, jp-sm9 #082 → EN sm9 #152/#196)
  "ムキムキパッド": "Buff Padding",                 // Yoshinobu Saito (Pokémon Tool, jp-sm9 #083 → EN sm9 #136)
  // 스타디움
  "シオンタウン": "Lavender Town",                  // 5ban Graphics (Stadium, jp-sm9 #090 → EN sm9 #147)
  "トキワの森": "Viridian Forest",                  // 5ban Graphics (Stadium, jp-sm9 #091 → EN sm9 #156)
  // 서포트(인물)
  "エリカのおもてなし": "Erika's Hospitality",       // Sanosuke Sakuma (jp-sm9 #084/#107 → EN sm9 #140/#174)
  "タケシのガッツ": "Brock's Grit",                 // Naoki Saito (jp-sm9 #087/#108 → EN sm9 #135/#172)
  "ナツメの暗示": "Sabrina's Suggestion",           // Hitoshi Ariga (jp-sm9 #088/#109 → EN sm9 #154/#181)
  "マサキの解析": "Bill's Analysis",                // Naoki Saito (jp-sm9 #089 → EN sm9 #133)

  // ── en-sm10 그룹(Unbroken Bonds = SM9b 풀메탈월 + SM9a 나이트유니슨 + SM10 더블블레이즈) ──
  // SM9a(나이트유니슨) — EN 은 Unbroken Bonds 수록
  "電磁レーダー": "Electromagnetic Radar",          // jp-sm9a #043 → EN sm10 #169/#230
  "ポケギア3.0": "Pokégear 3.0",                   // jp-sm9a #045 → EN sm10 #182/#233
  "フェアリーチャーム 雷": "Fairy Charm Lightning",  // jp-sm9a #047 → EN sm10 #172
  "フェアリーチャーム 特性": "Fairy Charm Ability",  // jp-sm9a #048 → EN sm10 #171
  "アンズ": "Janine",                              // jp-sm9a #049/#062 → EN sm10 #176/#210
  "キョウの罠": "Koga's Trap",                      // jp-sm9a #050/#063 → EN sm10 #177/#211
  "マチスの作戦": "Lt. Surge's Strategy",           // jp-sm9a #051 → EN sm10 #178
  "びっくりボックス": "Surprise Box",                // jp-sm9a #044 → EN sm10 #187
  "隠密フード": "Stealthy Hood",                    // jp-sm9a #046 → EN sm10 #186
  // SM9b(풀메탈월) — EN 은 Unbroken Bonds 수록
  "退化スプレーZ": "Devolution Spray Z",            // jp-sm9b #044 → EN sm10 #166
  "メタルコアバリア": "Metal Core Barrier",          // jp-sm9b #046 → EN sm10 #180/#232
  "ウルトラフォレストのかみつかい": "Ultra Forest Kartenvoy", // jp-sm9b #047 → EN sm10 #188
  "ブルーの探索": "Green's Exploration",            // jp-sm9b #048/#061 → EN sm10 #175/#209
  "無人発電所": "Power Plant",                      // jp-sm9b #050 → EN sm10 #183
  "マーレイン": "Molayne",                          // jp-sm9b #049/#062 → EN sm10 #181/#212
  "ビーストブリンガー": "Beast Bringer",            // jp-sm9b #045 → EN sm10 #164/#229
  // SM10(더블블레이즈)
  "炎の結晶": "Fire Crystal",                       // jp-sm10 #083 → EN sm10 #173/#231
  "ザクザクピッケル": "Chip-Chip Ice Axe",          // jp-sm10 #080 → EN sm10 #165
  "やみのいし": "Dusk Stone",                       // jp-sm10 #084 → EN sm10 #167
  "ダストアイランド": "Dust Island",                // jp-sm10 #090 (Stadium) → EN sm10 #168
  "格闘道場": "Martial Arts Dojo",                  // jp-sm10 #089 (Stadium) → EN sm10 #179
  "サカキの追放": "Giovanni's Exile",               // jp-sm10 #085/#105 → EN sm10 #174/(UR)
  "溶接工": "Welder",                              // jp-sm10 #087/#106 → EN sm10 #189/#214
  "レッドの挑戦": "Red's Challenge",                // jp-sm10 #088/#107 → EN sm10 #184/#213

  // ── en-sm11 그룹(Unified Minds = SM10a GG엔드 + SM10b 스카이레전드 + SM11 미라클트윈 + SM11a 리믹스바우트) ──
  // SM10a(GG엔드)
  "タッグスイッチ": "Tag Switch",                   // jp-sn10a #045 → EN sm11 #209/#254
  "リセットスタンプ": "Reset Stamp",                // jp-sn10a #046 → EN sm11 #206/#253
  "くろおび": "Karate Belt",                        // jp-sn10a #047 → EN sm11 #201/#252
  "ギーマ": "Grimsley",                            // jp-sn10a #048/#061 → EN sm11 #199/#234
  "コーチトレーナー": "Coach Trainer",              // jp-sn10a #049/#062 → EN sm11 #192/#233
  "巨大なカマド": "Giant Hearth",                   // jp-sn10a #050 → EN sm11 #197
  // SM10b(스카이레전드)
  "ノーマルZ たいあたり": "Normalium Z: Tackle",     // jp-sm10b #044 → EN sm11 #203
  "ヒコウZ エアスラッシュ": "Flyinium Z: Air Slash", // jp-sm10b #045 → EN sm11 #195
  "Uターンボード": "U-Turn Board",                  // jp-sm10b #046 → EN sm11 #211/#255
  "ブリザードタウン": "Blizzard Town",              // jp-sm10b #049 → EN sm11 #187
  // SM11(미라클트윈)
  "グレートポーション": "Great Potion",             // jp-sn11 #081 → EN sm11 #198
  "スタジアムナビ": "Stadium Nav",                  // jp-sn11 #082 → EN sm11 #208
  "ジャイアントボム": "Giant Bomb",                 // jp-sn11 #084 → EN sm11 #196/#251
  "カスミのおねがい": "Misty's Favor",              // jp-sn11 #085/#104 → EN sm11 #202/#235
  "きとうし": "Channeler",                          // jp-sn11 #086/#105 → EN sm11 #190/#232
  "グリーンの戦略": "Blue's Tactics",               // jp-sn11 #087/#106 (グリーン=Blue) → EN sm11 #188/#231
  "まどろみの森": "Slumbering Forest",              // jp-sn11 #088 → EN sm11 #207
  "ポケモンけんきゅうじょ": "Pokémon Research Lab",  // jp-sn11 #089 → EN sm11 #205
  // SM11a(리믹스바우트)
  "かいじゅうマニア": "Poké Maniac",                // jp-sm11a #047/#061 → EN sm11 #204/#236

  // ── en-sm12 그룹(Cosmic Eclipse = SM11a 리믹스바우트 + SM11b 드림리그 + SM12 얼터제네시스) ──
  // 트레이너 태그팀(인물 듀오 서포터)
  "シロナ&カトレア": "Cynthia & Caitlin",          // jp-sm12 #088/#106 → EN sm12
  "マオ&スイレン": "Mallow & Lana",                // jp-sm12 #089/#107 → EN sm12
  "レッド&グリーン": "Red & Blue",                 // jp-sm12 #090/#108 (グリーン=Blue) → EN sm12
  "グズマ&ハラ": "Guzma & Hala",                   // jp-sm12 #087/#105 → EN sm12
  // 캐릭터 서포터
  "イツキ": "Will",                                // jp-sm12 #044 → EN sm12
  "メイ": "Rosa",                                  // jp-sm12 #047/#067 → EN sm12
  "ヤーコン": "Clay",                              // jp-sm12 #048 → EN sm12
  "リーリエの全力": "Lillie's Full Force",          // jp-sm12 #049/#068 → EN sm12
  "Nの覚悟": "N's Resolve",                        // jp-sm12 #045/#066 → EN sm12
  "ホミカ": "Roxie",                               // jp-sm12 #046 → EN sm12
  // 아이템/도구/스타디움
  "リーリエのピッピ人形": "Lillie's Poké Doll",     // jp-sm12 #043 → EN sm12
  "スイレンのつりざお": "Lana's Fishing Rod",       // jp-sm12 #042 → EN sm12
  "しまめぐりのあかし": "Island Challenge Amulet",  // jp-sm12 #085 → EN sm12
  "タッグコール": "Tag Call",                       // jp-sm12 #083 → EN sm12
  "ビーストナイト": "Beastite",                     // jp-sm12 #086 → EN sm12
  "混沌のうねり": "Chaotic Swell",                  // jp-sm12 #091 (Stadium) → EN sm12
  "グレートキャッチャー": "Great Catcher",          // jp-sm11a/sm12 #052 → EN sm12
  "オーキド博士のセッティング": "Professor Oak's Setup", // jp-sm12 #056/#072 → EN sm12
  "ローラースケーター": "Roller Skater",            // jp-sm12 #058/#073 → EN sm12

  // ── 검증캠페인 사전보강(2026-06-05, 후보대조 검증) ──
  "ムサシとコジロウ": "Jessie & James",
  "グズマ&amp;ハラ": "Guzma & Hala",
  "シロナ&amp;カトレア": "Cynthia & Caitlin",
  "マオ&amp;スイレン": "Mallow & Lana",
  "レッド&amp;グリーン": "Red & Blue",
  "ノボリとクダリ": "Ingo & Emmet",
  "プレシャスボール": "Cherish Ball",
  "ウォーターメモリ": "Water Memory",
  "グラスメモリ": "Grass Memory",
  "フェアリーチャーム UB": "Fairy Charm UB",
  "エーテル財団職員": "Aether Foundation Employee",
  "やまおとこ": "Hiker",
  'ワンダーラビリンス<span class="pcg pcg-prismstar"></span>': "Wondrous Labyrinth ◇",
};
