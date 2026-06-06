/**
 * [임시·범용] KR CardNum 연번 대역 스캔 수집기 — 검색 열거가 불가한 세트용 (SVI 전례 일반화).
 *   상세 페이지를 대역 순회하며 이미지 경로 /{DIR}/ 매칭분만 채택. 출력 = collect-kr-pokemoncard 스키마.
 * 실행: npx tsx scripts/tmp-collect-kr-range.ts <prefix> <start> <end> <imgDir> <outCode> [padWidth=9] [missLimit=30]
 *   예: npx tsx scripts/tmp-collect-kr-range.ts SP 1 220 S-P s-p
 */
import { writeFileSync } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const execFileP = promisify(execFile);

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchDetail(id: string): Promise<string | null> {
  try {
    const { stdout } = await execFileP("curl", ["-sSL", "--max-time", "20", "-A", UA,
      "-H", "Referer: https://pokemoncard.co.kr/cards", "-H", "Accept-Language: ko-KR,ko;q=0.9",
      `https://pokemoncard.co.kr/cards/detail/${id}`], { maxBuffer: 8 * 1024 * 1024 });
    return stdout || null;
  } catch { return null; }
}

async function main() {
  const [prefix, startS, endS, imgDir, outCode, padS, missS] = process.argv.slice(2);
  if (!prefix || !startS || !endS || !imgDir || !outCode) {
    console.error("usage: <prefix> <start> <end> <imgDir> <outCode> [padWidth=9] [missLimit=30]");
    process.exit(1);
  }
  const pad = parseInt(padS ?? "9", 10), missLimit = parseInt(missS ?? "30", 10);
  const dirEsc = imgDir.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const imgRe = new RegExp(`(cards\\.image\\.pokemonkorea\\.co\\.kr/data/[^"']*/${dirEsc}/[^"'?]*?_(\\d+)[^"'?]*)`);

  const cards: any[] = [];
  let misses = 0;
  for (let i = parseInt(startS, 10); i <= parseInt(endS, 10) && misses < missLimit; i++) {
    const id = `${prefix}${String(i).padStart(pad, "0")}`;
    const html = await fetchDetail(id);
    await sleep(150);
    if (!html) { misses++; continue; }
    const img = html.match(imgRe);
    if (!img) { misses++; continue; }
    misses = 0;
    const kn = html.match(/card-hp title[^>]*>([\s\S]*?)<\/span>/i);
    const il = html.match(/<p[^>]*class=["'][^"']*\billustrator\b[^"']*["'][^>]*>[\s\S]*?<br\s*\/?>([\s\S]*?)<\/p>/i);
    const pn = html.match(/p_num[^>]*>([\s\S]{0,120}?)<\/span>/i);
    const numberFull = pn ? (pn[1].replace(/<[^>]+>[\s\S]*/, "").replace(/<[^>]+>/g, "").trim().match(/(\d+\/\d+)/)?.[1] ?? null) : null;
    const number = (numberFull?.match(/^(\d+)\//)?.[1] ?? img[2]).padStart(3, "0");
    cards.push({
      setCode: imgDir.toUpperCase(), number,
      koName: kn ? kn[1].replace(/<[^>]+>/g, "").trim() : null,
      illustrator: il ? il[1].replace(/<[^>]+>/g, "").trim() || null : null,
      image: `https://${img[1]}`, detailId: id, numberFull,
    });
    process.stdout.write(`  [${cards.length}] ${id} → #${number} ${cards[cards.length - 1].koName}\n`);
  }
  cards.sort((a, b) => parseInt(a.number, 10) - parseInt(b.number, 10));
  writeFileSync(`data/kr-official/kr-official-${outCode}.json`, JSON.stringify(cards, null, 2) + "\n", "utf8");
  const nums = cards.map((c) => parseInt(c.number, 10));
  console.log(`\n=== ${outCode}: ${cards.length}장 | 번호 ${Math.min(...nums)}~${Math.max(...nums)} | koName ${cards.filter((c) => c.koName).length} | illus ${cards.filter((c) => c.illustrator).length}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
