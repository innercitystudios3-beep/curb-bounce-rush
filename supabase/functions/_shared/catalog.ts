// Server-side source of truth for what can be bought with real money.
export const STRIPE_PRICES: Record<string, { priceId: string; type: "ball" | "backdrop" }> = {
  "soccer-ball": { priceId: "price_1SkEpV2e3k1GT76eEk1qMbC0", type: "ball" },
  "dodge-ball": { priceId: "price_1SkEpr2e3k1GT76e6XYQV0GB", type: "ball" },
  "tennis-ball": { priceId: "price_1SkErR2e3k1GT76eSN09T8YU", type: "ball" },
  "mystery-ball": { priceId: "price_1SkErt2e3k1GT76eD6ArrdIO", type: "ball" },
  "linden-mural": { priceId: "price_1SkEsG2e3k1GT76eN8qRYYFi", type: "backdrop" },
  "ohio-tower": { priceId: "price_1SkEsX2e3k1GT76e4GZWcb9U", type: "backdrop" },
  "dispatch-building": { priceId: "price_1SkEsl2e3k1GT76e12UXzRHz", type: "backdrop" },
  "linden-mckinley-school": { priceId: "price_1SkEt72e3k1GT76etsysXpS0", type: "backdrop" },
  "poindexter-village": { priceId: "price_1SkEtI2e3k1GT76eFHIGWw8r", type: "backdrop" },
  "lincoln-theatre": { priceId: "price_1SkEtV2e3k1GT76evk3LMbVc", type: "backdrop" },
  "backdrop-3": { priceId: "price_1SkEth2e3k1GT76e0lt0mfSD", type: "backdrop" },
  "backdrop-4": { priceId: "price_1SkEth2e3k1GT76e0lt0mfSD", type: "backdrop" },
  "backdrop-5": { priceId: "price_1SkEth2e3k1GT76e0lt0mfSD", type: "backdrop" },
  "backdrop-6": { priceId: "price_1SkEth2e3k1GT76e0lt0mfSD", type: "backdrop" },
};
