// ============================================================================
// 매핑 잠금(mapping-lock) — 시대 한정. (2026-06-26 재정의 → 2026-06-26 범위 지정)
//
// [모델] 카드의 '정체성 매핑'(이미지·종/도감번호·카드명·연결[cardId])을 바꾸는 작업만 잠근다.
//        게임 메타데이터(hp·attacks 등)는 어디서든 자유. 단, 잠금은 **아래 시대의 JP팩에만** 적용된다
//        (완료·검증된 MEGA·SV·SWSH·SM·XY·BW·LEGEND[L+HGSS]·Pt). 그 외 진행중 시대(NEO·PCG·ADV·DP·구판 등)는 매핑도 자유.
//
// [region 범위] 잠금은 **JP 카드의 정체성만** 보호한다. og-* setGroup 은 JP·EN·KR 세트가 공유하므로,
//        RegionCard 의 이미지·이름·cardId 를 바꿀 때 그 RegionCard 가 **EN/KR 이면 자유**(JP 행은 안 바뀜).
//        → 매핑 스크립트는 바뀌는 RegionCard 의 region 을 `regions:[...]` 로 넘긴다(전부 EN/KR → 통과).
//        ※ 공유 logical Card 의 pokedexNumbers·CardSpecies 변경은 JP 표현에도 영향 → regions 생략(보수적 잠금).
//
// ── 잠금(LOCKED) — 아래 팩의 매핑 변경 시 assertMappingWritable() + `--allow-protected`(또는 `--allow-mapping`) 필요 ──
//   · RegionCard.cardId / RegionCard.name / RegionCard.imageLarge·imageSmall
//   · Card.pokedexNumbers / CardSpecies  (종·도감번호)
//   · 위 매핑의 create/delete
// ── 자유(FREE) — 가드 불필요(모든 팩) ──
//   · Card: hp·attacks·abilities·types·weakness·resistance·retreatCost·illustrator·rarityId·subtypes·supertype·legalities·nameKo
//   · RegionCard.rarityId/legalities · Set.*(로고·발매일·코드·팩명·packType) · Species.*
//
// 단일 출처: 이 파일. AGENTS.md "매핑 잠금"·메모리가 여기를 가리킨다.
// 목록 재생성: cardPack.era ∈ {MEGA, MEGA-SP, SV, SV-SP, "S (소드·실드)", S-SP, "SM (썬·문)", SM-SP, XY, "XY (컨셉팩)",
//   XY-SP, BW, BW-SP, "L (레전드)", HGSS, Pt} 에서 'JP판'만(KR 프로모 og-kr-*-promo 5팩 제외).
//   ※ DP/DP-SP 는 아직 미동결. 시대가 추가로 완료되면 그 era 팩들을 아래에 더한다.
// ============================================================================

