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
  // ── MEGA·SV 잔여 setGroup (2026-06-16, "MEGA·SV·SM 세 시대 카드팩 전부 동결" 요청) ──
  "mega-decks",              // 스타터 세트 MEGA 「메가디안시 ex」/「메가팬텀 ex」
  "mega-goods",              // MEGA 프리미엄 트레이너 박스 (기술머신 에볼/데볼 스왑 교정완)
  "og-jp-mega-promo",        // JP MEGA 프로모 / MEGA 스페셜 카드 세트 「메가엘레이드 ex」(kr-m-p)
  "sv-decks",                // SV 스타터/배틀마스터/배틀아카데미 덱 묶음
  "sv-ex-start-deck",        // SV ex 스타트 덱
  "sv-goods",                // SV 배틀강화 BOX/ex 스페셜 세트/프리미엄 트레이너 박스 (SVK 스왑 교정완)
  "sv-start-deck-generations", // SV 랜덤 스타트 덱 Generations
  // ── 썬&문(SM) 전체 setGroup (2026-06-16) ──
  "og-sm0",                  // 피카츄와 새로운 친구들
  "og-sm1s", "og-sm1m", "og-sm1+",          // 썬/문 컬렉션 + 강화 「썬&문」
  "og-sm2k", "og-sm2l", "og-sm2+",          // 알로라의 햇빛/달빛 + 새로운 시련
  "og-sm3h", "og-sm3n", "og-sm3+",          // 무지개/어둠 + 빛나는 전설
  "og-sm4s", "og-sm4a", "og-sm4+",          // 각성의 용사/초차원 + GX배틀부스트
  "og-sm5s", "og-sm5m", "og-sm5+",          // 울트라썬/문 + 울트라포스
  "og-sm6", "og-sm6a", "og-sm6b",           // 금단의 빛 + 드래곤스톰 + 챔피언로드
  "og-sm7", "og-sm7a", "og-sm7b",           // 창공의 카리스마 + 플라스마스파크 + 페어리라이즈
  "og-sm8", "og-sm8a", "og-sm8b",           // 버스트임팩트 + 다크오더 + GX울트라샤이니
  "og-sm9", "og-sm9a", "og-sm9b",           // 태그볼트 + 나이트유니슨 + 풀메탈월
  "og-sn10a", "og-sm10", "og-sm10b",        // GG엔드 + 더블블레이즈 + 스카이레전드
  "og-sn11", "og-sm11a", "og-sm11b",        // 미라클트윈 + 리믹스바우트 + 드림리그
  "og-sm12", "og-sm12a",                    // 얼터제네시스 + 태그올스타즈
  "og-smp",                  // SM 블랙스타 프로모 (EN)
  "og-smp2",                 // 명탐정 피카츄 영화 스페셜 팩
  "sm-decks",                // SM 스타터/덱대전/프리미엄트레이너 박스 묶음
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
