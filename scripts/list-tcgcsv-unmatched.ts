/**
 * TCGCSV 미매칭 그룹 분류 (읽기 전용) — B층(그룹→세트 영속화) 가치 판단용.
 * 우리 세트와 안 묶인 TCGCSV 그룹을 카드성(번호상품)·sealed·샘플명으로 분류해
 *   "진짜 미수집 세트" vs "안 다루는 상품(sealed/프로모/덱)" 구분.
 * 실행: npm run list:tcgcsv:unmatched -- --cat=3
 */
import "dotenv/config";
import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");
import { prisma } from "@/lib/prisma";
import { Logger, fetchJsonWithRetry } from "./lib/price-sync-lib";

const CAT_REGION: Record<number, "EN" | "JP"> = { 3: "EN", 85: "JP" };
const BASE = "https://tcgcsv.com/tcgplayer";
const normName = (s: string) =>
  (s || "").replace(/^[A-Za-z0-9]{1,8}\s*[-:]\s+/, "").toLowerCase()
    .replace(/pok[eé]mon|tcg|expansion|the|trainer gallery|galarian gallery/g, "").replace(/[^a-z0-9]/g, "");
const normCode = (c: string) => (c || "").toLowerCase().replace(/[^a-z0-9]/g, "");

type TcgGroup = { groupId: number; name: string; abbreviation: string | null };
type TcgProduct = { name: string; extendedData?: { name: string; value: string }[] };

async function run(cat: number) {
  const region = CAT_REGION[cat];
  const log = new Logger(`unmatched cat${cat}/${region}`);
  const sets = await prisma.set.findMany({ where: { region }, select: { code: true, name: true } });
  const codes = new Set<string>(), names = new Set<string>();
  for (const s of sets) { if (s.code) codes.add(normCode(s.code)); const nn = normName(s.name); if (nn) names.add(nn); }

  const groups = (await fetchJsonWithRetry<{ results: TcgGroup[] }>(`${BASE}/${cat}/groups`, { log }))?.results ?? [];
  const unmatched = groups.filter((g) => { // 빌더와 동일: code-family OR name-family
    const c = normCode(g.abbreviation ?? ""); if (c && codes.has(c)) return false;
    const nn = normName(g.name); if (nn && names.has(nn)) return false;
    return true;
  });
  log.info(`미매칭 그룹 ${unmatched.length}/${groups.length}\n`);

  const rows: { abbr: string; name: string; numbered: number; sealed: number; cls: string; sample: string }[] = [];
  for (const g of unmatched) {
    const prods = (await fetchJsonWithRetry<{ results: TcgProduct[] }>(`${BASE}/${cat}/${g.groupId}/products`, { log }))?.results ?? [];
    let numbered = 0, sealed = 0; const samp: string[] = [];
    for (const p of prods) {
      if (p.extendedData?.some((e) => e.name === "Number")) { numbered++; if (samp.length < 4) samp.push(p.name.replace(/\s*-\s*[\w/]+$/, "").slice(0, 16)); }
      else sealed++;
    }
    const cls = numbered >= 15 ? "★미수집 세트?" : numbered > 0 ? "소형/프로모" : "sealed전용";
    rows.push({ abbr: g.abbreviation ?? "", name: g.name, numbered, sealed, cls, sample: samp.join(", ") });
  }
  rows.sort((a, b) => b.numbered - a.numbered);
  console.log(`\n분류  | 번호상품 | sealed | abbr | 이름 | 샘플`);
  for (const r of rows)
    console.log(`${r.cls.padEnd(12)} ${String(r.numbered).padStart(4)}  ${String(r.sealed).padStart(4)}  ${(r.abbr || "-").padEnd(7)} ${r.name.slice(0, 34).padEnd(35)} ${r.sample}`);
  const big = rows.filter((r) => r.numbered >= 15);
  console.log(`\n→ ★미수집 의심(번호상품≥15) ${big.length}개, 그 카드 합계 ${big.reduce((a, r) => a + r.numbered, 0)}장`);
  await prisma.$disconnect();
}
const cat = Number(process.argv.slice(2).find((a) => a.startsWith("--cat="))?.split("=")[1]) || 3;
run(cat).catch((e) => { console.error(e); process.exit(1); });
