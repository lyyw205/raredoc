/**
 * 다중표 번호충돌 오염 전수 감사 (읽기전용, DB 무변경).
 * 시그니처: 한 세트 안에서 같은 number 에 서로 다른 이름의 카드가 2장 이상인데
 *   그것들이 dex 또는 illustrator 를 강제로 공유 → namu 다중표 파서가 표를 뭉갠 흔적.
 * 출력: 오염 의심 세트 랭킹(공유 번호수·dex오염·일러오염).
 *
 * 실행: npx tsx scripts/audit-collision-corruption.ts
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";

type L = { setId: string; region: string; number: string; name: string; dex: number | null; illus: string | null };

async function main() {
  const sets = await prisma.set.findMany({ select: { id: true, region: true, nameKo: true, name: true, cardPackId: true } });
  const setMeta = new Map(sets.map((s) => [s.id, s]));

  // 전 RegionCard 한 번에 (필요 필드만)
  const all = await prisma.regionCard.findMany({
    select: { setId: true, region: true, number: true, name: true,
      logicalCard: { select: { pokedexNumbers: true, illustrator: true } } },
  });
  const rows: L[] = all.map((l) => ({ setId: l.setId, region: l.region, number: l.number, name: l.name,
    dex: l.logicalCard.pokedexNumbers?.[0] ?? null, illus: l.logicalCard.illustrator ?? null }));

  // setId → number → cards
  const bySet = new Map<string, Map<string, L[]>>();
  for (const r of rows) {
    let m = bySet.get(r.setId); if (!m) { m = new Map(); bySet.set(r.setId, m); }
    const a = m.get(r.number) ?? []; a.push(r); m.set(r.number, a);
  }

  type Rep = { setId: string; region: string; nameKo: string; total: number; dupNums: number; dexShared: number; illusShared: number; grouped: boolean; sample: string };
  const reps: Rep[] = [];
  for (const [setId, byNum] of bySet) {
    let dupNums = 0, dexShared = 0, illusShared = 0, total = 0; let sample = "";
    for (const [num, cards] of byNum) {
      total += cards.length;
      const names = new Set(cards.map((c) => c.name));
      if (cards.length < 2 || names.size < 2) continue; // 같은 이름(변형판)은 정상
      dupNums++;
      const dexes = new Set(cards.map((c) => c.dex).filter((d) => d != null));
      const illus = new Set(cards.map((c) => c.illus).filter((i) => i));
      if (dexes.size === 1 && cards.filter((c) => c.dex != null).length >= 2) { dexShared++; if (!sample) sample = `#${num}: ${cards.map((c) => `${c.name}(dex${c.dex})`).join(" vs ")}`; }
      if (illus.size === 1 && cards.filter((c) => c.illus).length >= 2) illusShared++;
    }
    if (dupNums === 0) continue;
    const m = setMeta.get(setId)!;
    reps.push({ setId, region: m.region, nameKo: m.nameKo ?? m.name, total, dupNums, dexShared, illusShared, grouped: !!m.cardPackId, sample });
  }

  reps.sort((a, b) => (b.dexShared + b.illusShared) - (a.dexShared + a.illusShared) || b.dupNums - a.dupNums);
  console.log(`■ 번호충돌 오염 감사 — 의심 세트 ${reps.length}개 (전 세트 ${sets.length} / RegionCard ${rows.length})\n`);
  console.log(`${"setId".padEnd(26)} ${"지역".padEnd(4)} 카드 다른이름공유번호 dex오염 일러오염 그룹  예시`);
  for (const r of reps) {
    console.log(`${r.setId.padEnd(26)} ${r.region.padEnd(4)} ${String(r.total).padStart(4)} ${String(r.dupNums).padStart(10)} ${String(r.dexShared).padStart(7)} ${String(r.illusShared).padStart(7)}  ${r.grouped ? "○" : "·"}   ${r.sample}`);
  }
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
