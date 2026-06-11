/**
 * PMCG1 (拡張パック, 1996) 카드 102장의 이미지를 Bulbapedia 에서 수집해
 * RegionCard.imageSmall/imageLarge 에 기록.
 *
 * 전략:
 *   1) https://bulbapedia.bulbagarden.net/wiki/Expansion_Pack_(TCG) 의
 *      "Expansion Pack" (Japanese) 테이블에서 102개 카드 순서대로 영문 슬러그 추출
 *   2) 각 카드 페이지 fetch → 첫 non-UI 이미지 URL 추출
 *   3) RegionCard.{imageSmall,imageLarge} 업데이트, ExternalIdMapping 등록
 *
 * 라이선스: Bulbapedia 콘텐츠 CC BY-NC-SA 2.5 — 출처 표시 필수, 상업 사용 제한.
 *
 * 호출: ~110 GET 요청 (set 1 + cards 102 + 약간). 카드당 800ms sleep.
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const execFileP = promisify(execFile);

const SET_URL = "https://bulbapedia.bulbagarden.net/wiki/Expansion_Pack_(TCG)";
const WIKI_BASE = "https://bulbapedia.bulbagarden.net";
const ARCH_BASE = "https://archives.bulbagarden.net";
const USER_AGENT = "raredoc-image-collector/0.1 (https://raredoc.local; non-commercial card metadata)";

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

/** 페이지에서 첫 카드 이미지(non-UI) 의 풀 URL 추출 */
function extractCardImage(html: string): string | null {
  // 패턴: archives.bulbagarden.net/media/upload/{x}/{xx}/{Filename}.{ext}
  // thumb 도 매칭: /media/upload/thumb/{x}/{xx}/{Filename}.{ext}/{...px}-{Filename}.{ext}
  const re =
    /archives\.bulbagarden\.net\/media\/upload\/(?:thumb\/)?([a-f0-9])\/([a-f0-9]{2})\/([A-Z][^"\/<>\s]+?\.(?:jpg|png|webp))/g;
  const seen = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const [, x, xx, filename] = m;
    const key = filename;
    if (seen.has(key)) continue;
    seen.add(key);
    if (isUiAsset(filename)) continue;
    // 원본 URL (thumb 가 아닌)
    return `${ARCH_BASE}/media/upload/${x}/${xx}/${filename}`;
  }
  return null;
}

type CardRow = { slug: string; name: string };

/** Expansion Pack (TCG) 페이지의 Japanese 테이블에서 102장 추출 (순서대로) */
async function extractCardList(): Promise<CardRow[]> {
  const html = await fetchHtml(SET_URL);
  if (!html) throw new Error("set page fetch failed");
  // Japanese 拡張パック section: id="Expansion_Pack"
  const startIdx = html.indexOf('id="Expansion_Pack"');
  if (startIdx === -1) throw new Error("Expansion_Pack section not found");
  // 끝: 다음 section 시작
  const endIdx = html.indexOf('id="Starter_Deck"', startIdx);
  const chunk = html.slice(startIdx, endIdx > 0 ? endIdx : startIdx + 200000);

  const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/g;
  const linkRe = /\/wiki\/([^"']+?)_\(Expansion_Pack\)/;
  const nameRe = /\/wiki\/[^"']+_\(Expansion_Pack\)"[^>]*>([^<]+)<\/a>/;
  const cards: CardRow[] = [];
  let m: RegExpExecArray | null;
  while ((m = rowRe.exec(chunk)) !== null) {
    const row = m[1];
    const lm = row.match(linkRe);
    if (!lm) continue;
    const nm = row.match(nameRe);
    cards.push({ slug: lm[1], name: nm ? nm[1] : lm[1].replace(/_/g, " ") });
  }
  return cards;
}

async function main() {
  const source = await prisma.externalSource.upsert({
    where: { code: "bulbapedia" },
    create: {
      code: "bulbapedia",
      name: "Bulbapedia (Bulbagarden)",
      kind: "image",
      region: "GLOBAL",
      baseUrl: "https://bulbapedia.bulbagarden.net",
      priority: 30,
      notes: "CC BY-NC-SA 2.5. Card images are EN equivalents for JP pre-2003 sets (same illustration, English text).",
    },
    update: {},
  });

  console.log("─── PMCG1: 102 카드 ─── (Bulbapedia 영문 이미지)\n");
  const cards = await extractCardList();
  if (cards.length !== 102) {
    console.log(`⚠ 카드 수 불일치: ${cards.length}장 추출됨 (기대 102)`);
  }

  let okCount = 0;
  let skipCount = 0;
  let failCount = 0;
  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    const cardNum = String(i + 1).padStart(3, "0");
    const ourLocaleId = `jp-tcg-PMCG1-${cardNum}`;
    const ourLogicalId = `lc-orphan-${ourLocaleId}`;

    const locale = await prisma.regionCard.findUnique({
      where: { id: ourLocaleId },
      select: { id: true, imageSmall: true, name: true },
    });
    if (!locale) {
      console.log(`  [${cardNum}] ${card.name.padEnd(20)} → DB row 없음, skip`);
      failCount++;
      continue;
    }
    if (locale.imageSmall) {
      console.log(`  [${cardNum}] ${card.name.padEnd(20)} → 이미 이미지 있음, skip`);
      skipCount++;
      continue;
    }

    const cardUrl = `${WIKI_BASE}/wiki/${card.slug}_(Expansion_Pack)`;
    const cardHtml = await fetchHtml(cardUrl);
    await sleep(800);
    if (!cardHtml) {
      console.log(`  [${cardNum}] ${card.name.padEnd(20)} → ✗ fetch fail`);
      failCount++;
      continue;
    }
    const imgUrl = extractCardImage(cardHtml);
    if (!imgUrl) {
      console.log(`  [${cardNum}] ${card.name.padEnd(20)} → ✗ image 추출 실패`);
      failCount++;
      continue;
    }

    await prisma.regionCard.update({
      where: { id: ourLocaleId },
      data: { imageSmall: imgUrl, imageLarge: imgUrl },
    });
    await prisma.externalIdMapping.upsert({
      where: { sourceId_externalId: { sourceId: source.id, externalId: `${card.slug}_(Expansion_Pack)` } },
      create: {
        sourceId: source.id,
        externalId: `${card.slug}_(Expansion_Pack)`,
        regionCardId: ourLocaleId,
        cardId: ourLogicalId,
        url: cardUrl,
        verifiedBy: "auto:scrape-pmcg1-images-bulbapedia",
        confidence: 0.7, // 영문 카드 대체 이미지 — 일본어 텍스트 아님
        notes: "Bulbapedia EN Base Set image used as proxy. Image text is English, not Japanese.",
      },
      update: { regionCardId: ourLocaleId, cardId: ourLogicalId, url: cardUrl },
    });
    console.log(`  [${cardNum}] ${card.name.padEnd(20)} → ✓ ${imgUrl.split("/").pop()}`);
    okCount++;
  }

  console.log(`\n── 결과 ──`);
  console.log(`  성공: ${okCount}`);
  console.log(`  이미 있음(skip): ${skipCount}`);
  console.log(`  실패: ${failCount}`);
  console.log(`  ExternalIdMapping: bulbapedia source 등록 + 카드별 매핑`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
