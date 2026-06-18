/**
 * PMCG2~6 (구판 일본판, 1997~1999) 의 이미지를 Bulbapedia 에서 수집해
 * RegionCard.imageSmall/imageLarge 에 기록.
 *
 * - PMCG2 ポケモンジャングル → Pokémon_Jungle_(TCG), section "Pokémon_Jungle"
 * - PMCG3 化石の秘密         → Fossil_(TCG),         section "Mystery_of_the_Fossils"
 * - PMCG4 ロケット団         → Team_Rocket_(TCG),    section "Rocket_Gang"
 * - PMCG5 リーダーズスタジアム → Gym_Heroes_(TCG),     section "Leaders'_Stadium"
 * - PMCG6 闇からの挑戦       → Gym_Challenge_(TCG),  section "Challenge_from_the_Darkness"
 *
 * 라이선스: Bulbapedia CC BY-NC-SA 2.5 — 출처 표시 필수, 상업 사용 제한.
 * 이미지는 영문 카드 (동일 일러스트, 영어 텍스트).
 */
import "dotenv/config";
import { prisma } from "../../../src/lib/prisma";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const execFileP = promisify(execFile);

const WIKI_BASE = "https://bulbapedia.bulbagarden.net";
const ARCH_BASE = "https://archives.bulbagarden.net";
const USER_AGENT = "raredoc-image-collector/0.1 (https://raredoc.local; non-commercial card metadata)";

