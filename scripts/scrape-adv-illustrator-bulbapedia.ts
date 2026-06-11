/**
 * ADV1~5 카드의 LogicalCard.illustrator 를 Bulbapedia 에서 수집.
 * tcgplayer-cdn 403 오류 카드의 이미지를 Supabase 로 대체.
 *
 * 매칭 전략: Bulbapedia 테이블의 "No." 컬럼(예: 001/055) → RegionCard.number
 * (row-index 매칭 금지 — PMCG5/6 오염 사고 재현 방지)
 *
 * Verified section anchors (probed 2026-05-29):
 *   ADV1: EX_Ruby_%26_Sapphire_(TCG)        → "Expansion_Pack"
 *   ADV2: EX_Sandstorm_(TCG)                → "Miracle_of_the_Desert"
 *   ADV3: EX_Dragon_(TCG)                   → "Rulers_of_the_Heavens"
 *   ADV4: EX_Team_Magma_vs_Team_Aqua_(TCG)  → "Magma_VS_Aqua:_Two_Ambitions"
 *   ADV5: EX_Hidden_Legends_(TCG)           → "Undone_Seal"
 *
 * NOTE: User instructions had wrong anchor for ADV3 ("Ruler_of_the_Heavens" vs actual "Rulers_of_the_Heavens")
 *       and ADV4 ("%2C" comma vs actual ":" colon). Corrected here based on live Bulbapedia probe.
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile, unlink, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
const execFileP = promisify(execFile);

const WIKI_BASE = "https://bulbapedia.bulbagarden.net";
const ARCH_BASE = "https://archives.bulbagarden.net";
const USER_AGENT = "raredoc-meta-enricher/0.1 (https://raredoc.local; non-commercial card metadata)";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BUCKET = "card-images";

const SETS = [
  { setId: "ADV1", page: "EX_Ruby_%26_Sapphire_(TCG)",       sectionId: "Expansion_Pack",           expectCount: 55,  needImage: false },
  { setId: "ADV2", page: "EX_Sandstorm_(TCG)",               sectionId: "Miracle_of_the_Desert",     expectCount: 53,  needImage: false },
  { setId: "ADV3", page: "EX_Dragon_(TCG)",                  sectionId: "Rulers_of_the_Heavens",     expectCount: 54,  needImage: false },
  { setId: "ADV4", page: "EX_Team_Magma_vs_Team_Aqua_(TCG)", sectionId: "Magma_VS_Aqua:_Two_Ambitions", expectCount: 80, needImage: false },
  { setId: "ADV5", page: "EX_Hidden_Legends_(TCG)",          sectionId: "Undone_Seal",               expectCount: 83,  needImage: false },
];

const UI_BLOCKLIST = [
  /Project_/i, /Portal_/i, /_logo\.|_icon\.|_symbol\./i,
  /^Grass-attack/i, /^Fire-attack/i, /^Water-attack/i, /^Lightning-attack/i,
  /^Psychic-attack/i, /^Fighting-attack/i, /^Colorless-attack/i, /^Darkness-attack/i,
  /^Metal-attack/i, /^Fairy-attack/i, /^Dragon-attack/i,
  /^Rarity_/i, /^Bulbapedia/i, /Best_?Photo/i, /Contest/i, /Ad\.jpg$/i,
  /SetSymbol/i, /^TCG2_A01/i,
];

function isUiAsset(filename: string): boolean {
  return UI_BLOCKLIST.some((re) => re.test(filename));
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
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

async function downloadToFile(url: string, dest: string): Promise<boolean> {
  try {
    await execFileP("curl", ["-sSL", "--max-time", "30", "-A", "Mozilla/5.0", "-o", dest, url], {
      maxBuffer: 16 * 1024 * 1024,
    });
    const buf = await readFile(dest);
    return buf.length > 1024;
  } catch {
    return false;
  }
}

async function uploadToSupabase(localPath: string, remotePath: string, contentType: string): Promise<string | null> {
  const url = `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${remotePath}`;
  try {
    const { stdout } = await execFileP("curl", [
      "-sS", "-X", "POST",
      "-H", `Authorization: Bearer ${SERVICE_KEY}`,
      "-H", `apikey: ${SERVICE_KEY}`,
      "-H", `Content-Type: ${contentType}`,
      "-H", "x-upsert: true",
      "--data-binary", `@${localPath}`,
      "--max-time", "60",
      url,
    ], { maxBuffer: 16 * 1024 * 1024 });
    if (stdout.includes("Key")) {
      return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${remotePath}`;
    }
    return null;
  } catch {
    return null;
  }
}

function extractIllustrator(html: string): string | null {
  const m = html.match(/"Illus\.\s+by\s+([^"]+)"/);
  if (m) return m[1].trim();
  const m2 = html.match(/Illus\.\s+<a[^>]*>([^<]+)<\/a>/);
  if (m2) return m2[1].trim();
  return null;
}

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

type CardRow = { number: string; slug: string; suffix: string };

async function extractCardListInSection(
  page: string,
  sectionId: string
): Promise<CardRow[]> {
  const url = `${WIKI_BASE}/wiki/${page}`;
  const html = await fetchHtml(url);
  if (!html) throw new Error(`fetch failed: ${url}`);

  // HTML anchor IDs are decoded Unicode; sectionId is already the decoded form
  const startIdx = html.indexOf(`id="${sectionId}"`);
  if (startIdx === -1) throw new Error(`section anchor not found: ${sectionId} in ${page}`);

  const rest = html.slice(startIdx);
  const nextSection = rest.search(/<h[23][^>]*id=/i);
  const chunk = nextSection > 0 ? rest.slice(0, nextSection) : rest.slice(0, 300000);

  const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/g;
  const cards: CardRow[] = [];
  let m: RegExpExecArray | null;

  while ((m = rowRe.exec(chunk)) !== null) {
    const row = m[1];

    // Extract card number: "001/055" or "001/082" etc.
    const numMatch = row.match(/>\s*(\d{3})\/\d+\s*</);
    if (!numMatch) continue;
    const number = numMatch[1];

    // Extract wiki card link: /wiki/SLUG_(SUFFIX)
    const linkMatch = row.match(/\/wiki\/([^"'\s]+)_\(([^)]+)\)/);
    if (!linkMatch) continue;
    const slug = linkMatch[1];
    const suffix = linkMatch[2];

    // Skip non-card links (energy, rarity, etc.)
    if (slug.includes("Energy") || slug === "Rarity") continue;

    cards.push({ number, slug, suffix });
  }

  return cards;
}

interface SetResult {
  illustratorFilled: number;
  illustratorSkipped: number;
  imageFilled: number;
  imageSkipped: number;
  unmatched: number;
  fetchFail: number;
}

async function scrapeSet(
  set: typeof SETS[number],
  source: { id: string },
  tmpRoot: string
): Promise<SetResult> {
  console.log(
    `\n─── jp-tcg-${set.setId}  page=${set.page}  section="${set.sectionId}" ───`
  );

  const cards = await extractCardListInSection(set.page, set.sectionId);
  console.log(`  추출 ${cards.length}장 (기대 ${set.expectCount})`);

  if (cards.length === 0) {
    console.log(`  ✗ 카드 0건 — section 구조 확인 필요`);
    return { illustratorFilled: 0, illustratorSkipped: 0, imageFilled: 0, imageSkipped: 0, unmatched: 0, fetchFail: 0 };
  }
  if (cards.length !== set.expectCount) {
    console.log(`  ⚠ 카드 수 불일치 (${cards.length} != ${set.expectCount})`);
    if (cards.length > 0) {
      console.log(`    첫: ${cards[0].slug} #${cards[0].number}`);
      console.log(`    끝: ${cards[cards.length - 1].slug} #${cards[cards.length - 1].number}`);
    }
  }

  const result: SetResult = {
    illustratorFilled: 0,
    illustratorSkipped: 0,
    imageFilled: 0,
    imageSkipped: 0,
    unmatched: 0,
    fetchFail: 0,
  };

  for (const card of cards) {
    // ADV RegionCard IDs use unpadded numbers: jp-tcg-ADV1-1 (number field = "1")
    // Bulbapedia number is padded "001" → strip leading zeros for DB lookup
    const cardNumber = card.number.replace(/^0+/, "") || "0";

    const locale = await prisma.regionCard.findFirst({
      where: { setId: `jp-tcg-${set.setId}`, number: cardNumber },
      select: { id: true, imageSmall: true, logicalCardId: true, name: true },
    });

    if (!locale) {
      console.log(
        `  [${card.number}] ${card.slug.slice(0, 20).padEnd(20)} → DB row 없음`
      );
      result.unmatched++;
      continue;
    }

    const lc = await prisma.logicalCard.findUnique({
      where: { id: locale.logicalCardId },
      select: { id: true, illustrator: true },
    });
    if (!lc) {
      result.unmatched++;
      continue;
    }

    const needIllustrator = !lc.illustrator;
    const needImage =
      set.needImage &&
      (!locale.imageSmall ||
        locale.imageSmall.includes("tcgplayer") ||
        locale.imageSmall === null);

    if (!needIllustrator && !needImage) {
      result.illustratorSkipped++;
      if (set.needImage) result.imageSkipped++;
      continue;
    }

    const cardUrl = `${WIKI_BASE}/wiki/${card.slug}_(${card.suffix})`;
    const cardHtml = await fetchHtml(cardUrl);
    await sleep(700);

    if (!cardHtml) {
      console.log(`  [${card.number}] ${locale.name.slice(0, 20).padEnd(20)} → ✗ fetch fail`);
      result.fetchFail++;
      continue;
    }

    // Illustrator
    if (needIllustrator) {
      const ill = extractIllustrator(cardHtml);
      if (ill) {
        await prisma.logicalCard.update({
          where: { id: lc.id },
          data: { illustrator: ill },
        });
        result.illustratorFilled++;
      }
    } else {
      result.illustratorSkipped++;
    }

    // ExternalIdMapping
    const externalId = `${card.slug}_(${card.suffix})`;
    await prisma.externalIdMapping.upsert({
      where: { sourceId_externalId: { sourceId: source.id, externalId } },
      create: {
        sourceId: source.id,
        externalId,
        regionCardId: locale.id,
        logicalCardId: locale.logicalCardId,
        url: cardUrl,
        verifiedBy: "auto:scrape-adv",
        confidence: 0.7,
        notes: `Bulbapedia card page. Set jp-tcg-${set.setId}, number ${card.number}.`,
      },
      update: {
        regionCardId: locale.id,
        logicalCardId: locale.logicalCardId,
        url: cardUrl,
      },
    });

    // Image fallback (if enabled for this set)
    if (needImage) {
      const imgUrl = extractCardImage(cardHtml);
      if (!imgUrl) {
        console.log(
          `  [${card.number}] ${locale.name.slice(0, 20).padEnd(20)} → ✗ image URL 추출 실패`
        );
        result.fetchFail++;
        continue;
      }

      const ext = imgUrl.toLowerCase().endsWith(".png") ? "png" : "jpg";
      const tmpFile = join(tmpRoot, `${locale.id}.${ext}`);
      const dlOk = await downloadToFile(imgUrl, tmpFile);
      if (!dlOk) {
        console.log(
          `  [${card.number}] ${locale.name.slice(0, 20).padEnd(20)} → ✗ download fail`
        );
        result.fetchFail++;
        continue;
      }

      const remotePath = `${locale.id}.${ext}`;
      const ct = ext === "png" ? "image/png" : "image/jpeg";
      const publicUrl = await uploadToSupabase(tmpFile, remotePath, ct);
      await unlink(tmpFile).catch(() => {});

      if (!publicUrl) {
        console.log(
          `  [${card.number}] ${locale.name.slice(0, 20).padEnd(20)} → ✗ upload fail`
        );
        result.fetchFail++;
        continue;
      }

      await prisma.regionCard.update({
        where: { id: locale.id },
        data: { imageSmall: publicUrl, imageLarge: publicUrl },
      });
      console.log(
        `  [${card.number}] ${locale.name.slice(0, 20).padEnd(20)} → ✓ img ${remotePath}`
      );
      result.imageFilled++;
    }
  }

  return result;
}

async function main() {
  const tmpRoot = join(tmpdir(), `raredoc-adv-ill-${Date.now()}`);
  await mkdir(tmpRoot, { recursive: true });

  const source = await prisma.externalSource.findUniqueOrThrow({
    where: { code: "bulbapedia" },
  });

  const arg = process.argv.find((a) => a.startsWith("--set="));
  const setsToRun = arg
    ? SETS.filter((s) => s.setId === arg.slice("--set=".length).toUpperCase())
    : SETS;

  const totals = {
    illustratorFilled: 0,
    illustratorSkipped: 0,
    imageFilled: 0,
    imageSkipped: 0,
    unmatched: 0,
    fetchFail: 0,
  };

  for (const set of setsToRun) {
    const r = await scrapeSet(set, source, tmpRoot);
    totals.illustratorFilled += r.illustratorFilled;
    totals.illustratorSkipped += r.illustratorSkipped;
    totals.imageFilled += r.imageFilled;
    totals.imageSkipped += r.imageSkipped;
    totals.unmatched += r.unmatched;
    totals.fetchFail += r.fetchFail;

    console.log(
      `  → 일러스트레이터 채움: ${r.illustratorFilled}, ` +
      `스킵: ${r.illustratorSkipped}` +
      (set.needImage ? `, 이미지 채움: ${r.imageFilled}, 이미지 스킵: ${r.imageSkipped}` : "") +
      `, 미매칭: ${r.unmatched}, 실패: ${r.fetchFail}`
    );
  }

  console.log(`\n══════ 전체 결과 ══════`);
  console.log(`  일러스트레이터 채움: ${totals.illustratorFilled}`);
  console.log(`  일러스트레이터 스킵(이미 있음): ${totals.illustratorSkipped}`);
  console.log(`  이미지 채움: ${totals.imageFilled}`);
  console.log(`  이미지 스킵(이미 있음): ${totals.imageSkipped}`);
  console.log(`  Bulbapedia 미매칭(DB 없음): ${totals.unmatched}`);
  console.log(`  fetch/dl/upload 실패: ${totals.fetchFail}`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