/** 매핑 잠금 대상 cardPack — 완료·검증된 MEGA·SV·SWSH(S)·SM·XY·BW·LEGEND(L+HGSS)·Pt 시대의 JP팩(200). */
export const PROTECTED_GROUPS: ReadonlySet<string> = new Set<string>([
  // ── MEGA (7) ──
  "mega-abyss-eye", "mega-brave-symphonia", "mega-dream-ex", "mega-infernox", "mega-munikisuzero", "mega-ninja-spinner", "mega-symphonia",
  // ── MEGA-SP (4) ──
  "mega-decks", "mega-goods", "mega-start-deck-100", "og-jp-mega-promo",
  // ── SV (25) ──
  "sv-151", "sv-base", "sv-black-bolt-white-flare", "sv-crimson-haze", "sv-cyber-judge", "sv-destined-rivals", "sv-future-flash",
  "sv-heatwave-arena", "sv-journey-together", "sv-obsidian-flames", "sv-paldea-evolved", "sv-paldean-fates", "sv-paradise-dragona",
  "sv-paradox-rift", "sv-prismatic-evolutions", "sv-raging-surf", "sv-shrouded-fable", "sv-snow-hazard", "sv-stellar-crown",
  "sv-surging-sparks", "sv-temporal-forces", "sv-triplet-beat", "sv-twilight-masquerade", "sv-violet-ex", "sv-white-flare",
  // ── SV-SP (6) ──
  "og-classic", "og-wcs23", "sv-decks", "sv-ex-start-deck", "sv-goods", "sv-start-deck-generations",
  // ── SWSH / S (소드·실드) (40) ──
  "og-cel25c", "og-s10a", "og-s10b", "og-s10d", "og-s10p", "og-s11", "og-s11a", "og-s12", "og-s12a", "og-s1a", "og-s1h", "og-s1w",
  "og-s2", "og-s2a", "og-s3", "og-s3a", "og-s4", "og-s4a", "og-s5a", "og-s5i", "og-s5r", "og-s6a", "og-s6h", "og-s6k", "og-s7d",
  "og-s7r", "og-s8", "og-s8a", "og-s8a-g", "og-s8b", "og-s9", "og-s9a", "og-swsh10tg", "og-swsh11tg", "og-swsh12pt5gg",
  "og-swsh12tg", "og-swsh35", "og-swsh45sv", "og-swsh9tg", "og-swshp",
  // ── S-SP (3) ──
  "swsh-decks", "swsh-goods", "swsh-start-deck-100",
  // ── SM (썬·문) (39) ──
  "og-sm0", "og-sm1+", "og-sm10", "og-sm10b", "og-sm11a", "og-sm11b", "og-sm12", "og-sm12a", "og-sm1m", "og-sm1s", "og-sm2+",
  "og-sm2k", "og-sm2l", "og-sm3+", "og-sm3h", "og-sm3n", "og-sm4+", "og-sm4a", "og-sm4s", "og-sm5+", "og-sm5m", "og-sm5s",
  "og-sm6", "og-sm6a", "og-sm6b", "og-sm7", "og-sm7a", "og-sm7b", "og-sm8", "og-sm8a", "og-sm8b", "og-sm9", "og-sm9a", "og-sm9b",
  "og-sma", "og-smp", "og-smp2", "og-sn10a", "og-sn11",
  // ── SM-SP (1) ──
  "sm-decks",
  // ── XY (17) ──
  "og-g1", "og-xy10", "og-xy11a", "og-xy11b", "og-xy1a", "og-xy1b", "og-xy2", "og-xy3", "og-xy4", "og-xy5", "og-xy5a", "og-xy6",
  "og-xy7", "og-xy8a", "og-xy8b", "og-xy9", "og-xyp",
  // ── XY (컨셉팩) (7) ──
  "og-cp1", "og-cp2", "og-cp3", "og-cp4", "og-cp5", "og-cp6", "sm-best-of-xy",
  // ── XY-SP (1) ──
  "xy-decks",
  // ── Pt (DPt 덱/박스/프로모 + Platinum 본탄) (19) ──
  "og-jp-dpss", "og-jp-dpt2se", "og-jp-dpt2sg", "og-jp-dpt3sg", "og-jp-dpt3sl", "og-jp-dpt4sgf", "og-jp-dpt4slp",
  "og-jp-dptepd", "og-jp-dptepg", "og-jp-dptepp", "og-jp-dptgbhi", "og-jp-dptgbna", "og-jp-dptgbpi", "og-jp-dptgbpo",
  "og-jp-dptp", "og-pl1", "og-pl2", "og-pl3", "og-pl4",
  // ── LEGEND / L (레전드) (5) ──
  "og-l1a", "og-l1b", "og-l2", "og-l3", "og-ll",
  // ── LEGEND / HGSS (6) ──
  "og-col1", "og-hgss2", "og-hsp", "og-jp-br", "og-jp-l2sb", "og-l-promo",
  // ── BW (19) ──
  "og-bw-ep", "og-bw-shiny", "og-bw1", "og-bw1w", "og-bw2", "og-bw3", "og-bw3h", "og-bw4", "og-bw5", "og-bw5d",
  "og-bw6", "og-bw6c", "og-bw7", "og-bw8", "og-bw8t", "og-bw9", "og-bwp", "og-dv1", "og-ebb",
  // ── BW-SP (1) ──
  "bw-decks",
]);

/** 잠금 대상 매핑 필드(문서/참조용). */
export const MAPPING_LOCK_FIELDS = [
  "RegionCard.cardId", "RegionCard.name", "RegionCard.imageLarge", "RegionCard.imageSmall",
  "Card.pokedexNumbers", "CardSpecies",
] as const;

