/**
 * 팩 단위 3국 *공식 원천* 신규 수집 + 완전성 검증 (파이프라인 stage 1~3). 우리 DB 무관·독립.
 *   JP: tcgdex /ja/ (구조화: hp·types·dex·illustrator·rarity·attacks{cost,damage}·abilities)
 *   EN: pokemontcg.io 풀페이로드 (동일 + 기술 gold)
 *   KR: pokemoncard.co.kr 공식 (목록 AJAX search_text_cards → 상세 HTML: koName·일러·번호·레어도)
 *       ※ KR 공식은 능력치 미제공 → hp/types/attacks 비움(통합 단계에서 JP 상속). 독립신호 = koName·일러·번호.
 * 각 region: 카드수·필드 커버리지·독립 dex 재검증·결손 플래그.
 * 출력: data/collect/<groupId>/{jp,kr,en}.json
 *
 * 실행: npx tsx scripts/collect-pack.ts <groupId>
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { resolveCardDexes } from "./lib/pokeapi-names";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const execFileP = promisify(execFile);
// tcgdex 는 node fetch 가 막힘(curl 만 통과) → JP 전용 curl 헬퍼
const curlJson = async (url: string) => { try { const { stdout } = await execFileP("curl", ["-sSL", "--max-time", "25", url], { maxBuffer: 16 * 1024 * 1024 }); return JSON.parse(stdout); } catch { return null; } };

import { POKE, isPokemonSupertype as isPokeSt, supertypeOf } from "./lib/supertype";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// 동시성 풀
async function pool<T, R>(items: T[], n: number, fn: (t: T, i: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length); let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (i < items.length) { const idx = i++; out[idx] = await fn(items[idx], idx); }
  }));
  return out;
}
const fetchJson = async (url: string, opts?: any) => { try { const r = await fetch(url, { signal: AbortSignal.timeout(25000), ...opts }); return await r.json(); } catch { return null; } };
const fetchText = async (url: string) => { try { const r = await fetch(url, { signal: AbortSignal.timeout(25000) }); return await r.text(); } catch { return ""; } };

// ── 폼 dex ──
const JA_FORM: [RegExp, number][] = [[/オーガポン/, 1017], [/ガチグマ/, 901], [/ロトム/, 479], [/ポワルン/, 351]];
const EN_FORM: [RegExp, number][] = [[/Ogerpon/i, 1017], [/Bloodmoon|Ursaluna/i, 901], [/Rotom/i, 479], [/Castform/i, 351]];
const KO_FORM: [RegExp, number][] = [[/오거폰/, 1017], [/다투곰/, 901], [/로토무/, 479], [/캐스퐁/, 351]];
const stripJa = (n: string) => n.replace(/^(なみのり|そらをとぶ|ガラル|アローラ|ヒスイ|パルデア)\s*/, "").replace(/(ex|ＥＸ|Ｖ|V|VMAX|VSTAR|GX|δ)$/i, "").replace(/[\s　]/g, "").trim();
const stripEn = (n: string) => n.replace(/\s+(ex|EX|V|VMAX|VSTAR|GX)\b.*$/i, "").replace(/^(Paldean|Galarian|Alolan|Hisuian)\s+/i, "").trim();
const dexBy = (name: string, lang: "ja" | "en" | "ko", forms: [RegExp, number][], strip: (s: string) => string) => {
  for (const [re, d] of forms) if (re.test(name)) return d;
  let r = resolveCardDexes(strip(name), lang as "ko"); if (!r.length) r = resolveCardDexes(name.replace(/[\s　]/g, ""), lang as "ko"); return r[0] ?? null;
};
const jaDex = (n: string) => dexBy(n, "ja", JA_FORM, stripJa);
const enDex = (n: string) => dexBy(n, "en", EN_FORM, stripEn);
const koDex = (n: string) => dexBy(n, "ko", KO_FORM, (s) => s);

