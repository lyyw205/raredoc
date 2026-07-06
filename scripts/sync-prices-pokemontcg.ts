/**
 * EN 시세 수집 — pokemontcg.io 벌크 (Layer 1, 결정적 스크립트)
 *
 * 출처: pokemontcg.io 카드 응답의 tcgplayer(USD) + cardmarket(EUR) 가격.
 * 매핑: EN RegionCard.id === pokemontcg.io card id (직접 1:1).
 *       세트 단위 벌크 호출(getCardsBySet)로 호출 수 최소화.
 * 적재: Price 2행/카드 (sourceId=PriceSource 'tcgplayer' / 'cardmarket') — 독립 출처 교차검증(B안).
 *       시계열 스냅샷이지만 같은 날 재실행 중복은 방지(하루 1행/출처).
 *
 * 실행(단독):
 *   npm run sync:prices:en              # 전 EN 세트
 *   npm run sync:prices:en -- --set=sv3pt5   # 특정 세트만(테스트)
 *   npm run sync:prices:en -- --limit=3      # 앞 N개 세트만(테스트)
 * 오케스트레이터에서: import { run } from "./sync-prices-pokemontcg"
 *
 * docs/agents/price-collector-plan.md
 */
import "dotenv/config";
import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");
import { prisma } from "@/lib/prisma";
import { getCardsBySet, type TCGCard } from "@/lib/api/pokemontcg";
import {
  Logger,
  type SyncResult,
  emptyResult,
  startOfUtcDay,
  upsertDailyPrice,
  getSourceIds,
  sanityCheck,
} from "./lib/price-sync-lib";

export type EnOptions = {
  set?: string; // 특정 세트만
  limit?: number; // 앞 N개 세트만
};

/** tcgplayer variant 가격 → Price 칼럼 매핑. market 우선, 없으면 mid. */
function pickTcgplayer(tcg: NonNullable<TCGCard["tcgplayer"]>["prices"]) {
  if (!tcg) return null;
  const v = (key: string) => {
    const p = tcg[key];
    if (!p) return undefined;
    return p.market ?? p.mid ?? p.high ?? p.low ?? undefined;
  };
  const normal = v("normal");
  const holofoil = v("holofoil");
  const reverseHolo = v("reverseHolofoil");
  const firstEdition = v("1stEditionHolofoil") ?? v("1stEdition") ?? v("1stEditionNormal");
  const marketPrice = holofoil ?? normal ?? reverseHolo ?? firstEdition;
  if (
    normal === undefined &&
    holofoil === undefined &&
    reverseHolo === undefined &&
    firstEdition === undefined
  )
    return null;
  return { normal, holofoil, reverseHolo, firstEdition, marketPrice };
}

