/**
 * TCGCSV ↔ 우리 DB 양방향 정합 리포트 (읽기 전용, 적재 없음).
 *
 * 산출: ① 매칭   — 양쪽 다 있는 카드(=크로스워크 적재됨)
 *       ② 우리만 — 우리 RegionCard 인데 TCGCSV 매칭 없음 (세트미보유 vs 번호갭 분류)
 *       ③ TCGCSV만 — TCGCSV 상품인데 우리 카드 매칭 없음 (그룹미매칭 vs 번호갭 vs 모호)
 *       + sealed(번호無 상품 = 별도 레인)
 *
 * 매칭 진실원천 = DB 의 ExternalIdMapping(sourceId=tcgcsv) (이미 적재된 크로스워크).
 * TCGCSV 모집단 = live 페치(그룹+상품).
 *
 * 실행: npm run reconcile:tcgcsv -- --cat=3   (3=EN, 85=JP)
 */
import "dotenv/config";
import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");
import { prisma } from "@/lib/prisma";
import { Logger, fetchJsonWithRetry } from "./lib/price-sync-lib";

const CAT_REGION: Record<number, "EN" | "JP"> = { 3: "EN", 85: "JP" };
const BASE = "https://tcgcsv.com/tcgplayer";
const normNum = (n: string) =>
  (n || "").split("/")[0].trim().toUpperCase().replace(/^0+(?=[0-9])/, "").replace(/([A-Z]+)0+(?=[0-9])/, "$1");
const normName = (s: string) =>
  (s || "").replace(/^[A-Za-z0-9]{1,8}\s*[-:]\s+/, "").toLowerCase()
    .replace(/pok[eé]mon|tcg|expansion|the|trainer gallery|galarian gallery/g, "").replace(/[^a-z0-9]/g, "");
const normCode = (c: string) => (c || "").toLowerCase().replace(/[^a-z0-9]/g, "");

type TcgGroup = { groupId: number; name: string; abbreviation: string | null };
type TcgProduct = { productId: number; extendedData?: { name: string; value: string }[] };

async function run(cat: number) {
  const region = CAT_REGION[cat];
  if (!region) throw new Error(`cat=${cat} 미지원 (3=EN, 85=JP)`);
  const log = new Logger(`reconcile tcgcsv cat${cat}/${region}`);

  // ── 우리 DB: Set + RegionCard + 이미 적재된 tcgcsv 매핑 ──
  const sets = await prisma.set.findMany({ where: { region }, select: { id: true, code: true, name: true } });
  const rcs = await prisma.regionCard.findMany({ where: { region }, select: { id: true, setId: true } });
  const src = await prisma.externalSource.findUnique({ where: { code: "tcgcsv" }, select: { id: true } });
  const maps = await prisma.externalIdMapping.findMany({
    where: { sourceId: src!.id, regionCard: { region } },
    select: { externalId: true, regionCardId: true },
  });
  const matchedRcIds = new Set(maps.map((m) => m.regionCardId!).filter(Boolean));
  const matchedProdIds = new Set(maps.map((m) => m.externalId));

  // 우리 set 색인 (그룹→set 매칭 재현 — '세트미보유' 분류용)
  const byCode = new Map<string, string>(), byName = new Map<string, string>(), nameCol = new Set<string>();
  for (const s of sets) {
    if (s.code) byCode.set(normCode(s.code), s.id);
    const nn = normName(s.name);
    if (nn) { if (byName.has(nn) && byName.get(nn) !== s.id) nameCol.add(nn); else byName.set(nn, s.id); }
  }

  // ── TCGCSV 모집단 페치 ──
  const groups = (await fetchJsonWithRetry<{ results: TcgGroup[] }>(`${BASE}/${cat}/groups`, { log }))?.results ?? [];
  const matchedSetIds = new Set<string>(); // 그룹이 매칭된 우리 setId
  for (const g of groups) {
    let setId = g.abbreviation ? byCode.get(normCode(g.abbreviation)) : undefined;
    if (!setId) { const nn = normName(g.name); if (nn && !nameCol.has(nn)) setId = byName.get(nn); }
    if (setId) matchedSetIds.add(setId);
  }

  // 상품 전수 순회 → TCGCSV쪽 분류
  let prodWithNum = 0, sealed = 0, fMatched = 0, fNumGap = 0, fUnmatchedGroup = 0;
  for (const g of groups) {
    let setId = g.abbreviation ? byCode.get(normCode(g.abbreviation)) : undefined;
    if (!setId) { const nn = normName(g.name); if (nn && !nameCol.has(nn)) setId = byName.get(nn); }
    const groupMatched = !!setId;
    const prods = (await fetchJsonWithRetry<{ results: TcgProduct[] }>(`${BASE}/${cat}/${g.groupId}/products`, { log }))?.results ?? [];
    for (const p of prods) {
      const hasNum = p.extendedData?.some((e) => e.name === "Number");
      if (!hasNum) { sealed++; continue; }
      prodWithNum++;
      if (matchedProdIds.has(String(p.productId))) fMatched++;
      else if (!groupMatched) fUnmatchedGroup++;
      else fNumGap++;
    }
  }

  // ── 우리쪽 분류 ──
  let ourMatched = 0, ourSetGap = 0, ourNumGap = 0;
  for (const rc of rcs) {
    if (matchedRcIds.has(rc.id)) ourMatched++;
    else if (!matchedSetIds.has(rc.setId)) ourSetGap++; // 그 세트에 대응 TCGCSV 그룹 없음
    else ourNumGap++; // 세트는 매칭됐는데 이 번호 상품 없음
  }

  const fTotal = prodWithNum;
  console.log(`\n===== TCGCSV ↔ 우리DB 정합 (cat${cat} / ${region}) =====`);
  console.log(`우리 ${region} Set ${sets.length} · RegionCard ${rcs.length}`);
  console.log(`TCGCSV 그룹 ${groups.length} (세트매칭 ${matchedSetIds.size})`);
  console.log(`\n[① 매칭] ${ourMatched} RegionCard  ↔  ${fMatched} TCGCSV productId  (크로스워크 적재됨)`);
  console.log(`\n[② 우리 DB에만 남음] ${ourSetGap + ourNumGap} / ${rcs.length} RegionCard`);
  console.log(`   - 세트미보유(TCGCSV에 그 세트 그룹 없음): ${ourSetGap}`);
  console.log(`   - 번호갭(세트는 매칭, 이 번호 상품 없음): ${ourNumGap}`);
  console.log(`\n[③ TCGCSV에만 남음] ${fUnmatchedGroup + fNumGap} / ${fTotal} 카드상품`);
  console.log(`   - 그룹미매칭(우리가 그 세트 미보유/매칭실패): ${fUnmatchedGroup}`);
  console.log(`   - 번호갭(그룹은 매칭, 우리 카드에 그 번호 없음): ${fNumGap}`);
  console.log(`\n[sealed/번호無 상품(별도 레인)] ${sealed}`);
  console.log(`\n매칭률: 우리쪽 ${(100 * ourMatched / rcs.length).toFixed(1)}%  ·  TCGCSV쪽 ${(100 * fMatched / fTotal).toFixed(1)}%`);

  await prisma.$disconnect();
}

const cat = Number(process.argv.slice(2).find((a) => a.startsWith("--cat="))?.split("=")[1]) || 3;
run(cat).catch((e) => { console.error(e); process.exit(1); });
