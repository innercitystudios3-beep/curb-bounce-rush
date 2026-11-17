import { adminClient, corsHeaders, fulfillSession, getUser, json, stripeClient } from "../_shared/fulfill.ts";

// Called by the return page as a fast path. Delivery is the same idempotent step the webhook uses.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const user = await getUser(req);
    if (!user) return json({ error: "Sign in required", code: "AUTH_REQUIRED" }, 401);
    const { sessionId } = await req.json().catch(() => ({}));
    if (typeof sessionId !== "string" || !sessionId.startsWith("cs_")) return json({ error: "Invalid session" }, 400);
    const stripe = stripeClient();
    const s = await stripe.checkout.sessions.retrieve(sessionId);
    if (s.metadata?.user_id !== user.id) return json({ error: "Not your purchase" }, 403);
    const r = await fulfillSession(stripe, adminClient(), sessionId);
    return json({ verified: r.granted, status: r.status, itemId: r.itemId, itemType: r.itemType });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
