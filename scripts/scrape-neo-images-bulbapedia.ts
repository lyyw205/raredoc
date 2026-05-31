/**
 * NEO1~4 이미지 URL 을 Bulbapedia 의 JP 섹션에서 추출 → CardLocale.imageSmall/imageLarge 저장.
 * (이 시점에선 archives.bulbagarden.net URL 만. 다음 단계에서 Supabase 로 이전.)
 *
 * - NEO1 → Neo_Genesis_(TCG), section "Gold,_Silver,_to_a_New_World..."
 * - NEO2 → Neo_Discovery_(TCG), section "Crossing_the_Ruins..."
 * - NEO3 → Neo_Revelation_(TCG), section "Awakening_Legends"
 * - NEO4 → Neo_Destiny_(TCG), section "Darkness,_and_to_Light..."
 *
 * 주의: 인덱스 매칭이 아니라 row 위치 매칭. PMCG5/6 같은 카오스 방지를 위해
 *      추출 카드 수가 DB 카드 수와 일치하는지 검증.
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const execFileP = promisify(execFile);

const WIKI_BASE = "https://bulbapedia.bulbagarden.net";
const ARCH_BASE = "https://archives.bulbagarden.net";
const USER_AGENT = "raredoc-image-collector/0.1 (https://raredoc.local; non-commercial card metadata)";

const SETS = [
  { setId: "neo1", group: "og-neo1", page: "Neo_Genesis_(TCG)",     sectionId: "Gold,_Silver,_to_a_New_World...",  expectCount: 96 },
  { setId: "neo2", group: "og-neo2", page: "Neo_Discovery_(TCG)",   sectionId: "Crossing_the_Ruins...",            expectCount: 57 },
  { setId: "neo3", group: "og-neo3", page: "Neo_Revelation_(TCG)",  sectionId: "Awakening_Legends",                expectCount: 57 },
  { setId: "neo4", group: "og-neo4", page: "Neo_Destiny_(TCG)",     sectionId: "Darkness,_and_to_Light...",        expectCount: 113 },
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

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const { stdout } = await execFileP("curl", ["-sSL", "--max-time", "20", "-A", USER_AGENT, url], { maxBuffer: 16 * 1024 * 1024 });
    return stdout || null;
  } catch { return null; }
}

function extractCardImage(html: string): string | null {
  const re = /archives\.bulbagarden\.net\/media\/upload\/(?:thumb\/)?([a-f0-9])\/([a-f0-9]{2})\/([A-Z][^"\/<>\s]+?\.(?:jpg|png|webp))/g;
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

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

type CardRow = { slug: string; suffix: string; name: string };

async function extractCardListInSection(page: string, sectionId: string): Promise<{ cards: CardRow[]; suffix: string }> {
  const url = `${WIKI_BASE}/wiki/${page}`;
  const html = await fetchHtml(url);
  if (!html) throw new Error(`set fetch failed: ${url}`);
  const decoded = decodeURIComponent(sectionId);
  const startIdx = html.indexOf(`id="${decoded}"`);
  if (startIdx === -1) throw new Error(`section not found: ${decoded}`);
  const rest = html.slice(startIdx);
  const nextSection = rest.search(/<h[23][^>]*id=/i);
  const chunk = nextSection > 0 ? rest.slice(0, nextSection) : rest.slice(0, 300000);

  const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/g;
  const cards: CardRow[] = [];
  const suffixCount = new Map<string, number>();
  let m: RegExpExecArray | null;
  while ((m = rowRe.exec(chunk)) !== null) {
    const row = m[1];
    const linkMatches = [...row.matchAll(/\/wiki\/([^"']+?)_\(([^)]+)\)/g)];
    if (linkMatches.length === 0) continue;
    const [, slug, suffix] = linkMatches[0];
    const nm = row.match(new RegExp(`/wiki/${slug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}_\\(${suffix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\)"[^>]*>([^<]+)</a>`));
    cards.push({ slug, suffix, name: nm ? nm[1] : decodeURIComponent(slug).replace(/_/g, " ") });
    suffixCount.set(suffix, (suffixCount.get(suffix) ?? 0) + 1);
  }
  const sortedSuffixes = [...suffixCount.entries()].sort((a, b) => b[1] - a[1]);
  const primarySuffix = sortedSuffixes[0]?.[0] ?? "";
  return { cards: cards.filter(c => c.suffix === primarySuffix), suffix: primarySuffix };
}

async function scrapeSet(set: typeof SETS[number]) {
  console.log(`\n─── ${set.setId.toUpperCase()} (${decodeURIComponent(set.page)}) ───`);
  const { cards, suffix } = await extractCardListInSection(set.page, set.sectionId);
  console.log(`  Bulbapedia 추출 ${cards.length}장 (suffix=${suffix}, 기대 ${set.expectCount})`);

  if (cards.length === 0) return { ok: 0, fail: 1 };
  if (cards.length !== set.expectCount) {
    console.log(`  ⚠ 카드 수 불일치 — 첫: ${cards[0].name}, 끝: ${cards[cards.length-1].name}`);
  }

  const source = await prisma.externalSource.findUniqueOrThrow({ where: { code: "bulbapedia" } });
  let ok = 0, skip = 0, fail = 0;

  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    const cardNum = String(i + 1).padStart(3, "0");
    const ourLocaleId = `jp-tcg-${set.setId}-${cardNum}`;
    const ourLogicalId = `lc-orphan-${ourLocaleId}`;

    const locale = await prisma.cardLocale.findUnique({ where: { id: ourLocaleId }, select: { id: true, imageSmall: true } });
    if (!locale) { console.log(`  [${cardNum}] ${card.name.padEnd(20)} → DB row 없음`); fail++; continue; }
    if (locale.imageSmall) { skip++; continue; }

    const cardUrl = `${WIKI_BASE}/wiki/${card.slug}_(${card.suffix})`;
    const html = await fetchHtml(cardUrl);
    await sleep(700);
    if (!html) { console.log(`  [${cardNum}] ✗ fetch fail`); fail++; continue; }
    const imgUrl = extractCardImage(html);
    if (!imgUrl) { console.log(`  [${cardNum}] ✗ image 추출 실패`); fail++; continue; }

    await prisma.cardLocale.update({ where: { id: ourLocaleId }, data: { imageSmall: imgUrl, imageLarge: imgUrl } });
    await prisma.externalIdMapping.upsert({
      where: { sourceId_externalId: { sourceId: source.id, externalId: `${card.slug}_(${card.suffix})` } },
      create: {
        sourceId: source.id, externalId: `${card.slug}_(${card.suffix})`,
        cardLocaleId: ourLocaleId, logicalCardId: ourLogicalId,
        url: cardUrl, verifiedBy: "auto:scrape-neo-images-bulbapedia", confidence: 0.7,
        notes: `Bulbapedia EN image proxy. (${set.setId})`,
      },
      update: { cardLocaleId: ourLocaleId, logicalCardId: ourLogicalId, url: cardUrl },
    });
    if (++ok % 20 === 0) console.log(`  ... ${ok} OK`);
  }
  console.log(`  ${set.setId}: ok=${ok}, skip=${skip}, fail=${fail}`);
  return { ok, skip, fail };
}

async function main() {
  const arg = process.argv.find(a => a.startsWith("--set="));
  const sets = arg ? SETS.filter(s => s.setId === arg.slice(6).toLowerCase()) : SETS;
  const totals = { ok: 0, skip: 0, fail: 0 };
  for (const s of sets) {
    const r = await scrapeSet(s);
    totals.ok += r.ok ?? 0; totals.skip += (r as { skip?: number }).skip ?? 0; totals.fail += r.fail ?? 0;
  }
  console.log(`\n══════ 결과 ══════  성공 ${totals.ok}, skip ${totals.skip}, 실패 ${totals.fail}`);
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
