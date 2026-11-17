import { adminClient, corsHeaders, fulfillSession, getUser, json, stripeClient } from "../_shared/fulfill.ts";

// Recovery: re-checks this player's unfinished checkouts with Stripe, links older
// email-only purchases to the account, and returns the verified inventory.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const user = await getUser(req);
    if (!user) return json({ error: "Sign in required" }, 401);
    const db = adminClient();
    const stripe = stripeClient();

    const since = new Date(Date.now() - 14 * 864e5).toISOString();
    const { data: pending } = await db.from("checkout_sessions").select("session_id")
      .eq("user_id", user.id).eq("status", "pending").gte("created_at", since).limit(20);
    let recovered = 0;
    for (const p of pending ?? []) {
      try {
        const r = await fulfillSession(stripe, db, p.session_id);
        if (r.granted) recovered++;
        else if (r.status === "unpaid") {
          const s = await stripe.checkout.sessions.retrieve(p.session_id);
          if (s.status === "expired")
            await db.from("checkout_sessions").update({ status: "failed" }).eq("session_id", p.session_id);
        }
      } catch (e) { console.error("[SYNC] session", p.session_id, e); }
    }

    // Older purchases made before accounts existed: claim by verified account email.
    if (user.email && user.email_confirmed_at) {
      const { data: legacy } = await db.from("purchases").select("*")
        .eq("email", user.email.toLowerCase()).is("user_id", null).eq("status", "paid");
      for (const l of legacy ?? []) {
        await db.from("purchases").update({ user_id: user.id }).eq("id", l.id);
        await db.from("player_inventory").upsert({
          user_id: user.id, item_id: l.item_id, item_type: l.item_type, status: "active",
          stripe_session_id: l.stripe_session_id, stripe_payment_intent_id: l.stripe_payment_intent_id,
        }, { onConflict: "user_id,item_id", ignoreDuplicates: true });
        recovered++;
      }
    }

    const { data: items } = await db.from("player_inventory").select("item_id,item_type,status").eq("user_id", user.id);
    return json({ recovered, items: items ?? [] });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
