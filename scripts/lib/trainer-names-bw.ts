/**
 * BW(블랙·화이트) 트레이너/스타디움 JP→EN 이름 사전 (merge-en-identity 트레이너 매칭용).
 * JP명은 jp-tcg-BW* 일본공식(pokemon-card.com) 재수집 로케일명.
 * EN명은 pokemontcg.io(set.id:bw1 등) name verbatim. 배치마다 orphan 대조검증 후 추가.
 */
export const TR_JP2EN: Record<string, string> = {
  // ── BW1 블랙/화이트 컬렉션(en-tcg-bw1, 2026-06-06 orphan 대조검증; 일부 EN은 bw2 Emerging Powers 수록) ──
  "エネルギー回収": "Energy Retrieval",
  "アララギ博士": "Professor Juniper",
  "げんきのかけら": "Revive",
  "なんでもなおし": "Full Heal",
  "プラスパワー": "PlusPower",
  "ポケモン通信": "Pokémon Communication",
  "クラッシュハンマー": "Crushing Hammer",
  "まんたんのくすり": "Max Potion",
  "リサイクル": "Recycle",
  "スーパーボール": "Great Ball",
  "ポケモンキャッチャー": "Pokémon Catcher",
  "チェレン": "Cheren",
  // ── BW3 사이코드라이브/헤일블리자드(EN 주대응=en-tcg-bw4 Next Destinies, 2026-06-06 orphan 대조검증) ──
  "レベルボール": "Level Ball",
  "学習装置": "Exp. Share",
  "スカイアローブリッジ": "Skyarrow Bridge",
  "ヘビーボール": "Heavy Ball",
  "デント": "Cilan",
  "ポケモンセンター": "Pokémon Center",
  // ── BW4 다크러시(EN 주대응=en-tcg-bw5 Dark Explorers) ──
  "改造ハンマー": "Enhanced Hammer",
  "ダークパッチ": "Dark Patch",
  "ふしぎなアメ": "Rare Candy",
  "ひみつのコハク プテラ": "Old Amber Aerodactyl",
  "悪のツメ": "Dark Claw",
  "バッドチームのジムとサブ": "Hooligans Jim & Cas",
  "ネジ山": "Twist Mountain",
  // ── 드래곤셀렉션(EN=en-tcg-dv1 Dragon Vault) ──
  "ファーストチケット": "First Ticket",
  // ── BW5 리유즈블라스트/리유노블레이드(EN 주대응=en-tcg-bw6 Dragons Exalted, 2026-06-06 orphan 대조검증) ──
  "退化スプレー": "Devolution Spray",
  "大きなマント": "Giant Cape",
  "レスキュースカーフ": "Rescue Scarf",
  "ツールスクラッパー": "Tool Scrapper",
  // ── BW6 프리즈볼트/콜드플레어(EN 주대응=en-tcg-bw7 Boundaries Crossed, 2026-06-06 orphan 대조검증) ──
  // ※ 아래 4종 EN은 BCR 미수록(Plasma Storm/Freeze 수록) — JP 게일 재록 대비 사전만 등재(2026-06-06)
  "あなぬけのヒモ": "Escape Rope",
  "タチワキシティジム": "Virbank City Gym",
  "じてんしゃ": "Bicycle",
  "ピーピーエイド": "Ether",
  "タウンマップ": "Town Map",
  "ヒュウ": "Hugh",
  "フウロ": "Skyla",
  "ヒオウギシティジム": "Aspertia City Gym",
  "ゴールドポーション": "Gold Potion",
  "クリスタルウォール": "Crystal Wall",
  "クリスタルエッジ": "Crystal Edge",
  "パソコン通信": "Computer Search",
  "ベル": "Bianca",
  // ── BW7 플라스마게일(EN 주대응=en-tcg-bw8 Plasma Storm, 2026-06-06 orphan 대조검증) ──
  "アクロママシーン": "Colress Machine",
  "どくさいみん光線": "Hypnotoxic Laser",
  "アクロマ": "Colress",
  "プラズマ団のしたっぱ": "Team Plasma Grunt",
  "プラズマフリゲート": "Plasma Frigate",
  "スクランブルスイッチ": "Scramble Switch",
  "ダウジングマシン": "Dowsing Machine",
  "ビクトリーピース": "Victory Piece",
  // ── BW8 라센포스/라이덴너클(EN 주대응=en-tcg-bw9 Plasma Freeze) ──
  "プラズマ団のモンスターボール": "Team Plasma Ball",
  "かるいし": "Float Stone",
  "ダークトリニティ": "Shadow Triad",
  "いのちのしずく": "Life Dew",
  "ロックガード": "Rock Guard",
  "凍てついた街": "Frozen City",
  "ゲーチス": "Ghetsis",
  "スーパーエネルギー回収": "Superior Energy Retrieval",
  // ── BW9 메갈로캐논(EN 주대응=en-tcg-bw10 Plasma Blast) ── (はね/ふたの化石는 BW2 섹션 기존재)
  "ねっこの化石 リリーラ": "Root Fossil Lileep",
  "シルバーバングル": "Silver Bangle",
  "白銀の鏡": "Silver Mirror",
  "リバーサルトリガー": "Reversal Trigger",
  "アイリス": "Iris",
  "カトレア": "Caitlin",
  "ポケモン回収サイクロン": "Scoop Up Cyclone",
  // ── EXバトルブースト/シャイニーコレクション(EN 주대응=en-tcg-bw11 Legendary Treasures+RC) ──
  // ※ イマクニ？ 는 EN 미발매(JP단독 조크) — 의도적 미등재
  "アララギパパ": "Cedric Juniper",
  "カミツレ": "Elesa",
  "Gスコープ": "G Scope",
  "Gブースター": "G Booster",
  // ── BW2 레드 컬렉션(EN 주대응=en-tcg-bw3 Noble Victories — 가이드의 Emerging Powers 표기는 오류) ──
  "すごいつりざお": "Super Rod",
  "ライブキャスター": "Xtransceiver",
  "はねの化石": "Plume Fossil",
  "ふたの化石": "Cover Fossil",
  "ゴツゴツメット": "Rocky Helmet",
  "しんかのきせき": "Eviolite",
  "N": "N",
};
