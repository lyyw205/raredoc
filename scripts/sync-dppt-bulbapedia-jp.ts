/**
 * Phase 2: DP + Platinum JP overlay from Bulbapedia
 *
 * For each EN set (dp1~dp7, pl1~pl4):
 * - Fetches Bulbapedia set page
 * - Finds JP section by anchor id
 * - Parses JP card rows (number, name, slug)
 * - Creates JP Set row (jp-tcg-{setId})
 * - Creates JP RegionCard (jp-tcg-{setId}-{num}) linked to existing LogicalCard
 * - Fetches each card's Bulbapedia page to extract image URL + illustrator
 * - Creates ExternalIdMapping (source=bulbapedia)
 *
 * Rate: 700ms between card page fetches.
 * Match by card number (NOT row index).
 * Run: npx tsx scripts/sync-dppt-bulbapedia-jp.ts [--set=dp1]
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const execFileP = promisify(execFile);

const WIKI_BASE = "https://bulbapedia.bulbagarden.net";
const ARCH_BASE = "https://archives.bulbagarden.net";
const USER_AGENT = "raredoc-sync/0.1 (https://raredoc.local; non-commercial research)";

// JP section anchors on each Bulbapedia set page.
// These are the decoded h2/h3 id= attribute values for the JP set section.
// Format: { setId, page, jpSectionId, jpSetNameJa, jpSetNameEn, expectJpCount }
const SET_MAP = [
  {
    id: "dp1",
    page: "Diamond_%26_Pearl_(TCG)",
    // EN DP1 = JP Diamond Collection + Pearl Collection (two separate packs)
    // Use Diamond_Collection as primary JP section (larger set)
    jpSectionIds: ["Diamond_Collection"],
    jpSetNameJa: "ダイヤモンドコレクション",
    jpSetNameEn: "Diamond Collection",
    expectJpCount: 56,
  },
  {
    id: "dp2",
    page: "Mysterious_Treasures_(TCG)",
    jpSectionIds: ["Secret_of_the_Lakes"],
    jpSetNameJa: "湖の秘密",
    jpSetNameEn: "Secret of the Lakes",
    expectJpCount: 102,
  },
  {
    id: "dp3",
    page: "Secret_Wonders_(TCG)",
    jpSectionIds: ["Shining_Darkness"],
    jpSetNameJa: "輝く闇",
    jpSetNameEn: "Shining Darkness",
    expectJpCount: 100,
  },
  {
    id: "dp4",
    // Great Encounters page has no separate JP section — sourced from Moonlit_Pursuit_(TCG) page
    page: "Moonlit_Pursuit_(TCG)",
    jpSectionIds: ["Moonlit_Pursuit"],
    jpSetNameJa: "月光の追跡",
    jpSetNameEn: "Moonlit Pursuit",
    expectJpCount: 80,
  },
  {
    id: "dp5",
    // Majestic Dawn page has no separate JP section — Dawn Dash section on same page
    page: "Moonlit_Pursuit_(TCG)",
    jpSectionIds: ["Dawn_Dash"],
    jpSetNameJa: "夜明けの疾走",
    jpSetNameEn: "Dawn Dash",
    expectJpCount: 100,
  },
  {
    id: "dp6",
    page: "Legends_Awakened_(TCG)",
    jpSectionIds: ["Cry_from_the_Mysterious"],
    jpSetNameJa: "怪しい嵐",
    jpSetNameEn: "Cry from the Mysterious",
    expectJpCount: 80,
  },
  {
    id: "dp7",
    page: "Stormfront_(TCG)",
    jpSectionIds: ["Intense_Fight_in_the_Destroyed_Sky"],
    jpSetNameJa: "破空の覇者",
    jpSetNameEn: "Intense Fight in the Destroyed Sky",
    expectJpCount: 70,
  },
  {
    id: "pl1",
    page: "Platinum_(TCG)",
    jpSectionIds: ["Galactic's_Conquest"],
    jpSetNameJa: "ギャラクシーの征服者",
    jpSetNameEn: "Galactic's Conquest",
    expectJpCount: 106,
  },
  {
    id: "pl2",
    page: "Rising_Rivals_(TCG)",
    jpSectionIds: ["Bonds_to_the_End_of_Time"],
    jpSetNameJa: "時の果ての絆",
    jpSetNameEn: "Bonds to the End of Time",
    expectJpCount: 100,
  },
  {
    id: "pl3",
    page: "Supreme_Victors_(TCG)",
    jpSectionIds: ["Beat_of_the_Frontier"],
    jpSetNameJa: "フロンティアの鼓動",
    jpSetNameEn: "Beat of the Frontier",
    expectJpCount: 100,
  },
  {
    id: "pl4",
    page: "Advent_of_Arceus_(TCG)",
    jpSectionIds: ["Advent_of_Arceus"],
    jpSetNameJa: "アルセウス光臨",
    jpSetNameEn: "Advent of Arceus",
    expectJpCount: 99,
  },
];

const UI_BLOCKLIST = [
  /Project_/i, /Portal_/i, /_logo\.|_icon\.|_symbol\./i,
  /^Grass-attack/i, /^Fire-attack/i, /^Water-attack/i, /^Lightning-attack/i,
  /^Psychic-attack/i, /^Fighting-attack/i, /^Colorless-attack/i, /^Darkness-attack/i,
  /^Metal-attack/i, /^Fairy-attack/i, /^Dragon-attack/i,
  /^Rarity_/i, /^Bulbapedia/i, /Best_?Photo/i, /Contest/i, /Ad\.jpg$/i,
];

function isUiAsset(filename: string): boolean {
  return UI_BLOCKLIST.some((re) => re.test(filename));
}

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const { stdout } = await execFileP(
      "curl",
      ["-sSL", "--max-time", "30", "-A", USER_AGENT, url],
      { maxBuffer: 16 * 1024 * 1024 }
    );
    return stdout || null;
  } catch {
    return null;
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// ---------------------------------------------------------------------------
// Image extraction from Bulbapedia card page
// ---------------------------------------------------------------------------

function extractCardImage(html: string): string | null {
  const re =
    /archives\.bulbagarden\.net\/media\/upload\/(?:thumb\/)?([a-f0-9])\/([a-f0-9]{2})\/([A-Z][^"/<>\s]+?\.(?:jpg|png|webp))/g;
  const seen = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const [, x, xx, filename] = m;
    if (seen.has(filename)) continue;
    seen.add(filename);
    if (isUiAsset(filename)) continue;
    return `${ARCH_BASE}/media/upload/${x}/${xx}/${filename}`;
  }
  return null;
}

// Extract illustrator from wgCategories "Illus. by {name}"
function extractIllustrator(html: string): string | null {
  const m = html.match(/"Illus\. by ([^"]+)"/);
  if (m) return m[1].trim();
  // Also check categories list format
  const m2 = html.match(/Illus\. by ([A-Z][^<"]+?)(?:<|")/);
  if (m2) return m2[1].trim();
  return null;
}

// ---------------------------------------------------------------------------
// JP card row parsing from Bulbapedia set page
// ---------------------------------------------------------------------------

interface JpCardRow {
  number: string;     // e.g. "001"
  jpName: string;     // Japanese card name
  slug: string;       // wiki slug, e.g. "Turtwig_(Galactic's_Conquest_16)"
  suffix: string;     // e.g. "Galactic's_Conquest_16"
}

/**
 * Probe multiple possible section anchors; return chunk from first found.
 * Returns null if none found.
 */
