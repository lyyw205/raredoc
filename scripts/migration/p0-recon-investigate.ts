// ── P0 reconciliation 조사 (읽기전용) ─────────────────────────────────────────
// 두 보류건의 실제 토폴로지를 추적해 "재배치 타깃"을 데이터로 확정한다.
//  PART1: 스테일 트윈(bare ↔ en-tcg-) — bare locale/price 가 어느 LC에 달렸고 twin과 어떻게 대응하나
//  PART2: 빈-LC — 참조(CardText/DeckRecipeCard/ExternalId)를 어느 살아있는 LC로 재포인트할 수 있나
// 실행: npx tsx scripts/migration/p0-recon-investigate.ts
import "dotenv/config";
import { prisma } from "../../src/lib/prisma";

const n = (x: any) => Number(x ?? 0);
const short = (s: any) => (s ? String(s).slice(0, 12) : "∅");

async function main() {
  console.log("════════ PART 1: 스테일 트윈 토폴로지 ════════\n");

  // 워크드 예시: swsh12(bare) ↔ en-tcg-swsh12(twin=og-s12)
  const bareSet = "swsh12", twinSet = "en-tcg-swsh12";
  for (const sid of [bareSet, twinSet]) {
    const set = await prisma.set.findUnique({ where: { id: sid } });
    console.log(`SET ${sid}: region=${set?.region} setGroupId=${set?.setGroupId} name="${set?.name}"`);
  }
  for (const num of [1, 50, 100]) {
    console.log(`\n── 카드 #${num} ──`);
    for (const sid of [bareSet, twinSet]) {
      const cl = await prisma.cardLocale.findFirst({
        where: { setId: sid, numberInt: num },
        select: { id: true, region: true, name: true, number: true, logicalCardId: true },
      });
      if (!cl) { console.log(`  [${sid}] #${num}: (없음)`); continue; }
      const lc = await prisma.logicalCard.findUnique({
        where: { id: cl.logicalCardId },
        select: { id: true, gameCardId: true, artCardId: true, setGroupId: true,
          locales: { select: { region: true, setId: true, number: true } } },
      });
      const priceN = await prisma.price.count({ where: { cardLocaleId: cl.id } });
      console.log(`  [${sid}] CL=${cl.id} ${cl.region} "${cl.name}" #${cl.number} price=${priceN}`);
      console.log(`     → LC=${lc?.id} gc=${short(lc?.gameCardId)} ac=${short(lc?.artCardId)} grp=${lc?.setGroupId ?? "∅"}`);
      console.log(`        locales(${lc?.locales.length}): ${lc?.locales.map((l) => `${l.region}:${l.setId}#${l.number}`).join("  ")}`);
    }
  }

  // 집계: 45개 bare 세트 전체
  console.log("\n── 집계(45 bare 세트 전체) ──");
  const bareIds: string[] = (await prisma.$queryRawUnsafe<any[]>(
    `SELECT s.id FROM "Set" s WHERE s."setGroupId" IS NULL AND EXISTS (SELECT 1 FROM "Set" t WHERE t.id='en-tcg-'||s.id AND t."setGroupId" IS NOT NULL)`
  )).map((r) => r.id);
  const arr = `ARRAY[${bareIds.map((s) => `'${s}'`).join(",")}]`;
  // bare locale 의 region 분포
  const reg: any[] = await prisma.$queryRawUnsafe(`SELECT region, count(*)::int c FROM "CardLocale" WHERE "setId"=ANY(${arr}) GROUP BY region ORDER BY c DESC`);
  console.log("  bare locale region 분포:", reg.map((r) => `${r.region}=${r.c}`).join(" · "));
  // bare locale 이 달린 LC 가 setGroup(팩) 을 가지나? (=JP앵커에 병합된 EN인가 / 독립 en-tcg LC인가)
  const grpStat: any[] = await prisma.$queryRawUnsafe(
    `SELECT (lc."setGroupId" IS NOT NULL) has_grp, count(DISTINCT cl.id)::int locs, count(DISTINCT lc.id)::int lcs
     FROM "CardLocale" cl JOIN "LogicalCard" lc ON lc.id=cl."logicalCardId" WHERE cl."setId"=ANY(${arr}) GROUP BY 1`);
  console.log("  bare locale 의 LC 가 팩보유?:", grpStat.map((r) => `grp=${r.has_grp}: locale ${r.locs}/LC ${r.lcs}`).join(" · "));
  // bare locale 의 LC 가 EN-twin locale 도 함께 가지나? (같은 LC면 단순 중복, 다른 LC면 분리됨)
  const sameLC: any[] = await prisma.$queryRawUnsafe(
    `SELECT count(*)::int c FROM "CardLocale" b JOIN "CardLocale" tw
       ON tw."logicalCardId"=b."logicalCardId" AND tw."setId"='en-tcg-'||b."setId"
     WHERE b."setId"=ANY(${arr})`);
  console.log(`  bare 와 twin 이 같은 LC 인 경우: ${n(sameLC[0]?.c)} (0이면 완전 분리)`);
  // price 가 달린 위치: bare locale 의 LC 가 다른(non-stale) 세트 locale 도 갖나
  const priceLC: any[] = await prisma.$queryRawUnsafe(
    `SELECT count(DISTINCT lc.id)::int lcs, count(DISTINCT cl.id)::int priced_locs
     FROM "Price" p JOIN "CardLocale" cl ON cl.id=p."cardLocaleId" JOIN "LogicalCard" lc ON lc.id=cl."logicalCardId"
     WHERE cl."setId"=ANY(${arr})`);
  console.log(`  Price 달린 bare locale: ${n(priceLC[0]?.priced_locs)}개 (LC ${n(priceLC[0]?.lcs)}개)`);
  // twin locale 에 price 가 이미 있나
  const twinPrice: any[] = await prisma.$queryRawUnsafe(
    `SELECT count(*)::int c FROM "Price" p JOIN "CardLocale" cl ON cl.id=p."cardLocaleId"
     WHERE cl."setId" IN (SELECT 'en-tcg-'||x FROM unnest(${arr}) x)`);
  console.log(`  twin(en-tcg) locale 에 이미 달린 Price: ${n(twinPrice[0]?.c)}`);

  console.log("\n\n════════ PART 2: 빈-LC 재포인트 타깃 ════════\n");
  // 빈-LC 표본 추적: 참조를 어느 살아있는 LC로 보낼 수 있나
  const empties = await prisma.logicalCard.findMany({
    where: { locales: { none: {} } },
    select: { id: true, supertype: true, regulationMark: true, pokedexNumbers: true },
    take: 5000,
  });
  const emptyIds = new Set(empties.map((e) => e.id));
  console.log(`빈-LC ${empties.length}개. 표본 8개 추적:\n`);

  // ExternalIdMapping 이 다리: 빈-LC 의 externalId 가 살아있는 LC 에도 매핑돼 있나
  const sampleEmpties = empties.slice(0, 8);
  for (const e of sampleEmpties) {
    console.log(`▸ 빈-LC ${e.id} (${e.supertype ?? "?"} reg=${e.regulationMark ?? "?"} dex=[${(e.pokedexNumbers || []).join(",")}])`);
    const exts = await prisma.externalIdMapping.findMany({ where: { logicalCardId: e.id }, select: { source: true, externalId: true } });
    console.log(`   ExternalId: ${exts.map((x) => `${x.source}:${x.externalId}`).join(" ") || "(없음)"}`);
    // 같은 externalId 를 가진 다른(살아있는) LC?
    for (const x of exts) {
      const others = await prisma.externalIdMapping.findMany({
        where: { source: x.source, externalId: x.externalId, logicalCardId: { not: e.id } },
        select: { logicalCardId: true },
      });
      const alive = others.filter((o) => !emptyIds.has(o.logicalCardId));
      if (alive.length) console.log(`     ↳ 같은 ext "${x.externalId}" → 살아있는 LC: ${alive.map((o) => o.logicalCardId).join(", ")}`);
    }
    const cts = await prisma.cardText.findMany({ where: { logicalCardId: e.id }, select: { language: true, name: true } });
    console.log(`   CardText: ${cts.map((c) => `${c.language}:"${c.name}"`).join(" ") || "(없음)"}`);
    const drc = await prisma.deckRecipeCard.count({ where: { logicalCardId: e.id } });
    console.log(`   DeckRecipeCard: ${drc}`);
  }

  // 집계: ExternalId 다리로 타깃 찾을 수 있는 빈-LC 비율
  console.log("\n── 집계: 재포인트 타깃 가용성 ──");
  const extBridge: any[] = await prisma.$queryRawUnsafe(
    `SELECT count(DISTINCT a."logicalCardId")::int c FROM "ExternalIdMapping" a
     JOIN "ExternalIdMapping" b ON b.source=a.source AND b."externalId"=a."externalId" AND b."logicalCardId" <> a."logicalCardId"
     JOIN "LogicalCard" lb ON lb.id=b."logicalCardId"
     WHERE a."logicalCardId" = ANY(SELECT id FROM "LogicalCard" WHERE NOT EXISTS (SELECT 1 FROM "CardLocale" cl WHERE cl."logicalCardId"="LogicalCard".id))
       AND EXISTS (SELECT 1 FROM "CardLocale" cl WHERE cl."logicalCardId"=b."logicalCardId")`);
  console.log(`  ExternalId 다리로 살아있는 타깃 찾는 빈-LC: ${n(extBridge[0]?.c)} / ${empties.length}`);

  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
