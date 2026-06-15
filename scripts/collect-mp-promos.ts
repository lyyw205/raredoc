/**
 * M-P (JP MEGA 프로모) 전수 스캐너 — 공식 pokemon-card.com.
 *
 * M-P 프로모는 단일 expansion 이 아니라 배포 제품(pg)마다 2~7장으로 쪼개져 있고,
 * 카드번호(NNN/M-P)는 제품을 가로지르는 전역 일련번호다. 따라서 단일 pg 로는 못 모은다.
 *   → pg 대역을 스캔(resultAPI)해 cardThumbFile 이 /M-P/ 인 카드를 전부 수집,
 *     기존 jp-m-p.json(70장) 에 없는 cardID 만 detail 파싱해 누락분을 채운다.
 *
 * resultAPI.php?pg={pg}&page={N} → cardList[{cardID, cardThumbFile, cardNameViewText}]
 *   cardThumbFile = /assets/.../large/M-P/{fileid}_X_NAME.jpg.jpg (이중 확장자)
 *   fileid(6자리) = cardID(5자리) zero-pad. number 는 detail 의 subtext "NNN / M-P" 에만 있음.
 *
 * 실행: npx tsx scripts/collect-mp-promos.ts [pgStart] [pgEnd] [outPath]
 *   기본: 10960 11200 data/jp-official/jp-m-p-missing.json
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { dirname } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const execFileP = promisify(execFile);

const BASE = "https://www.pokemon-card.com";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const SLEEP = parseInt(process.env.JP_SLEEP_MS ?? "200", 10);

const curlText = async (url: string): Promise<string> => {
  try {
    const { stdout } = await execFileP("curl", ["-sSL", "--max-time", "25", url], { maxBuffer: 16 * 1024 * 1024 });
    return stdout;
  } catch { return ""; }
};
// 레이트리밋/일시 실패 대비 재시도. JSON 파싱 실패도 재시도.
const curlJson = async (url: string, retries = 3): Promise<any> => {
  for (let i = 0; i < retries; i++) {
    const t = await curlText(url);
    try { const j = JSON.parse(t); return j; } catch { await sleep(500 * (i + 1)); }
  }
  return null;
};

const decode = (s: string) =>
  s.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#039;/g, "'").replace(/&quot;/g, '"');
const stripTags = (s: string) => decode(s.replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();

const TYPE_ICON: Record<string, string> = {
  grass: "Grass", fire: "Fire", water: "Water", lightning: "Lightning", electric: "Lightning", psychic: "Psychic",
  fighting: "Fighting", darkness: "Darkness", dark: "Darkness", metal: "Metal", steel: "Metal", fairy: "Fairy",
  dragon: "Dragon", colorless: "Colorless", none: "Colorless",
};

type Rec = {
  jaName: string; number: string; numberFull: string | null; rarity: string | null;
  illustrator: string | null; category: string | null; stage: string | null; suffix: string | null;
  trainerType: string | null; hp: number | null; types: string[]; dexId: number | null;
  image: string | null; cardID: string; detailUrl: string;
};

function parseSuffix(name: string): string | null {
  if (/VMAX$/i.test(name)) return "VMAX";
  if (/VSTAR$/i.test(name)) return "VSTAR";
  if (/GX$/i.test(name)) return "GX";
  if (/(?<![A-Za-z])EX$/i.test(name) || /ＥＸ$/.test(name)) return "EX";
  if (/(ex)$/.test(name)) return "ex";
  if (/(?<![A-Za-z])V$/.test(name) || /Ｖ$/.test(name)) return "V";
  return null;
}
function parseStage(html: string): string | null {
  const m = html.match(/<span class="type">([\s\S]*?)<\/span>/);
  if (!m) return null;
  const t = decode(m[1]).replace(/\s/g, "");
  if (/^M進化/.test(t) || /^メガ進化/.test(t)) return "MEGA";
  if (/^たね/.test(t) || /^基本/.test(t)) return "Basic";
  if (/^1進化/.test(t) || /^一進化/.test(t)) return "Stage1";
  if (/^2進化/.test(t) || /^二進化/.test(t)) return "Stage2";
  return null;
}
function parseCategory(html: string, imgFile: string): { category: string | null; trainerType: string | null } {
  // imgFile 접두: _P_=Pokemon, _T_=Trainer, _E_=Energy
  const tag = imgFile.match(/^[0-9]+_([PTE])_/)?.[1];
  if (tag === "E") return { category: "Energy", trainerType: null };
  if (tag === "T") {
    let tt: string | null = null;
    if (/サポート/.test(html)) tt = "Supporter";
    else if (/グッズ/.test(html)) tt = "Item";
    else if (/スタジアム/.test(html)) tt = "Stadium";
    else if (/ポケモンのどうぐ/.test(html)) tt = "Pokémon Tool";
    return { category: "Trainer", trainerType: tt };
  }
  return { category: "Pokemon", trainerType: null };
}
function parseTypes(html: string): string[] {
  const m = html.match(/<span class="icon">([\s\S]*?)<\/span>/);
  if (!m) return [];
  const out: string[] = [];
  for (const im of m[1].matchAll(/icon-([a-z]+)\s+icon/g)) { const t = TYPE_ICON[im[1]]; if (t) out.push(t); }
  return out;
}
function parseHp(html: string): number | null {
  const m = html.match(/<span class="hp-num">\s*(\d+)\s*<\/span>/); return m ? parseInt(m[1], 10) : null;
}
function parseDex(html: string): number | null {
  const m = html.match(/No\.(\d{1,4})/); return m ? parseInt(m[1], 10) : null;
}
function parseIllustrator(html: string): string | null {
  const m = html.match(/イラストレーター<\/h4>\s*<a[^>]*>([\s\S]*?)<\/a>/); return m ? stripTags(m[1]) || null : null;
}
// M-P 전용: subtext "NNN / M-P" — 우측이 숫자가 아니라 'M-P'
function parseNumberMP(html: string): { number: string | null; numberFull: string | null } {
  const m = html.match(/<div class="subtext[^"]*">([\s\S]*?)<\/div>/);
  if (!m) return { number: null, numberFull: null };
  const txt = stripTags(m[1]);
  const nf = txt.match(/(\d{1,3})\s*\/\s*(M-?P)/i);
  if (!nf) return { number: null, numberFull: null };
  return { number: nf[1].padStart(3, "0"), numberFull: `${nf[1].padStart(3, "0")}/M-P` };
}
function parseImage(html: string): { image: string | null; imgFile: string } {
  const m = html.match(/\/assets\/images\/card_images\/large\/M-P\/([0-9A-Za-z_]+\.jpg)/);
  if (!m) return { image: null, imgFile: "" };
  return { image: `${BASE}${m[0]}`, imgFile: m[1] };
}
async function fetchDetail(cardID: string): Promise<{ html: string; detailUrl: string } | null> {
  const primary = `${BASE}/card-search/details.php/card/${cardID}/regu/all`;
  let html = await curlText(primary);
  if (html && /<h1 class="Heading1/.test(html)) return { html, detailUrl: primary };
  const fallback = `${BASE}/card-search/details.php/card/${cardID}/`;
  html = await curlText(fallback);
  if (html && /<h1 class="Heading1/.test(html)) return { html, detailUrl: fallback };
  return null;
}
function parseCard(html: string, detailUrl: string, cardID: string): Rec | null {
  const nameM = html.match(/<h1 class="Heading1[^"]*">([\s\S]*?)<\/h1>/);
  if (!nameM) return null;
  const isMega = /pcg-megamark/.test(nameM[1]);
  let jaName = stripTags(nameM[1]);
  if (isMega && !/^(メガ|M)/.test(jaName)) jaName = "メガ" + jaName;
  const { image, imgFile } = parseImage(html);
  const { number, numberFull } = parseNumberMP(html);
  const { category, trainerType } = parseCategory(html, imgFile);
  const illustrator = parseIllustrator(html);
  const isPokemon = category === "Pokemon";
  return {
    jaName, number: number ?? "", numberFull, rarity: null, illustrator, category,
    stage: isPokemon ? parseStage(html) : null,
    suffix: isPokemon ? parseSuffix(jaName) : null,
    hp: isPokemon ? parseHp(html) : null,
    types: isPokemon ? parseTypes(html) : [],
    dexId: isPokemon ? parseDex(html) : null,
    image, cardID, detailUrl,
  };
}

async function main() {
  const pgStart = parseInt(process.argv[2] ?? "10900", 10);
  const pgEnd = parseInt(process.argv[3] ?? "11050", 10);
  const outPath = process.argv[4] ?? "data/jp-official/jp-m-p-full.json";

  // 기존 70장 (jp-m-p.json) 의 fileID/번호 — 신규/기존 구분용(필터는 안 함)
  const existing: Rec[] = existsSync("data/jp-official/jp-m-p.json")
    ? JSON.parse(readFileSync("data/jp-official/jp-m-p.json", "utf8")) : [];
  const haveNumbers = new Set(existing.map((c) => c.number));
  console.log(`■ M-P 전수 스캔(robust) | pg ${pgStart}..${pgEnd} | 기존 DB ${existing.length}장`);

  // 1) pg 대역 스캔 → /M-P/ cardID 전수 수집 (전페이지, 재시도)
  const mpCardIds = new Map<string, string>(); // cardID → thumbFile
  let failedPgs: number[] = [];
  for (let pg = pgStart; pg <= pgEnd; pg++) {
    let page = 1, maxPage = 1, ok = false;
    do {
      const url = `${BASE}/card-search/resultAPI.php?pg=${pg}&regulation_sidebar_form=all&page=${page}`;
      const d = await curlJson(url);
      await sleep(SLEEP);
      if (d == null) { failedPgs.push(pg); break; }
      ok = true;
      maxPage = parseInt(d.maxPage ?? "1", 10) || 1;
      let mpHere = 0;
      for (const c of d.cardList ?? []) {
        const tf: string = c.cardThumbFile ?? "";
        if (tf.includes("/M-P/")) { mpCardIds.set(String(c.cardID), tf); mpHere++; }
      }
      if (mpHere) console.log(`  pg=${pg} p${page}/${maxPage} hit=${d.hitCnt} M-P=${mpHere}`);
      page++;
    } while (page <= maxPage);
  }
  console.log(`\n  스캔 완료: M-P cardID ${mpCardIds.size}개${failedPgs.length ? ` | ⚠ 실패 pg ${failedPgs.length}개: ${failedPgs.join(",")}` : ""}`);

  // 2) 전 cardID detail 파싱 (재시도)
  const out: Rec[] = [];
  const noNumber: { cardID: string; jaName: string }[] = [];
  for (const cid of mpCardIds.keys()) {
    let det = await fetchDetail(cid);
    if (!det) { await sleep(800); det = await fetchDetail(cid); }
    await sleep(SLEEP);
    if (!det) { console.log(`  ✗ cid=${cid} detail 실패`); continue; }
    const rec = parseCard(det.html, det.detailUrl, cid);
    if (!rec || !rec.number || !rec.numberFull) { noNumber.push({ cardID: cid, jaName: rec?.jaName ?? "?" }); continue; }
    out.push(rec);
  }

  // 번호 중복(같은 NNN/M-P 가 여러 cardID) 처리: 첫 등장 유지, 중복 기록
  const byNum = new Map<string, Rec>();
  const dupes: string[] = [];
  for (const r of out.sort((a, b) => a.number.localeCompare(b.number))) {
    if (byNum.has(r.number)) dupes.push(`${r.number}(cid${r.cardID})`);
    else byNum.set(r.number, r);
  }
  const full = [...byNum.values()].sort((a, b) => a.number.localeCompare(b.number));
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(full, null, 2));

  // 3) 권위 리포트
  const allNums = new Set(full.map((r) => r.number));
  const newNums = full.filter((r) => !haveNumbers.has(r.number)).map((r) => r.number);
  const gaps: string[] = [];
  for (let n = 1; n <= 123; n++) { const s = String(n).padStart(3, "0"); if (!allNums.has(s)) gaps.push(s); }
  console.log(`\n=== 공식(pokemon-card.com) M-P 인벤토리 ===`);
  console.log(`번호 있는 M-P 카드: ${full.length}장 (번호 범위 ${full[0]?.number}~${full[full.length - 1]?.number})`);
  console.log(`신규(기존DB 미보유): ${newNums.length}장 → ${newNums.join(",") || "(없음)"}`);
  console.log(`번호 없는 M-P(勝利のしるし 등): ${noNumber.length}장`);
  if (dupes.length) console.log(`번호 중복: ${dupes.join(",")}`);
  console.log(`001~123 중 공식에 없는 번호: ${gaps.length}개 → ${gaps.join(",") || "(없음)"}`);
  console.log(`→ ${outPath}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
