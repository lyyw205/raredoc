/**
 * pc-jp(pokemon-card.com) 공식 상세에서 구조화 JP attacks + types 를 수집해
 * Card 의 **오염/누락 attacks 교정** + **빈 types 채움**(외과적, 다른 필드 무변경).
 *
 * 배경: S10 시대 일부 팩(S10P/S10a/S10b)은 초기 EN소스 적재로 attacks 가 영어+<br>+코스트마커가
 *   name 에 통째로 박힌 오염 상태(tcgdex JP 가 S10 빈껍데기라 보강 경로 막힘). pc-jp 가 유일한 깨끗한 JP 소스.
 *
 * 수집: resultAPI.php?pg=<pgCode> 목록(cardID) → details.php 상세 파싱(번호·타입·어택)
 *   캐시 data/jp-official/<jpSetId>.pcjp.json  → dry 후 apply 시 재스크랩 안 함.
 * 교정 규칙(비파괴):
 *   - attacks: 현재값이 오염(name 에 <br> 또는 '[' 시작 또는 len>45) 이거나 null 이고, 스크랩 attacks≥1 → 교체
 *   - types: 현재 빈 배열이고 스크랩 types≥1 → 채움 (포켓몬만 자연히 해당)
 *   - 깨끗한 기존값은 건드리지 않음. 스크랩이 비면 파괴 안 함(로그만).
 *
 * 실행: npx tsx scripts/fill-jp-attacks-types.ts <gid> <pgCode> <jpSetId> [--apply]
 *   예: npx tsx scripts/fill-jp-attacks-types.ts og-s10p 857 S10P
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "./lib/protected-groups";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const execFileP = promisify(execFile);

const BASE = "https://www.pokemon-card.com";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0 Safari/537.36";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const TYPE_ICON: Record<string, string> = {
  grass: "Grass", fire: "Fire", water: "Water", lightning: "Lightning", electric: "Lightning", psychic: "Psychic",
  fighting: "Fighting", darkness: "Darkness", dark: "Darkness", metal: "Metal", steel: "Metal", fairy: "Fairy",
  dragon: "Dragon", colorless: "Colorless", none: "Colorless",
};
const decode = (s: string) =>
  s.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#039;/g, "'").replace(/&quot;/g, '"');
const stripTags = (s: string) => decode(s.replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();

const curlText = async (url: string): Promise<string> => {
  try { const { stdout } = await execFileP("curl", ["-sSL", "--max-time", "25", "-A", UA, url], { maxBuffer: 16 * 1024 * 1024 }); return stdout; }
  catch { return ""; }
};
const curlJson = async (url: string): Promise<any> => { try { return JSON.parse(await curlText(url)); } catch { return null; } };

type Atk = { cost: string[]; name: string; text: string; damage: string | null };
type Abil = { name: string; text: string; type: string };
type Rec = {
  number: number | null; jaName: string; types: string[]; attacks: Atk[]; illustrator: string | null;
  weakness: string | null; resistance: string | null; retreatCost: number | null; abilities: Abil[];
};

function parseNumber(html: string): number | null {
  const m = html.match(/<div class="subtext[^"]*">([\s\S]*?)<\/div>/);
  if (!m) return null;
  const nf = stripTags(m[1]).match(/(\d{1,3})\s*\/\s*\d{1,3}/);
  return nf ? parseInt(nf[1], 10) : null;
}
function parseName(html: string): string {
  const m = html.match(/<h1 class="Heading1[^"]*">([\s\S]*?)<\/h1>/);
  return m ? stripTags(m[1]) : "";
}
function parseIllustrator(html: string): string | null {
  const m = html.match(/イラストレーター<\/h4>\s*<a[^>]*>([\s\S]*?)<\/a>/);
  return m ? stripTags(m[1]) || null : null;
}
function parseTypes(html: string): string[] {
  const m = html.match(/<span class="hp-type">[\s\S]*?<\/span>([\s\S]*?)<\/div>/);
  if (!m) return [];
  const out: string[] = [];
  for (const im of m[1].matchAll(/icon-([a-z]+)\s+icon/g)) { const t = TYPE_ICON[im[1]]; if (t) out.push(t); }
  return out;
}
// ワザ 섹션: <h2 class="mt20">ワザ</h2> ~ 다음 <h2 class="mt20"> 또는 <table>. 각 어택 = <h4>..</h4><p>..</p>
function parseAttacks(html: string): Atk[] {
  const sec = html.match(/<h2 class="mt20">ワザ<\/h2>([\s\S]*?)(?:<h2 class="mt20">|<table)/);
  if (!sec) return [];
  const out: Atk[] = [];
  for (const mm of sec[1].matchAll(/<h4>([\s\S]*?)<\/h4>\s*<p>([\s\S]*?)<\/p>/g)) {
    const h4 = mm[1], text = stripTags(mm[2]);
    const cost: string[] = [];
    for (const im of h4.matchAll(/icon-([a-z]+)\s+icon/g)) { const t = TYPE_ICON[im[1]]; if (t) cost.push(t); }
    const dmg = h4.match(/<span class="f_right[^"]*">([\s\S]*?)<\/span>/);
    const damage = dmg ? stripTags(dmg[1]) || null : null;
    let name = h4.replace(/<span class="f_right[\s\S]*?<\/span>/g, "").replace(/<span[^>]*class="icon[\s\S]*?<\/span>/g, "");
    name = stripTags(name);
    if (name) out.push({ cost, name, text, damage });
  }
  return out;
}
// 弱点/抵抗力/にげる 테이블(<tr><th>弱点</th><th>抵抗力</th><th>にげる</th></tr><tr>…) 1행.
//   弱点/抵抗力 = 타입아이콘 + 값 → JSON 문자열 [{type,value}] (Card.weakness/resistance String? 포맷과 일치).
//   にげる = 코스트 아이콘 개수 = retreatCost(0+). 테이블 없으면(트레이너/에너지) 전부 null.
function cellTypeValue(cell: string): { type: string | null; value: string } {
  const im = cell.match(/icon-([a-z]+)\s+icon/);
  return { type: im ? (TYPE_ICON[im[1]] ?? null) : null, value: stripTags(cell) };
}
function parseWRR(html: string): { weakness: string | null; resistance: string | null; retreatCost: number | null } {
  const m = html.match(/弱点<\/th>\s*<th>抵抗力<\/th>\s*<th>にげる<\/th>\s*<\/tr>\s*<tr>([\s\S]*?)<\/tr>/);
  if (!m) return { weakness: null, resistance: null, retreatCost: null };
  const cells = [...m[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((c) => c[1]);
  if (cells.length < 3) return { weakness: null, resistance: null, retreatCost: null };
  const wk = cellTypeValue(cells[0]), rs = cellTypeValue(cells[1]);
  return {
    weakness: wk.type ? JSON.stringify([{ type: wk.type, value: wk.value || "×2" }]) : null,
    resistance: rs.type ? JSON.stringify([{ type: rs.type, value: rs.value || "-30" }]) : null,
    retreatCost: (cells[2].match(/icon-[a-z]+\s+icon/g) || []).length,
  };
}
// 特性 섹션: <h2 class="mt20">特性</h2> ~ 다음 <h2 class="mt20"> 또는 <table>. 각 특성 = <h4>이름</h4><p>본문</p>(코스트/데미지 없음).
function parseAbilities(html: string): Abil[] {
  const sec = html.match(/<h2 class="mt20">特性<\/h2>([\s\S]*?)(?:<h2 class="mt20">|<table)/);
  if (!sec) return [];
  const out: Abil[] = [];
  for (const mm of sec[1].matchAll(/<h4>([\s\S]*?)<\/h4>\s*<p>([\s\S]*?)<\/p>/g)) {
    const name = stripTags(mm[1].replace(/<span[^>]*class="icon[\s\S]*?<\/span>/g, ""));
    if (name) out.push({ name, text: stripTags(mm[2]), type: "特性" });
  }
  return out;
}

async function fetchDetail(cardID: string): Promise<string | null> {
  let html = await curlText(`${BASE}/card-search/details.php/card/${cardID}/regu/all`);
  if (html && /<h1 class="Heading1/.test(html)) return html;
  html = await curlText(`${BASE}/card-search/details.php/card/${cardID}/`);
  return html && /<h1 class="Heading1/.test(html) ? html : null;
}

function isCorrupt(a: any): boolean {
  if (!Array.isArray(a) || !a[0]) return false;
  const n = String(a[0].name ?? "");
  return n.includes("<br>") || /^\[/.test(n) || n.length > 45;
}

async function main() {
  const gid = process.argv[2], pg = process.argv[3], jpSetId = process.argv[4], APPLY = process.argv.includes("--apply");
  if (!gid || !pg || !jpSetId) { console.error("usage: <gid> <pgCode> <jpSetId> [--apply] [--set=<dbSetId>] [--allow-protected]"); process.exit(1); }
  // --set=<dbSetId>: 병합팩(예 sv-decks=69세트 172장)에서 특정 JP 세트만 타깃 — JP 번호충돌 오매칭 방지.
  //   없으면 cardPackId=gid 전체(단일세트 팩 가정). 병합 덱/스타터 팩은 반드시 --set 필요.
  const setFilter = process.argv.find((a) => a.startsWith("--set="))?.slice("--set=".length) || null;
  // gid = 영향 cardPackId — 동결팩이면 --allow-protected 없이 차단.
  assertWritable([gid], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "fill-jp-attacks-types" });
  const cache = `data/jp-official/${jpSetId}.pcjp.json`;

  let byNum: Record<string, Rec>;
  if (existsSync(cache)) { byNum = JSON.parse(readFileSync(cache, "utf8")); console.log(`■ 캐시 ${cache} (${Object.keys(byNum).length})`); }
  else {
    // 목록
    const ids: string[] = []; let maxPage = 1;
    for (let p = 1; p <= maxPage; p++) {
      const j = await curlJson(`${BASE}/card-search/resultAPI.php?pg=${pg}&regulation_sidebar_form=all&page=${p}`);
      if (!j) break;
      if (p === 1) maxPage = j.maxPage ?? 1;
      for (const c of j.cardList ?? []) ids.push(String(c.cardID));
      await sleep(150);
    }
    console.log(`■ ${jpSetId} pg=${pg} 목록 ${ids.length}장 수집중...`);
    byNum = {}; let ok = 0, fail = 0;
    for (const id of ids) {
      const h = await fetchDetail(id); await sleep(150);
      if (!h) { fail++; continue; }
      const num = parseNumber(h);
      const wrr = parseWRR(h);
      const rec: Rec = {
        number: num, jaName: parseName(h), types: [...new Set(parseTypes(h))], attacks: parseAttacks(h), illustrator: parseIllustrator(h),
        weakness: wrr.weakness, resistance: wrr.resistance, retreatCost: wrr.retreatCost, abilities: parseAbilities(h),
      };
      if (num != null) { byNum[String(num)] = rec; ok++; }
    }
    mkdirSync("data/jp-official", { recursive: true });
    writeFileSync(cache, JSON.stringify(byNum, null, 1));
    const wAtk = Object.values(byNum).filter((r) => r.attacks.length).length;
    const wTyp = Object.values(byNum).filter((r) => r.types.length).length;
    console.log(`■ 스크랩 완료: ${ok}장(실패 ${fail}) · attacks보유 ${wAtk} · types보유 ${wTyp} → ${cache}`);
  }

  const lcs = await prisma.card.findMany({
    where: setFilter ? { locales: { some: { setId: setFilter } } } : { locales: { some: { set: { cardPackId: gid } } } },
    select: { id: true, supertype: true, types: true, attacks: true, illustrator: true, weakness: true, resistance: true, retreatCost: true, abilities: true, locales: { select: { region: true, setId: true, numberInt: true, name: true } } },
  });
  let atkFix = 0, atkFill = 0, typFill = 0, illFill = 0, corruptNoSrc = 0, noMatch = 0;
  let wkFill = 0, rsFill = 0, rcFill = 0, abFill = 0;
  const aUpd: { id: string; attacks: any }[] = [], tUpd: { id: string; types: string[] }[] = [], iUpd: { id: string; ill: string }[] = [];
  const wUpd: { id: string; weakness: string }[] = [], rUpd: { id: string; resistance: string }[] = [],
    rcUpd: { id: string; retreatCost: number }[] = [], abUpd: { id: string; abilities: any }[] = [];
  const aSamp: string[] = [], tSamp: string[] = [];
  for (const lc of lcs) {
    const jp = setFilter ? lc.locales.find((l) => l.region === "JP" && l.setId === setFilter) : lc.locales.find((l) => l.region === "JP");
    if (!jp || jp.numberInt == null) continue;
    const rec = byNum[String(jp.numberInt)];
    if (!rec) { if (["Pokémon", "Pokemon"].includes(lc.supertype ?? "")) noMatch++; continue; }
    // attacks
    const cur = lc.attacks;
    const corrupt = isCorrupt(cur), empty = !cur || (Array.isArray(cur) && cur.length === 0);
    if ((corrupt || empty) && rec.attacks.length) {
      aUpd.push({ id: lc.id, attacks: rec.attacks });
      if (corrupt) atkFix++; else atkFill++;
      if (aSamp.length < 8) aSamp.push(`#${jp.numberInt}${jp.name} ${corrupt ? "오염" : "null"}→[${rec.attacks.map((a) => a.name).join("/")}]`);
    } else if (corrupt && !rec.attacks.length) { corruptNoSrc++; }
    // types
    if (lc.types.length === 0 && rec.types.length) {
      tUpd.push({ id: lc.id, types: rec.types });
      typFill++;
      if (tSamp.length < 8) tSamp.push(`#${jp.numberInt} [${rec.types.join(",")}]`);
    }
    // illustrator (언어중립 정답키) — 비어있을 때만 채움
    if (!lc.illustrator && rec.illustrator) { iUpd.push({ id: lc.id, ill: rec.illustrator }); illFill++; }
    // weakness/resistance/retreatCost/abilities — effectSig 결손분, 비어있을 때만 채움(비파괴). retreatCost 0 도 유효값.
    if (!lc.weakness && rec.weakness) { wUpd.push({ id: lc.id, weakness: rec.weakness }); wkFill++; }
    if (!lc.resistance && rec.resistance) { rUpd.push({ id: lc.id, resistance: rec.resistance }); rsFill++; }
    if (lc.retreatCost == null && rec.retreatCost != null) { rcUpd.push({ id: lc.id, retreatCost: rec.retreatCost }); rcFill++; }
    const abEmpty = !lc.abilities || (Array.isArray(lc.abilities) && lc.abilities.length === 0);
    if (abEmpty && rec.abilities.length) { abUpd.push({ id: lc.id, abilities: rec.abilities }); abFill++; }
  }
  console.log(`\nattacks: 오염교정 ${atkFix} · null채움 ${atkFill} · 오염but소스없음 ${corruptNoSrc}`);
  console.log(`  ${aSamp.join(" | ")}`);
  console.log(`types: 빈값채움 ${typFill}  ${tSamp.join(" | ")}`);
  console.log(`illustrator: 빈값채움 ${illFill}`);
  console.log(`weakness: ${wkFill} · resistance: ${rsFill} · retreatCost: ${rcFill} · abilities: ${abFill} (전부 빈값채움)`);
  console.log(`매칭없는 포켓몬 ${noMatch} ${APPLY ? "★APPLY" : "(dry)"}`);
  if (APPLY) {
    for (const u of aUpd) await prisma.card.update({ where: { id: u.id }, data: { attacks: u.attacks } });
    for (const u of tUpd) await prisma.card.update({ where: { id: u.id }, data: { types: u.types } });
    for (const u of iUpd) await prisma.card.update({ where: { id: u.id }, data: { illustrator: u.ill } });
    for (const u of wUpd) await prisma.card.update({ where: { id: u.id }, data: { weakness: u.weakness } });
    for (const u of rUpd) await prisma.card.update({ where: { id: u.id }, data: { resistance: u.resistance } });
    for (const u of rcUpd) await prisma.card.update({ where: { id: u.id }, data: { retreatCost: u.retreatCost } });
    for (const u of abUpd) await prisma.card.update({ where: { id: u.id }, data: { abilities: u.abilities } });
    console.log(`★적용: attacks ${aUpd.length} · types ${tUpd.length} · illust ${iUpd.length} · weak ${wUpd.length} · resist ${rUpd.length} · retreat ${rcUpd.length} · abil ${abUpd.length}`);
  }
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
