/**
 * PriceSource 마스터 시드 (멱등 upsert).
 *
 * 실행: npm run seed:source
 *
 * code 가 unique key — 동일 code 면 갱신.
 */
import "dotenv/config";
import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");
import { prisma } from "@/lib/prisma";

type PriceSourceSeed = {
  code: string;
  name: string;
  defaultCurrency: "USD" | "JPY" | "KRW" | "EUR";
  marketRegion: "GLOBAL" | "JP" | "KR" | "US";
  baseUrl: string | null;
  enabled: boolean;
  priority: number;
};

// 시세 출처 마스터 (price-collector 계획 확정안 — docs/agents/price-collector-plan.md)
// 종류 구분은 code 로: yuyu-tei 販売/買取 분리. 등급가는 poketrace/pricecharting(grade 필드).
// 통화는 native 저장(EUR/JPY 포함), KRW 환산은 MarketStat 집계 시 FX 적용.
const SOURCES: PriceSourceSeed[] = [
  // ── 글로벌/영어권 (raw 미등급은 독립 출처 교차검증) ──
  { code: "tcgplayer", name: "TCGplayer", defaultCurrency: "USD", marketRegion: "US", baseUrl: "https://www.tcgplayer.com", enabled: true, priority: 20 },
  { code: "cardmarket", name: "Cardmarket", defaultCurrency: "EUR", marketRegion: "GLOBAL", baseUrl: "https://www.cardmarket.com", enabled: true, priority: 18 },
  { code: "ebay", name: "eBay", defaultCurrency: "USD", marketRegion: "GLOBAL", baseUrl: "https://www.ebay.com", enabled: true, priority: 10 }, // EN + KR 한국판(한국어 키워드 검색)
  { code: "poketrace", name: "PokeTrace", defaultCurrency: "USD", marketRegion: "GLOBAL", baseUrl: "https://poketrace.com", enabled: true, priority: 15 }, // Pro: 등급(PSA/BGS/CGC)
  { code: "pricecharting", name: "PriceCharting", defaultCurrency: "USD", marketRegion: "GLOBAL", baseUrl: "https://www.pricecharting.com", enabled: false, priority: 25 }, // 등급 보강 후보(한국판 카테고리 보유). 유료 Legendary 결정 보류
  // ── 일본 (yuyu-tei = raw 백본, 販売/買取 분리 / hareruya2 = 등급+raw) ──
  { code: "yuyu_tei_sell", name: "遊々亭 (販売)", defaultCurrency: "JPY", marketRegion: "JP", baseUrl: "https://yuyu-tei.jp", enabled: true, priority: 30 },
  { code: "yuyu_tei_buy", name: "遊々亭 (買取)", defaultCurrency: "JPY", marketRegion: "JP", baseUrl: "https://yuyu-tei.jp", enabled: true, priority: 31 },
  { code: "hareruya2", name: "晴れる屋2", defaultCurrency: "JPY", marketRegion: "JP", baseUrl: "https://www.hareruya2.com", enabled: true, priority: 32 },
  // ── 한국 (국내 스크랩 폐기: 번개/중고나라 미사용. 한국판은 ebay 한국어 검색으로 커버) ──
  { code: "bunjang", name: "번개장터", defaultCurrency: "KRW", marketRegion: "KR", baseUrl: "https://m.bunjang.co.kr", enabled: false, priority: 40 }, // 2026-05-31 결정: 국내 스크랩 폐기로 비활성
];

async function main() {
  let upserted = 0;
  for (const s of SOURCES) {
    await prisma.priceSource.upsert({
      where: { code: s.code },
      update: {
        name: s.name,
        defaultCurrency: s.defaultCurrency,
        marketRegion: s.marketRegion,
        baseUrl: s.baseUrl,
        enabled: s.enabled,
        priority: s.priority,
      },
      create: {
        code: s.code,
        name: s.name,
        defaultCurrency: s.defaultCurrency,
        marketRegion: s.marketRegion,
        baseUrl: s.baseUrl,
        enabled: s.enabled,
        priority: s.priority,
      },
    });
    upserted++;
  }

  const total = await prisma.priceSource.count();
  console.log(`SEED-PRICE-SOURCE: upserted=${upserted}, total in DB=${total}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
