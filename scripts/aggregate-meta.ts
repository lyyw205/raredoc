/**
 * 메타 집계 — 적재된 TournamentStanding 으로 DeckArchetype/RegionStat/Recipe/Matchup/Trend 도출.
 * (P2: region 분리 집계 — docs/meta-pipeline-multisource.md §5)
 *
 * 흐름 (region 패스마다):
 *   a. window 일수 내 대회(source not null AND metaRegion=region) + standings (deckKey not null)
 *   b. deckKey 그룹 집계: usageRate(region-로컬 분모)/winCount/avgRank/winRate/
 *      conversion(Top8)/consistency/sampleSize/tier/isUnderdog/isTrap
 *   c. 쓰기 분리:
 *      - 전 region → ArchetypeRegionStat upsert (tier 는 sampleSize<30 → "—" 가드)
 *      - INTL 패스만 → DeckArchetype 본체 미러 갱신 (기존 화면 무중단 — 회귀 게이트 대상)
 *      - JP/KR 패스 → 본체에 없는 덱은 스텁 생성(create-only, 집계필드 0 — INTL 화면엔 안 잡힘)
 *   d. DeckRecipeCard: region 키 포함 upsert + resolver 매칭 (setCode/number 는 "" 정규화 — NULL 금지)
 *   e. DeckMatchup: INTL 패스 + limitless-play 대회만 (pairings 단독 보유)
 *   f. ArchetypeTrend: (archetypeId, region, week) upsert
 *
 * CLI:
 *   npm run aggregate:meta                                  # --region=all (INTL→JP→KR 순차)
 *   npm run aggregate:meta -- --region=INTL --window=14
 *   npm run aggregate:meta -- --region=JP                   # window 기본 90d (시티리그 시즌 휴지기 대응)
 *   npm run aggregate:meta -- --dry-run
 *
 * 주의: 기존 목업 DeckArchetype(Limitless 키 아님)/Tournament(source=null) 은 건드리지 않음.
 *
 * docs/meta-pipeline-limitless.md · docs/meta-pipeline-multisource.md
 */
import "dotenv/config";
import { prisma } from "@/lib/prisma";
import { fetchPairings, rateGuard, getRemaining, type LimitlessPairing } from "./lib/limitless-api";
import { ARCHETYPE_KO } from "@/lib/cardgame/archetype-ko";
import { CardResolver } from "./lib/resolve-card";

const REGIONS = ["INTL", "JP", "KR"] as const;
type Region = (typeof REGIONS)[number];

type Args = {
  region: Region | "all";
  window: number; // INTL 윈도우 (일)
  windowJp: number; // JP: 시티리그 시즌제 — 휴지기에도 마지막 시즌이 잡히게 길게
  windowKr: number; // KR: 코리안리그 연 5시즌 — 연 단위
  regulation: string;
  dryRun: boolean;
};

function parseArgs(): Args {
  const a: Args = { region: "all", window: 14, windowJp: 90, windowKr: 365, regulation: "스탠다드", dryRun: false };
  for (const arg of process.argv.slice(2)) {
    if (arg === "--dry-run") a.dryRun = true;
    else if (arg.startsWith("--region=")) a.region = arg.slice("--region=".length) as Args["region"];
    else if (arg.startsWith("--window=")) a.window = parseInt(arg.slice("--window=".length), 10);
    else if (arg.startsWith("--window-jp=")) a.windowJp = parseInt(arg.slice("--window-jp=".length), 10);
    else if (arg.startsWith("--window-kr=")) a.windowKr = parseInt(arg.slice("--window-kr=".length), 10);
    else if (arg.startsWith("--regulation=")) a.regulation = arg.slice("--regulation=".length);
  }
  if (a.region !== "all" && !REGIONS.includes(a.region as Region)) {
    throw new Error(`--region 은 ${REGIONS.join("|")}|all 중 하나: ${a.region}`);
  }
  return a;
}

