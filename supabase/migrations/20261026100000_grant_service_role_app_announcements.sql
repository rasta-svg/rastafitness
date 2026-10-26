-- Ensure the privileged admin Edge Function can write announcement records.
GRANT SELECT, INSERT, UPDATE ON TABLE public.app_announcements TO service_role;
