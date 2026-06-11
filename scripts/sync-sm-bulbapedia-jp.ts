/**
 * SM era JP overlay from Bulbapedia: JP 정식명/조명/일러스트레이터 등 보강.
 * JP/KR 이미지는 다운로드하지 않고 source URL만 기록 (XY 정책).
 *
 * 매칭: EN set번호 → JP LogicalCard (EN cardPack에 붙은 JP cards도 커버)
 * SM은 EN합본 패턴이 많으므로 JP set 기준으로 한번 더 확인.
 *
 * Bulbapedia wikitext API: /w/api.php?action=parse&page=PAGE&prop=wikitext
 * 일러스트레이터: Illus. by [[Artist]] 패턴
 *
 * Run: npx tsx scripts/sync-sm-bulbapedia-jp.ts [--set=sm1]
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
  sectionId: string;   // mw-headline id (usually "Set_lists")
  suffix: string;      // card link suffix in Bulbapedia
  expectCount: number; // expected printed card count
  jpSetIds: string[];  // JP DB set IDs to enrich (same number index)
}

const SETS: SetDef[] = [
  { setId: "sm1",   page: "Sun_%26_Moon_(TCG)",       sectionId: "Set_lists", suffix: "Sun_%26_Moon",    expectCount: 149, jpSetIds: ["jp-tcg-SM1s", "jp-tcg-SM1m", "jp-tcg-SM1+"] },
  { setId: "sm2",   page: "Guardians_Rising_(TCG)",   sectionId: "Set_lists", suffix: "Guardians_Rising",expectCount: 145, jpSetIds: ["jp-tcg-SM2K", "jp-tcg-SM2L"] },
  { setId: "sm3",   page: "Burning_Shadows_(TCG)",    sectionId: "Set_lists", suffix: "Burning_Shadows",  expectCount: 147, jpSetIds: ["jp-tcg-SM3H", "jp-tcg-SM3N"] },
  { setId: "sm35",  page: "Shining_Legends_(TCG)",    sectionId: "Set_lists", suffix: "Shining_Legends",  expectCount: 73,  jpSetIds: ["jp-tcg-SM3+"] },
  { setId: "sm4",   page: "Crimson_Invasion_(TCG)",   sectionId: "Set_lists", suffix: "Crimson_Invasion", expectCount: 111, jpSetIds: ["jp-tcg-SM4S", "jp-tcg-SM4A"] },
  { setId: "sm5",   page: "Ultra_Prism_(TCG)",        sectionId: "Set_lists", suffix: "Ultra_Prism",      expectCount: 156, jpSetIds: ["jp-tcg-SM5S", "jp-tcg-SM5M"] },
  { setId: "sm6",   page: "Forbidden_Light_(TCG)",    sectionId: "Set_lists", suffix: "Forbidden_Light",  expectCount: 131, jpSetIds: ["jp-tcg-SM6"]  },
  { setId: "sm75",  page: "Dragon_Majesty_(TCG)",     sectionId: "Set_lists", suffix: "Dragon_Majesty",   expectCount: 70,  jpSetIds: ["jp-tcg-SM6a"] },
  { setId: "sm7",   page: "Celestial_Storm_(TCG)",    sectionId: "Set_lists", suffix: "Celestial_Storm",  expectCount: 168, jpSetIds: ["jp-tcg-SM7"]  },
  { setId: "sm8",   page: "Lost_Thunder_(TCG)",       sectionId: "Set_lists", suffix: "Lost_Thunder",     expectCount: 214, jpSetIds: ["jp-tcg-SM8"]  },
  { setId: "sm115", page: "Hidden_Fates_(TCG)",       sectionId: "Set_lists", suffix: "Hidden_Fates",     expectCount: 69,  jpSetIds: ["jp-tcg-SM8b"] },
  { setId: "sm9",   page: "Team_Up_(TCG)",            sectionId: "Set_lists", suffix: "Team_Up",          expectCount: 181, jpSetIds: ["jp-tcg-SM9"]  },
  { setId: "det1",  page: "Detective_Pikachu_(TCG)",  sectionId: "Set_lists", suffix: "Detective_Pikachu",expectCount: 18,  jpSetIds: ["jp-tcg-SMP2"] },
  { setId: "sm10",  page: "Unbroken_Bonds_(TCG)",     sectionId: "Set_lists", suffix: "Unbroken_Bonds",   expectCount: 214, jpSetIds: ["jp-tcg-SM10"] },
  { setId: "sm11",  page: "Unified_Minds_(TCG)",      sectionId: "Set_lists", suffix: "Unified_Minds",    expectCount: 236, jpSetIds: ["jp-tcg-SM11a","jp-tcg-SM11b"] },
  { setId: "sm12",  page: "Cosmic_Eclipse_(TCG)",     sectionId: "Set_lists", suffix: "Cosmic_Eclipse",   expectCount: 236, jpSetIds: ["jp-tcg-SM12"] },
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
          verifiedBy: "auto:sync-sm-bulbapedia", confidence: 0.75,
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
        verifiedBy: "auto:sync-sm-bulbapedia", confidence: 0.75,
        notes: `Bulbapedia card page. Set ${enSetId}, number ${card.number}.`,
      },
      update: { logicalCardId: lcId },
    });
  }

  return result;
}

async function main() {
  // Ensure bulbapedia source exists
  const source = await prisma.externalSource.upsert({
    where: { code: "bulbapedia" },
    create: { code: "bulbapedia", name: "Bulbapedia", kind: "catalog", region: "GLOBAL", baseUrl: "https://bulbapedia.bulbagarden.net", priority: 70 },
    update: {},
  });

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
