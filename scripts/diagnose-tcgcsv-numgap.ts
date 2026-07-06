/**
 * TCGCSV 번호갭 진단 (읽기 전용). 매칭된 세트 내에서 양쪽 번호 차집합을 덤프.
 *   - ourOnly  : 우리 RegionCard 인데 같은 번호 TCGCSV 상품 없음 (②번호갭)
 *   - tcgOnly  : TCGCSV 상품인데 같은 번호 우리 카드 없음 (③번호갭)
 * 원본 번호+이름을 나란히 보여 형식불일치/누락/시크릿 패턴 식별.
 * 전체 상세는 scratchpad JSON 으로 덤프.
 *
 * 실행: npm run diagnose:numgap -- --cat=3
 */
import "dotenv/config";
import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");
import { writeFileSync } from "node:fs";
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
type TcgProduct = { productId: number; name: string; extendedData?: { name: string; value: string }[] };

const SC = process.env.SCRATCH ||
  "/tmp/claude-1000/-home-lyyw205-repos-raredoc/60e9a6a7-1ee9-432f-a989-3be3e5e4c704/scratchpad";

async function run(cat: number) {
  const region = CAT_REGION[cat];
  const log = new Logger(`numgap cat${cat}/${region}`);
  const sets = await prisma.set.findMany({ where: { region }, select: { id: true, code: true, name: true } });
  const byCode = new Map<string, string>(), byName = new Map<string, string>(), nameCol = new Set<string>();
  for (const s of sets) {
    if (s.code) byCode.set(normCode(s.code), s.id);
    const nn = normName(s.name);
    if (nn) { if (byName.has(nn) && byName.get(nn) !== s.id) nameCol.add(nn); else byName.set(nn, s.id); }
  }
  const setMeta = new Map(sets.map((s) => [s.id, s]));

  const groups = (await fetchJsonWithRetry<{ results: TcgGroup[] }>(`${BASE}/${cat}/groups`, { log }))?.results ?? [];

  type Gap = { setId: string; code: string | null; setName: string; ourOnly: { num: string; name: string }[]; tcgOnly: { num: string; name: string }[] };
  const perSet: Gap[] = [];

  for (const g of groups) {
    let setId = g.abbreviation ? byCode.get(normCode(g.abbreviation)) : undefined;
    if (!setId) { const nn = normName(g.name); if (nn && !nameCol.has(nn)) setId = byName.get(nn); }
    if (!setId) continue; // 매칭된 그룹만(번호갭 진단)

    const rcs = await prisma.regionCard.findMany({ where: { setId, region }, select: { number: true, name: true } });
    const ourByNum = new Map<string, { num: string; name: string }>();
    for (const rc of rcs) { const k = normNum(rc.number); if (k && !ourByNum.has(k)) ourByNum.set(k, { num: rc.number, name: rc.name }); }

    const prods = (await fetchJsonWithRetry<{ results: TcgProduct[] }>(`${BASE}/${cat}/${g.groupId}/products`, { log }))?.results ?? [];
    const tcgByNum = new Map<string, { num: string; name: string }>();
    for (const p of prods) {
      const numRaw = p.extendedData?.find((e) => e.name === "Number")?.value;
      if (!numRaw) continue;
      const k = normNum(numRaw);
      if (k && !tcgByNum.has(k)) tcgByNum.set(k, { num: numRaw, name: p.name });
    }

    const ourOnly = [...ourByNum].filter(([k]) => !tcgByNum.has(k)).map(([, v]) => v);
    const tcgOnly = [...tcgByNum].filter(([k]) => !ourByNum.has(k)).map(([, v]) => v);
    if (ourOnly.length || tcgOnly.length) {
      const m = setMeta.get(setId)!;
      perSet.push({ setId, code: m.code, setName: m.name, ourOnly, tcgOnly });
    }
  }

  const totOur = perSet.reduce((a, s) => a + s.ourOnly.length, 0);
  const totTcg = perSet.reduce((a, s) => a + s.tcgOnly.length, 0);
  perSet.sort((a, b) => (b.ourOnly.length + b.tcgOnly.length) - (a.ourOnly.length + a.tcgOnly.length));

  console.log(`\n===== 번호갭 진단 cat${cat}/${region} =====`);
  console.log(`매칭세트 ${perSet.length}개에 갭 존재 · ourOnly(우리만) ${totOur} · tcgOnly(TCGCSV만) ${totTcg}\n`);
  console.log(`── 갭 큰 세트 Top 18 (code | ourOnly | tcgOnly) ──`);
  for (const s of perSet.slice(0, 18))
    console.log(`  ${(s.code ?? "?").padEnd(10)} our=${String(s.ourOnly.length).padStart(3)} tcg=${String(s.tcgOnly.length).padStart(3)}  ${s.setName.slice(0, 32)}`);

  console.log(`\n── 샘플: 우리만(ourOnly) 원본번호 ──`);
  for (const s of perSet.slice(0, 8)) {
    if (!s.ourOnly.length) continue;
    console.log(`  [${s.code}] ${s.ourOnly.slice(0, 8).map((v) => `${v.num}(${v.name.slice(0, 14)})`).join(" · ")}`);
  }
  console.log(`\n── 샘플: TCGCSV만(tcgOnly) 원본번호 ──`);
  for (const s of perSet.slice(0, 8)) {
    if (!s.tcgOnly.length) continue;
    console.log(`  [${s.code}] ${s.tcgOnly.slice(0, 8).map((v) => `${v.num}(${v.name.slice(0, 16)})`).join(" · ")}`);
  }

  const out = `${SC}/tcgcsv_numgap_cat${cat}.json`;
  writeFileSync(out, JSON.stringify({ totOur, totTcg, perSet }, null, 1));
  console.log(`\n전체 상세 → ${out}`);
  await prisma.$disconnect();
}

const cat = Number(process.argv.slice(2).find((a) => a.startsWith("--cat="))?.split("=")[1]) || 3;
run(cat).catch((e) => { console.error(e); process.exit(1); });
