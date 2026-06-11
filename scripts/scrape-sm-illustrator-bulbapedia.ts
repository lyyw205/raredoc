/**
 * SM era カードの Card.illustrator を Bulbapedia から収集.
 *
 * sync-sm-bulbapedia-jp.ts 가 이미 일러스트레이터를 채우므로 이 스크립트는
 * JP-only 세트 (EN 대응 없는 og-sm* 그룹) 전용으로 보강한다.
 *
 * 대상 JP-only sets (EN 합본에 포함되지 않는 독립 JP 세트):
 *   SM0   (ピカチュウと新しい仲間たち)
 *   SM2+  (新たな試練に直面)
 *   SM4+  (GXバトルブースト)
 *   SM5+  (ウルトラフォース) → KR 있음
 *   SM6b  (チャンピオンロード)
 *   SM7a  (迅雷スパーク)
 *   SM7b  (フェアリーライズ)
 *   SM8a  (ダークオーダー)
 *   SM9a  (ナイトユニゾン)
 *   SM9b  (フルメタルウォール)
 *   SM10b (スカイレジェンド) → KR 있음
 *   SM11a (リミックスバウト) → KR 있음 (but EN sm11 covers it too)
 *   SM11b (ドリームリーグ) → KR 있음
 *   SM12a (TAG TEAM タッグオールスターズ) → KR 있음
 *   sn10a (ジージーエンド)
 *   sn11  (ミラクルツイン)
 *   SMP2  (名探偵ピカチュウ) → det1 covers it
 *
 * Bulbapedia wgCategories Illus. by {name} regex로 illustrator 추출.
 *
 * Run: npx tsx scripts/scrape-sm-illustrator-bulbapedia.ts [--set=SM4+]
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const execFileP = promisify(execFile);

const WIKI_BASE = "https://bulbapedia.bulbagarden.net";
const USER_AGENT = "raredoc-meta-enricher/0.1 (https://raredoc.local; non-commercial)";

interface SetDef {
  jpSetId: string;     // DB JP set ID (jp-tcg-*)
  page: string;        // Bulbapedia page title
  sectionId: string;
  expectCount: number;
}

const SETS: SetDef[] = [
  { jpSetId: "jp-tcg-SM0",   page: "Pikachu_and_the_New_Friends!_(TCG)", sectionId: "Set_lists", expectCount: 33  },
  { jpSetId: "jp-tcg-SM4+",  page: "GX_Battle_Boost_(TCG)",              sectionId: "Set_lists", expectCount: 114 },
  { jpSetId: "jp-tcg-SM5+",  page: "Ultra_Force_(TCG)",                  sectionId: "Set_lists", expectCount: 51  },
  { jpSetId: "jp-tcg-SM6b",  page: "Champion_Road_(TCG)",                sectionId: "Set_lists", expectCount: 50  },
  { jpSetId: "jp-tcg-SM7a",  page: "Thunderclap_Spark_(TCG)",            sectionId: "Set_lists", expectCount: 60  },
  { jpSetId: "jp-tcg-SM7b",  page: "Fairy_Rise_(TCG)",                   sectionId: "Set_lists", expectCount: 50  },
  { jpSetId: "jp-tcg-SM8a",  page: "Dark_Order_(TCG)",                   sectionId: "Set_lists", expectCount: 54  },
  { jpSetId: "jp-tcg-SM8b",  page: "GX_Ultra_Shiny_(TCG)",               sectionId: "Set_lists", expectCount: 150 },
  { jpSetId: "jp-tcg-SM9a",  page: "Night_Unison_(TCG)",                 sectionId: "Set_lists", expectCount: 54  },
  { jpSetId: "jp-tcg-SM9b",  page: "Full_Metal_Wall_(TCG)",              sectionId: "Set_lists", expectCount: 54  },
  { jpSetId: "jp-tcg-SM10b", page: "Sky_Legend_(TCG)",                   sectionId: "Set_lists", expectCount: 54  },
  { jpSetId: "jp-tcg-SM11a", page: "Remix_Bout_(TCG)",                   sectionId: "Set_lists", expectCount: 64  },
  { jpSetId: "jp-tcg-SM11b", page: "Dream_League_(TCG)",                 sectionId: "Set_lists", expectCount: 83  },
  { jpSetId: "jp-tcg-SM12a", page: "TAG_TEAM_GX_Tag_All_Stars_(TCG)",    sectionId: "Set_lists", expectCount: 173 },
  { jpSetId: "jp-tcg-sn10a", page: "GG_End_(TCG)",                       sectionId: "Set_lists", expectCount: 55  },
  { jpSetId: "jp-tcg-sn11",  page: "Miracle_Twin_(TCG)",                 sectionId: "Set_lists", expectCount: 95  },
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
  console.log(`\n─── ${set.jpSetId}  page=${set.page} ───`);

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
    const jpLocaleId = `${set.jpSetId}-${card.number}`;
    const locale = await prisma.regionCard.findUnique({
      where: { id: jpLocaleId },
      select: { id: true, cardId: true },
    });

    if (!locale) {
      result.unmatched++;
      continue;
    }

    const lc = await prisma.card.findUnique({
      where: { id: locale.cardId },
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
          regionCardId: locale.id, cardId: lc.id,
          url: cardUrl,
          verifiedBy: "auto:scrape-sm-bulbapedia", confidence: 0.75,
          notes: `Bulbapedia SM JP-only. Set ${set.jpSetId}, number ${card.number}.`,
        },
        update: { cardId: lc.id },
      });
      continue;
    }

    const cardHtml = await fetchHtml(cardUrl);
    await sleep(600);

    if (!cardHtml) {
      result.fetchFail++;
      continue;
    }

    const ill = extractIllustrator(cardHtml);
    if (ill) {
      await prisma.card.update({ where: { id: lc.id }, data: { illustrator: ill } });
      result.illustratorFilled++;
    }

    await prisma.externalIdMapping.upsert({
      where: { sourceId_externalId: { sourceId: source.id, externalId } },
      create: {
        sourceId: source.id, externalId,
        regionCardId: locale.id, cardId: lc.id,
        url: cardUrl,
        verifiedBy: "auto:scrape-sm-bulbapedia", confidence: 0.75,
        notes: `Bulbapedia SM JP-only. Set ${set.jpSetId}, number ${card.number}.`,
      },
      update: { cardId: lc.id },
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
    ? SETS.filter(s => s.jpSetId.replace("jp-tcg-", "") === arg.slice("--set=".length))
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
