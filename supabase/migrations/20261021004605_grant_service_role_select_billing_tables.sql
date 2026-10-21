-- Allow only the trusted server-side service role to read billing summary tables.
-- Client roles retain their existing grants and RLS behavior.
GRANT SELECT ON TABLE public.subscription_plans, public.subscriptions, public.payment_transactions TO service_role;