type Atk = { name: string; cost: string[]; damage: string | null };
type Rec = {
  region: string; setId: string; number: string; numInt: number; name: string;
  supertype: string | null; subtypes: string[]; dex: number | null;
  hp: number | null; types: string[]; retreat: number | null; weakness: string | null;
  illustrator: string | null; rarity: string | null; image: string | null;
  attacks: Atk[]; abilities: { name: string; text?: string }[];
};
const normCost = (c: any): string[] => Array.isArray(c) ? c.map(String) : (typeof c === "string" && c ? [c] : []);
const normAtk = (a: any): Atk[] => Array.isArray(a) ? a.map((x: any) => ({ name: x?.name ?? "", cost: normCost(x?.cost), damage: x?.damage != null && x.damage !== "" ? String(x.damage) : null })) : [];
const normAbi = (a: any): { name: string; text?: string }[] => Array.isArray(a) ? a.map((x: any) => ({ name: x?.name ?? "", text: x?.text ?? x?.effect })) : [];

// ── JP: tcgdex ──
const mapStage = (s?: string | null) => { const m: Record<string, string> = { Basic: "Basic", Stage1: "Stage 1", Stage2: "Stage 2", "Stage 1": "Stage 1", "Stage 2": "Stage 2", VMAX: "VMAX", VSTAR: "VSTAR" }; return s ? (m[s] ?? s) : null; };
function jpSubtypes(d: any): string[] {
  const out: string[] = [];
  if (d.category === "Pokemon") { const st = mapStage(d.stage); if (st) out.push(st); const suf = (d.suffix ?? "").trim(); if (/^ex$/i.test(suf)) out.push("ex"); else if (suf && /^(V|VMAX|VSTAR|GX|EX)$/i.test(suf)) out.push(suf.toUpperCase() === "EX" ? "ex" : suf.toUpperCase()); }
  else if (d.category === "Trainer") { const m: Record<string, string> = { Supporter: "Supporter", Item: "Item", Stadium: "Stadium", Tool: "Pokémon Tool", "Pokémon Tool": "Pokémon Tool" }; const t = d.trainerType; if (t) out.push(m[t] ?? t); }
  else if (d.category === "Energy") out.push(d.energyType === "Special" ? "Special" : "Basic");
  return out;
}
async function collectJp(sets: { id: string; code: string | null }[]): Promise<Rec[]> {
  const out: Rec[] = [];
  for (const s of sets) {
    const tcgId = s.code ?? s.id.replace(/^jp-tcg-/, "");
    const setD = await curlJson(`https://api.tcgdex.net/v2/ja/sets/${tcgId}`);
    const cards: any[] = setD?.cards ?? [];
    console.log(`  JP ${s.id} ← tcgdex:${tcgId} (${cards.length}장)`);
    const recs = await pool(cards, 6, async (c: any) => {
      const d = await curlJson(`https://api.tcgdex.net/v2/ja/cards/${c.id}`); await sleep(30);
      if (!d) return null;
      const st = supertypeOf(d.category);
      const dex = d.dexId?.[0] ?? (st === "Pokémon" ? jaDex(d.name) : null);
      return { region: "JP", setId: s.id, number: c.localId, numInt: parseInt(c.localId, 10) || 0, name: d.name,
        supertype: st, subtypes: jpSubtypes(d), dex, hp: d.hp ?? null, types: d.types ?? [], retreat: d.retreat ?? null,
        weakness: d.weaknesses?.[0]?.type ?? null, illustrator: d.illustrator ?? null, rarity: d.rarity ?? null,
        image: d.image ? `${d.image}/low.webp` : null, attacks: normAtk(d.attacks), abilities: normAbi(d.abilities) } as Rec;
    });
    out.push(...recs.filter(Boolean) as Rec[]);
  }
  return out;
}

