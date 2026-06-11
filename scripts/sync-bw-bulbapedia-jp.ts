/**
 * Phase 2: BW JP overlay from Bulbapedia
 *
 * For each BW EN set (bw1~bw11, dv1; skip bwp — promo, no JP equivalent):
 * - Fetches Bulbapedia set page
 * - Finds JP section by anchor id
 * - Parses JP card rows (number, name, slug)
 * - Creates JP Set row (jp-tcg-{setId})
 * - Creates JP RegionCard (jp-tcg-{setId}-{num}) linked to existing Card
 * - Creates ExternalIdMapping (source=bulbapedia)
 *
 * Match by card number first, then name fallback.
 * Run: npx tsx scripts/sync-bw-bulbapedia-jp.ts [--set=bw1]
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const execFileP = promisify(execFile);

const WIKI_BASE = "https://bulbapedia.bulbagarden.net";
const USER_AGENT = "raredoc-sync/0.1 (https://raredoc.local; non-commercial research)";

// bwp skipped — promo series, no JP equivalent
//
// BW Bulbapedia pages show JP set lists with EN card numbers for most sets.
// JP sections are partial (only cards released in JP sets are shown).
// Match by EN card number where available, fallback to normalised name.
//
// JP set names sourced from bulbapedia/TCGdex:
//   bw1  → Black Collection + White Collection
//   bw2  → Emerging Powers (subset of Red Collection + Psycho Drive + Hail Blizzard)
//   bw3  → Noble Victories (subset of Red Collection + Psycho Drive + Hail Blizzard)
//   bw4  → Next Destinies (subset of Psycho Drive + Hail Blizzard + Dark Rush)
//   bw5  → Dark Explorers (Dark Rush + Thunder Knuckle + Freeze Bolt)
//   bw6  → Dragons Exalted (Dragon Blade + Dragon Blast + Dragon Selection)
//   dv1  → Dragon Selection
//   bw7  → Boundaries Crossed (Cold Flare + Freeze Bolt + Plasma Gale)
//   bw8  → Plasma Storm (Plasma Gale + Team Plasma Battle Gift Set)
//   bw9  → Plasma Freeze (Spiral Force + Thunder Knuckle)
//   bw10 → Plasma Blast (Megalo Cannon)
//   bw11 → Legendary Treasures (Reshiram EX Battle Strength Deck + Zekrom EX Battle Strength Deck + various)
const SET_MAP = [
  {
    id: "bw1",
    page: "Black_%26_White_(TCG)",
    jpSectionIds: ["Black_Collection", "White_Collection"],
    jpSetNameJa: "ブラックコレクション / ホワイトコレクション",
    jpSetNameEn: "Black Collection / White Collection",
    jpRelease: "2010-12-17",
    expectJpCount: 60,
  },
  {
    id: "bw2",
    page: "Emerging_Powers_(TCG)",
    jpSectionIds: ["Emerging_Powers"],
    jpSetNameJa: "レッドコレクション他",
    jpSetNameEn: "Emerging Powers (JP subset)",
    jpRelease: "2011-07-08",
    expectJpCount: 30,
  },
  {
    id: "bw3",
    page: "Noble_Victories_(TCG)",
    jpSectionIds: ["Noble_Victories"],
    jpSetNameJa: "サイコドライブ / ヘイルブリザード",
    jpSetNameEn: "Psycho Drive / Hail Blizzard",
    jpRelease: "2011-09-16",
    expectJpCount: 30,
  },
  {
    id: "bw4",
    page: "Next_Destinies_(TCG)",
    jpSectionIds: ["Next_Destinies"],
    jpSetNameJa: "ダークラッシュ他",
    jpSetNameEn: "Next Destinies (JP subset)",
    jpRelease: "2012-02-16",
    expectJpCount: 30,
  },
  {
    id: "bw5",
    page: "Dark_Explorers_(TCG)",
    jpSectionIds: ["Dark_Explorers"],
    jpSetNameJa: "ダークラッシュ / サンダーナックル / フリーズボルト",
    jpSetNameEn: "Dark Rush / Thunder Knuckle / Freeze Bolt",
    jpRelease: "2012-06-08",
    expectJpCount: 35,
  },
  {
    id: "bw6",
    page: "Dragons_Exalted_(TCG)",
    jpSectionIds: ["Dragons_Exalted"],
    jpSetNameJa: "ドラゴンブレード / ドラゴンバースト",
    jpSetNameEn: "Dragon Blade / Dragon Blast",
    jpRelease: "2012-07-13",
    expectJpCount: 40,
  },
  {
    id: "dv1",
    page: "Dragon_Vault_(TCG)",
    jpSectionIds: ["Dragon_Selection"],
    jpSetNameJa: "ドラゴンセレクション",
    jpSetNameEn: "Dragon Selection",
    jpRelease: "2012-08-31",
    expectJpCount: 20,
  },
  {
    id: "bw7",
    page: "Boundaries_Crossed_(TCG)",
    jpSectionIds: ["Boundaries_Crossed"],
    jpSetNameJa: "コールドフレア / フリーズボルト",
    jpSetNameEn: "Cold Flare / Freeze Bolt",
    jpRelease: "2012-10-20",
    expectJpCount: 40,
  },
  {
    id: "bw8",
    page: "Plasma_Storm_(TCG)",
    jpSectionIds: ["Plasma_Storm"],
    jpSetNameJa: "プラズマゲイル",
    jpSetNameEn: "Plasma Gale",
    jpRelease: "2013-01-25",
    expectJpCount: 35,
  },
  {
    id: "bw9",
    page: "Plasma_Freeze_(TCG)",
    jpSectionIds: ["Plasma_Freeze"],
    jpSetNameJa: "スパイラルフォース / サンダーナックル",
    jpSetNameEn: "Spiral Force / Thunder Knuckle",
    jpRelease: "2013-03-15",
    expectJpCount: 35,
  },
  {
    id: "bw10",
    page: "Plasma_Blast_(TCG)",
    jpSectionIds: ["Plasma_Blast"],
    jpSetNameJa: "メガロキャノン",
    jpSetNameEn: "Megalo Cannon",
    jpRelease: "2013-07-13",
    expectJpCount: 30,
  },
  {
    id: "bw11",
    page: "Legendary_Treasures_(TCG)",
    jpSectionIds: ["Legendary_Treasures"],
    jpSetNameJa: "レジェンドトレジャー",
    jpSetNameEn: "Legendary Treasures (JP subset)",
    jpRelease: "2013-10-05",
    expectJpCount: 30,
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

  // Fetch the EN set to get logo/symbol URLs
  const enSet = await prisma.set.findUnique({ where: { id: enSetId }, select: { logoUrl: true, symbolUrl: true } });

  const pageUrl = `${WIKI_BASE}/wiki/${setDef.page}`;
  const html = await fetchHtml(pageUrl);
  if (!html) { console.log(`  ✗ Failed to fetch ${pageUrl}`); return { ok: 0, skip: 0, fail: 1, anchorFound: false }; }

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
      series: "Black & White",
      releaseDate: new Date(setDef.jpRelease),
      cardCount: allJpRows.length,
      logoUrl: enSet?.logoUrl ?? null,
      symbolUrl: enSet?.symbolUrl ?? null,
      region: "JP", cardPackId: groupId,
    },
    update: {
      nameJa: setDef.jpSetNameJa,
      cardCount: allJpRows.length,
      logoUrl: enSet?.logoUrl ?? null,
      symbolUrl: enSet?.symbolUrl ?? null,
      cardPackId: groupId,
    },
  });
  console.log(`  ✓ JP Set ${jpSetId}`);

  // Build EN locale lookup maps
  const enLocales = await prisma.regionCard.findMany({
    where: { setId: enSetId },
    select: { id: true, name: true, cardId: true, number: true },
  });
  function normName(n: string) { return n.toLowerCase().replace(/[^a-z0-9]/g, ""); }
  const byNumber = new Map(enLocales.map(l => [l.number, l]));
  const byName   = new Map(enLocales.map(l => [normName(l.name), l]));

  let ok = 0, skip = 0, fail = 0;
  const seenLC = new Set<string>();

  for (const jpRow of allJpRows) {
    // Number-based match first (BW Bulbapedia pages use EN card numbers in JP section)
    const norm = normName(jpRow.jpName);
    let enLocale = byNumber.get(jpRow.number) ?? byName.get(norm);
    if (!enLocale) {
      console.log(`  [${jpRow.number}] "${jpRow.jpName}" no EN locale match`);
      fail++;
      continue;
    }
    if (seenLC.has(enLocale.cardId)) { skip++; continue; }
    seenLC.add(enLocale.cardId);

    const jpClId = `jp-tcg-${setId}-${enLocale.number}`;

    try {
      await prisma.regionCard.upsert({
        where: { id: jpClId },
        create: {
          id: jpClId,
          cardId: enLocale.cardId,
          language: "ja",
          region: "JP",
          setId: jpSetId,
          number: enLocale.number,
          numberInt: parseInt(enLocale.number, 10) || null,
          name: jpRow.jpName,
          imageSmall: `${WIKI_BASE}/wiki/${jpRow.slug}`,
        },
        update: {
          cardId: enLocale.cardId,
          name: jpRow.jpName,
          imageSmall: `${WIKI_BASE}/wiki/${jpRow.slug}`,
        },
      });

      const externalId = jpRow.slug;
      const cardUrl = `${WIKI_BASE}/wiki/${jpRow.slug}`;
      await prisma.externalIdMapping.upsert({
        where: { sourceId_externalId: { sourceId: bulbapediaSourceId, externalId } },
        create: {
          sourceId: bulbapediaSourceId, externalId,
          regionCardId: jpClId, cardId: enLocale.cardId,
          url: cardUrl,
          verifiedBy: "auto:sync-bw-bulbapedia-jp", confidence: 0.7,
          notes: `Bulbapedia set list row. Set ${jpSetId}, number ${jpRow.number}.`,
        },
        update: { regionCardId: jpClId, cardId: enLocale.cardId },
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

  console.log(`=== BW JP Overlay (${setsToRun.length} sets) ===`);
  let totals = { ok: 0, skip: 0, fail: 0 };

  for (const setDef of setsToRun) {
    const r = await syncSet(setDef, source.id);
    totals.ok += r.ok; totals.skip += r.skip; totals.fail += r.fail;
    await sleep(500);
  }

  console.log(`\n══════ 전체 결과 ══════`);
  console.log(`  성공: ${totals.ok}`);
  console.log(`  스킵: ${totals.skip}`);
  console.log(`  실패: ${totals.fail}`);

  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
