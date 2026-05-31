/**
 * XY era カードの LogicalCard.illustrator を Bulbapedia から収集.
 *
 * 対象: EN set 登録後の EN CardLocale (en-tcg-xy*) + JP orphan cards in XY sets.
 *
 * 매칭 전략: Bulbapedia Set_lists テーブルの "N/total" 番号 → CardLocale.number
 * EN card number と JP card number が一致するため JP LogicalCard にも illustrator を設定.
 *
 * Verified section anchors (probed 2026-05-31):
 *   XY_(TCG)              → "Set_lists"  suffix: XY
 *   Flashfire_(TCG)       → "Set_lists"  suffix: Flashfire
 *   Furious_Fists_(TCG)   → "Set_lists"  suffix: Furious_Fists
 *   Phantom_Forces_(TCG)  → "Set_lists"  suffix: Phantom_Forces
 *   Primal_Clash_(TCG)    → "Set_lists"  suffix: Primal_Clash
 *   Double_Crisis_(TCG)   → "Set_lists"  suffix: Double_Crisis
 *   Roaring_Skies_(TCG)   → "Set_lists"  suffix: Roaring_Skies
 *   Ancient_Origins_(TCG) → "Set_lists"  suffix: Ancient_Origins
 *   BREAKthrough_(TCG)    → "Set_lists"  suffix: BREAKthrough
 *   BREAKpoint_(TCG)      → "Set_lists"  suffix: BREAKpoint
 *   Fates_Collide_(TCG)   → "Set_lists"  suffix: Fates_Collide
 *   Steam_Siege_(TCG)     → "Set_lists"  suffix: Steam_Siege
 *   Evolutions_(TCG)      → "Set_lists"  suffix: Evolutions
 *   Generations_(TCG)     → "Set_lists"  suffix: Generations
 *
 * Run: npx tsx scripts/scrape-xy-illustrator-bulbapedia.ts [--set=xy2]
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const execFileP = promisify(execFile);

const WIKI_BASE = "https://bulbapedia.bulbagarden.net";
const USER_AGENT = "raredoc-meta-enricher/0.1 (https://raredoc.local; non-commercial card metadata)";

interface SetDef {
  setId: string;       // EN pokemontcg.io set ID (also used as key)
  page: string;        // Bulbapedia page title (URL-encoded where needed)
  sectionId: string;   // mw-headline id (always "Set_lists" for XY)
  suffix: string;      // Card link suffix in Bulbapedia (e.g. "Flashfire")
  expectCount: number; // Expected card count for sanity check
  jpSetId: string;     // JP DB set ID to enrich (same number index)
}

const SETS: SetDef[] = [
  { setId: "xy1",  page: "XY_(TCG)",             sectionId: "Set_lists", suffix: "XY",            expectCount: 146, jpSetId: "jp-tcg-XY1a" },
  { setId: "xy2",  page: "Flashfire_(TCG)",       sectionId: "Set_lists", suffix: "Flashfire",     expectCount: 106, jpSetId: "jp-tcg-XY2"  },
  { setId: "xy3",  page: "Furious_Fists_(TCG)",   sectionId: "Set_lists", suffix: "Furious_Fists", expectCount: 111, jpSetId: "jp-tcg-XY3"  },
  { setId: "xy4",  page: "Phantom_Forces_(TCG)",  sectionId: "Set_lists", suffix: "Phantom_Forces",expectCount: 119, jpSetId: "jp-tcg-XY4"  },
  { setId: "xy5",  page: "Primal_Clash_(TCG)",    sectionId: "Set_lists", suffix: "Primal_Clash",  expectCount: 160, jpSetId: "jp-tcg-XY5a" },
  { setId: "dc1",  page: "Double_Crisis_(TCG)",   sectionId: "Set_lists", suffix: "Double_Crisis", expectCount: 34,  jpSetId: "jp-tcg-CP1"  },
  { setId: "xy6",  page: "Roaring_Skies_(TCG)",   sectionId: "Set_lists", suffix: "Roaring_Skies", expectCount: 108, jpSetId: "jp-tcg-XY6"  },
  { setId: "xy7",  page: "Ancient_Origins_(TCG)", sectionId: "Set_lists", suffix: "Ancient_Origins",expectCount: 98, jpSetId: "jp-tcg-XY7"  },
  { setId: "xy8",  page: "BREAKthrough_(TCG)",    sectionId: "Set_lists", suffix: "BREAKthrough",  expectCount: 162, jpSetId: "jp-tcg-XY8a" },
  { setId: "xy9",  page: "BREAKpoint_(TCG)",      sectionId: "Set_lists", suffix: "BREAKpoint",    expectCount: 122, jpSetId: "jp-tcg-XY9"  },
  { setId: "xy10", page: "Fates_Collide_(TCG)",   sectionId: "Set_lists", suffix: "Fates_Collide", expectCount: 124, jpSetId: "jp-tcg-XY10" },
  { setId: "xy11", page: "Steam_Siege_(TCG)",     sectionId: "Set_lists", suffix: "Steam_Siege",   expectCount: 114, jpSetId: "jp-tcg-XY11a"},
  { setId: "xy12", page: "Evolutions_(TCG)",      sectionId: "Set_lists", suffix: "Evolutions",    expectCount: 108, jpSetId: "jp-tcg-CP6"  },
  { setId: "g1",   page: "Generations_(TCG)",     sectionId: "Set_lists", suffix: "Generations",   expectCount: 83,  jpSetId: ""            },
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
  const m3 = html.match(/Illus\.\s+by\s+([^<\n]+)/);
  if (m3) return m3[1].trim();
  return null;
}

interface CardRow { number: string; slug: string; suffix: string; }

function extractCardList(html: string, sectionId: string, suffix: string): CardRow[] {
  const startIdx = html.indexOf(`id="${sectionId}"`);
  if (startIdx === -1) return [];
  const rest = html.slice(startIdx);
  const nextSection = rest.search(/<h[23][^>]*id=/i);
  const chunk = nextSection > 0 ? rest.slice(0, nextSection) : rest.slice(0, 400000);

  const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/g;
  const cards: CardRow[] = [];
  let m: RegExpExecArray | null;

  while ((m = rowRe.exec(chunk)) !== null) {
    const row = m[1];
    // Number: "1/106" or "001/106" format
    const numMatch = row.match(/>(\d+)\/\d+\s*</);
    if (!numMatch) continue;
    const number = numMatch[1]; // not zero-padded

    // Card link: wiki/Slug_(Suffix_N) — suffix may have underscores
    // Pattern: /wiki/Something_(SuffixWithMaybeUnderscores_Number)
    const linkRe = /\/wiki\/([^\"\s]+)_\(([^)]+_\d+)\)/;
    const linkMatch = row.match(linkRe);
    if (!linkMatch) continue;
    const slug = linkMatch[1];
    const cardSuffix = linkMatch[2];

    // Skip energy and rarity
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
  console.log(`\n─── ${set.setId}  page=${set.page}  jpSet=${set.jpSetId || "(none)"} ───`);

  const url = `${WIKI_BASE}/wiki/${set.page}`;
  const html = await fetchHtml(url);
  if (!html) {
    console.log(`  ✗ fetch 실패: ${url}`);
    return { illustratorFilled: 0, illustratorSkipped: 0, unmatched: 0, fetchFail: 1 };
  }

  const cards = extractCardList(html, set.sectionId, set.suffix);
  console.log(`  추출 ${cards.length}장 (기대 ${set.expectCount})`);

  if (cards.length === 0) {
    console.log(`  ✗ 카드 0건 — section 구조 확인 필요`);
    return { illustratorFilled: 0, illustratorSkipped: 0, unmatched: 0, fetchFail: 1 };
  }
  if (cards.length !== set.expectCount) {
    console.log(`  ⚠ 카드 수 불일치 (${cards.length} != ${set.expectCount})`);
  }

  const result: SetResult = { illustratorFilled: 0, illustratorSkipped: 0, unmatched: 0, fetchFail: 0 };

  for (const card of cards) {
    // Find EN CardLocale by number
    const numPadded = String(parseInt(card.number, 10)).padStart(3, "0");
    const enLocaleId = `${enSetId}-${numPadded}`;

    const locale = await prisma.cardLocale.findUnique({
      where: { id: enLocaleId },
      select: { id: true, logicalCardId: true, name: true },
    });

    if (!locale) {
      // Try JP locale if EN not registered yet
      if (set.jpSetId) {
        const jpLocaleId = `${set.jpSetId}-${card.number}`;
        const jpLocale = await prisma.cardLocale.findUnique({
          where: { id: jpLocaleId },
          select: { id: true, logicalCardId: true, name: true },
        });
        if (!jpLocale) {
          result.unmatched++;
          continue;
        }
        // Use JP LogicalCard
        const lc = await prisma.logicalCard.findUnique({
          where: { id: jpLocale.logicalCardId },
          select: { id: true, illustrator: true },
        });
        if (!lc || lc.illustrator) { result.illustratorSkipped++; continue; }

        const cardUrl = `${WIKI_BASE}/wiki/${card.slug}_(${card.suffix})`;
        const cardHtml = await fetchHtml(cardUrl);
        await sleep(600);
        if (!cardHtml) { result.fetchFail++; continue; }

        const ill = extractIllustrator(cardHtml);
        if (ill) {
          await prisma.logicalCard.update({ where: { id: lc.id }, data: { illustrator: ill } });
          result.illustratorFilled++;
        }
        continue;
      }
      result.unmatched++;
      continue;
    }

    // EN locale found — check LogicalCard illustrator
    const lc = await prisma.logicalCard.findUnique({
      where: { id: locale.logicalCardId },
      select: { id: true, illustrator: true },
    });
    if (!lc) { result.unmatched++; continue; }

    if (lc.illustrator) {
      result.illustratorSkipped++;
      // Still register ExternalIdMapping
      const externalId = `${card.slug}_(${card.suffix})`;
      await prisma.externalIdMapping.upsert({
        where: { sourceId_externalId: { sourceId: source.id, externalId } },
        create: {
          sourceId: source.id, externalId,
          cardLocaleId: locale.id, logicalCardId: locale.logicalCardId,
          url: `${WIKI_BASE}/wiki/${card.slug}_(${card.suffix})`,
          verifiedBy: "auto:scrape-xy-bulbapedia", confidence: 0.75,
          notes: `Bulbapedia card page. Set ${enSetId}, number ${card.number}.`,
        },
        update: { cardLocaleId: locale.id, logicalCardId: locale.logicalCardId },
      });
      continue;
    }

    const cardUrl = `${WIKI_BASE}/wiki/${card.slug}_(${card.suffix})`;
    const cardHtml = await fetchHtml(cardUrl);
    await sleep(600);

    if (!cardHtml) {
      console.log(`  [${card.number}] ${locale.name.slice(0, 15).padEnd(15)} → ✗ fetch fail`);
      result.fetchFail++;
      continue;
    }

    const ill = extractIllustrator(cardHtml);
    if (ill) {
      await prisma.logicalCard.update({ where: { id: lc.id }, data: { illustrator: ill } });
      result.illustratorFilled++;
    }

    const externalId = `${card.slug}_(${card.suffix})`;
    await prisma.externalIdMapping.upsert({
      where: { sourceId_externalId: { sourceId: source.id, externalId } },
      create: {
        sourceId: source.id, externalId,
        cardLocaleId: locale.id, logicalCardId: locale.logicalCardId,
        url: cardUrl,
        verifiedBy: "auto:scrape-xy-bulbapedia", confidence: 0.75,
        notes: `Bulbapedia card page. Set ${enSetId}, number ${card.number}.`,
      },
      update: { cardLocaleId: locale.id, logicalCardId: locale.logicalCardId },
    });
  }

  return result;
}

async function main() {
  const source = await prisma.externalSource.findFirstOrThrow({ where: { code: "bulbapedia" } });

  const arg = process.argv.find(a => a.startsWith("--set="));
  const setsToRun = arg
    ? SETS.filter(s => s.setId === arg.slice("--set=".length).toLowerCase())
    : SETS;

  const totals = { illustratorFilled: 0, illustratorSkipped: 0, unmatched: 0, fetchFail: 0 };

  for (const set of setsToRun) {
    const r = await scrapeSet(set, source);
    totals.illustratorFilled += r.illustratorFilled;
    totals.illustratorSkipped += r.illustratorSkipped;
    totals.unmatched += r.unmatched;
    totals.fetchFail += r.fetchFail;
    console.log(
      `  → 일러스트레이터 채움: ${r.illustratorFilled}, 스킵: ${r.illustratorSkipped}, 미매칭: ${r.unmatched}, 실패: ${r.fetchFail}`
    );
  }

  console.log(`\n══════ 전체 결과 ══════`);
  console.log(`  일러스트레이터 채움: ${totals.illustratorFilled}`);
  console.log(`  일러스트레이터 스킵(이미 있음): ${totals.illustratorSkipped}`);
  console.log(`  Bulbapedia 미매칭(DB 없음): ${totals.unmatched}`);
  console.log(`  fetch 실패: ${totals.fetchFail}`);

  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
