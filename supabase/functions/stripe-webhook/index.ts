import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Webhook received");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    if (!webhookSecret) throw new Error("STRIPE_WEBHOOK_SECRET is not set");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      logStep("Missing stripe-signature header");
      return new Response(JSON.stringify({ error: "Missing signature" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const body = await req.text();

    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logStep("Signature verification failed", { error: msg });
      return new Response(JSON.stringify({ error: `Webhook Error: ${msg}` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    logStep("Event verified", { type: event.type, id: event.id });

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      // Retrieve full session to ensure we have customer details and line items
      const fullSession = await stripe.checkout.sessions.retrieve(session.id, {
        expand: ["payment_intent", "customer_details"],
      });

      if (fullSession.payment_status !== "paid") {
        logStep("Session not paid, skipping", { status: fullSession.payment_status });
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      const supabaseClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      const customerEmail = fullSession.customer_details?.email;
      const itemId = fullSession.metadata?.item_id;
      const itemType = fullSession.metadata?.item_type;
      const itemName = fullSession.metadata?.item_name;
      const amountPaid = fullSession.amount_total || 0;
      const currency = fullSession.currency || "usd";
      const paymentIntentId =
        typeof fullSession.payment_intent === "string"
          ? fullSession.payment_intent
          : fullSession.payment_intent?.id;

      const { error: purchaseError } = await supabaseClient
        .from("purchases")
        .upsert(
          {
            email: customerEmail || "unknown",
            item_id: itemId,
            item_type: itemType,
            item_name: itemName,
            amount_paid: amountPaid,
            currency: currency,
            stripe_session_id: fullSession.id,
            stripe_payment_intent_id: paymentIntentId,
          },
          { onConflict: "stripe_session_id" }
        );

      if (purchaseError) {
        logStep("Failed to save purchase", { error: purchaseError.message });
      } else {
        logStep("Purchase saved", { email: customerEmail, itemId });
      }

      if (customerEmail) {
        const { error: emailError } = await supabaseClient
          .from("customer_emails")
          .upsert(
            {
              email: customerEmail,
              item_id: itemId,
              item_type: itemType,
              stripe_session_id: fullSession.id,
            },
            { onConflict: "email" }
          );

        if (emailError) {
          logStep("Failed to save customer email", { error: emailError.message });
        } else {
          logStep("Customer email saved");
        }
      }
    } else {
      logStep("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
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
