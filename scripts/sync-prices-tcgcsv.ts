/**
 * EN/JP 시세 수집 — TCGCSV(TCGplayer 일일 미러) 벌크, productId id-join (Layer 1, 결정적 스크립트).
 *
 * 매핑: ExternalIdMapping(sourceId=tcgcsv) 의 productId→regionCardId 크로스워크를 id-join 한다.
 *       ★먼저 build-tcgcsv-crosswalk 로 매핑을 적재해야 함("map-once"). 여기선 *가격만* 새로고침("id-join-forever").
 * 적재: Price(sourceId=PriceSource 'tcgplayer', currency USD) — upsertDailyPrice 멱등 일일 스냅샷.
 *       cat3=EN-print(EN RegionCard) · cat85=JP-print(JP RegionCard). 매핑이 region 을 이미 결정.
 * 가격: TCGCSV /prices 는 subTypeName(Normal/Holofoil/Reverse Holofoil/1st Edition…)별 행.
 * ★EN 메인 소스(2026-07-02~). 표준(printVariantId=null)·변형(마스터볼/포켓볼 패턴 등) 둘 다 수집한다.
 *   표준은 build-tcgcsv-crosswalk 의 번호+이름검증 매핑을 그대로 SKU=standard 에, 변형은 감지된
 *   PrintVariant 에 각각 붙는다. pokemontcg.io(sync-prices-pokemontcg.ts)는 보조/백업으로 남겨둠.
 *
 * 실행:
 *   npm run sync:prices:tcgcsv -- --cat=3                # EN
 *   npm run sync:prices:tcgcsv -- --cat=85               # JP-print
 *   npm run sync:prices:tcgcsv -- --cat=3 --group=23286  # 특정 그룹만(테스트)
 *
 * docs/agents/price-collector-plan.md
 */
import "dotenv/config";
import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");
import { prisma } from "@/lib/prisma";
import {
  Logger,
  type SyncResult,
  emptyResult,
  startOfUtcDay,
  upsertDailyPrice,
  getSourceIds,
  fetchJsonWithRetry,
  sanityCheck,
} from "./lib/price-sync-lib";

const CAT_REGION: Record<number, "EN" | "JP"> = { 3: "EN", 85: "JP" };
const BASE = "https://tcgcsv.com/tcgplayer";

export type TcgcsvOptions = { cat: number; group?: number };

type TcgGroup = { groupId: number };
type TcgPriceRow = {
  productId: number;
  subTypeName?: string;
  marketPrice?: number | null;
  midPrice?: number | null;
  highPrice?: number | null;
  lowPrice?: number | null;
};

/** subTypeName → 와이드칼럼 버킷. reverse/1st 를 holofoil 보다 먼저 검사. */
function bucket(sub: string): "normal" | "holofoil" | "reverseHolo" | "firstEdition" {
  const s = (sub || "").toLowerCase();
  if (s.includes("reverse")) return "reverseHolo";
  if (s.includes("1st edition")) return "firstEdition";
  if (s.includes("holofoil") || s === "foil") return "holofoil";
  return "normal";
}
const priceOf = (r: TcgPriceRow) => r.marketPrice ?? r.midPrice ?? r.highPrice ?? r.lowPrice ?? undefined;