/** format(STANDARD/EXPANDED/STANDARD_JP) → 한글 regulation */
function regulationFromFormat(format: string): string {
  if (format === "EXPANDED") return "익스텐디드";
  return "스탠다드"; // STANDARD/STANDARD_JP 및 기타
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

/** tier 임계 — region 별 보정 여지 (1차 집계 후 분포 보고 조정) */
const TIER_THRESHOLDS: Record<Region, { s: number; a: number; b: number }> = {
  INTL: { s: 15, a: 8, b: 3 },
  JP: { s: 15, a: 8, b: 3 },
  KR: { s: 15, a: 8, b: 3 },
};
function tierOf(usageRate: number, region: Region = "INTL"): string {
  const t = TIER_THRESHOLDS[region];
  if (usageRate >= t.s) return "S";
  if (usageRate >= t.a) return "A";
  if (usageRate >= t.b) return "B";
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
 * cardId 매칭은 P1 완료 — 시세 연동(sum(avgCount × 최저시세))은 후속(P6).
 */

/** region 1패스 집계 + 적재 */
async function runRegionPass(region: Region, args: Args, resolver: CardResolver | null, week: string) {
  const windowDays = region === "JP" ? args.windowJp : region === "KR" ? args.windowKr : args.window;
  const since = new Date(Date.now() - windowDays * 86_400_000);
  console.log(
    `\n[agg:${region}] window=${windowDays}d (since ${since.toISOString().slice(0, 10)}) regulation=${args.regulation} week=${week} dry-run=${args.dryRun}`,
  );

  // (a) window 내 대회 + standings (deckKey not null)
  // pairings 는 limitless-play 전용 — source 필터로 별도 맵 (rate limit 보호)
  const tournaments = await prisma.tournament.findMany({
    where: { date: { gte: since }, source: { not: null }, metaRegion: region },
    select: { id: true, source: true, limitlessId: true, format: true },
  });
  const tFormat = new Map(tournaments.map((t) => [t.id, t.format] as const));
  const tLimitless = new Map(
    tournaments
      .filter((t) => t.source === "limitless-play" && t.limitlessId)
      .map((t) => [t.id, t.limitlessId!] as const),
  );
  const tournamentIds = tournaments.map((t) => t.id);

  if (tournamentIds.length === 0) {
    console.log(`[agg:${region}] window 내 대회 없음 — 패스 종료. (휴지기/미수집 구분은 소스별 sync 로그 참조)`);
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
  console.log(`[agg:${region}] 대상 대회 ${tournamentIds.length}건 / standings ${totalStandings}건`);
  if (totalStandings === 0) {
    console.log(`[agg:${region}] deckKey 있는 standings 없음 — 패스 종료.`);
    return;
  }

  // (b) deckKey 그룹 집계
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
    tournamentIds: Set<string>;
  };
  const groups = new Map<string, Group>();

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
        tournamentIds: new Set(),
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
    g.tournamentIds.add(s.tournamentId);
    const fmt = regulationFromFormat(tFormat.get(s.tournamentId) ?? "STANDARD");
    g.formats.set(fmt, (g.formats.get(fmt) ?? 0) + 1);
  }

  // deckName 채우기: 대표 1건 distinct 조회
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
    tournamentCount: number;
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
    const tier = tierOf(usageRate, region);
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
      tournamentCount: g.tournamentIds.size,
      tier,
      isUnderdog,
      isTrap,
      regulation: reg,
      usage: usageRate,
    });
  }

  // (e) Matchup: pairings 로 덱A vs 덱B — INTL 패스 + limitless-play 대회만
  type MatchKey = string; // `${aId}|${bId}` (정렬된 쌍)
  const matchAcc = new Map<MatchKey, { aId: string; bId: string; winsA: number; winsB: number; ties: number }>();

  let pairingTournaments = 0;
  let pairingRows = 0;
  if (region === "INTL") {
    for (const t of tournaments) {
      try {
        const limitlessId = tLimitless.get(t.id);
        if (!limitlessId) continue;
        if (await rateGuard()) {
          /* waited */
        }
        const pairings = await fetchPairings(limitlessId);
        // username→deckKey: playerUsername(소문자 username, P0 보존) 우선, 표시명 lowercase 폴백
        const deckByPlayer = new Map<string, string>();
        const dbStandings = await prisma.tournamentStanding.findMany({
          where: { tournamentId: t.id, deckKey: { not: null } },
          select: { playerName: true, playerUsername: true, deckKey: true },
        });
        for (const ds of dbStandings) {
          deckByPlayer.set(ds.playerName.toLowerCase(), ds.deckKey!);
        }
        for (const ds of dbStandings) {
          // username 키를 나중에 set → 충돌 시 username 우선
          if (ds.playerUsername) deckByPlayer.set(ds.playerUsername.toLowerCase(), ds.deckKey!);
        }

        for (const p of pairings as LimitlessPairing[]) {
          if (typeof p.winner !== "string" && p.winner !== 0) continue; // -1 bye/미정 제외
          if (!p.player1 || !p.player2) continue;
          const d1 = deckByPlayer.get(p.player1.toLowerCase());
          const d2 = deckByPlayer.get(p.player2.toLowerCase());
          if (!d1 || !d2 || d1 === d2) continue;
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
            const wDeck = deckByPlayer.get((p.winner as string).toLowerCase());
            if (!wDeck) continue;
            if (wDeck === aId) acc.winsA++;
            else if (wDeck === bId) acc.winsB++;
          }
          pairingRows++;
        }
        pairingTournaments++;
      } catch (e) {
        console.error(`[agg:${region}] pairings ${t.id} 실패: ${(e as Error).message}`);
      }
    }
  }

  // isMetaCounter: 상위(tier S/A) 상대 종합 winRateA≥55 — matchup 있는 패스(INTL)만 유효
  const topDecks = new Set(aggs.filter((a) => a.tier === "S" || a.tier === "A").map((a) => a.deckKey));
  const vsTop = new Map<string, { w: number; total: number }>();
  for (const m of matchAcc.values()) {
    const games = m.winsA + m.winsB + m.ties;
    if (games === 0) continue;
    if (topDecks.has(m.bId)) {
      const cur = vsTop.get(m.aId) ?? { w: 0, total: 0 };
      cur.w += m.winsA;
      cur.total += m.winsA + m.winsB; // tie 제외 승률
      vsTop.set(m.aId, cur);
    }
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

  let recipeRows = 0;

  if (args.dryRun) {
    const top = [...aggs].sort((a, b) => b.usageRate - a.usageRate).slice(0, 10);
    console.log(`\n[dry:${region}] top 10:`);
    for (const a of top) {
      const ko = ARCHETYPE_KO[a.deckKey] ?? `(미번역)${a.nameEn}`;
      console.log(
        `  ${a.tier} ${ko} [${a.deckKey}] usage=${a.usageRate.toFixed(1)}% win=${a.winRate.toFixed(1)}% conv=${a.conversion.toFixed(0)}% n=${a.sampleSize}${a.isUnderdog ? " 🌱" : ""}${a.isTrap ? " ⚠️" : ""}${metaCounters.has(a.deckKey) ? " 🛡" : ""}`,
      );
    }
    console.log(`[dry:${region}] 아키타입 ${aggs.length} / 매치업쌍 ${matchAcc.size} (pairing대회 ${pairingTournaments}, rows ${pairingRows})`);
    console.log(`[dry:${region}] 미번역 덱 ${untranslated.length}: ${untranslated.map((u) => u.deckKey).join(", ")}`);
    return;
  }

  // (c-1) 본체 DeckArchetype — INTL 패스: 미러 갱신(기존 동작 그대로 — 회귀 게이트 대상)
  //       JP/KR 패스: 본체에 없는 덱만 스텁 생성(create-only, 집계필드 0 → INTL 화면(sampleSize>0)에 미노출)
  for (const a of aggs) {
    const ko = ARCHETYPE_KO[a.deckKey];
    if (region === "INTL") {
      const baseUpdate = {
        nameEn: a.nameEn,
        // iconKeys: non-empty 일 때만 갱신 (빈배열로 기존값 덮어쓰기 방지).
        ...(a.iconKeys.length > 0 ? { iconKeys: a.iconKeys } : {}),
        region: "INTL", // 본체 행 = INTL 미러 의미 고정 (multisource §2)
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
    } else {
      // JP/KR-only 덱 스텁: 존재하면 일절 건드리지 않음(update: {})
      await prisma.deckArchetype.upsert({
        where: { id: a.deckKey },
        create: {
          id: a.deckKey,
          nameKo: ko ?? a.nameEn,
          nameEn: a.nameEn,
          iconKeys: a.iconKeys,
          region: "INTL", // 본체 행 = 부모 의미 (region 별 수치는 RegionStat)
          tier: "—", // INTL 표본 없음 — INTL 화면은 sampleSize>0 필터라 미노출
          regulation: a.regulation,
        },
        update: {},
      });
    }
  }

  // (c-2) ArchetypeRegionStat — 전 region (tier 는 sampleSize<30 → "—" 가드, multisource §5)
  for (const a of aggs) {
    const stat = {
      tier: a.sampleSize < 30 ? "—" : a.tier,
      usageRate: a.usageRate,
      winCount: a.winCount,
      avgRank: a.avgRank,
      winRate: a.winRate,
      conversion: a.conversion,
      consistency: a.consistency,
      sampleSize: a.sampleSize,
      tournamentCount: a.tournamentCount,
      isUnderdog: a.isUnderdog,
      isTrap: a.isTrap,
      isMetaCounter: metaCounters.has(a.deckKey),
    };
    await prisma.archetypeRegionStat.upsert({
      where: { archetypeId_region: { archetypeId: a.deckKey, region } },
      create: { archetypeId: a.deckKey, region, ...stat },
      update: stat,
    });
  }

  // (d) DeckRecipeCard 집계 — region 키 포함, setCode/number "" 정규화
  for (const g of groups.values()) {
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
      // cardId 매칭 (P1): 실패 시 null 유지 — 기존 non-null 을 null 로 덮지 않도록 update 는 조건부
      const resolved =
        resolver && acc.set && acc.number ? await resolver.resolveEn(acc.set, acc.number) : null;
      await prisma.deckRecipeCard.upsert({
        where: {
          archetypeId_region_cardName_setCode_number: {
            archetypeId: g.deckKey,
            region,
            cardName: acc.name,
            setCode: acc.set ?? "",
            number: acc.number ?? "",
          },
        },
        create: {
          archetypeId: g.deckKey,
          region,
          cardName: acc.name,
          setCode: acc.set ?? "",
          number: acc.number ?? "",
          category: acc.category,
          avgCount,
          adoptionRate,
          cardId: resolved?.cardId ?? null,
          isCore: adoptionRate >= 90,
        },
        update: {
          category: acc.category,
          avgCount,
          adoptionRate,
          isCore: adoptionRate >= 90,
          ...(resolved ? { cardId: resolved.cardId } : {}),
        },
      });
      recipeRows++;
    }
  }

  // (e) DeckMatchup upsert — INTL 패스만 (matchAcc 가 비어 자동 no-op 이지만 의도 명시)
  let matchupRows = 0;
  if (region === "INTL") {
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
  }

  // (f) ArchetypeTrend: (archetypeId, region, week) usage
  let trendRows = 0;
  for (const a of aggs) {
    await prisma.archetypeTrend.upsert({
      where: { archetypeId_region_week: { archetypeId: a.deckKey, region, week } },
      create: { archetypeId: a.deckKey, region, week, usage: a.usage },
      update: { usage: a.usage },
    });
    trendRows++;
  }

  // 통계
  console.log(`[agg:${region}] ── 통계 ──`);
  console.log(`  아키타입: ${aggs.length}  레시피행: ${recipeRows}  매치업쌍: ${matchupRows}  트렌드: ${trendRows}`);
  console.log(`  pairing 대회: ${pairingTournaments}  pairing rows: ${pairingRows}  메타카운터: ${metaCounters.size}  (r=${getRemaining()})`);
  if (untranslated.length) {
    console.log(`[agg:${region}] 미번역 덱 ${untranslated.length}:`);
    for (const u of untranslated) console.log(`  - ${u.deckKey}  (${u.nameEn})`);
  }

  const top = [...aggs].sort((a, b) => b.usageRate - a.usageRate).slice(0, 10);
  console.log(`[agg:${region}] top 10 (nameKo / tier / usage / win / n):`);
  for (const a of top) {
    const ko = ARCHETYPE_KO[a.deckKey] ?? `(미번역)${a.nameEn}`;
    console.log(
      `  ${a.tier}  ${ko}  usage=${a.usageRate.toFixed(1)}%  win=${a.winRate.toFixed(1)}%  n=${a.sampleSize}`,
    );
  }
}

async function main() {
  const args = parseArgs();
  let resolver: CardResolver | null = null;
  try {
    resolver = await CardResolver.create();
  } catch (e) {
    console.warn(`[agg] resolve-card 비활성 (cardId 매칭 skip): ${(e as Error).message}`);
  }
  const week = isoWeek(new Date());
  const regions: Region[] = args.region === "all" ? [...REGIONS] : [args.region as Region];

  for (const region of regions) {
    await runRegionPass(region, args, resolver, week);
  }
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
