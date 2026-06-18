/**
 * L1a, L1b, L2, LL, L3 JP 카드의 illustrator 를 Bulbapedia 에서 수집.
 * tcgplayer-cdn 403 카드는 Bulbapedia 이미지를 Supabase 에 업로드 (upload-l-images-supabase.ts 와 중복 방지).
 *
 * Bulbapedia 페이지 구조:
 *   HGSS 페이지 → HeartGold_Collection / SoulSilver_Collection 섹션 (L1a, L1b)
 *   Undaunted_(TCG) → Reviving_Legends 섹션 (L2)
 *   Call_of_Legends_(TCG) → Call_of_Legends 섹션 (LL)
 *   Triumphant_(TCG) → Clash_at_the_Summit 섹션 (L3)
 *
 * 매칭: card number 기준 (row-index 금지).
 * Run: npx tsx scripts/scrape-l-illustrator-bulbapedia.ts [--set=L1a]
 */
import "dotenv/config";
import { prisma } from "../../../src/lib/prisma";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const execFileP = promisify(execFile);

const WIKI_BASE = "https://bulbapedia.bulbagarden.net";
const USER_AGENT = "raredoc-meta-enricher/0.1 (https://raredoc.local; non-commercial card metadata)";

const SETS = [
  { setId: "L1a", page: "HeartGold_%26_SoulSilver_(TCG)", sectionId: "HeartGold_Collection",  expectCount: 71 },
  { setId: "L1b", page: "HeartGold_%26_SoulSilver_(TCG)", sectionId: "SoulSilver_Collection",  expectCount: 71 },
  { setId: "L2",  page: "Undaunted_(TCG)",                sectionId: "Reviving_Legends",        expectCount: 19 },
  { setId: "LL",  page: "Call_of_Legends_(TCG)",          sectionId: "Call_of_Legends",         expectCount: 40 },
  { setId: "L3",  page: "Triumphant_(TCG)",               sectionId: "Clash_at_the_Summit",     expectCount: 81 },
];

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const { stdout } = await execFileP("curl", ["-sSL", "--max-time", "20", "-A", USER_AGENT, url], { maxBuffer: 16 * 1024 * 1024 });
    return stdout || null;
  } catch { return null; }
}

function extractIllustrator(html: string): string | null {
  const m = html.match(/"Illus\.\s+by\s+([^"]+)"/);
  if (m) return m[1].trim();
  const m2 = html.match(/Illus\.\s+<a[^>]*>([^<]+)<\/a>/);
  if (m2) return m2[1].trim();
  return null;
}

type CardRow = { number: string; slug: string; suffix: string };

