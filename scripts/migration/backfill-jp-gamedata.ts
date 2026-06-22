/**
 * BF 엔진: pc-jp 덤프(data/jp-official/jp-<code>.json, detailUrl 보유)에서 상세를 새 파서로 긁어
 *   여러 JP 세트의 빈 게임데이터(attacks/types/weakness/resistance/retreatCost/abilities/illustrator)를
 *   **비파괴**(빈값만)·**setId 스코프**(병합팩 번호충돌 방지)로 백필. fill-jp-attacks-types 의 세트-루프 일반화.
 *
 * 안전: setId 별로 [gid]=cardPack 에 assertWritable. 동결팩은 --allow-protected 필요.
 *   매핑 불확실 세트는 적용 안 하고 SKIP 리포트(엉뚱한 덤프→동결팩 오기록 방지).
 *
 * 실행: npx tsx scripts/migration/backfill-jp-gamedata.ts [--apply] [--allow-protected] [--only=jp-tcg-SVD]
 */
import "dotenv/config";
import { prisma } from "../../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "../lib/protected-groups";
import { readFileSync, existsSync } from "node:fs";

const APPLY = process.argv.includes("--apply");
const allow = hasAllowProtectedFlag();
const ONLY = process.argv.find((a) => a.startsWith("--only="))?.slice("--only=".length) || null;
const FETCH_SLEEP = process.argv.includes("--slow") ? 400 : 130; // pc-jp 레이트리밋 회피용 throttle
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0 Safari/537.36";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ── 파서 (fill-jp-attacks-types 와 동일) ──
const TYPE_ICON: Record<string, string> = { grass:"Grass", fire:"Fire", water:"Water", lightning:"Lightning", electric:"Lightning", psychic:"Psychic", fighting:"Fighting", darkness:"Darkness", dark:"Darkness", metal:"Metal", steel:"Metal", fairy:"Fairy", dragon:"Dragon", colorless:"Colorless", none:"Colorless" };
const decode = (s: string) => s.replace(/&nbsp;/g," ").replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&#039;/g,"'").replace(/&quot;/g,'"');
const stripTags = (s: string) => decode(s.replace(/<[^>]+>/g,"")).replace(/\s+/g," ").trim();
const parseNumber = (h: string) => { const m=h.match(/<div class="subtext[^"]*">([\s\S]*?)<\/div>/); if(!m)return null; const nf=stripTags(m[1]).match(/(\d{1,3})\s*\/\s*\d{1,3}/); return nf?parseInt(nf[1],10):null; };
const parseName = (h: string) => { const m=h.match(/<h1 class="Heading1[^"]*">([\s\S]*?)<\/h1>/); return m?stripTags(m[1]):""; };
const normJa = (s: string) => (s || "").normalize("NFC").replace(/[\s　]/g, "");
const parseIllustrator = (h: string) => { const m=h.match(/イラストレーター<\/h4>\s*<a[^>]*>([\s\S]*?)<\/a>/); return m?(stripTags(m[1])||null):null; };
function parseTypes(h: string){ const m=h.match(/<span class="hp-type">[\s\S]*?<\/span>([\s\S]*?)<\/div>/); if(!m)return [] as string[]; const out:string[]=[]; for(const im of m[1].matchAll(/icon-([a-z]+)\s+icon/g)){const t=TYPE_ICON[im[1]]; if(t)out.push(t);} return out; }
type Atk = { cost:string[]; name:string; text:string; damage:string|null };
type Abil = { name:string; text:string; type:string };
function parseAttacks(h: string): Atk[]{ const sec=h.match(/<h2 class="mt20">ワザ<\/h2>([\s\S]*?)(?:<h2 class="mt20">|<table)/); if(!sec)return []; const out:Atk[]=[]; for(const mm of sec[1].matchAll(/<h4>([\s\S]*?)<\/h4>\s*<p>([\s\S]*?)<\/p>/g)){ const h4=mm[1],text=stripTags(mm[2]); const cost:string[]=[]; for(const im of h4.matchAll(/icon-([a-z]+)\s+icon/g)){const t=TYPE_ICON[im[1]]; if(t)cost.push(t);} const dmg=h4.match(/<span class="f_right[^"]*">([\s\S]*?)<\/span>/); const damage=dmg?(stripTags(dmg[1])||null):null; let name=h4.replace(/<span class="f_right[\s\S]*?<\/span>/g,"").replace(/<span[^>]*class="icon[\s\S]*?<\/span>/g,""); name=stripTags(name); if(name)out.push({cost,name,text,damage}); } return out; }
function cellTV(cell: string){ const im=cell.match(/icon-([a-z]+)\s+icon/); return { type: im?(TYPE_ICON[im[1]]??null):null, value: stripTags(cell) }; }
function parseWRR(h: string){ const m=h.match(/弱点<\/th>\s*<th>抵抗力<\/th>\s*<th>にげる<\/th>\s*<\/tr>\s*<tr>([\s\S]*?)<\/tr>/); if(!m)return {weakness:null as string|null,resistance:null as string|null,retreatCost:null as number|null}; const cells=[...m[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(c=>c[1]); if(cells.length<3)return {weakness:null,resistance:null,retreatCost:null}; const wk=cellTV(cells[0]),rs=cellTV(cells[1]); return { weakness: wk.type?JSON.stringify([{type:wk.type,value:wk.value||"×2"}]):null, resistance: rs.type?JSON.stringify([{type:rs.type,value:rs.value||"-30"}]):null, retreatCost:(cells[2].match(/icon-[a-z]+\s+icon/g)||[]).length }; }
function parseAbilities(h: string): Abil[]{ const sec=h.match(/<h2 class="mt20">特性<\/h2>([\s\S]*?)(?:<h2 class="mt20">|<table)/); if(!sec)return []; const out:Abil[]=[]; for(const mm of sec[1].matchAll(/<h4>([\s\S]*?)<\/h4>\s*<p>([\s\S]*?)<\/p>/g)){ const name=stripTags(mm[1].replace(/<span[^>]*class="icon[\s\S]*?<\/span>/g,"")); if(name)out.push({name,text:stripTags(mm[2]),type:"特性"}); } return out; }
async function fetchDetail(cardID: string): Promise<string|null>{ for(const u of [`https://www.pokemon-card.com/card-search/details.php/card/${cardID}/regu/all`,`https://www.pokemon-card.com/card-search/details.php/card/${cardID}/`]){ try{ const r=await fetch(u,{headers:{"User-Agent":UA}}); const h=await r.text(); if(/<h1 class="Heading1/.test(h))return h; }catch{} } return null; }

type Rec = { number:number|null; jaName:string; types:string[]; attacks:Atk[]; illustrator:string|null; weakness:string|null; resistance:string|null; retreatCost:number|null; abilities:Abil[] };

// ── DB setId → 덤프 code 매핑 (슬러그↔JP코드 권위 매핑; enrich-sv TARGET_SETS 기반) ──
//   jp-tcg-* 는 접두어 제거 자동유도(svd, sv5k, svg…). jp-sv-슬러그는 명시 매핑.
const SLUG2CODE: Record<string, string> = {
  "jp-sv-paldean-fates":"sv4a", "jp-sv-surging-sparks":"sv8", "jp-sv-twilight-masquerade":"sv6",
  "jp-sv-destined-rivals":"sv10", "jp-sv-shrouded-fable":"sv6a", "jp-sv-obsidian-flames":"sv3",
  "jp-sv-raging-surf":"sv3a", "jp-sv-crimson-haze":"sv5a", "jp-sv-paradise-dragona":"sv7a",
  "jp-sv-stellar-crown":"sv7", "jp-sv-triplet-beat":"sv1a", "jp-sv-151":"sv2a",
  "jp-sv-prismatic-evolutions":"sv8a", "jp-sv-journey-together":"sv9", "jp-sv-heatwave-arena":"sv9a",
  // ※ temporal-forces/cyber-judge(SV5K+SV5M 합본 슬러그)는 반쪽 덤프 오매칭 위험 → 제외.
  //   분할 세트 jp-tcg-SV5K/SV5M 는 자동유도(sv5k/sv5m)로 정확 처리됨.
};
const DUMP_OVERRIDE: Record<string, string> = { "jp-tcg-SV11B":"sv11b-images" }; // 덤프명 변종
function dumpPathFor(setId: string): string | null {
  const cands: string[] = [];
  if (DUMP_OVERRIDE[setId]) cands.push(DUMP_OVERRIDE[setId]);
  if (SLUG2CODE[setId]) cands.push(SLUG2CODE[setId]);
  const base = setId.startsWith("jp-tcg-") ? setId.slice("jp-tcg-".length).toLowerCase() : setId.replace(/^jp-/, "").toLowerCase();
  cands.push(base);
  // SM/BW/XY/SWSH 덤프는 era 접두어 명명(sm-smXXX·bw-bgX·xy-xyX·s-sXXX). jaName 검증이 오매핑 막아줌.
  for (const pre of ["sm-", "bw-", "xy-", "s-"]) cands.push(pre + base);
  for (const c of cands) { const p = `data/jp-official/jp-${c}.json`; if (existsSync(p)) { try { if (readFileSync(p, "utf8").includes("detailUrl")) return p; } catch {} } }
  return null;
}

async function buildByNum(dumpPath: string): Promise<Record<string, Rec>> {
  const dump: any[] = JSON.parse(readFileSync(dumpPath, "utf8"));
  const byNum: Record<string, Rec> = {};
  for (const c of dump) {
    const m = String(c.detailUrl || "").match(/card\/(\d+)/); if (!m) continue;
    const h = await fetchDetail(m[1]); await sleep(FETCH_SLEEP); if (!h) continue;
    const num = parseNumber(h); if (num == null) continue;
    const wrr = parseWRR(h);
    byNum[String(num)] = { number: num, jaName: parseName(h), types: [...new Set(parseTypes(h))], attacks: parseAttacks(h), illustrator: parseIllustrator(h), weakness: wrr.weakness, resistance: wrr.resistance, retreatCost: wrr.retreatCost, abilities: parseAbilities(h) };
  }
  return byNum;
}

const isCorrupt = (a: any) => { if (!Array.isArray(a) || !a[0]) return false; const n = String(a[0].name ?? ""); return n.includes("<br>") || /^\[/.test(n) || n.length > 45; };

async function main() {
  // 대상: null-attacks 포켓몬을 가진 JP 세트 + gid
  const rows: { setId: string; gid: string }[] = await prisma.$queryRawUnsafe(`
    SELECT cl."setId" AS "setId", s."setGroupId" AS gid
    FROM "CardLocale" cl JOIN "LogicalCard" lc ON lc.id=cl."logicalCardId" JOIN "Set" s ON s.id=cl."setId"
    WHERE lc.supertype='Pokémon' AND lc.attacks IS NULL AND cl.region='JP' AND cl."setId" LIKE 'jp-%'
    GROUP BY cl."setId", s."setGroupId" ORDER BY COUNT(DISTINCT lc.id) DESC`);
  const targets = ONLY ? rows.filter((r) => r.setId === ONLY) : rows;
  console.log(`■ 대상 JP세트 ${targets.length}개 ${APPLY ? "★APPLY" : "(dry)"}`);

  const skipped: string[] = [];
  let totalSets = 0, totalFill = 0;
  for (const { setId, gid } of targets) {
    const dumpPath = dumpPathFor(setId);
    if (!dumpPath) { skipped.push(`${setId}(no-dump)`); continue; }
    const byNum = await buildByNum(dumpPath);
    if (Object.keys(byNum).length === 0) { skipped.push(`${setId}(empty-scrape)`); continue; }

    const lcs = await prisma.card.findMany({
      where: { locales: { some: { setId } } },
      select: { id: true, supertype: true, types: true, attacks: true, illustrator: true, weakness: true, resistance: true, retreatCost: true, abilities: true, locales: { select: { region: true, setId: true, numberInt: true, name: true } } },
    });
    const u: { id: string; data: Record<string, unknown> }[] = [];
    let nameMismatch = 0;
    for (const lc of lcs) {
      const jp = lc.locales.find((l) => l.region === "JP" && l.setId === setId); if (!jp || jp.numberInt == null) continue;
      const rec = byNum[String(jp.numberInt)]; if (!rec) continue;
      // 안전: 덤프 jaName ≠ DB JP명이면 오매핑/번호어긋남 → 스킵(엉뚱한 동결팩 오기록 방지)
      if (rec.jaName && jp.name && normJa(rec.jaName) !== normJa(jp.name)) { nameMismatch++; continue; }
      const data: Record<string, unknown> = {};
      const cur = lc.attacks; const corrupt = isCorrupt(cur); const empty = !cur || (Array.isArray(cur) && cur.length === 0);
      if ((corrupt || empty) && rec.attacks.length) data.attacks = rec.attacks;
      if (lc.types.length === 0 && rec.types.length) data.types = rec.types;
      if (!lc.illustrator && rec.illustrator) data.illustrator = rec.illustrator;
      if (!lc.weakness && rec.weakness) data.weakness = rec.weakness;
      if (!lc.resistance && rec.resistance) data.resistance = rec.resistance;
      if (lc.retreatCost == null && rec.retreatCost != null) data.retreatCost = rec.retreatCost;
      const abEmpty = !lc.abilities || (Array.isArray(lc.abilities) && lc.abilities.length === 0);
      if (abEmpty && rec.abilities.length) data.abilities = rec.abilities;
      if (Object.keys(data).length) u.push({ id: lc.id, data });
    }
    assertWritable([gid], { allow, dryRun: !APPLY, tool: "backfill-jp-gamedata" });
    console.log(`  ${setId} (${gid}) dump=${dumpPath.replace("data/jp-official/", "")} scraped=${Object.keys(byNum).length} fill=${u.length}${nameMismatch ? ` ⚠nameMismatch=${nameMismatch}` : ""}`);
    if (APPLY) for (const x of u) await prisma.card.update({ where: { id: x.id }, data: x.data });
    totalSets++; totalFill += u.length;
  }
  console.log(`\n■ 완료: ${totalSets}세트 · fill ${totalFill}장 ${APPLY ? "★적용됨" : "(dry)"}`);
  if (skipped.length) console.log(`■ SKIP ${skipped.length}: ${skipped.join(", ")}`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
