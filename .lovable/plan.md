

## Stripe Webhook Implementation Plan

### Overview
Add a Stripe webhook endpoint to reliably capture payments server-side, ensuring purchases are recorded even if users close their browser.

### Step 1: Create the `stripe-webhook` Edge Function

Create a new file `supabase/functions/stripe-webhook/index.ts` that:
- Receives POST requests from Stripe
- Verifies the webhook signature using `STRIPE_WEBHOOK_SECRET`
- Handles the `checkout.session.completed` event
- Extracts purchase details from the session metadata
- Saves to the `purchases` table (same as current verify function)
- Returns 200 OK to acknowledge receipt

### Step 2: Add the Webhook Secret

Use the secrets tool to prompt you to add `STRIPE_WEBHOOK_SECRET` which you'll get from Stripe Dashboard.

### Step 3: Stripe Dashboard Configuration (Manual Step)

You'll need to:
1. Log into [Stripe Dashboard](https://dashboard.stripe.com/webhooks)
2. Click "Add endpoint"
3. Enter URL: `https://bxiejlgvuzjpwdwwjzhb.supabase.co/functions/v1/stripe-webhook`
4. Select event: `checkout.session.completed`
5. Copy the signing secret to add to Lovable

### Step 4: Update Frontend (Optional)

The current redirect-based verification can remain as a fallback, but the webhook ensures reliability. No frontend changes are strictly required.

### Benefits of This Approach
- Payments are recorded even if users close their browser
- More secure (server-to-server communication)
- Stripe retries failed webhook deliveries
- Can handle refunds and disputes in the future

### Files to Create/Modify
- **Create**: `supabase/functions/stripe-webhook/index.ts`
- **Add secret**: `STRIPE_WEBHOOK_SECRET`

