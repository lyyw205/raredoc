/**
 * EN 카드를 JP Card 에 정체성(identity) 기준으로 병합 — 번호기반 오병합 교정.
 *   매칭키: dex + subtypes + 통합레어도랭크(EN/JP 레어도 체계 차이 흡수), 버킷내 랭크→번호 순 1:1.
 *   매칭된 EN locale → JP lcid 재지정(KR 처럼 공유). 안 묶이는 EN → 자체 orphan LC(영판전용).
 *   EN 메타는 pokemontcg.io(dex/subtypes/rarity/artist), JP dex 는 이름기준 복구(공유LC 오염 방지).
 *
 * 실행: npx tsx scripts/merge-en-identity.ts <jpSetId> <enSetId> [--apply]
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { resolveCardDexes } from "./lib/pokeapi-names";
import { TR_JP2EN as TR_SV, profResearchEn } from "./lib/trainer-names-sv";
import { TR_JP2EN as TR_SM } from "./lib/trainer-names-sm";
import { TR_JP2EN as TR_SWSH } from "./lib/trainer-names-swsh";
import { TR_JP2EN as TR_XY } from "./lib/trainer-names-xy";
import { TR_JP2EN as TR_BW } from "./lib/trainer-names-bw";
import { TR_JP2EN as TR_HGSS } from "./lib/trainer-names-hgss";
import { TR_JP2EN as TR_DPT } from "./lib/trainer-names-dpt";
import { TR_JP2EN as TR_EX } from "./lib/trainer-names-ex";
import { POKE, isPokemonSupertype } from "./lib/supertype";
import { normLower as norm } from "./lib/text-norm";

const RANK: Record<string, number> = {
  "Common": 1, "Uncommon": 2, "Rare": 3, "Rare Holo": 3, "Holo Rare": 3,
  "Double Rare": 4, "Rare Holo V": 4, "Rare Holo VMAX": 4, "Rare Holo VSTAR": 4, "Rare Holo ex": 4, "Rare Holo EX": 4, "Rare Holo GX": 4,
  "Art Rare": 5, "Illustration Rare": 5, "Triple Rare": 5, "Radiant Rare": 5, "Amazing Rare": 5, "ACE SPEC Rare": 5, "Trainer Gallery Rare Holo": 5,
  "Super Rare": 6, "Ultra Rare": 6, "Rare Ultra": 6, "Rare Holo LV.X": 6, "Character Rare": 6,
  "Special Art Rare": 7, "Special Illustration Rare": 7, "Character Super Rare": 7,
  "Hyper Rare": 8, "Rare Rainbow": 8, "Rare Secret": 8, "Black White Rare": 8, "Shiny Ultra Rare": 8, "Shiny Rare": 7,
};
const rank = (r?: string | null) => (r ? RANK[r] ?? 5 : 5);
// ⚠ "Ultra Rare" 는 언어별로 의미가 다름: EN=풀아트(rank6, JP SR 등가) / JP=골드 최고등급(rank8, EN Hyper Rare 등가).
// JP 카드 등급은 rankJp 로 — JP "Ultra Rare"→8 (한 dex 에 JP SR+골드 공존 시 EN UR/HR 과 올바로 정렬).
const rankJp = (r?: string | null) => (r === "Ultra Rare" || r === "Rare Ultra" ? 8 : rank(r));

const cleanEn = (n: string) => n.replace(/\s+(ex|EX|V|VMAX|VSTAR|GX)\b.*$/i, "").replace(/\s+ex$/i, "")
  .replace(/^(Paldean|Galarian|Alolan|Hisuian)\s+/, "").replace(/\s+(Sunny|Rainy|Snowy)\s+Form$/, "").trim();
const enDex = (n: string): number | null => { let d = resolveCardDexes(cleanEn(n), "en"); if (!d.length) d = resolveCardDexes(n, "en"); return d.length ? d[0] : null; };
const jaDex = (n: string): number | null => { let c = n.replace(/[\[［][^\]］]*[\]］]/g, "").replace(/LV\.?X$/i, "").replace(/(GL|FB|G|C|四)$/, "") /* DPt SP 포켓몬: ヘルガーG[ギンガ]·ナエトルGL［ジムリーダー］·フーディン四[してんのう] 등 */ .replace(/^(なみのり|そらをとぶ|ガラル|アローラ|ヒスイ|パルデア)\s*/, "").replace(/^(ヒート|ウォッシュ|フロスト|スピン|カット)(?=ロトム)/, "").replace(/(ex|ＥＸ|V|VMAX|VSTAR|GX|LEGEND)$/i, "").replace(/\s+/g, "").trim(); if (/[&＆]/.test(c)) { /* 합체 LEGEND: 양 성분 중 최소 dex (ptcg.io nationalPokedexNumbers 오름차순 [0] 관례) */ const ds = c.split(/[&＆]/).map((p) => { const r = resolveCardDexes(p.trim(), "ja" as "ko"); return r.length ? r[0] : null; }).filter((x): x is number => x != null); return ds.length ? Math.min(...ds) : null; } let d = resolveCardDexes(c, "ja" as "ko"); if (!d.length) d = resolveCardDexes(n.replace(/\s+/g, ""), "ja" as "ko"); return d.length ? d[0] : null; };
const sub = (a?: string[] | null) => [...(a ?? [])].sort().join(",");

