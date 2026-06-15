// 동결(freeze)된 카드팩 — EN/KR 연결이 검증 완료되어 변경을 막는 setGroup(cardPack) 목록.
// 단일 출처(Single Source of Truth): AGENTS.md "동결 카드팩" 항목과 메모리가 여기를 가리킨다.
// 추가/해제는 이 Set 만 고치면 됨.
//
// DB 를 바꾸는 스크립트(merge-en-identity --apply, audit-kr-trainers --apply 등)는
// assertWritable() 로 affected cardPackId 를 검사해 기본은 차단하고,
// --allow-protected 플래그가 있을 때만 (경고 후) 통과시킨다.
export const PROTECTED_GROUPS: ReadonlySet<string> = new Set([
  "mega-munikisuzero",   // 니힐제로 / ニヒルゼロ
  "mega-dream-ex",       // 메가드림 ex / MEGAドリームex
  "mega-infernox",       // 인페르노X / インフェルノX
  "mega-brave-symphonia", // 메가브레이브 / メガブレイブ
  "mega-symphonia",      // 메가심포니아 / メガシンフォニア
  "sv-black-bolt-white-flare", // 블랙볼트 / Black Bolt (id는 합본명이지만 실 그룹=Black Bolt)
  "sv-white-flare",      // 화이트플레어 / White Flare
  "mega-ninja-spinner",  // 닌자스피너 / ニンジャスピナー
  "mega-abyss-eye",      // 어비스아이 / アビスアイ (2026-06-13 추가)
  "mega-start-deck-100", // 스타트덱100 배틀컬렉션 / スタートデッキ100 (2026-06-15 추가, JP/KR 전수검증·EN=Ascended Heroes 정리완)
  // ── SV 시대 (2026-06-12 추가) ──
  "sv-stellar-crown",        // 스텔라미라클 / ステラミラクル
  "sv-shrouded-fable",       // 나이트원더러 / ナイトワンダラー
  "sv-paradise-dragona",     // 낙원드래고나 / 楽園ドラゴーナ
  "sv-twilight-masquerade",  // 변환의 가면 / 変幻の仮面
  "sv-crimson-haze",         // 크림슨헤이즈 / クリムゾンヘイズ
  "sv-temporal-forces",      // 와일드포스 / ワイルドフォース
  "sv-cyber-judge",          // 사이버저지 / サイバージャッジ
  "sv-paldean-fates",        // 샤이니트레저 ex / シャイニートレジャーex
  "sv-paradox-rift",         // 고대의 포효 / 古代の咆哮
  "sv-future-flash",         // 미래의 일섬 / 未来の一閃
  "sv-raging-surf",          // 레이징서프 / レイジングサーフ
  "sv-151",                  // 포켓몬 카드 151 / ポケモンカード151
  "sv-obsidian-flames",      // 흑염의 지배자 / 黒炎の支配者
  "sv-paldea-evolved",       // 클레이버스트 / クレイバースト
  "sv-snow-hazard",          // 스노해저드 / スノーハザード
  "sv-triplet-beat",         // 트리플렛비트 / トリプレットビート
  "sv-violet-ex",            // 바이올렛 ex / バイオレットex
  "sv-base",                 // 스칼렛 ex / スカーレットex
  // ── SV 시대 (2026-06-13 추가) ──
  "sv-surging-sparks",       // 초전브레이커 / 超電ブレイカー
  "sv-prismatic-evolutions", // 테라스탈 페스타 ex / テラスタルフェスex
  "sv-journey-together",     // 배틀파트너즈 / バトルパートナーズ
  "sv-heatwave-arena",       // 열풍의 아레나 / 熱風のアリーナ
  "sv-destined-rivals",      // 로켓단의 영광 / ロケット団の栄光
  // ── 소드·실드(S) 시대 (2026-06-13 추가) ──
  "og-s12a",                 // VSTAR 유니버스 / VSTARユニバース
  "og-s12",                  // 패러다임트리거 / パラダイムトリガー
  "og-s11a",                 // 백열의 아르카나 / 白熱のアルカナ
  "og-s11",                  // 로스트어비스 / ロストアビス
  "og-s10b",                 // 포켓몬 GO / Pokémon GO
  "og-s10a",                 // 다크판타스마 / ダークファンタズマ
  "og-s10d",                 // 타임게이저 / タイムゲイザー
  "og-s10p",                 // 스페이스저글러 / スペースジャグラー
  "og-s9a",                  // 배틀리전 / バトルリージョン
  "og-s9",                   // 스타버스 / スターバース
]);

export function hasAllowProtectedFlag(argv: string[] = process.argv): boolean {
  return argv.includes("--allow-protected");
}

/** affected cardPackId 들 중 보호된 그룹만 추려 반환 (빈 배열 = 안전). null/undefined/중복 안전. */
export function protectedTouched(ids: Iterable<string | null | undefined>): string[] {
  const hit = new Set<string>();
  for (const id of ids) if (id && PROTECTED_GROUPS.has(id)) hit.add(id);
  return [...hit];
}

/**
 * 보호된 그룹이 affected 면 차단(process.exit) — opts.allow 면 경고 후 통과.
 * dryRun=true 면 차단 대신 경고만(분석 단계에서 미리 보이게).
 */
export function assertWritable(
  ids: Iterable<string | null | undefined>,
  opts: { allow?: boolean; dryRun?: boolean; tool?: string } = {},
): void {
  const hit = protectedTouched(ids);
  if (!hit.length) return;
  const tag = opts.tool ? `[${opts.tool}] ` : "";
  if (opts.dryRun) {
    console.warn(`⚠ ${tag}동결 카드팩이 영향권에 있음: ${hit.join(", ")} — --apply 시 --allow-protected 없으면 차단됨.`);
    return;
  }
  if (opts.allow) {
    console.warn(`⚠ ${tag}--allow-protected: 동결 카드팩 수정 허용됨 — ${hit.join(", ")}`);
    return;
  }
  console.error(`\n🛑 ${tag}동결 카드팩 수정 차단: ${hit.join(", ")}`);
  console.error(`   이 팩들의 EN/KR 연결은 검증 완료되어 동결됨. 의도적 수정이면 --allow-protected 를 붙여 다시 실행.`);
  console.error(`   (목록/사유: scripts/lib/protected-groups.ts · AGENTS.md)`);
  process.exit(1);
}
