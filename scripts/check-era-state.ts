import "dotenv/config";
import { prisma as db } from "../src/lib/prisma";

async function main() {
  const stats = await db.$queryRaw<any[]>`
    SELECT
      sg.era,
      COUNT(DISTINCT sg.id)::int as set_groups,
      COUNT(DISTINCT lc.id)::int as logical_cards,
      COUNT(DISTINCT cl.id)::int as card_locales,
      COUNT(DISTINCT CASE WHEN cl.language='en' THEN cl.id END)::int as en_locales,
      COUNT(DISTINCT CASE WHEN cl.language='ja' THEN cl.id END)::int as ja_locales,
      COUNT(DISTINCT CASE WHEN cl.language='ko' THEN cl.id END)::int as ko_locales,
      COUNT(DISTINCT CASE WHEN lc."nameKo" IS NOT NULL THEN lc.id END)::int as nameko_filled
    FROM "SetGroup" sg
    LEFT JOIN "LogicalCard" lc ON lc."setGroupId" = sg.id
    LEFT JOIN "CardLocale" cl ON cl."logicalCardId" = lc.id
    WHERE sg.era IN ('S (썬·문)', 'S (소드·실드)', 'SV', 'MEGA')
    GROUP BY sg.era
    ORDER BY sg.era
  `;

  console.log("=== ERA STATS ===");
  for (const r of stats) {
    console.log(`${r.era}: ${r.set_groups} SG, ${r.logical_cards} LC, EN:${r.en_locales} JA:${r.ja_locales} KO:${r.ko_locales}, nameKo:${r.nameko_filled}`);
  }

  for (const era of ['S (소드·실드)', 'SV', 'MEGA']) {
    const groups = await db.$queryRaw<any[]>`
      SELECT id, "nameKo", "nameJa"
      FROM "SetGroup"
      WHERE era = ${era}
      ORDER BY id
    `;
    console.log(`\n=== ${era} SetGroups (${groups.length}) ===`);
    for (const sg of groups) {
      console.log(`  ${sg.id} | ${sg.nameJa ?? '—'} | ${sg.nameKo ?? '—'}`);
    }
  }
}

main().then(() => db.$disconnect()).catch(e => { console.error(e); process.exit(1); });
