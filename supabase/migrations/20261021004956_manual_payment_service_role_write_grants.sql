-- The edge function uses the service role for secure payment requests and subscription activation.
GRANT SELECT, INSERT, UPDATE ON TABLE public.payment_transactions TO service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.subscriptions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.payment_settings TO service_role;

DROP POLICY IF EXISTS payment_settings_service_role_access ON public.payment_settings;
CREATE POLICY payment_settings_service_role_access
ON public.payment_settings
FOR ALL TO service_role
USING (true)
WITH CHECK (true);
