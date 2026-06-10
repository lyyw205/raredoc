// ── P0 reconciliation 조사 v2 (읽기전용) ─────────────────────────────────────
//  Q1: 빈-LC 패밀리별 — id에서 (setId,번호) 파싱 → 그 좌표의 살아있는 CardLocale 의 LC = 재포인트 타깃. 성공률?
//  Q2: sv/me 등 non-en-tcg 빈-LC 패밀리는 어떤 setId를 인코딩하나
//  Q3: 스테일 bare LC 들이 ref(DeckRecipeCard/CardText/ExternalId/CollectionItem/Trade/Ruling)를 갖나
//  Q4: 빈-LC ExternalId 의 source 분포
// 실행: npx tsx scripts/migration/p0-recon-investigate2.ts
import "dotenv/config";
import { prisma } from "../../src/lib/prisma";

const n = (x: any) => Number(x ?? 0);

// 빈-LC id → (setId, numberInt) 추정
function parseLcId(id: string): { setId: string; num: number } | null {
  let s = id;
  if (s.startsWith("lc-orphan-")) s = s.slice("lc-orphan-".length);
  else if (s.startsWith("lc-")) s = s.slice("lc-".length);
  else return null;
  const m = s.match(/^(.*)-(\d+[a-z]?)$/i); // 마지막 -번호
  if (!m) return null;
  const num = parseInt(m[2], 10);
  if (!Number.isFinite(num)) return null;
  return { setId: m[1], num };
}

async function main() {
  const empties = await prisma.logicalCard.findMany({
    where: { locales: { none: {} } },
    select: { id: true },
  });
  const emptyIds = new Set(empties.map((e) => e.id));
  console.log(`빈-LC ${empties.length}개\n`);

  // ── Q1/Q2: 패밀리별 파싱→좌표 타깃 가용성 ──
  const fam = new Map<string, { total: number; parsed: number; setExists: number; liveTarget: number; selfTarget: number; samples: string[] }>();
  // setId 존재 캐시
  const allSets = new Set((await prisma.set.findMany({ select: { id: true } })).map((s) => s.id));

  // 좌표→LC 일괄 조회를 위해 후보 수집
  const probes: { id: string; setId: string; num: number }[] = [];
  for (const e of empties) {
    const p = parseLcId(e.id);
    const famKey = e.id.replace(/[0-9].*$/, "").slice(0, 20);
    const f = fam.get(famKey) ?? fam.set(famKey, { total: 0, parsed: 0, setExists: 0, liveTarget: 0, selfTarget: 0, samples: [] }).get(famKey)!;
    f.total++;
    if (f.samples.length < 2) f.samples.push(e.id);
    if (p) { f.parsed++; if (allSets.has(p.setId)) { f.setExists++; probes.push({ id: e.id, setId: p.setId, num: p.num }); } }
  }

  // 좌표의 살아있는 CardLocale 의 LC 조회 (배치)
  let liveOK = 0, selfHit = 0, noLoc = 0;
  const targetMap = new Map<string, string>(); // emptyId -> targetLcId
  for (let i = 0; i < probes.length; i += 500) {
    const batch = probes.slice(i, i + 500);
    const ors = batch.map((b) => `("setId"='${b.setId}' AND "numberInt"=${b.num})`).join(" OR ");
    const rows: any[] = await prisma.$queryRawUnsafe(
      `SELECT "setId", "numberInt" num, "logicalCardId" lc FROM "CardLocale" WHERE ${ors}`);
    const byCoord = new Map(rows.map((r) => [`${r.setId}#${r.num}`, r.lc]));
    for (const b of batch) {
      const lc = byCoord.get(`${b.setId}#${b.num}`);
      const famKey = b.id.replace(/[0-9].*$/, "").slice(0, 20);
      const f = fam.get(famKey)!;
      if (!lc) { noLoc++; continue; }
      if (lc === b.id) { selfHit++; f.selfTarget++; continue; } // 좌표가 자기 자신(=여전히 비어야 하는데 모순)
      if (!emptyIds.has(lc)) { liveOK++; f.liveTarget++; targetMap.set(b.id, lc); }
    }
  }

  console.log("── 패밀리별 (total/파싱/set존재/살아있는타깃/self) ──");
  for (const [k, f] of [...fam].sort((a, b) => b[1].total - a[1].total))
    console.log(`  ${k.padEnd(22)} ${f.total}\t파싱 ${f.parsed}\tset존재 ${f.setExists}\t타깃 ${f.liveTarget}\tself ${f.selfTarget}\t예: ${f.samples[0]}`);
  console.log(`\n  좌표→살아있는 타깃 확보: ${liveOK} / ${empties.length} · 좌표 locale 없음 ${noLoc} · self(모순) ${selfHit}`);

  // ── Q3: 스테일 bare LC 들이 ref 를 갖나 ──
  console.log("\n── Q3: 스테일 bare LC ref 점검 ──");
  const bareLcRows: any[] = await prisma.$queryRawUnsafe(
    `SELECT DISTINCT cl."logicalCardId" lc FROM "CardLocale" cl
     JOIN "Set" s ON s.id=cl."setId" WHERE s."setGroupId" IS NULL
       AND EXISTS (SELECT 1 FROM "Set" t WHERE t.id='en-tcg-'||s.id AND t."setGroupId" IS NOT NULL)`);
  const bareLcIds = bareLcRows.map((r) => r.lc);
  console.log(`  스테일 bare locale 의 LC: ${bareLcIds.length}개`);
  const refModels: [string, any][] = [
    ["CollectionItem", prisma.collectionItem], ["Trade", prisma.trade], ["TierEntry", prisma.tierEntry],
    ["DeckCard", prisma.deckCard], ["DeckRecipeCard", prisma.deckRecipeCard], ["Ruling", prisma.ruling],
    ["CardText", prisma.cardText], ["ExternalIdMapping", prisma.externalIdMapping],
  ];
  for (const [name, model] of refModels) {
    try { const c = await model.count({ where: { logicalCardId: { in: bareLcIds } } }); console.log(`    ${name}: ${c}`); }
    catch (e: any) { console.log(`    ${name}: (스킵)`); }
  }
  // bare LC 가 stale-only 인지(다른 세트 locale 없는지)
  const bareOnly: any[] = await prisma.$queryRawUnsafe(
    `SELECT count(*)::int c FROM unnest(ARRAY[${bareLcIds.map((x) => `'${x}'`).join(",")}]) lcid
     WHERE NOT EXISTS (SELECT 1 FROM "CardLocale" cl JOIN "Set" s ON s.id=cl."setId"
       WHERE cl."logicalCardId"=lcid AND NOT (s."setGroupId" IS NULL AND EXISTS (SELECT 1 FROM "Set" t WHERE t.id='en-tcg-'||s.id AND t."setGroupId" IS NOT NULL)))`);
  console.log(`  bare LC 중 stale-only(삭제시 고아): ${n(bareOnly[0]?.c)} / ${bareLcIds.length}`);

  // ── Q4: 빈-LC ExternalId source 분포 ──
  console.log("\n── Q4: 빈-LC ExternalId source 분포 ──");
  const src: any[] = await prisma.$queryRawUnsafe(
    `SELECT es.code, count(*)::int c FROM "ExternalIdMapping" m JOIN "ExternalSource" es ON es.id=m."sourceId"
     WHERE m."logicalCardId" = ANY(ARRAY[${[...emptyIds].slice(0, 4839).map((x) => `'${x}'`).join(",")}]) GROUP BY es.code ORDER BY c DESC`);
  console.log("  " + src.map((r) => `${r.code}=${r.c}`).join(" · "));

  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
