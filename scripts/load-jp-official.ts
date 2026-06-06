/**
 * JP 세트를 일본공식(pokemon-card.com) 수집 JSON 으로 적재(덮어쓰기). tcgdex 불완전 팩용.
 * 기존 JP CardLocale+LC(primarySetId=이세트) 통삭제 후 JSON 으로 재생성. rarity 는 KR 백필로(여기선 미설정).
 * dex: JSON dexId 우선, 없으면 PokeAPI ja(폼접두어 제거) 폴백. subtypes: stage+suffix/trainerType.
 *
 * 실행: npx tsx scripts/load-jp-official.ts <jpSetId> <jsonPath> [--apply]
 *   예: npx tsx scripts/load-jp-official.ts jp-sv-paldean-fates data/jp-official/jp-sv4a.json --apply
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
    if (suf === "ex") out.push("ex"); else if (suf === "EX") out.push("EX"); else if (suf && /^(V|VMAX|VSTAR|GX)$/i.test(suf)) out.push(suf.toUpperCase());
    if (/BREAK$/.test(c.jaName ?? "") || c.stage === "BREAK") return ["BREAK"]; } // XY-EX(대문자)≠SV-ex(소문자) 케이싱 보존 · BREAK은 EN(ptcg.io) 관례대로 단독 subtype(stage 제외)
  else if (c.category === "Trainer") { const tt = mapTrainer(c.trainerType); if (tt) out.push(tt); }
  else if (c.category === "Energy") out.push("Special");
  return out;
}
const supertypeOf = (c?: string) => c === "Pokemon" ? "Pokémon" : c === "Trainer" ? "Trainer" : c === "Energy" ? "Energy" : null;
// ja인덱스가 못 푸는 특수명/中間폼명(・ 포함 등) 수동 dex.
const JA_DEX_SPECIAL: [RegExp, number][] = [
  [/カプ・コケコ/, 785], [/カプ・テテフ/, 786], [/カプ・ブルル/, 787], [/カプ・レヒレ/, 788],
  [/ネクロズマ/, 800], [/キュレム/, 646], // 네크로즈마 폼·큐레무 中間폼명
  [/メガヤンマ/, 469], [/メガニウム/, 154], // メガ-접두 종족명(메가진화 아님) — メガ strip 오인 보호
  [/ゲンシグラードン/, 383], [/ゲンシカイオーガ/, 382], // Primal(ゲンシ) 접두 — XY5/XY7
  [/ポリゴンZ/, 474], // PokeAPI ja=ポリゴンＺ(전각) vs 카드 반각Z 불일치
];
function dexFromJa(name: string, ja: Map<string, number>): number | null {
  for (const [re, d] of JA_DEX_SPECIAL) if (re.test(name)) return d;
  const clean = name.replace(/^(アクア団の|マグマ団の|プラズマ団の|ロケット団の)/, "").replace(/^(メガ|パルデア|ヒスイ|アローラ|ガラル)\s*/, "").replace(/(ex|EX|VMAX|VSTAR|V|GX|δ|BREAK)\s*$/g, "").replace(/[\s　]/g, "").trim().toLowerCase();
  return ja.get(clean) ?? null;
}
// 타그팀 GX(「&」/「＆」 복합명)은 두 종 dex 모두 (예 ヤドン&コダックGX→[79,54], メガヤミラミ&バンギラスGX→[302,248]).
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

