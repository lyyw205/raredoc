/**
 * DPt/Pt(플래티넘) 트레이너 JP→EN 이름 사전 (merge-en-identity 트레이너 매칭용).
 * JP명은 jp-tcg-PT* 일본공식(pokemon-card.com 상세) 로케일명.
 * EN명은 pokemontcg.io(set.id:pl1 등) name verbatim. 배치마다 orphan 대조검증 후 추가.
 * 인명: アカギ=Cyrus · ハンサム=Looker · デンジ=Volkner · プルート=Charon · ミズキ=Bebe
 */
export const TR_JP2EN: Record<string, string> = {
  // ── PT1 은하의 패도(en-tcg-pl1 Platinum, 2026-06-06 orphan 대조검증) ──
  "破れた時空": "Broken Time-Space",
  "アカギの策略": "Cyrus's Conspiracy",
  "ギンガ団のアジト": "Galactic HQ",
  "レベルMAX": "Level Max",
  "ハンサムの捜査": "Looker's Investigation",
  "思い出のみ": "Memory Berry",
  "ギンガ団の発明G-101 エナジーゲイン": "Team Galactic's Invention G-101 Energy Gain",
  "ギンガ団の発明G-103 パワースプレー": "Team Galactic's Invention G-103 Power Spray",
  "ギンガ団の発明G-105 ポケターン": "Team Galactic's Invention G-105 Poké Turn",
  "ずがいの化石": "Skull Fossil",
  "たての化石": "Armor Fossil",
  // ── PT2 시간의 끝의 유대(en-tcg-pl2 Rising Rivals, 2026-06-06 orphan 대조검증) ──
  "ギンガ団の発明G-109 SPレーダー": "Team Galactic's Invention G-109 SP Radar",
  "ギンガ団の発明G-107 ワザマシンG[ギンガ]": "Team Galactic's Invention G-107 Technical Machine G",
  "地底探険隊": "Underground Expedition",
  "デンジの哲学": "Volkner's Philosophy",
  "プルートの選択": "Charon's Choice",
  "ミズキの検索": "Bebe's Search",
  "ナギサシティジム": "Sunyshore City Gym",
  "ポケモンコンテスト会場": "Pokémon Contest Hall",
  // ── PT3 프론티어의 고동(en-tcg-pl3 Supreme Victors, 2026-06-06 orphan 대조검증 7:7) ──
  // 인명: クロツグ=Palmer(타워타이쿤) · シロナ=Cynthia
  "バトルサーチャー": "VS Seeker",
  "夜の転送装置": "Night Teleporter",
  "アカギの先制": "Cyrus's Initiative",
  "クロツグの貢献": "Palmer's Contribution",
  "シロナの導き": "Cynthia's Guidance",
  "チャンピオンズルーム": "Champion's Room",
  "バトルタワー": "Battle Tower",
  // ── PT4 아르세우스 광림(en-tcg-pl4 Arceus, 2026-06-06 orphan 대조검증) ──
  // エネルギー転送(=Energy Search, 효과문 검증: 산패 기본E 1장 서치)은 pl4 미수록 → 사전 제외
  // ポケモンレスキュー EN은 pl1(Platinum) 수록 → pl1 교차회수용
  "はじまりの扉": "Beginning Door",
  "ポケモンレスキュー": "Pokémon Rescue",
  "かいの化石": "Helix Fossil",
  "こうらの化石": "Dome Fossil",
  "ひみつのコハク": "Old Amber",
  "しあわせタマゴ": "Lucky Egg",
  "たつじんのおび": "Expert Belt",
  "ベンチシールド": "Bench Shield",
  "オーキドはかせの訪問": "Professor Oak's Visit",
  "デパートガール": "Department Store Girl",
  "アルティメットゾーン": "Ultimate Zone",
  // ── DP1 시공의 창조 다이아/펄 컬렉션(en-tcg-dp1 Diamond & Pearl, 2026-06-06 orphan 대조검증) ──
  // 인명: ナナカマド=Rowan. エネルギー転送=Energy Search(dp1 수록 — PT4 때는 pl4 미수록이라 보류했던 항목)
  "ナナカマドはかせ": "Professor Rowan",
  "ライバル": "Rival",
  "エネルギー再生": "Energy Restore",
  "エネルギー転送": "Energy Search",
  "エネルギーつけかえ": "Energy Switch",
  "きずぐすり": "Potion",
  "スーパーポケモン回収": "Super Scoop Up",
  "なんでもなおしW": "Double Full Heal",
  "プラスパワー": "PlusPower",
  "ポケモンいれかえ": "Switch",
  "ポケモン図鑑HANDY910is": "Pokédex HANDY910is",
  "モンスターボール": "Poké Ball",
  "夜のポケモンセンター": "Night Pokémon Center",
  "ワープポイント": "Warp Point",
  "スピードスタジアム": "Speed Stadium",
  // ── DP2 호수의 비밀(en-tcg-dp2 Mysterious Treasures, 2026-06-06 orphan 대조검증) ──
  "化石発掘員": "Fossil Excavator",
  "ギンガ団の賭け": "Team Galactic's Wager",
  "クイックボール": "Quick Ball",
  "ダークボール": "Dusk Ball",
  "夜のメンテナンス": "Night Maintenance",
  "湖の結界": "Lake Boundary",
  // ── DP3 빛나는 어둠(en-tcg-dp3 Secret Wonders, 2026-06-06 orphan 대조검증) ──
  // 인명: ハマナ=Roseanne · マーズ=Mars
  "ギンガ団のマーズ": "Team Galactic's Mars",
  "ハマナのリサーチ": "Roseanne's Research",
  // ── DP4 월광의 추적+새벽의 질주(en-tcg-dp4 Great Encounters 2→1, 2026-06-06 orphan 대조검증) ──
  // 인명: スージー=Felicity
  "スージーの抽選": "Felicity's Drawing",
  "プレミアボール": "Premier Ball",
  "おまもりこばん": "Amulet Coin",
  "月光のスタジアム": "Moonlight Stadium",
  "夜明けのスタジアム": "Dawn Stadium", // EN은 dp5 Majestic Dawn 수록 — dp5 배치에서 발화
  "ふしぎなアメ": "Rare Candy",
  "たべのこし": "Leftovers",
  // ── DP5 비경의 외침+분노의 신전(en-tcg-dp6 Legends Awakened 2→1, 2026-06-06 orphan 대조검증) ──
  // 인명: バク=Buck · シロナ=Cynthia(기등재 계열). ハードマウンテン=Stark Mountain·キッサキ=Snowpoint(게임 지명)
  // エネルギーパッチ=Energy Pickup: 효과문 검증(코인 1회 오모테→트래시 기본E 1장 부착)
  "バクのトレーニング": "Buck's Training",
  "シロナの想い": "Cynthia's Feelings",
  "ポケトレ": "Poké Radar",
  "ねっこの化石": "Root Fossil",
  "ツメの化石": "Claw Fossil",
  "ワザマシン TS-1": "Technical Machine TS-1",
  "ワザマシン TS-2": "Technical Machine TS-2",
  "ハードマウンテン": "Stark Mountain",
  "キッサキしんでん": "Snowpoint Temple",
  "エネルギーパッチ": "Energy Pickup",
  // ── DP6 파공의 격투(en-tcg-dp7 Stormfront, 2026-06-06 orphan 대조검증 7:7) ──
  // 인명: マイ=Marley. ポケ시리즈는 EN 정식명에 "+" 접미(ptcg.io verbatim)
  "ゴージャスボール": "Luxury Ball",
  "スーパーボール": "Great Ball",
  "ポケドロアー": "Poké Drawer +",
  "ポケヒーラー": "Poké Healer +",
  "ポケブロアー": "Poké Blower +",
  "エネルギーリンク": "Energy Link",
  "マイのおねがい": "Marley's Request",
};
