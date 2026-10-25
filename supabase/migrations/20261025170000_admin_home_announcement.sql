-- Single active admin announcement for the top of the home page.
-- Public users may read only the active notice; all writes use the service role
-- after the admin Edge Function verifies the administrator session.
BEGIN;
CREATE TABLE IF NOT EXISTS public.app_announcements (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  message text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT false,
  expires_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT app_announcements_message_length CHECK (char_length(message) <= 1200)
);
ALTER TABLE public.app_announcements ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.app_announcements FROM anon, authenticated;
GRANT SELECT ON public.app_announcements TO anon, authenticated;
DROP POLICY IF EXISTS "Public can read current active announcement" ON public.app_announcements;
CREATE POLICY "Public can read current active announcement"
  ON public.app_announcements FOR SELECT TO anon, authenticated
  USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));
INSERT INTO public.app_announcements (id, message, is_active)
VALUES (1, '', false)
ON CONFLICT (id) DO NOTHING;
COMMIT;
