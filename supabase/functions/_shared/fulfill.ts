import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { canGrant } from "./purchaseLogic.ts";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, stripe-signature, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

export const stripeClient = () => {
  const key = Deno.env.get("STRIPE_SECRET_KEY");
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  return new Stripe(key, { apiVersion: "2025-08-27.basil" });
};

export const adminClient = () =>
  createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

/** Returns the signed-in user from the request's bearer token, or null. */
export async function getUser(req: Request) {
  const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
  if (!token) return null;
  const anon = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "");
  const { data } = await anon.auth.getUser(token);
  return data.user ?? null;
}

/**
 * Idempotently delivers the item for a checkout session. Safe to call any number of
 * times (webhook, return page, background sync) — the item is credited once.
 */
export async function fulfillSession(stripe: Stripe, db: SupabaseClient, sessionId: string) {
  const s = await stripe.checkout.sessions.retrieve(sessionId);
  if (!canGrant(s)) {
    return { granted: false, status: s.payment_status, itemId: s.metadata?.item_id, itemType: s.metadata?.item_type };
  }
  const md = s.metadata!;
  const piId = typeof s.payment_intent === "string" ? s.payment_intent : s.payment_intent?.id ?? null;

  // If this payment was already refunded/disputed, never re-grant it.
  const { data: existing } = await db.from("purchases").select("status").eq("stripe_session_id", s.id).maybeSingle();
  if (existing && existing.status !== "paid") {
    return { granted: false, status: existing.status, itemId: md.item_id, itemType: md.item_type };
  }

  const email = (s.customer_details?.email ?? "unknown").toLowerCase();
  const { error: pErr } = await db.from("purchases").upsert(
    {
      email, user_id: md.user_id, item_id: md.item_id, item_type: md.item_type, item_name: md.item_name ?? md.item_id,
      amount_paid: s.amount_total ?? 0, currency: s.currency ?? "usd", stripe_session_id: s.id,
      stripe_payment_intent_id: piId, status: "paid",
    },
    { onConflict: "stripe_session_id" },
  );
  if (pErr) throw new Error(`purchase save failed: ${pErr.message}`);

  const { error: iErr } = await db.from("player_inventory").upsert(
    {
      user_id: md.user_id, item_id: md.item_id, item_type: md.item_type, status: "active",
      stripe_session_id: s.id, stripe_payment_intent_id: piId, revoked_at: null,
    },
    { onConflict: "user_id,item_id" },
  );
  if (iErr) throw new Error(`inventory save failed: ${iErr.message}`);

  await db.from("checkout_sessions").update({ status: "paid", updated_at: new Date().toISOString() }).eq("session_id", s.id);
  if (email !== "unknown") {
    await db.from("customer_emails").upsert(
      { email, item_id: md.item_id, item_type: md.item_type, stripe_session_id: s.id },
      { onConflict: "email" },
    );
  }
  return { granted: true, status: "paid", itemId: md.item_id, itemType: md.item_type };
}

export async function setPaymentStatus(db: SupabaseClient, paymentIntentId: string, status: "refunded" | "disputed" | "paid") {
  if (!paymentIntentId) return;
  const now = new Date().toISOString();
  await db.from("purchases").update({ status, status_changed_at: now }).eq("stripe_payment_intent_id", paymentIntentId);
  await db.from("player_inventory")
    .update(status === "paid" ? { status: "active", revoked_at: null } : { status: "revoked", revoked_at: now })
    .eq("stripe_payment_intent_id", paymentIntentId);
}
