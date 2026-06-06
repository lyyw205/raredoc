/**
 * 메타 집계 — 적재된 TournamentStanding 으로 DeckArchetype/Recipe/Matchup/Trend 도출.
 *
 * 흐름:
 *   a. window 일수 내 standings 조회 (deckKey not null)
 *   b. DeckArchetype 집계 (deckKey 그룹): usageRate/winCount/avgRank/winRate/
 *      conversion(Top8 진입률)/consistency/sampleSize/tier/isUnderdog/isTrap
 *      → upsert (집계필드+nameEn+iconKeys+region+tier 갱신, nameKo는 사전 있을 때만,
 *        description/strengths/weaknesses/counters 는 보존)
 *   c. DeckRecipeCard 집계 (#16/#17): decklist 펼쳐 (name,set,number) 그룹 → avgCount/adoptionRate/isCore
 *   d. DeckMatchup 집계 (#12/#13/#14): pairings winner(username) + player→deckKey 매핑
 *   e. ArchetypeTrend: 이번 ISO week 의 덱별 usage upsert
 *   f. isMetaCounter: 상위(tier S/A) 상대 종합 winRateA≥55
 *
 * CLI:
 *   npm run aggregate:meta                                  # window=14, regulation=스탠다드
 *   npm run aggregate:meta -- --window=14 --dry-run
 *   npm run aggregate:meta -- --regulation=익스텐디드
 *
 * 주의: 기존 목업 DeckArchetype(Limitless 키 아님)/Tournament(limitlessId=null) 은 건드리지 않음.
 *       이 스크립트는 deckKey 있는 신규 Limitless standings 만 집계.
 *
 * docs/meta-pipeline-limitless.md
 */
import "dotenv/config";
import { prisma } from "@/lib/prisma";
import { fetchPairings, rateGuard, getRemaining, type LimitlessPairing } from "./lib/limitless-api";
import { ARCHETYPE_KO } from "@/lib/cardgame/archetype-ko";

type Args = {
  window: number;
  regulation: string;
  dryRun: boolean;
};

function parseArgs(): Args {
  const a: Args = { window: 14, regulation: "스탠다드", dryRun: false };
  for (const arg of process.argv.slice(2)) {
    if (arg === "--dry-run") a.dryRun = true;
    else if (arg.startsWith("--window=")) a.window = parseInt(arg.slice("--window=".length), 10);
    else if (arg.startsWith("--regulation=")) a.regulation = arg.slice("--regulation=".length);
  }
  return a;
}

/** format(STANDARD/EXPANDED) → 한글 regulation */
function regulationFromFormat(format: string): string {
  if (format === "EXPANDED") return "익스텐디드";
  return "스탠다드"; // STANDARD 및 기타
}

/** ISO 8601 week 라벨 "2026-W22" */
function isoWeek(d: Date): string {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = (date.getUTCDay() + 6) % 7; // 월=0
  date.setUTCDate(date.getUTCDate() - dayNum + 3); // 목요일로 이동
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const week =
    1 +
    Math.round(
      ((date.getTime() - firstThursday.getTime()) / 86_400_000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7,
    );
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}
function stddev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
}
function tierOf(usageRate: number): string {
  if (usageRate >= 15) return "S";
  if (usageRate >= 8) return "A";
  if (usageRate >= 3) return "B";
  return "C";
}

type DecklistEntry = { count: number; set?: string; number?: string; name: string };
type Decklist = { pokemon?: DecklistEntry[]; trainer?: DecklistEntry[]; energy?: DecklistEntry[] };

type StandingRow = {
  tournamentId: string;
  placing: number;
  playerName: string;
  deckKey: string;
  deckIcons: string[];
  wins: number;
  losses: number;
  ties: number;
  decklist: unknown;
};

