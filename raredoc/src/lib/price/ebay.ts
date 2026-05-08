import type { CardPrices, PriceProvider } from "./types";

const EBAY_API_URL = "https://api.ebay.com/buy/browse/v1/item_summary/search";

async function getEbayToken(): Promise<string> {
  const clientId = process.env.EBAY_CLIENT_ID;
  const clientSecret = process.env.EBAY_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("eBay credentials not configured");

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch("https://api.ebay.com/identity/v1/oauth2/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials&scope=https%3A%2F%2Fapi.ebay.com%2Foauth%2Fapi_scope",
    next: { revalidate: 6000 },
  });
  const data = await res.json();
  return data.access_token;
}

function median(nums: number[]): number {
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export class EbayPriceProvider implements PriceProvider {
  name = "ebay";

  async getPrice(cardName: string, setName: string): Promise<CardPrices | null> {
    try {
      const token = await getEbayToken();
      const query = encodeURIComponent(`pokemon card "${cardName}" "${setName}"`);
      const res = await fetch(
        `${EBAY_API_URL}?q=${query}&filter=buyingOptions:{FIXED_PRICE}&limit=50`,
        {
          headers: { Authorization: `Bearer ${token}` },
          next: { revalidate: 3600 },
        }
      );
      const data = await res.json();
      const items = data.itemSummaries ?? [];
      if (!items.length) return null;

      const prices = items
        .map((item: { price?: { value?: string } }) => parseFloat(item.price?.value ?? "0"))
        .filter((p: number) => p > 0.5 && p < 500);

      if (!prices.length) return null;
      return { normal: median(prices), currency: "USD" };
    } catch {
      return null;
    }
  }
}