async function main() {
  const jpSet = process.argv[2], jsonPath = process.argv[3];
  const APPLY = process.argv.includes("--apply");
  if (!jpSet || !jsonPath) { console.error("usage: <jpSetId> <jsonPath> [--apply]"); process.exit(1); }
  const cards: any[] = JSON.parse(readFileSync(jsonPath, "utf8"));
  const ja = buildNameIndex("ja");
  console.log(`■ ${jpSet} ← ${jsonPath} | ${cards.length}장 ${APPLY ? "★APPLY(덮어쓰기)" : "(dry)"}`);

  // 가드: 기존 JP LC 에 그룹밖 참조(컬렉션/거래) 없어야
  const oldLoc = await prisma.cardLocale.findMany({ where: { setId: jpSet }, select: { id: true, logicalCardId: true } });
  const oldLcids = [...new Set(oldLoc.map((l) => l.logicalCardId))];
  const coll = await prisma.collectionItem.count({ where: { localeId: { in: oldLoc.map((l) => l.id) } } });
  const trade = await prisma.trade.count({ where: { localeId: { in: oldLoc.map((l) => l.id) } } });
  // 기존 LC 가 JP 외 다른 지역 locale 도 갖나(=병합됨, 그러면 통삭제 위험)
  const otherLoc = await prisma.cardLocale.count({ where: { logicalCardId: { in: oldLcids }, NOT: { setId: jpSet } } });
  console.log(`  기존 JP locale ${oldLoc.length} · LC ${oldLcids.length} | 참조 컬렉션 ${coll}·거래 ${trade} | JP외 locale 보유 ${otherLoc}`);

  let dexTcg = 0, dexJa = 0, dexNone = 0; const noDex: string[] = [];
  for (const c of cards) {
    const supertype = supertypeOf(c.category);
    if (supertype === "Pokémon") { const dx = dexesFromCard(c, ja); if (!dx.length) { dexNone++; noDex.push(`#${c.number} ${c.jaName}`); } else if (c.dexId && dx.length === 1) dexTcg++; else dexJa++; }
  }
  console.log(`  dex[공식 ${dexTcg}·ja폴백 ${dexJa}·없음 ${dexNone}]`);
  if (noDex.length) console.log(`   dex못찾음: ${noDex.slice(0, 10).join(", ")}`);

  if (!APPLY) { console.log("\n(dry) 적용: --apply"); await prisma.$disconnect(); return; }
  if (coll + trade > 0) { console.log("⚠️ 참조 존재(컬렉션/거래) — 중단. 수동 확인 필요."); await prisma.$disconnect(); return; }

  // 안전 덮어쓰기: JP locale 삭제 → 비워진 옛 JP LC만 삭제(KR/EN 남은 LC는 유지=추후 재병합/정리)
  await prisma.cardLocale.deleteMany({ where: { setId: jpSet } });
  const oldLcs = await prisma.logicalCard.findMany({ where: { primarySetId: jpSet }, select: { id: true, locales: { select: { id: true } } } });
  const emptyIds = oldLcs.filter((l) => l.locales.length === 0).map((l) => l.id);
  if (emptyIds.length) await prisma.logicalCard.deleteMany({ where: { id: { in: emptyIds } } });
  const keptLc = oldLcs.length - emptyIds.length;
  if (keptLc > 0) console.log(`  옛 JP LC: 빈것 ${emptyIds.length} 삭제 · KR/EN 잔존 ${keptLc} 유지(KR공식화 후 정리)`);
  let made = 0;
  for (const c of cards) {
    const supertype = supertypeOf(c.category);
    const subtypes = subtypesOf(c);
    let dex: number[] = [];
    if (supertype === "Pokémon") dex = dexesFromCard(c, ja); else if (c.dexId) dex = [c.dexId];
    const numInt = parseInt(c.number, 10) || null;
    const lcId = `lc-${jpSet}-${c.number}`;
    await prisma.logicalCard.create({ data: {
      id: lcId, supertype: supertype ?? undefined, subtypes, pokedexNumbers: dex,
      illustrator: c.illustrator ?? undefined, hp: c.hp ?? undefined, types: c.types ?? [],
      primarySetId: jpSet, primaryNumber: c.number, primaryNumberInt: numInt ?? undefined,
    } });
    await prisma.cardLocale.create({ data: {
      id: `${jpSet}-${c.number}`, logicalCardId: lcId, region: "JP", language: "ja", setId: jpSet,
      number: c.number, numberInt: numInt ?? undefined, name: c.jaName, imageSmall: c.image, imageLarge: c.image,
    } });
    made++;
  }
  await prisma.set.update({ where: { id: jpSet }, data: { cardCount: made } });
  console.log(`  ★덮어쓰기 완료: ${made}장 재생성`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
