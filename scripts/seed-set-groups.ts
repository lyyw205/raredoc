/**
 * 다지역(EN/JP/KR) 확장팩 그룹화 시드 (멱등).
 *
 * 실행: npm run seed:setgroups
 *
 * 무엇을 하나:
 *   1) 검증된 CardPack 27개(SV/MEGA) upsert (order=배열 순서, releaseDate=JP 최초 발매일).
 *   2) EN Set: 이미 DB에 있는 행의 cardPackId 만 연결(없으면 skip + 로그).
 *   3) JP/KR Set: 새 행 생성/갱신(id 충돌 방지 prefix — jp-<slug>, kr-<slug>).
 *
 * ⚠️ 데이터 출처: 4개 독립 출처 교차검증된 "검증된 매핑"만 사용(추측 금지).
 *    KR명 미확보 그룹(MEGA 일부)은 nameKo/KR Set 을 생성하지 않는다.
 *
 * - 멱등 upsert. Supabase 풀 한도(15) 회피 위해 순차 처리.
 */
import "dotenv/config";
import { prisma } from "@/lib/prisma";

type RegionSet = {
  /** EN: 기존 DB id. JP/KR: null → 자동 prefix id 생성. */
  enId?: string;
  name: string; // 현지어 정식명
  releaseDate: string; // YYYY-MM-DD
  cardCount?: number;
};

type GroupDef = {
  slug: string;
  era: "SV" | "MEGA";
  /** EN Set ids (DB에 이미 존재). 합본이면 여러 개. 없으면 []. */
  enIds: string[];
  nameEn?: string; // EN 세트명(있으면). 없으면 영판 미발매 → null
  jp?: { name: string; releaseDate: string };
  kr?: { name: string; releaseDate: string };
};

const series = (era: "SV" | "MEGA") =>
  era === "SV" ? "Scarlet & Violet" : "Mega Evolution";

