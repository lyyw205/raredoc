/**
 * 카드 시세 출처별 표시 메타 + 통화 포맷 — 도감 상세 모달(DexCatalog)과 시세 페이지가 공유.
 * (DexCatalog 인라인 정의에서 추출, 런타임 결과는 기존과 100% 동일.)
 */

// 가격 출처별 표시 메타 — 한글명(name)을 기본, 일본어/원문(native)은 작게 병기
export const PRICE_SOURCE_META: Record<string, { flag: string; name?: string; native?: string; sub: string }> = {
  tcgplayer:     { flag: "🇺🇸", name: "TCGplayer",                          sub: "미국 · raw 시세" },
  cardmarket:    { flag: "🇪🇺", name: "카드마켓",      native: "Cardmarket", sub: "유럽 · raw 시세" },
  yuyu_tei_sell: { flag: "🇯🇵", name: "유유테이 (판매가)", native: "遊々亭 · 販売", sub: "일본 · 가게가 파는 값" },
  yuyu_tei_buy:  { flag: "🇯🇵", name: "유유테이 (매입가)", native: "遊々亭 · 買取", sub: "일본 · 가게가 사들이는 값" },
  ebay:          { flag: "🌍", name: "이베이",        native: "eBay",       sub: "글로벌 · 낙찰가" },
  poketrace:     { flag: "🌍", name: "포케트레이스",   native: "PokeTrace",  sub: "글로벌 · 등급가" },
  pricecharting: { flag: "🌍", name: "프라이스차팅",   native: "PriceCharting", sub: "글로벌 · 라이브가" },
  hareruya2:     { flag: "🇯🇵", name: "하레루야2",     native: "晴れる屋2",   sub: "일본 · 등급가" },
  bunjang:       { flag: "🇰🇷", name: "번개장터",                            sub: "국내 · 중고" },
};

export function formatPrice(amount: number | null, currency: string): string {
  if (amount == null) return "—";
  switch (currency) {
    case "USD": return `$${amount.toFixed(2)}`;
    case "EUR": return `€${amount.toFixed(2)}`;
    case "JPY": return `¥${Math.round(amount).toLocaleString("ja-JP")}`;
    case "KRW": return `₩${Math.round(amount).toLocaleString("ko-KR")}`;
    default:    return `${amount.toFixed(2)} ${currency}`;
  }
}
