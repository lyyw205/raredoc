// ── P0.2 스테일 트윈세트 dry-run (읽기전용, 삭제 0) ──────────────────────────
// bare EN 세트 "<id>" ↔ "en-tcg-<id>" 트윈 탐지. 어느 쪽이 유령인지·삭제 규모·참조 측정.
// 실행: npx tsx scripts/migration/p0-2-stale-sets-dryrun.ts
import "dotenv/config";
import { prisma } from "../../src/lib/prisma";

const n = (x: any) => Number(x ?? 0);

async function main() {
  const sets = await prisma.set.findMany({ select: { id: true, region: true, setGroupId: true, name: true } });
  const byId = new Map(sets.map((s) => [s.id, s]));

  // 세트별 로케일 수 · 고유 LC 수
  const locRows: any[] = await prisma.$queryRawUnsafe(
    `SELECT "setId" sid, count(*)::int locs, count(DISTINCT "logicalCardId")::int lcs FROM "CardLocale" GROUP BY "setId"`
  );
  const locCount = new Map<string, { locs: number; lcs: number }>();
  for (const r of locRows) locCount.set(r.sid, { locs: n(r.locs), lcs: n(r.lcs) });

  // 트윈 페어: bare "<id>" 와 "en-tcg-<id>" 둘 다 존재
  const pairs: { bare: any; twin: any }[] = [];
  for (const s of sets) {
    if (s.id.startsWith("en-tcg-")) continue;
    const twin = byId.get("en-tcg-" + s.id);
    if (twin) pairs.push({ bare: s, twin });
  }

  console.log(`【P0.2 dry-run】 bare↔en-tcg 트윈 페어: ${pairs.length}쌍\n`);
  console.log("bareId            bare(reg/grp/locs/lcs)        en-tcg-twin(reg/grp/locs/lcs)     유령판정");
  const staleSetIds: string[] = [];
  let staleLocs = 0;
  for (const { bare, twin } of pairs) {
    const b = locCount.get(bare.id) ?? { locs: 0, lcs: 0 };
    const t = locCount.get(twin.id) ?? { locs: 0, lcs: 0 };
    // 유령 = bare(setGroupId null) 이고 twin이 setGroupId 보유(keeper)
    const bareStale = bare.setGroupId == null && twin.setGroupId != null;
    const verdict = bareStale ? `bare 유령(삭제 ${b.locs})` : "수동확인 필요";
    if (bareStale) { staleSetIds.push(bare.id); staleLocs += b.locs; }
    console.log(
      `${bare.id.padEnd(17)} ${(bare.region + "/" + (bare.setGroupId ?? "∅") + "/" + b.locs + "/" + b.lcs).padEnd(28)} ` +
      `${(twin.region + "/" + (twin.setGroupId ?? "∅") + "/" + t.locs + "/" + t.lcs).padEnd(32)} ${verdict}`
    );
  }

  console.log(`\n── 유령(bare, twin이 keeper) ${staleSetIds.length}세트 · 삭제될 로케일 ${staleLocs} ──`);

  if (staleSetIds.length) {
    // 유령 세트 로케일에 걸린 참조(삭제 차단 요인)
    const arr = `ARRAY[${staleSetIds.map((s) => `'${s}'`).join(",")}]`;
    const refQ = async (sql: string) => n((await prisma.$queryRawUnsafe(sql) as any[])[0]?.c);
    const price = await refQ(`SELECT count(*)::int c FROM "Price" p JOIN "CardLocale" cl ON cl.id=p."cardLocaleId" WHERE cl."setId"=ANY(${arr})`);
    const coll = await refQ(`SELECT count(*)::int c FROM "CollectionItem" ci JOIN "CardLocale" cl ON cl.id=ci."localeId" WHERE cl."setId"=ANY(${arr})`).catch(() => -1);
    const trade = await refQ(`SELECT count(*)::int c FROM "Trade" t JOIN "CardLocale" cl ON cl.id=t."localeId" WHERE cl."setId"=ANY(${arr})`).catch(() => -1);
    console.log("유령 세트 로케일에 걸린 참조 (삭제 전 재포인트/정리 필요):");
    console.log(`  Price ${price} · CollectionItem ${coll} · Trade ${trade}`);

    // 유령 세트에만 존재하는 LC(트윈에 없는) = 삭제될 고아 LC
    const onlyStaleLC: any[] = await prisma.$queryRawUnsafe(
      `SELECT count(DISTINCT cl."logicalCardId")::int c FROM "CardLocale" cl WHERE cl."setId"=ANY(${arr})
       AND NOT EXISTS (SELECT 1 FROM "CardLocale" o WHERE o."logicalCardId"=cl."logicalCardId" AND o."setId" <> ANY(${arr}))`
    );
    console.log(`  유령에만 매달린(다른세트에 로케일 없는) LC: ${n(onlyStaleLC[0]?.c)} → 삭제 대상 LC`);

    console.log("\n유령 세트 id 목록:");
    console.log("  " + staleSetIds.join(", "));
  }

  console.log("\n  (dry-run — 삭제 0. CONFIG 정합·보존가드는 적용 단계에서)");
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
