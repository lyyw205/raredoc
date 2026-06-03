/**
 * EN 카드를 JP LogicalCard 에 정체성(identity) 기준으로 병합 — 번호기반 오병합 교정.
 *   매칭키: dex + subtypes + 통합레어도랭크(EN/JP 레어도 체계 차이 흡수), 버킷내 랭크→번호 순 1:1.
 *   매칭된 EN locale → JP lcid 재지정(KR 처럼 공유). 안 묶이는 EN → 자체 orphan LC(영판전용).
 *   EN 메타는 pokemontcg.io(dex/subtypes/rarity/artist), JP dex 는 이름기준 복구(공유LC 오염 방지).
 *
 * 실행: npx tsx scripts/merge-en-identity.ts <jpSetId> <enSetId> [--apply]
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { resolveCardDexes } from "./lib/pokeapi-names";

const RANK: Record<string, number> = {
  "Common": 1, "Uncommon": 2, "Rare": 3, "Rare Holo": 3, "Holo Rare": 3,
  "Double Rare": 4, "Rare Holo V": 4, "Rare Holo VMAX": 4, "Rare Holo VSTAR": 4, "Rare Holo ex": 4, "Rare Holo EX": 4, "Rare Holo GX": 4,
  "Art Rare": 5, "Illustration Rare": 5, "Triple Rare": 5, "Radiant Rare": 5, "Amazing Rare": 5, "ACE SPEC Rare": 5, "Trainer Gallery Rare Holo": 5,
  "Super Rare": 6, "Ultra Rare": 6, "Rare Ultra": 6, "Rare Holo LV.X": 6, "Character Rare": 6,
  "Special Art Rare": 7, "Special Illustration Rare": 7, "Character Super Rare": 7,
  "Hyper Rare": 8, "Rare Rainbow": 8, "Rare Secret": 8, "Black White Rare": 8, "Shiny Ultra Rare": 8, "Shiny Rare": 7,
};
const rank = (r?: string | null) => (r ? RANK[r] ?? 5 : 5);

const cleanEn = (n: string) => n.replace(/\s+(ex|EX|V|VMAX|VSTAR|GX)\b.*$/i, "").replace(/\s+ex$/i, "")
  .replace(/^(Paldean|Galarian|Alolan|Hisuian)\s+/, "").replace(/\s+(Sunny|Rainy|Snowy)\s+Form$/, "").trim();
const enDex = (n: string): number | null => { let d = resolveCardDexes(cleanEn(n), "en"); if (!d.length) d = resolveCardDexes(n, "en"); return d.length ? d[0] : null; };
const jaDex = (n: string): number | null => { const c = n.replace(/^(なみのり|そらをとぶ|ガラル|アローラ|ヒスイ|パルデア)\s*/, "").replace(/(ex|ＥＸ|V|VMAX|VSTAR|GX)$/i, "").replace(/\s+/g, "").trim(); let d = resolveCardDexes(c, "ja" as "ko"); if (!d.length) d = resolveCardDexes(n.replace(/\s+/g, ""), "ja" as "ko"); return d.length ? d[0] : null; };
const POKE = ["Pokémon", "Pokemon"];
const sub = (a?: string[] | null) => [...(a ?? [])].sort().join(",");

async function fetchSet(sid: string) {
  const out: any[] = [];
  for (let pg = 1; pg <= 5; pg++) { const r = await fetch(`https://api.pokemontcg.io/v2/cards?q=set.id:${sid}&pageSize=250&page=${pg}`); const j = await r.json(); if (!j.data?.length) break; out.push(...j.data); if (j.data.length < 250) break; }
  return out;
}