function findSectionChunk(html: string, sectionIds: string[]): string | null {
  for (const rawId of sectionIds) {
    const decodedId = decodeURIComponent(rawId);
    // Try exact id match
    const patterns = [
      `id="${decodedId}"`,
      `id="${rawId}"`,
    ];
    for (const pattern of patterns) {
      const startIdx = html.indexOf(pattern);
      if (startIdx === -1) continue;
      const rest = html.slice(startIdx);
      // Find next H2 section boundary
      const nextSection = rest.slice(1).search(/<h[23][^>]*id=/i);
      const chunk = nextSection > 0 ? rest.slice(0, nextSection + 1) : rest.slice(0, 300000);
      return chunk;
    }
  }
  return null;
}

/**
 * Parse JP card rows from a section chunk.
 * DP/Pt era Bulbapedia pages show card number as "—" (no numeric number) and English names only.
 * We assign sequential 1-based JP numbers from row position (matching Bulbapedia order = JP number order).
 * JP names and images are extracted from individual card pages.
 */
function parseJpCardRows(chunk: string): JpCardRow[] {
  const rows: JpCardRow[] = [];
  const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/g;
  let m: RegExpExecArray | null;
  let seq = 0;

  while ((m = rowRe.exec(chunk)) !== null) {
    const row = m[1];

    // Skip header rows
    if (/<th[^>]*>No\.<\/th>/i.test(row)) continue;

    // Extract wiki link slug — must match card links (slug with parenthesized suffix)
    const linkMatch = row.match(/href="\/wiki\/([^"#]+?_\([^)"]+\))"/);
    if (!linkMatch) continue;
    const fullSlug = linkMatch[1];

    // Skip File: links
    if (fullSlug.startsWith("File:") || fullSlug.startsWith("Rarity")) continue;

    let decodedSlug: string;
    try {
      decodedSlug = decodeURIComponent(fullSlug);
    } catch {
      decodedSlug = fullSlug;
    }

    // Skip energy/rarity links
    if (/Energy_\(TCG\)|^Rarity/.test(decodedSlug)) continue;

    // Try to extract numeric card number from row (NNN/NNN format)
    const numericMatch = row.match(/>\s*(\d{1,3})\/\d{1,3}\s*</);
    let number: string;
    if (numericMatch) {
      number = numericMatch[1].padStart(3, "0");
    } else {
      // No number shown (—): use sequential position
      seq++;
      number = String(seq).padStart(3, "0");
    }

    // Extract English card name from link text (used as fallback for jpName)
    const nameMatch = row.match(/title="[^"]+">([^<]+)<\/a>/);
    const cardName = nameMatch ? nameMatch[1].trim() : decodedSlug.split("_")[0];

    const suffixMatch = decodedSlug.match(/\(([^)]+)\)$/);
    const suffix = suffixMatch ? suffixMatch[1] : decodedSlug;

    rows.push({ number, jpName: cardName, slug: decodedSlug, suffix });
  }

  return rows;
}