// ─── 검증된 매핑 (순서 = order 0..N) ───────────────────────────────────────
const GROUPS: GroupDef[] = [
  {
    slug: "sv-base", era: "SV", enIds: ["sv1"], nameEn: "Scarlet & Violet",
    jp: { name: "スカーレットex+バイオレットex", releaseDate: "2023-01-20" },
    kr: { name: "스칼렛 ex+바이올렛 ex", releaseDate: "2023-03-15" },
  },
  {
    slug: "sv-triplet-beat", era: "SV", enIds: [],
    jp: { name: "トリプレットビート", releaseDate: "2023-03-10" },
    kr: { name: "트리플렛비트", releaseDate: "2023-05-03" },
  },
  {
    slug: "sv-paldea-evolved", era: "SV", enIds: ["sv2"], nameEn: "Paldea Evolved",
    jp: { name: "スノーハザード+クレイバースト", releaseDate: "2023-04-14" },
    kr: { name: "스노해저드+클레이버스트", releaseDate: "2023-06-14" },
  },
  {
    slug: "sv-151", era: "SV", enIds: ["sv3pt5"], nameEn: "151",
    jp: { name: "ポケモンカード151", releaseDate: "2023-06-16" },
    kr: { name: "포켓몬 카드 151", releaseDate: "2023-07-28" },
  },
  {
    slug: "sv-obsidian-flames", era: "SV", enIds: ["sv3"], nameEn: "Obsidian Flames",
    jp: { name: "黒炎の支配者", releaseDate: "2023-07-28" },
    kr: { name: "흑염의 지배자", releaseDate: "2023-08-25" },
  },
  {
    slug: "sv-raging-surf", era: "SV", enIds: [],
    jp: { name: "レイジングサーフ", releaseDate: "2023-09-22" },
    kr: { name: "레이징서프", releaseDate: "2023-10-20" },
  },
  {
    slug: "sv-paradox-rift", era: "SV", enIds: ["sv4"], nameEn: "Paradox Rift",
    jp: { name: "古代の咆哮+未来の一閃", releaseDate: "2023-10-27" },
    kr: { name: "고대의 포효+미래의 일섬", releaseDate: "2023-11-30" },
  },
  {
    slug: "sv-paldean-fates", era: "SV", enIds: ["sv4pt5"], nameEn: "Paldean Fates",
    jp: { name: "シャイニートレジャーex", releaseDate: "2023-12-01" },
    kr: { name: "샤이니트레저 ex", releaseDate: "2024-01-26" },
  },
  {
    slug: "sv-temporal-forces", era: "SV", enIds: ["sv5"], nameEn: "Temporal Forces",
    jp: { name: "ワイルドフォース+サイバージャッジ", releaseDate: "2024-01-26" },
    kr: { name: "와일드포스+사이버저지", releaseDate: "2024-03-06" },
  },
  {
    slug: "sv-crimson-haze", era: "SV", enIds: [],
    jp: { name: "クリムゾンヘイズ", releaseDate: "2024-03-22" },
    kr: { name: "크림슨헤이즈", releaseDate: "2024-05-24" },
  },
  {
    slug: "sv-twilight-masquerade", era: "SV", enIds: ["sv6"], nameEn: "Twilight Masquerade",
    jp: { name: "変幻の仮面", releaseDate: "2024-04-26" },
    kr: { name: "변환의 가면", releaseDate: "2024-06-21" },
  },
  {
    slug: "sv-shrouded-fable", era: "SV", enIds: ["sv6pt5"], nameEn: "Shrouded Fable",
    jp: { name: "ナイトワンダラー", releaseDate: "2024-06-07" },
    kr: { name: "나이트원더러", releaseDate: "2024-08-09" },
  },
  {
    slug: "sv-stellar-crown", era: "SV", enIds: ["sv7"], nameEn: "Stellar Crown",
    jp: { name: "ステラミラクル", releaseDate: "2024-07-19" },
    kr: { name: "스텔라미라클", releaseDate: "2024-09-06" },
  },
  {
    slug: "sv-paradise-dragona", era: "SV", enIds: [],
    jp: { name: "楽園ドラゴーナ", releaseDate: "2024-09-13" },
    kr: { name: "낙원드래고나", releaseDate: "2024-10-30" },
  },
  {
    slug: "sv-surging-sparks", era: "SV", enIds: ["sv8"], nameEn: "Surging Sparks",
    jp: { name: "超電ブレイカー", releaseDate: "2024-10-18" },
    kr: { name: "초전브레이커", releaseDate: "2024-11-27" },
  },
  {
    slug: "sv-prismatic-evolutions", era: "SV", enIds: ["sv8pt5"], nameEn: "Prismatic Evolutions",
    jp: { name: "テラスタルフェスex", releaseDate: "2024-12-06" },
    kr: { name: "테라스탈 페스타 ex", releaseDate: "2025-01-22" },
  },
  {
    slug: "sv-journey-together", era: "SV", enIds: ["sv9"], nameEn: "Journey Together",
    jp: { name: "バトルパートナーズ", releaseDate: "2025-01-24" },
    kr: { name: "배틀파트너즈", releaseDate: "2025-03-21" },
  },
  {
    slug: "sv-heatwave-arena", era: "SV", enIds: [],
    jp: { name: "熱風のアリーナ", releaseDate: "2025-03-14" },
    kr: { name: "열풍의 아레나", releaseDate: "2025-05-16" },
  },
  {
    slug: "sv-destined-rivals", era: "SV", enIds: ["sv10"], nameEn: "Destined Rivals",
    jp: { name: "ロケット団の栄光", releaseDate: "2025-04-18" },
    kr: { name: "로켓단의 영광", releaseDate: "2025-06-20" },
  },
  {
    slug: "sv-black-bolt-white-flare", era: "SV", enIds: ["zsv10pt5", "rsv10pt5"],
    nameEn: "Black Bolt & White Flare",
    jp: { name: "ブラックボルト+ホワイトフレア", releaseDate: "2025-06-06" },
    kr: { name: "블랙볼트+화이트플레어", releaseDate: "2025-08-01" },
  },
  {
    slug: "mega-brave-symphonia", era: "MEGA", enIds: [],
    jp: { name: "メガブレイブ+メガシンフォニア", releaseDate: "2025-08-01" },
    // KR명 미확보 → KR Set/nameKo 생성 안 함
  },
  {
    slug: "mega-infernox", era: "MEGA", enIds: [],
    jp: { name: "インフェルノX", releaseDate: "2025-09-26" },
  },
  {
    slug: "mega-dream-ex", era: "MEGA", enIds: [],
    jp: { name: "MEGAドリームex", releaseDate: "2025-11-28" },
  },
  {
    slug: "mega-munikisuzero", era: "MEGA", enIds: [],
    jp: { name: "ムニキスゼロ", releaseDate: "2026-02-09" },
  },
  {
    slug: "mega-ninja-spinner", era: "MEGA", enIds: [],
    jp: { name: "ニンジャスピナー", releaseDate: "2026-03-12" },
  },
  {
    slug: "mega-abyss-eye", era: "MEGA", enIds: [],
    jp: { name: "アビスアイ", releaseDate: "2026-05-21" },
  },
];