export async function run(opts: TcgcsvOptions): Promise<SyncResult> {
  const t0 = Date.now();
  const region = CAT_REGION[opts.cat];
  const label = `TCGCSV cat${opts.cat}/${region ?? "?"}`;
  const log = new Logger(label);
  const r = emptyResult(label);
  if (!region) {
    r.ok = false;
    r.errors.push(`지원하지 않는 cat=${opts.cat} (3=EN, 85=JP)`);
    return r;
  }

  const sid = await getSourceIds(["tcgplayer"]);
  const src = await prisma.externalSource.findUnique({ where: { code: "tcgcsv" }, select: { id: true } });
  if (!src) { r.ok = false; r.errors.push("ExternalSource 'tcgcsv' 미시드"); return r; }

  // ── 크로스워크 로드: productId → (regionCardId, printVariantId) — 표준+변형 전부 ──
  //   printVariantId 가 null 이면 표준(upsertDailyPrice 가 자동으로 pv-${regionCardId} 로 처리).
  const maps = await prisma.externalIdMapping.findMany({
    where: { sourceId: src.id, regionCardId: { not: null }, regionCard: { region } },
    select: { externalId: true, regionCardId: true, printVariantId: true },
  });
  const pmap = new Map<string, { regionCardId: string; printVariantId?: string }>();
  for (const m of maps)
    if (m.regionCardId) pmap.set(m.externalId, { regionCardId: m.regionCardId, printVariantId: m.printVariantId ?? undefined });
  log.info(`크로스워크 ${pmap.size}개 productId→${region} RegionCard 로드`);
  if (pmap.size === 0) {
    r.warnings.push("크로스워크 0건 — 먼저 build-tcgcsv-crosswalk 실행 필요");
    return r;
  }

  // ── 그룹 스윕: /prices 1콜/그룹, productId 로 join ──
  const groupsResp = await fetchJsonWithRetry<{ results: TcgGroup[] }>(`${BASE}/${opts.cat}/groups`, { log });
  let groups = groupsResp?.results ?? [];
  if (opts.group) groups = groups.filter((g) => g.groupId === opts.group);

  const today = startOfUtcDay();
  for (const g of groups) {
    const priceResp = await fetchJsonWithRetry<{ results: TcgPriceRow[] }>(`${BASE}/${opts.cat}/${g.groupId}/prices`, { log });
    const rows = priceResp?.results ?? [];
    if (!rows.length) continue;

    // productId 별 subtype 가격 묶기 (이 region 크로스워크에 있는 것만)
    const perProduct = new Map<string, { normal?: number; holofoil?: number; reverseHolo?: number; firstEdition?: number }>();
    for (const row of rows) {
      const pid = String(row.productId);
      if (!pmap.has(pid)) continue;
      const val = priceOf(row);
      if (val === undefined || val === null) continue;
      const b = bucket(row.subTypeName ?? "");
      const cur = perProduct.get(pid) ?? {};
      if (cur[b] === undefined) cur[b] = val; // 같은 버킷 첫 값 유지
      perProduct.set(pid, cur);
    }
    if (perProduct.size === 0) continue;
    r.units++;

    for (const [pid, p] of perProduct) {
      const target = pmap.get(pid)!;
      if (p.normal === undefined && p.holofoil === undefined && p.reverseHolo === undefined && p.firstEdition === undefined) {
        r.noPrice++;
        continue;
      }
      const wrote = await upsertDailyPrice(target.regionCardId, sid.tcgplayer, today, {
        normal: p.normal ?? null,
        holofoil: p.holofoil ?? null,
        reverseHolo: p.reverseHolo ?? null,
        firstEdition: p.firstEdition ?? null,
        currency: "USD",
        printVariantId: target.printVariantId,
      });
      wrote ? r.written++ : r.dupSkipped++;
    }
  }

  r.durationMs = Date.now() - t0;
  sanityCheck(r);
  return r;
}

// ── 단독 실행 ──
const isMain = process.argv[1]?.includes("sync-prices-tcgcsv");
if (isMain) {
  const args = process.argv.slice(2);
  const opts: TcgcsvOptions = {
    cat: Number(args.find((a) => a.startsWith("--cat="))?.split("=")[1]) || 3,
    group: Number(args.find((a) => a.startsWith("--group="))?.split("=")[1]) || undefined,
  };
  run(opts)
    .then((r) => {
      console.log(
        `TCGCSV-SYNC done: written=${r.written} dup-skip=${r.dupSkipped} no-price=${r.noPrice} units=${r.units} warnings=${r.warnings.length} in ${(r.durationMs / 1000).toFixed(1)}s`
      );
      r.warnings.forEach((w) => console.warn("  ⚠ " + w));
      r.errors.forEach((e) => console.error("  ✗ " + e));
      return prisma.$disconnect();
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