// ---------------------------------------------------------------------------
// Main per-set sync
// ---------------------------------------------------------------------------

async function syncSet(
  setDef: typeof SET_MAP[number],
  bulbapediaSourceId: string,
) {
  const { id: setId } = setDef;
  const enSetId = `en-tcg-${setId}`;
  const jpSetId = `jp-tcg-${setId}`;
  const groupId = `og-${setId}`;

  console.log(`\n─── ${setId}  page=${decodeURIComponent(setDef.page)} ───`);

  // Fetch set page
  const pageUrl = `${WIKI_BASE}/wiki/${setDef.page}`;
  const html = await fetchHtml(pageUrl);
  if (!html) {
    console.log(`  ✗ Failed to fetch ${pageUrl}`);
    return { ok: 0, skip: 0, fail: 1, anchorFound: false };
  }

  // Find JP section
  const chunk = findSectionChunk(html, setDef.jpSectionIds);
  if (!chunk) {
    console.log(`  ✗ JP section anchor not found (tried: ${setDef.jpSectionIds.join(", ")})`);
    console.log(`  Skipping JP overlay for ${setId}`);
    return { ok: 0, skip: 0, fail: 0, anchorFound: false };
  }

  // Parse JP rows
  const jpRows = parseJpCardRows(chunk);
  console.log(`  JP rows parsed: ${jpRows.length} (expected ~${setDef.expectJpCount})`);

  if (jpRows.length === 0) {
    console.log(`  ✗ No JP rows found in section — page structure may differ`);
    return { ok: 0, skip: 0, fail: 0, anchorFound: true };
  }

  // Upsert JP Set (reuses same CardPack as EN)
  await prisma.set.upsert({
    where: { id: jpSetId },
    create: {
      id: jpSetId,
      name: setDef.jpSetNameEn,
      nameJa: setDef.jpSetNameJa,
      series: setId.startsWith("dp") ? "Diamond & Pearl" : "Platinum",
      releaseDate: new Date("2007-01-01"), // approximate — will be refined
      cardCount: jpRows.length,
      region: "JP",
      cardPackId: groupId,
    },
    update: {
      nameJa: setDef.jpSetNameJa,
      cardCount: jpRows.length,
      cardPackId: groupId,
    },
  });
  console.log(`  ✓ JP Set ${jpSetId}`);

  // Build EN name→logicalCardId map for this set (for name-based matching)
  const enLocales = await prisma.regionCard.findMany({
    where: { setId: enSetId },
    select: { id: true, name: true, logicalCardId: true, number: true },
  });
  // Normalize names for fuzzy match (lowercase, remove punctuation)
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const enNameMap = new Map<string, { localeId: string; logicalCardId: string; number: string }>();
  for (const cl of enLocales) {
    enNameMap.set(normalize(cl.name), { localeId: cl.id, logicalCardId: cl.logicalCardId, number: cl.number });
  }

  let ok = 0, skip = 0, fail = 0;

  for (const row of jpRows) {
    const jpLocaleId = `jp-tcg-${setId}-${row.number}`;

    // Match by name (JP section shows EN card names)
    const normalizedName = normalize(row.jpName);
    const enMatch = enNameMap.get(normalizedName);

    let logicalCardId: string;

    if (enMatch) {
      logicalCardId = enMatch.logicalCardId;
    } else {
      // Try number-based fallback for sets where JP numbers align with EN
      const enLocaleId = `en-tcg-${setId}-${row.number}`;
      const enLocale = await prisma.regionCard.findUnique({
        where: { id: enLocaleId },
        select: { logicalCardId: true },
      });
      if (!enLocale) {
        console.log(`  [${row.number}] ${row.jpName} — no EN match found (name or number) — skip`);
        fail++;
        continue;
      }
      logicalCardId = enLocale.logicalCardId;
    }

    // Check if JP RegionCard already has an image
    const existingJpLocale = await prisma.regionCard.findUnique({
      where: { id: jpLocaleId },
      select: { imageSmall: true },
    });

    let imageUrl: string | null = null;
    let illustrator: string | null = null;

    if (!existingJpLocale?.imageSmall) {
      // Fetch Bulbapedia card page
      const cardPageUrl = `${WIKI_BASE}/wiki/${encodeURIComponent(row.slug)}`;
      const cardHtml = await fetchHtml(cardPageUrl);
      await sleep(700);

      if (cardHtml) {
        imageUrl = extractCardImage(cardHtml);
        illustrator = extractIllustrator(cardHtml);
      }
    } else {
      skip++;
    }

    try {
      // Upsert JP RegionCard
      await prisma.regionCard.upsert({
        where: { id: jpLocaleId },
        create: {
          id: jpLocaleId,
          logicalCardId,
          language: "ja",
          region: "JP",
          setId: jpSetId,
          number: row.number,
          numberInt: parseInt(row.number, 10) || null,
          name: row.jpName || row.slug.split("_")[0],
          imageSmall: imageUrl,
          imageLarge: imageUrl,
        },
        update: {
          logicalCardId,
          name: row.jpName || row.slug.split("_")[0],
          ...(imageUrl ? { imageSmall: imageUrl, imageLarge: imageUrl } : {}),
        },
      });

      // Update LogicalCard illustrator if NULL
      if (illustrator) {
        await prisma.logicalCard.updateMany({
          where: { id: logicalCardId, illustrator: null },
          data: { illustrator },
        });
      }

      // Upsert ExternalIdMapping
      await prisma.externalIdMapping.upsert({
        where: { sourceId_externalId: { sourceId: bulbapediaSourceId, externalId: row.slug } },
        create: {
          sourceId: bulbapediaSourceId,
          externalId: row.slug,
          regionCardId: jpLocaleId,
          logicalCardId,
          url: `${WIKI_BASE}/wiki/${encodeURIComponent(row.slug)}`,
          verifiedBy: "auto:sync-dppt-bulbapedia-jp",
          confidence: 0.75,
          notes: `JP overlay for ${setId} #${row.number}`,
        },
        update: {
          regionCardId: jpLocaleId,
          logicalCardId,
        },
      });

      if (!existingJpLocale) {
        console.log(`  [${row.number}] ${row.jpName.padEnd(18)} → ✓${imageUrl ? " img" : " no-img"}`);
        ok++;
      }
    } catch (e) {
      console.log(`  [${row.number}] ${row.jpName} → ✗ ${e}`);
      fail++;
    }
  }

  console.log(`  ${setId} JP: ok=${ok} skip=${skip} fail=${fail}`);
  return { ok, skip, fail, anchorFound: true };
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

async function main() {
  const arg = process.argv.find((a) => a.startsWith("--set="));
  const setsToRun = arg
    ? SET_MAP.filter((s) => s.id === arg.slice("--set=".length).toLowerCase())
    : SET_MAP;

  const source = await prisma.externalSource.findUniqueOrThrow({ where: { code: "bulbapedia" } });

  console.log(`=== DP/Pt JP Overlay via Bulbapedia (${setsToRun.length} sets) ===`);

  let totals = { ok: 0, skip: 0, fail: 0 };
  const anchorLog: { setId: string; found: boolean }[] = [];

  for (const setDef of setsToRun) {
    const r = await syncSet(setDef, source.id);
    totals.ok += r.ok;
    totals.skip += r.skip;
    totals.fail += r.fail;
    anchorLog.push({ setId: setDef.id, found: r.anchorFound });
  }

  console.log(`\n══════ 전체 결과 ══════`);
  console.log(`  성공: ${totals.ok}`);
  console.log(`  스킵(이미 있음): ${totals.skip}`);
  console.log(`  실패: ${totals.fail}`);
  console.log(`\n  섹션 앵커 탐색:`);
  for (const a of anchorLog) {
    console.log(`    ${a.setId}: ${a.found ? "✓ 발견" : "✗ 미발견"}`);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