// ── EN: pokemontcg.io ──
async function collectEn(setIds: string[]): Promise<Rec[]> {
  const out: Rec[] = [];
  for (const sid of setIds) for (let pg = 1; pg <= 6; pg++) {
    const j = await fetchJson(`https://api.pokemontcg.io/v2/cards?q=set.id:${sid}&pageSize=250&page=${pg}`);
    if (!j?.data?.length) break;
    for (const c of j.data) out.push({ region: "EN", setId: sid, number: c.number, numInt: parseInt(String(c.number).replace(/\D/g, "")) || 0, name: c.name,
      supertype: c.supertype ?? null, subtypes: c.subtypes ?? [], dex: c.nationalPokedexNumbers?.[0] ?? null, hp: c.hp ? parseInt(c.hp) : null,
      types: c.types ?? [], retreat: c.convertedRetreatCost ?? null, weakness: c.weaknesses?.[0]?.type ?? null, illustrator: c.artist ?? null,
      rarity: c.rarity ?? null, image: c.images?.small ?? c.images?.large ?? null, attacks: normAtk(c.attacks), abilities: normAbi(c.abilities) });
    if (j.data.length < 250) break;
  }
  return out;
}

// ── KR: pokemoncard.co.kr ──
async function collectKr(sets: { id: string; code: string | null; nameKo: string | null }[]): Promise<Rec[]> {
  const out: Rec[] = [];
  for (const s of sets) {
    const code = s.code ?? "";
    const q = s.nameKo?.match(/「(.+?)」/)?.[1] ?? s.nameKo ?? s.id;
    const items: { CardNum: string; num: string; img: string }[] = [];
    for (let pg = 0; pg < 30; pg++) {
      const fd = new FormData(); fd.append("action", "search_text_cards"); fd.append("search_text", q); fd.append("search_params", "all"); fd.append("limit", String(pg));
      const j = await fetchJson("https://pokemoncard.co.kr/v2/ajax2_dev2", { method: "POST", headers: { "X-Requested-With": "XMLHttpRequest", Referer: "https://pokemoncard.co.kr/cards", Origin: "https://pokemoncard.co.kr" }, body: fd });
      const res: any[] = Object.values(j?.result ?? {});
      for (const x of res) { const m = String(x.feature_image).match(new RegExp(`${code}_(\\d+)`)); if (m) items.push({ CardNum: x.CardNum, num: m[1], img: x.feature_image }); }
      if (res.length < 30) break;
    }
    console.log(`  KR ${s.id} ← "${q}" (${items.length}장)`);
    const recs = await pool(items, 5, async (it) => {
      const html = await fetchText(`https://pokemoncard.co.kr/cards/detail/${it.CardNum}`); await sleep(20);
      const ko = html.match(/class="card-hp title">([^<]*)</)?.[1]?.trim() ?? "";
      const ill = html.match(/class="illustrator">[\s\S]*?<br\s*\/?>([^<]*)<\/p>/)?.[1]?.trim() || null;
      const pnum = html.match(/class="p_num">([^<]*)</)?.[1]?.trim() ?? "";
      const rar = pnum.split(/\s+/).slice(1).join(" ") || null;
      return { region: "KR", setId: s.id, number: it.num, numInt: parseInt(it.num, 10) || 0, name: ko, supertype: null, subtypes: [],
        dex: ko ? koDex(ko) : null, hp: null, types: [], retreat: null, weakness: null, illustrator: ill, rarity: rar, image: it.img, attacks: [], abilities: [] } as Rec;
    });
    out.push(...recs);
  }
  return out;
}