const SETS = [
  { setId: "PMCG2", group: "og-pmcg2", page: "Pok%C3%A9mon_Jungle_(TCG)", sectionId: "Pok%C3%A9mon_Jungle", expectCount: 48 },
  { setId: "PMCG3", group: "og-pmcg3", page: "Fossil_(TCG)",              sectionId: "Mystery_of_the_Fossils", expectCount: 48 },
  { setId: "PMCG4", group: "og-pmcg4", page: "Team_Rocket_(TCG)",         sectionId: "Rocket_Gang",            expectCount: 65 },
  { setId: "PMCG5", group: "og-pmcg5", page: "Gym_Heroes_(TCG)",          sectionId: "Leaders%27_Stadium",     expectCount: 96 },
  { setId: "PMCG6", group: "og-pmcg6", page: "Gym_Challenge_(TCG)",       sectionId: "Challenge_from_the_Darkness", expectCount: 98 },
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
    const { stdout } = await execFileP(
      "curl",
      ["-sSL", "--max-time", "20", "-A", USER_AGENT, url],
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

function extractCardImage(html: string): string | null {
  const re =
    /archives\.bulbagarden\.net\/media\/upload\/(?:thumb\/)?([a-f0-9])\/([a-f0-9]{2})\/([A-Z][^"\/<>\s]+?\.(?:jpg|png|webp))/g;
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

type CardRow = { slug: string; suffix: string; name: string };

/** 페이지의 특정 section 안에서 카드 목록을 순서대로 추출. suffix(괄호 안)는 첫 row 에서 자동 감지. */
async function extractCardListInSection(
  page: string,
  sectionId: string
): Promise<{ cards: CardRow[]; suffix: string }> {
  const url = `${WIKI_BASE}/wiki/${page}`;
  const html = await fetchHtml(url);
  if (!html) throw new Error(`fetch failed: ${url}`);

  // HTML 안의 id 는 디코딩된 Unicode (예: "Pokémon_Jungle") 임. URL 인코딩 풀어서 검색.
  const decodedSectionId = decodeURIComponent(sectionId);
  const startIdx = html.indexOf(`id="${decodedSectionId}"`);
  if (startIdx === -1) throw new Error(`section anchor not found: ${decodedSectionId}`);

  // 다음 H2/H3 section 또는 카드 테이블 끝까지
  const rest = html.slice(startIdx);
  // 다음 <h2 ...> 또는 <h3 ...> ID 가 있으면 그 직전까지 자름
  // (테이블이 1개라 가정)
  const nextSection = rest.search(/<h[23][^>]*id=/i);
  const chunk = nextSection > 0 ? rest.slice(0, nextSection) : rest.slice(0, 250000);

  // 카드 wiki 링크 패턴 추출 (괄호 안 suffix = 카드별 통일)
  const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/g;
  const cards: CardRow[] = [];
  const suffixCount = new Map<string, number>();
  let m: RegExpExecArray | null;
  while ((m = rowRe.exec(chunk)) !== null) {
    const row = m[1];
    const linkMatches = [...row.matchAll(/\/wiki\/([^"']+?)_\(([^)]+)\)/g)];
    // 각 row 에서 첫 wiki 링크가 카드 링크
    if (linkMatches.length === 0) continue;
    const [, slug, suffix] = linkMatches[0];
    // 카드 이름 (선택)
    const nameRe = new RegExp(`/wiki/${slug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}_\\(${suffix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\)"[^>]*>([^<]+)</a>`);
    const nm = row.match(nameRe);
    cards.push({ slug, suffix, name: nm ? nm[1] : decodeURIComponent(slug).replace(/_/g, " ") });
    suffixCount.set(suffix, (suffixCount.get(suffix) ?? 0) + 1);
  }

  // 가장 흔한 suffix 가 그 set 의 카드 suffix (반복적으로 등장)
  const sortedSuffixes = [...suffixCount.entries()].sort((a, b) => b[1] - a[1]);
  const primarySuffix = sortedSuffixes[0]?.[0] ?? "";

  // primary suffix 만 필터
  const filtered = cards.filter((c) => c.suffix === primarySuffix);
  return { cards: filtered, suffix: primarySuffix };
}

async function scrapeSet(set: typeof SETS[number]) {
  console.log(`\n─── ${set.setId}  page=${decodeURIComponent(set.page)}  section=${decodeURIComponent(set.sectionId)} ───`);

  const { cards, suffix } = await extractCardListInSection(set.page, set.sectionId);
  console.log(`  추출 ${cards.length}장 (suffix="${suffix}", 기대 ${set.expectCount})`);

  if (cards.length === 0) {
    console.log(`  ✗ 카드 0건 — section 또는 페이지 구조 확인 필요`);
    return { ok: 0, skip: 0, fail: cards.length };
  }
  if (cards.length !== set.expectCount) {
    console.log(`  ⚠ 카드 수 불일치 (${cards.length} != ${set.expectCount}) — 첫/마지막 카드 확인:`);
    console.log(`    첫: ${cards[0].name}`);
    console.log(`    끝: ${cards[cards.length - 1].name}`);
  }

  const source = await prisma.externalSource.findUniqueOrThrow({ where: { code: "bulbapedia" } });
  let okCount = 0;
  let skipCount = 0;
  let failCount = 0;

  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    const cardNum = String(i + 1).padStart(3, "0");
    const ourLocaleId = `jp-tcg-${set.setId}-${cardNum}`;
    const ourLogicalId = `lc-orphan-${ourLocaleId}`;

    const locale = await prisma.regionCard.findUnique({
      where: { id: ourLocaleId },
      select: { id: true, imageSmall: true, name: true },
    });
    if (!locale) {
      console.log(`  [${cardNum}] ${card.name.padEnd(22)} → DB row 없음 (${ourLocaleId})`);
      failCount++;
      continue;
    }
    if (locale.imageSmall) {
      skipCount++;
      continue;
    }

    const cardUrl = `${WIKI_BASE}/wiki/${card.slug}_(${card.suffix})`;
    const cardHtml = await fetchHtml(cardUrl);
    await sleep(800);
    if (!cardHtml) {
      console.log(`  [${cardNum}] ${card.name.padEnd(22)} → ✗ fetch fail`);
      failCount++;
      continue;
    }
    const imgUrl = extractCardImage(cardHtml);
    if (!imgUrl) {
      console.log(`  [${cardNum}] ${card.name.padEnd(22)} → ✗ image 추출 실패  (${cardUrl})`);
      failCount++;
      continue;
    }

    await prisma.regionCard.update({
      where: { id: ourLocaleId },
      data: { imageSmall: imgUrl, imageLarge: imgUrl },
    });
    await prisma.externalIdMapping.upsert({
      where: { sourceId_externalId: { sourceId: source.id, externalId: `${card.slug}_(${card.suffix})` } },
      create: {
        sourceId: source.id,
        externalId: `${card.slug}_(${card.suffix})`,
        regionCardId: ourLocaleId,
        cardId: ourLogicalId,
        url: cardUrl,
        verifiedBy: "auto:scrape-pmcg-images-bulbapedia",
        confidence: 0.7,
        notes: `Bulbapedia EN image used as proxy. Image text is English, not Japanese. (${set.setId})`,
      },
      update: { regionCardId: ourLocaleId, cardId: ourLogicalId, url: cardUrl },
    });
    console.log(`  [${cardNum}] ${card.name.padEnd(22)} → ✓ ${imgUrl.split("/").pop()}`);
    okCount++;
  }
  return { ok: okCount, skip: skipCount, fail: failCount };
}

async function main() {
  const arg = process.argv.find((a) => a.startsWith("--set="));
  const setsToRun = arg
    ? SETS.filter((s) => s.setId === arg.slice("--set=".length).toUpperCase())
    : SETS;

  const totals = { ok: 0, skip: 0, fail: 0 };
  for (const set of setsToRun) {
    const r = await scrapeSet(set);
    totals.ok += r.ok;
    totals.skip += r.skip;
    totals.fail += r.fail;
  }

  console.log(`\n══════ 전체 결과 ══════`);
  console.log(`  성공: ${totals.ok}`);
  console.log(`  스킵(이미 있음): ${totals.skip}`);
  console.log(`  실패: ${totals.fail}`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
