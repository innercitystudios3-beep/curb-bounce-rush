import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Mapping of item IDs to Stripe price IDs
const STRIPE_PRICES: Record<string, { priceId: string; type: 'ball' | 'backdrop' }> = {
  // Ball skins
  "soccer-ball": { priceId: "price_1SkEpV2e3k1GT76eEk1qMbC0", type: "ball" },
  "dodge-ball": { priceId: "price_1SkEpr2e3k1GT76e6XYQV0GB", type: "ball" },
  "tennis-ball": { priceId: "price_1SkErR2e3k1GT76eSN09T8YU", type: "ball" },
  "mystery-ball": { priceId: "price_1SkErt2e3k1GT76eD6ArrdIO", type: "ball" },
  // Backdrops
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

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-IAP-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      throw new Error("STRIPE_SECRET_KEY is not set");
    }
    logStep("Stripe key verified");

    const { itemId, itemName } = await req.json();
    logStep("Request body parsed", { itemId, itemName });

    if (!itemId || !STRIPE_PRICES[itemId]) {
      throw new Error(`Invalid item ID: ${itemId}`);
    }

    const priceInfo = STRIPE_PRICES[itemId];
    logStep("Price info found", { priceId: priceInfo.priceId, type: priceInfo.type });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const origin = req.headers.get("origin") || "http://localhost:5173";
    
    // Create a checkout session for guest purchases (no auth required for game IAP)
    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price: priceInfo.priceId,
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${origin}/?purchase_success=true&item_id=${itemId}&item_type=${priceInfo.type}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?purchase_cancelled=true`,
      metadata: {
        item_id: itemId,
        item_type: priceInfo.type,
        item_name: itemName || itemId,
      },
    });

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    return new Response(JSON.stringify({ url: session.url, sessionId: session.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
