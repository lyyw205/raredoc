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
import fs from "node:fs";
import { prisma } from "@/lib/prisma";
import {
  Logger,
  type SyncResult,
  emptyResult,
  startOfUtcDay,
  priceKindFor,
  getSourceIds,
  fetchJsonWithRetry,
  sanityCheck,
} from "./lib/price-sync-lib";

const CAT_REGION: Record<number, "EN" | "JP"> = { 3: "EN", 85: "JP" };
const BASE = "https://tcgcsv.com/tcgplayer";

export type TcgcsvOptions = { cat: number; group?: number; dryRun?: boolean; out?: string };

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
  const priceKind = await priceKindFor(sid.tcgplayer);

  // ── Phase 1: 전체 그룹 스윕 → 의도한 write 를 메모리에 수집(DB 왕복 없음) ──
  //   행마다 upsertDailyPrice(PV보장+존재조회+생성 = 왕복3회) 대신 여기서 모으고 아래서 배치.
  //   버킷/금액 우선순위 로직은 upsertDailyPrice 와 동일(정확성 불변). 같은 printVariantId 가
  //   여러 productId 에 걸리면 마지막 값이 이김(per-row upsert 덮어쓰기와 동일 순서).
  type Intended = { regionCardId: string; amount: number; standard: boolean };
  const byPv = new Map<string, Intended>();

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
      // upsertDailyPrice 와 동일한 금액 우선순위(tcgcsv 는 marketPrice 미제공 → holofoil 부터).
      const amount = (p.holofoil ?? p.normal ?? p.reverseHolo ?? p.firstEdition) as number;
      const printVariantId = target.printVariantId ?? `pv-${target.regionCardId}`;
      byPv.set(printVariantId, { regionCardId: target.regionCardId, amount, standard: !target.printVariantId });
    }
  }

  // ── dry-run: 실제 기록 없이 의도한 (printVariantId, amount) 만 정렬해 파일로 덤프(정확성 대조용) ──
  if (opts.dryRun) {
    const out = opts.out ?? `/tmp/tcgcsv-batch-cat${opts.cat}.json`;
    const dump = [...byPv]
      .map(([printVariantId, v]) => ({ printVariantId, amount: v.amount }))
      .sort((a, b) => a.printVariantId.localeCompare(b.printVariantId));
    fs.writeFileSync(out, JSON.stringify(dump));
    log.info(`[dry-run] 의도 ${dump.length}행 → ${out} (DB 기록 안 함)`);
    r.durationMs = Date.now() - t0;
    return r;
  }

  // ── Phase 2: 배치 기록 — 왕복 수만 줄이고 결과는 per-row upsert 와 동일(멱등) ──
  const createData = [...byPv].map(([printVariantId, v]) => ({
    regionCardId: v.regionCardId,
    sourceId: sid.tcgplayer,
    currency: "USD",
    condition: null as string | null,
    gradingCompany: null as string | null,
    grade: null as number | null,
    amount: v.amount,
    conditionType: "raw",
    priceKind,
    printVariantId,
  }));

  // (a) standard PrintVariant 벌크 보장(이미 있으면 skip) — 행마다 upsert 제거
  const standardPvs = [...byPv]
    .filter(([, v]) => v.standard)
    .map(([printVariantId, v]) => ({ id: printVariantId, regionCardId: v.regionCardId, kind: "standard", slug: "standard" }));
  if (standardPvs.length) await prisma.printVariant.createMany({ data: standardPvs, skipDuplicates: true });

  // (b) 오늘 이미 있는 대상 PV 행 id 수집(메모리 필터로 거대한 IN 회피) → 삭제 후 전량 재삽입.
  //     삭제+삽입을 한 트랜잭션으로 원자성 보장(중간 실패 시 오늘치 유실 방지).
  const existingToday = await prisma.price.findMany({
    where: { sourceId: sid.tcgplayer, recordedAt: { gte: today } },
    select: { id: true, printVariantId: true },
  });
  const replaceIds = existingToday
    .filter((e) => e.printVariantId && byPv.has(e.printVariantId))
    .map((e) => e.id);

  // 삭제 → 삽입을 순차 실행(단일 트랜잭션 미사용). 대DB 지연 환경에서 하나의 $transaction 으로
  //   묶으면 왕복 누적이 Prisma 인터랙티브 트랜잭션 5s 타임아웃(P2028)을 넘는다. per-row 도
  //   비트랜잭션이라 보장 동일. 일일 크론은 매일 새 날짜라 replaceIds 가 비어 삽입만 수행(멱등).
  const CHUNK = 2000; // createMany 1콜당 2,000행(≈2만 파라미터, PG 한계 내) — 왕복 최소화
  for (let i = 0; i < replaceIds.length; i += 5000)
    await prisma.price.deleteMany({ where: { id: { in: replaceIds.slice(i, i + 5000) } } });
  for (let i = 0; i < createData.length; i += CHUNK)
    await prisma.price.createMany({ data: createData.slice(i, i + CHUNK) });

  r.written = createData.length - replaceIds.length; // 새로 생성
  r.dupSkipped = replaceIds.length; // 기존 대체(=per-row update)

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
    dryRun: args.includes("--dry-run"),
    out: args.find((a) => a.startsWith("--out="))?.split("=")[1],
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
