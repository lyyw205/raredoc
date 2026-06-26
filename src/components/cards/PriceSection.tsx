import { toUsd, type PokeTracePriceTier } from "@/lib/api/poketrace";
import type { BunjangPrices } from "@/lib/api/bunjang";
import { Card, DeltaBadge, RankingTable } from "@/components/toss";
import { PriceChart, PT_RANGES } from "@/components/cards/PriceChart";
import { PriceSourceHeader } from "@/components/cards/PriceSourceHeader";
import type { PricePoint } from "@/lib/services/market";

function TrendBadge({ pct }: { pct: number | null }) {
  if (pct === null) return null;
  if (Math.abs(pct) <= 2) return <span className="text-toss-caption text-toss-text-quaternary">→</span>;
  return <DeltaBadge percent={pct} mode="text" size="sm" />;
}

type OtherCondition = {
  key: string;
  label: string;
  ebay?: PokeTracePriceTier;
  tcg?: PokeTracePriceTier;
};

type PriceRange = { low: number; high: number } | null;

/**
 * 카드 상세 시세 섹션 — 차트 / 3출처 / 컨디션별 / 푸터. page 에서 이미 계산된 평탄 값만 받아
 * 렌더한다(계산 로직은 page 잔류). 렌더 결과는 추출 전 인라인 마크업과 100% 동일.
 */
