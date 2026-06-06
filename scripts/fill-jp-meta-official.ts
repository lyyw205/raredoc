/**
 * 기존 JP 세트(이미 적재된 CardLocale + LogicalCard)를 일본공식(pokemon-card.com) 수집 JSON 으로
 * **in-place 메타 enrich**. load-jp-official 과 달리 LC 를 재생성하지 않음 → 기존 JP↔KR 병합/ setGroupId 보존,
 * 고아 LC 발생 없음. tcgdex JA 가 빈 SM 시대용(메타만 비어있고 로케일/이미지는 이미 존재할 때).
 *
 * 각 JP CardLocale 의 LogicalCard 에 supertype/pokedexNumbers/subtypes/illustrator/hp/types 를 official 로 덮어씀.
 * dex: JSON dexId 우선, 없으면 PokeAPI ja(폼접두어 제거) 폴백. subtypes: stage+suffix/trainerType.
 * --prune: JSON 에 없는 번호의 JP 로케일(EN넘버 리프린트 노이즈행) 삭제 + 비워진 LC 삭제.
 *
 * 실행: npx tsx scripts/fill-jp-meta-official.ts <jpSetId> <jsonPath> [--apply] [--prune]
 *   예: npx tsx scripts/fill-jp-meta-official.ts jp-tcg-SM1S data/jp-official/jp-sm1s.json --apply --prune
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { readFileSync } from "node:fs";
import { buildNameIndex } from "./lib/pokeapi-names";

const mapStage = (s?: string | null) => { if (!s) return null; const m: Record<string, string> = { Basic: "Basic", Stage1: "Stage 1", Stage2: "Stage 2", "Stage 1": "Stage 1", "Stage 2": "Stage 2", VMAX: "VMAX", VSTAR: "VSTAR" }; return m[s] ?? s; };
const mapTrainer = (t?: string | null) => { if (!t) return null; const m: Record<string, string> = { Supporter: "Supporter", Item: "Item", Stadium: "Stadium", Tool: "Pokémon Tool", "Pokémon Tool": "Pokémon Tool" }; return m[t] ?? t; };
function subtypesOf(c: any): string[] {
  const out: string[] = [];
  if (c.category === "Pokemon") { const st = mapStage(c.stage); if (st) out.push(st); const suf = (c.suffix ?? "").trim();
    if (/^ex$/i.test(suf)) out.push("ex"); else if (suf && /^(V|VMAX|VSTAR|GX)$/i.test(suf)) out.push(suf.toUpperCase()); }
  else if (c.category === "Trainer") { const tt = mapTrainer(c.trainerType); if (tt) out.push(tt); }
  else if (c.category === "Energy") out.push("Special");
  return out;
}
const supertypeOf = (c?: string) => c === "Pokemon" ? "Pokémon" : c === "Trainer" ? "Trainer" : c === "Energy" ? "Energy" : null;
// ja인덱스가 못 푸는 특수명/中間폼명(・ 포함 등) 수동 dex. SM: カプ(Tapu) 시리즈.
const JA_DEX_SPECIAL: [RegExp, number][] = [
  [/カプ・コケコ/, 785], [/カプ・テテフ/, 786], [/カプ・ブルル/, 787], [/カプ・レヒレ/, 788],
  [/ネクロズマ/, 800], [/キュレム/, 646], // 네크로즈마 폼(다스크/돈/울트라)·큐레무(화이트/블랙) 中間폼명
];
function dexFromJa(name: string, ja: Map<string, number>): number | null {
  for (const [re, d] of JA_DEX_SPECIAL) if (re.test(name)) return d;
  const clean = name.replace(/^(メガ|パルデア|ヒスイ|アローラ|ガラル)\s*/, "").replace(/(ex|EX|V|VMAX|VSTAR|GX|δ)\s*$/g, "").replace(/[\s　]/g, "").trim().toLowerCase();
  return ja.get(clean) ?? null;
}
// 타그팀 GX(「&」/「＆」 복합명)은 두 종 dex 모두 보유 (예 セレビィ&フシギバナGX→[251,3]). 단일카드는 dexId 우선→ja폴백.
function dexesFromCard(c: any, ja: Map<string, number>): number[] {
  const name: string = c.jaName ?? "";
  if (/[&＆]/.test(name)) {
    const base = name.replace(/(ex|EX|V|VMAX|VSTAR|GX|δ)\s*$/g, "");
    const out: number[] = [];
    for (const p of base.split(/[&＆]/)) { const d = dexFromJa(p.trim(), ja); if (d && !out.includes(d)) out.push(d); }
    return out;
  }
  if (c.dexId) return [c.dexId];
  const d = dexFromJa(name, ja);
  return d ? [d] : [];
}
const numKey = (n: string | number) => parseInt(String(n), 10);

