/**
 * SwSh era JP overlay from Bulbapedia: JP LogicalCard illustrator 보강.
 *
 * 매칭: EN set 번호 → EN CardLocale → LogicalCard → illustrator 업데이트
 * SwSh EN 합본이 많으므로 EN set 번호 기준으로 매핑.
 *
 * Run: npx tsx scripts/sync-swsh-bulbapedia-jp.ts [--set=swsh1]
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const execFileP = promisify(execFile);

const WIKI_BASE = "https://bulbapedia.bulbagarden.net";
const USER_AGENT = "raredoc-meta-enricher/0.1 (https://raredoc.local; non-commercial card metadata)";

interface SetDef {
  setId: string;       // EN pokemontcg.io set ID
  page: string;        // Bulbapedia page title
  sectionId: string;   // mw-headline id
  suffix: string;      // card link suffix
  expectCount: number; // expected printed card count
  jpSetIds: string[];  // JP DB set IDs to also try matching
}

const SETS: SetDef[] = [
  { setId: "swsh1",     page: "Sword_%26_Shield_(TCG)",        sectionId: "Set_lists", suffix: "Sword_%26_Shield",        expectCount: 202, jpSetIds: ["jp-tcg-S1W", "jp-tcg-S1H"] },
  { setId: "swsh2",     page: "Rebel_Clash_(TCG)",             sectionId: "Set_lists", suffix: "Rebel_Clash",             expectCount: 192, jpSetIds: ["jp-tcg-S2"]   },
  { setId: "swsh3",     page: "Darkness_Ablaze_(TCG)",         sectionId: "Set_lists", suffix: "Darkness_Ablaze",         expectCount: 189, jpSetIds: ["jp-tcg-S2a", "jp-tcg-S3"] },
  { setId: "swsh35",    page: "Champion%27s_Path_(TCG)",        sectionId: "Set_lists", suffix: "Champion%27s_Path",        expectCount: 73,  jpSetIds: [] },
  { setId: "swsh4",     page: "Vivid_Voltage_(TCG)",           sectionId: "Set_lists", suffix: "Vivid_Voltage",           expectCount: 185, jpSetIds: ["jp-tcg-S4", "jp-tcg-S3a"] },
  { setId: "swsh45",    page: "Shining_Fates_(TCG)",           sectionId: "Set_lists", suffix: "Shining_Fates",           expectCount: 73,  jpSetIds: ["jp-tcg-S4a"]  },
  { setId: "swsh5",     page: "Battle_Styles_(TCG)",           sectionId: "Set_lists", suffix: "Battle_Styles",           expectCount: 163, jpSetIds: ["jp-tcg-S5I", "jp-tcg-S5R"] },
  { setId: "swsh6",     page: "Chilling_Reign_(TCG)",          sectionId: "Set_lists", suffix: "Chilling_Reign",          expectCount: 198, jpSetIds: ["jp-tcg-S6H", "jp-tcg-S6K"] },
  { setId: "swsh7",     page: "Evolving_Skies_(TCG)",          sectionId: "Set_lists", suffix: "Evolving_Skies",          expectCount: 203, jpSetIds: ["jp-tcg-S7R", "jp-tcg-S7D", "jp-tcg-S6a", "jp-tcg-S5a"] },
  { setId: "cel25",     page: "Celebrations_(TCG)",            sectionId: "Set_lists", suffix: "Celebrations",            expectCount: 25,  jpSetIds: ["jp-tcg-S8a"]  },
  { setId: "swsh8",     page: "Fusion_Strike_(TCG)",           sectionId: "Set_lists", suffix: "Fusion_Strike",           expectCount: 264, jpSetIds: ["jp-tcg-S8"]   },
  { setId: "swsh9",     page: "Brilliant_Stars_(TCG)",         sectionId: "Set_lists", suffix: "Brilliant_Stars",         expectCount: 172, jpSetIds: ["jp-tcg-S9"]   },
  { setId: "swsh10",    page: "Astral_Radiance_(TCG)",         sectionId: "Set_lists", suffix: "Astral_Radiance",         expectCount: 189, jpSetIds: ["jp-tcg-S10D", "jp-tcg-S10P"] },
  { setId: "pgo",       page: "Pok%C3%A9mon_GO_(TCG)",         sectionId: "Set_lists", suffix: "Pok%C3%A9mon_GO",         expectCount: 78,  jpSetIds: ["jp-tcg-S10b"] },
  { setId: "swsh11",    page: "Lost_Origin_(TCG)",             sectionId: "Set_lists", suffix: "Lost_Origin",             expectCount: 196, jpSetIds: ["jp-tcg-S10a", "jp-tcg-S9a"] },
  { setId: "swsh12",    page: "Silver_Tempest_(TCG)",          sectionId: "Set_lists", suffix: "Silver_Tempest",          expectCount: 215, jpSetIds: ["jp-tcg-S11a", "jp-tcg-S12"] },
  { setId: "swsh12pt5", page: "Crown_Zenith_(TCG)",            sectionId: "Set_lists", suffix: "Crown_Zenith",            expectCount: 160, jpSetIds: ["jp-tcg-S12a"] },
];

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const { stdout } = await execFileP("curl", ["-sSL", "--max-time", "25", "-A", USER_AGENT, url], { maxBuffer: 16 * 1024 * 1024 });
    return stdout || null;
  } catch { return null; }
}

function extractIllustrator(html: string): string | null {
  const m = html.match(/"Illus\.\s+by\s+([^"]+)"/);
  if (m) return m[1].trim();
  const m2 = html.match(/Illus\.\s+<a[^>]*>([^<]+)<\/a>/);
  if (m2) return m2[1].trim();
  const m3 = html.match(/Illus\.\s+by\s+([^<\n]+)/);
  if (m3) return m3[1].trim();
  return null;
}

interface CardRow { number: string; slug: string; suffix: string; }

function extractCardList(html: string, sectionId: string): CardRow[] {
  const startIdx = html.indexOf(`id="${sectionId}"`);
  if (startIdx === -1) return [];
  const rest = html.slice(startIdx);
  const nextSection = rest.search(/<h[23][^>]*id=/i);
  const chunk = nextSection > 0 ? rest.slice(0, nextSection) : rest.slice(0, 600000);

  const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/g;
  const cards: CardRow[] = [];
  let m: RegExpExecArray | null;

  while ((m = rowRe.exec(chunk)) !== null) {
    const row = m[1];
    const numMatch = row.match(/>(\d+)\/\d+\s*</);
    if (!numMatch) continue;
    const number = numMatch[1];

    const linkRe = /\/wiki\/([^\"\s]+)_\(([^)]+_\d+)\)/;
    const linkMatch = row.match(linkRe);
    if (!linkMatch) continue;
    const slug = linkMatch[1];
    const cardSuffix = linkMatch[2];

    if (slug.includes("Energy") && !slug.includes("Special")) continue;
    if (slug === "Rarity") continue;

    cards.push({ number, slug, suffix: cardSuffix });
  }

  return cards;
}

interface SetResult {
  illustratorFilled: number;
  illustratorSkipped: number;
  unmatched: number;
  fetchFail: number;
}

async function scrapeSet(set: SetDef, source: { id: string }): Promise<SetResult> {
  const enSetId = `en-tcg-${set.setId}`;
  console.log(`\n─── ${set.setId}  page=${set.page} ───`);

  const url = `${WIKI_BASE}/wiki/${set.page}`;
  const html = await fetchHtml(url);
  if (!html) {
    console.log(`  ✗ fetch 실패: ${url}`);
    return { illustratorFilled: 0, illustratorSkipped: 0, unmatched: 0, fetchFail: 1 };
  }

  const cards = extractCardList(html, set.sectionId);
  console.log(`  추출 ${cards.length}장 (기대 ${set.expectCount})`);

  if (cards.length === 0) {
    console.log(`  ✗ 카드 0건 — section 구조 확인 필요`);
    return { illustratorFilled: 0, illustratorSkipped: 0, unmatched: 0, fetchFail: 1 };
  }
  if (Math.abs(cards.length - set.expectCount) > 20) {
    console.log(`  ⚠ 카드 수 불일치 (${cards.length} vs 기대 ${set.expectCount})`);
  }

  const result: SetResult = { illustratorFilled: 0, illustratorSkipped: 0, unmatched: 0, fetchFail: 0 };

  for (const card of cards) {
    const numPadded = String(parseInt(card.number, 10)).padStart(3, "0");

    // Try EN locale first
    const enLocaleId = `${enSetId}-${numPadded}`;
    const enLocale = await prisma.cardLocale.findUnique({
      where: { id: enLocaleId },
      select: { id: true, logicalCardId: true },
    });

    let lcId: string | null = null;
    if (enLocale) {
      lcId = enLocale.logicalCardId;
    } else {
      // Try JP sets
      for (const jpSetId of set.jpSetIds) {
        const jpLocaleId = `${jpSetId}-${card.number}`;
        const jpLocale = await prisma.cardLocale.findUnique({
          where: { id: jpLocaleId },
          select: { logicalCardId: true },
        });
        if (jpLocale) { lcId = jpLocale.logicalCardId; break; }
      }
    }

    if (!lcId) { result.unmatched++; continue; }

    const lc = await prisma.logicalCard.findUnique({
      where: { id: lcId },
      select: { id: true, illustrator: true },
    });
    if (!lc) { result.unmatched++; continue; }

    const externalId = `${card.slug}_(${card.suffix})`;
    const cardUrl = `${WIKI_BASE}/wiki/${card.slug}_(${card.suffix})`;

    if (lc.illustrator) {
      result.illustratorSkipped++;
      await prisma.externalIdMapping.upsert({
        where: { sourceId_externalId: { sourceId: source.id, externalId } },
        create: {
          sourceId: source.id, externalId,
          cardLocaleId: enLocale?.id ?? null, logicalCardId: lcId,
          url: cardUrl,
          verifiedBy: "auto:sync-swsh-bulbapedia", confidence: 0.75,
          notes: `Bulbapedia card page. Set ${enSetId}, number ${card.number}.`,
        },
        update: { logicalCardId: lcId },
      });
      continue;
    }

    const cardHtml = await fetchHtml(cardUrl);
    await sleep(600);

    if (!cardHtml) {
      console.log(`  [${card.number}] → ✗ fetch fail`);
      result.fetchFail++;
      continue;
    }

    const ill = extractIllustrator(cardHtml);
    if (ill) {
      await prisma.logicalCard.update({ where: { id: lc.id }, data: { illustrator: ill } });
      result.illustratorFilled++;
    }

    await prisma.externalIdMapping.upsert({
      where: { sourceId_externalId: { sourceId: source.id, externalId } },
      create: {
        sourceId: source.id, externalId,
        cardLocaleId: enLocale?.id ?? null, logicalCardId: lcId,
        url: cardUrl,
        verifiedBy: "auto:sync-swsh-bulbapedia", confidence: 0.75,
        notes: `Bulbapedia card page. Set ${enSetId}, number ${card.number}.`,
      },
      update: { logicalCardId: lcId },
    });
  }

  return result;
}

async function main() {
  const source = await prisma.externalSource.upsert({
    where: { code: "bulbapedia" },
    create: { code: "bulbapedia", name: "Bulbapedia", kind: "catalog", region: "GLOBAL", baseUrl: "https://bulbapedia.bulbagarden.net", priority: 70 },
    update: {},
  });

  const arg = process.argv.find(a => a.startsWith("--set="));
  const setsToRun = arg
    ? SETS.filter(s => s.setId === arg.slice("--set=".length).toLowerCase())
    : SETS;

  console.log(`=== SwSh Bulbapedia JP Illustrator Sync (${setsToRun.length} sets) ===`);
  let totalFilled = 0, totalSkipped = 0, totalUnmatched = 0, totalFail = 0;

  for (const set of setsToRun) {
    const r = await scrapeSet(set, source);
    totalFilled += r.illustratorFilled;
    totalSkipped += r.illustratorSkipped;
    totalUnmatched += r.unmatched;
    totalFail += r.fetchFail;
    await sleep(500);
  }

  console.log(`\n══════ 전체 결과 ══════`);
  console.log(`  illustrator 신규: ${totalFilled}`);
  console.log(`  이미 있음(skipped): ${totalSkipped}`);
  console.log(`  unmatched: ${totalUnmatched}`);
  console.log(`  fetch 실패: ${totalFail}`);

  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