/**
 * #18 deckCostKrw: 표준 레시피 × 시세 DB.
 * logicalCardId 매칭(decklist set/number → CardLocale → LogicalCard)이 선행되어야 함.
 * 이번 위임 범위 밖 → null 유지. 매칭/시세 연동 후속.
 * TODO(후속): matchRecipeToLogicalCard() 로 logicalCardId 채운 뒤
 *   sum(avgCount × LogicalCard 최저시세) → deckCostKrw 갱신.
 */

/**
 * TODO(후속): DeckRecipeCard.logicalCardId 매칭.
 * Limitless decklist 의 (set, number) 는 EN 약어(예 "DRI")+번호.
 * CardLocale(region="EN") 의 setId/number 매핑 테이블이 필요(Limitless set약어 ↔ 우리 setId).
 * 매핑 사전 확보 후 이 함수 구현 → DeckRecipeCard.logicalCardId 채움.
 */
// async function matchRecipeToLogicalCard(set?: string, number?: string): Promise<string | null> {
//   return null;
// }

async function main() {
  const args = parseArgs();
  const since = new Date(Date.now() - args.window * 86_400_000);
  const week = isoWeek(new Date());

  console.log(
    `[agg] window=${args.window}d (since ${since.toISOString().slice(0, 10)}) regulation=${args.regulation} week=${week} dry-run=${args.dryRun}`,
  );

  // window 내 대회 + standings (deckKey not null)
  const tournaments = await prisma.tournament.findMany({
    where: { date: { gte: since }, limitlessId: { not: null } },
    select: { id: true, limitlessId: true, format: true },
  });
  const tFormat = new Map(tournaments.map((t) => [t.id, t.format] as const));
  const tLimitless = new Map(tournaments.map((t) => [t.id, t.limitlessId!] as const));
  const tournamentIds = tournaments.map((t) => t.id);

  if (tournamentIds.length === 0) {
    console.log("[agg] window 내 Limitless 대회 없음 — 먼저 sync 필요. 종료.");
    await prisma.$disconnect();
    return;
  }

  const standings = (await prisma.tournamentStanding.findMany({
    where: { tournamentId: { in: tournamentIds }, deckKey: { not: null } },
    select: {
      tournamentId: true,
      placing: true,
      playerName: true,
      deckKey: true,
      deckIcons: true,
      wins: true,
      losses: true,
      ties: true,
      decklist: true,
    },
  })) as unknown as StandingRow[];

  const totalStandings = standings.length;
  console.log(`[agg] 대상 대회 ${tournamentIds.length}건 / standings ${totalStandings}건`);
  if (totalStandings === 0) {
    console.log("[agg] deckKey 있는 standings 없음 — 종료.");
    await prisma.$disconnect();
    return;
  }

  // ── (b) deckKey 그룹 집계 ──
  type Group = {
    deckKey: string;
    nameEn: string | null;
    iconKeys: Set<string>;
    placings: number[];
    winCount: number;
    wins: number;
    losses: number;
    ties: number;
    top8: number;
    count: number;
    formats: Map<string, number>;
  };
  const groups = new Map<string, Group>();

  // deckName 은 별도 distinct 조회(아래)로 보강. iconKeys 는 standing.deckIcons(deck.icons) 에서
  // deckKey 그룹별 첫 non-empty 를 채택.
  for (const s of standings) {
    const k = s.deckKey;
    let g = groups.get(k);
    if (!g) {
      g = {
        deckKey: k,
        nameEn: null,
        iconKeys: new Set(),
        placings: [],
        winCount: 0,
        wins: 0,
        losses: 0,
        ties: 0,
        top8: 0,
        count: 0,
        formats: new Map(),
      };
      groups.set(k, g);
    }
    // iconKeys: 그룹별 첫 non-empty deckIcons 채택 (이후엔 보존).
    if (g.iconKeys.size === 0 && s.deckIcons && s.deckIcons.length > 0) {
      for (const ic of s.deckIcons) g.iconKeys.add(ic);
    }
    g.count++;
    g.placings.push(s.placing);
    if (s.placing === 1) g.winCount++;
    if (s.placing <= 8) g.top8++;
    g.wins += s.wins;
    g.losses += s.losses;
    g.ties += s.ties;
    const fmt = regulationFromFormat(tFormat.get(s.tournamentId) ?? "STANDARD");
    g.formats.set(fmt, (g.formats.get(fmt) ?? 0) + 1);
  }

  // deckName 채우기: standing.deckName 은 select 안했으니 별도 조회로 보강(대표 1건)
  const nameRows = await prisma.tournamentStanding.findMany({
    where: { tournamentId: { in: tournamentIds }, deckKey: { not: null }, deckName: { not: null } },
    select: { deckKey: true, deckName: true },
    distinct: ["deckKey"],
  });
  const nameByKey = new Map(nameRows.map((r) => [r.deckKey!, r.deckName!] as const));

  // 집계 결과 산출
  type Agg = {
    deckKey: string;
    nameEn: string;
    iconKeys: string[];
    usageRate: number;
    winCount: number;
    avgRank: number;
    winRate: number;
    conversion: number;
    consistency: number;
    sampleSize: number;
    tier: string;
    isUnderdog: boolean;
    isTrap: boolean;
    regulation: string;
    usage: number; // trend 용 (= usageRate)
  };
  const aggs: Agg[] = [];
  const untranslated: { deckKey: string; nameEn: string }[] = [];

  for (const g of groups.values()) {
    const usageRate = (g.count / totalStandings) * 100;
    const avgRank = mean(g.placings);
    const recTotal = g.wins + g.losses + g.ties;
    const winRate = recTotal > 0 ? (g.wins / recTotal) * 100 : 0;
    const conversion = g.count > 0 ? (g.top8 / g.count) * 100 : 0;
    const consistency = 100 / (1 + stddev(g.placings));
    const tier = tierOf(usageRate);
    const isUnderdog = usageRate < 8 && winRate >= 55;
    const isTrap = usageRate >= 10 && winRate < 50;
    // 대표 regulation = 최빈 format
    let reg = args.regulation;
    let bestN = -1;
    for (const [f, n] of g.formats) {
      if (n > bestN) {
        reg = f;
        bestN = n;
      }
    }
    const nameEn = nameByKey.get(g.deckKey) ?? g.deckKey;
    if (!ARCHETYPE_KO[g.deckKey]) untranslated.push({ deckKey: g.deckKey, nameEn });

    aggs.push({
      deckKey: g.deckKey,
      nameEn,
      iconKeys: [...g.iconKeys],
      usageRate,
      winCount: g.winCount,
      avgRank,
      winRate,
      conversion,
      consistency,
      sampleSize: g.count,
      tier,
      isUnderdog,
      isTrap,
      regulation: reg,
      usage: usageRate,
    });
  }

  // ── (d) Matchup: pairings 로 덱A vs 덱B ──
  // player(username) → deckKey 매핑은 standings 에 있으나, playerName 만 select 했고
  // pairings 키는 lowercase `player` username. → 정확 매핑 위해 player username 별도 조회 필요.
  // sync 가 TournamentStanding 에 player username 을 저장하지 않음(playerName 만).
  // → pairings.player1/2 (username) 를 standings.playerName 과 직접 매칭 불가할 수 있음.
  //   대안: standings 의 deckKey 를 placing 순으로 가질 수 없으니, pairings 집계는
  //   대회별로 standings 를 username 키로 재조회해야 함. 그러나 username 미보존.
  // 따라서 matchup 은 pairings 의 winner(username) 와 player1/2(username) 만 사용하고,
  // username→deckKey 는 "이 대회의 standings 를 다시 Limitless 에서 받아" 구성한다(아래).
  type MatchKey = string; // `${aId}|${bId}` (정렬된 쌍)
  const matchAcc = new Map<MatchKey, { aId: string; bId: string; winsA: number; winsB: number; ties: number }>();

  let pairingTournaments = 0;
  let pairingRows = 0;
  // pairings 조회는 대회마다 1 API 콜 → rate guard. 큰 대회 위주만(표본).
  for (const t of tournaments) {
    try {
      if (await rateGuard()) {
        /* waited */
      }
      const pairings = await fetchPairings(tLimitless.get(t.id)!);
      // 이 대회의 username→deckKey 는 standings(Limitless) 에서. 이미 우리 DB 엔 username 없음.
      // → standings 재조회 대신, 우리 DB standings 의 playerName 으로 매핑 시도(표시명=username 인 경우 多).
      //   매핑 실패 시 해당 pairing skip.
      const deckByPlayer = new Map<string, string>();
      const dbStandings = await prisma.tournamentStanding.findMany({
        where: { tournamentId: t.id, deckKey: { not: null } },
        select: { playerName: true, deckKey: true },
      });
      for (const ds of dbStandings) {
        deckByPlayer.set(ds.playerName.toLowerCase(), ds.deckKey!);
      }

      for (const p of pairings as LimitlessPairing[]) {
        if (typeof p.winner !== "string" && p.winner !== 0) continue; // -1 bye/미정 제외
        if (!p.player1 || !p.player2) continue;
        const d1 = deckByPlayer.get(p.player1.toLowerCase());
        const d2 = deckByPlayer.get(p.player2.toLowerCase());
        if (!d1 || !d2 || d1 === d2) continue;
        // 정렬된 쌍 키
        const [aId, bId] = d1 < d2 ? [d1, d2] : [d2, d1];
        const key = `${aId}|${bId}`;
        let acc = matchAcc.get(key);
        if (!acc) {
          acc = { aId, bId, winsA: 0, winsB: 0, ties: 0 };
          matchAcc.set(key, acc);
        }
        if (p.winner === 0) {
          acc.ties++;
        } else {
          // 승자 username 의 deck
          const wDeck = deckByPlayer.get((p.winner as string).toLowerCase());
          if (!wDeck) continue;
          if (wDeck === aId) acc.winsA++;
          else if (wDeck === bId) acc.winsB++;
        }
        pairingRows++;
      }
      pairingTournaments++;
    } catch (e) {
      console.error(`[agg] pairings ${t.id} 실패: ${(e as Error).message}`);
    }
  }

  // isMetaCounter: 상위(tier S/A) 상대 종합 winRateA≥55
  const tierByKey = new Map(aggs.map((a) => [a.deckKey, a.tier] as const));
  const topDecks = new Set(aggs.filter((a) => a.tier === "S" || a.tier === "A").map((a) => a.deckKey));
  const vsTop = new Map<string, { w: number; total: number }>();
  for (const m of matchAcc.values()) {
    const games = m.winsA + m.winsB + m.ties;
    if (games === 0) continue;
    // A 관점: B 가 상위덱이면
    if (topDecks.has(m.bId)) {
      const cur = vsTop.get(m.aId) ?? { w: 0, total: 0 };
      cur.w += m.winsA;
      cur.total += m.winsA + m.winsB; // tie 제외 승률
      vsTop.set(m.aId, cur);
    }
    // B 관점: A 가 상위덱이면
    if (topDecks.has(m.aId)) {
      const cur = vsTop.get(m.bId) ?? { w: 0, total: 0 };
      cur.w += m.winsB;
      cur.total += m.winsA + m.winsB;
      vsTop.set(m.bId, cur);
    }
  }
  const metaCounters = new Set<string>();
  for (const [k, v] of vsTop) {
    if (v.total >= 5 && (v.w / v.total) * 100 >= 55) metaCounters.add(k);
  }

  // ── 통계용 카운터 ──
  let recipeRows = 0;

  if (args.dryRun) {
    const top = [...aggs].sort((a, b) => b.usageRate - a.usageRate).slice(0, 10);
    console.log("\n[dry] DeckArchetype top 10:");
    for (const a of top) {
      const ko = ARCHETYPE_KO[a.deckKey] ?? `(미번역)${a.nameEn}`;
      console.log(
        `  ${a.tier} ${ko} [${a.deckKey}] usage=${a.usageRate.toFixed(1)}% win=${a.winRate.toFixed(1)}% conv=${a.conversion.toFixed(0)}% n=${a.sampleSize}${a.isUnderdog ? " 🌱" : ""}${a.isTrap ? " ⚠️" : ""}${metaCounters.has(a.deckKey) ? " 🛡" : ""}`,
      );
    }
    console.log(`\n[dry] 아키타입 ${aggs.length} / 매치업쌍 ${matchAcc.size} (pairing대회 ${pairingTournaments}, rows ${pairingRows})`);
    console.log(`[dry] 미번역 덱 ${untranslated.length}: ${untranslated.map((u) => u.deckKey).join(", ")}`);
    await prisma.$disconnect();
    return;
  }

  // ── (b) DeckArchetype upsert ──
  for (const a of aggs) {
    const ko = ARCHETYPE_KO[a.deckKey];
    const baseUpdate = {
      nameEn: a.nameEn,
      // iconKeys: non-empty 일 때만 갱신 (빈배열로 기존값 덮어쓰기 방지).
      ...(a.iconKeys.length > 0 ? { iconKeys: a.iconKeys } : {}),
      region: "INTL",
      tier: a.tier,
      regulation: a.regulation,
      usageRate: a.usageRate,
      winCount: a.winCount,
      avgRank: a.avgRank,
      winRate: a.winRate,
      conversion: a.conversion,
      consistency: a.consistency,
      sampleSize: a.sampleSize,
      isUnderdog: a.isUnderdog,
      isTrap: a.isTrap,
      isMetaCounter: metaCounters.has(a.deckKey),
      // nameKo: 사전 있을 때만 갱신 (없으면 update 에서 제외 → 기존 편집값 보존)
      ...(ko ? { nameKo: ko } : {}),
      // description/strengths/weaknesses/counters/deckCostKrw 는 보존 → update 미포함
    };
    await prisma.deckArchetype.upsert({
      where: { id: a.deckKey },
      create: {
        id: a.deckKey,
        nameKo: ko ?? a.nameEn, // 신규 생성 시 폴백
        nameEn: a.nameEn,
        iconKeys: a.iconKeys,
        region: "INTL",
        tier: a.tier,
        regulation: a.regulation,
        usageRate: a.usageRate,
        winCount: a.winCount,
        avgRank: a.avgRank,
        winRate: a.winRate,
        conversion: a.conversion,
        consistency: a.consistency,
        sampleSize: a.sampleSize,
        isUnderdog: a.isUnderdog,
        isTrap: a.isTrap,
        isMetaCounter: metaCounters.has(a.deckKey),
      },
      update: baseUpdate,
    });
  }

  // ── (c) DeckRecipeCard 집계 ──
  // deckKey 별 카드 (name,set,number) → avgCount(평균 채용), adoptionRate(채용 덱 비율)
  for (const g of groups.values()) {
    // 이 덱의 decklist 들 (standings 의 decklist)
    const lists = standings.filter((s) => s.deckKey === g.deckKey).map((s) => s.decklist as Decklist | null);
    const deckCount = lists.length;
    if (deckCount === 0) continue;

    type CardAcc = { name: string; set?: string; number?: string; category: string; totalCount: number; decks: number };
    const cardAcc = new Map<string, CardAcc>();
    const cat: [keyof Decklist, string][] = [
      ["pokemon", "pokemon"],
      ["trainer", "trainer"],
      ["energy", "energy"],
    ];
    for (const list of lists) {
      if (!list) continue;
      const seenInDeck = new Set<string>();
      for (const [field, category] of cat) {
        const entries = list[field];
        if (!entries) continue;
        for (const e of entries) {
          const ck = `${e.name}|${e.set ?? ""}|${e.number ?? ""}`;
          let acc = cardAcc.get(ck);
          if (!acc) {
            acc = { name: e.name, set: e.set, number: e.number, category, totalCount: 0, decks: 0 };
            cardAcc.set(ck, acc);
          }
          acc.totalCount += e.count;
          if (!seenInDeck.has(ck)) {
            acc.decks++;
            seenInDeck.add(ck);
          }
        }
      }
    }

    for (const acc of cardAcc.values()) {
      const adoptionRate = (acc.decks / deckCount) * 100;
      const avgCount = acc.totalCount / acc.decks; // 채용한 덱 기준 평균
      await prisma.deckRecipeCard.upsert({
        where: {
          archetypeId_cardName_setCode_number: {
            archetypeId: g.deckKey,
            cardName: acc.name,
            setCode: acc.set ?? "",
            number: acc.number ?? "",
          },
        },
        create: {
          archetypeId: g.deckKey,
          cardName: acc.name,
          setCode: acc.set ?? null,
          number: acc.number ?? null,
          category: acc.category,
          avgCount,
          adoptionRate,
          logicalCardId: null, // TODO(후속): matchRecipeToLogicalCard
          isCore: adoptionRate >= 90,
        },
        update: {
          category: acc.category,
          avgCount,
          adoptionRate,
          isCore: adoptionRate >= 90,
        },
      });
      recipeRows++;
    }
  }

  // ── (d) DeckMatchup upsert ──
  let matchupRows = 0;
  for (const m of matchAcc.values()) {
    const games = m.winsA + m.winsB + m.ties;
    if (games === 0) continue;
    const decisive = m.winsA + m.winsB;
    const winRateA = decisive > 0 ? (m.winsA / decisive) * 100 : 0;
    await prisma.deckMatchup.upsert({
      where: { deckAId_deckBId: { deckAId: m.aId, deckBId: m.bId } },
      create: {
        deckAId: m.aId,
        deckBId: m.bId,
        winsA: m.winsA,
        winsB: m.winsB,
        ties: m.ties,
        games,
        winRateA,
      },
      update: { winsA: m.winsA, winsB: m.winsB, ties: m.ties, games, winRateA },
    });
    matchupRows++;
  }

  // ── (e) ArchetypeTrend: 이번 주 usage ──
  let trendRows = 0;
  for (const a of aggs) {
    await prisma.archetypeTrend.upsert({
      where: { archetypeId_region_week: { archetypeId: a.deckKey, region: "INTL", week } },
      create: { archetypeId: a.deckKey, region: "INTL", week, usage: a.usage },
      update: { usage: a.usage },
    });
    trendRows++;
  }

  // ── 통계 ──
  console.log("\n[agg] ── 통계 ──");
  console.log(`  아키타입: ${aggs.length}  레시피행: ${recipeRows}  매치업쌍: ${matchupRows}  트렌드: ${trendRows}`);
  console.log(`  pairing 대회: ${pairingTournaments}  pairing rows: ${pairingRows}  메타카운터: ${metaCounters.size}  (r=${getRemaining()})`);
  if (untranslated.length) {
    console.log(`\n[agg] 미번역 덱 ${untranslated.length}:`);
    for (const u of untranslated) console.log(`  - ${u.deckKey}  (${u.nameEn})`);
  }

  const top = [...aggs].sort((a, b) => b.usageRate - a.usageRate).slice(0, 10);
  console.log("\n[agg] DeckArchetype top 10 (nameKo / tier / usage / win / n):");
  for (const a of top) {
    const ko = ARCHETYPE_KO[a.deckKey] ?? `(미번역)${a.nameEn}`;
    console.log(
      `  ${a.tier}  ${ko}  usage=${a.usageRate.toFixed(1)}%  win=${a.winRate.toFixed(1)}%  n=${a.sampleSize}`,
    );
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
