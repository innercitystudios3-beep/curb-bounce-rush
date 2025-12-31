-- Create a table to store customer emails from purchases
CREATE TABLE public.customer_emails (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  item_id TEXT,
  item_type TEXT,
  stripe_session_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create unique constraint on email to avoid duplicates
CREATE UNIQUE INDEX idx_customer_emails_email ON public.customer_emails(email);

-- Enable RLS but allow edge functions to insert
ALTER TABLE public.customer_emails ENABLE ROW LEVEL SECURITY;

-- Policy to allow service role to insert (edge functions use service role)
CREATE POLICY "Service role can insert customer emails"
ON public.customer_emails
FOR INSERT
WITH CHECK (true);

-- Policy to allow service role to select
CREATE POLICY "Service role can read customer emails"
ON public.customer_emails
FOR SELECT
USING (true);