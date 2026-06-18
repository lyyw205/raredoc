/**
 * P1: DeckRecipeCard.cardId 백필 + (옵션) standings decklist JSON 보강
 * — docs/cardgame/meta-pipeline-multisource.md §4-② / 로드맵 P1
 *
 * 실행: npx tsx scripts/backfill-recipe-logical.ts [--dry-run] [--force] [--decklists]
 *   --force     이미 채워진 행도 재해석
 *   --decklists TournamentStanding.decklist JSON 의 각 카드에 cardId 필드 추가(additive)
 *
 * 게이트(P1): EN 매칭률 >=95% — 에너지는 별도 분모 (MEE 세트 부재가 구조적이라 합산 시 왜곡)
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { CardResolver } from "./lib/resolve-card";

const dryRun = process.argv.includes("--dry-run");
const force = process.argv.includes("--force");
const doDecklists = process.argv.includes("--decklists");
// 게이트 미달 시 exit 2 는 --strict 에서만 — meta:weekly 체인(&&)이 잔여 미해석(구세대 EN 병합 미완·프로모,
// 구조적 수용분) 때문에 끊기는 것 방지. 잔여행 기준 % 라 전체 매칭률과 다름에 유의.
const strict = process.argv.includes("--strict");

type Bucket = { total: number; matched: number };
const bump = (m: Map<string, Bucket>, k: string, hit: boolean) => {
  const b = m.get(k) ?? { total: 0, matched: 0 };
  b.total++;
  if (hit) b.matched++;
  m.set(k, b);
};
const pct = (b: Bucket) => (b.total ? ((b.matched / b.total) * 100).toFixed(1) : "—");

async function backfillRecipes(resolver: CardResolver) {
  const rows = await prisma.deckRecipeCard.findMany({
    where: force ? {} : { cardId: null },
    select: { id: true, cardName: true, setCode: true, number: true, category: true },
  });
  console.log(`[recipe] 대상 ${rows.length}행 (force=${force})`);

  const byCat = new Map<string, Bucket>();
  const missBySet = new Map<string, number>();
  let updated = 0;

  for (const r of rows) {
    const resolved =
      r.setCode && r.number ? await resolver.resolveEn(r.setCode, r.number) : null;
    bump(byCat, r.category, !!resolved);
    if (!resolved) {
      if (r.setCode) missBySet.set(r.setCode, (missBySet.get(r.setCode) ?? 0) + 1);
      continue;
    }
    if (!dryRun) {
      await prisma.deckRecipeCard.update({
        where: { id: r.id },
        data: { cardId: resolved.cardId },
      });
    }
    updated++;
  }

  // 리포트 + 게이트
  const energy = byCat.get("energy") ?? { total: 0, matched: 0 };
  const nonEnergy: Bucket = { total: 0, matched: 0 };
  for (const [cat, b] of byCat) {
    if (cat === "energy") continue;
    nonEnergy.total += b.total;
    nonEnergy.matched += b.matched;
  }
  console.log(`[recipe] 갱신 ${updated}행${dryRun ? " (dry)" : ""}`);
  for (const [cat, b] of byCat) console.log(`  ${cat}: ${b.matched}/${b.total} (${pct(b)}%)`);
  console.log(`[미해석 세트 분포] ${JSON.stringify(Object.fromEntries([...missBySet.entries()].sort((a, b) => b[1] - a[1])))}`);

  const rate = nonEnergy.total ? (nonEnergy.matched / nonEnergy.total) * 100 : 100;
  const gate = rate >= 95;
  console.log(
    `\n[P1 게이트] EN 매칭률(에너지 제외) = ${rate.toFixed(1)}% (${nonEnergy.matched}/${nonEnergy.total}) → ${gate ? "✅ 통과(>=95%)" : "❌ 미달(<95%)"}` +
      ` · 에너지 별도: ${energy.matched}/${energy.total} (${pct(energy)}%)`,
  );
  return gate;
}

type DeckEntry = { count?: number; set?: string; number?: string; name?: string; cardId?: string | null };
type Decklist = { pokemon?: DeckEntry[]; trainer?: DeckEntry[]; energy?: DeckEntry[] };

/** Tournament.source → standing.deckSource 백필 값 (decklist 보유 행 한정) */
const DECK_SOURCE_BY_TOURNAMENT: Record<string, string> = {
  "limitless-play": "limitless",
  "limitless-web": "limitless",
  pokedata: "pokedata",
};

async function enrichDecklists(resolver: CardResolver) {
  // Json null 필터는 Prisma 시맨틱이 까다로워(JsonNull/DbNull) 전량 조회 후 JS 에서 skip
  const rows = await prisma.tournamentStanding.findMany({
    select: { id: true, decklist: true, deckSource: true, tournament: { select: { source: true } } },
  });
  console.log(`[decklist] 대상 ${rows.length}행`);
  let updated = 0;
  let cards = 0;
  let cardMatched = 0;
  let sourceFixed = 0;

  for (const r of rows) {
    const dl = r.decklist as Decklist | null;
    if (!dl || typeof dl !== "object") continue;
    let changed = false;
    for (const bucket of ["pokemon", "trainer", "energy"] as const) {
      for (const c of dl[bucket] ?? []) {
        if (!c || typeof c !== "object") continue;
        cards++;
        if (c.cardId && !force) {
          cardMatched++;
          continue;
        }
        const resolved = c.set && c.number != null ? await resolver.resolveEn(c.set, String(c.number)) : null;
        if (resolved) {
          c.cardId = resolved.cardId;
          cardMatched++;
          changed = true;
        }
      }
    }
    // deckSource null 백필 (D2 — sync 가 안 채운 구간)
    const wantSource = r.deckSource ?? DECK_SOURCE_BY_TOURNAMENT[r.tournament?.source ?? ""] ?? null;
    const needSourceFix = !r.deckSource && wantSource;
    if ((changed || needSourceFix) && !dryRun) {
      await prisma.tournamentStanding.update({
        where: { id: r.id },
        data: { decklist: dl as object, ...(needSourceFix ? { deckSource: wantSource } : {}) },
      });
      updated++;
      if (needSourceFix) sourceFixed++;
    } else if (changed || needSourceFix) {
      updated++;
      if (needSourceFix) sourceFixed++;
    }
  }
  console.log(
    `[decklist] 보강 ${updated}행 (deckSource 백필 ${sourceFixed}) · 카드 ${cardMatched}/${cards} 해석${dryRun ? " (dry)" : ""}`,
  );
}

async function main() {
  const resolver = await CardResolver.create();
  const gate = await backfillRecipes(resolver);
  if (doDecklists) await enrichDecklists(resolver);
  console.log(`\n[미해석 사유]\n${resolver.reportMisses() || "  없음"}`);
  if (!gate && strict) process.exitCode = 2;
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
