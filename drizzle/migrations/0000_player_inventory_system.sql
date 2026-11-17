CREATE TABLE public.player_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  item_id text NOT NULL,
  item_type text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  stripe_session_id text,
  stripe_payment_intent_id text,
  granted_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  UNIQUE (user_id, item_id)
);
GRANT SELECT ON public.player_inventory TO authenticated;
GRANT ALL ON public.player_inventory TO service_role;
ALTER TABLE public.player_inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Players read own inventory" ON public.player_inventory FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE INDEX idx_inventory_pi ON public.player_inventory(stripe_payment_intent_id);
ALTER TABLE public.player_inventory REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.player_inventory;

CREATE TABLE public.checkout_sessions (
  session_id text PRIMARY KEY,
  user_id uuid NOT NULL,
  item_id text NOT NULL,
  item_type text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.checkout_sessions TO service_role;
ALTER TABLE public.checkout_sessions ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_checkout_user ON public.checkout_sessions(user_id, status);

CREATE TABLE public.stripe_webhook_events (
  event_id text PRIMARY KEY,
  event_type text NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.stripe_webhook_events TO service_role;
ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.purchases ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.purchases ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'paid';
ALTER TABLE public.purchases ADD COLUMN IF NOT EXISTS status_changed_at timestamptz;
CREATE INDEX IF NOT EXISTS idx_purchases_user ON public.purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_purchases_pi ON public.purchases(stripe_payment_intent_id);
GRANT ALL ON public.purchases TO service_role;
GRANT ALL ON public.customer_emails TO service_role;