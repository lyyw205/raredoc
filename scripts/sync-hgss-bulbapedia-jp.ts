/**
 * Phase 2: HGSS JP overlay from Bulbapedia
 *
 * For each HGSS EN set (hgss1~hgss4, col1; skip hsp — promo, no JP equivalent):
 * - Fetches Bulbapedia set page
 * - Finds JP section by anchor id
 * - Parses JP card rows (number, name, slug)
 * - Creates JP Set row (jp-tcg-{setId})
 * - Creates JP RegionCard (jp-tcg-{setId}-{num}) linked to existing LogicalCard
 * - Creates ExternalIdMapping (source=bulbapedia)
 *
 * Match by card number (NOT row index).
 * Run: npx tsx scripts/sync-hgss-bulbapedia-jp.ts [--set=hgss1]
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const execFileP = promisify(execFile);

const WIKI_BASE = "https://bulbapedia.bulbagarden.net";
const USER_AGENT = "raredoc-sync/0.1 (https://raredoc.local; non-commercial research)";

// hsp skipped — promo series, no JP equivalent
//
// NOTE on JP section matching for HGSS:
// Bulbapedia EN HGSS pages show JP set lists with JP-native card numbers,
// not EN card numbers. The JP sections are partial (only ~16-29 rows of
// rarer cards are shown, not all cards). We match EN LogicalCards by
// normalized card name (lowercase) since card numbers don't align.
//
// JP section sources:
//   hgss1 → HeartGold_Collection + SoulSilver_Collection (jp-tcg-L1a/L1b)
//   hgss2 → Unleashed section (EN numbers, partial)
//   hgss3 → Reviving_Legends (jp-native numbers 001-027 of jp-tcg-L2)
//   hgss4 → Clash_at_the_Summit (jp-native numbers 001-027 of jp-tcg-L3)
//   col1  → Call_of_Legends (EN numbers 1-29, partial)
const SET_MAP = [
  {
    id: "hgss1",
    page: "HeartGold_%26_SoulSilver_(TCG)",
    jpSectionIds: ["HeartGold_Collection", "SoulSilver_Collection"],
    jpSetNameJa: "ハートゴールドコレクション / ソウルシルバーコレクション",
    jpSetNameEn: "HeartGold Collection / SoulSilver Collection",
    jpRelease: "2009-10-09",
    expectJpCount: 32,
  },
  {
    id: "hgss2",
    page: "Unleashed_(TCG)",
    jpSectionIds: ["Unleashed"],
    jpSetNameJa: "頂上大激突",
    jpSetNameEn: "Clash at the Summit",
    jpRelease: "2010-07-08",
    expectJpCount: 28,
  },
  {
    id: "hgss3",
    page: "Undaunted_(TCG)",
    jpSectionIds: ["Reviving_Legends"],
    jpSetNameJa: "よみがえる伝説",
    jpSetNameEn: "Reviving Legends",
    jpRelease: "2010-02-11",
    expectJpCount: 27,
  },
  {
    id: "hgss4",
    page: "Triumphant_(TCG)",
    jpSectionIds: ["Clash_at_the_Summit"],
    jpSetNameJa: "頂上大激突",
    jpSetNameEn: "Clash at the Summit",
    jpRelease: "2010-07-08",
    expectJpCount: 27,
  },
  {
    id: "col1",
    page: "Call_of_Legends_(TCG)",
    jpSectionIds: ["Call_of_Legends"],
    jpSetNameJa: "強化パック ロストリンク",
    jpSetNameEn: "Lost Link",
    jpRelease: "2010-04-16",
    expectJpCount: 29,
  },
];

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const { stdout } = await execFileP("curl", ["-sSL", "--max-time", "30", "-A", USER_AGENT, url], { maxBuffer: 16 * 1024 * 1024 });
    return stdout || null;
  } catch { return null; }
}

interface JpCardRow {
  number: string;
  jpName: string;
  slug: string;
  suffix: string;
}

function findSectionChunk(html: string, sectionIds: string[]): string | null {
  for (const rawId of sectionIds) {
    const decodedId = decodeURIComponent(rawId);
    for (const pattern of [`id="${decodedId}"`, `id="${rawId}"`]) {
      const startIdx = html.indexOf(pattern);
      if (startIdx === -1) continue;
      const rest = html.slice(startIdx);
      const nextSection = rest.slice(1).search(/<h[23][^>]*id=/i);
      return nextSection > 0 ? rest.slice(0, nextSection + 1) : rest.slice(0, 300000);
    }
  }
  return null;
}

function parseJpCardRows(chunk: string): JpCardRow[] {
  const rows: JpCardRow[] = [];
  const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/g;
  let m: RegExpExecArray | null;
  let seq = 0;

  while ((m = rowRe.exec(chunk)) !== null) {
    const row = m[1];
    if (/<th[^>]*>No\.<\/th>/i.test(row)) continue;

    const linkMatch = row.match(/href="\/wiki\/([^"#]+?_\([^)"]+\))"/);
    if (!linkMatch) continue;
    const fullSlug = linkMatch[1];
    if (fullSlug.startsWith("File:") || fullSlug.startsWith("Rarity")) continue;

    let decodedSlug: string;
    try { decodedSlug = decodeURIComponent(fullSlug); } catch { decodedSlug = fullSlug; }
    if (/Energy_\(TCG\)|^Rarity/.test(decodedSlug)) continue;

    const numericMatch = row.match(/>\s*(\d{1,3})\/\d{1,3}\s*</);
    let number: string;
    if (numericMatch) {
      number = numericMatch[1].padStart(3, "0");
    } else {
      seq++;
      number = String(seq).padStart(3, "0");
    }

    const nameMatch = row.match(/title="[^"]+">([^<]+)<\/a>/);
    const cardName = nameMatch ? nameMatch[1].trim() : decodedSlug.split("_")[0];

    const suffixMatch = decodedSlug.match(/\(([^)]+)\)$/);
    const suffix = suffixMatch ? suffixMatch[1] : decodedSlug;

    rows.push({ number, jpName: cardName, slug: decodedSlug, suffix });
  }

  return rows;
}

async function syncSet(setDef: typeof SET_MAP[number], bulbapediaSourceId: string) {
  const { id: setId } = setDef;
  const enSetId = `en-tcg-${setId}`;
  const jpSetId = `jp-tcg-${setId}`;
  const groupId = `og-${setId}`;

  console.log(`\n─── ${setId}  page=${decodeURIComponent(setDef.page)} ───`);

  const pageUrl = `${WIKI_BASE}/wiki/${setDef.page}`;
  const html = await fetchHtml(pageUrl);
  if (!html) { console.log(`  ✗ Failed to fetch ${pageUrl}`); return { ok: 0, skip: 0, fail: 1, anchorFound: false }; }

  // For hgss1: combine rows from both JP sections
  let allJpRows: JpCardRow[] = [];
  for (const sectionId of setDef.jpSectionIds) {
    const chunk = findSectionChunk(html, [sectionId]);
    if (!chunk) { console.log(`  ⚠ section "${sectionId}" not found`); continue; }
    const rows = parseJpCardRows(chunk);
    console.log(`  section "${sectionId}": ${rows.length} rows`);
    allJpRows = allJpRows.concat(rows);
  }

  if (allJpRows.length === 0) {
    console.log(`  ✗ No JP rows found — page structure may differ`);
    return { ok: 0, skip: 0, fail: 0, anchorFound: false };
  }
  console.log(`  Total JP rows: ${allJpRows.length} (expected ~${setDef.expectJpCount})`);

  // Upsert JP Set
  await prisma.set.upsert({
    where: { id: jpSetId },
    create: {
      id: jpSetId, name: setDef.jpSetNameEn, nameJa: setDef.jpSetNameJa,
      series: "HeartGold & SoulSilver",
      releaseDate: new Date(setDef.jpRelease),
      cardCount: allJpRows.length,
      region: "JP", cardPackId: groupId,
    },
    update: {
      nameJa: setDef.jpSetNameJa,
      cardCount: allJpRows.length,
      cardPackId: groupId,
    },
  });
  console.log(`  ✓ JP Set ${jpSetId}`);

  // Build EN locale lookup maps.
  // JP card numbers on Bulbapedia HGSS pages are JP-native numbers (not EN card numbers),
  // so we match by normalised card name. Number match used as fallback only.
  const enLocales = await prisma.regionCard.findMany({
    where: { setId: enSetId },
    select: { id: true, name: true, logicalCardId: true, number: true },
  });
  function normName(n: string) { return n.toLowerCase().replace(/[^a-z0-9]/g, ""); }
  const byName   = new Map(enLocales.map(l => [normName(l.name), l]));
  const byNumber = new Map(enLocales.map(l => [l.number, l]));

  let ok = 0, skip = 0, fail = 0;
  const seenLC = new Set<string>(); // deduplicate by logicalCardId

  for (const jpRow of allJpRows) {
    // Name-based match first; number fallback for cases where names match EN numbering
    const norm = normName(jpRow.jpName);
    let enLocale = byName.get(norm) ?? byNumber.get(jpRow.number);
    if (!enLocale) {
      console.log(`  [${jpRow.number}] "${jpRow.jpName}" no EN locale match`);
      fail++;
      continue;
    }
    // Deduplicate (hgss1 combines two JP sections; same EN card may appear twice)
    if (seenLC.has(enLocale.logicalCardId)) continue;
    seenLC.add(enLocale.logicalCardId);

    // Use EN card number for the JP RegionCard ID (ensures 1:1 alignment with EN LogicalCard)
    const jpClId = `jp-tcg-${setId}-${enLocale.number}`;

    try {
      await prisma.regionCard.upsert({
        where: { id: jpClId },
        create: {
          id: jpClId,
          logicalCardId: enLocale.logicalCardId,
          language: "ja",
          region: "JP",
          setId: jpSetId,
          number: enLocale.number,
          numberInt: parseInt(enLocale.number, 10) || null,
          name: jpRow.jpName,
        },
        update: {
          logicalCardId: enLocale.logicalCardId,
          name: jpRow.jpName,
        },
      });

      // ExternalIdMapping
      const externalId = jpRow.slug;
      const cardUrl = `${WIKI_BASE}/wiki/${jpRow.slug}`;
      await prisma.externalIdMapping.upsert({
        where: { sourceId_externalId: { sourceId: bulbapediaSourceId, externalId } },
        create: {
          sourceId: bulbapediaSourceId, externalId,
          regionCardId: jpClId, logicalCardId: enLocale.logicalCardId,
          url: cardUrl,
          verifiedBy: "auto:sync-hgss-bulbapedia-jp", confidence: 0.7,
          notes: `Bulbapedia set list row. Set ${jpSetId}, number ${jpRow.number}.`,
        },
        update: { regionCardId: jpClId, logicalCardId: enLocale.logicalCardId },
      });

      ok++;
    } catch (e) {
      console.log(`  ✗ [${jpRow.number}] ${jpRow.jpName}: ${e}`);
      fail++;
    }
  }

  console.log(`  ${setId}: ok=${ok} skip=${skip} fail=${fail}`);
  return { ok, skip, fail, anchorFound: true };
}

async function main() {
  const arg = process.argv.find(a => a.startsWith("--set="));
  const setsToRun = arg ? SET_MAP.filter(s => s.id === arg.slice("--set=".length).toLowerCase()) : SET_MAP;

  const source = await prisma.externalSource.upsert({
    where: { code: "bulbapedia" },
    create: { code: "bulbapedia", name: "Bulbapedia", kind: "wiki", region: "GLOBAL", baseUrl: "https://bulbapedia.bulbagarden.net", priority: 70 },
    update: {},
  });

  console.log(`=== HGSS JP Overlay (${setsToRun.length} sets) ===`);
  let totals = { ok: 0, skip: 0, fail: 0 };

  for (const setDef of setsToRun) {
    const r = await syncSet(setDef, source.id);
    totals.ok += r.ok; totals.skip += r.skip; totals.fail += r.fail;
  }

  console.log(`\n══════ 전체 결과 ══════`);
  console.log(`  성공: ${totals.ok}`);
  console.log(`  스킵: ${totals.skip}`);
  console.log(`  실패: ${totals.fail}`);

  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
