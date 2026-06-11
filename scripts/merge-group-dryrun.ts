/**
 * 그룹 Card 병합 dry-run (읽기 전용, DB 무변경).
 * 검증된 매칭(group-match)대로 EN/KR 인쇄본을 JP 앵커 Card 로 합칠 때
 * 무엇을 재지정/삭제하고 어떤 참조(컬렉션/거래/티어/덱/룰링)를 옮겨야 하는지 계획·영향을 출력.
 *
 * 실행: npx tsx scripts/merge-group-dryrun.ts <groupId>   (sv-base | sv-triplet-beat)
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { POKE, isPokemonSupertype } from "./lib/supertype";
type Cfg = { jp: string[]; kr: string[]; krMirror: Record<string, string>; enNative: string[] | null; krMirrorAll?: boolean };
const CONFIG: Record<string, Cfg> = {
  "sv-base": { jp: ["jp-tcg-SV1S", "jp-tcg-SV1V"], kr: ["kr-sv1s", "kr-sv1v"], krMirror: { "kr-sv1s": "jp-tcg-SV1S", "kr-sv1v": "jp-tcg-SV1V" }, enNative: ["sv1"] },
  "sv-triplet-beat": { jp: ["jp-sv-triplet-beat"], kr: ["kr-sv1a"], krMirror: { "kr-sv1a": "jp-sv-triplet-beat" }, enNative: null },
  "sv-paldea-evolved": { jp: ["jp-tcg-SV2P", "jp-tcg-SV2D"], kr: ["kr-sv2p", "kr-sv2d"], krMirror: { "kr-sv2p": "jp-tcg-SV2P", "kr-sv2d": "jp-tcg-SV2D" }, enNative: ["sv2"], krMirrorAll: true },
  "sv-paradox-rift": { jp: ["jp-tcg-SV4K", "jp-tcg-SV4M"], kr: ["kr-sv4k", "kr-sv4m"], krMirror: { "kr-sv4k": "jp-tcg-SV4K", "kr-sv4m": "jp-tcg-SV4M" }, enNative: ["sv4"], krMirrorAll: true },
};

type Row = { cid: string; lcid: string; setId: string; region: string; number: string; numInt: number; dex: number | null; illus: string | null; tier: number | null; sub: string; supertype: string | null };
const sel = { id: true, cardId: true, setId: true, region: true, number: true, numberInt: true,
  card: { select: { pokedexNumbers: true, illustrator: true, subtypes: true, supertype: true, rarity: { select: { tier: true } } } } } as const;
const toRow = (l: any): Row => ({
  cid: l.id, lcid: l.cardId, setId: l.setId, region: l.region, number: l.number, numInt: l.numberInt ?? (parseInt(l.number.replace(/\D/g, "")) || 0),
  dex: l.card.pokedexNumbers?.[0] ?? null, illus: l.card.illustrator, tier: l.card.rarity?.tier ?? null,
  sub: [...(l.card.subtypes ?? [])].sort().join(","), supertype: l.card.supertype,
});
const load = async (ids: string[]) => (await prisma.regionCard.findMany({ where: { setId: { in: ids } }, select: sel })).map(toRow);

async function main() {
  const groupId = process.argv[2]; const cfg = CONFIG[groupId];
  if (!cfg) { console.error("groupId 필요: sv-base | sv-triplet-beat"); process.exit(1); }
  const isPoke = (r: Row) => isPokemonSupertype(r.supertype) && r.dex != null;
  const tfp = (r: Row) => `${(r.illus ?? "").trim().toLowerCase()}|${r.tier}|${r.sub}`;
  const fpP = (r: Row) => `${r.dex}|${(r.illus ?? "").trim().toLowerCase()}|${r.sub}`;
  const byNum = (a: Row, b: Row) => a.numInt - b.numInt; const byTier = (a: Row, b: Row) => (a.tier ?? 0) - (b.tier ?? 0) || a.numInt - b.numInt;

  const jp = await load(cfg.jp), kr = await load(cfg.kr);
  const en = cfg.enNative ? await load(cfg.enNative)
    : (await prisma.regionCard.findMany({ where: { region: "EN", card: { supertype: { in: POKE as unknown as string[] }, pokedexNumbers: { hasSome: [...new Set(jp.filter(isPoke).map(r => r.dex))] as number[] } } }, select: sel })).map(toRow);

  // 매칭 (build-group 과 동일 규칙)
  const enForJp = new Map<string, Row>(), krForJp = new Map<string, Row>();
  const push = (m: Map<string, Row[]>, k: string, v: Row) => { const a = m.get(k) ?? []; a.push(v); m.set(k, a); };
  const bucketPair = (src: Row[], jl0: Row[], sk: (r: Row) => string, jk: (r: Row) => string, out: Map<string, Row>, cmp: (a: Row, b: Row) => number) => {
    const jb = new Map<string, Row[]>(); for (const j of jl0) push(jb, jk(j), j);
    const sb = new Map<string, Row[]>(); for (const s of src) push(sb, sk(s), s);
    for (const [k, sl] of sb) { const jl = (jb.get(k) ?? []).slice().sort(cmp); const ss = sl.slice().sort(cmp); for (let i = 0; i < Math.min(ss.length, jl.length); i++) out.set(jl[i].cid, ss[i]); }
  };
  if (cfg.krMirrorAll) {
    const jpByInt = new Map(jp.map(r => [`${r.setId}|${r.numInt}`, r]));
    for (const k of kr) { const j = jpByInt.get(`${cfg.krMirror[k.setId]}|${k.numInt}`); if (j) krForJp.set(j.cid, k); }
  } else {
    const jpByKey = new Map(jp.filter(isPoke).map(r => [`${r.setId}|${r.number}`, r]));
    for (const k of kr) if (isPoke(k)) { const j = jpByKey.get(`${cfg.krMirror[k.setId]}|${k.number}`); if (j) krForJp.set(j.cid, k); }
    bucketPair(kr.filter(r => !isPoke(r)), jp.filter(r => !isPoke(r)), k => `${cfg.krMirror[k.setId]}|${tfp(k)}`, j => `${j.setId}|${tfp(j)}`, krForJp, byNum);
  }
  if (cfg.enNative) bucketPair(en.filter(isPoke), jp.filter(isPoke), fpP, fpP, enForJp, byTier);
  else { const eb = new Map<string, Row[]>(); for (const e of en) if (isPoke(e)) push(eb, fpP(e), e); const used = new Set<string>();
    for (const j of jp.filter(isPoke)) { const c = (eb.get(fpP(j)) ?? []).filter(x => !used.has(x.cid)); if (!c.length) continue; c.sort((a, b) => Math.abs((a.tier ?? 0) - (j.tier ?? 0)) - Math.abs((b.tier ?? 0) - (j.tier ?? 0))); enForJp.set(j.cid, c[0]); used.add(c[0].cid); } }

  // ── 병합 계획 ──
  const jpByCid = new Map(jp.map(r => [r.cid, r]));
  let mergeNeeded = 0, localesRepoint = 0;
  const absorbedLCs = new Set<string>();           // 흡수(=locale 빼앗기는) LC
  const canonicalLCs = new Set<string>();
  for (const j of jp) {
    canonicalLCs.add(j.lcid);
    for (const m of [enForJp.get(j.cid), krForJp.get(j.cid)]) {
      if (!m) continue;
      if (m.lcid !== j.lcid) { localesRepoint++; absorbedLCs.add(m.lcid); mergeNeeded++; }
    }
  }
  // 흡수 LC 가 이 그룹 밖 locale 도 갖고 있나 (있으면 통삭제 불가, 부분 분리 필요)
  const absorbArr = [...absorbedLCs];
  const allLocOfAbsorb = await prisma.regionCard.findMany({ where: { cardId: { in: absorbArr } }, select: { cardId: true, setId: true, region: true } });
  const inScopeSets = new Set([...cfg.jp, ...cfg.kr, ...(cfg.enNative ?? []), ...(cfg.enNative ? [] : ["__cross__"])]);
  const extraLocByLc = new Map<string, number>();
  for (const l of allLocOfAbsorb) { const inScope = cfg.enNative ? inScopeSets.has(l.setId) : (inScopeSets.has(l.setId) || l.region === "EN"); if (!inScope) extraLocByLc.set(l.cardId, (extraLocByLc.get(l.cardId) ?? 0) + 1); }
  const cleanDeletable = absorbArr.filter(lc => !extraLocByLc.has(lc));
  const entangled = absorbArr.filter(lc => extraLocByLc.has(lc));

  // 참조 영향 (흡수 LC 를 가리키는 것들 → canonical 재지정 필요)
  const ref = async (model: any, field: string) => model.count({ where: { [field]: { in: absorbArr } } }).catch(() => -1);
  const coll = await ref(prisma.collectionItem, "cardId");
  const trade = await ref(prisma.trade, "cardId");
  const tier = await ref(prisma.tierEntry, "cardId");
  const deck = await ref(prisma.deckCard, "cardId");
  const ruling = await ref(prisma.ruling, "cardId");

  console.log(`■ [${groupId}] 병합 dry-run (DB 무변경)`);
  console.log(`  JP 앵커 ${jp.length} | EN매칭 ${enForJp.size} | KR매칭 ${krForJp.size}`);
  console.log(`  canonical Card(앵커 JP의 LC): ${canonicalLCs.size}`);
  console.log(`  병합 필요(다른 LC에 붙은 지역판): ${mergeNeeded}건 | 재지정할 locale: ${localesRepoint}`);
  console.log(`  흡수될 Card: ${absorbedLCs.size}`);
  console.log(`    ├ 깨끗이 삭제 가능(그룹밖 locale 없음): ${cleanDeletable.length}`);
  console.log(`    └ ⚠️얽힘(그룹밖 locale 보유 → 통삭제 불가, 부분분리): ${entangled.length}`);
  console.log(`  흡수 LC 를 가리키는 참조 → canonical 재지정 필요:`);
  console.log(`    컬렉션 ${coll} · 거래 ${trade} · 티어 ${tier} · 덱 ${deck} · 룰링 ${ruling}`);
  if (entangled.length) console.log(`  얽힘 LC 샘플:`, entangled.slice(0, 6).join(", "));
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
