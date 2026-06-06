/**
 * [임시·SVI] KR 「스타터 세트 ex」 통합판(SVI 066+시크릿) 전수 수집 — CardNum 대역 스캔.
 *   검색 AJAX 로는 전체 열거 불가(검색어별 부분 노출) + 이미지 파일명 `_L` 접미 변형.
 *   SVI 는 CardNum 연번 대역(BS2024006001~)에 등록 → 대역을 순회하며 상세 HTML 에서
 *   이미지 경로가 /SVI/ 인 것만 채택. 출력 스키마 = collect-kr-pokemoncard 와 동일.
 * 실행: npx tsx scripts/tmp-collect-svi-range.ts
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

function parse(html: string) {
  const img = html.match(/(cards\.image\.pokemonkorea\.co\.kr\/data\/[^"']*\/SVI\/SVI_(\d+)_[^"'?]*)/);
  if (!img) return null; // SVI 아님
  const kn = html.match(/card-hp title[^>]*>([\s\S]*?)<\/span>/i);
  const il = html.match(/<p[^>]*class=["'][^"']*\billustrator\b[^"']*["'][^>]*>[\s\S]*?<br\s*\/?>([\s\S]*?)<\/p>/i);
  const pn = html.match(/p_num[^>]*>([\s\S]{0,120}?)<\/span>/i);
  const numFull = pn ? (pn[1].replace(/<[^>]+>[\s\S]*/, "").replace(/<[^>]+>/g, "").trim().match(/(\d+\/\d+)/)?.[1] ?? null) : null;
  const nfM = numFull?.match(/^(\d+)\//);
  return {
    number: (nfM ? nfM[1] : img[2]).padStart(3, "0"),
    koName: kn ? kn[1].replace(/<[^>]+>/g, "").trim() : null,
    illustrator: il ? il[1].replace(/<[^>]+>/g, "").trim() || null : null,
    image: `https://${img[1]}`,
    numberFull: numFull,
  };
}

async function main() {
  const cards: any[] = [];
  let misses = 0;
  for (let i = 1; i <= 140 && misses < 25; i++) {
    const id = `BS2024006${String(i).padStart(3, "0")}`;
    const html = await fetchDetail(id);
    await sleep(150);
    if (!html) { misses++; continue; }
    const c = parse(html);
    if (!c) { misses++; process.stdout.write(`  ${id}: SVI 아님/없음 (연속미스 ${misses})\n`); continue; }
    misses = 0;
    cards.push({ setCode: "SVI", number: c.number, koName: c.koName, illustrator: c.illustrator, image: c.image, detailId: id, numberFull: c.numberFull });
    process.stdout.write(`  [${cards.length}] ${id} → #${c.number} ${c.koName}\n`);
  }
  cards.sort((a, b) => parseInt(a.number, 10) - parseInt(b.number, 10));
  const nums = new Set(cards.map((c) => parseInt(c.number, 10)));
  const max = Math.max(...nums);
  const gaps = []; for (let n = 1; n <= max; n++) if (!nums.has(n)) gaps.push(n);
  writeFileSync("data/kr-official/kr-official-svi.json", JSON.stringify(cards, null, 2) + "\n", "utf8");
  console.log(`\n=== svi: ${cards.length}장 | 번호 1~${max} | 갭 [${gaps.join(",") || "없음"}]`);
  console.log(`koName ${cards.filter((c) => c.koName).length}/${cards.length} | illustrator ${cards.filter((c) => c.illustrator).length}/${cards.length}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
