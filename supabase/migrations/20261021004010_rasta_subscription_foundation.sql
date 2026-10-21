-- Rasta Fitness monetization foundation: catalog, subscriptions and payment ledger.
-- Client roles can read plans and their own records, but cannot create/approve payments.
BEGIN;
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id text PRIMARY KEY,
  name_fa text NOT NULL,
  description_fa text NOT NULL DEFAULT '',
  price_irr bigint NOT NULL CHECK (price_irr >= 0),
  billing_interval text NOT NULL CHECK (billing_interval IN ('month','year','none')),
  features jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(features) = 'array'),
  is_active boolean NOT NULL DEFAULT true,
  sort_order smallint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.subscription_plans
  (id,name_fa,description_fa,price_irr,billing_interval,features,sort_order)
VALUES
  ('free','رایگان','امکانات پایه رستا',0,'none','["ثبت فعالیت‌های پایه","ثبت پیشرفت شخصی"]'::jsonb,0),
  ('premium','ویژه ورزشکار','امکانات پیشرفته ورزشکاران',1490000,'month','["آمار پیشرفت پیشرفته","برنامه‌های تمرینی ویژه"]'::jsonb,1),
  ('trainer','مربی','ابزارهای حرفه‌ای مربی و شاگردان',3990000,'month','["مدیریت شاگردان","ساخت برنامه تمرینی","پیگیری پیشرفت شاگردان"]'::jsonb,2),
  ('gym','باشگاه','امکانات مدیریتی باشگاه',9900000,'month','["مدیریت اعضای باشگاه","مدیریت مربیان","گزارش‌های مدیریتی"]'::jsonb,3)
ON CONFLICT (id) DO NOTHING;
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id text NOT NULL REFERENCES public.subscription_plans(id),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','expired','cancelled','past_due')),
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at > starts_at)
);
CREATE INDEX IF NOT EXISTS subscriptions_user_status_idx ON public.subscriptions(user_id,status,ends_at DESC);
CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id uuid REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  provider text NOT NULL DEFAULT 'unselected',
  provider_payment_id text UNIQUE,
  idempotency_key text NOT NULL UNIQUE,
  amount_irr bigint NOT NULL CHECK (amount_irr > 0),
  currency text NOT NULL DEFAULT 'IRR' CHECK (currency = 'IRR'),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','succeeded','failed','refunded','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  verified_at timestamptz,
  provider_response jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS payment_transactions_user_created_idx ON public.payment_transactions(user_id,created_at DESC);
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS subscription_plans_read_active ON public.subscription_plans;
CREATE POLICY subscription_plans_read_active ON public.subscription_plans FOR SELECT TO anon, authenticated USING (is_active = true);
DROP POLICY IF EXISTS subscriptions_read_own ON public.subscriptions;
CREATE POLICY subscriptions_read_own ON public.subscriptions FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));
DROP POLICY IF EXISTS payment_transactions_read_own ON public.payment_transactions;
CREATE POLICY payment_transactions_read_own ON public.payment_transactions FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));
GRANT SELECT ON public.subscription_plans TO anon, authenticated;
GRANT SELECT ON public.subscriptions, public.payment_transactions TO authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.subscription_plans, public.subscriptions, public.payment_transactions FROM anon, authenticated;
COMMIT;
