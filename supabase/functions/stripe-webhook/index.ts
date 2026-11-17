import Stripe from "https://esm.sh/stripe@18.5.0";
import { classifyEvent } from "../_shared/purchaseLogic.ts";
import { adminClient, corsHeaders, fulfillSession, json, setPaymentStatus, stripeClient } from "../_shared/fulfill.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const secret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!secret) return json({ error: "STRIPE_WEBHOOK_SECRET is not set" }, 500);
  const signature = req.headers.get("stripe-signature");
  if (!signature) return json({ error: "Missing signature" }, 400);

  const stripe = stripeClient();
  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, secret);
  } catch (err) {
    return json({ error: `Webhook Error: ${err instanceof Error ? err.message : err}` }, 400);
  }

  const db = adminClient();
  // Idempotency: each Stripe event is processed once.
  const { error: dupErr } = await db.from("stripe_webhook_events").insert({ event_id: event.id, event_type: event.type });
  if (dupErr) {
    if (dupErr.code === "23505") return json({ received: true, duplicate: true });
    return json({ error: dupErr.message }, 500);
  }

  try {
    const action = classifyEvent(event as never);
    console.log("[STRIPE-WEBHOOK]", event.type, action.kind);
    if (action.kind === "grant") await fulfillSession(stripe, db, action.sessionId);
    else if (action.kind === "fail")
      await db.from("checkout_sessions").update({ status: "failed", updated_at: new Date().toISOString() })
        .eq("session_id", action.sessionId).eq("status", "pending");
    else if (action.kind === "revoke") await setPaymentStatus(db, action.paymentIntentId, action.reason);
    else if (action.kind === "restore") await setPaymentStatus(db, action.paymentIntentId, "paid");
    return json({ received: true });
  } catch (e) {
    // Let Stripe retry: forget the event so the retry is processed.
    await db.from("stripe_webhook_events").delete().eq("event_id", event.id);
    console.error("[STRIPE-WEBHOOK] processing failed", e);
    return json({ error: "processing failed" }, 500);
  }
});
