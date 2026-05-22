
DROP POLICY IF EXISTS "Service role can read customer emails" ON public.customer_emails;
DROP POLICY IF EXISTS "Service role can insert customer emails" ON public.customer_emails;
DROP POLICY IF EXISTS "Service role can read purchases" ON public.purchases;
DROP POLICY IF EXISTS "Service role can insert purchases" ON public.purchases;

-- Service role bypasses RLS, so edge functions using the service role key still have full access.
-- No PERMISSIVE policies = no access for anon/authenticated users.

-- Explicit deny-all RESTRICTIVE policies for clarity (defense in depth)
CREATE POLICY "Deny all anon/auth access to customer_emails"
  ON public.customer_emails
  AS RESTRICTIVE
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Deny all anon/auth access to purchases"
  ON public.purchases
  AS RESTRICTIVE
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);