/** 오케스트레이터/단독 공용 진입점. prisma.$disconnect 는 호출자 책임. */
export async function run(opts: EnOptions = {}): Promise<SyncResult> {
  const t0 = Date.now();
  const log = new Logger("EN pokemontcg.io");
  const r = emptyResult("EN pokemontcg.io");

  const sid = await getSourceIds(["tcgplayer", "cardmarket"]);

  let setIds: string[];
  if (opts.set) {
    setIds = [opts.set];
  } else {
    const grouped = await prisma.regionCard.groupBy({ by: ["setId"], where: { region: "EN" } });
    setIds = grouped.map((g) => g.setId).sort();
    if (opts.limit && opts.limit > 0) setIds = setIds.slice(0, opts.limit);
  }
  log.info(`EN 세트 ${setIds.length}개 대상`);

  const today = startOfUtcDay();

  for (const setId of setIds) {
    // 우리 DB의 Set.id 는 "en-tcg-base1"처럼 접두사가 붙기도 하는데,
    // pokemontcg.io 의 set.id 는 접두사 없는 원본("base1")이라 그대로 넘기면 0건이 된다.
    const pmtcgSetId = setId.replace(/^en-tcg-/, "");
    let cards: TCGCard[] = [];
    try {
      cards = await getCardsBySet(pmtcgSetId);
    } catch (e) {
      // getCardsBySet 자체에 재시도가 없으므로 여기서 경고만 — 오케스트레이터가 전체 재시도
      r.warnings.push(`[${setId}] fetch 실패: ${(e as Error).message}`);
      r.ok = false;
      continue;
    }
    if (!cards.length) {
      r.warnings.push(`[${setId}] pokemontcg.io 카드 0건`);
      continue;
    }
    r.units++;

    const locales = await prisma.regionCard.findMany({
      where: { setId, region: "EN" },
      select: { id: true, numberInt: true },
    });
    // RegionCard.id 도 "en-tcg-base1-1"처럼 접두사가 붙어있어 pokemontcg.io card.id("base1-1")와
    // 그대로는 안 맞는다 — 접두사 벗긴 값을 키로 조회해 원래 RegionCard.id 로 되돌린다.
    const byBareId = new Map(locales.map((l) => [l.id.replace(/^en-tcg-/, ""), l.id]));
    // 세트별로 번호 0패딩 자릿수가 달라("en-tcg-bw2-001" vs pokemontcg.io "bw2-1") id 문자열이
    // 안 맞는 경우가 있다 — numberInt 로 폴백(그 세트 안에서 유일할 때만, 추측 매칭 금지).
    const numberIntCounts = new Map<number, number>();
    for (const l of locales) {
      if (l.numberInt == null) continue;
      numberIntCounts.set(l.numberInt, (numberIntCounts.get(l.numberInt) ?? 0) + 1);
    }
    const byNumberInt = new Map(
      locales
        .filter((l) => l.numberInt != null && numberIntCounts.get(l.numberInt) === 1)
        .map((l) => [l.numberInt as number, l.id])
    );

    let setWritten = 0;
    for (const card of cards) {
      let regionCardId = byBareId.get(card.id);
      if (!regionCardId) {
        const n = parseInt(card.number, 10);
        if (!Number.isNaN(n)) regionCardId = byNumberInt.get(n);
      }
      if (!regionCardId) {
        r.unmatched++;
        continue; // 추측 매칭 금지
      }
      const tcgPrices = card.tcgplayer?.prices;
      const cmPrices = card.cardmarket?.prices;
      if (!tcgPrices && !cmPrices) {
        r.noPrice++;
        continue;
      }

      const tp = pickTcgplayer(tcgPrices);
      if (tp) {
        const wrote = await upsertDailyPrice(regionCardId, sid.tcgplayer, today, {
          normal: tp.normal ?? null,
          holofoil: tp.holofoil ?? null,
          reverseHolo: tp.reverseHolo ?? null,
          firstEdition: tp.firstEdition ?? null,
          marketPrice: tp.marketPrice ?? null,
          currency: "USD",
        });
        wrote ? (r.written++, setWritten++) : r.dupSkipped++;
      }

      const cmVal =
        cmPrices?.averageSellPrice ?? cmPrices?.trendPrice ?? cmPrices?.avg7 ?? cmPrices?.avg30;
      if (cmPrices && cmVal !== undefined) {
        const wrote = await upsertDailyPrice(regionCardId, sid.cardmarket, today, {
          marketPrice: cmVal,
          currency: "EUR",
        });
        wrote ? (r.written++, setWritten++) : r.dupSkipped++;
      }
    }
    log.info(`[${setId}] cards=${cards.length} written=${setWritten}`);
  }

  r.durationMs = Date.now() - t0;
  sanityCheck(r);
  return r;
}

// ── 단독 실행 ──
const isMain = process.argv[1]?.includes("sync-prices-pokemontcg");
if (isMain) {
  const args = process.argv.slice(2);
  const opts: EnOptions = {
    set: args.find((a) => a.startsWith("--set="))?.split("=")[1],
    limit: Number(args.find((a) => a.startsWith("--limit="))?.split("=")[1]) || undefined,
  };
  run(opts)
    .then((r) => {
      console.log(
        `PMTCG-SYNC done: written=${r.written} dup-skip=${r.dupSkipped} no-price=${r.noPrice} unmatched=${r.unmatched} warnings=${r.warnings.length} in ${(r.durationMs / 1000).toFixed(1)}s`
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