function verify(region: string, recs: Rec[], expected: number, statsExpected: boolean) {
  const poke = recs.filter((r) => r.dex != null || isPokeSt(r.supertype));
  const pct = (n: number, d: number) => d ? `${n}/${d}(${Math.round(100 * n / d)}%)` : "0";
  console.log(`\n── ${region} 완전성 검증 (n=${recs.length}${expected ? ` / 기대 ${expected}` : ""}) ──`);
  if (statsExpected) console.log(`  포켓몬 ${poke.length} | dex ${pct(poke.filter((r) => r.dex != null).length, poke.length)} · hp ${pct(poke.filter((r) => r.hp != null).length, poke.length)} · types ${pct(poke.filter((r) => r.types.length).length, poke.length)} · 기술≥1 ${pct(poke.filter((r) => r.attacks.length).length, poke.length)}`);
  else console.log(`  포켓몬(dex추정) ${poke.length} | dex ${pct(poke.filter((r) => r.dex != null).length, poke.length)} (KR 공식은 능력치 미제공 — hp/기술은 JP 상속)`);
  console.log(`  전체 | 일러 ${pct(recs.filter((r) => r.illustrator).length, recs.length)} · 이미지 ${pct(recs.filter((r) => r.image).length, recs.length)} · rarity ${pct(recs.filter((r) => r.rarity).length, recs.length)} · 이름 ${pct(recs.filter((r) => r.name).length, recs.length)}`);
  const dexFn = region === "JP" ? jaDex : region === "EN" ? enDex : koDex;
  const mism: string[] = []; let chk = 0;
  for (const r of poke) { const want = dexFn(r.name); if (want != null && r.dex != null) { chk++; if (want !== r.dex) mism.push(`#${r.number} ${r.name}: 이름→${want} ≠ ${r.dex}`); } }
  console.log(`  독립 dex(이름→dex) 재검증: ${chk}장 중 불일치 ${mism.length}${mism.length ? ":" : " ✔"}`);
  mism.slice(0, 12).forEach((m) => console.log(`    ✗ ${m}`));
  const noName = recs.filter((r) => !r.name), noIll = recs.filter((r) => !r.illustrator);
  if (noName.length) console.log(`  ⚠ 이름 결손 ${noName.length}: ${noName.slice(0, 8).map((r) => "#" + r.number).join(",")}`);
  if (noIll.length) console.log(`  ⚠ 일러 결손 ${noIll.length}: ${noIll.slice(0, 10).map((r) => "#" + r.number).join(",")}`);
}

async function main() {
  const gid = process.argv[2];
  if (!gid) { console.error("usage: collect-pack.ts <groupId>"); process.exit(1); }
  const g = await prisma.cardPack.findUnique({ where: { id: gid }, include: { sets: { select: { id: true, region: true, code: true, nameKo: true, cardCount: true } } } });
  if (!g) { console.error(`그룹 없음: ${gid}`); process.exit(1); }
  const jpS = g.sets.filter((s) => s.region === "JP"), krS = g.sets.filter((s) => s.region === "KR"), enS = g.sets.filter((s) => s.region === "EN");
  const exp = (ss: typeof g.sets) => ss.reduce((n, s) => n + s.cardCount, 0);
  console.log(`████ COLLECT(공식 fresh) ${gid} ████`);

  console.log(`\n[JP tcgdex]`); const jp = await collectJp(jpS);
  console.log(`[EN pokemontcg.io]`); const en = await collectEn(enS.map((s) => s.id));
  console.log(`[KR pokemoncard.co.kr]`); const kr = await collectKr(krS);

  verify("JP", jp, exp(jpS), true);
  verify("EN", en, exp(enS), true);
  verify("KR", kr, exp(krS), false);

  const dir = join(process.cwd(), "data", "collect", gid); mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "jp.json"), JSON.stringify(jp, null, 2));
  writeFileSync(join(dir, "en.json"), JSON.stringify(en, null, 2));
  writeFileSync(join(dir, "kr.json"), JSON.stringify(kr, null, 2));
  console.log(`\n✅ 저장: data/collect/${gid}/{jp(${jp.length}),en(${en.length}),kr(${kr.length})}.json`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error("ERR", e?.message ?? e); process.exit(1); });