function parseCardRows(chunk: string): CardRow[] {
  const rows: CardRow[] = [];
  const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/g;
  let m: RegExpExecArray | null;
  while ((m = rowRe.exec(chunk)) !== null) {
    const row = m[1];
    const numMatch = row.match(/>\s*(\d{1,3})\/\d+\s*</);
    if (!numMatch) continue;
    const number = numMatch[1].padStart(3, "0");
    const linkMatch = row.match(/\/wiki\/([^"'\s]+)_\(([^)]+)\)/);
    if (!linkMatch) continue;
    const slug = linkMatch[1];
    const suffix = linkMatch[2];
    if (slug.includes("Energy") || slug === "Rarity") continue;
    rows.push({ number, slug, suffix });
  }
  return rows;
}

async function scrapeSet(setDef: typeof SETS[number], sourceId: string) {
  console.log(`\n─── jp-tcg-${setDef.setId}  page=${setDef.page}  section="${setDef.sectionId}" ───`);

  const pageUrl = `${WIKI_BASE}/wiki/${setDef.page}`;
  const html = await fetchHtml(pageUrl);
  if (!html) { console.log("  ✗ page fetch failed"); return { filled: 0, skipped: 0, unmatched: 0, fail: 0 }; }

  const startIdx = html.indexOf(`id="${setDef.sectionId}"`);
  if (startIdx === -1) { console.log(`  ✗ section anchor "${setDef.sectionId}" not found`); return { filled: 0, skipped: 0, unmatched: 0, fail: 0 }; }

  const rest = html.slice(startIdx);
  const nextSection = rest.slice(1).search(/<h[23][^>]*id=/i);
  const chunk = nextSection > 0 ? rest.slice(0, nextSection + 1) : rest.slice(0, 300000);

  const cardRows = parseCardRows(chunk);
  console.log(`  parsed ${cardRows.length} rows (expected ~${setDef.expectCount})`);

  let filled = 0, skipped = 0, unmatched = 0, fail = 0;

  for (const card of cardRows) {
    // DB stores numbers unpadded ("1", "2"…); Bulbapedia gives zero-padded ("001").
    // Strip leading zeros for the lookup.
    const numUnpadded = String(parseInt(card.number, 10));
    const locale = await prisma.regionCard.findFirst({
      where: { setId: `jp-tcg-${setDef.setId}`, number: numUnpadded },
      select: { id: true, cardId: true, name: true },
    });
    if (!locale) { unmatched++; continue; }

    const lc = await prisma.card.findUnique({
      where: { id: locale.cardId },
      select: { id: true, illustrator: true },
    });
    if (!lc) { unmatched++; continue; }

    if (lc.illustrator) { skipped++; continue; }

    const cardUrl = `${WIKI_BASE}/wiki/${card.slug}_(${card.suffix})`;
    const cardHtml = await fetchHtml(cardUrl);
    await sleep(650);

    if (!cardHtml) {
      console.log(`  [${card.number}] ${(locale.name ?? "").slice(0, 20).padEnd(20)} → ✗ fetch fail`);
      fail++;
      continue;
    }

    const ill = extractIllustrator(cardHtml);
    if (ill) {
      await prisma.card.update({ where: { id: lc.id }, data: { illustrator: ill } });
      filled++;
    } else {
      skipped++;
    }

    // ExternalIdMapping
    const externalId = `${card.slug}_(${card.suffix})`;
    await prisma.externalIdMapping.upsert({
      where: { sourceId_externalId: { sourceId, externalId } },
      create: {
        sourceId,
        externalId,
        regionCardId: locale.id,
        cardId: locale.cardId,
        url: cardUrl,
        verifiedBy: "auto:scrape-l-illustrator-bulbapedia",
        confidence: 0.75,
        notes: `Bulbapedia card page. Set jp-tcg-${setDef.setId}, number ${card.number}.`,
      },
      update: { regionCardId: locale.id, cardId: locale.cardId, url: cardUrl },
    });
  }

  console.log(`  filled=${filled} skipped=${skipped} unmatched=${unmatched} fail=${fail}`);
  return { filled, skipped, unmatched, fail };
}

async function main() {
  const arg = process.argv.find(a => a.startsWith("--set="));
  const setsToRun = arg
    ? SETS.filter(s => s.setId.toLowerCase() === arg.slice("--set=".length).toLowerCase())
    : SETS;

  const source = await prisma.externalSource.upsert({
    where: { code: "bulbapedia" },
    create: { code: "bulbapedia", name: "Bulbapedia", kind: "wiki", region: "GLOBAL", baseUrl: "https://bulbapedia.bulbagarden.net", priority: 70 },
    update: {},
  });

  let totals = { filled: 0, skipped: 0, unmatched: 0, fail: 0 };
  for (const setDef of setsToRun) {
    const r = await scrapeSet(setDef, source.id);
    totals.filled += r.filled;
    totals.skipped += r.skipped;
    totals.unmatched += r.unmatched;
    totals.fail += r.fail;
  }

  console.log(`\n══════ 결과 ══════`);
  console.log(`  filled:    ${totals.filled}`);
  console.log(`  skipped:   ${totals.skipped}`);
  console.log(`  unmatched: ${totals.unmatched}`);
  console.log(`  fail:      ${totals.fail}`);

  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
