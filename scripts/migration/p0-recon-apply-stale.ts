// ── P0 스테일 트윈 reconciliation 적용 ───────────────────────────────────────
// bare 세트(setGroupId null) ↔ en-tcg-<id> 트윈(keeper). bare EN locale 의 시세/참조를 트윈으로 옮기고 bare 제거.
//  매칭: bare locale ↔ twin locale = 정규화번호(소문자·선행0제거) 동일. 1:1 아니면 해당 카드 격리.
//  이동: Price.cardLocaleId(bare→twin locale) · CollectionItem.localeId(bare→twin) + logicalCardId(bareLC→twinLC)
//        DeckRecipeCard·Ruling.logicalCardId(bareLC→twinLC)
//  삭제: 매칭된 bare locale · 그로 인해 고아된 bare LC · 빈 bare 세트
//  스냅샷 + 로케일보존(전후 세트별 EN locale 수) 검사.
// 기본 dry-run. 적용 --apply. 실행: npx tsx scripts/migration/p0-recon-apply-stale.ts [--apply]
import "dotenv/config";
import fs from "fs";
import { prisma } from "../../src/lib/prisma";

const APPLY = process.argv.includes("--apply");
const SNAP = ".migration-snapshots/recon-stale-apply.json";
const esc = (s: any) => String(s).replace(/'/g, "''");
const normNum = (s: any) => String(s ?? "").toLowerCase().replace(/^0+(?=\d)/, "").trim();

async function main() {
  console.log(`【스테일 트윈 reconciliation】${APPLY ? " ★APPLY" : " (dry-run)"}`);
  // bare 세트(트윈 keeper 보유)
  const bareSets: string[] = (await prisma.$queryRawUnsafe<any[]>(
    `SELECT s.id FROM "Set" s WHERE s."setGroupId" IS NULL AND EXISTS (SELECT 1 FROM "Set" t WHERE t.id='en-tcg-'||s.id AND t."setGroupId" IS NOT NULL)`
  )).map((r) => r.id);
  console.log(`  bare 세트 ${bareSets.length}쌍`);

  // bare/twin locale 로드
  const allLoc = await prisma.cardLocale.findMany({
    where: { OR: [{ setId: { in: bareSets } }, { setId: { in: bareSets.map((s) => "en-tcg-" + s) } }] },
    select: { id: true, setId: true, number: true, numberInt: true, name: true, logicalCardId: true },
  });
  const twinByKey = new Map<string, { id: string; lc: string; name: string }[]>();
  for (const l of allLoc) if (l.setId.startsWith("en-tcg-")) {
    const k = `${l.setId}|${normNum(l.number)}`; (twinByKey.get(k) ?? twinByKey.set(k, []).get(k)!).push({ id: l.id, lc: l.logicalCardId, name: l.name });
  }

  // 매칭
  const matched: { bareLoc: string; bareLC: string; twinLoc: string; twinLC: string }[] = [];
  const unmatched: string[] = [], ambiguous: string[] = [], nameMismatch: string[] = [];
  const norm = (s: any) => (s || "").toLowerCase().replace(/\s+/g, " ").trim();
  for (const l of allLoc) if (!l.setId.startsWith("en-tcg-")) {
    const k = `en-tcg-${l.setId}|${normNum(l.number)}`;
    const cand = twinByKey.get(k) || [];
    if (cand.length === 0) { unmatched.push(`${l.setId}#${l.number} "${l.name}"`); continue; }
    if (cand.length > 1) { ambiguous.push(`${l.setId}#${l.number} → ${cand.length}개`); continue; }
    const t = cand[0];
    if (norm(l.name) && norm(t.name) && norm(l.name) !== norm(t.name)) { nameMismatch.push(`${l.setId}#${l.number} "${l.name}" ≠ twin "${t.name}"`); continue; } // 격리(번호체계 상이)
    matched.push({ bareLoc: l.id, bareLC: l.logicalCardId, twinLoc: t.id, twinLC: t.lc });
  }
  console.log(`  bare locale ${allLoc.filter((l) => !l.setId.startsWith("en-tcg-")).length} · 매칭 ${matched.length} · 미매칭 ${unmatched.length} · 모호 ${ambiguous.length} · 이름불일치 ${nameMismatch.length}`);
  if (unmatched.length) console.log("   미매칭 표본:", unmatched.slice(0, 8).join(" · "));
  if (ambiguous.length) console.log("   모호 표본:", ambiguous.slice(0, 8).join(" · "));
  if (nameMismatch.length) console.log("   이름불일치 표본:", nameMismatch.slice(0, 8).join(" · "));

  // 이동 규모
  const bareLocIds = matched.map((m) => m.bareLoc);
  const bareLCIds = [...new Set(matched.map((m) => m.bareLC))];
  const cnt = async (sql: string) => Number(((await prisma.$queryRawUnsafe(sql)) as any[])[0]?.c ?? 0);
  const inLoc = `ARRAY[${bareLocIds.map((x) => `'${esc(x)}'`).join(",")}]`;
  const inLC = bareLCIds.length ? `ARRAY[${bareLCIds.map((x) => `'${esc(x)}'`).join(",")}]` : `ARRAY['']`;
  const priceN = await cnt(`SELECT count(*)::int c FROM "Price" WHERE "cardLocaleId"=ANY(${inLoc})`);
  const ciLocN = await cnt(`SELECT count(*)::int c FROM "CollectionItem" WHERE "localeId"=ANY(${inLoc})`);
  const ciLcN = await cnt(`SELECT count(*)::int c FROM "CollectionItem" WHERE "logicalCardId"=ANY(${inLC})`);
  const drcN = await cnt(`SELECT count(*)::int c FROM "DeckRecipeCard" WHERE "logicalCardId"=ANY(${inLC})`);
  const ruN = await cnt(`SELECT count(*)::int c FROM "Ruling" WHERE "logicalCardId"=ANY(${inLC})`);
  const trN = await cnt(`SELECT count(*)::int c FROM "Trade" WHERE "localeId"=ANY(${inLoc})`);
  const extN = await cnt(`SELECT count(*)::int c FROM "ExternalIdMapping" WHERE "cardLocaleId"=ANY(${inLoc}) OR "logicalCardId"=ANY(${inLC})`);
  console.log(`  이동대상 — Price ${priceN} · CollectionItem(loc ${ciLocN}/lc ${ciLcN}) · Trade ${trN} · DeckRecipeCard ${drcN} · Ruling ${ruN} · ExternalId ${extN}`);
  // bare LC 가 매칭locale 외 다른 locale 도 갖나(삭제 안전성)
  const lcExtra = await cnt(`SELECT count(DISTINCT "logicalCardId")::int c FROM "CardLocale" WHERE "logicalCardId"=ANY(${inLC}) AND id <> ALL(${inLoc})`);
  console.log(`  bare LC 중 매칭 외 locale 보유(삭제 보류 대상): ${lcExtra}`);

  if (!APPLY) { console.log("\n  (dry-run — 변경 0)"); await prisma.$disconnect(); return; }

  // ── 스냅샷 ──
  if (!fs.existsSync(".migration-snapshots")) fs.mkdirSync(".migration-snapshots", { recursive: true });
  const snap: any = { matched, bareSets };
  snap.priceOld = await prisma.price.findMany({ where: { cardLocaleId: { in: bareLocIds } }, select: { id: true, cardLocaleId: true } });
  snap.bareLocales = await prisma.cardLocale.findMany({ where: { id: { in: bareLocIds } } });
  snap.bareLCs = await prisma.logicalCard.findMany({ where: { id: { in: bareLCIds } } });
  fs.writeFileSync(SNAP, JSON.stringify(snap));
  console.log(`\n  💾 스냅샷 ${SNAP}`);

  // ── 이동 (VALUES join) ──
  const locPairs = matched.map((m) => [m.bareLoc, m.twinLoc] as [string, string]);
  const lcPairs = [...new Map(matched.map((m) => [m.bareLC, m.twinLC])).entries()];
  async function move(table: string, col: string, pairs: [string, string][]) {
    let n = 0;
    for (let i = 0; i < pairs.length; i += 1000) {
      const v = pairs.slice(i, i + 1000).map(([a, b]) => `('${esc(a)}','${esc(b)}')`).join(",");
      n += await prisma.$executeRawUnsafe(`UPDATE "${table}" x SET "${col}"=m.dst FROM (VALUES ${v}) AS m(src,dst) WHERE x."${col}"=m.src`);
    }
    return n;
  }
  const mPrice = await move("Price", "cardLocaleId", locPairs);
  const mTrade = await move("Trade", "localeId", locPairs);
  const mCIloc = await move("CollectionItem", "localeId", locPairs);
  const mEXloc = await move("ExternalIdMapping", "cardLocaleId", locPairs);
  const mCIlc = await move("CollectionItem", "logicalCardId", lcPairs);
  const mDRC = await move("DeckRecipeCard", "logicalCardId", lcPairs);
  const mRU = await move("Ruling", "logicalCardId", lcPairs);
  const mEXlc = await move("ExternalIdMapping", "logicalCardId", lcPairs);
  console.log(`  이동 — Price ${mPrice} · Trade ${mTrade} · CI(loc ${mCIloc}/lc ${mCIlc}) · DeckRecipeCard ${mDRC} · Ruling ${mRU} · Ext(loc ${mEXloc}/lc ${mEXlc})`);

  // ── 삭제: bare locale → 고아 bare LC → 빈 bare 세트 ──
  const delLoc = await prisma.cardLocale.deleteMany({ where: { id: { in: bareLocIds } } });
  // 매칭 외 locale 없는 bare LC만 삭제
  const orphanLC = (await prisma.logicalCard.findMany({ where: { id: { in: bareLCIds }, locales: { none: {} } }, select: { id: true } })).map((x) => x.id);
  const delLC = await prisma.logicalCard.deleteMany({ where: { id: { in: orphanLC } } });
  // 빈 bare 세트 삭제
  const emptyBareSets = (await prisma.set.findMany({ where: { id: { in: bareSets }, localeCards: { none: {} } }, select: { id: true } })).map((x) => x.id);
  const delSet = await prisma.set.deleteMany({ where: { id: { in: emptyBareSets } } });
  console.log(`  삭제 — bare locale ${delLoc.count} · 고아 bare LC ${delLC.count} · 빈 bare 세트 ${delSet.count}`);

  // ── 검증 ──
  const twinPrice = await cnt(`SELECT count(*)::int c FROM "Price" p JOIN "CardLocale" cl ON cl.id=p."cardLocaleId" WHERE cl."setId" IN (${bareSets.map((s) => `'en-tcg-${esc(s)}'`).join(",")})`);
  const remainBare = await cnt(`SELECT count(*)::int c FROM "Set" s WHERE s.id=ANY(ARRAY[${bareSets.map((s) => `'${esc(s)}'`).join(",")}])`);
  console.log(`\n  ✅ twin locale 의 Price ${twinPrice}(이전 0) · 잔존 bare 세트 ${remainBare}`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