async function main() {
  const jpSet = process.argv[2], jsonPath = process.argv[3];
  const APPLY = process.argv.includes("--apply");
  const PRUNE = process.argv.includes("--prune");
  if (!jpSet || !jsonPath) { console.error("usage: <jpSetId> <jsonPath> [--apply] [--prune]"); process.exit(1); }
  const cards: any[] = JSON.parse(readFileSync(jsonPath, "utf8"));
  const byNum = new Map<number, any>();
  for (const c of cards) byNum.set(numKey(c.number), c);
  const ja = buildNameIndex("ja");
  console.log(`■ ${jpSet} ← ${jsonPath} | JSON ${cards.length}장 ${APPLY ? "★APPLY" : "(dry)"}${PRUNE ? " +prune" : ""}`);

  const setRow = await prisma.set.findUnique({ where: { id: jpSet }, select: { setGroupId: true } });
  const sgId = setRow?.setGroupId ?? null;
  const locs = await prisma.cardLocale.findMany({ where: { setId: jpSet }, select: { id: true, number: true, numberInt: true, name: true, logicalCardId: true } });
  const dbNums = new Set(locs.map((l) => l.numberInt ?? numKey(l.number)));
  console.log(`  기존 JP locale ${locs.length} · setGroup ${sgId ?? "—"}`);

  let dexTcg = 0, dexJa = 0, dexNone = 0, matched = 0; const noDex: string[] = [], noJson: string[] = [];
  const updates: { lcid: string; data: any }[] = [];
  for (const l of locs) {
    const c = byNum.get(l.numberInt ?? numKey(l.number));
    if (!c) { noJson.push(`#${l.number} ${l.name}`); continue; }
    matched++;
    const supertype = supertypeOf(c.category);
    const subtypes = subtypesOf(c);
    let dex: number[] = [];
    if (supertype === "Pokémon") {
      dex = dexesFromCard(c, ja);
      if (!dex.length) { dexNone++; noDex.push(`#${c.number} ${c.jaName}`); }
      else if (c.dexId && dex.length === 1) dexTcg++; else dexJa++;
    } else if (c.dexId) { dex = [c.dexId]; }
    updates.push({ lcid: l.logicalCardId, data: {
      supertype: supertype ?? undefined, subtypes, pokedexNumbers: dex,
      illustrator: c.illustrator ?? undefined, hp: c.hp ?? undefined, types: c.types ?? [],
    } });
  }
  const jsonOnlyCnt = cards.filter((c) => !dbNums.has(numKey(c.number))).length;
  console.log(`  매칭 ${matched}/${locs.length} · dex[공식 ${dexTcg}·ja폴백 ${dexJa}·없음 ${dexNone}] · DB노이즈(prune대상) ${noJson.length} · JSON-only(생성예정) ${jsonOnlyCnt}`);
  if (noDex.length) console.log(`   dex못찾음: ${noDex.slice(0, 12).join(", ")}`);
  if (noJson.length) console.log(`   JSON없는 JP행${PRUNE ? "(prune대상)" : ""}: ${noJson.slice(0, 15).join(", ")}`);

  if (!APPLY) { console.log("\n(dry) 적용: --apply [--prune]"); await prisma.$disconnect(); return; }

  for (const u of updates) await prisma.logicalCard.update({ where: { id: u.lcid }, data: u.data });
  console.log(`  ★메타 enrich: LC ${updates.length} 갱신`);

  // JSON-only(DB 미적재) 카드 생성 — 권위 소스에 있으나 DB 갭(예 SM2L #12). LC+JP locale 신규 + setGroupId 부여.
  const jsonOnly = cards.filter((c) => !dbNums.has(numKey(c.number)));
  let created = 0;
  for (const c of jsonOnly) {
    const supertype = supertypeOf(c.category);
    const subtypes = subtypesOf(c);
    let dex: number[] = [];
    if (supertype === "Pokémon") dex = dexesFromCard(c, ja); else if (c.dexId) dex = [c.dexId];
    const numInt = numKey(c.number) || null;
    const lcId = `lc-${jpSet}-${c.number}`;
    if (await prisma.logicalCard.findUnique({ where: { id: lcId } })) continue;
    await prisma.logicalCard.create({ data: {
      id: lcId, setGroupId: sgId ?? undefined, supertype: supertype ?? undefined, subtypes, pokedexNumbers: dex,
      illustrator: c.illustrator ?? undefined, hp: c.hp ?? undefined, types: c.types ?? [],
      primarySetId: jpSet, primaryNumber: c.number, primaryNumberInt: numInt ?? undefined,
    } });
    await prisma.cardLocale.create({ data: {
      id: `${jpSet}-${c.number}`, logicalCardId: lcId, region: "JP", language: "ja", setId: jpSet,
      number: c.number, numberInt: numInt ?? undefined, name: c.jaName, imageSmall: c.image, imageLarge: c.image,
    } });
    created++;
  }
  if (created) console.log(`  ★JSON-only 생성: ${created}장 (${jsonOnly.map((c) => `#${c.number} ${c.jaName}`).join(", ")})`);

  if (PRUNE && noJson.length) {
    const pruneLoc = locs.filter((l) => !byNum.has(l.numberInt ?? numKey(l.number)));
    // 참조(컬렉션/거래) 있는 행은 prune 금지
    const ids = pruneLoc.map((l) => l.id);
    const coll = await prisma.collectionItem.count({ where: { localeId: { in: ids } } });
    const trade = await prisma.trade.count({ where: { localeId: { in: ids } } });
    if (coll + trade > 0) { console.log(`  ⚠️ prune 대상에 참조 ${coll + trade}건 — prune 생략(수동확인)`); }
    else {
      const lcids = [...new Set(pruneLoc.map((l) => l.logicalCardId))];
      await prisma.cardLocale.deleteMany({ where: { id: { in: ids } } });
      // 비워진 LC(다른 지역 locale 없음) 삭제
      const lcs = await prisma.logicalCard.findMany({ where: { id: { in: lcids } }, select: { id: true, locales: { select: { id: true } } } });
      const empty = lcs.filter((l) => l.locales.length === 0).map((l) => l.id);
      if (empty.length) await prisma.logicalCard.deleteMany({ where: { id: { in: empty } } });
      console.log(`  ★prune: JP 노이즈행 ${ids.length} 삭제 · 비워진 LC ${empty.length} 삭제`);
      await prisma.set.update({ where: { id: jpSet }, data: { cardCount: matched } });
    }
  }
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
