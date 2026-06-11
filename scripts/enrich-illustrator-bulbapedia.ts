/**
 * PMCG1~6 카드의 Card.illustrator 를 Bulbapedia 에서 추출.
 *
 * - 대상: ExternalIdMapping(source=bulbapedia) 가 있는 카드 (≈339장)
 * - 추출: 페이지 HTML 의 wgCategories 의 "Illus. by {name}" 항목 첫 번째
 *   (대체 인쇄본이 있어도 원판 일러스트가 보통 첫째)
 * - 정책: illustrator 가 이미 있으면 덮어쓰지 않음
 *
 * 호출: ~339 × 800ms ≈ 5분
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const execFileP = promisify(execFile);

const USER_AGENT = "raredoc-meta-enricher/0.1 (https://raredoc.local; non-commercial card metadata)";

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

function extractIllustrator(html: string): string | null {
  // wgCategories: "Illus. by {Name}" — JSON 배열 안에 있음
  const m = html.match(/"Illus\.\s+by\s+([^"]+)"/);
  if (m) return m[1].trim();
  // 폴백: 본문의 Illus. <a>{Name}</a> 패턴
  const m2 = html.match(/Illus\.\s+<a[^>]*>([^<]+)<\/a>/);
  if (m2) return m2[1].trim();
  return null;
}

async function main() {
  const source = await prisma.externalSource.findUniqueOrThrow({ where: { code: "bulbapedia" } });
  const mappings = await prisma.externalIdMapping.findMany({
    where: {
      sourceId: source.id,
      OR: [
        { cardId: { startsWith: "lc-orphan-jp-tcg-PMCG" } },
        { cardId: { startsWith: "lc-orphan-jp-tcg-neo" } },
        { cardId: { startsWith: "lc-orphan-jp-tcg-E" } },
        { cardId: { startsWith: "lc-orphan-jp-tcg-VS" } },
        { cardId: { startsWith: "lc-orphan-jp-tcg-web" } },
      ],
    },
    select: { externalId: true, url: true, cardId: true, regionCardId: true },
  });
  console.log(`대상 ${mappings.length} Bulbapedia 매핑\n`);

  let updated = 0;
  let skipped = 0;
  let noUrl = 0;
  let noMatch = 0;
  let alreadyHas = 0;

  for (const m of mappings) {
    if (!m.url) { noUrl++; continue; }
    if (!m.cardId) continue;

    const lc = await prisma.card.findUnique({
      where: { id: m.cardId },
      select: { id: true, illustrator: true },
    });
    if (!lc) continue;
    if (lc.illustrator) { alreadyHas++; skipped++; continue; }

    const html = await fetchHtml(m.url);
    await sleep(700);
    if (!html) { noMatch++; continue; }

    const ill = extractIllustrator(html);
    if (!ill) { noMatch++; continue; }

    await prisma.card.update({
      where: { id: lc.id },
      data: { illustrator: ill },
    });
    updated++;
    if (updated % 25 === 0) console.log(`  ... ${updated} 채움  (마지막: ${ill})`);
  }

  console.log(`\n── 결과 ──`);
  console.log(`  업데이트: ${updated}`);
  console.log(`  이미 있음 (skip): ${alreadyHas}`);
  console.log(`  URL 없음: ${noUrl}`);
  console.log(`  추출 실패: ${noMatch}`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
