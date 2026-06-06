/**
 * Phase 5 — 카드게임 메타(덱·대회·룰·용어집·봉입률) 시드 (멱등).
 *
 * 실행: npm run seed:cardgame
 *
 * mock(`src/lib/cardgame/mock.ts`) → DB 이관:
 *   ARCHETYPES      → DeckArchetype (+ DeckCard, DeckVariant)
 *   TIER_TREND      → ArchetypeTrend
 *   TOURNAMENTS     → Tournament
 *   PLAYER_RANKINGS → PlayerRanking (season=2026)
 *   RULINGS         → Ruling
 *   GLOSSARY        → GlossaryEntry (locale="ko")
 *   PULL_RATES      → PullRate
 *
 * - 멱등 upsert. id 가 있는 모델은 upsert, child(DeckCard/Variant/Trend/PullRate/
 *   Ruling/Glossary/PlayerRanking)는 부모 단위로 deleteMany 후 재삽입(완전 동기화).
 * - DeckCard.cardId: MOCK_TO_REAL 매핑이 있으면 실제 pokemontcg Card.id, 없으면 mock id.
 * - Supabase 풀 한도 회피를 위해 동시 커넥션을 최소화한 순차 처리.
 *
 * ⚠️ 외부 크롤링은 승인 대기. 이 스크립트는 네트워크 호출 없이 mock 만 적재한다.
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import {
  ARCHETYPES,
  TIER_TREND,
  TOURNAMENTS,
  PLAYER_RANKINGS,
  RULINGS,
  GLOSSARY,
  PULL_RATES,
} from "../src/lib/cardgame/mock";
import { MOCK_TO_REAL } from "../src/lib/cardgame/mockToReal";

const RANKING_SEASON = 2026;

/** mock cardId → DeckCard.cardId (실제 매핑 있으면 실제 id). */
function resolveCardId(mockId: string): string {
  return MOCK_TO_REAL[mockId] ?? mockId;
}

async function seedArchetypes() {
  let cardCount = 0;
  let variantCount = 0;
  let trendCount = 0;

  for (const a of ARCHETYPES) {
    await prisma.deckArchetype.upsert({
      where: { id: a.id },
      create: {
        id: a.id,
        nameKo: a.nameKo,
        tier: a.tier,
        regulation: a.regulation,
        usageRate: a.usageRate,
        winCount: a.winCount,
        avgRank: a.avgRank,
        description: a.description,
        strengths: a.strengths,
        weaknesses: a.weaknesses,
        counters: a.counters,
      },
      update: {
        nameKo: a.nameKo,
        tier: a.tier,
        regulation: a.regulation,
        usageRate: a.usageRate,
        winCount: a.winCount,
        avgRank: a.avgRank,
        description: a.description,
        strengths: a.strengths,
        weaknesses: a.weaknesses,
        counters: a.counters,
      },
    });

    // child 완전 동기화 (멱등)
    await prisma.deckCard.deleteMany({ where: { archetypeId: a.id } });
    for (const cl of a.cardList) {
      await prisma.deckCard.create({
        data: {
          archetypeId: a.id,
          logicalCardId: resolveCardId(cl.cardId),
          count: cl.count,
          role: cl.role ?? null,
        },
      });
      cardCount++;
    }

    await prisma.deckVariant.deleteMany({ where: { archetypeId: a.id } });
    for (const v of a.variants) {
      await prisma.deckVariant.create({
        data: { id: v.id, archetypeId: a.id, nameKo: v.nameKo },
      });
      variantCount++;
    }

    await prisma.archetypeTrend.deleteMany({ where: { archetypeId: a.id } });
    const trends = TIER_TREND.filter((t) => t.archetypeId === a.id);
    for (const t of trends) {
      await prisma.archetypeTrend.create({
        data: { archetypeId: a.id, week: t.week, usage: t.usage },
      });
      trendCount++;
    }
  }

  console.log(
    `[seed-cardgame] DeckArchetype ${ARCHETYPES.length}개, DeckCard ${cardCount}개, DeckVariant ${variantCount}개, ArchetypeTrend ${trendCount}개`
  );
}

async function seedTournaments() {
  for (const t of TOURNAMENTS) {
    const data = {
      nameKo: t.nameKo,
      date: new Date(t.date),
      region: t.region,
      format: t.format,
      players: t.players,
      winnerArchetypeId: t.winnerArchetype ?? null,
      status: t.status,
    };
    await prisma.tournament.upsert({
      where: { id: t.id },
      // metaRegion 은 필수(no-default) — 목업은 source=null 이라 realOnly/집계에서 제외되므로 INTL 표기만
      create: { id: t.id, metaRegion: "INTL", ...data },
      update: data,
    });
  }
  console.log(`[seed-cardgame] Tournament ${TOURNAMENTS.length}개`);
}

async function seedPlayerRankings() {
  // season 단위 완전 동기화
  await prisma.playerRanking.deleteMany({ where: { season: RANKING_SEASON } });
  for (const p of PLAYER_RANKINGS) {
    // favArchetype 은 mock 에서 nameKo 라벨 → archetypeId 로 환산(없으면 null)
    const arch = ARCHETYPES.find((a) => a.nameKo === p.favArchetype);
    await prisma.playerRanking.create({
      data: {
        season: RANKING_SEASON,
        rank: p.rank,
        name: p.name,
        csp: p.csp,
        favArchetypeId: arch?.id ?? null,
        wins: p.wins,
      },
    });
  }
  console.log(`[seed-cardgame] PlayerRanking ${PLAYER_RANKINGS.length}개 (season=${RANKING_SEASON})`);
}

async function seedRulings() {
  // id 가 있으므로 upsert
  for (const r of RULINGS) {
    const cardId = r.cardId ? resolveCardId(r.cardId) : null;
    const data = {
      cardId,
      question: r.question,
      answer: r.answer,
      sourceUrl: r.sourceUrl ?? null,
    };
    await prisma.ruling.upsert({
      where: { id: r.id },
      create: { id: r.id, ...data },
      update: data,
    });
  }
  console.log(`[seed-cardgame] Ruling ${RULINGS.length}개`);
}

async function seedGlossary() {
  // term(+locale) 단위 완전 동기화
  await prisma.glossaryEntry.deleteMany({ where: { locale: "ko" } });
  for (const g of GLOSSARY) {
    await prisma.glossaryEntry.create({
      data: { term: g.term, definition: g.definition, example: g.example ?? null, locale: "ko" },
    });
  }
  console.log(`[seed-cardgame] GlossaryEntry ${GLOSSARY.length}개`);
}

async function seedPullRates() {
  let rows = 0;
  for (const [setId, list] of Object.entries(PULL_RATES)) {
    await prisma.pullRate.deleteMany({ where: { setId } });
    for (const row of list) {
      await prisma.pullRate.create({
        data: {
          setId,
          rarity: row.rarity,
          types: row.types,
          probability: row.probability,
          perBox: row.perBox,
        },
      });
      rows++;
    }
  }
  console.log(`[seed-cardgame] PullRate ${rows}개 (set ${Object.keys(PULL_RATES).length}개)`);
}

async function main() {
  // 순차 처리로 동시 커넥션 최소화 (Supabase 풀 한도 회피)
  await seedArchetypes();
  await seedTournaments();
  await seedPlayerRankings();
  await seedRulings();
  await seedGlossary();
  await seedPullRates();
  console.log("[seed-cardgame] 완료.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