/** `--allow-protected`(레거시) 또는 `--allow-mapping` 플래그가 있으면 true. */
export function hasAllowProtectedFlag(argv: string[] = process.argv): boolean {
  return argv.includes("--allow-protected") || argv.includes("--allow-mapping");
}

/** affected cardPackId 들 중 잠금 시대 팩만 추려 반환 (빈 배열 = 잠금 시대 밖). */
export function protectedTouched(ids: Iterable<string | null | undefined>): string[] {
  const hit = new Set<string>();
  for (const id of ids) if (id && PROTECTED_GROUPS.has(id)) hit.add(id);
  return [...hit];
}

/**
 * @deprecated 매핑/메타데이터 구분 없이 팩 전체를 막던 구 가드. 이제 no-op(메타데이터 자유 보장).
 *   매핑/이미지를 바꾸는 스크립트는 assertMappingWritable() 로 전환할 것.
 */
export function assertWritable(
  ids: Iterable<string | null | undefined>,
  _opts: { allow?: boolean; dryRun?: boolean; tool?: string } = {},
): void {
  void ids; // no-op (잠금은 assertMappingWritable 가 매핑 변경 시에만)
}

/**
 * 매핑 잠금 가드. 이미지/종/도감번호/카드명/연결(cardId) 등 '정체성 매핑'을 바꾸는 스크립트가
 * **영향 cardPackId 들**과 함께 호출한다. 그 중 잠금 시대 팩(PROTECTED_GROUPS)이 있으면
 * `--allow-protected`(또는 `--allow-mapping`) 없이는 차단(의도적 확인 체크포인트).
 * 잠금 시대 밖 팩만이면 통과(자유). 메타데이터만 바꾸면 호출하지 않는다.
 *   - dryRun=true → 경고만 / allow=true → 경고 후 통과 / 그 외 → 차단(exit 1)
 *
 * region 범위: 잠금은 JP 카드의 정체성만. 바뀌는 RegionCard 의 region 을 `opts.regions` 로 넘기면,
 *   그게 전부 EN/KR 이면(=JP 없음) 통과(자유). regions 생략 시 보수적(JP 가정)으로 잠금 검사.
 *   ※ 공유 logical Card(pokedexNumbers·CardSpecies) 변경은 JP 에도 영향 → regions 를 넘기지 말 것.
 */
export function assertMappingWritable(
  ids: Iterable<string | null | undefined>,
  opts: { allow?: boolean; dryRun?: boolean; tool?: string; what?: string; regions?: Iterable<string | null | undefined> } = {},
): void {
  const hit = protectedTouched(ids);
  if (!hit.length) return; // 잠금 시대 밖 → 자유
  if (opts.regions) {
    // region-aware: 바뀌는 RegionCard 가 전부 EN/KR(=JP 없음)이면 잠금 대상 아님(자유).
    const regs = new Set<string>();
    for (const r of opts.regions) if (r) regs.add(r.toUpperCase());
    if (regs.size && !regs.has("JP")) return;
  }
  const tag = opts.tool ? `[${opts.tool}] ` : "";
  const what = opts.what ? ` — ${opts.what}` : "";
  const packs = hit.length > 6 ? `${hit.slice(0, 6).join(", ")} 외 ${hit.length - 6}` : hit.join(", ");
  if (opts.dryRun) {
    console.warn(`⚠ ${tag}매핑 잠금(시대): ${packs} 의 정체성 매핑 변경${what}. --apply 시 --allow-protected 없으면 차단됨.`);
    return;
  }
  if (opts.allow) {
    console.warn(`⚠ ${tag}--allow-protected: 잠금 시대 매핑 변경 허용됨 — ${packs}${what}.`);
    return;
  }
  console.error(`\n🛑 ${tag}매핑 잠금: 완료 시대(${packs})의 정체성 매핑(이미지↔종↔도감번호↔카드명↔연결) 변경은 보호됨${what}.`);
  console.error(`   게임 메타데이터(hp/attacks 등)는 자유. 의도적 매핑 변경이면 --allow-protected 를 붙여 다시 실행.`);
  console.error(`   (규칙: scripts/lib/protected-groups.ts · AGENTS.md "매핑 잠금")`);
  process.exit(1);
}
