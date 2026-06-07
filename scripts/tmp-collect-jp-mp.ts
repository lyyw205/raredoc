/**
 * [임시·M-P] JP MEGA 프로모 전수 수집 — 공식 resultAPI 스탠다드 전수 스윕에서 /large/M-P/ 썸네일만 필터.
 *   (프로모는 pg 상품코드가 없어 일반 컬렉터 불가 — 레귤레이션 스탠다드 목록(≈140p)을 훑어 멤버십 확보)
 *   상세 파서는 collect-jp-pokemoncard.ts 사본 + 프로모 분모("NNN/M-P") 보정.
 *   무번호 프로모는 번호 날조 금지 — 제외하고 로그만.
 * 실행: npx tsx scripts/tmp-collect-jp-mp.ts data/jp-official/jp-m-p.json
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const execFileP = promisify(execFile);

const BASE = "https://www.pokemon-card.com";
const SLEEP = parseInt(process.env.JP_SLEEP_MS ?? "400", 10);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const curlText = async (url: string): Promise<string> => {
  try { const { stdout } = await execFileP("curl", ["-sSL", "--max-time", "25", url], { maxBuffer: 16 * 1024 * 1024 }); return stdout; }
  catch { return ""; }
};
const curlJson = async (url: string): Promise<any> => { const t = await curlText(url); try { return JSON.parse(t); } catch { return null; } };

const decode = (s: string) => s.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#039;/g, "'").replace(/&quot;/g, '"');
const stripTags = (s: string) => decode(s.replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();
const TYPE_ICON: Record<string, string> = {
  grass: "Grass", fire: "Fire", water: "Water", lightning: "Lightning", electric: "Lightning", psychic: "Psychic",
  fighting: "Fighting", darkness: "Darkness", dark: "Darkness", metal: "Metal", steel: "Metal", fairy: "Fairy",
  dragon: "Dragon", colorless: "Colorless", none: "Colorless",
};

function parseSuffix(name: string): string | null {
  if (/TAG\s*TEAM/i.test(name)) return "TAG TEAM";
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
  if (/^BREAK進化/.test(t)) return "BREAK";
  if (/^たね/.test(t) || /^基本/.test(t)) return "Basic";
  if (/^1進化/.test(t) || /^一進化/.test(t)) return "Stage1";
  if (/^2進化/.test(t) || /^二進化/.test(t)) return "Stage2";
  return null;
}
function parseCategory(html: string, imgFile: string): { category: string | null; trainerType: string | null } {
  const heads = [...html.matchAll(/<h2 class="mt20">([\s\S]*?)<\/h2>/g)].map((m) => stripTags(m[1]));
  const head = heads.find((h) => /(グッズ|サポート|スタジアム|ポケモンのどうぐ|特殊エネルギー|基本エネルギー)/.test(h)) ?? "";
  const infix = imgFile.match(/_([PTE])_/)?.[1] ?? null;
  if (/グッズ/.test(head)) return { category: "Trainer", trainerType: "Item" };
  if (/サポート/.test(head)) return { category: "Trainer", trainerType: "Supporter" };
  if (/スタジアム/.test(head)) return { category: "Trainer", trainerType: "Stadium" };
  if (/ポケモンのどうぐ/.test(head)) return { category: "Trainer", trainerType: "Pokémon Tool" };
  if (/エネルギー/.test(head)) return { category: "Energy", trainerType: null };
  if (infix === "T") return { category: "Trainer", trainerType: null };
  if (infix === "E") return { category: "Energy", trainerType: null };
  if (infix === "P") return { category: "Pokemon", trainerType: null };
  if (/<span class="type">/.test(html)) return { category: "Pokemon", trainerType: null };
  return { category: null, trainerType: null };
}
function parseTypes(html: string): string[] {
  const m = html.match(/<span class="hp-type">[\s\S]*?<\/span>([\s\S]*?)<\/div>/);
  if (!m) return [];
  const out: string[] = [];
  for (const im of m[1].matchAll(/icon-([a-z]+)\s+icon/g)) { const t = TYPE_ICON[im[1]]; if (t) out.push(t); }
  return out;
}
const parseHp = (html: string) => { const m = html.match(/<span class="hp-num">\s*(\d+)\s*<\/span>/); return m ? parseInt(m[1], 10) : null; };
const parseDex = (html: string) => { const m = html.match(/No\.(\d{1,4})/); return m ? parseInt(m[1], 10) : null; };
const parseIllustrator = (html: string) => { const m = html.match(/イラストレーター<\/h4>\s*<a[^>]*>([\s\S]*?)<\/a>/); return m ? stripTags(m[1]) || null : null; };
// 프로모 분모 보정: "002 / M-P"
function parseNumber(html: string): { number: string | null; numberFull: string | null } {
  const m = html.match(/<div class="subtext[^"]*">([\s\S]*?)<\/div>/);
  if (!m) return { number: null, numberFull: null };
  const txt = stripTags(m[1]);
  const pr = txt.match(/(\d{1,3})\s*\/\s*M-P/);
  if (pr) return { number: pr[1], numberFull: `${pr[1]}/M-P` };
  const nf = txt.match(/(\d{1,3})\s*\/\s*(\d{1,3})/);
  if (nf) return { number: nf[1], numberFull: `${nf[1]}/${nf[2]}` };
  return { number: null, numberFull: null };
}
function parseImage(html: string): { image: string | null; imgFile: string } {
  const m = html.match(/\/assets\/images\/card_images\/large\/[A-Za-z0-9+-]+\/([0-9A-Za-z_]+\.jpg)/);
  if (!m) return { image: null, imgFile: "" };
  return { image: `${BASE}${m[0]}`, imgFile: m[1] };
}
async function fetchDetail(cardID: string) {
  const primary = `${BASE}/card-search/details.php/card/${cardID}/regu/all`;
  let html = await curlText(primary);
  if (html && /<h1 class="Heading1/.test(html)) return { html, detailUrl: primary };
  const fallback = `${BASE}/card-search/details.php/card/${cardID}/`;
  html = await curlText(fallback);
  if (html && /<h1 class="Heading1/.test(html)) return { html, detailUrl: fallback };
  return null;
}
function parseCard(html: string, detailUrl: string) {
  const nameM = html.match(/<h1 class="Heading1[^"]*">([\s\S]*?)<\/h1>/);
  if (!nameM) return null;
  const isMega = /pcg-megamark/.test(nameM[1]);
  let jaName = stripTags(nameM[1]);
  if (isMega && !/^(メガ|M)/.test(jaName)) jaName = "メガ" + jaName;
  const { image, imgFile } = parseImage(html);
  const { number, numberFull } = parseNumber(html);
  const { category, trainerType } = parseCategory(html, imgFile);
  const illustrator = parseIllustrator(html);
  const isPokemon = category === "Pokemon";
  return {
    jaName, number: number ?? "", numberFull, rarity: null, illustrator, category,
    stage: isPokemon ? parseStage(html) : null, suffix: isPokemon ? parseSuffix(jaName) : null,
    trainerType, hp: isPokemon ? parseHp(html) : null, types: isPokemon ? parseTypes(html) : [],
    dexId: isPokemon ? parseDex(html) : null, image, detailUrl,
  };
}

async function main() {
  const outPath = process.argv[2] ?? "data/jp-official/jp-m-p.json";
  // ① 스탠다드 전수 스윕 → /large/M-P/ 멤버십
  const api = (p: number) => `${BASE}/card-search/resultAPI.php?keyword=&se_ta=&regulation_sidebar_form=M&sm_and_keyword=true&page=${p}`;
  const first = await curlJson(api(1));
  if (!first?.maxPage) { console.error("resultAPI 1페이지 실패"); process.exit(1); }
  const ids = new Map<string, string>(); // cardID → 名
  for (let p = 1; p <= first.maxPage; p++) {
    const j = p === 1 ? first : await curlJson(api(p));
    for (const c of j?.cardList ?? []) {
      if (/\/large\/M-P\//.test(c.cardThumbFile ?? "")) ids.set(String(c.cardID), c.cardNameViewText ?? "");
    }
    if (p % 20 === 0) console.log(`  스윕 ${p}/${first.maxPage} (M-P 누적 ${ids.size})`);
    if (p > 1) await sleep(SLEEP);
  }
  console.log(`스윕 완료: M-P 멤버 ${ids.size}장 (스탠다드 ${first.hitCnt}장 중)`);

  // ② 상세 수집
  const recs: any[] = []; const noNum: string[] = [];
  let i = 0;
  for (const [cardID, listName] of ids) {
    i++;
    const d = await fetchDetail(cardID);
    if (!d) { console.log(`  ❌ 상세 실패 cardID=${cardID} (${listName})`); continue; }
    const r = parseCard(d.html, d.detailUrl);
    if (!r) { console.log(`  ❌ 파싱 실패 cardID=${cardID} (${listName})`); continue; }
    if (!r.number) { noNum.push(`${r.jaName} (cardID ${cardID})`); continue; } // 무번호 — 날조 금지, 제외
    // ⚠ /large/M-P/ 디렉터리는 별도 소세트와 공유됨(예: 23장 세트가 NNN/023 으로 동거) — 분모 M-P 만 본대
    if (!r.numberFull?.endsWith("/M-P")) { noNum.push(`[소세트 ${r.numberFull}] ${r.jaName} (cardID ${cardID})`); continue; }
    recs.push(r);
    if (i % 15 === 0) console.log(`  상세 ${i}/${ids.size}`);
    await sleep(SLEEP);
  }
  recs.sort((a, b) => parseInt(a.number, 10) - parseInt(b.number, 10));
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(recs, null, 2) + "\n", "utf8");
  console.log(`\n✅ ${outPath} — ${recs.length}장 (무번호 제외 ${noNum.length}: ${noNum.join(" · ") || "없음"})`);
}
main();
