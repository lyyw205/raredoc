/**
 * KR 분할세트를 pokemoncard.co.kr 공식 데이터로 재구축. (번호가 JP와 달라도 OK — 카드 정체성으로 매핑)
 *
 * 사용자 방침: "한국판은 공식 데이터로 넣고, 매핑 번호는 달라도 됨 — 데이터는 각 언어 버전에 맞게,
 *   매핑은 카드 정체성(일러/도감)으로 신경 써서" (sv-base 식). KR 공식 번호는 JP 와 스왑/증감 가능.
 *
 * 매칭(official KR → JP 앵커 LogicalCard):
 *   - 포켓몬: koName→dex(PokeAPI ko) 버킷 + 일러스트레이터 → 동일 dex 내 일러/번호순 페어
 *   - 트레이너: 일러스트레이터 버킷 → 번호순 페어
 *   - 에너지/잔여: 번호 근접 폴백
 * 적용: 기존 KR locale(참조 0 확인) 통삭제 후 official 로 재생성, 각자 JP 앵커 LC 에 연결. LC.nameKo 갱신.
 *
 * 실행: npx tsx scripts/apply-kr-official.ts [--set=kr-sv2p] [--apply]
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { readFileSync } from "node:fs";
import { resolveCardDexes } from "./lib/pokeapi-names";

const POKE = ["Pokémon", "Pokemon"];
const DIR = "data/kr-official";
// maxNum: 번호 상한(이하만 처리). 샤이니 헤비 팩에서 base 섹션만 먼저 매핑할 때(샤이니 중복 회피).
const CFG: Record<string, { jp: string; json: string; maxNum?: number }> = {
  "kr-sv2p": { jp: "jp-tcg-SV2P", json: `${DIR}/kr-official-sv2p.json` },
  "kr-sv2d": { jp: "jp-tcg-SV2D", json: `${DIR}/kr-official-sv2d.json` },
  "kr-sv4k": { jp: "jp-tcg-SV4K", json: `${DIR}/kr-official-sv4k.json` },
  "kr-sv4m": { jp: "jp-tcg-SV4M", json: `${DIR}/kr-official-sv4m.json` },
  "kr-sv-151": { jp: "jp-sv-151", json: `${DIR}/kr-official-sv2a.json` },
  "kr-sv3": { jp: "jp-sv-obsidian-flames", json: `${DIR}/kr-official-sv3.json` },
  "kr-sv3a": { jp: "jp-sv-raging-surf", json: `${DIR}/kr-official-sv3a.json` },
  "kr-sv4a": { jp: "jp-sv-paldean-fates", json: `${DIR}/kr-official-sv4a.json` }, // JP 일본공식 360 완전적재 → 전체 매핑
  "kr-sv5k": { jp: "jp-tcg-SV5K", json: `${DIR}/kr-official-sv5k.json` },
  "kr-sv5m": { jp: "jp-tcg-SV5M", json: `${DIR}/kr-official-sv5m.json` },
  "kr-sv5a": { jp: "jp-sv-crimson-haze", json: `${DIR}/kr-official-sv5a.json` },
  "kr-sv6": { jp: "jp-sv-twilight-masquerade", json: `${DIR}/kr-official-sv6.json` },
  "kr-sv6a": { jp: "jp-sv-shrouded-fable", json: `${DIR}/kr-official-sv6a.json` },
  "kr-sv7": { jp: "jp-sv-stellar-crown", json: `${DIR}/kr-official-sv7.json` },
  "kr-sv7a": { jp: "jp-sv-paradise-dragona", json: `${DIR}/kr-official-sv7a.json` },
  "kr-sv8": { jp: "jp-sv-surging-sparks", json: `${DIR}/kr-official-sv8.json` },
  "kr-sv8a": { jp: "jp-sv-prismatic-evolutions", json: `${DIR}/kr-official-sv8a.json` },
  "kr-sv9": { jp: "jp-sv-journey-together", json: `${DIR}/kr-official-sv9.json` },
  "kr-sv9a": { jp: "jp-sv-heatwave-arena", json: `${DIR}/kr-official-sv9a.json` },
  "kr-sv10": { jp: "jp-sv-destined-rivals", json: `${DIR}/kr-official-sv10.json` },
  "kr-sv11b": { jp: "jp-tcg-SV11B", json: `${DIR}/kr-official-sv11b.json` },
  "kr-sv11w": { jp: "jp-tcg-SV11W", json: `${DIR}/kr-official-sv11w.json` },
  // ── MEGA ──
  "kr-m1l": { jp: "jp-tcg-M1L", json: `${DIR}/kr-official-m1l.json` },
  "kr-m1s": { jp: "jp-tcg-M1S", json: `${DIR}/kr-official-m1s.json` },
  "kr-m2": { jp: "jp-mega-infernox", json: `${DIR}/kr-official-m2.json` },
  "kr-m2a": { jp: "jp-mega-dream-ex", json: `${DIR}/kr-official-m2a.json` },
  "kr-m3": { jp: "jp-mega-munikisuzero", json: `${DIR}/kr-official-m3.json` },
  "kr-m4": { jp: "jp-mega-ninja-spinner", json: `${DIR}/kr-official-m4.json` },
  // ── SWSH ──
  "kr-s12a": { jp: "jp-tcg-S12a", json: `${DIR}/kr-official-s12a.json` },
  "kr-s12": { jp: "jp-tcg-S12", json: `${DIR}/kr-official-s12.json` },
  "kr-s11a": { jp: "jp-tcg-S11a", json: `${DIR}/kr-official-s11a.json` },
  "kr-s11": { jp: "jp-tcg-S11", json: `${DIR}/kr-official-s11.json` },
};
type Off = { number: string; koName: string; illustrator: string | null; image: string | null; numInt: number };
type Jp = { numInt: number; name: string; lcid: string; illus: string | null; dex: number | null; supertype: string | null };

const norm = (s: string | null) => (s ?? "").trim().toLowerCase();
// 한글 폼명 → dex (ja인덱스/resolveCardDexes 가 못 푸는 SV 테라/폼 카드). 우선 적용.
const KO_FORM: [RegExp, number][] = [
  [/오거폰/, 1017], [/다투곰/, 901],
  [/(커트|스핀|프로스트|워시|히트)\s*로토무|로토무/, 479], [/캐스퐁/, 351],
];
const koDex = (name: string) => {
  for (const [re, dex] of KO_FORM) if (re.test(name)) return dex;
  const d = resolveCardDexes(name, "ko"); return d.length ? d[0] : null;
};

// official → jp 매칭 (버킷 페어). 반환: Map<officialNum, Jp>
function match(offs: Off[], jps: Jp[]) {
  const out = new Map<number, Jp>();
  const usedJp = new Set<number>();
  const push = (m: Map<string, any[]>, k: string, v: any) => { const a = m.get(k) ?? []; a.push(v); m.set(k, a); };

  // 1) 포켓몬: dex 버킷 → 일러/번호순 페어
  const offPoke = offs.map((o) => ({ o, dex: koDex(o.koName) })).filter((x) => x.dex != null);
  const jpPoke = jps.filter((j) => POKE.includes(j.supertype ?? "") && j.dex != null);
  const ojb = new Map<string, any[]>(), jjb = new Map<string, any[]>();
  for (const x of offPoke) push(ojb, String(x.dex), x);
  for (const j of jpPoke) push(jjb, String(j.dex), j);
  for (const [k, ol] of ojb) {
    const jl = (jjb.get(k) ?? []).filter((j) => !usedJp.has(j.numInt));
    const os = ol.slice().sort((a: any, b: any) => norm(a.o.illustrator).localeCompare(norm(b.o.illustrator)) || a.o.numInt - b.o.numInt);
    const js = jl.slice().sort((a: any, b: any) => norm(a.illus).localeCompare(norm(b.illus)) || a.numInt - b.numInt);
    for (let i = 0; i < Math.min(os.length, js.length); i++) { out.set(os[i].o.numInt, js[i]); usedJp.add(js[i].numInt); }
  }
  // 2) 트레이너/잔여 포켓몬: 일러 버킷 → 번호순
  // ⚠️ 포켓몬은 phase 1(dex)에서만 매칭. phase 2/3 은 트레이너/에너지 전용(포켓몬 번호/일러 폴백은
  //    다른 종/카드에 오매핑되므로 금지 — 샤이니 헤비 팩에서 포켓몬↔에너지 쓰레기 방지).
  const isPokeOff = (o: Off) => koDex(o.koName) != null;
  const isPokeJp = (j: Jp) => POKE.includes(j.supertype ?? "");
  const remOff = offs.filter((o) => !out.has(o.numInt) && !isPokeOff(o));
  const remJp = jps.filter((j) => !usedJp.has(j.numInt) && !isPokeJp(j));
  const oib = new Map<string, Off[]>(), jib = new Map<string, Jp[]>();
  for (const o of remOff) if (o.illustrator) push(oib, norm(o.illustrator), o);
  for (const j of remJp) if (j.illus) push(jib, norm(j.illus), j);
  for (const [k, ol] of oib) {
    const jl = (jib.get(k) ?? []).filter((j) => !usedJp.has(j.numInt)).sort((a, b) => a.numInt - b.numInt);
    const os = ol.slice().sort((a, b) => a.numInt - b.numInt);
    for (let i = 0; i < Math.min(os.length, jl.length); i++) { out.set(os[i].numInt, jl[i]); usedJp.add(jl[i].numInt); }
  }
  // 3) 잔여 트레이너/에너지: 번호 근접 폴백 (포켓몬 제외)
  const rem2Off = offs.filter((o) => !out.has(o.numInt) && !isPokeOff(o)).sort((a, b) => a.numInt - b.numInt);
  const rem2Jp = jps.filter((j) => !usedJp.has(j.numInt) && !isPokeJp(j)).sort((a, b) => a.numInt - b.numInt);
  for (const o of rem2Off) {
    let best: Jp | null = null, bd = 1e9;
    for (const j of rem2Jp) { if (usedJp.has(j.numInt)) continue; const d = Math.abs(j.numInt - o.numInt); if (d < bd) { bd = d; best = j; } }
    if (best) { out.set(o.numInt, best); usedJp.add(best.numInt); }
  }
  return out;
}

async function main() {
  const APPLY = process.argv.includes("--apply");
  const setArg = process.argv.find((a) => a.startsWith("--set="))?.slice("--set=".length);
  const targets = setArg ? [setArg] : Object.keys(CFG);

  for (const krSet of targets) {
    const cfg = CFG[krSet]; if (!cfg) { console.error(`unknown ${krSet}`); continue; }
    const offs: Off[] = JSON.parse(readFileSync(cfg.json, "utf8")).map((c: any) => ({ number: c.number, koName: c.koName, illustrator: c.illustrator ?? null, image: c.image ?? null, numInt: parseInt(c.number, 10) }));
    const jpRows = await prisma.cardLocale.findMany({ where: { setId: cfg.jp }, select: { numberInt: true, name: true, logicalCardId: true, logicalCard: { select: { illustrator: true, pokedexNumbers: true, supertype: true } } } });
    let jps: Jp[] = jpRows.map((r) => ({ numInt: r.numberInt ?? 0, name: r.name, lcid: r.logicalCardId, illus: r.logicalCard.illustrator, dex: r.logicalCard.pokedexNumbers?.[0] ?? null, supertype: r.logicalCard.supertype }));
    let offsF = offs;
    if (cfg.maxNum) { offsF = offs.filter((o) => o.numInt <= cfg.maxNum!); jps = jps.filter((j) => j.numInt <= cfg.maxNum!); console.log(`  (maxNum ${cfg.maxNum}: base만 — official ${offsF.length}/${offs.length}, JP앵커 ${jps.length})`); }

    const m = match(offsF, jps);
    // 기존 KR locale (앵커별 1장) — lcid 로 인덱스
    const krExisting = await prisma.cardLocale.findMany({ where: { setId: krSet }, select: { id: true, logicalCardId: true } });
    const krByLcid = new Map(krExisting.map((k) => [k.logicalCardId, k]));

    let swaps = 0, creates = 0, updates = 0, unmatched = 0; const unm: string[] = [], swapEx: string[] = [];
    for (const o of offsF) {
      const j = m.get(o.numInt);
      if (!j) { unmatched++; unm.push(`#${o.number} ${o.koName}`); continue; }
      const onAnchor = krByLcid.get(j.lcid);
      if (j.numInt !== o.numInt && swapEx.length < 8) swapEx.push(`KR#${o.number} ${o.koName} ↔ JP#${j.numInt} ${j.name}`);
      if (j.numInt !== o.numInt) swaps++;
      if (onAnchor) updates++; else creates++;
    }
    console.log(`\n■ ${krSet} ← ${cfg.json} | official ${offsF.length} · JP앵커 ${jps.length}`);
    console.log(`  매칭 ${offsF.length - unmatched}/${offsF.length} · 번호상이(스왑/증감) ${swaps} · 기존갱신 ${updates} · 신규생성 ${creates} · 미매칭 ${unmatched}`);
    if (swapEx.length) console.log(`  번호상이 예: ${swapEx.join(" | ")}`);
    if (unm.length) console.log(`  ⚠️ 미매칭 official: ${unm.join(", ")}`);

    if (!APPLY) continue;
    // 적용: 참조(컬렉션/거래)는 같은 numberInt 로 임시 JP 재지정 → KR 통삭제 → official 재생성 → 새 KR 로 복원
    const krIds = krExisting.map((k) => k.id);
    const krNum = new Map((await prisma.cardLocale.findMany({ where: { setId: krSet }, select: { id: true, numberInt: true } })).map((l) => [l.id, l.numberInt]));
    const colls = await prisma.collectionItem.findMany({ where: { localeId: { in: krIds } }, select: { id: true, localeId: true } });
    const trades = await prisma.trade.findMany({ where: { localeId: { in: krIds } }, select: { id: true, localeId: true } });
    const jpLoc = await prisma.cardLocale.findMany({ where: { setId: cfg.jp }, select: { id: true, numberInt: true, logicalCardId: true } });
    const jpByNum = new Map(jpLoc.map((l) => [l.numberInt, l]));
    for (const c of colls) { const n = krNum.get(c.localeId); const j = n != null ? jpByNum.get(n) : null; if (j) await prisma.collectionItem.update({ where: { id: c.id }, data: { localeId: j.id, logicalCardId: j.logicalCardId } }); }
    for (const t of trades) { const n = krNum.get(t.localeId); const j = n != null ? jpByNum.get(n) : null; if (j) await prisma.trade.update({ where: { id: t.id }, data: { localeId: j.id, logicalCardId: j.logicalCardId } }); }
    if (colls.length + trades.length) console.log(`  참조 ${colls.length + trades.length}건 임시 JP 재지정`);
    await prisma.cardLocale.deleteMany({ where: { setId: krSet } });
    let made = 0; const newKrByNum = new Map<number, { id: string; lcid: string }>();
    for (const o of offsF) {
      const j = m.get(o.numInt); if (!j) continue;
      const id = `${krSet}-${o.number}`;
      await prisma.cardLocale.create({ data: {
        id, setId: krSet, region: "KR", language: "ko", number: o.number, numberInt: o.numInt,
        name: o.koName, imageSmall: o.image, imageLarge: o.image, logicalCardId: j.lcid,
      } });
      await prisma.logicalCard.update({ where: { id: j.lcid }, data: { nameKo: o.koName } });
      newKrByNum.set(o.numInt, { id, lcid: j.lcid });
      made++;
    }
    let restored = 0;
    for (const c of colls) { const n = krNum.get(c.localeId); const nk = n != null ? newKrByNum.get(n) : null; if (nk) { await prisma.collectionItem.update({ where: { id: c.id }, data: { localeId: nk.id, logicalCardId: nk.lcid } }); restored++; } }
    for (const t of trades) { const n = krNum.get(t.localeId); const nk = n != null ? newKrByNum.get(n) : null; if (nk) { await prisma.trade.update({ where: { id: t.id }, data: { localeId: nk.id, logicalCardId: nk.lcid } }); restored++; } }
    console.log(`  ★적용: KR locale ${made} 재생성${restored ? ` · 참조 ${restored}건 복원` : ""}`);
  }
  await prisma.$disconnect();
  if (!APPLY) console.log(`\n(dry) 적용: --apply`);
}
main().catch((e) => { console.error(e); process.exit(1); });