export function PriceSection({
  historyForChart,
  chartLineLabels,
  chartRanges,
  // TCGplayer
  ptTcgNm,
  ptTcgNmTrend,
  tcgNm,
  ptTcgNmRange,
  ptTcgSaleCount,
  ptTcgPlayerUrl,
  // eBay
  ptEbayNm,
  ptEbayNmTrend,
  ebayNm,
  ptEbayNmRange,
  ptEbaySaleCount,
  priceHistory,
  // 번개장터
  bunjangPrices,
  // 컨디션별
  otherConditions,
  // 푸터
  ptTopPrice,
  ptTotalSaleCount,
  ptUpdatedAt,
}: {
  historyForChart: { recordedAt: string; amount: number | null }[];
  chartLineLabels: { amount: string } | undefined;
  chartRanges: typeof PT_RANGES | undefined;
  ptTcgNm: number | null;
  ptTcgNmTrend: number | null;
  tcgNm: PokeTracePriceTier | undefined;
  ptTcgNmRange: PriceRange;
  ptTcgSaleCount: number | null;
  ptTcgPlayerUrl: string | null;
  ptEbayNm: number | null;
  ptEbayNmTrend: number | null;
  ebayNm: PokeTracePriceTier | undefined;
  ptEbayNmRange: PriceRange;
  ptEbaySaleCount: number | null;
  priceHistory: PricePoint[];
  bunjangPrices: BunjangPrices | null;
  otherConditions: OtherCondition[];
  ptTopPrice: number | null;
  ptTotalSaleCount: number | null;
  ptUpdatedAt: string | null;
}) {
  const latest = priceHistory.at(-1);

  return (
    <section className="mt-10 space-y-5">
      <h2 className="text-toss-title font-bold text-toss-text-primary">시세</h2>
      <div className="space-y-5">
        {/* A: 가격 히스토리 (최상단) */}
        <Card padding="md">
          <PriceChart history={historyForChart} lineLabel={chartLineLabels?.amount} ranges={chartRanges} />
        </Card>

        {/* B: 시세 3출처 가로 그리드 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* TCGplayer */}
          <Card padding="sm">
            <PriceSourceHeader emoji="🇺🇸" title="TCGplayer" href={ptTcgPlayerUrl} />
            {ptTcgNm != null ? (
              <>
                <p className="text-toss-title-1 font-bold text-toss-text-primary toss-numeric">${ptTcgNm.toFixed(2)}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-toss-tiny text-toss-text-tertiary">NM · 미국</span>
                  <TrendBadge pct={ptTcgNmTrend} />
                </div>
                {tcgNm?.avg7d != null && (
                  <p className="text-toss-tiny text-toss-text-tertiary mt-1.5 toss-numeric">7일평균 ${toUsd(tcgNm.avg7d).toFixed(2)}</p>
                )}
                {ptTcgNmRange && ptTcgNmRange.low !== ptTcgNmRange.high && (
                  <p className="text-toss-tiny text-toss-text-quaternary toss-numeric">${ptTcgNmRange.low.toFixed(2)} – ${ptTcgNmRange.high.toFixed(2)}</p>
                )}
                {ptTcgSaleCount != null && (
                  <p className="text-toss-tiny text-toss-text-quaternary toss-numeric">{ptTcgSaleCount}건</p>
                )}
              </>
            ) : (
              <p className="text-toss-label text-toss-text-quaternary py-2">— 데이터 수집 중</p>
            )}
          </Card>

          {/* eBay */}
          <Card padding="sm">
            <PriceSourceHeader emoji="🌍" title="eBay" rightText="Sold listings" />
            {ptEbayNm != null ? (
              <>
                <p className="text-toss-title-1 font-bold text-toss-text-primary toss-numeric">${ptEbayNm.toFixed(2)}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-toss-tiny text-toss-text-tertiary">NM · 글로벌</span>
                  <TrendBadge pct={ptEbayNmTrend} />
                </div>
                {ebayNm?.avg7d != null && (
                  <p className="text-toss-tiny text-toss-text-tertiary mt-1.5 toss-numeric">7일평균 ${toUsd(ebayNm.avg7d).toFixed(2)}</p>
                )}
                {ebayNm?.median7d != null && (
                  <p className="text-toss-tiny text-toss-text-tertiary toss-numeric">중앙값 ${toUsd(ebayNm.median7d).toFixed(2)}</p>
                )}
                {ptEbayNmRange && ptEbayNmRange.low !== ptEbayNmRange.high && (
                  <p className="text-toss-tiny text-toss-text-quaternary toss-numeric">${ptEbayNmRange.low.toFixed(2)} – ${ptEbayNmRange.high.toFixed(2)}</p>
                )}
                {ptEbaySaleCount != null && (
                  <p className="text-toss-tiny text-toss-text-quaternary toss-numeric">{ptEbaySaleCount}건</p>
                )}
              </>
            ) : latest?.amount ? (
              <>
                <p className="text-toss-title-1 font-bold text-toss-text-primary toss-numeric">${latest.amount.toFixed(2)}</p>
                <p className="text-toss-tiny text-toss-text-quaternary mt-1.5">시세 · {new Date(priceHistory.at(-1)!.recordedAt).toLocaleDateString("ko-KR")} 기준</p>
              </>
            ) : (
              <p className="text-toss-label text-toss-text-quaternary py-2">— 데이터 수집 중</p>
            )}
          </Card>

          {/* 번개장터 */}
          <Card padding="sm">
            <PriceSourceHeader
              emoji="🇰🇷"
              title="번개장터"
              href={bunjangPrices ? `https://m.bunjang.co.kr/search/products?q=${encodeURIComponent(bunjangPrices.query)}` : null}
            />
            {bunjangPrices ? (
              <>
                <p className="text-toss-title-1 font-bold text-toss-text-primary toss-numeric">₩{bunjangPrices.avg.toLocaleString("ko-KR")}</p>
                <p className="text-toss-tiny text-toss-text-tertiary mt-0.5">평균 · 국내</p>
                <p className="text-toss-tiny text-toss-text-quaternary mt-1.5 toss-numeric">
                  {bunjangPrices.count}건 · ₩{bunjangPrices.min.toLocaleString("ko-KR")} – ₩{bunjangPrices.max.toLocaleString("ko-KR")}
                </p>
                <p className="text-toss-tiny text-toss-text-quaternary mt-1 truncate">검색어: {bunjangPrices.query}</p>
              </>
            ) : (
              <p className="text-toss-label text-toss-text-quaternary py-2">— 데이터 수집 중</p>
            )}
          </Card>
        </div>

        {/* D: 컨디션별 시세 RankingTable */}
        {otherConditions.length > 0 && (
          <Card padding="md">
            <h3 className="text-toss-label font-bold text-toss-text-primary mb-3">컨디션별 시세</h3>
            <RankingTable.Root className="mt-3">
              <RankingTable.Head>
                <RankingTable.HeadRow>
                  <RankingTable.Header>컨디션</RankingTable.Header>
                  <RankingTable.Header align="right">eBay</RankingTable.Header>
                  <RankingTable.Header align="right">TCGplayer</RankingTable.Header>
                </RankingTable.HeadRow>
              </RankingTable.Head>
              <RankingTable.Body>
                {otherConditions.map(({ key, label, ebay, tcg }) => (
                  <RankingTable.Row key={key}>
                    <RankingTable.Cell>
                      <div>
                        <p className="text-toss-label font-semibold text-toss-text-primary">{key}</p>
                        <p className="text-toss-micro text-toss-text-tertiary">{label}</p>
                      </div>
                    </RankingTable.Cell>
                    <RankingTable.Cell align="right" numeric>
                      {ebay?.avg != null ? (
                        <span className="text-toss-text-primary">${toUsd(ebay.avg).toFixed(2)}</span>
                      ) : (
                        <span className="text-toss-text-quaternary">—</span>
                      )}
                    </RankingTable.Cell>
                    <RankingTable.Cell align="right" numeric>
                      {tcg?.avg != null ? (
                        <span className="text-toss-text-primary">${toUsd(tcg.avg).toFixed(2)}</span>
                      ) : (
                        <span className="text-toss-text-quaternary">—</span>
                      )}
                    </RankingTable.Cell>
                  </RankingTable.Row>
                ))}
              </RankingTable.Body>
            </RankingTable.Root>
          </Card>
        )}

        {/* 푸터: 집계 + 출처 */}
        {(ptTopPrice != null || ptTotalSaleCount != null || ptUpdatedAt) && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-toss-micro text-toss-text-tertiary px-1">
            {ptTopPrice != null && (
              <span>최고가 <span className="text-toss-text-primary font-semibold toss-numeric">${ptTopPrice.toFixed(2)}</span></span>
            )}
            {ptTotalSaleCount != null && (
              <span>총 거래 <span className="text-toss-text-primary font-semibold toss-numeric">{ptTotalSaleCount.toLocaleString()}건</span></span>
            )}
            {ptUpdatedAt && (
              <span className="ml-auto">{new Date(ptUpdatedAt).toLocaleDateString("ko-KR")} 기준</span>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
