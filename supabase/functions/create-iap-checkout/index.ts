import { STRIPE_PRICES } from "../_shared/catalog.ts";
import { adminClient, corsHeaders, getUser, json, stripeClient } from "../_shared/fulfill.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const user = await getUser(req);
    if (!user) return json({ error: "Please sign in to buy items.", code: "AUTH_REQUIRED" }, 401);

    const body = await req.json().catch(() => ({}));
    const itemId = typeof body.itemId === "string" ? body.itemId : "";
    const itemName = typeof body.itemName === "string" ? body.itemName.slice(0, 100) : itemId;
    const price = STRIPE_PRICES[itemId];
    if (!price) return json({ error: `Invalid item ID: ${itemId}` }, 400);

    const db = adminClient();
    // Server-side ownership check: never charge twice for something already owned.
    const { data: owned } = await db.from("player_inventory").select("id")
      .eq("user_id", user.id).eq("item_id", itemId).eq("status", "active").maybeSingle();
    if (owned) return json({ error: "You already own this item", code: "DUPLICATE_PURCHASE" }, 200);

    const stripe = stripeClient();
    const origin = req.headers.get("origin") || "http://localhost:8080";
    const metadata = { user_id: user.id, item_id: itemId, item_type: price.type, item_name: itemName };
    const session = await stripe.checkout.sessions.create({
      line_items: [{ price: price.priceId, quantity: 1 }],
      mode: "payment",
      client_reference_id: user.id,
      customer_email: user.email ?? undefined,
      metadata,
      payment_intent_data: { metadata },
      success_url: `${origin}/?purchase_success=true&item_id=${itemId}&item_type=${price.type}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?purchase_cancelled=true`,
    });
    await db.from("checkout_sessions").insert({ session_id: session.id, user_id: user.id, item_id: itemId, item_type: price.type });
    return json({ url: session.url, sessionId: session.id });
  } catch (e) {
    console.error("[CREATE-IAP-CHECKOUT]", e);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
