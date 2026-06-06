/**
 * 한국판 공식 카드 전수 수집기 (재사용 가능). pokemoncard.co.kr = 한국 공식 원천.
 *   목록 = AJAX multipart POST (search_text_cards) → 30건/페이지, result 는 dict-of-values 또는 array.
 *   상세 = 정적 서버렌더 HTML (koName·일러스트레이터·번호/레어도).
 *   curl 을 child_process.execFile 로 호출(노드 fetch 가 막힘). 상세 fetch 사이 ~150ms sleep.
 *
 * 출력 스키마(배열, data/kr-official/kr-official-<code>.json 과 동일):
 *   { setCode, number, koName, illustrator, image, detailId, numberFull }
 *   소비처: scripts/apply-kr-official.ts (number·koName·illustrator·image), scripts/backfill-jp-rarity-kr.ts (number·detailId)
 *
 * 실행: npx tsx scripts/collect-kr-pokemoncard.ts "<searchText>" <outCode> [expectedSetCode]
 *   예: npx tsx scripts/collect-kr-pokemoncard.ts "썬 컬렉션" sm1s SM1S
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const execFileP = promisify(execFile);

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const AJAX_URL = "https://pokemoncard.co.kr/v2/ajax2_dev2";
const DETAIL_BASE = "https://pokemoncard.co.kr/cards/detail";
const IMG_BASE = "https://cards.image.pokemonkorea.co.kr/data";
const OUT_DIR = join(__dirname, "..", "data", "kr-official");
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type ListItem = { CardNum: string; feature_image: string };
type Card = {
  setCode: string;
  number: string;
  koName: string | null;
  illustrator: string | null;
  image: string | null;
  detailId: string | null;
  numberFull: string | null;
};

// ── 목록 AJAX 한 페이지 (limit = 0-based 페이지 인덱스) ──
async function fetchListPage(searchText: string, page: number): Promise<ListItem[]> {
  const { stdout } = await execFileP(
    "curl",
    [
      "-sSL", "--max-time", "25",
      "-X", "POST", AJAX_URL,
      "-H", "X-Requested-With: XMLHttpRequest",
      "-H", "Referer: https://pokemoncard.co.kr/cards",
      "-H", "Origin: https://pokemoncard.co.kr",
      "-A", UA,
      "-F", "action=search_text_cards",
      "-F", `search_text=${searchText}`,
      "-F", "search_params=all",
      "-F", `limit=${page}`,
    ],
    { maxBuffer: 16 * 1024 * 1024 },
  );
  let data: any;
  try {
    data = JSON.parse(stdout);
  } catch {
    throw new Error(`AJAX 응답 파싱 실패 (page=${page}): ${stdout.slice(0, 200)}`);
  }
  if (data && data.msg && /접근불가/.test(String(data.msg))) {
    throw new Error(`서버 거부(접근불가) — 헤더 누락 의심: ${JSON.stringify(data.msg)}`);
  }
  const result = data?.result;
  let items: any[] = [];
  if (Array.isArray(result)) items = result;
  else if (result && typeof result === "object") items = Object.values(result);
  return items.filter(
    (x): x is ListItem => x && typeof x === "object" && typeof x.feature_image === "string",
  );
}

// ── feature_image 경로에서 setCode·number 추출 ──
// setCode = 디렉터리 세그먼트(권위), number = 파일명 끝 "_NNN".
// 주의: 디렉터리명 ≠ 파일 접두사인 경우 있음 (예: SM1+/SM1plus_111.png → setCode SM1+, number 111).
function parseImagePath(featureImage: string): { setCode: string | null; number: string | null } {
  const clean = featureImage.split("?")[0]; // 쿼리스트링 제거
  // ".../{SETCODE}/{filePrefix}_{NNN}[_{변형}].png|jpg" (구형 XY 등은 .jpg, 변형 접미어 _2/_L 등 존재: K1_Y_040_2.jpg → 040, SVI_029_L.png → 029)
  const m = clean.match(/\/([^/]+)\/[^/]*?_(\d+)(?:_[A-Za-z\d]+)?\.(?:png|jpe?g|webp)$/i);
  if (m) return { setCode: m[1], number: m[2].padStart(3, "0") };
  // 폴백: 디렉터리 없이 마지막 세그먼트 prefix_NNN.* 만 있을 때 prefix 사용
  const m2 = clean.match(/\/([^/]+?)_(\d+)(?:_[A-Za-z\d]+)?\.(?:png|jpe?g|webp)$/i);
  if (m2) return { setCode: m2[1], number: m2[2].padStart(3, "0") };
  return { setCode: null, number: null };
}

// ── 상세 HTML 파싱 ──
function parseDetail(html: string): { koName: string | null; illustrator: string | null; numberFull: string | null; rarity: string | null } {
  const out: { koName: string | null; illustrator: string | null; numberFull: string | null; rarity: string | null } = {
    koName: null, illustrator: null, numberFull: null, rarity: null,
  };
  // koName: <span class="card-hp title">NAME</span>
  const kn = html.match(/<span[^>]*class=["'][^"']*\bcard-hp\b[^"']*\btitle\b[^"']*["'][^>]*>([\s\S]*?)<\/span>/i);
  if (kn) {
    const t = kn[1].replace(/<[^>]+>/g, "").trim();
    out.koName = t || null;
  }
  // illustrator: <p class="illustrator">일러스트<br/>NAME</p> (에너지 등은 부재 → null)
  const il = html.match(/<p[^>]*class=["'][^"']*\billustrator\b[^"']*["'][^>]*>[\s\S]*?<br\s*\/?>([\s\S]*?)<\/p>/i);
  if (il) {
    const t = il[1].replace(/<[^>]+>/g, "").trim();
    out.illustrator = t || null;
  }
  // numberFull + rarity: <span class="p_num">001/071<span id="no_wrap_by_admin"> C </span></span>
  const pn = html.match(/<span[^>]*class=["'][^"']*\bp_num\b[^"']*["'][^>]*>([\s\S]*?)<\/span>\s*<\/span>/i)
    ?? html.match(/<span[^>]*class=["'][^"']*\bp_num\b[^"']*["'][^>]*>([\s\S]*?)<\/span>/i);
  if (pn) {
    const block = pn[1];
    // numberFull = no_wrap_by_admin 앞쪽 텍스트(태그 제거)에서 "NNN/MMM" 패턴
    const numMatch = block.replace(/<[^>]+>[\s\S]*/, "").replace(/<[^>]+>/g, "").trim().match(/(\d+\/\d+)/);
    out.numberFull = numMatch ? numMatch[1] : block.replace(/<[^>]+>/g, " ").trim().split(/\s+/)[0] || null;
  }
  // rarity: <span id="no_wrap_by_admin">CODE</span>
  const rr = html.match(/<span[^>]*id=["']no_wrap_by_admin["'][^>]*>([\s\S]*?)<\/span>/i);
  if (rr) {
    const t = rr[1].replace(/<[^>]+>/g, "").trim();
    out.rarity = t || null;
  }
  return out;
}

async function fetchDetail(detailId: string): Promise<string | null> {
  try {
    const { stdout } = await execFileP(
      "curl",
      [
        "-sSL", "--max-time", "25",
        "-A", UA,
        "-H", "Referer: https://pokemoncard.co.kr/cards",
        "-H", "Accept-Language: ko-KR,ko;q=0.9",
        `${DETAIL_BASE}/${detailId}`,
      ],
      { maxBuffer: 8 * 1024 * 1024 },
    );
    return stdout;
  } catch (e) {
    return null;
  }
}

async function main() {
  const [searchText, outCode, expectedSetCode] = process.argv.slice(2);
  if (!searchText || !outCode) {
    console.error('사용법: npx tsx scripts/collect-kr-pokemoncard.ts "<searchText>" <outCode> [expectedSetCode]');
    process.exit(1);
  }
  const expect = expectedSetCode ? expectedSetCode.toUpperCase() : null;
  console.log(`[수집] search="${searchText}" out=kr-official-${outCode}.json expect=${expect ?? "(없음)"}`);

  // 1) 목록 전수 (page 0부터, <30건이면 마지막)
  const raw: ListItem[] = [];
  for (let page = 0; ; page++) {
    const items = await fetchListPage(searchText, page);
    console.log(`  목록 page=${page}: ${items.length}건`);
    raw.push(...items);
    if (items.length < 30) break;
    await sleep(0.15 * 1000);
  }

  // 2) detailId(CardNum) 기준 중복 제거 + image 경로로 setCode/number 파싱 + expect 필터
  const seen = new Set<string>();
  type Pre = { detailId: string; setCode: string; number: string; image: string };
  const pre: Pre[] = [];
  let skippedWrongSet = 0;
  for (const it of raw) {
    const detailId = it.CardNum;
    const { setCode, number } = parseImagePath(it.feature_image);
    if (!setCode || !number) continue;
    if (expect && setCode.toUpperCase() !== expect) { skippedWrongSet++; continue; }
    if (!detailId || seen.has(detailId)) continue;
    seen.add(detailId);
    const cleanImg = it.feature_image.split("?")[0];
    pre.push({ detailId, setCode, number, image: `${IMG_BASE}/${cleanImg}` });
  }
  if (skippedWrongSet > 0) console.log(`  expect 불일치로 제외: ${skippedWrongSet}건`);

  // setCode 일관성 검사
  const setCodes = new Set(pre.map((p) => p.setCode.toUpperCase()));
  if (setCodes.size > 1) {
    console.warn(`  ⚠ setCode 혼재: ${[...setCodes].join(", ")}`);
  }
  if (expect && pre.length > 0 && !setCodes.has(expect)) {
    throw new Error(`expectedSetCode=${expect} 인데 수집 setCode=${[...setCodes].join(",")} — 검색어 오류 의심`);
  }
  if (pre.length === 0) {
    throw new Error(`수집 0건 — 검색어 "${searchText}" 가 결과 없음/불일치. 변형 검색어 시도 필요.`);
  }

  // 정렬 (번호 오름차순)
  pre.sort((a, b) => parseInt(a.number, 10) - parseInt(b.number, 10));

  // 3) 상세 수집 (~150ms sleep)
  const cards: Card[] = [];
  for (let i = 0; i < pre.length; i++) {
    const p = pre[i];
    const html = await fetchDetail(p.detailId);
    const d = html ? parseDetail(html) : { koName: null, illustrator: null, numberFull: null, rarity: null };
    // 번호는 상세페이지 numberFull(p_num) 분자 우선 — 이미지파일명 변칙(K1_Y_040_2.jpg=실제 041) 회피
    const nfM = d.numberFull ? d.numberFull.match(/^(\d+)\//) : null;
    const authNum = nfM ? nfM[1].padStart(3, "0") : p.number;
    process.stdout.write(`  [${i + 1}/${pre.length}] #${authNum} ${d.koName ?? "?"} / ${d.rarity ?? "-"}\n`);
    cards.push({
      setCode: p.setCode.toUpperCase(),
      number: authNum,
      koName: d.koName,
      illustrator: d.illustrator,
      image: p.image,
      detailId: p.detailId,
      numberFull: d.numberFull,
    });
    await sleep(0.15 * 1000);
  }

  // 4) 저장
  mkdirSync(OUT_DIR, { recursive: true });
  const outPath = join(OUT_DIR, `kr-official-${outCode}.json`);
  writeFileSync(outPath, JSON.stringify(cards, null, 2) + "\n", "utf8");

  // 5) 검증 보고
  const koCov = cards.filter((c) => c.koName).length;
  const ilCov = cards.filter((c) => c.illustrator).length;
  const idCov = cards.filter((c) => c.detailId).length;
  const nums = cards.map((c) => parseInt(c.number, 10));
  const dupNums = nums.filter((n, i) => nums.indexOf(n) !== i);
  console.log(`\n=== ${outCode} 검증 ===`);
  console.log(`총 ${cards.length}건 | setCode: ${[...setCodes].join(",")}`);
  console.log(`koName ${koCov}/${cards.length} | illustrator ${ilCov}/${cards.length} | detailId ${idCov}/${cards.length}`);
  console.log(`번호 ${cards.length ? cards[0].number : "-"}~${cards.length ? cards[cards.length - 1].number : "-"} | 중복번호 ${dupNums.length ? [...new Set(dupNums)].join(",") : "없음"}`);
  console.log(`#1 = ${cards[0]?.koName ?? "?"}`);
  console.log(`저장: ${outPath}`);
}

main().catch((e) => {
  console.error("실패:", e?.message ?? e);
  process.exit(1);
});
