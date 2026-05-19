export interface CardPrices {
  normal?: number;
  holofoil?: number;
  reverseHolo?: number;
  firstEdition?: number;
  currency: "USD";
}

export interface PriceProvider {
  name: string;
  getPrice(cardName: string, setName: string): Promise<CardPrices | null>;
}