async function main() {
  let groupCount = 0;
  let enLinked = 0;
  let enMissing = 0;
  let jpCount = 0;
  let krCount = 0;

  for (let i = 0; i < GROUPS.length; i++) {
    const g = GROUPS[i];
    const jpDate = new Date(`${g.jp!.releaseDate}T00:00:00Z`);

    // 1) CardPack upsert
    const groupData = {
      era: g.era,
      nameEn: g.nameEn ?? null,
      nameJa: g.jp?.name ?? null,
      nameKo: g.kr?.name ?? null,
      releaseDate: jpDate,
      order: i,
    };
    await prisma.cardPack.upsert({
      where: { id: g.slug },
      create: { id: g.slug, ...groupData },
      update: groupData,
    });
    groupCount++;

    // 2) EN Set 연결 (있는 것만)
    for (const enId of g.enIds) {
      const existing = await prisma.set.findUnique({ where: { id: enId }, select: { id: true } });
      if (!existing) {
        console.log(`  [skip] EN set "${enId}" (group ${g.slug}) — DB에 없음`);
        enMissing++;
        continue;
      }
      await prisma.set.update({ where: { id: enId }, data: { cardPackId: g.slug } });
      enLinked++;
    }

    // 3) JP Set 생성/갱신
    if (g.jp) {
      const jpId = `jp-${g.slug}`;
      const data = {
        name: g.jp.name,
        nameJa: g.jp.name,
        nameKo: g.kr?.name ?? null,
        series: series(g.era),
        releaseDate: new Date(`${g.jp.releaseDate}T00:00:00Z`),
        cardCount: 0,
        language: "ja",
        region: "JP",
        logoUrl: null,
        symbolUrl: null,
        cardPackId: g.slug,
      };
      await prisma.set.upsert({ where: { id: jpId }, create: { id: jpId, ...data }, update: data });
      jpCount++;
    }

    // 4) KR Set 생성/갱신 (KR명 있을 때만)
    if (g.kr) {
      const krId = `kr-${g.slug}`;
      const data = {
        name: g.kr.name,
        nameKo: g.kr.name,
        nameJa: g.jp?.name ?? null,
        series: series(g.era),
        releaseDate: new Date(`${g.kr.releaseDate}T00:00:00Z`),
        cardCount: 0,
        language: "ko",
        region: "KR",
        logoUrl: null,
        symbolUrl: null,
        cardPackId: g.slug,
      };
      await prisma.set.upsert({ where: { id: krId }, create: { id: krId, ...data }, update: data });
      krCount++;
    }
  }

  console.log("─".repeat(50));
  console.log(`CardPack upsert: ${groupCount}`);
  console.log(`EN Set 연결: ${enLinked} (skip ${enMissing})`);
  console.log(`JP Set: ${jpCount}, KR Set: ${krCount}`);

  // 최종 집계
  const byRegion = await prisma.set.groupBy({ by: ["region"], _count: true });
  const linked = await prisma.set.count({ where: { cardPackId: { not: null } } });
  console.log(`region별 Set:`, JSON.stringify(byRegion));
  console.log(`cardPackId 연결된 Set 총: ${linked}`);

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
