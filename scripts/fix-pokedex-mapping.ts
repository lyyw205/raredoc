/**
 * 도감번호(pokedexNumbers) 교정 — 표준 이름표(PokeAPI)를 권위로 전 포켓몬 매핑 통일.
 *
 * 정책(감사 결과 기반, scripts/audit-pokedex-mapping.ts):
 *   FILL  : pokedexNumbers 비어있고 이름이 해석되면 → 채움
 *   FIX   : 저장값이 있는데 이름해석 dex 와 겹치지 않으면 → 덮어씀
 *           (불일치 1293건 전부 SV — 카드번호를 도감번호에 잘못 저장한 버그)
 *   OK    : 겹치면 변경 없음 / 이름해석 안 되면 변경 없음(수동 영역)
 * 권위: 다른 모든 era 에서 저장값과 이름해석이 100% 일치 → resolveCardDexes 신뢰.
 *
 * 실행:
 *   npx tsx scripts/fix-pokedex-mapping.ts --dry-run        # 계획만(변경 없음) ← 먼저
 *   npx tsx scripts/fix-pokedex-mapping.ts                  # 실제 DB 갱신
 *   옵션: --only=fill|fix  (한쪽만) · --limit=N · --samples=N
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { resolveCardDexes, loadPokeapiNames } from "./lib/pokeapi-names";
import { POKE } from "./lib/supertype";

const DRY = process.argv.includes("--dry-run");
const ONLY = process.argv.find((a) => a.startsWith("--only="))?.split("=")[1] as "fill" | "fix" | undefined;
const LIMIT = parseInt(process.argv.find((a) => a.startsWith("--limit="))?.split("=")[1] ?? "0", 10);
const SAMPLES = parseInt(process.argv.find((a) => a.startsWith("--samples="))?.split("=")[1] ?? "20", 10);

async function pool<T>(items: T[], n: number, fn: (t: T) => Promise<void>) {
  let idx = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (idx < items.length) { const i = idx++; await fn(items[i]); }
  }));
}

function deriveDexes(en: string | null, ko: string | null): number[] {
  if (en) { const d = resolveCardDexes(en, "en"); if (d.length) return d; }
  if (ko) { const d = resolveCardDexes(ko, "ko"); if (d.length) return d; }
  return [];
}

async function main() {
  loadPokeapiNames();
  console.log(`포켓몬 적재 중... ${DRY ? "[DRY-RUN]" : ""}${ONLY ? ` [only=${ONLY}]` : ""}`);
  const cards = await prisma.logicalCard.findMany({
    where: { supertype: { in: POKE as unknown as string[] } },
    select: { id: true, pokedexNumbers: true, nameKo: true, locales: { select: { language: true, name: true } } },
  });
  console.log(`적재 ${cards.length}\n`);

  type Plan = { id: string; name: string; from: number[]; to: number[]; action: "FILL" | "FIX" };
  const plans: Plan[] = [];
  let okOverlap = 0, unresolved = 0;

  for (const c of cards) {
    const en = c.locales.find((l) => l.language === "en")?.name ?? null;
    const ko = c.nameKo ?? c.locales.find((l) => l.language === "ko")?.name ?? null;
    const stored = (c.pokedexNumbers ?? []).filter((n) => n > 0);
    const derived = deriveDexes(en, ko);
    const name = en ?? ko ?? "(이름없음)";

    if (derived.length === 0) { unresolved++; continue; }
    if (stored.length === 0) {
      if (ONLY !== "fix") plans.push({ id: c.id, name, from: stored, to: derived, action: "FILL" });
      continue;
    }
    const overlap = derived.some((d) => stored.includes(d)) || stored.some((d) => derived.includes(d));
    if (overlap) { okOverlap++; continue; }
    if (ONLY !== "fill") plans.push({ id: c.id, name, from: stored, to: derived, action: "FIX" });
  }

  const fills = plans.filter((p) => p.action === "FILL");
  const fixes = plans.filter((p) => p.action === "FIX");
  console.log(`계획: FILL ${fills.length} · FIX ${fixes.length} | 변경없음(겹침) ${okOverlap} · 해석불가(수동) ${unresolved}`);

  console.log(`\n── FILL 샘플 (빈 칸 채움) 앞 ${SAMPLES} ──`);
  fills.slice(0, SAMPLES).forEach((p) => console.log(`  "${p.name}"  []→[${p.to}]  (${p.id})`));
  console.log(`\n── FIX 샘플 (덮어쓰기: 저장 → PokeAPI) 앞 ${SAMPLES} ──`);
  fixes.slice(0, SAMPLES).forEach((p) => console.log(`  "${p.name}"  [${p.from}]→[${p.to}]  (${p.id})`));

  if (DRY) { console.log(`\n[DRY-RUN] 변경 없음. 실제 적용하려면 --dry-run 제거.`); await prisma.$disconnect(); return; }

  const apply = LIMIT > 0 ? plans.slice(0, LIMIT) : plans;
  console.log(`\n적용 중... ${apply.length}건`);
  let done = 0, err = 0;
  await pool(apply, 12, async (p) => {
    try {
      await prisma.logicalCard.update({ where: { id: p.id }, data: { pokedexNumbers: p.to } });
      if (++done % 500 === 0) console.log(`  ... ${done}`);
    } catch (e) { err++; console.error(`  ✗ ${p.id}: ${String(e).slice(0, 80)}`); }
  });
  console.log(`\n── 결과 ── 적용 ${done} (FILL ${fills.length}+FIX ${fixes.length}) · 에러 ${err}`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