async function fetchSet(sid: string) {
  const out: any[] = [];
  for (let pg = 1; pg <= 5; pg++) { const r = await fetch(`https://api.pokemontcg.io/v2/cards?q=set.id:${sid}&pageSize=250&page=${pg}`); const j = await r.json(); if (!j.data?.length) break; out.push(...j.data); if (j.data.length < 250) break; }
  return out;
}

async function main() {
  const jpSetArg = process.argv[2], enSet = process.argv[3], APPLY = process.argv.includes("--apply");
  if (!jpSetArg || !enSet) { console.error("usage: <jpSetId[,jpSetId2]> <enSetId> [--apply]"); process.exit(1); }
  const jpSets = jpSetArg.split(",").map((s) => s.trim()).filter(Boolean); // 합본 EN ↔ 분할 JP 다중세트 지원
  const isSWSH = /^en-tcg-swsh/.test(enSet); // SWSH(en-tcg-swsh*)
  const isSM = /^en-tcg-(sm|det)/.test(enSet); // SM(en-tcg-sm*, 프로모 sma/smp, det1 명탐정 포함)
  const isXY = /^en-tcg-(xy|dc|g\d)/.test(enSet); // XY(en-tcg-xy*, dc1 더블크라이시스, g1 제너레이션즈)
  const isBW = /^en-tcg-(bw|dv)/.test(enSet); // BW(en-tcg-bw*, dv1 드래곤볼트)
  const isHGSS = /^en-tcg-(hgss|col)/.test(enSet); // LEGEND/HGSS(en-tcg-hgss*, col1 콜오브레전드)
  const isPt = /^en-tcg-(pl|dp)/.test(enSet); // DPt 시대 전체: Pt(en-tcg-pl1~4) + DP(en-tcg-dp1~7) — trainer-names-dpt.ts 공용(2026-06-06 DP 확장)
  const isEX = /^en-tcg-(ex|ecard|neo|base|gym|si)/.test(enSet); // PCG/ADV+e-Card+NEO+구판(base/gym/si) — 구시대 전체 trainer-names-ex.ts 공용(⚠ PCG/ADV는 JP 원어 미보유)
  const TR_JP2EN = isEX ? TR_EX : isPt ? TR_DPT : isHGSS ? TR_HGSS : isBW ? TR_BW : isXY ? TR_XY : isSWSH ? TR_SWSH : isSM ? TR_SM : TR_SV; // 그 외(SV)는 SV 사전
  const trFile = isEX ? "trainer-names-ex.ts" : isPt ? "trainer-names-dpt.ts" : isHGSS ? "trainer-names-hgss.ts" : isBW ? "trainer-names-bw.ts" : isXY ? "trainer-names-xy.ts" : isSWSH ? "trainer-names-swsh.ts" : isSM ? "trainer-names-sm.ts" : "trainer-names-sv.ts";

  // 1) JP dex 복구(이름기준) — 공유LC 를 JP 정체성으로 되돌림
  const jpRows = await prisma.regionCard.findMany({ where: { setId: { in: jpSets } }, select: { id: true, setId: true, number: true, numberInt: true, name: true, cardId: true, card: { select: { supertype: true, subtypes: true, pokedexNumbers: true, illustrator: true, rarity: { select: { code: true } } } } } });
  let jfix = 0;
  for (const l of jpRows) { if (!isPokemonSupertype(l.card.supertype)) continue; const d = jaDex(l.name); if (d && l.card.pokedexNumbers?.[0] !== d) { if (APPLY) await prisma.card.update({ where: { id: l.cardId }, data: { pokedexNumbers: [d] } }); jfix++; } }

  // 1b) JP subtypes 일관성 정규화 — 같은이름 포켓몬은 진화단계 동일해야(시크릿 오류 교정, 최저랭크=베이스 권위)
  const STAGES = ["Basic", "Stage 1", "Stage 2"];
  const jpByName = new Map<string, typeof jpRows>();
  for (const j of jpRows) { if (!isPokemonSupertype(j.card.supertype)) continue; (jpByName.get(j.name) ?? jpByName.set(j.name, []).get(j.name))!.push(j); }
  let sfix = 0;
  for (const [, rows] of jpByName) {
    if (rows.length < 2) continue;
    const auth = rows.slice().sort((a, b) => rankJp(a.card.rarity?.code) - rankJp(b.card.rarity?.code) || (a.numberInt ?? 0) - (b.numberInt ?? 0))[0];
    const authStage = (auth.card.subtypes ?? []).find((s) => STAGES.includes(s));
    if (!authStage) continue;
    for (const j of rows) {
      const subs = j.card.subtypes ?? [];
      const cur = subs.find((s) => STAGES.includes(s));
      if (cur && cur !== authStage) { const ns = subs.map((s) => STAGES.includes(s) ? authStage : s); if (APPLY) await prisma.card.update({ where: { id: j.cardId }, data: { subtypes: ns } }); j.card.subtypes = ns; sfix++; }
    }
  }

  // 2) EN 메타(pokemontcg.io)
  //    pokemontcg.io set.id 는 prefix 없는 코드(sm1 등). DB locale setId 가 en-tcg-<code> 면 그 코드로 fetch.
  const ptcgSet = enSet.replace(/^en-tcg-/, "");
  const cards = await fetchSet(ptcgSet);
  //    번호 표기 정규화(DB "001" vs pokemontcg.io "1"): 숫자부 선행 0 제거, 알파벳 접미사 유지("121a").
  const numKey = (n: string) => n.replace(/^0+(?=\d)/, "");
  const byNum = new Map(cards.map((c: any) => [numKey(String(c.number)), c]));
  const enRows = await prisma.regionCard.findMany({ where: { setId: enSet }, select: { id: true, number: true, numberInt: true, name: true, cardId: true } });

  // 3) JP 버킷(포켓몬): dex|subtypes → [{lcid, rank, numInt, subs}]
  //    ⚠ JP DB 는 EN 메커니즘 subtype(Tera 테라스탈 · Ancient 고대 · Future 미래 · Radiant かがやく)을 안 담음
  //    → 버킷키에서 제외(subN)해 매칭하고, 매칭된 JP LC 에 해당 subtype 백필(JP 데이터 enrich).
  // ⚠ LEGEND 는 ENMECH 금지: JP LC 에 이미 enrich 백필됨 + 제외시 col1 SL(비-LEGEND 샤이니)이 JP 합체 LEGEND 와 오병합(2026-06-06 발현·교정)
  const ENMECH = ["Tera", "Ancient", "Future", "Radiant", "Restored", "TAG TEAM", "Prism Star", "Ultra Beast", "Single Strike", "Rapid Strike", "Fusion Strike", "Team Plasma", "Prime", "SP", "Level-Up", "Team Magma", "Team Aqua"]; // SP·Level-Up=DPt 시대(G/GL/四/LV.X) · Team Magma/Aqua=ADV4(ex4, 2026-06-06)
  const subN = (a?: string[] | null) => [...(a ?? [])].filter((s) => !ENMECH.includes(s)).sort().join(",");
  const jpById = new Map(jpRows.map((j) => [j.id, j]));
  const jpPoke = jpRows.filter((j) => isPokemonSupertype(j.card.supertype) && (j.card.pokedexNumbers?.length));

  // 1c) JP subtype 결손 백필 — SWSH 일부 JP 세트(S2a 90%·S5a/S6a 100% 등)가 stage·접미어(V/VMAX 등) 누락 → dex|subtype 버킷 어긋나 미매칭.
  //     접미어는 JP 카드 *이름*에서 유도(バシャーモV→V), stage 는 EN 카드(완전)의 dex+접미어→stage 로 보충.
  const STAGES_BF = ["Basic", "Stage 1", "Stage 2"];
  const SUF_BF = ["V", "VMAX", "VSTAR", "GX", "ex", "EX"];
  const sufOf = (subs: string[]) => subs.find((s) => SUF_BF.includes(s)) ?? "";
  const nameSuf = (name: string): string => { const n = (name.split(/<span/)[0]).replace(/[Ｖ]/g, "V").replace(/[\s　]/g, ""); if (/VMAX$/.test(n)) return "VMAX"; if (/VSTAR$/.test(n)) return "VSTAR"; if (/V$/.test(n)) return "V"; if (/GX$/i.test(n)) return "GX"; if (/(ex|EX)$/.test(n)) return "ex"; return ""; };
  const enStageMap = new Map<string, string>();
  for (const c of cards) { if (!isPokemonSupertype(c.supertype)) continue; const st = (c.subtypes ?? []).find((s: string) => STAGES_BF.includes(s)); if (!st) continue; const suf = sufOf(c.subtypes ?? []); for (const d of (c.nationalPokedexNumbers ?? [])) { const k = `${d}|${suf}`; if (!enStageMap.has(k)) enStageMap.set(k, st); } }
  let stageBf = 0;
  for (const j of jpPoke) {
    const subs = j.card.subtypes ?? [];
    const suf = nameSuf(j.name); // 이름 유도 접미어
    const need: string[] = [];
    if (suf && !subs.some((s) => s.toUpperCase() === suf.toUpperCase())) need.push(suf); // 접미어 결손 보충
    const drop = suf === "VSTAR" ? ["VMAX"] : []; // VSTAR 카드는 VMAX 아님 — JP 오라벨(VMAX) 제거(S9~S12 VSTAR 자동교정)
    const hasStage = subs.some((s) => [...STAGES_BF, "VMAX", "VSTAR", "BREAK"].includes(s)) || suf === "VMAX" || suf === "VSTAR"; // BREAK 은 자체 stage(EN ptcg.io 관례 subtypes:["BREAK"]) — 일반판 stage 주입 금지
    if (!hasStage) { const dex = j.card.pokedexNumbers?.[0]; const st = dex != null ? enStageMap.get(`${dex}|${suf}`) : null; if (st) need.push(st); }
    if (need.length || drop.some((d) => subs.includes(d))) { const ns = [...new Set([...need, ...subs])].filter((s) => !drop.includes(s)); if (APPLY) await prisma.card.update({ where: { id: j.cardId }, data: { subtypes: ns } }); j.card.subtypes = ns; stageBf++; }
  }

  const jpBucket = new Map<string, { lcid: string; rank: number; numInt: number; subs: string[] }[]>();
  // 타그팀(複dex)은 정렬 멀티덱스키("3&251")로 — EN nationalPokedexNumbers 와 JP pokedexNumbers 순서가 달라도 일치. 단일은 jaDex(폼교정)/첫dex.
  for (const j of jpPoke) { const pn = j.card.pokedexNumbers!; const dexKey = pn.length >= 2 ? [...pn].sort((a, b) => a - b).join("&") : String(jaDex(j.name) ?? pn[0]); const k = `${dexKey}|${subN(j.card.subtypes)}`; (jpBucket.get(k) ?? jpBucket.set(k, []).get(k))!.push({ lcid: j.cardId, rank: rankJp(j.card.rarity?.code), numInt: j.numberInt ?? 0, subs: j.card.subtypes ?? [] }); }
  for (const a of jpBucket.values()) a.sort((x, y) => x.rank - y.rank || x.numInt - y.numInt);

  // 4) EN 포켓몬 매칭
  type EnId = { loc: typeof enRows[0]; c: any; dex: number | null; dexKey: string | null; subs: string[]; rank: number };
  const enIds: EnId[] = enRows.map((e) => { const c = byNum.get(numKey(e.number)); const isPoke = c && isPokemonSupertype(c.supertype); const nd: number[] = c?.nationalPokedexNumbers ?? []; const dex = isPoke ? (nd[0] ?? enDex(e.name)) : null; const dexKey = isPoke ? (nd.length >= 2 ? [...nd].sort((a, b) => a - b).join("&") : (dex != null ? String(dex) : null)) : null; return { loc: e, c, dex, dexKey, subs: c?.subtypes ?? [], rank: rank(c?.rarity) }; });
  const enByBucket = new Map<string, EnId[]>();
  for (const e of enIds) { if (e.dexKey == null) continue; const k = `${e.dexKey}|${subN(e.subs)}`; (enByBucket.get(k) ?? enByBucket.set(k, []).get(k))!.push(e); }

  const repoint = new Map<string, string>(); // enLocId → jpLcid
  const subEnrich = new Map<string, string[]>(); // jpLcid → JP subtypes + EN메커니즘(Tera/Ancient/Future)
  // 랭크-인식 페어링: *동일 통합랭크*끼리(EN UltraRare=JP SuperRare=6, EN SIR=JP SAR=7, EN HyperRare=JP UltraRare골드=8 …)
  // 번호순 우선 → 남는건 랭크근접 폴백. (단순 인덱스 zip 은 한쪽에 여분 저/고랭크가 있으면 전체가 어긋남)
  const rankZip = <J extends { rank: number }, E extends { rank: number }>(jlIn: J[], esIn: E[], jnum: (j: J) => number, enum_: (e: E) => number, onPair: (e: E, j: J) => void) => {
    const jl = jlIn.slice().sort((a, b) => a.rank - b.rank || jnum(a) - jnum(b));
    const es = esIn.slice().sort((a, b) => a.rank - b.rank || enum_(a) - enum_(b));
    const usedJ = new Set<number>(); const pairedE = new Set<E>();
    for (const e of es) { const i = jl.findIndex((j, idx) => !usedJ.has(idx) && j.rank === e.rank); if (i >= 0) { usedJ.add(i); pairedE.add(e); onPair(e, jl[i]); } }
    for (const e of es) { if (pairedE.has(e)) continue; let bi = -1, bd = Infinity; jl.forEach((j, idx) => { if (usedJ.has(idx)) return; const d = Math.abs(j.rank - e.rank); if (d < bd) { bd = d; bi = idx; } }); if (bi >= 0) { usedJ.add(bi); onPair(e, jl[bi]); } }
  };
  const pair = (e: EnId, lcid: string, jsubs: string[]) => { repoint.set(e.loc.id, lcid); const add = ENMECH.filter((m) => e.subs.includes(m) && !jsubs.includes(m)); if (add.length) subEnrich.set(lcid, [...new Set([...jsubs, ...add])]); };
  for (const [k, el] of enByBucket) rankZip(jpBucket.get(k) ?? [], el, (j) => j.numInt, (e) => e.loc.numberInt ?? 0, (e, j) => pair(e, j.lcid, j.subs));

  // 4b) 트레이너/스타디움: JP↔EN *이름 사전*(TR_JP2EN) + 랭크 zip.
  //     일러는 같은 일러에 여러 카드가 섞여 스크램블되므로 이름이 정체성. 사전 미등록 JP명은 경고.
  //     매칭된 JP LC 에 EN subtype 백필(JP 데이터 교정). subtypeBackfill: jpLcid → EN subtypes
  const subtypeBackfill = new Map<string, string[]>();
  const jpTr = jpRows.filter((j) => !isPokemonSupertype(j.card.supertype) && j.card.supertype && j.card.supertype !== "Energy");
  const jpTrByEn = new Map<string, { lcid: string; rank: number; numInt: number; subs: string[]; jpName: string; num: string }[]>();
  const unmappedJp: string[] = [];
  for (const j of jpTr) { const en = (j.name === "博士の研究" && !TR_JP2EN["博士の研究"]) ? profResearchEn(j.setId) : TR_JP2EN[j.name]; if (!en) { unmappedJp.push(`#${j.number} ${j.name}`); continue; } (jpTrByEn.get(en) ?? jpTrByEn.set(en, []).get(en))!.push({ lcid: j.cardId, rank: rankJp(j.card.rarity?.code), numInt: j.numberInt ?? 0, subs: j.card.subtypes ?? [], jpName: j.name, num: j.number }); }
  for (const a of jpTrByEn.values()) a.sort((x, y) => x.rank - y.rank || x.numInt - y.numInt);
  const enTrByName = new Map<string, EnId[]>();
  for (const e of enIds) { if (e.dex != null) continue; const c = e.c; if (!c || isPokemonSupertype(c.supertype) || c.supertype === "Energy") continue; (enTrByName.get(e.loc.name) ?? enTrByName.set(e.loc.name, []).get(e.loc.name))!.push(e); }
  for (const [en, jl] of jpTrByEn) rankZip(jl, enTrByName.get(en) ?? [], (j) => j.numInt, (e) => e.loc.numberInt ?? 0, (e, j) => { if (repoint.has(e.loc.id)) return; repoint.set(e.loc.id, j.lcid); if (!j.subs.length && e.subs.length) subtypeBackfill.set(j.lcid, e.subs); });
  if (unmappedJp.length) console.log(`  ⚠ 사전 미등록 JP 트레이너 ${unmappedJp.length}장(${trFile} 추가 필요): ${unmappedJp.join(", ")}`);

  // 4c) 기본에너지: 에너지타입 매칭(일러 없음). JP 基本X / EN Basic Y Energy
  const ETYPE: Record<string, string> = { "草": "Grass", "炎": "Fire", "水": "Water", "雷": "Lightning", "超": "Psychic", "闘": "Fighting", "悪": "Darkness", "鋼": "Metal", "フェアリー": "Fairy", "無": "Colorless" };
  const jpEnergyType = (n: string) => { const m = n.match(/基本(.+?)エネルギー/); return m ? ETYPE[m[1]] ?? null : null; };
  const enEnergyType = (n: string) => { const m = n.match(/Basic\s+(\w+)\s+Energy/i); return m ? m[1] : null; };
  const jpBasicE = new Map<string, string>(); // type → jpLcid
  for (const j of jpRows) { if (j.card.supertype !== "Energy") continue; const t = jpEnergyType(j.name); if (t) jpBasicE.set(t, j.cardId); }
  // EN 메타없음(c=null)이어도 이름이 "... Energy" 면 에너지로 간주(ptcg.io 가 에너지 메타 누락하는 세트: xy12 등)
  for (const e of enIds) { if (repoint.has(e.loc.id)) continue; const isE = e.c ? e.c.supertype === "Energy" : /\sEnergy$/.test(e.loc.name); if (!isE) continue; const t = enEnergyType(e.loc.name); const lc = t ? jpBasicE.get(t) : null; if (lc) repoint.set(e.loc.id, lc); }
  // 특수에너지: EN명↔JP명 검증쌍 직매칭 (기본에너지 패턴 밖)
  const SPECIAL_E: Record<string, string> = { "Double Colorless Energy": "ダブル無色エネルギー", "Double Aqua Energy": "ダブルアクアエネルギー", "Double Magma Energy": "ダブルマグマエネルギー", "Blend Energy GrassFirePsychicDarkness": "ブレンドエネルギー 草炎超悪", "Blend Energy WaterLightningFightingMetal": "ブレンドエネルギー 水雷闘鋼", "Plasma Energy": "プラズマエネルギー", "Rainbow Energy": "レインボーエネルギー", "Rescue Energy": "レスキューエネルギー", "SP Energy": "SPエネルギー", "Upper Energy": "アッパーエネルギー" };
  const jpEnergyByName = new Map<string, string>();
  for (const j of jpRows) { if (j.card.supertype === "Energy") jpEnergyByName.set(j.name.split(/<span/)[0].trim(), j.cardId); }
  for (const e of enIds) { if (repoint.has(e.loc.id)) continue; const ja = SPECIAL_E[e.loc.name]; const lc = ja ? jpEnergyByName.get(ja) : null; if (lc) repoint.set(e.loc.id, lc); }

  // 5) 미매칭 EN → orphan
  const orphan = enIds.filter((e) => !repoint.has(e.loc.id));
  let merged = 0, orphaned = 0, sample: string[] = [];
  if (APPLY) {
    for (const [jpLcid, subs] of subtypeBackfill) await prisma.card.update({ where: { id: jpLcid }, data: { subtypes: subs } });
    for (const [jpLcid, subs] of subEnrich) await prisma.card.update({ where: { id: jpLcid }, data: { subtypes: subs } });
    for (const [enLocId, jpLcid] of repoint) { await prisma.regionCard.update({ where: { id: enLocId }, data: { cardId: jpLcid } }); merged++; }
    for (const e of orphan) { const lcId = `lc-orphan-${enSet}-${e.loc.number}`; const data: any = { supertype: e.c?.supertype ?? "Pokémon", subtypes: e.subs, pokedexNumbers: e.dex != null ? [e.dex] : [] }; if (e.c?.artist) data.illustrator = e.c.artist; if (await prisma.card.findUnique({ where: { id: lcId } })) await prisma.card.update({ where: { id: lcId }, data }); else await prisma.card.create({ data: { id: lcId, primarySetId: enSet, primaryNumber: e.loc.number, ...data } }); await prisma.regionCard.update({ where: { id: e.loc.id }, data: { cardId: lcId } }); orphaned++; }
  } else {
    merged = repoint.size; orphaned = orphan.length;
    for (const [enLocId, jpLcid] of [...repoint].slice(0, 6)) { const e = enRows.find((x) => x.id === enLocId)!; const j = jpById.get([...jpRows].find((r) => r.cardId === jpLcid)?.id ?? ""); sample.push(`EN#${e.number}${e.name} → JP#${j?.number}${j?.name}`); }
    // orphan 진단: 같은 정체성 버킷에 *미소진* JP(EN짝 없는 JP)가 남아있으면 ⚠의심(매칭누락) — 검증게이트 ②
    // 버킷의 JP 가 모두 소진됐는데 EN 이 더 많은 경우(잉여)는 ✔단독(같은 포켓몬의 추가 레어도 등).
    const matchedJp = new Set(repoint.values());
    let suspect = 0; const lines: string[] = [];
    for (const e of orphan.sort((a, b) => (a.loc.numberInt ?? 0) - (b.loc.numberInt ?? 0))) {
      const c = e.c;
      if (e.dex != null) { const k = `${e.dex}|${sub(e.subs)}`; const jl = (jpBucket.get(k) ?? []).filter((x) => !matchedJp.has(x.lcid)); const f = jl.length ? "⚠의심" : "✔단독"; if (jl.length) suspect++; lines.push(`  ${f} EN#${e.loc.number} ${e.loc.name} [P ${k} ${c?.rarity}]${jl.length ? ` ↔ 미소진JP ${jl.length}장` : ""}`); }
      else if (c && c.supertype !== "Energy" && !isPokemonSupertype(c.supertype)) { const jl = (jpTrByEn.get(e.loc.name) ?? []).filter((x) => !matchedJp.has(x.lcid)); const f = jl.length ? "⚠의심" : "✔단독"; if (jl.length) suspect++; lines.push(`  ${f} EN#${e.loc.number} ${e.loc.name} [${c.supertype} ${c.rarity}]${jl.length ? ` ↔ 미소진JP동명 ${jl.map((x) => "#" + x.num + x.jpName).join(",")}` : ""}`); }
      else lines.push(`  ? EN#${e.loc.number} ${e.loc.name} [메타없음]`);
    }
    console.log(lines.join("\n"));
    console.log(`  → orphan 중 ⚠의심(미소진 JP 존재=매칭누락) ${suspect}장`);
    // 보완: EN짝 없는 JP 포켓몬을 dex만으로 orphan EN 과 대조(subtypes 오류로 버킷 어긋난 Ninetales형 누락 탐지)
    const orphanDexSubs = new Map<number, Set<string>>();
    for (const e of orphan) if (e.dex != null) (orphanDexSubs.get(e.dex) ?? orphanDexSubs.set(e.dex, new Set()).get(e.dex))!.add(sub(e.subs));
    const jpUnmatchedSameDex: string[] = [];
    for (const j of jpPoke) { if (matchedJp.has(j.cardId)) continue; const dex = jaDex(j.name) ?? j.card.pokedexNumbers![0]; if (orphanDexSubs.has(dex)) jpUnmatchedSameDex.push(`JP#${j.number} ${j.name} [dex${dex} ${sub(j.card.subtypes)}] ↔ orphanEN subtypes:{${[...orphanDexSubs.get(dex)!].join(" / ")}}`); }
    if (jpUnmatchedSameDex.length) { console.log(`  ⚠ subtypes 어긋남 의심(EN짝없는 JP 인데 같은dex orphan EN 존재) ${jpUnmatchedSameDex.length}장:`); jpUnmatchedSameDex.forEach((s) => console.log("    " + s)); }
    else console.log(`  → subtypes 어긋남 의심 0장(EN짝없는 JP 중 orphan과 같은 dex 없음)`);
    // 트레이너 페어 덤프(이름사전 매칭 결과 — EN명별로 JP명이 일관되는지 눈으로 검증)
    const jpByLcid2 = new Map(jpRows.map((r) => [r.cardId, r]));
    const trPairs: { en: string; enNum: string; jp: string; jpNum: string }[] = [];
    for (const [enLocId, jpLcid] of repoint) { const e = enRows.find((x) => x.id === enLocId)!; const c = byNum.get(numKey(e.number)); if (!c || isPokemonSupertype(c.supertype) || c.supertype === "Energy") continue; const j = jpByLcid2.get(jpLcid); if (j) trPairs.push({ en: e.name, enNum: e.number, jp: j.name, jpNum: j.number }); }
    const byEnName = new Map<string, typeof trPairs>(); for (const p of trPairs) { const base = p.en.replace(/\s*\(.*\)$/, ""); (byEnName.get(base) ?? byEnName.set(base, []).get(base))!.push(p); }
    console.log(`  ── 트레이너 페어 ${trPairs.length}장(EN명별; ★=한 EN명에 JP명 2종↑=확인필요) ──`);
    for (const [en, ps] of [...byEnName].sort((a, b) => a[0].localeCompare(b[0]))) { const multi = new Set(ps.map((p) => p.jp)).size > 1; ps.sort((a, b) => (parseInt(a.enNum) || 0) - (parseInt(b.enNum) || 0)); console.log(`  ${multi ? "★" : " "} ${en}: ` + ps.map((p) => `EN#${p.enNum}→JP#${p.jpNum}${p.jp}`).join(" | ")); }
  }
  console.log(`■ ${enSet}→${jpSetArg} ${APPLY ? "★적용" : "(dry)"} | JP dex복구 ${jfix} · subtypes정규화 ${sfix} · Tera/古代/未来 enrich ${subEnrich.size} · EN병합 ${merged} · 영판전용(orphan) ${orphaned}`);
  if (sample.length) console.log("  예: " + sample.join(" | "));
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
