// card-check 스킬 — DB 카드 검색 (이름 다국어 부분일치 + 도감/세트/번호 필터)
// 사용: 레포 루트에서  npx tsx .claude/skills/card-check/scripts/search-card.ts "<검색어>" [--set X] [--num N] [--dex N] [--limit 30]
// 검색어 없이 --dex 나 --set+--num 만으로도 검색 가능.
import "dotenv/config";
import { prisma } from "../../../../src/lib/prisma";

function parseArgs(argv: string[]) {
  const out: { queries: string[]; set?: string; num?: string; dex?: number; limit: number } = { queries: [], limit: 30 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--set") out.set = argv[++i];
    else if (a === "--num") out.num = argv[++i];
    else if (a === "--dex") out.dex = parseInt(argv[++i], 10);
    else if (a === "--limit") out.limit = parseInt(argv[++i], 10);
    else out.queries.push(a.normalize("NFC"));
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const results: unknown[] = [];

  // 이름 검색이 없으면 필터 단독 검색 1회 수행
  const queries = args.queries.length ? args.queries : [""];

  for (const q of queries) {
    const nameOr = q
      ? [
          { locales: { some: { name: { contains: q, mode: "insensitive" as const } } } },
          { nameKo: { contains: q, mode: "insensitive" as const } },
          { texts: { some: { name: { contains: q, mode: "insensitive" as const } } } },
        ]
      : undefined;

    const and: object[] = [];
    if (nameOr) and.push({ OR: nameOr });
    if (args.dex) and.push({ pokedexNumbers: { has: args.dex } });
    if (args.set)
      and.push({
        // ★P9: Card.cardPackId 제거됨. 팩소속은 RegionCard 의 Set.cardPackId(=setGroupId) 로 도출.
        locales: { some: { set: { OR: [
          { cardPackId: { contains: args.set, mode: "insensitive" } },
          { code: { contains: args.set, mode: "insensitive" } },
          { id: { contains: args.set, mode: "insensitive" } },
          { name: { contains: args.set, mode: "insensitive" } },
        ] } } },
      });
    if (args.num) {
      const n = parseInt(args.num, 10);
      and.push({
        OR: [
          { primaryNumber: args.num },
          { locales: { some: { number: args.num } } },
          ...(Number.isFinite(n) ? [{ primaryNumberInt: n }, { locales: { some: { numberInt: n } } }] : []),
        ],
      });
    }
    if (!and.length) {
      console.error("검색어 또는 --dex/--set/--num 필터가 필요합니다.");
      process.exit(1);
    }

    const cards = await prisma.card.findMany({
      where: { AND: and },
      take: args.limit,
      orderBy: [{ primaryNumberInt: "asc" }],
      include: {
        rarity: { select: { code: true } },
        locales: {
          select: { region: true, language: true, number: true, name: true, setId: true, imageLarge: true, imageSmall: true,
                    set: { select: { code: true, name: true, cardPackId: true,
                                     cardPack: { select: { id: true, era: true, nameKo: true, nameJa: true, releaseDate: true } } } } },
          orderBy: [{ region: "asc" }, { setId: "asc" }],
        },
      },
    });

    // ★P9: 팩소속은 앵커 RegionCard(JP>KR>EN) 의 Set.cardPack 로 도출.
    const REGION_RANK: Record<string, number> = { JP: 0, KR: 1, EN: 2 };
    const deriveSetGroup = (locales: { region: string; set: { cardPack: { id: string; era: string | null; nameKo: string | null; nameJa: string | null } | null } }[]) => {
      const sorted = [...locales].sort((a, b) => (REGION_RANK[a.region] ?? 3) - (REGION_RANK[b.region] ?? 3));
      const anchor = sorted.find((l) => l.set.cardPack);
      const cp = anchor?.set.cardPack;
      return cp ? { id: cp.id, era: cp.era, name: cp.nameKo ?? cp.nameJa } : null;
    };

    results.push({
      query: q || null,
      filters: { set: args.set ?? null, num: args.num ?? null, dex: args.dex ?? null },
      count: cards.length,
      truncated: cards.length === args.limit,
      matches: cards.map((c) => ({
        logicalCardId: c.id,
        setGroup: deriveSetGroup(c.locales),
        primaryNumber: c.primaryNumber,
        rarity: c.rarity?.code ?? null,
        pokedexNumbers: c.pokedexNumbers,
        supertype: c.supertype,
        nameKo: c.nameKo,
        illustrator: c.illustrator,
        locales: c.locales.map((l) => ({
          region: l.region, number: l.number, name: l.name,
          set: l.set.code ?? l.setId, setName: l.set.name, setGroupId: l.set.cardPackId,
          hasImage: Boolean(l.imageLarge || l.imageSmall),
          imageLarge: l.imageLarge, imageSmall: l.imageSmall,
        })),
      })),
    });
  }

  console.log(JSON.stringify(results, null, 1));
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