async function main() {
  const jpSet = process.argv[2], enSet = process.argv[3], APPLY = process.argv.includes("--apply");
  if (!jpSet || !enSet) { console.error("usage: <jpSetId> <enSetId> [--apply]"); process.exit(1); }

  // 1) JP dex 복구(이름기준) — 공유LC 를 JP 정체성으로 되돌림
  const jpRows = await prisma.cardLocale.findMany({ where: { setId: jpSet }, select: { id: true, number: true, numberInt: true, name: true, logicalCardId: true, logicalCard: { select: { supertype: true, subtypes: true, pokedexNumbers: true, illustrator: true, rarity: { select: { code: true } } } } } });
  let jfix = 0;
  for (const l of jpRows) { if (!POKE.includes(l.logicalCard.supertype ?? "")) continue; const d = jaDex(l.name); if (d && l.logicalCard.pokedexNumbers?.[0] !== d) { if (APPLY) await prisma.logicalCard.update({ where: { id: l.logicalCardId }, data: { pokedexNumbers: [d] } }); jfix++; } }

  // 1b) JP subtypes 일관성 정규화 — 같은이름 포켓몬은 진화단계 동일해야(시크릿 오류 교정, 최저랭크=베이스 권위)
  const STAGES = ["Basic", "Stage 1", "Stage 2"];
  const jpByName = new Map<string, typeof jpRows>();
  for (const j of jpRows) { if (!POKE.includes(j.logicalCard.supertype ?? "")) continue; (jpByName.get(j.name) ?? jpByName.set(j.name, []).get(j.name))!.push(j); }
  let sfix = 0;
  for (const [, rows] of jpByName) {
    if (rows.length < 2) continue;
    const auth = rows.slice().sort((a, b) => rank(a.logicalCard.rarity?.code) - rank(b.logicalCard.rarity?.code) || (a.numberInt ?? 0) - (b.numberInt ?? 0))[0];
    const authStage = (auth.logicalCard.subtypes ?? []).find((s) => STAGES.includes(s));
    if (!authStage) continue;
    for (const j of rows) {
      const subs = j.logicalCard.subtypes ?? [];
      const cur = subs.find((s) => STAGES.includes(s));
      if (cur && cur !== authStage) { const ns = subs.map((s) => STAGES.includes(s) ? authStage : s); if (APPLY) await prisma.logicalCard.update({ where: { id: j.logicalCardId }, data: { subtypes: ns } }); j.logicalCard.subtypes = ns; sfix++; }
    }
  }

  // 2) EN 메타(pokemontcg.io)
  const cards = await fetchSet(enSet);
  const byNum = new Map(cards.map((c: any) => [c.number, c]));
  const enRows = await prisma.cardLocale.findMany({ where: { setId: enSet }, select: { id: true, number: true, numberInt: true, name: true, logicalCardId: true } });

  // 3) JP 버킷(포켓몬): dex|subtypes → [{lcid, rank, numInt}]
  const jpById = new Map(jpRows.map((j) => [j.id, j]));
  const jpPoke = jpRows.filter((j) => POKE.includes(j.logicalCard.supertype ?? "") && (j.logicalCard.pokedexNumbers?.length));
  const jpBucket = new Map<string, { lcid: string; rank: number; numInt: number }[]>();
  for (const j of jpPoke) { const dex = jaDex(j.name) ?? j.logicalCard.pokedexNumbers![0]; const k = `${dex}|${sub(j.logicalCard.subtypes)}`; (jpBucket.get(k) ?? jpBucket.set(k, []).get(k))!.push({ lcid: j.logicalCardId, rank: rank(j.logicalCard.rarity?.code), numInt: j.numberInt ?? 0 }); }
  for (const a of jpBucket.values()) a.sort((x, y) => x.rank - y.rank || x.numInt - y.numInt);

  // 4) EN 포켓몬 매칭
  type EnId = { loc: typeof enRows[0]; c: any; dex: number | null; subs: string[]; rank: number };
  const enIds: EnId[] = enRows.map((e) => { const c = byNum.get(e.number); const isPoke = c && POKE.includes(c.supertype ?? ""); const dex = isPoke ? (c.nationalPokedexNumbers?.[0] ?? enDex(e.name)) : null; return { loc: e, c, dex, subs: c?.subtypes ?? [], rank: rank(c?.rarity) }; });
  const enByBucket = new Map<string, EnId[]>();
  for (const e of enIds) { if (e.dex == null) continue; const k = `${e.dex}|${sub(e.subs)}`; (enByBucket.get(k) ?? enByBucket.set(k, []).get(k))!.push(e); }

  const repoint = new Map<string, string>(); // enLocId → jpLcid
  for (const [k, el] of enByBucket) { const jl = (jpBucket.get(k) ?? []).slice(); const es = el.slice().sort((a, b) => a.rank - b.rank || (a.loc.numberInt ?? 0) - (b.loc.numberInt ?? 0)); const n = Math.min(jl.length, es.length); for (let i = 0; i < n; i++) repoint.set(es[i].loc.id, jl[i].lcid); }

  // 4b) 트레이너/에너지: 일러스트레이터 버킷 → 랭크/번호 순 1:1 (JP subtypes 결손이라 일러만; JP/EN 같은 아트=같은 일러)
  //     매칭된 JP LC 에 EN subtype 백필(JP 데이터 교정). subtypeBackfill: jpLcid → EN subtypes
  const norm = (s?: string | null) => (s ?? "").trim().toLowerCase();
  const subtypeBackfill = new Map<string, string[]>();
  const jpTr = jpRows.filter((j) => !POKE.includes(j.logicalCard.supertype ?? "") && j.logicalCard.supertype);
  const jpTrBucket = new Map<string, { lcid: string; rank: number; numInt: number; subs: string[] }[]>();
  for (const j of jpTr) { const il = norm((j as any).logicalCard.illustrator); if (!il) continue; (jpTrBucket.get(il) ?? jpTrBucket.set(il, []).get(il))!.push({ lcid: j.logicalCardId, rank: rank(j.logicalCard.rarity?.code), numInt: j.numberInt ?? 0, subs: j.logicalCard.subtypes ?? [] }); }
  for (const a of jpTrBucket.values()) a.sort((x, y) => x.rank - y.rank || x.numInt - y.numInt);
  const enTrByBucket = new Map<string, EnId[]>();
  for (const e of enIds) { if (e.dex != null) continue; const c = e.c; if (!c || POKE.includes(c.supertype ?? "")) continue; const il = norm(c.artist); if (!il) continue; (enTrByBucket.get(il) ?? enTrByBucket.set(il, []).get(il))!.push(e); }
  for (const [il, el] of enTrByBucket) { const jl = (jpTrBucket.get(il) ?? []).slice(); const es = el.slice().sort((a, b) => a.rank - b.rank || (a.loc.numberInt ?? 0) - (b.loc.numberInt ?? 0)); const n = Math.min(jl.length, es.length); for (let i = 0; i < n; i++) { if (repoint.has(es[i].loc.id)) continue; repoint.set(es[i].loc.id, jl[i].lcid); if (!jl[i].subs.length && es[i].subs.length) subtypeBackfill.set(jl[i].lcid, es[i].subs); } }

  // 4c) 기본에너지: 에너지타입 매칭(일러 없음). JP 基本X / EN Basic Y Energy
  const ETYPE: Record<string, string> = { "草": "Grass", "炎": "Fire", "水": "Water", "雷": "Lightning", "超": "Psychic", "闘": "Fighting", "悪": "Darkness", "鋼": "Metal", "フェアリー": "Fairy", "無": "Colorless" };
  const jpEnergyType = (n: string) => { const m = n.match(/基本(.+?)エネルギー/); return m ? ETYPE[m[1]] ?? null : null; };
  const enEnergyType = (n: string) => { const m = n.match(/Basic\s+(\w+)\s+Energy/i); return m ? m[1] : null; };
  const jpBasicE = new Map<string, string>(); // type → jpLcid
  for (const j of jpRows) { if (j.logicalCard.supertype !== "Energy") continue; const t = jpEnergyType(j.name); if (t) jpBasicE.set(t, j.logicalCardId); }
  for (const e of enIds) { if (repoint.has(e.loc.id)) continue; if (!e.c || e.c.supertype !== "Energy") continue; const t = enEnergyType(e.loc.name); const lc = t ? jpBasicE.get(t) : null; if (lc) repoint.set(e.loc.id, lc); }

  // 5) 미매칭 EN → orphan
  const orphan = enIds.filter((e) => !repoint.has(e.loc.id));
  let merged = 0, orphaned = 0, sample: string[] = [];
  if (APPLY) {
    for (const [jpLcid, subs] of subtypeBackfill) await prisma.logicalCard.update({ where: { id: jpLcid }, data: { subtypes: subs } });
    for (const [enLocId, jpLcid] of repoint) { await prisma.cardLocale.update({ where: { id: enLocId }, data: { logicalCardId: jpLcid } }); merged++; }
    for (const e of orphan) { const lcId = `lc-orphan-${enSet}-${e.loc.number}`; const data: any = { supertype: e.c?.supertype ?? "Pokémon", subtypes: e.subs, pokedexNumbers: e.dex != null ? [e.dex] : [] }; if (e.c?.artist) data.illustrator = e.c.artist; if (await prisma.logicalCard.findUnique({ where: { id: lcId } })) await prisma.logicalCard.update({ where: { id: lcId }, data }); else await prisma.logicalCard.create({ data: { id: lcId, primarySetId: enSet, primaryNumber: e.loc.number, ...data } }); await prisma.cardLocale.update({ where: { id: e.loc.id }, data: { logicalCardId: lcId } }); orphaned++; }
  } else {
    merged = repoint.size; orphaned = orphan.length;
    for (const [enLocId, jpLcid] of [...repoint].slice(0, 6)) { const e = enRows.find((x) => x.id === enLocId)!; const j = jpById.get([...jpRows].find((r) => r.logicalCardId === jpLcid)?.id ?? ""); sample.push(`EN#${e.number}${e.name} → JP#${j?.number}${j?.name}`); }
  }
  console.log(`■ ${enSet}→${jpSet} ${APPLY ? "★적용" : "(dry)"} | JP dex복구 ${jfix} · EN병합 ${merged} · 영판전용(orphan) ${orphaned}`);
  if (sample.length) console.log("  예: " + sample.join(" | "));
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
