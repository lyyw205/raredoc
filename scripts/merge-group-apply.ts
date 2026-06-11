/**
 * 그룹 LogicalCard 병합 — 실제 적용 (소량 검증용). 기본은 dry, --apply 로만 DB 변경.
 *
 * 동작(검증된 매칭대로): EN 인쇄본(RegionCard)을 JP 앵커 LogicalCard 로 재지정하고,
 *   비워진 EN LogicalCard 는 참조 0 확인 후 삭제. 카드당 트랜잭션. (jp-sv-base 중복제거는 별도 단계)
 *
 * 실행:
 *   npx tsx scripts/merge-group-apply.ts sv-base --limit=10            # 계획만(dry)
 *   npx tsx scripts/merge-group-apply.ts sv-base --limit=10 --apply    # 실제 10장 병합
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
type Row = { cid: string; lcid: string; setId: string; number: string; numInt: number; dex: number | null; illus: string | null; tier: number | null; sub: string; supertype: string | null; name: string };
const sel = { id: true, logicalCardId: true, setId: true, number: true, numberInt: true, name: true,
  logicalCard: { select: { pokedexNumbers: true, illustrator: true, subtypes: true, supertype: true, rarity: { select: { tier: true } } } } } as const;
const toRow = (l: any): Row => ({ cid: l.id, lcid: l.logicalCardId, setId: l.setId, number: l.number, numInt: l.numberInt ?? (parseInt(l.number.replace(/\D/g, "")) || 0), name: l.name,
  dex: l.logicalCard.pokedexNumbers?.[0] ?? null, illus: l.logicalCard.illustrator, tier: l.logicalCard.rarity?.tier ?? null, sub: [...(l.logicalCard.subtypes ?? [])].sort().join(","), supertype: l.logicalCard.supertype });
const load = async (ids: string[]) => (await prisma.regionCard.findMany({ where: { setId: { in: ids } }, select: sel })).map(toRow);

async function main() {
  const groupId = process.argv[2]; const cfg = CONFIG[groupId];
  const APPLY = process.argv.includes("--apply");
  const LIMIT = parseInt(process.argv.find(a => a.startsWith("--limit="))?.split("=")[1] ?? "10", 10);
  if (!cfg) { console.error("groupId 필요"); process.exit(1); }
  const isPoke = (r: Row) => isPokemonSupertype(r.supertype) && r.dex != null;
  const fpP = (r: Row) => `${r.dex}|${(r.illus ?? "").trim().toLowerCase()}|${r.sub}`;
  const byTier = (a: Row, b: Row) => (a.tier ?? 0) - (b.tier ?? 0) || a.numInt - b.numInt;

  const jp = await load(cfg.jp);
  const en = cfg.enNative ? await load(cfg.enNative)
    : (await prisma.regionCard.findMany({ where: { region: "EN", logicalCard: { supertype: { in: POKE as unknown as string[] }, pokedexNumbers: { hasSome: [...new Set(jp.filter(isPoke).map(r => r.dex))] as number[] } } }, select: sel })).map(toRow);

  // EN↔JP 매칭 (build-group 과 동일)
  const enForJp = new Map<string, Row>();
  const push = (m: Map<string, Row[]>, k: string, v: Row) => { const a = m.get(k) ?? []; a.push(v); m.set(k, a); };
  if (cfg.enNative) {
    const jb = new Map<string, Row[]>(); for (const j of jp) if (isPoke(j)) push(jb, fpP(j), j);
    const eb = new Map<string, Row[]>(); for (const e of en) if (isPoke(e)) push(eb, fpP(e), e);
    for (const [k, el] of eb) { const jl = (jb.get(k) ?? []).slice().sort(byTier); const es = el.slice().sort(byTier); for (let i = 0; i < Math.min(es.length, jl.length); i++) enForJp.set(jl[i].cid, es[i]); }
  } else { const eb = new Map<string, Row[]>(); for (const e of en) if (isPoke(e)) push(eb, fpP(e), e); const used = new Set<string>();
    for (const j of jp.filter(isPoke)) { const c = (eb.get(fpP(j)) ?? []).filter(x => !used.has(x.cid)); if (!c.length) continue; c.sort((a, b) => Math.abs((a.tier ?? 0) - (j.tier ?? 0)) - Math.abs((b.tier ?? 0) - (j.tier ?? 0))); enForJp.set(j.cid, c[0]); used.add(c[0].cid); } }

  // ── KR↔JP 매칭 (krMirrorAll 그룹만; 일반 그룹은 KR 이미 병합돼 재지정 불필요) ──
  const krForJp = new Map<string, Row>();
  if (cfg.krMirrorAll) {
    const kr = await load(cfg.kr);
    const jpByInt = new Map(jp.map(r => [`${r.setId}|${r.numInt}`, r]));
    for (const k of kr) { const j = jpByInt.get(`${cfg.krMirror[k.setId]}|${k.numInt}`); if (j) krForJp.set(j.cid, k); }
  }

  // 대상: 각 JP 앵커에 매칭된 EN/KR locale 중 아직 앵커 LC에 안 붙은 것
  type Pair = { j: Row; src: Row; region: string };
  const pairs: Pair[] = [];
  for (const j of jp) {
    const e = enForJp.get(j.cid); if (e && e.lcid !== j.lcid) pairs.push({ j, src: e, region: "EN" });
    const k = krForJp.get(j.cid); if (k && k.lcid !== j.lcid) pairs.push({ j, src: k, region: "KR" });
  }
  pairs.sort((a, b) => a.j.setId.localeCompare(b.j.setId) || a.j.numInt - b.j.numInt || a.region.localeCompare(b.region));
  const targets = pairs.slice(0, LIMIT);

  console.log(`[${groupId}] 병합 대상 ${targets.length}/${pairs.length} (limit ${LIMIT}) EN+KR ${APPLY ? "★실제적용" : "(dry — --apply 없음)"}`);
  let done = 0, deletedLc = 0, skippedDel = 0;
  for (const { j, src, region } of targets) {
    console.log(`  ${j.setId}#${j.number} "${j.name}" ← ${region} "${src.name}"(${src.cid})  [${region} LC ${src.lcid} → 앵커 ${j.lcid}]`);
    if (!APPLY) continue;
    await prisma.$transaction(async (tx) => {
      await tx.regionCard.update({ where: { id: src.cid }, data: { logicalCardId: j.lcid } });
      const remain = await tx.regionCard.count({ where: { logicalCardId: src.lcid } });
      if (remain === 0) {
        const refs = (await tx.collectionItem.count({ where: { logicalCardId: src.lcid } }))
          + (await tx.trade.count({ where: { logicalCardId: src.lcid } }))
          + (await tx.tierEntry.count({ where: { logicalCardId: src.lcid } }))
          + (await tx.deckCard.count({ where: { logicalCardId: src.lcid } }))
          + (await tx.ruling.count({ where: { logicalCardId: src.lcid } }))
          + (await tx.externalIdMapping.count({ where: { logicalCardId: src.lcid } }));
        if (refs === 0) { await tx.logicalCard.delete({ where: { id: src.lcid } }); deletedLc++; }
        else { skippedDel++; console.log(`    ⚠️ 빈 LC ${src.lcid} 에 참조 ${refs} → 삭제 보류(나중에 재지정)`); }
      }
      done++;
    });
  }
  if (APPLY) console.log(`\n적용: ${done} 병합 · 빈LC 삭제 ${deletedLc} · 삭제보류 ${skippedDel}`);
  else console.log(`\n(dry) 위 ${targets.length}건이 적용 대상. 실제로는 --apply 추가.`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
