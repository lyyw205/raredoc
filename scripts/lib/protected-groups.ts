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
